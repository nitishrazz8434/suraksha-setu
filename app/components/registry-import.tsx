"use client";
import {useMemo,useState} from "react";
import {AlertTriangle,CheckCircle2,Download,Upload} from "lucide-react";
import type {Workspace} from "../../lib/types";
import {buildRegistryImport,rejectedImportCSV,type RegistryImportFile,type RegistryImportResult} from "../../lib/registry-import";
import {Badge,Button,Card,CardHead,Modal,Notice,download} from "./ui";

const labels={districts:"districts",settlements:"settlements",households:"households",sites:"sites",hazards:"hazard layers",routes:"measured routes"} as const;
function recordDetails(kind:RegistryImportFile["kind"],record:Record<string,unknown>|undefined,workspace:Workspace){
 if(!record)return"";
 const show=(value:unknown)=>value===undefined||value===null?"":String(value);
 const district=typeof record.districtId==="string"?workspace.districts.find(item=>item.id===record.districtId)?.name:undefined;
 const settlementId=typeof record.settlementId==="string"?record.settlementId:typeof record.id==="string"?record.id:"";
 const settlement=workspace.settlements.find(item=>item.id===settlementId)?.name;
 const site=typeof record.siteId==="string"?workspace.sites.find(item=>item.id===record.siteId)?.name:undefined;
 if(kind==="districts")return[String(record.state),record.lat,record.lng].join(" · ");
 if(kind==="settlements")return[district,record.lat,record.lng,record.source,record.verified?"Verified":"Unverified"].filter(Boolean).join(" · ");
 if(kind==="households")return[settlement,show(record.size)+" people","priority "+show(record.priority),record.assisted?"accessibility support":"no accessibility flag",record.medical?"medical support":""].filter(Boolean).join(" · ");
 if(kind==="sites")return[district,show(record.locality),"space "+show(record.space),"water "+show(record.water),"sanitation "+show(record.sanitation),"occupancy "+show(record.occupancy),record.safetyReviewed?"safety reviewed":"safety review needed"].filter(Boolean).join(" · ");
 if(kind==="hazards")return[district,show(record.hazard),"severity "+show(record.severity),show(record.source),record.verified?"Verified":"Unverified"].filter(Boolean).join(" · ");
 return[settlement,site,show(record.distance)+" km",show(record.duration)+" min",show(record.source),typeof record.fetchedAt==="string"?new Date(record.fetchedAt).toLocaleString("en-IN"):"measurement date missing"].filter(Boolean).join(" · ");
}
export function RegistryImport({file,workspace,onClose,onCommit}:{file:RegistryImportFile;workspace:Workspace;onClose:()=>void;onCommit:(result:RegistryImportResult)=>void}){
 const[updateMatches,setUpdateMatches]=useState(false);
 const result=useMemo(()=>buildRegistryImport(file,workspace,updateMatches),[file,workspace,updateMatches]);
 const ready=result.added+result.updated,shown=result.rows.slice(0,100);
 return <Modal title="Review your import before saving" subtitle={file.name+" · "+labels[file.kind]} wide onClose={onClose}>
  <div className="modal-body import-review">
   <p className="import-intro">Check the rows SurakshaSetu can accept. Common headings such as “Village”, “Family size”, “Latitude” and “Shelter capacity” are matched automatically. Rows with errors are held out; you can save valid rows and download rejected ones to correct them.</p>
   <Notice>Import settlements before households, and register districts before settlements or sites. If a district column is absent, rows use the district selected in the workspace. Dates and source details remain attached to the imported records.</Notice>
   {file.unmappedHeaders.length>0&&<Notice tone="warning">These columns are not used by this register and will be ignored: <b>{file.unmappedHeaders.join(", ")}</b>. Download the template if a required column is missing.</Notice>}
   <label className="import-update-option"><input type="checkbox" checked={updateMatches} onChange={event=>setUpdateMatches(event.target.checked)}/><span><b>Update matching records</b><small>Match by record ID, or by the register’s natural key (for example household reference and settlement). Leave off to prevent accidental overwrites.</small></span></label>
   <div className="import-summary">
    <Card className="import-summary-card"><small>Ready to add</small><b>{result.added}</b></Card>
    <Card className="import-summary-card"><small>Ready to update</small><b>{result.updated}</b></Card>
    <Card className="import-summary-card"><small>Needs correction</small><b>{result.rejected}</b></Card>
   </div>
   {result.rejected>0&&<div className="import-download-row"><span><AlertTriangle size={15}/>Rejected rows will not be saved.</span><Button onClick={()=>download("suraksha-import-errors.csv",rejectedImportCSV(file,result.rows),"text/csv")}><Download size={14}/>Download error rows</Button></div>}
   <Card className="import-table-card"><CardHead title="Row-by-row preview" subtitle={"Showing "+Math.min(100,result.rows.length)+" of "+result.rows.length+" source rows"}/><div className="table-wrap import-table-wrap"><table><thead><tr><th>Source row</th><th>Record & key details</th><th>Result</th><th>Validation</th></tr></thead><tbody>{shown.map(row=><tr key={row.line}><td>{row.line}</td><td><b>{row.label}</b><small className="import-details">{recordDetails(file.kind,row.record,workspace)}</small></td><td><Badge tone={row.status==="error"?"red":row.status==="update"?"blue":"green"}>{row.status==="error"?"Needs correction":row.status==="update"?"Update existing":"Add new"}</Badge></td><td>{row.errors.length?<span className="import-error">{row.errors.join("; ")}</span>:<span className="import-ok"><CheckCircle2 size={14}/>Valid</span>}</td></tr>)}</tbody></table></div></Card>
   {result.rows.length>100&&<Notice>For readability, the preview shows the first 100 rows. Every row is validated before saving.</Notice>}
   <Notice>Imported source and review fields are preserved. Records marked verified in the file are accepted as supplied by the authorized operator; confirm source provenance before importing them.</Notice>
  </div>
  <div className="modal-actions"><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={ready===0} onClick={()=>onCommit(result)}><Upload size={15}/>Save {ready} {labels[file.kind]}{result.rejected? " and skip "+result.rejected+" errors":""}</Button></div>
 </Modal>;
}
