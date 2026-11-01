"""Train image, text or gated-fusion models on the same event-held-out paired data."""
import argparse,time
from pathlib import Path
from PIL import Image
import torch
from torch.utils.data import DataLoader
from torchvision import transforms
from transformers import AutoTokenizer
from models import MultimodalFusion
from common import read_manifest,seed_all,export_predictions
def main():
    p=argparse.ArgumentParser();p.add_argument("manifest");p.add_argument("--mode",choices=["image","text","fusion"],default="fusion");p.add_argument("--base-model",default="bert-base-uncased");p.add_argument("--output",default="models/fusion");p.add_argument("--epochs",type=int,default=5);p.add_argument("--batch-size",type=int,default=8);args=p.parse_args()
    seed_all();rows=read_manifest(args.manifest);labels=sorted({r["label"] for r in rows if r["split"]=="train"});device=torch.device("cuda" if torch.cuda.is_available() else "cpu");tokenizer=AutoTokenizer.from_pretrained(args.base_model);transform=transforms.Compose([transforms.Resize((224,224)),transforms.ToTensor(),transforms.Normalize([.485,.456,.406],[.229,.224,.225])])
    def collate(batch):
        images=torch.stack([transform(Image.open(r["image"]).convert("RGB")) for r in batch]).to(device);text=tokenizer([r["text"] for r in batch],padding=True,truncation=True,max_length=128,return_tensors="pt");return images,{k:v.to(device) for k,v in text.items()},torch.tensor([labels.index(r["label"]) for r in batch],device=device)
    loaders={s:DataLoader([r for r in rows if r["split"]==s],batch_size=args.batch_size,shuffle=s=="train",collate_fn=collate) for s in ["train","val","test"]};model=MultimodalFusion(len(labels),args.base_model).to(device);opt=torch.optim.AdamW(model.parameters(),lr=2e-5);out=Path(args.output);out.mkdir(parents=True,exist_ok=True);best=float("inf");start=time.perf_counter()
    for epoch in range(args.epochs):
        for split in ["train","val"]:
            model.train(split=="train");total=0;count=0
            with torch.set_grad_enabled(split=="train"):
                for image,text,y in loaders[split]:
                    logits=model(image,text["input_ids"],text["attention_mask"],args.mode);loss=torch.nn.functional.cross_entropy(logits,y)
                    if split=="train":opt.zero_grad();loss.backward();torch.nn.utils.clip_grad_norm_(model.parameters(),1);opt.step()
                    total+=loss.item()*len(y);count+=len(y)
            if split=="val" and total/count<best:
                best=total/count;torch.save({"state_dict":model.state_dict(),"classes":labels,"base_model":args.base_model,"mode":args.mode},out/"model.pt");tokenizer.save_pretrained(out);model.text.config.save_pretrained(out/"text-config")
            print({"epoch":epoch+1,"split":split,"loss":total/count})
    model.load_state_dict(torch.load(out/"model.pt",map_location=device,weights_only=True)["state_dict"]);model.eval();truth=[];pred=[]
    with torch.inference_mode():
        for image,text,y in loaders["test"]:
            prediction=model(image,text["input_ids"],text["attention_mask"],args.mode).argmax(1);truth.extend(labels[i] for i in y.cpu().tolist());pred.extend(labels[i] for i in prediction.cpu().tolist())
    export_predictions(out,truth,pred,{"mode":args.mode,"training_seconds":time.perf_counter()-start,"event_disjoint":True})
if __name__=="__main__":main()
