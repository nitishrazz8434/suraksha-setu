"""Refresh the small, attributed district reference pack. No resident records are generated."""
from pathlib import Path
import datetime, html, json, re, time, urllib.parse, urllib.request

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)
STAMP = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "SurakshaSetu/2.1 (non-commercial preparedness research; bounded reference import)"})
    return urllib.request.urlopen(req, timeout=25).read().decode("utf-8")

profiles = [
    dict(id="KL-WAYANAD", name="Wayanad", state="Kerala", population=817420, populationYear=2011, populationSource="https://wayanad.gov.in/en/demography/", schoolCodes=["15048", "15061", "15022", "15023"], towns=["Kalpetta", "Mananthavady", "Sultan Bathery"]),
    dict(id="KL-IDUKKI", name="Idukki", state="Kerala", population=1108974, populationYear=2011, populationSource="https://idukki.gov.in/demography/", schoolCodes=["6001", "6005", "6010", "6026"], towns=["Kattappana", "Thodupuzha", "Munnar"]),
    dict(id="KL-KOZHIKODE", name="Kozhikode", state="Kerala", population=3086293, populationYear=2011, populationSource="https://kozhikode.gov.in/demography/", schoolCodes=["10002", "10004", "10005", "10006"], towns=["Kozhikode", "Koyilandy", "Vadakara"]),
]
geography_path = ROOT / ".sites-runtime" / "district-geography.json"
geographies = json.loads(geography_path.read_text(encoding="utf-8")) if geography_path.exists() else []
facilities, origins = [], []
for profile in profiles:
    cached = next((p["data"] for p in geographies if p["district"] == profile["name"]), None)
    if not cached:
        # Three named district lookups, once per reference refresh. Never a public geocoding proxy.
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(dict(county=profile["name"], state="Kerala", country="India", format="jsonv2", limit=1, polygon_geojson=1, **{"accept-language": "en"}))
        cached = json.loads(get(url)); time.sleep(1.1)
    location = cached[0]
    if location.get("type") != "administrative":
        raise ValueError("Expected district boundary, not a city: " + profile["name"])
    profile.update(lat=float(location["lat"]), lng=float(location["lon"]), geometry=location["geojson"], geographySource=f'https://www.openstreetmap.org/{location["osm_type"]}/{location["osm_id"]}')
    for code in profile.pop("schoolCodes"):
        url = "https://sametham.kite.kerala.gov.in/" + code
        page = get(url)
        cells = [" ".join(html.unescape(re.sub("<[^>]*>", " ", c)).split()) for c in re.findall(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", page, re.S | re.I)]
        def value(label):
            for index, cell in enumerate(cells):
                if label.lower() in cell.lower() and len(cell) < 80:
                    index += 1
                    while index < len(cells) and cells[index] in ("", ":"): index += 1
                    return cells[index] if index < len(cells) else ""
            return ""
        coords = re.search(r"maps\?q=(-?[\d.]+),(-?[\d.]+)", page)
        if profile["name"].lower() not in value("Revenue District").lower():
            raise ValueError("School district does not match reference: " + code)
        if coords:
            facilities.append(dict(id="KITE-" + code, districtId=profile["id"], name=value("School Name"), lat=float(coords[1]), lng=float(coords[2]), classrooms=int(value("Total Class Room") or 0), toilets=int(value("No. of Toilets for Boys") or 0)+int(value("No. of Toilets for Girls") or 0), address=value("School Address"), source=url, retrievedAt=STAMP, kind="School"))
            print("Facility", code, facilities[-1]["name"].encode("ascii", "backslashreplace").decode(), flush=True)
    for town in profile.pop("towns"):
        url = "https://geocoding-api.open-meteo.com/v1/search?" + urllib.parse.urlencode(dict(name=town, count=10, language="en", format="json", countryCode="IN"))
        matches = [p for p in json.loads(get(url)).get("results", []) if p.get("admin1") == "Kerala" and p["name"].lower() == town.lower()]
        if not matches:
            # Bounded named-town lookup, cached once; public usage policy: https://operations.osmfoundation.org/policies/nominatim/
            cache_file = ROOT / ".sites-runtime" / "town-geography.json"
            saved = json.loads(cache_file.read_text(encoding="utf-8")) if cache_file.exists() else {}
            key = town + ", " + profile["name"] + ", Kerala, India"
            if key not in saved:
                named = json.loads(get("https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(dict(q=key, format="jsonv2", limit=1, **{"accept-language":"en"}))))
                saved[key] = named
                cache_file.write_text(json.dumps(saved), encoding="utf-8"); time.sleep(1.1)
            if not saved[key]:
                print("Town unavailable:", town, flush=True); continue
            point = saved[key][0]
            origins.append(dict(id="OSM-"+point["osm_type"]+str(point["osm_id"]), districtId=profile["id"], name=town, lat=float(point["lat"]), lng=float(point["lon"]), source=f'https://www.openstreetmap.org/{point["osm_type"]}/{point["osm_id"]}', observedAt=STAMP, verified=True, aliases=[]))
            continue
        place = max(matches, key=lambda p: p.get("population", 0))
        origins.append(dict(id="GN-"+str(place["id"]), districtId=profile["id"], name=place["name"], lat=place["latitude"], lng=place["longitude"], source=f'https://www.geonames.org/{place["id"]}/', observedAt=STAMP, verified=True, aliases=[town] if place["name"] != town else []))

catalog = dict(retrievedAt=STAMP, profiles=profiles, facilities=facilities, origins=origins, routes=[])
def distance(a, b): return (a["lat"]-b["lat"])**2+(a["lng"]-b["lng"])**2
for origin in origins:
    destinations = sorted([s for s in facilities if s["districtId"] == origin["districtId"]], key=lambda s: distance(origin, s))[:2]
    for site in destinations:
        try:
            url = f'https://router.project-osrm.org/route/v1/driving/{origin["lng"]},{origin["lat"]};{site["lng"]},{site["lat"]}?geometries=geojson&overview=full&steps=false'
            response = json.loads(get(url))
            if response.get("code") != "Ok": raise ValueError("No road route")
            r = response["routes"][0]
            catalog["routes"].append(dict(id=f'REF-{origin["id"]}-{site["id"]}', settlementId=origin["id"], siteId=site["id"], **{"from": [origin["lng"], origin["lat"]]}, to=[site["lng"], site["lat"]], distance=r["distance"]/1000, duration=r["duration"]/60, geometry=r["geometry"]["coordinates"], source="https://router.project-osrm.org", fetchedAt=STAMP, blocked=False))
            print("Road", origin["name"], "->", site["id"], round(r["distance"]/1000, 1), "km", flush=True)
        except Exception as error: print("Road unavailable", origin["name"], str(error), flush=True)
        time.sleep(1.1)
OUT.joinpath("district-reference.json").write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Saved {len(profiles)} districts, {len(facilities)} facilities, {len(origins)} origins and {len(catalog['routes'])} measured roads.")
