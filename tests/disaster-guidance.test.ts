import {test} from "node:test";
import assert from "node:assert/strict";
import {answerDisasterQuestion} from "../lib/disaster-guidance";

test("heavy-rain landslide explanation gives correct mechanism and sources",()=>{
 const result=answerDisasterQuestion("How can heavy rain trigger a landslide?")!;
 assert.match(result.text,/soak into a slope/i);
 assert.match(result.text,/gravity/i);
 assert.match(result.text,/cannot tell us whether or exactly when/i);
 assert(result.sources.some(source=>source.includes("usgs.gov")));
});

test("live hazard question does not invent a current event",()=>{
 const result=answerDisasterQuestion("There is an earthquake happening here")!;
 assert.match(result.text,/cannot verify/i);
 assert.match(result.text,/an earthquake is happening/i);
 assert.match(result.text,/no live warning or sensor feed/i);
 assert.match(result.text,/Drop, Cover, and Hold On/i);
 assert(result.sources.some(source=>source.includes("sachet.ndma.gov.in")));
});

test("precaution answers use relevant hazard guidance",()=>{
 const result=answerDisasterQuestion("What should I do to stay safe during a flood?")!;
 assert.match(result.text,/higher ground/i);
 assert.match(result.text,/never walk, swim, or drive through floodwater/i);
});

test("Hindi is used for supported safety answers",()=>{
 const result=answerDisasterQuestion("भूकंप में क्या करें?","hi")!;
 assert.match(result.text,/नीचे झुकें/);
});

test("Hindi live-condition wording reaches the official-alert safeguard",()=>{
 const result=answerDisasterQuestion("क्या अभी यहाँ भूकंप हो रहा है?","hi")!;
 assert.match(result.text,/सत्यापित नहीं कर सकता/);
 assert.match(result.text,/झटके महसूस/);
});

test("barometer questions use a simple NOAA-backed answer",()=>{
 const result=answerDisasterQuestion("What does a barometer measure?")!;
 assert.match(result.text,/measures atmospheric air pressure/i);
 assert(result.sources.some(source=>source.includes("noaa.gov")));
});

test("ordinary questions remain available to the general chat model",()=>{
 assert.equal(answerDisasterQuestion("What is a database index?"),null);
});
