"""Ultralytics adapter for YOLO-compatible, event-held-out building datasets.
Install the separate ultralytics package; inspect its license before reuse.
"""
import argparse,json
from pathlib import Path
def main():
    from ultralytics import YOLO
    p=argparse.ArgumentParser();p.add_argument("dataset",help="YOLO dataset YAML with train/val/test paths");p.add_argument("--base-model",default="yolo11n.pt");p.add_argument("--epochs",type=int,default=30);p.add_argument("--output",default="models/detection");args=p.parse_args()
    model=YOLO(args.base_model);model.train(data=args.dataset,epochs=args.epochs,imgsz=640,project=str(Path(args.output).resolve()),name="run",exist_ok=True,seed=42);metrics=model.val(data=args.dataset,split="test");out=Path(args.output);out.mkdir(parents=True,exist_ok=True);(out/"metrics.json").write_text(json.dumps({"map50":float(metrics.box.map50),"map50_95":float(metrics.box.map),"note":"Ensure event-disjoint splits in the source YAML."},indent=2))
if __name__=="__main__":main()
