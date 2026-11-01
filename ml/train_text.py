"""Train TF-IDF, BiLSTM or BERT on event-disjoint JSONL manifests."""
import argparse,json,re,time
from collections import Counter
from pathlib import Path
import numpy as np
from common import read_manifest,seed_all,export_predictions

def tokens(text):return re.findall(r"\w+",text.lower(),flags=re.UNICODE)
def main():
    p=argparse.ArgumentParser();p.add_argument("manifest");p.add_argument("--model",choices=["tfidf","bilstm","bert"],default="tfidf");p.add_argument("--output",default="models/text");p.add_argument("--epochs",type=int,default=5);p.add_argument("--batch-size",type=int,default=16);p.add_argument("--base-model",default="bert-base-multilingual-cased");p.add_argument("--learning-rate",type=float,default=None);args=p.parse_args()
    seed_all();rows=read_manifest(args.manifest);splits={s:[r for r in rows if r["split"]==s] for s in ["train","val","test"]};labels=sorted({r["label"] for r in splits["train"]});output=Path(args.output);output.mkdir(parents=True,exist_ok=True)
    if any(r["label"] not in labels for r in rows):raise ValueError("Every evaluation label must occur in the training set")
    started=time.perf_counter()
    if args.model=="tfidf":
        from sklearn.pipeline import Pipeline
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        import joblib
        model=Pipeline([("tfidf",TfidfVectorizer(ngram_range=(1,2),max_features=40000,sublinear_tf=True)),("classifier",LogisticRegression(class_weight="balanced",max_iter=1000,random_state=42))]);model.fit([r['text'] for r in splits['train']],[r['label'] for r in splits['train']]);joblib.dump(model,output/"tfidf.joblib");pred=model.predict([r['text'] for r in splits['test']]).tolist()
    else:
        import torch
        from torch.utils.data import DataLoader
        from models import BiLSTM
        device=torch.device("cuda" if torch.cuda.is_available() else "cpu");tokenizer=None;vocab=None
        if args.model=="bilstm":
            counts=Counter(t for r in splits["train"] for t in tokens(r["text"]));vocab={"<pad>":0,"<unk>":1,**{t:i+2 for i,(t,_) in enumerate(counts.most_common(20000))}};model=BiLSTM(len(vocab),len(labels));(output/"vocabulary.json").write_text(json.dumps(vocab,ensure_ascii=False),encoding="utf-8")
        else:
            from transformers import AutoTokenizer,AutoModelForSequenceClassification
            tokenizer=AutoTokenizer.from_pretrained(args.base_model);model=AutoModelForSequenceClassification.from_pretrained(args.base_model,num_labels=len(labels),id2label=dict(enumerate(labels)),label2id={l:i for i,l in enumerate(labels)})
        def collate(batch):
            texts=[r["text"] for r in batch];y=torch.tensor([labels.index(r["label"]) for r in batch],device=device)
            if tokenizer:inputs={k:v.to(device) for k,v in tokenizer(texts,padding=True,truncation=True,max_length=192,return_tensors="pt").items()}
            else:
                encoded=[[vocab.get(t,1) for t in tokens(text)[:192]] or [1] for text in texts];width=max(map(len,encoded));inputs=torch.tensor([e+[0]*(width-len(e)) for e in encoded],device=device)
            return inputs,y
        loaders={s:DataLoader(splits[s],batch_size=args.batch_size,shuffle=s=="train",collate_fn=collate) for s in splits};model.to(device);opt=torch.optim.AdamW(model.parameters(),lr=args.learning_rate or (2e-5 if tokenizer else 1e-3));best=float("inf");history=[]
        for epoch in range(args.epochs):
            losses={}
            for split in ["train","val"]:
                model.train(split=="train");total=0;count=0
                with torch.set_grad_enabled(split=="train"):
                    for x,y in loaders[split]:
                        logits=model(**x).logits if tokenizer else model(x);loss=torch.nn.functional.cross_entropy(logits,y)
                        if split=="train":opt.zero_grad();loss.backward();torch.nn.utils.clip_grad_norm_(model.parameters(),1);opt.step()
                        total+=loss.item()*len(y);count+=len(y)
                losses[split]=total/count
            history.append({"epoch":epoch+1,**losses});print(history[-1])
            if losses["val"]<best:
                best=losses["val"]
                if tokenizer:model.save_pretrained(output);tokenizer.save_pretrained(output)
                else:torch.save({"state_dict":model.state_dict(),"vocabulary":vocab,"classes":labels},output/"bilstm.pt")
        if tokenizer:model=AutoModelForSequenceClassification.from_pretrained(output).to(device)
        else:model.load_state_dict(torch.load(output/"bilstm.pt",map_location=device,weights_only=True)["state_dict"])
        model.eval();pred=[]
        with torch.inference_mode():
            for x,y in loaders["test"]:pred.extend(labels[i] for i in (model(**x).logits if tokenizer else model(x)).argmax(-1).cpu().tolist())
    export_predictions(output,[r["label"] for r in splits["test"]],pred,{"model":args.model,"training_seconds":time.perf_counter()-started,"test_events":sorted({r["event"] for r in splits["test"]})})
    (output/"model-card.json").write_text(json.dumps({"model":args.model,"classes":labels,"records":{s:len(v) for s,v in splits.items()},"event_disjoint":True},indent=2))
if __name__=="__main__":main()
