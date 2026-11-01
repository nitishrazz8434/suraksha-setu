import csv, json, random
from pathlib import Path
import numpy as np

def seed_all(seed=42):
    random.seed(seed);np.random.seed(seed)
    try:
        import torch
        torch.manual_seed(seed)
        if torch.cuda.is_available(): torch.cuda.manual_seed_all(seed)
    except ImportError: pass

def read_manifest(path):
    path=Path(path);rows=[json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not rows: raise ValueError("The manifest is empty")
    for row in rows:
        if row.get("split") not in {"train","val","test"}: raise ValueError("Every record needs split=train, val or test")
        for key in ["image","mask","reference"]:
            if row.get(key): row[key]=str((path.parent/row[key]).resolve())
    # Explicit event holdout is required to avoid neighboring image/tweet leakage.
    events={}
    for row in rows:
        if not row.get("event"): raise ValueError("Every record requires an event identifier")
        previous=events.setdefault(row["event"],row["split"])
        if previous!=row["split"]: raise ValueError(f"Event {row['event']} appears in multiple splits")
    if any(not any(r["split"]==s for r in rows) for s in ["train","val","test"]): raise ValueError("All three splits are required")
    return rows

def export_predictions(folder,truth,prediction,metadata):
    from sklearn.metrics import classification_report,confusion_matrix,accuracy_score,f1_score
    folder=Path(folder);folder.mkdir(parents=True,exist_ok=True)
    with (folder/"predictions.csv").open("w",newline="",encoding="utf-8") as f:
        writer=csv.writer(f);writer.writerow(["truth","prediction"]);writer.writerows(zip(truth,prediction))
    result={"samples":len(truth),"accuracy":accuracy_score(truth,prediction),"macro_f1":f1_score(truth,prediction,average="macro",zero_division=0),"classes":classification_report(truth,prediction,output_dict=True,zero_division=0),"confusion_matrix":confusion_matrix(truth,prediction).tolist(),**metadata}
    (folder/"metrics.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
    print(json.dumps(result,indent=2));return result
