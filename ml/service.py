"""Authenticated checkpoint inference service for the web application.

MODEL_DIR defaults to ./models. No weights are downloaded at service startup.
Run from the project root: uvicorn ml.service:app --host 127.0.0.1 --port 8000
"""
import base64,io,json,os,re,secrets,sys
from functools import lru_cache
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import numpy as np
import torch
from fastapi import FastAPI,File,Form,UploadFile,HTTPException,Depends,Header
from pydantic import BaseModel,Field
from PIL import Image,ImageDraw,UnidentifiedImageError
from torchvision import transforms
from models import UNet,ImageClassifier,DamageClassifier,BiLSTM,MultimodalFusion

ROOT=Path(os.environ.get("MODEL_DIR","models")).resolve();DEVICE=torch.device("cuda" if torch.cuda.is_available() else "cpu")
app=FastAPI(title="SurakshaSetu Model Service",version="1.0.0")
Image.MAX_IMAGE_PIXELS=20_000_000
def authorize(authorization:str|None=Header(default=None)):
    token=os.environ.get("ML_SERVICE_TOKEN")
    if token and not secrets.compare_digest(authorization or "",f"Bearer {token}"):raise HTTPException(401,"Invalid service credential")

async def image_file(file:UploadFile):
    if file.content_type not in {"image/png","image/jpeg","image/webp"}:raise HTTPException(400,"Use PNG, JPEG or WebP")
    data=await file.read(8_000_001)
    if len(data)>8_000_000:raise HTTPException(413,"Maximum image size is 8 MB")
    try:
        image=Image.open(io.BytesIO(data))
        if image.width*image.height>20_000_000:raise HTTPException(413,"Maximum image size is 20 megapixels")
        return image.convert("RGB")
    except (UnidentifiedImageError,Image.DecompressionBombError):raise HTTPException(400,"Invalid image")

def data_url(image):
    buffer=io.BytesIO();image.save(buffer,format="PNG");return "data:image/png;base64,"+base64.b64encode(buffer.getvalue()).decode()

@lru_cache(maxsize=8)
def vision_model(task):
    task="classification" if task=="gradcam" else task;path=ROOT/task/"model.pt"
    if not path.exists():raise HTTPException(503,f"No {task} checkpoint. Run the corresponding training script first.")
    checkpoint=torch.load(path,map_location=DEVICE,weights_only=True);classes=checkpoint["classes"]
    if task=="segmentation":
        if checkpoint["architecture"]=="deeplab":
            from torchvision.models.segmentation import deeplabv3_resnet50
            model=deeplabv3_resnet50(weights=None,weights_backbone=None,num_classes=len(classes))
        else:model=UNet(channels=checkpoint.get("channels",3),classes=len(classes))
    elif task=="damage":model=DamageClassifier(len(classes))
    else:model=ImageClassifier(len(classes))
    model.load_state_dict(checkpoint["state_dict"]);model.to(DEVICE).eval();return model,checkpoint

def tensor(image,size=256,normalization="rgb01"):
    steps=[transforms.Resize((size,size)),transforms.ToTensor()]
    if normalization=="imagenet":steps.append(transforms.Normalize([.485,.456,.406],[.229,.224,.225]))
    return transforms.Compose(steps)(image).unsqueeze(0).to(DEVICE)

@app.get("/health",dependencies=[Depends(authorize)])
def health():return {"service":"SurakshaSetu model inference","device":str(DEVICE),"tasks":[task for task in ["segmentation","classification","damage"] if (ROOT/task/"model.pt").exists()],"text_available":any((ROOT/"text"/f).exists() for f in ["tfidf.joblib","bilstm.pt","config.json"])}

@app.post("/vision",dependencies=[Depends(authorize)])
async def vision(file:UploadFile=File(...),task:str=Form("segmentation"),reference:UploadFile|None=File(default=None)):
    if task not in {"segmentation","detection","damage","gradcam"}:raise HTTPException(400,"Unsupported vision task")
    image=await image_file(file)
    if task=="detection":
        path=ROOT/"detection"/"run"/"weights"/"best.pt"
        if not path.exists():raise HTTPException(503,"Train the building detector before using detection")
        try:from ultralytics import YOLO
        except ImportError:raise HTTPException(503,"Install the detector's ultralytics dependency")
        result=YOLO(str(path)).predict(image,verbose=False)[0];overlay=image.copy();draw=ImageDraw.Draw(overlay);boxes=[]
        for box in result.boxes:
            xy=box.xyxy[0].cpu().tolist();label=result.names[int(box.cls[0])];confidence=float(box.conf[0]);boxes.append({"bbox":xy,"label":label,"confidence":confidence});draw.rectangle(xy,outline="#61e0a0",width=3);draw.text((xy[0]+3,xy[1]+3),f"{label} {confidence:.2f}",fill="#20603c")
        return {"task":task,"detections":boxes,"image":data_url(overlay),"checkpoint":str(path.relative_to(ROOT))}
    model,meta=vision_model(task);x=tensor(image,meta.get("size",256),meta.get("normalization","rgb01"));classes=meta["classes"]
    if task=="segmentation":
        with torch.inference_mode():
            result=model(x);result=result["out"] if isinstance(result,dict) else result;probability=result.softmax(1)[0,1];mask=Image.fromarray((probability.cpu().numpy()>.5).astype(np.uint8)*255).resize(image.size,Image.Resampling.NEAREST)
        pixels=np.asarray(image).copy();selected=np.asarray(mask)>0;pixels[selected]=(pixels[selected]*.45+np.array([35,150,210])*.55).astype(np.uint8)
        return {"task":task,"mask":data_url(Image.fromarray(pixels)),"water_fraction":float(selected.mean()),"input_modality":"RGB optical [0,1]","checkpoint":meta["architecture"]}
    if task=="damage":
        if reference is None:raise HTTPException(422,"A pre-event reference image is required")
        before=await image_file(reference)
        with torch.inference_mode():probability=model(tensor(before,meta.get("size",256),meta.get("normalization","rgb01")),x).softmax(1)[0]
        index=int(probability.argmax());return {"task":task,"label":classes[index],"score":float(probability[index]),"probabilities":dict(zip(classes,probability.cpu().tolist())),"note":"Requires aligned building crops compatible with training."}
    activations=[]
    def hook(module,inputs,output):output.retain_grad();activations.append(output)
    handle=model.backbone.layer4.register_forward_hook(hook)
    try:
        model.zero_grad(set_to_none=True);logits=model(x);index=int(logits.argmax(1));logits[0,index].backward();features=activations[0];weights=features.grad.mean((2,3),keepdim=True);cam=(weights*features).sum(1).relu()[0];cam=cam/(cam.max()+1e-8);heat=Image.fromarray((cam.detach().cpu().numpy()*255).astype(np.uint8)).resize(image.size,Image.Resampling.BILINEAR);alpha=np.asarray(heat,dtype=np.float32)[...,None]/255*.65;pixels=np.asarray(image,dtype=np.float32);overlay=(pixels*(1-alpha)+np.array([230,85,45])*alpha).astype(np.uint8);probs=logits.softmax(1)[0].detach().cpu()
        return {"task":task,"image":data_url(Image.fromarray(overlay)),"label":classes[index],"score":float(probs[index]),"note":"Grad-CAM highlights sensitivity, not causal proof."}
    finally:handle.remove();model.zero_grad(set_to_none=True)

class TextRequest(BaseModel):text:str=Field(min_length=1,max_length=20000)
@lru_cache(maxsize=1)
def text_model():
    path=ROOT/"text"
    if (path/"config.json").exists():
        from transformers import AutoTokenizer,AutoModelForSequenceClassification
        return "bert",(AutoTokenizer.from_pretrained(path,local_files_only=True),AutoModelForSequenceClassification.from_pretrained(path,local_files_only=True).to(DEVICE).eval())
    if (path/"bilstm.pt").exists():
        meta=torch.load(path/"bilstm.pt",map_location=DEVICE,weights_only=True);model=BiLSTM(len(meta["vocabulary"]),len(meta["classes"]));model.load_state_dict(meta["state_dict"]);return "bilstm",(model.to(DEVICE).eval(),meta)
    if (path/"tfidf.joblib").exists():
        import joblib
        return "tfidf",joblib.load(path/"tfidf.joblib")
    raise HTTPException(503,"No trained text model. Run train_text.py first.")

@app.post("/text",dependencies=[Depends(authorize)])
def text(request:TextRequest):
    kind,model=text_model()
    if kind=="tfidf":probability=model.predict_proba([request.text])[0];classes=model.classes_.tolist()
    elif kind=="bert":
        tokenizer,network=model
        with torch.inference_mode():probability=network(**tokenizer(request.text,truncation=True,max_length=192,return_tensors="pt").to(DEVICE)).logits.softmax(-1)[0].cpu().numpy()
        classes=[network.config.id2label[i] for i in range(len(probability))]
    else:
        network,meta=model;vocab=meta["vocabulary"];encoded=[vocab.get(t,1) for t in re.findall(r"\w+",request.text.lower())[:192]] or [1]
        with torch.inference_mode():probability=network(torch.tensor([encoded],device=DEVICE)).softmax(-1)[0].cpu().numpy()
        classes=meta["classes"]
    index=int(np.argmax(probability));return {"model":kind,"label":classes[index],"score":float(probability[index]),"probabilities":dict(zip(classes,[float(p) for p in probability]))}

class AssistantRequest(BaseModel):
    question:str=Field(max_length=2000)
    context:str=Field(max_length=20000)
    language:str="en"

@lru_cache(maxsize=1)
def fusion_model():
    from transformers import AutoTokenizer
    folder=ROOT/"fusion"
    if not (folder/"model.pt").exists() or not (folder/"text-config").exists():raise HTTPException(503,"No compatible local fusion checkpoint")
    meta=torch.load(folder/"model.pt",map_location=DEVICE,weights_only=True)
    model=MultimodalFusion(len(meta["classes"]),str(folder/"text-config"),pretrained=False)
    model.load_state_dict(meta["state_dict"]);model.to(DEVICE).eval()
    return model,AutoTokenizer.from_pretrained(folder,local_files_only=True),meta

@app.post("/multimodal",dependencies=[Depends(authorize)])
async def multimodal(file:UploadFile=File(...),text:str=Form(...)):
    if len(text)>20000:raise HTTPException(400,"Report text is too long")
    image=await image_file(file);model,tokenizer,meta=fusion_model()
    transform=transforms.Compose([transforms.Resize((224,224)),transforms.ToTensor(),transforms.Normalize([.485,.456,.406],[.229,.224,.225])])
    inputs=tokenizer(text,padding=True,truncation=True,max_length=128,return_tensors="pt").to(DEVICE)
    with torch.inference_mode():probability=model(transform(image).unsqueeze(0).to(DEVICE),inputs["input_ids"],inputs["attention_mask"],meta["mode"]).softmax(-1)[0].cpu()
    index=int(probability.argmax())
    return {"model":f"gated-{meta['mode']}","label":meta["classes"][index],"score":float(probability[index]),"note":"Classification is not evidence verification."}

@lru_cache(maxsize=1)
def summarizer():
    from transformers import AutoTokenizer,AutoModelForSeq2SeqLM
    path=ROOT/"summarizer"
    if not (path/"config.json").exists():raise HTTPException(503,"No summarization checkpoint. Use grounded local responses.")
    return AutoTokenizer.from_pretrained(path,local_files_only=True),AutoModelForSeq2SeqLM.from_pretrained(path,local_files_only=True).to(DEVICE).eval()
@app.post("/assistant",dependencies=[Depends(authorize)])
def assistant(request:AssistantRequest):
    if request.language=="hi":return {"text":request.context}
    tokenizer,model=summarizer();prompt="summarize: "+request.context
    with torch.inference_mode():result=model.generate(**tokenizer(prompt,truncation=True,max_length=512,return_tensors="pt").to(DEVICE),max_new_tokens=180,num_beams=4)
    generated=tokenizer.decode(result[0],skip_special_tokens=True)
    # Preserve calculated source text if the model invents a new numerical value.
    context_numbers=set(re.findall(r"\d[\d,.]*",request.context));new_numbers=set(re.findall(r"\d[\d,.]*",generated))
    return {"text":generated if generated and new_numbers<=context_numbers else request.context,"source_context":request.context,"note":"Numerical consistency check is not a complete factuality guarantee."}
