# Public reference data

The district reference pack is a bounded extraction of attributed public facts, retrieved on 1 November 2026. It contains no resident records and makes no claim that mapped buildings are designated evacuation shelters.

- District population: Census 2011 figures published by [Wayanad](https://wayanad.gov.in/en/demography/), [Idukki](https://idukki.gov.in/demography/) and [Kozhikode](https://kozhikode.gov.in/demography/). These are historical references.
- School location, classroom and toilet facts: [Kerala KITE Sametham](https://sametham.kite.kerala.gov.in/). Every facility retains its individual source URL. Raw HTML pages are not redistributed.
- District geometry and some named town coordinates: © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright). Geometry is unchanged from the returned source. Individual object URLs are retained. Small named reference lookups were cached once and limited to one request per second; no public geocoding proxy is included. [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).
- Additional named town coordinates: GeoNames via [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api). Individual GeoNames links are retained.
- Road geometry, distance and duration: [OSRM](https://project-osrm.org/) using OpenStreetMap data. Timestamps are retained; road clearance is not implied.
- Weather: [Open-Meteo](https://open-meteo.com/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The app shows observation time and cached/unavailable states.

# Reference photograph

`/reference-scene.jpg`: [Wayanad landslides aftermath](https://commons.wikimedia.org/wiki/File:Wayanad_landslides_aftermath.jpg), photograph by [Vis M](https://commons.wikimedia.org/wiki/User:Vis_M), 25 December 2024, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Wikimedia's 1280-pixel rendition is used. Generated overlay images are adaptations of this photograph and retain this attribution and license when shared. The historical photograph is for model analysis, not current incident evidence.

# Calculation references

Planning space default: 3.5 m² per person, [UNHCR emergency shelter guidance](https://emergency.unhcr.org/emergency-assistance/settlement-and-shelter/guidance-shelter/emergency-shelter-solutions-and-standards). Planned water default: 20 L/person/day; see [UNHCR WASH needs assessment](https://emergency.unhcr.org/emergency-assistance/water-sanitation-and-hygiene/wash-needs-assessment-refugee-emergencies). These parameters do not establish suitability of a particular building. Assumed room size, available fraction, water budget, exposure fraction and household distribution are explicit scenario inputs.
