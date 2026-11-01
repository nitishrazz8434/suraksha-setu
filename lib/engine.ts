import { BASE_SCENARIO, NODES, ROADS, SETTLEMENTS } from "./seed";
import type { Assignment, Extraction, Plan, Report, Scenario, Settlement, Site, Workspace } from "./types";

export const uid = (prefix = "ID") => `${prefix}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
export const fmt = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits:0 }).format(n);
const PLACE_ALIASES:Record<string,string[]>={S01:["मुंडक्कई","मुण्डक्कई"],S02:["चूरलमला","चूरालमला"],S03:["मेप्पाडी"],S04:["पोज़ुथाना","पोजुथाना"],S05:["विथिरी","वायथिरी"],S06:["कोट्टाथरा"],S07:["पडिंजराथरा"],S08:["कलपेट्टा"]};
const findPlace=(text:string)=>SETTLEMENTS.find(s=>text.toLowerCase().includes(s.name.toLowerCase())||PLACE_ALIASES[s.id]?.some(alias=>text.includes(alias)));
export function distance(a: [number,number], b: [number,number]) {
 const r=Math.PI/180, dlat=(b[0]-a[0])*r, dlng=(b[1]-a[1])*r;
 const h=Math.sin(dlat/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dlng/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
export function risk(s: Settlement, scenario: Scenario = BASE_SCENARIO, reports:Report[] = []) {
 const hazard=Math.max(s.flood,s.landslide)*0.65+Math.min(s.flood,s.landslide)*0.15;
 const evidence=Math.max(0,...reports.filter(r=>r.settlement===s.id&&r.status==="Verified"&&(r.hazard==="Flood"||r.hazard==="Landslide")).map(r=>r.severity==="Critical"?5:r.severity==="High"?3:1));
 return Math.min(99,Math.round(hazard*scenario.intensity+(s.vulnerable/s.households)*30+s.access*0.12+evidence));
}
export const riskLabel = (n:number) => n>=85?"Critical":n>=68?"High":n>=45?"Moderate":"Low";
export function capacity(site: Site, scenario: Scenario = BASE_SCENARIO) {
 const values={Space:site.space,Water:Math.floor(site.water*scenario.waterFactor),Sanitation:site.sanitation};
 const [bottleneck,total]=Object.entries(values).sort((a,b)=>a[1]-b[1])[0];
 const eligible=site.active&&!scenario.unavailableSites.includes(site.id);
 return {total,available:eligible?Math.max(0,total-site.occupancy):0,bottleneck,eligible};
}
export function closedRoads(scenario:Scenario,reports:Report[]) {
 return new Set([...scenario.closedRoads,...reports.filter(r=>r.status==="Verified"&&r.roadId).map(r=>r.roadId!)]);
}
export function route(from:string,to:string,scenario:Scenario,reports:Report[]=[]):{km:number;cost:number;path:string[]}|null {
 if(from===to)return {km:0.3,cost:0.3,path:[from]};
 const blocked=closedRoads(scenario,reports), distances:Record<string,number>={[from]:0}, previous:Record<string,string>={}, km:Record<string,number>={[from]:0}, seen=new Set<string>();
 while(true){
  const current=Object.keys(distances).filter(n=>!seen.has(n)).sort((a,b)=>distances[a]-distances[b])[0];
  if(!current)break;if(current===to){const path=[to];while(path[0]!==from)path.unshift(previous[path[0]]);return {km:km[to],cost:distances[to],path};}
  seen.add(current);
  for(const edge of ROADS){if(blocked.has(edge.id))continue;const next=edge.from===current?edge.to:edge.to===current?edge.from:null;if(!next)continue;
   const d=distance(NODES[current],NODES[next])*1.25, cost=d*(1+edge.exposure*scenario.intensity);
   if(distances[next]===undefined||distances[current]+cost<distances[next]){distances[next]=distances[current]+cost;km[next]=km[current]+d;previous[next]=current;}
  }
 }
 return null;
}

// Integer min-cost maximum flow. One unit is an indivisible four-person planning household.
// Assisted cohorts can only use an accessible site with medical support.
export function optimize(workspace:Workspace,scenario:Scenario=workspace.scenario,baseline=false):Plan {
 const cohorts=SETTLEMENTS.flatMap(s=>[
  {s,assisted:true,count:Math.min(Math.ceil(s.vulnerable*scenario.demandFactor),Math.ceil(s.households*scenario.demandFactor))},
  {s,assisted:false,count:Math.max(0,Math.ceil(s.households*scenario.demandFactor)-Math.ceil(s.vulnerable*scenario.demandFactor))},
 ]).filter(c=>c.count>0);
 const sites=workspace.sites, source=0,cStart=1,hStart=cStart+cohorts.length,sink=hStart+sites.length;
 type Edge={to:number;rev:number;cap:number;cost:number;initial:number;meta?:{cohort:number;site:number;trip:NonNullable<ReturnType<typeof route>>}};
 const graph:Edge[][]=Array.from({length:sink+1},()=>[]);
 function add(a:number,b:number,cap:number,cost:number,meta?:Edge["meta"]){const edge:Edge={to:b,rev:graph[b].length,cap,cost,initial:cap,meta};graph[a].push(edge);graph[b].push({to:a,rev:graph[a].length-1,cap:0,cost:-cost,initial:0});}
 cohorts.forEach((c,i)=>{add(source,cStart+i,c.count,0);sites.forEach((h,j)=>{
  if(c.assisted&&(!h.accessible||!h.medical))return;const trip=route(c.s.node,h.node,scenario,workspace.reports);if(!trip)return;
  // Among maximum-coverage solutions, protect higher-risk and assisted cohorts, then minimize exposure-weighted distance.
  const penalty=(100-risk(c.s,scenario,workspace.reports))*8+(c.assisted?0:120);
  add(cStart+i,hStart+j,c.count,penalty+Math.round(trip.cost*10),{cohort:i,site:j,trip});
 });});
 sites.forEach((h,j)=>add(hStart+j,sink,Math.floor(capacity(h,scenario).available/4),0));
 if(baseline){
  // Greedy nearest eligible site, deliberately without global reassignment.
  const remaining=sites.map(h=>Math.floor(capacity(h,scenario).available/4));
  cohorts.forEach((c,i)=>{let demand=c.count;const candidates=graph[cStart+i].filter(e=>e.meta).sort((a,b)=>a.meta!.trip.km-b.meta!.trip.km);
   for(const e of candidates){const amount=Math.min(demand,remaining[e.meta!.site]);if(amount<=0)continue;e.cap-=amount;remaining[e.meta!.site]-=amount;demand-=amount;}
  });
 }else{
  while(true){
   const dist=Array(sink+1).fill(Infinity),parentNode=Array(sink+1).fill(-1),parentEdge=Array(sink+1).fill(-1);dist[source]=0;
   // Bellman-Ford handles reverse edges introduced by residual reassignment.
   for(let pass=0;pass<sink;pass++){let changed=false;for(let u=0;u<=sink;u++){if(!Number.isFinite(dist[u]))continue;graph[u].forEach((e,k)=>{if(e.cap>0&&dist[e.to]>dist[u]+e.cost){dist[e.to]=dist[u]+e.cost;parentNode[e.to]=u;parentEdge[e.to]=k;changed=true;}});}if(!changed)break;}
   if(parentNode[sink]===-1)break;let amount=Infinity;
   for(let v=sink;v!==source;v=parentNode[v])amount=Math.min(amount,graph[parentNode[v]][parentEdge[v]].cap);
   for(let v=sink;v!==source;v=parentNode[v]){const e=graph[parentNode[v]][parentEdge[v]];e.cap-=amount;graph[v][e.rev].cap+=amount;}
  }
 }
 const assignments:Assignment[]=[];
 cohorts.forEach((c,i)=>graph[cStart+i].forEach(e=>{if(e.meta&&e.initial>e.cap){const count=e.initial-e.cap;assignments.push({settlementId:c.s.id,siteId:sites[e.meta.site].id,households:count,people:count*4,distance:e.meta.trip.km,assisted:c.assisted,path:e.meta.trip.path});}}));
 const demand=cohorts.reduce((a,c)=>a+c.count*4,0),served=assignments.reduce((a,c)=>a+c.people,0),assistedDemand=cohorts.filter(c=>c.assisted).reduce((a,c)=>a+c.count*4,0),assistedServed=assignments.filter(a=>a.assisted).reduce((a,c)=>a+c.people,0);
 return {id:uid("PLAN"),createdAt:new Date().toISOString(),status:"Draft",assignments,served,demand,unallocated:demand-served,distance:served?assignments.reduce((a,c)=>a+c.distance*c.people,0)/served:0,priorityCoverage:assistedDemand?assistedServed/assistedDemand*100:100,scenario:structuredClone(scenario)};
}

export function extract(text:string):Extraction {
 const lower=text.toLowerCase(),entities:Extraction["entities"]=[];
 const settlement=findPlace(text);
 if(settlement)entities.push({text:settlement.name,type:"Location"});
 const peopleMatch=text.match(/(\d+)\s*(people|persons|residents|individuals|लोग|व्यक्ति)/iu),people=peopleMatch?Number(peopleMatch[1]):null;
 if(peopleMatch)entities.push({text:peopleMatch[0],type:"Population"});
 const hazard=/landslide|slope|crack|भूस्खलन|दरार/i.test(text)?"Landslide":/flood|water rising|water is rising|inundat|बाढ़|जलभराव/i.test(text)?"Flood":/bridge|blocked|road|water supply|पुल|सड़क/i.test(text)?"Infrastructure":"Unspecified";
 const critical=/trapped|stranded|urgent|elderly|injured|फंसे|तुरंत|बुजुर्ग/i.test(text),high=/evacuat|rising|crack|blocked|बढ़|निकासी/i.test(text);
 const needs:string[]=[];
 for(const [name,pattern] of [["Water",/drinking water|water supply|पानी/i],["Food",/food|meal|भोजन|खाना/i],["Medical assistance",/medicin|medical|injur|elderly|दवा|घायल|बुजुर्ग/i],["Transport",/transport|evacuat|stranded|rescue|बस|निकासी|बचाव/i],["Shelter",/shelter|homeless|आश्रय/i],["Road inspection",/bridge|road|पुल|सड़क/i]] as const)if(pattern.test(text)){needs.push(name);entities.push({text:name,type:"Need"});}
 return {hazard,severity:critical?"Critical":high?"High":"Moderate",settlement:settlement?.id??"",people,needs,entities,confidence:settlement?0.78:0.42};
}
export function duplicates(text:string,reports:Report[]) {
 const tokens=(s:string)=>new Set(s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu," ").split(/\s+/).filter(w=>w.length>2));const a=tokens(text);
 return reports.map(r=>{const b=tokens(r.text),intersection=[...a].filter(t=>b.has(t)).length;return {id:r.id,score:intersection/(new Set([...a,...b]).size||1)};}).filter(r=>r.score>0.45).sort((a,b)=>b.score-a.score);
}
export function planIssues(plan:Plan,w:Workspace):string[]{
 const issues:string[]=[],scenario=w.scenario;
 if(["intensity","waterFactor","demandFactor"].some(k=>plan.scenario[k as "intensity"]!==scenario[k as "intensity"])||["closedRoads","unavailableSites"].some(k=>JSON.stringify([...plan.scenario[k as "closedRoads"]].sort())!==JSON.stringify([...scenario[k as "closedRoads"]].sort())))issues.push("The working scenario changed. Save and review a fresh proposal.");
 const blocked=closedRoads(scenario,w.reports);
 for(const site of w.sites){const assigned=plan.assignments.filter(a=>a.siteId===site.id);if(assigned.reduce((n,a)=>n+a.people,0)>capacity(site,scenario).available)issues.push(`${site.name} no longer has sufficient capacity.`);if(assigned.some(a=>a.assisted)&&(!site.accessible||!site.medical))issues.push(`${site.name} no longer meets assisted-access requirements.`);if(plan.scenario.name.startsWith("Long-term screening")&&assigned.length&&(!site.longTerm||!site.environmental))issues.push(`${site.name} no longer meets longer-term screening criteria.`);}
 for(const a of plan.assignments){const settlement=SETTLEMENTS.find(s=>s.id===a.settlementId),site=w.sites.find(s=>s.id===a.siteId);if(!settlement||!site){issues.push("The plan references an unknown settlement or site.");continue;}if(a.path[0]!==settlement.node||a.path.at(-1)!==site.node)issues.push("A saved route has invalid endpoints.");for(let i=1;i<a.path.length;i++){const road=ROADS.find(r=>r.from===a.path[i-1]&&r.to===a.path[i]||r.to===a.path[i-1]&&r.from===a.path[i]);if(!road||blocked.has(road.id))issues.push("A route in this plan is no longer available. Save a fresh proposal.");}}
 return [...new Set(issues)];
}
export function summary(w:Workspace,scenario=w.scenario) {
 const scores=SETTLEMENTS.map(s=>({...s,score:risk(s,scenario,w.reports)})),high=scores.filter(s=>s.score>=68),plan=optimize(w,scenario);
 return {scores,high,atRisk:high.reduce((n,s)=>n+s.households*4,0),capacity:w.sites.reduce((n,s)=>n+capacity(s,scenario).available,0),pending:w.reports.filter(r=>r.status==="Pending").length,verified:w.reports.filter(r=>r.status==="Verified").length,plan};
}
export function answer(question:string,w:Workspace,language:"en"|"hi"="en"): {text:string;sources:string[];action?:string} {
 const q=question.toLowerCase(),m=summary(w),place=findPlace(question),site=w.sites.find(s=>q.includes(s.name.toLowerCase())||q.includes(s.id.toLowerCase()));
 if(language==="hi"&&!/brief|summary|summar|सारांश|संक्षेप/.test(q)){
  if(site||/capacity|water|site|shelter|क्षमता|पानी|आश्रय/.test(q)){const sites=site?[site]:w.sites;return {text:sites.map(s=>{const c=capacity(s,w.scenario);return `${s.name}: ${fmt(c.available)} लोगों के लिए स्थान उपलब्ध है। संसाधन-आधारित कुल क्षमता ${fmt(c.total)} है और वर्तमान आवास ${fmt(s.occupancy)} है। सीमित संसाधन: ${({Space:"जगह",Water:"पानी",Sanitation:"स्वच्छता"} as Record<string,string>)[c.bottleneck]??c.bottleneck}। ${!c.eligible?"वर्तमान परिदृश्य से बाहर है।":s.accessible&&s.medical?"सहायता की जरूरत वाले परिवारों के लिए पात्र है।":"सहायता की जरूरत वाले परिवारों की पात्रता सीमित है।"}`;}).join("\n\n"),sources:sites.map(s=>s.id)};}
  if(place||/priorit|risk|danger|attention|first|जोखिम|खतरा|प्राथमिक|ध्यान|पहले/.test(q)){const items=place?[{...place,score:risk(place,w.scenario,w.reports)}]:[...m.scores].sort((a,b)=>b.score-a.score).slice(0,3);return {text:items.map(s=>`${s.name}: जोखिम संकेतक ${s.score}/100। कुल ${s.households} परिवारों में ${s.vulnerable} को सहायता की जरूरत है। बाढ़ संकेतक ${s.flood} और भूस्खलन संकेतक ${s.landslide} है। इसमें पहुंच संबंधी बाधाएं और सत्यापित घटनाओं का प्रभाव शामिल है। यह अभ्यास का संकेतक है, घटना की संभावना या आधिकारिक चेतावनी नहीं।`).join("\n\n"),sources:items.map(s=>s.id)};}
  if(/allocat|plan|route|bridge|transport|योजना|निकासी|पुल|रास्ता/.test(q))return {text:`प्रस्तावित योजना ${fmt(m.plan.demand)} में से ${fmt(m.plan.served)} लोगों को स्थान देती है। ${fmt(m.plan.unallocated)} लोगों के लिए आवंटन नहीं हो सका है। सहायता वाले परिवारों का कवरेज ${m.plan.priorityCoverage.toFixed(1)}% है। औसत आवंटित मार्ग ${m.plan.distance.toFixed(1)} किमी है। चार व्यक्तियों वाले परिवार एक साथ रखे जाते हैं और सहायता वाले परिवारों को उपयुक्त स्थलों पर ही भेजा जाता है। मार्ग या संसाधन बदलने के लिए Scenario lab खोलें।`,sources:["Allocation engine","Current scenario"],action:"scenarios"};
  if(/incident|report|verified|pending|घटना|रिपोर्ट|सत्यापित/.test(q))return {text:w.reports.filter(r=>r.status!=="Resolved").map(r=>`${r.id} · ${r.status==="Verified"?"सत्यापित":"जाँच बाकी"}: ${r.text}`).join("\n\n"),sources:w.reports.filter(r=>r.status!=="Resolved").map(r=>r.id)};
 }
 if(/brief|summary|summar|report|सारांश/.test(q))return {text:language==="hi"?`जिला अभ्यास सारांश: ${fmt(m.atRisk)} लोग उच्च या गंभीर जोखिम वाले क्षेत्रों में हैं। ${m.verified} रिपोर्ट सत्यापित हैं और ${m.pending} रिपोर्ट की जाँच बाकी है। उपलब्ध क्षमता ${fmt(m.capacity)} है। प्रस्तावित योजना ${fmt(m.plan.served)} लोगों को स्थान देती है; ${fmt(m.plan.unallocated)} लोगों के लिए स्थान आवंटित नहीं है। ये अभ्यास के अनुमान हैं।`:`District planning brief\n\n${fmt(m.atRisk)} people live in settlements rated High or Critical under the current scenario. ${m.verified} reports are verified; ${m.pending} await verification.\n\nAvailable site capacity: ${fmt(m.capacity)} people. The proposed allocation serves ${fmt(m.plan.served)} of ${fmt(m.plan.demand)} people, leaving ${fmt(m.plan.unallocated)} unallocated. Assisted-household coverage: ${Math.round(m.plan.priorityCoverage)}%.\n\nPriority follow-up: verify unresolved incidents, confirm resource bottlenecks and review inaccessible or unallocated households. All estimates use the labelled training scenario.`,sources:["District assessment","Site capacity register","Allocation engine"]};
 if(site||/capacity|water|site|shelter|क्षमता|पानी/.test(q)){const list=site?[site]:w.sites;return {text:list.map(s=>{const c=capacity(s,w.scenario);return `${s.name}: ${fmt(c.available)} places available (${fmt(c.total)} resource-limited capacity minus ${fmt(s.occupancy)} occupied). Limiting resource: ${c.bottleneck.toLowerCase()}. ${!c.eligible?"Excluded from the current scenario.":s.accessible&&s.medical?"Eligible for assisted households.":"General accommodation; assisted eligibility is limited."}`;}).join("\n\n"),sources:list.map(s=>s.id)};}
 if(place||/priorit|risk|danger|attention|first|जोखिम/.test(q)){const list=place?[{...place,score:risk(place,w.scenario,w.reports)}]:[...m.scores].sort((a,b)=>b.score-a.score).slice(0,3);return {text:list.map(s=>`${s.name} — ${riskLabel(s.score)} (${s.score}/100). Flood indicator ${s.flood}, landslide indicator ${s.landslide}; ${s.vulnerable} of ${s.households} households require assistance. Access constraint indicator ${s.access}/100. Priority combines both hazards, assisted-household share, access constraints and verified incident evidence; it is an interpretable scenario score, not a calibrated probability.`).join("\n\n"),sources:list.map(s=>s.id)};}
 if(/allocat|plan|route|bridge|close|transport|योजना/.test(q))return {text:`The current proposed plan accommodates ${fmt(m.plan.served)} people across ${new Set(m.plan.assignments.map(a=>a.siteId)).size} sites, with ${fmt(m.plan.unallocated)} unallocated. Mean assigned route distance: ${m.plan.distance.toFixed(1)} km. It preserves four-person planning households and restricts assisted households to accessible sites with medical support.\n\nUse Scenario Lab to change road availability and recalculate. A scenario is a proposal; it does not silently approve or execute movement.`,sources:["Min-cost maximum-flow allocation","Synthetic road network","Current scenario"],action:"scenarios"};
 if(/incident|report|verified|pending|घटना/.test(q))return {text:w.reports.filter(r=>r.status!=="Resolved").map(r=>`${r.id} · ${r.status} · ${r.title}: ${r.text}`).join("\n\n"),sources:w.reports.filter(r=>r.status!=="Resolved").map(r=>r.id)};
 const terms=q.split(/\W+/).filter(t=>t.length>3),doc=w.documents.map(d=>({...d,score:terms.filter(t=>d.text.toLowerCase().includes(t)).length})).sort((a,b)=>b.score-a.score)[0];
 if(doc&&doc.score>0)return {text:`Retrieved passage from ${doc.name}:\n\n${doc.text.slice(Math.max(0,doc.text.toLowerCase().indexOf(terms.find(t=>doc.text.toLowerCase().includes(t))!)-100),Math.max(0,doc.text.toLowerCase().indexOf(terms.find(t=>doc.text.toLowerCase().includes(t))!)-100)+1400)}\n\nThis is an extract from your document, not independent verification.`,sources:[doc.name]};
 return {text:"I can explain settlement priorities, calculate site capacity, summarize verified incidents, inspect the proposed allocation and retrieve passages from uploaded text documents. Ask ‘Which settlements need attention first?’ or ‘Prepare a district brief’. I do not have evidence to answer this question from the current workspace.",sources:["Workspace evidence index"]};
}

export function brief(w:Workspace) {
 const m=summary(w);
 return `SURAKSHASETU — DISTRICT PLANNING BRIEF\nGenerated: ${new Date().toISOString()}\nDistrict: Wayanad, Kerala\nData: SYNTHETIC TRAINING SCENARIO; not an operational advisory\n\nSCENARIO\n${w.scenario.name}\nHazard intensity: ${w.scenario.intensity}x; water factor: ${w.scenario.waterFactor}; demand factor: ${w.scenario.demandFactor}\n\nASSESSMENT\nHigh/Critical exposure: ${m.atRisk} people\nVerified reports: ${m.verified}; pending: ${m.pending}\nAvailable resource-limited capacity: ${m.capacity}\nProposed allocation: ${m.plan.served}/${m.plan.demand}; unallocated: ${m.plan.unallocated}\nAssisted coverage: ${m.plan.priorityCoverage.toFixed(1)}%\nMean assigned route distance: ${m.plan.distance.toFixed(2)} km\n\nSETTLEMENTS\n${m.scores.sort((a,b)=>b.score-a.score).map(s=>`${s.name}: ${s.score}/100 ${riskLabel(s.score)}, ${s.households*4} people`).join("\n")}\n\nSITES\n${w.sites.map(s=>{const c=capacity(s,w.scenario);return `${s.name}: ${c.available} available; bottleneck ${c.bottleneck}; assisted eligibility ${s.accessible&&s.medical}`;}).join("\n")}\n\nUNRESOLVED INCIDENTS\n${w.reports.filter(r=>r.status!=="Resolved").map(r=>`${r.id} [${r.status}] ${r.title}: ${r.text}`).join("\n")}\n\nMETHOD\nInterpretable multi-criteria scenario scoring; min-cost maximum-flow allocation of indivisible four-person planning households; shortest paths on an illustrative road network. Site capacity is the minimum of space, water and sanitation limits, less current occupancy. Long-term suitability requires verified land, environmental and infrastructure assessments. No model output certifies a location as safe.\n`;
}
