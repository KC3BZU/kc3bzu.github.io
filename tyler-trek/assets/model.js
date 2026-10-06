import { ORIGINAL, MILESTONES } from '../data/itinerary.js';
export function getPlan(version='original') {
  const days=structuredClone(ORIGINAL);
  if(version==='family') {
    Object.assign(days[8],{title:'A shorter day to Dzongla',place:'Dzongla',distance:4.1,gain:1153,high:16165,sleep:15800,headline:'A pause before the next pass.',description:'The family version replaces the Kala Patthar day hike with a shorter trek to Dzongla to stage for Cho La.',route:['Lobuche','Dzongla'],tag:'Staging day'});
    Object.assign(days[9],{distance:7.2,route:['Dzongla','Cho La','Thagnak','Gokyo']});
  }
  return days;
}
export function nepalDate(now=new Date()) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kathmandu',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function tripStatus(now=new Date(),updates=[]) {
  const delta=Math.round((Date.parse(nepalDate(now))-Date.parse('2026-10-07'))/86400000);
  return {phase:delta<0?'before':delta>=15?'after':'during',day:delta>=0&&delta<15?delta+1:null,daysUntil:Math.max(0,-delta),confirmed:validUpdates(updates,now)[0]??null};
}
export function safePhoto(value) {
  if(typeof value!=='string'||!value.trim()) return null;
  return /^https:\/\/[^\s]+$/i.test(value)||/^assets\/[\w./-]+\.(jpg|jpeg|png|webp|avif)$/i.test(value)?value:null;
}
export function safePhotos(value) {
  if(!Array.isArray(value)) return null;
  const out=value.filter(p=>p&&typeof p==='object').map(p=>({src:safePhoto(p.src),caption:typeof p.caption==='string'?p.caption:''})).filter(p=>p.src);
  return out.length?out:null;
}
export function validUpdates(input,now=new Date()) {
  if(!Array.isArray(input)) return [];
  return input.filter(u=>u&&typeof u.message==='string'&&u.message.trim()&&typeof u.at==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(u.at)&&Number.isFinite(Date.parse(u.at))&&Date.parse(u.at)<=now.getTime()).map(u=>({
    at:u.at,message:u.message.trim(),place:typeof u.place==='string'?u.place.trim():'',
    day:Number.isInteger(u.day)&&u.day>=1&&u.day<=15?u.day:null,
    photo:safePhoto(u.photo),caption:typeof u.caption==='string'?u.caption:'',photos:safePhotos(u.photos),
    milestones:Array.isArray(u.milestones)?u.milestones.filter(id=>MILESTONES.some(m=>m.id===id)):[]
  })).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
}
export function formatAltitude(feet,units='imperial') {
  if(!Number.isFinite(feet)) return '—';
  return `${Math.round(units==='metric'?feet*0.3048:feet).toLocaleString('en-US')} ${units==='metric'?'m':'ft'}`;
}
export function formatDistance(miles,units='imperial') {
  if(!Number.isFinite(miles)) return '—';
  return `${(units==='metric'?miles*1.609344:miles).toLocaleString('en-US',{maximumFractionDigits:1})} ${units==='metric'?'km':'mi'}`;
}
export function nearestIndex(values,target) {
  let best=-1,delta=Infinity;
  values.forEach((v,i)=>{if(Math.abs(v-target)<delta){best=i;delta=Math.abs(v-target);}});
  return best;
}
export function trackProfile(segments) {
  let distance=0;
  const points=[];
  const rad=v=>v*Math.PI/180;
  for(const segment of segments) {
    let prev=null;
    for(const c of segment) {
      if(!Array.isArray(c)||!Number.isFinite(c[0])||!Number.isFinite(c[1])||Math.abs(c[0])>180||Math.abs(c[1])>90) throw new Error('Invalid track coordinate.');
      if(!Number.isFinite(c[2])) throw new Error('Every track point needs elevation data.');
      if(prev) {
        const a=Math.sin(rad(c[1]-prev[1])/2)**2+Math.cos(rad(prev[1]))*Math.cos(rad(c[1]))*Math.sin(rad(c[0]-prev[0])/2)**2;
        distance+=6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
      }
      points.push({lng:c[0],lat:c[1],altitude:c[2],distance,breakBefore:prev===null});
      prev=c;
    }
  }
  if(points.length<2||distance===0) throw new Error('The track needs at least two distinct points.');
  return points;
}
export function parseGPX(text) {
  const doc=new DOMParser().parseFromString(text,'application/xml');
  if(doc.querySelector('parsererror')||doc.documentElement.localName!=='gpx') throw new Error('Choose a valid GPX file.');
  let groups=[...doc.getElementsByTagNameNS('*','trkseg')];
  if(!groups.length) groups=[...doc.getElementsByTagNameNS('*','rte')];
  const segments=groups.map(g=>[...g.children].filter(p=>['trkpt','rtept'].includes(p.localName)).map(p=>{
    const ele=[...p.children].find(e=>e.localName==='ele');
    const num=v=>v===null||!v.trim()?NaN:Number(v);
    return [num(p.getAttribute('lon')),num(p.getAttribute('lat')),num(ele?.textContent??null)];
  })).filter(s=>s.length>0);
  const points=trackProfile(segments);
  if(points.length>100000) throw new Error('Please use a track with fewer than 100,000 points.');
  return {segments,points};
}
