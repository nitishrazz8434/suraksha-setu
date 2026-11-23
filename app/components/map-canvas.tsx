"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Layers, LocateFixed, MapPin, Maximize2, Minus, Plus, X } from "lucide-react";
import { useApp } from "./context";
import { useClock } from "../use-clock";
import { activeHazards, capacity, contains, risk, riskLabel } from "../../lib/engine";
import { districtName, scoped } from "../../lib/workspace";
import { catalog } from "../../lib/catalog";
import { potential, rainOutlook } from "../../lib/assessment";
import type { Forecast } from "../../lib/connected-types";
import type { Geometry, Hazard, Position } from "../../lib/types";

type SusceptibilityFeature = { type: "Feature"; id: string; properties: { zone: "High" | "Medium" | "Low"; hazard: string; source: string; sourceUrl: string; classification: string }; geometry: Geometry };

const project = (lat: number, lng: number, z: number) => {
  const size = 256 * 2 ** z, s = Math.sin(Math.max(-85, Math.min(85, lat)) * Math.PI / 180);
  return [(lng + 180) / 360 * size, (.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * size];
};
const unproject = (x: number, y: number, z: number) => {
  const size = 256 * 2 ** z;
  return [Math.atan(Math.sinh(Math.PI * (1 - 2 * y / size))) * 180 / Math.PI, x / size * 360 - 180];
};
const outlookColor = (tone: string) => ({ red: "#c84f48", orange: "#d27b32", amber: "#d1ad36", green: "#43845d", neutral: "#87928b" }[tone] ?? "#87928b");
const pathData = (polygons: Position[][][], point: (lat: number, lng: number) => number[]) => polygons.map(poly => poly.map(ring => ring.map((p, i) => `${i ? "L" : "M"}${point(p[1], p[0]).join(" ")}`).join(" ") + "Z").join(" "));

export function MapCanvas({ large = false, focus, onExpand }: { large?: boolean; focus?: string; onExpand?: () => void }) {
  const { w, monitor } = useApp();
  const now = useClock();
  const district = w.districts.find(d => d.id === w.activeDistrictId);
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 440 });
  const [view, setView] = useState({ lat: district?.lat ?? 22, lng: district?.lng ?? 79, z: district ? 11 : 5 });
  const [base, setBase] = useState("map");
  const [selected, setSelected] = useState<string | null>(null);
  const [layers, setLayers] = useState({ risk: true, rainfall: true, hazards: true, sites: true, routes: true, susceptibility: false });
  const [caseStudyOpen, setCaseStudyOpen] = useState(false);
  const [susceptibilityFeatures, setSusceptibilityFeatures] = useState<SusceptibilityFeature[]>([]);
  const [susceptibilityLoading, setSusceptibilityLoading] = useState(false);
  const [susceptibilityError, setSusceptibilityError] = useState("");
  const [panel, setPanel] = useState(false);
  const [failed, setFailed] = useState(false);
  const drag = useRef<{ x: number; y: number; lat: number; lng: number } | null>(null);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const fit = useCallback(() => {
    const points = district
      ? [...w.settlements.filter(s => s.districtId === district.id), ...w.sites.filter(s => s.districtId === district.id)]
      : [...w.districts, ...w.settlements, ...w.sites];
    if (!points.length) return { lat: 10.8, lng: 76.3, z: 8 };
    const projected = points.map(p => project(p.lat, p.lng, 0)), xs = projected.map(p => p[0]), ys = projected.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const z = Math.max(3, Math.min(12, Math.floor(Math.log2(Math.min((size.w - 100) / Math.max(.01, maxX - minX), (size.h - 120) / Math.max(.01, maxY - minY))))));
    const [lat, lng] = unproject((minX + maxX) / 2, (minY + maxY) / 2, 0);
    return { lat, lng, z };
  }, [district, w.districts, w.settlements, w.sites, size.w, size.h]);
  useEffect(() => {
    const timer = window.setTimeout(() => { setView(fit()); setSelected(null); }, 0);
    return () => window.clearTimeout(timer);
  }, [fit]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (focus === "wayanad-case-study") { setCaseStudyOpen(true); setLayers(current => ({ ...current, susceptibility: true })); setSelected(null); setView({ lat: 11.71, lng: 76.036, z: 10 }); return; }
      const settlement = w.settlements.find(s => s.id === focus);
      if (settlement) { setSelected(settlement.id); setView({ lat: settlement.lat, lng: settlement.lng, z: 12 }); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focus, w.settlements]);
  useEffect(() => {
    const available = layers.susceptibility && (caseStudyOpen || !w.activeDistrictId || w.activeDistrictId === "KL-WAYANAD");
    if (!available || susceptibilityFeatures.length) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSusceptibilityLoading(true); setSusceptibilityError("");
      fetch("/data/wayanad-landslide-susceptibility.geojson", { cache: "force-cache" })
        .then(response => { if (!response.ok) throw new Error("Reference map file is unavailable."); return response.json() as Promise<{ features: SusceptibilityFeature[] }>; })
        .then(data => { if (!cancelled) setSusceptibilityFeatures(data.features); })
        .catch(error => { if (!cancelled) setSusceptibilityError((error as Error).message); })
        .finally(() => { if (!cancelled) setSusceptibilityLoading(false); });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [layers.susceptibility, caseStudyOpen, w.activeDistrictId, susceptibilityFeatures.length]);

  const centre = project(view.lat, view.lng, view.z), left = centre[0] - size.w / 2, top = centre[1] - size.h / 2;
  const point = (lat: number, lng: number) => {
    const [x, y] = project(lat, lng, view.z);
    return [Math.round((x - left) * 100) / 100, Math.round((y - top) * 100) / 100];
  };
  const tiles = [];
  for (let x = Math.floor(left / 256); x <= Math.floor((left + size.w) / 256); x++) {
    for (let y = Math.max(0, Math.floor(top / 256)); y <= Math.min(2 ** view.z - 1, Math.floor((top + size.h) / 256)); y++) {
      tiles.push({ x: ((x % 2 ** view.z) + 2 ** view.z) % 2 ** view.z, y, left: x * 256 - left, top: y * 256 - top });
    }
  }
  const settlements = scoped(w.settlements, w), settlementIds = new Set(settlements.map(s => s.id));
  const selection = w.settlements.find(s => s.id === selected), site = w.sites.find(s => s.id === selected);
  const hazardSelection = w.hazards.find(h => h.id === selected);
  const susceptibilitySelection = susceptibilityFeatures.find(feature => selected === `susceptibility:${feature.id}`);
  const selectedForecast: Forecast | undefined = selection ? monitor.forecasts.find(f => f.districtId === selection.districtId) : undefined;
  const forecastOutlook = rainOutlook(selectedForecast);
  const nearbyHazards = selection ? activeHazards(w).filter(h => h.districtId === selection.districtId && h.hazard !== "Road closure" && contains(h.geometry, [selection.lng, selection.lat])) : [];
  const nearbyReports = selection ? w.reports.filter(r => r.settlement === selection.id && r.status === "Verified" && (!r.expiresAt || Date.parse(r.expiresAt) > now) && (r.hazard === "Flood" || r.hazard === "Landslide")) : [];
  const observedHazards = [...new Set<Hazard>([...nearbyHazards.map(h => h.hazard as Hazard), ...nearbyReports.map(r => r.hazard)])];
  const hazardScreen = [...observedHazards];
  if (forecastOutlook.max !== null && forecastOutlook.max >= 35 && !hazardScreen.includes("Flood")) hazardScreen.push("Flood");
  const layerLabels: Record<keyof typeof layers, string> = { risk: "Settlement risk evidence", rainfall: "District rainfall screen", hazards: "Verified hazard areas", sites: "Candidate and reviewed sites", routes: "Road routes", susceptibility: "Wayanad baseline susceptibility" };
  const showSusceptibility = layers.susceptibility && (caseStudyOpen || !w.activeDistrictId || w.activeDistrictId === "KL-WAYANAD");
  const openWayanadCaseStudy = () => { setCaseStudyOpen(true); setLayers(current => ({ ...current, susceptibility: true })); setSelected(null); setView({ lat: 11.71, lng: 76.036, z: 10 }); };
  const returnToWorkspace = () => { setCaseStudyOpen(false); setSelected(null); setView(fit()); };

  return <div className={`map-canvas ${large ? "large" : ""}`} ref={ref}
    onPointerDown={e => {
      if ((e.target as Element).closest("button,.map-popup,.layer-panel,.map-legend,.map-screen-note,.map-hazard-shape,.map-susceptibility-shape")) return;
      drag.current = { x: e.clientX, y: e.clientY, lat: view.lat, lng: view.lng };
      e.currentTarget.setPointerCapture(e.pointerId);
    }}
    onPointerMove={e => {
      const d = drag.current; if (!d) return;
      const [x, y] = project(d.lat, d.lng, view.z), [lat, lng] = unproject(x - e.clientX + d.x, y - e.clientY + d.y, view.z);
      setView(v => ({ ...v, lat: Math.max(-85, Math.min(85, lat)), lng }));
    }}
    onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
    <div className="map-fallback" />
    <div className={`map-tiles ${base === "satellite" ? "satellite" : ""}`}>
      {tiles.map(t => <img key={`${base}-${view.z}-${t.x}-${t.y}`} alt="" draggable={false}
        src={base === "satellite" ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${view.z}/${t.y}/${t.x}` : `https://tile.openstreetmap.org/${view.z}/${t.x}/${t.y}.png`}
        onError={() => setFailed(true)} style={{ left: t.left, top: t.top }} />)}
    </div>
    <svg className="map-overlay" viewBox={`0  ${size.w} ${size.h}`} aria-label="Settlement risk, Wayanad landslide susceptibility and district rainfall screening">
      {layers.rainfall && catalog.profiles.filter(p => caseStudyOpen ? p.id === "KL-WAYANAD" : !w.activeDistrictId || p.id === w.activeDistrictId).map(profile => {
        const polygons = profile.geometry.type === "Polygon" ? [profile.geometry.coordinates as Position[][]] : profile.geometry.coordinates as Position[][][];
        const outlook = rainOutlook(monitor.forecasts.find(f => f.districtId === profile.id)), color = outlookColor(outlook.tone);
        return pathData(polygons, point).map((d, i) => <path key={`district-${profile.id}-${i}`} d={d} fillRule="evenodd" fill={color} fillOpacity=".19" stroke={color} strokeWidth="2.3" aria-label={`${profile.name}: ${outlook.label}`} />);
      })}
      {showSusceptibility && susceptibilityFeatures.map(feature => {
        const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates as Position[][]] : feature.geometry.coordinates as Position[][][];
        const color = feature.properties.zone === "High" ? "#c92832" : feature.properties.zone === "Medium" ? "#e66a22" : "#258451";
        return pathData(polygons, point).map((d, i) => <path key={`${feature.id}-${i}`} className="map-susceptibility-shape" style={{ pointerEvents: "auto" }} d={d} fillRule="evenodd" fill={color} fillOpacity=".40" stroke={color} strokeWidth="1.1" onPointerDown={e => e.stopPropagation()} onClick={() => setSelected(`susceptibility:${feature.id}`)} aria-label={`Wayanad baseline landslide susceptibility: ${feature.properties.zone} zone`}><title>Wayanad · {feature.properties.zone} landslide susceptibility · NCESS 2010 baseline</title></path>);
      })}
      {layers.hazards && scoped(w.hazards, w).map(h => {
        const polygons = h.geometry.type === "Polygon" ? [h.geometry.coordinates as Position[][]] : h.geometry.coordinates as Position[][][];
        const active = activeHazards(w).some(x => x.id === h.id), color = !active ? "#78857e" : h.severity >= 85 ? "#c92832" : h.severity >= 65 ? "#e66a22" : h.severity >= 40 ? "#e3ba24" : "#258451";
        return pathData(polygons, point).map((d, i) => <path key={`${h.id}-${i}`} className="map-hazard-shape" style={{ pointerEvents: "auto" }} d={d} fillRule="evenodd" fill={color} fillOpacity={active ? .36 : .14} stroke={color} strokeWidth="2" strokeDasharray={active ? undefined : "5 4"} onPointerDown={e => e.stopPropagation()} onClick={() => setSelected(h.id)} aria-label={`${h.name}: ${h.hazard}, ${h.severity} severity${active ? ", verified and active" : ", unverified or expired"}`}><title>{h.name} · {h.hazard} · severity {h.severity}/100 · {active ? "verified active" : "unverified or expired"}</title></path>);
      })}
      {layers.routes && w.routes.filter(r => settlementIds.has(r.settlementId)).map(r => <polyline key={r.id}
        points={r.geometry.map(p => point(p[1], p[0]).join(",")).join(" ")} fill="none"
        stroke={r.blocked || w.scenario.closedRoutes.includes(r.id) ? "#bd2834" : "#256b52"}
        strokeWidth="2.4" strokeDasharray={r.blocked || w.scenario.closedRoutes.includes(r.id) ? "5 4" : undefined} opacity=".78" />)}
    </svg>
    {layers.risk && settlements.map(s => {
      const [x, y] = point(s.lat, s.lng), score = risk(s, w), kind = score === null ? "unknown" : score >= 85 ? "critical" : score >= 65 ? "high" : score >= 40 ? "moderate" : "low";
      return <button key={s.id} className={`map-marker settlement ${kind} ${selected === s.id ? "selected" : ""}`} style={{ left: x, top: y }}
        aria-label={`${s.name}: ${riskLabel(score)} observed risk`} onClick={() => setSelected(selected === s.id ? null : s.id)}><span /><label>{s.name}</label></button>;
    })}
    {layers.sites && scoped(w.sites, w).map(s => {
      const [x, y] = point(s.lat, s.lng);
      return <button key={s.id} className={`map-marker shelter ${capacity(s, w.scenario).eligible ? "" : "inactive"}`} style={{ left: x, top: y }} aria-label={s.name} onClick={() => setSelected(s.id)}><MapPin size={15} /></button>;
    })}
    <div className="map-top-left">
      <div className="map-location"><span className="green-dot" />{caseStudyOpen ? "Wayanad case study" : districtName(w)}<span className="map-location-divider" />{caseStudyOpen ? "Baseline zones" : `${settlements.length} settlements`}</div>
      <div className="map-base-switch"><button className={base === "map" ? "active" : ""} onClick={() => setBase("map")}>Map</button><button className={base === "satellite" ? "active" : ""} onClick={() => setBase("satellite")}>Satellite</button></div>
      {caseStudyOpen && <div className="map-demo-label"><b>NCESS 2010 susceptibility map</b><span>{susceptibilityLoading ? "Loading local reference zones…" : susceptibilityError || `${susceptibilityFeatures.length} baseline polygons · not a live warning`}</span></div>}
    </div>
    <div className="map-tools">
      <button aria-label="Zoom in" onClick={() => setView(v => ({ ...v, z: Math.min(17, v.z + 1) }))}><Plus size={16} /></button>
      <button aria-label="Zoom out" onClick={() => setView(v => ({ ...v, z: Math.max(2, v.z - 1) }))}><Minus size={16} /></button><span />
      <button aria-label={caseStudyOpen ? "Return to workspace map" : "Reset map"} onClick={caseStudyOpen ? returnToWorkspace : () => setView(fit())}><LocateFixed size={16} /></button>
      <button aria-label="Map layers" onClick={() => setPanel(!panel)}><Layers size={16} /></button>
      {onExpand && <button aria-label="Expand map" onClick={onExpand}><Maximize2 size={16} /></button>}
    </div>
    {panel && <div className="layer-panel"><b>Map layers</b>{Object.entries(layers).map(([key, value]) => <label key={key}><input type="checkbox" checked={value} onChange={e => setLayers({ ...layers, [key]: e.target.checked })} />{layerLabels[key as keyof typeof layers]}</label>)}<button className="map-demo-button" onClick={openWayanadCaseStudy}>Open Wayanad susceptibility example</button>{caseStudyOpen && <button className="map-demo-button secondary" onClick={returnToWorkspace}>Return to current map view</button>}{susceptibilityLoading && <small className="map-layer-status">Loading the local reference layer…</small>}{susceptibilityError && <small className="map-layer-status error">{susceptibilityError}</small>}</div>}
    {hazardSelection && !selection && <div className="map-popup">
      <button className="popup-close" aria-label="Close hazard details" onClick={() => setSelected(null)}><X size={15} /></button><small>HAZARD AREA</small><h4>{hazardSelection.name}</h4>
      <div className={`popup-number risk-text ${hazardSelection.severity >= 85 ? "red" : hazardSelection.severity >= 65 ? "orange" : hazardSelection.severity >= 40 ? "amber" : "green"}`}>{hazardSelection.hazard}<span>severity {hazardSelection.severity}/100</span></div>
      <p>{activeHazards(w).some(h => h.id === hazardSelection.id) ? "Verified and active evidence" : "Unverified or expired evidence · shown for context only"}</p>
      <p>Observed: {hazardSelection.observedAt}<br />Source: {hazardSelection.source}<br />Expires: {hazardSelection.expiresAt ?? "No expiry recorded"}</p>
      <small className="popup-caution">Severity describes evidence classification, not the probability of a future event.</small>
    </div>}
    {susceptibilitySelection && <div className="map-popup">
      <button className="popup-close" aria-label="Close reference zone details" onClick={() => setSelected(null)}><X size={15} /></button><small>REFERENCE SUSCEPTIBILITY ZONE</small><h4>Wayanad · {susceptibilitySelection.properties.zone} zone</h4>
      <div className={`popup-number risk-text ${susceptibilitySelection.properties.zone === "High" ? "red" : susceptibilitySelection.properties.zone === "Medium" ? "orange" : "green"}`}>Landslide susceptibility<span>baseline class</span></div>
      <p>Historical area-level susceptibility mapping from NCESS (2010), distributed by Kerala State Disaster Management Authority.</p>
      <p className="popup-source"><a href={susceptibilitySelection.properties.sourceUrl} target="_blank" rel="noreferrer">Open KSDMA source map page ↗</a></p>
      <small className="popup-caution">This is a reference susceptibility class, not a live landslide prediction, current incident, or official evacuation warning. It does not alter registered reports or operational risk records.</small>
    </div>}
    {selection && <div className="map-popup">
      <button className="popup-close" aria-label="Close map details" onClick={() => setSelected(null)}><X size={15} /></button>
      <small>SETTLEMENT RISK & WEATHER SCREEN</small><h4>{selection.name}</h4>
      <div className={`popup-number risk-text ${risk(selection, w) === null ? "muted" : risk(selection, w)! >= 65 ? "red" : risk(selection, w)! >= 40 ? "amber" : "green"}`}>{riskLabel(risk(selection, w))}<span>verified hazard evidence</span></div>
      <p>{w.households.filter(h => h.settlementId === selection.id).reduce((n, h) => n + h.size, 0)} registered people</p>
      <p><b>Potential hazards to monitor:</b> {hazardScreen.length ? hazardScreen.join(", ") : "No active verified hazard signal is recorded here."}</p>
      <p>{observedHazards.length ? `Verified local records: ${observedHazards.join(", ")}. ` : "No active verified local hazard record. "}{forecastOutlook.max !== null ? `${forecastOutlook.label}; peak daily rain ${forecastOutlook.max} mm${forecastOutlook.peakDate ? ` on ${forecastOutlook.peakDate}` : ""}${forecastOutlook.peakProbability !== null ? `, precipitation chance ${forecastOutlook.peakProbability}%` : ""}.` : "Local forecast is unavailable."}</p>
      <p className="popup-source">Weather: {selectedForecast?.source ?? "Open-Meteo forecast unavailable"} · {selectedForecast?.observedAt ?? "no observation time"}<br />Settlement data: {selection.source}</p>
      <small className="popup-caution">Screening indicators are not event predictions or official warnings. Green means low recorded evidence only; it does not certify safety. Rainfall alone cannot confirm flooding or landslides.</small>
    </div>}
    {site && !selection && !hazardSelection && !susceptibilitySelection && <div className="map-popup">
      <button className="popup-close" aria-label="Close map details" onClick={() => setSelected(null)}><X size={15} /></button><small>SITE CAPACITY</small><h4>{site.name}</h4>
      <div className="popup-number">{catalog.facilities.some(f => f.id === site.id) ? potential(catalog.facilities.find(f => f.id === site.id)!).total : capacity(site, w.scenario).available}<span>{catalog.facilities.some(f => f.id === site.id) ? "estimated planning places" : "reviewed places available"}</span></div>
      <p>{catalog.facilities.some(f => f.id === site.id) ? "Public infrastructure candidate; field clearance required." : `Limiting resource: ${capacity(site, w.scenario).bottleneck}`}</p>
    </div>}
    {layers.rainfall && <div className="map-screen-note"><b>District rainfall screen · next 3 days</b><span>Rainfall signal only; not an event prediction or official warning.</span></div>}
    <div className="map-legend">
      <strong>Settlement evidence</strong>
      <span><i className="legend-dot red" />Critical</span><span><i className="legend-dot orange" />High</span><span><i className="legend-dot amber" />Moderate</span><span><i className="legend-dot green" />Low recorded</span><span><i className="legend-dot neutral" />Unassessed</span>
      <strong>Rainfall screen</strong>
      <span><i className="legend-dot red" />High</span><span><i className="legend-dot orange" />Elevated</span><span><i className="legend-dot amber" />Watch</span><span><i className="legend-dot green" />Routine</span><span><i className="legend-dot neutral" />Unavailable</span>
      <strong>Hazard geometry</strong><span className="hazard-legend-help">Severity colors · click for hazard type</span>
      {showSusceptibility && <><strong>Wayanad NCESS 2010</strong><span><i className="legend-dot red" />High</span><span><i className="legend-dot orange" />Medium</span><span><i className="legend-dot green" />Low</span></>}
    </div>
    <div className="map-attribution">{failed ? "Some tiles unavailable · " : ""}{base === "satellite" ? "© Esri, Maxar and imagery providers" : "© OpenStreetMap contributors"} · boundaries: district reference · forecast: Open-Meteo{showSusceptibility ? " · susceptibility: KSDMA / NCESS 2010" : ""}</div>
  </div>;
}
