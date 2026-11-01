"""CLIP image-text retrieval experiment; retain original labelled evidence."""
import argparse,json
from PIL import Image
import torch
from transformers import CLIPModel,CLIPProcessor
def main():
    p=argparse.ArgumentParser();p.add_argument("image");p.add_argument("--captions",nargs="+",required=True);p.add_argument("--model",default="openai/clip-vit-base-patch32");args=p.parse_args();processor=CLIPProcessor.from_pretrained(args.model);model=CLIPModel.from_pretrained(args.model).eval();inputs=processor(text=args.captions,images=Image.open(args.image).convert("RGB"),return_tensors="pt",padding=True)
    with torch.inference_mode():scores=model(**inputs).logits_per_image.softmax(-1)[0].tolist()
    print(json.dumps(sorted([{"caption":caption,"relative_similarity":score} for caption,score in zip(args.captions,scores)],key=lambda r:r["relative_similarity"],reverse=True),indent=2));print("Relative similarity among these captions is not evidence verification or a calibrated truth probability.")
if __name__=="__main__":main()
