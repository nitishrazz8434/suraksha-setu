"""Convert annotated CSV records to event-disjoint manifests; never invent labels."""
import argparse,csv,json
from pathlib import Path
def main():
    p=argparse.ArgumentParser();p.add_argument("csv_file");p.add_argument("--text-column",default="text");p.add_argument("--image-column",default="image");p.add_argument("--label-column",default="label");p.add_argument("--event-column",default="event");p.add_argument("--val-events",nargs="+",required=True);p.add_argument("--test-events",nargs="+",required=True);p.add_argument("--output",default="data/manifest.jsonl");args=p.parse_args()
    if set(args.val_events)&set(args.test_events):raise ValueError("Validation and test events must be disjoint")
    rows=[];source=Path(args.csv_file).resolve()
    with source.open(encoding="utf-8",newline="") as f:
        for r in csv.DictReader(f):
            event=r[args.event_column];row={"label":r[args.label_column],"event":event,"split":"test" if event in args.test_events else "val" if event in args.val_events else "train"}
            if args.text_column in r:row["text"]=r[args.text_column]
            if args.image_column in r and r[args.image_column]:row["image"]=str((source.parent/r[args.image_column]).resolve())
            rows.append(row)
    out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text("\n".join(json.dumps(r,ensure_ascii=False) for r in rows)+"\n",encoding="utf-8");print(f"Wrote {len(rows)} labelled records to {out}")
if __name__=="__main__":main()
