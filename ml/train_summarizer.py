"""Fine-tune T5 on labelled bulletin summaries, choose by validation loss, report ROUGE."""
import argparse,json
from pathlib import Path
import torch
from torch.utils.data import DataLoader
from transformers import AutoTokenizer,AutoModelForSeq2SeqLM
from rouge_score.rouge_scorer import RougeScorer
from common import read_manifest,seed_all
def main():
    p=argparse.ArgumentParser();p.add_argument("manifest");p.add_argument("--base-model",default="google/flan-t5-small");p.add_argument("--output",default="models/summarizer");p.add_argument("--epochs",type=int,default=5);p.add_argument("--batch-size",type=int,default=4);args=p.parse_args();seed_all();rows=read_manifest(args.manifest);device=torch.device("cuda" if torch.cuda.is_available() else "cpu");tokenizer=AutoTokenizer.from_pretrained(args.base_model);model=AutoModelForSeq2SeqLM.from_pretrained(args.base_model).to(device)
    def collate(batch):
        x=tokenizer(["summarize: "+r["text"] for r in batch],padding=True,truncation=True,max_length=512,return_tensors="pt");y=tokenizer(text_target=[r["summary"] for r in batch],padding=True,truncation=True,max_length=160,return_tensors="pt")["input_ids"];y[y==tokenizer.pad_token_id]=-100;return {**{k:v.to(device) for k,v in x.items()},"labels":y.to(device)}
    loaders={s:DataLoader([r for r in rows if r["split"]==s],batch_size=args.batch_size,shuffle=s=="train",collate_fn=collate) for s in ["train","val"]};optimizer=torch.optim.AdamW(model.parameters(),lr=5e-5);best=float("inf");out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    for epoch in range(args.epochs):
        for split in ["train","val"]:
            model.train(split=="train");total=0;count=0
            with torch.set_grad_enabled(split=="train"):
                for batch in loaders[split]:
                    loss=model(**batch).loss
                    if split=="train":optimizer.zero_grad();loss.backward();torch.nn.utils.clip_grad_norm_(model.parameters(),1);optimizer.step()
                    total+=loss.item();count+=1
            if split=="val" and total/count<best:best=total/count;model.save_pretrained(out);tokenizer.save_pretrained(out)
            print({"epoch":epoch+1,"split":split,"loss":total/count})
    model=AutoModelForSeq2SeqLM.from_pretrained(out).to(device).eval();scorer=RougeScorer(["rouge1","rouge2","rougeL"],use_stemmer=True);results=[]
    with torch.inference_mode():
        for row in [r for r in rows if r["split"]=="test"]:
            inputs=tokenizer("summarize: "+row["text"],truncation=True,max_length=512,return_tensors="pt").to(device);generated=model.generate(**inputs,max_new_tokens=160,num_beams=4);text=tokenizer.decode(generated[0],skip_special_tokens=True);scores=scorer.score(row["summary"],text);results.append({"reference":row["summary"],"prediction":text,**{k:v.fmeasure for k,v in scores.items()}})
    metrics={"samples":len(results),**{key:sum(r[key] for r in results)/len(results) for key in ["rouge1","rouge2","rougeL"]},"note":"ROUGE measures lexical overlap; factuality requires separate review."};(out/"metrics.json").write_text(json.dumps(metrics,indent=2));(out/"predictions.json").write_text(json.dumps(results,indent=2));print(metrics)
if __name__=="__main__":main()
