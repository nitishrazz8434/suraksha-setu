"""Event-held-out U-Net/DeepLab, ResNet and paired damage training.
Usage: python ml/train_vision.py manifest.jsonl --task segmentation --output models/segmentation
"""
import argparse,json,time
from pathlib import Path
import numpy as np
import torch
from torch import nn
from torch.utils.data import Dataset,DataLoader
from torchvision import transforms
from PIL import Image
from models import UNet,ImageClassifier,DamageClassifier
from common import read_manifest,seed_all,export_predictions

class Images(Dataset):
    def __init__(self,rows,task,labels,size=256,normalize=False):
        self.rows,self.task,self.labels,self.size=rows,task,labels,size
        self.transform=transforms.Compose([transforms.Resize((size,size)),transforms.ToTensor()]+([transforms.Normalize([.485,.456,.406],[.229,.224,.225])] if normalize else []))
    def __len__(self):return len(self.rows)
    def __getitem__(self,index):
        row=self.rows[index];image=self.transform(Image.open(row["image"]).convert("RGB"))
        if self.task=="segmentation":
            mask=np.array(Image.open(row["mask"]).resize((self.size,self.size),Image.Resampling.NEAREST),dtype=np.int64)
            if mask.ndim!=2 or not set(np.unique(mask))<={0,1,255}:raise ValueError("Masks must be single-channel 0=land, 1=water, 255=ignore")
            return image,torch.from_numpy(mask)
        label=torch.tensor(self.labels.index(row["label"]),dtype=torch.long)
        if self.task=="damage":return image,self.transform(Image.open(row["reference"]).convert("RGB")),label
        return image,label

def main():
    parser=argparse.ArgumentParser();parser.add_argument("manifest");parser.add_argument("--task",choices=["segmentation","classification","damage"],default="segmentation");parser.add_argument("--architecture",choices=["unet","deeplab"],default="unet");parser.add_argument("--output",default="models/segmentation");parser.add_argument("--epochs",type=int,default=15);parser.add_argument("--batch-size",type=int,default=8);parser.add_argument("--learning-rate",type=float,default=1e-3);parser.add_argument("--freeze-epochs",type=int,default=2);parser.add_argument("--patience",type=int,default=4);parser.add_argument("--pretrained",action="store_true");args=parser.parse_args()
    seed_all();rows=read_manifest(args.manifest);labels=sorted({r["label"] for r in rows if r["split"]=="train"}) if args.task!="segmentation" else ["land","water"]
    loaders={s:DataLoader(Images([r for r in rows if r["split"]==s],args.task,labels,normalize=args.task!="segmentation" or args.architecture=="deeplab"),batch_size=args.batch_size,shuffle=s=="train",num_workers=0) for s in ["train","val","test"]}
    if args.task=="segmentation" and args.architecture=="deeplab":
        from torchvision.models.segmentation import deeplabv3_resnet50
        model=deeplabv3_resnet50(weights=None,weights_backbone="DEFAULT" if args.pretrained else None,num_classes=2)
    elif args.task=="segmentation":model=UNet()
    elif args.task=="classification":model=ImageClassifier(len(labels),args.pretrained)
    else:model=DamageClassifier(len(labels),args.pretrained)
    device=torch.device("cuda" if torch.cuda.is_available() else "cpu");model.to(device);criterion=nn.CrossEntropyLoss(ignore_index=255);optimizer=torch.optim.AdamW(model.parameters(),lr=args.learning_rate,weight_decay=1e-4);scheduler=torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer,patience=2)
    output=Path(args.output);output.mkdir(parents=True,exist_ok=True);best=float("inf");stale=0;history=[];started=time.perf_counter()
    for epoch in range(args.epochs):
        if args.pretrained and args.task!="segmentation":
            backbone=model.backbone if args.task=="classification" else model.encoder
            for name,p in backbone.named_parameters():p.requires_grad=epoch>=args.freeze_epochs or name.startswith("fc")
        losses={}
        for split in ["train","val"]:
            model.train(split=="train");total=0;count=0
            if split=="train" and args.pretrained and epoch<args.freeze_epochs and args.task!="segmentation":backbone.eval()
            with torch.set_grad_enabled(split=="train"):
                for batch in loaders[split]:
                    batch=[x.to(device) for x in batch];x,y=batch[0],batch[-1]
                    logits=model(batch[1],x) if args.task=="damage" else model(x)
                    if isinstance(logits,dict):logits=logits["out"]
                    loss=criterion(logits,y)
                    if split=="train":optimizer.zero_grad();loss.backward();torch.nn.utils.clip_grad_norm_(model.parameters(),1.);optimizer.step()
                    total+=loss.item()*x.shape[0];count+=x.shape[0]
            losses[split]=total/max(1,count)
        scheduler.step(losses["val"]);history.append({"epoch":epoch+1,**losses});print(history[-1])
        if losses["val"]<best:
            best=losses["val"];stale=0;torch.save({"state_dict":model.state_dict(),"task":args.task,"architecture":args.architecture if args.task=="segmentation" else "resnet18","classes":labels,"channels":3,"normalization":"imagenet" if args.task!="segmentation" or args.architecture=="deeplab" else "rgb01","size":256},output/"model.pt")
        else:stale+=1
        if stale>=args.patience:break
    checkpoint=torch.load(output/"model.pt",map_location=device,weights_only=True);model.load_state_dict(checkpoint["state_dict"]);model.eval();truth=[];predictions=[];intersection=union=tp=fp=fn=0
    with torch.inference_mode():
        for batch in loaders["test"]:
            batch=[x.to(device) for x in batch];y=batch[-1];logits=model(batch[1],batch[0]) if args.task=="damage" else model(batch[0]);logits=logits["out"] if isinstance(logits,dict) else logits;pred=logits.argmax(1)
            if args.task=="segmentation":
                valid=y.ne(255);p=pred.eq(1)&valid;t=y.eq(1)&valid;tp+=int((p&t).sum());fp+=int((p&~t).sum());fn+=int((~p&t).sum())
            else:truth.extend(labels[i] for i in y.cpu().tolist());predictions.extend(labels[i] for i in pred.cpu().tolist())
    metadata={"task":args.task,"architecture":checkpoint["architecture"],"history":history,"training_seconds":time.perf_counter()-started,"test_events":sorted({r['event'] for r in rows if r['split']=='test'})}
    if args.task=="segmentation":
        metrics={**metadata,"water_iou":tp/(tp+fp+fn) if tp+fp+fn else None,"water_dice":2*tp/(2*tp+fp+fn) if 2*tp+fp+fn else None,"tp":tp,"fp":fp,"fn":fn};(output/"metrics.json").write_text(json.dumps(metrics,indent=2));print(json.dumps(metrics,indent=2))
    else:export_predictions(output,truth,predictions,metadata)
if __name__=="__main__":main()
