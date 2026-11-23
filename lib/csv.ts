export function parseCSV(text:string):Record<string,string>[] {const rows:string[][]=[];let row:string[]=[],value="",quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===","&&!quoted){row.push(value);value="";}else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&text[i+1]==="\n")i++;row.push(value);if(row.some(x=>x.trim()))rows.push(row);row=[];value="";}else value+=c;}if(quoted)throw new Error("CSV has an unclosed quoted field");row.push(value);if(row.some(x=>x.trim()))rows.push(row);const headers=rows.shift()?.map(h=>h.replace(/^\uFEFF/,"").trim());if(!headers?.length||new Set(headers).size!==headers.length)throw new Error("CSV requires unique column headers");return rows.map((values,i)=>{if(values.length!==headers.length)throw new Error(`CSV row ${i+2} has ${values.length} values; expected ${headers.length}`);return Object.fromEntries(headers.map((h,j)=>[h,values[j].trim()]));});}
export function toCSV(records:Record<string,unknown>[],headers?:string[]){headers??=[...new Set(records.flatMap(Object.keys))];const quote=(x:unknown)=>{const s=typeof x==="object"&&x!==null?JSON.stringify(x):String(x??"");const safe=/^[=+@\-]/.test(s)?`'${s}`:s;return'"'+safe.replaceAll('"','""')+'"';};return[headers.map(quote).join(","),...records.map(r=>headers!.map(h=>quote(r[h])).join(","))].join("\r\n");}
export interface CSVPreviewRow{line:number;values:Record<string,string>;error?:string;}
export function parseCSVForReview(text:string){
 const rows:{line:number;cells:string[]}[]=[];let cells:string[]=[],value="",quoted=false,line=1,rowLine=1;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
  else if(c===","&&!quoted){cells.push(value);value="";}
  else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&text[i+1]==="\n")i++;cells.push(value);if(cells.some(item=>item.trim()))rows.push({line:rowLine,cells});cells=[];value="";line++;rowLine=line;}
  else{value+=c;if((c==="\n"||c==="\r")&&quoted){if(c==="\r"&&text[i+1]==="\n")i++;line++;}}
 }
 if(quoted)throw new Error("CSV has an unclosed quoted field.");
 cells.push(value);if(cells.some(item=>item.trim()))rows.push({line:rowLine,cells});
 const headers=rows.shift()?.cells.map(header=>header.replace(/^\uFEFF/,"").trim());
 if(!headers?.length)throw new Error("CSV requires a header row.");
 const normalized=headers.map(header=>header.toLocaleLowerCase());
 if(new Set(normalized).size!==normalized.length)throw new Error("CSV requires unique column headers.");
 return{headers,rows:rows.map(row=>({line:row.line,values:Object.fromEntries(headers.map((header,index)=>[header,(row.cells[index]??"").trim()])),...(row.cells.length!==headers.length?{error:"This row has "+row.cells.length+" values; expected "+headers.length+"."}:{})})) as CSVPreviewRow[]};
}
