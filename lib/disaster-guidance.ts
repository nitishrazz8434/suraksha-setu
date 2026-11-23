export type DisasterGuidance = { text:string; sources:string[]; topic:string };

const NDMA_DOS_DONTS="https://sachet.ndma.gov.in/DosDont";
const NDMA_ALERTS="https://sachet.ndma.gov.in/";
const USGS_LANDSLIDE="https://www.usgs.gov/programs/landslide-hazards/science/real-time-monitoring-potential-landslides";
const NOAA_PRESSURE="https://www.noaa.gov/jetstream/ll-pressure";

const HAZARDS=[
 {key:"landslide",pattern:/landslide|mudslide|mudflow|भूस्खलन|पहाड़ टूट|मिट्टी खिसक/},
 {key:"flood",pattern:/flood|floodwater|flash flood|बाढ़|जलभराव/},
 {key:"earthquake",pattern:/earthquake|quake|seismic|भूकंप/},
 {key:"cyclone",pattern:/cyclone|hurricane|typhoon|strong wind|चक्रवात|तूफान/},
 {key:"wildfire",pattern:/wildfire|forest fire|bushfire|जंगल की आग|वनाग्नि/},
 {key:"tsunami",pattern:/tsunami|समुद्री लहर|सुनामी/},
 {key:"heat",pattern:/heatwave|heat wave|extreme heat|लू|गर्मी की लहर/},
 {key:"lightning",pattern:/lightning|thunderstorm|बिजली गिर|आंधी/},
 {key:"drought",pattern:/drought|सूखा/},
];

const NOW=/\b(now|right now|currently|today|here|near me|in my area|in this area|happening|is there|are there|live|ongoing|abhi|yahan|ho raha)\b|अभी|यहाँ|हो रहा|हो रही|हो रहे|जारी है/i;
const SAFETY=/\b(precaution|safe|safety|what should i do|what do i do|what to do|help|emergency|evacuate|evacuation|prepare|protect|survive|warning|chance|probability|likely|risk|possibility|predict|will happen)\b|क्या करें|सुरक्षित|बचाव|खतरा|संभावना|चेतावनी|मदद/i;
const EXPLANATION=/\b(what is|what are|how does|how do|how can|how is|why does|why do|why can|why is|what causes|cause|causes|trigger|explain|meaning)\b|क्या है|कैसे|क्यों|कारण/i;

function explanation(topic:string,language:"en"|"hi"):string {
 if(topic==="landslide")return language==="hi"?"तेज़ या लगातार बारिश का पानी ढलान की मिट्टी में जाता है। इससे मिट्टी का वजन और पानी का दबाव बढ़ सकता है तथा मिट्टी-पत्थर की पकड़ घट सकती है। जब ढलान की मजबूती गुरुत्वाकर्षण के खिंचाव से कम हो जाती है, तो भूस्खलन हो सकता है। सिर्फ बारिश की मात्रा से किसी जगह या समय का भरोसेमंद अनुमान नहीं लगाया जा सकता; मिट्टी की पहले से नमी, ढलान और स्थानीय परिस्थितियाँ भी मायने रखती हैं.":"Heavy or prolonged rain can soak into a slope, add water and weight, and change the forces holding soil and rock in place. If the slope becomes weaker than gravity’s pull, material can slide or flow downhill. Rain alone cannot tell us whether or exactly when a landslide will happen; prior soil wetness, slope conditions, and local monitoring also matter.";
 const text:Record<string,string>={
  flood:"A flood happens when water covers land that is normally dry. It can follow intense or prolonged rain, overflowing rivers, poor drainage, or coastal water pushed inland. The cause and local risk depend on conditions in that place.",
  earthquake:"An earthquake happens when built-up stress is suddenly released as rocks move along a fault, sending seismic waves through the ground. This explanation does not tell whether an earthquake is occurring now or predict one.",
  cyclone:"A tropical cyclone is an organized rotating storm that forms over warm ocean water and can bring destructive winds, heavy rain, and coastal flooding. A forecast or official warning is needed to assess a particular place.",
  wildfire:"A wildfire is an uncontrolled fire spreading through vegetation. It needs an ignition source and burnable fuel; dry vegetation, wind, and terrain can affect how it spreads. A photo alone cannot establish the fire’s size or direction.",
  tsunami:"A tsunami is a series of powerful ocean waves, often caused by sudden movement of the seafloor during an underwater earthquake. Some tsunamis have other causes. Follow official coastal warnings rather than trying to judge risk from an image.",
  heat:"A heat wave is a period of unusually hot weather for a location. Its definition and health impact depend on local climate, duration, humidity, and exposure.",
  lightning:"Lightning is an electrical discharge associated with storms. It can strike outside the heaviest rainfall, so thunder means people outdoors should seek a substantial enclosed shelter.",
  drought:"A drought develops when water availability stays below normal for a prolonged period, often because of deficient rainfall. It can affect drinking water, crops, ecosystems, and health.",
 };
 return text[topic]??"A landslide is the downslope movement of rock, earth, or debris under gravity. Rainfall, earthquakes, erosion, and human changes to slopes can contribute, often in combination.";
}

function precautions(topic:string):string {
 switch(topic){
  case "landslide":return "Move away from steep slopes, unstable ground, and channels where mud or rocks may flow. Do not cross a slide area or return to a threatened slope. Follow local evacuation instructions; if movement, cracking, or falling debris is visible, get to a safer place and alert authorities.";
  case "flood":return "Move to higher ground when safe. Keep away from drains, bridges, and fast-moving water; never walk, swim, or drive through floodwater. Switch off electricity only if you can do so without entering water, and follow evacuation instructions.";
  case "earthquake":return "During shaking, Drop, Cover, and Hold On; stay away from windows. If outdoors, move to an open area away from buildings, trees, and power lines. After shaking stops, expect aftershocks and avoid damaged buildings; follow local authorities.";
  case "cyclone":return "Stay inside a sturdy shelter away from windows, secure loose objects only if it is safe, and keep essential medicines, water, and a charged phone ready. Follow official evacuation instructions; do not go out during dangerous winds or into floodwater.";
  case "wildfire":return "Move away from the fire and smoke, follow official evacuation routes, and keep doors and windows closed if sheltering temporarily. Do not return until authorities give the all-clear.";
  case "tsunami":return "If an official tsunami warning is issued or strong coastal shaking occurs, move immediately inland or to higher ground by the safest route. Stay away from beaches and shorelines until authorities give the all-clear.";
  case "heat":return "Move to a cool or shaded place, drink water regularly, reduce strenuous activity during the hottest hours, and check on children, older adults, and people who are unwell. Seek medical help for confusion, fainting, or severe symptoms.";
  case "lightning":return "Go inside a substantial building or enclosed vehicle. Avoid open fields, isolated trees, water, and metal structures. Wait at least 30 minutes after the last thunder before going back outside.";
  case "drought":return "Follow local water-supply and public-health advisories, use drinking water carefully, and avoid unsafe water sources. For crops or livestock, follow local agriculture and veterinary guidance.";
  default:return "Follow the latest official instructions for your location. Keep away from visible danger, do not enter damaged structures or floodwater, and call emergency services if anyone is in immediate danger.";
 }
}

function hindiSafety(topic:string):string {
 if(topic==="earthquake")return "झटके चल रहे हों तो नीचे झुकें, मजबूत मेज के नीचे शरण लें और उसे पकड़े रहें। खिड़कियों से दूर रहें। झटके रुकने के बाद क्षतिग्रस्त इमारतों से दूर रहें और स्थानीय प्रशासन के निर्देश मानें।";
 if(topic==="flood")return "सुरक्षित हो तो ऊँची जगह पर जाएँ। तेज बहते पानी, नालों और पुलों से दूर रहें; पानी में पैदल या वाहन से न जाएँ। निकासी के आधिकारिक निर्देश मानें।";
 if(topic==="landslide")return "ढलानों, अस्थिर जमीन और मिट्टी-पत्थर बहने वाले रास्तों से दूर जाएँ। भूस्खलन वाले क्षेत्र को पार न करें और स्थानीय निकासी निर्देश मानें।";
 return `${precautions(topic)} आधिकारिक NDMA निर्देश देखें।`;
}

function hazardPhrase(topic:string):string {
 const phrases:Record<string,string>={landslide:"a landslide",flood:"a flood",earthquake:"an earthquake",cyclone:"a cyclone",wildfire:"a wildfire",tsunami:"a tsunami",heat:"a heat wave",lightning:"lightning",drought:"a drought"};
 return phrases[topic]??"this disaster";
}

/** Curated source-backed answers for safety-critical prompts; null leaves ordinary chat to the language model. */
export function answerDisasterQuestion(question:string,language:"en"|"hi"="en"):DisasterGuidance|null {
 const q=question.trim();
 if(!q)return null;
 if(/barometer/i.test(q)&&/measure|what|meaning|क्या|माप/i.test(q))return{text:language==="hi"?"बैरोमीटर वायुमंडलीय वायु-दाब मापता है। दाब में बदलाव मौसम में बदलाव का संकेत दे सकता है, लेकिन अकेले इससे किसी आपदा की पुष्टि या भविष्यवाणी नहीं होती।":"A barometer measures atmospheric air pressure. Changes in pressure can help indicate changing weather, but a barometer reading alone does not confirm or predict a disaster.",sources:[NOAA_PRESSURE],topic:"weather"};
 const hazard=HAZARDS.find(item=>item.pattern.test(q));
 const sources=hazard?.key==="landslide"?[USGS_LANDSLIDE,NDMA_DOS_DONTS,NDMA_ALERTS]:[NDMA_DOS_DONTS,NDMA_ALERTS];

 if(hazard&&EXPLANATION.test(q)&&!SAFETY.test(q)){
  const text=explanation(hazard.key,language);
  return{text,sources,topic:hazard.key};
 }

 if(hazard&&(NOW.test(q)||SAFETY.test(q))){
  if(NOW.test(q)){
   const text=language==="hi"
    ?`मैं यहाँ से यह सत्यापित नहीं कर सकता कि अभी ${hazard.key==="earthquake"?"भूकंप":hazard.key==="flood"?"बाढ़":hazard.key==="landslide"?"भूस्खलन":"यह आपदा"} हो रही है या नहीं; इस Copilot में लाइव चेतावनी या सेंसर फ़ीड नहीं है। आधिकारिक NDMA SACHET अलर्ट और स्थानीय प्रशासन देखें। ${hazard.key==="earthquake"?"अगर अभी झटके महसूस हो रहे हैं, नीचे झुकें, ढकें और पकड़े रहें। ":""}तत्काल खतरे में भारत में 112 पर कॉल करें।`
    :`I cannot verify whether ${hazardPhrase(hazard.key)} is happening here right now; this Copilot has no live warning or sensor feed. Check official NDMA SACHET alerts and local authorities. ${hazard.key==="earthquake"?"If shaking is happening now, Drop, Cover, and Hold On. ":""}For immediate danger in India, call 112.`;
   return{text,sources:[NDMA_ALERTS,NDMA_DOS_DONTS],topic:hazard.key};
  }
  const text=language==="hi"?hindiSafety(hazard.key):precautions(hazard.key);
  return{text,sources:[NDMA_DOS_DONTS,NDMA_ALERTS],topic:hazard.key};
 }

 if(!hazard&&SAFETY.test(q)&&/disaster|hazard|आपदा|प्राकृतिक खतरा/i.test(q)){
  return{text:language==="hi"?"इस सवाल के लिए भरोसेमंद, जगह-विशिष्ट निर्देश देने हेतु खतरे का प्रकार और स्थान चाहिए। आधिकारिक NDMA SACHET अलर्ट देखें और स्थानीय प्रशासन के निर्देश मानें। तत्काल खतरे में भारत में 112 पर कॉल करें.":"I need the hazard type and location to give relevant guidance. Check official NDMA SACHET alerts and follow local authorities. For immediate danger in India, call 112.",sources:[NDMA_ALERTS,NDMA_DOS_DONTS],topic:"general"};
 }
 return null;
}
