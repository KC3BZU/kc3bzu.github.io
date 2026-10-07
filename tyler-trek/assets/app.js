import { MILESTONES } from '../data/itinerary.js';
import { getPlan,tripStatus,validUpdates,formatAltitude,formatDistance,parseGPX,safePhoto } from './model.js';
import { createTrekMap } from './map.js';
import { createProfile } from './profile.js';

const $=id=>document.getElementById(id);
let days=getPlan(),units='imperial',selected=tripStatus().day??1,track=null,tour=null,updates=[],oldestFirst=false;
let map;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const dateLabel=d=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
const profile=createProfile($('profile'),(n,fly)=>selectDay(n,fly),p=>{
  map.scrubTrack(p);$('profile-note').textContent=`${formatDistance(p.distance/1.609344,units)} along imported track · ${formatAltitude(p.altitude/.3048,units)} elevation · local preview`;
});

function stopTour() {clearTimeout(tour);tour=null;map?.stop();$('flyover').innerHTML='<span aria-hidden="true">▷</span> Fly the route';$('flyover').setAttribute('aria-pressed','false');}
function selectDay(n,fly=true,fromTour=false) {
  if(!fromTour)stopTour();
  selected=Math.max(1,Math.min(15,n));
  renderDay();map?.selectDay(selected,fly);
}
function renderDay() {
  const d=days[selected-1];
  $('day-label').textContent=`DAY ${String(d.day).padStart(2,'0')} / ${dateLabel(d.date).toUpperCase()}`;
  $('day-tag').textContent=d.tag;$('day-title').textContent=d.title;$('day-headline').textContent=d.headline;
  $('day-distance').textContent=formatDistance(d.distance,units);$('day-gain').textContent=formatAltitude(d.gain,units);$('day-high').textContent=formatAltitude(d.high,units);$('day-sleep').textContent=formatAltitude(d.sleep,units);
  $('day-place').textContent=d.place??'a flexible location';$('day-description').textContent=d.description;
  $('day-counter').innerHTML=`${String(selected).padStart(2,'0')} <span>/ 15 DAYS</span>`;
  $('previous-day').disabled=selected===1;$('next-day').disabled=selected===15;
  document.querySelectorAll('#day-picker button').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.day)===selected));});
  const active=$('day-picker').querySelector('[aria-pressed=true]');
  if(active){const box=$('day-picker');if(active.offsetLeft<box.scrollLeft||active.offsetLeft+active.offsetWidth>box.scrollLeft+box.clientWidth)box.scrollTo({left:active.offsetLeft-box.offsetLeft-box.clientWidth/2,behavior:'instant'});}
  profile.render(days,units,selected,track);
}
function picker() {
  $('day-picker').replaceChildren(...days.map(d=>{const b=document.createElement('button');b.dataset.day=d.day;b.setAttribute('aria-label',`Day ${d.day}: ${d.title}`);b.innerHTML=`<span>DAY</span><strong>${String(d.day).padStart(2,'0')}</strong>`;b.addEventListener('click',()=>selectDay(d.day));return b;}));
}
function refreshClocks() {
  const now=new Date();const nepal=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kathmandu',hour:'numeric',minute:'2-digit'}).format(now);
  $('nepal-clock').textContent=nepal;$('nepal-time').textContent=nepal;
  $('local-time').textContent=`${new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(now)} your time`;
  const state=tripStatus(now,updates);
  $('trip-status').textContent=state.phase==='before'?`The trail begins in ${state.daysUntil} ${state.daysUntil===1?'day':'days'}`:state.phase==='during'?`Day ${state.day} on the itinerary`:'The planned trek dates have passed';
  $('planned-place').textContent=state.phase==='during'?`Planned today: ${days[state.day-1].title}`:state.phase==='before'?'October 7 · Fly to Lukla, walk to Monjo':'Check field notes for Tyler’s latest confirmed update.';
}
function milestoneIcon(kind) {
  const paths={mountain:'M3 29 14 8l7 13 6-19 12 27H3M10 16l4 4 4-5M24 12l3 3 3-3',village:'M4 29V15l9-8 9 8v14M1 15 13 4l12 11M10 29V19h6v10M25 29V18l6-5 7 5v11M0 29h40',lake:'M2 19 12 3l9 16M17 16 26 2l12 17M1 24q5-4 10 0t10 0t10 0t9 0M1 31q5-4 10 0t10 0t10 0t9 0',flag:'M11 32V3m0 1h21l-6 7 6 7H11M3 32h18'};
  return `<svg viewBox="0 0 42 36" aria-hidden="true"><path d="${paths[kind]}"/></svg>`;
}
function renderUpdates(failed=false) {
  const visible=validUpdates(updates);
  const ordered=oldestFirst?[...visible].reverse():visible;
  const latest=visible[0];
  if(latest){$('latest-place').textContent=latest.place||'A hello from Tyler';$('latest-copy').textContent=`${new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kathmandu',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(latest.at))} NPT · ${latest.message.length>105?latest.message.slice(0,102)+'…':latest.message}`;}
  else if(failed){$('latest-place').textContent='Updates couldn’t load';$('latest-copy').textContent='Please refresh to try again. The planned itinerary is still available.';$('journal-entries').textContent='The update feed is temporarily unavailable. Please refresh to try again.';}
  if(visible.length){
    $('journal-count').textContent=`${visible.length} ${visible.length===1?'FIELD NOTE':'FIELD NOTES'}`;
    $('journal-entries').replaceChildren(...ordered.map(u=>{const article=document.createElement('article');article.className='entry';const time=document.createElement('time');time.dateTime=u.at;time.textContent=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kathmandu',dateStyle:'medium',timeStyle:'short'}).format(new Date(u.at))+' NPT';const h=document.createElement('h3');h.textContent=u.place||'A note from the trail';const p=document.createElement('p');p.textContent=u.message;article.append(time,h,p);const shots=(Array.isArray(u.photos)?u.photos:[]).filter(p=>p&&safePhoto(p.src)).map(p=>({src:p.src,caption:p.caption||''}));
if(!shots.length&&u.photo)shots.push({src:u.photo,caption:u.caption||''});
if(shots.length){const gal=document.createElement('div');if(shots.length>1)gal.className='photo-gallery';shots.forEach(s=>{const f=document.createElement('figure');const img=document.createElement('img');img.src=s.src;img.alt=s.caption||'Photo shared with this family update';img.loading='lazy';f.append(img);if(s.caption){const cap=document.createElement('figcaption');cap.textContent=s.caption;f.append(cap);}gal.append(f);});article.append(gal);}return article;}));
  }
  const achieved=new Set(visible.flatMap(u=>u.milestones));
  $('milestone-list').innerHTML=MILESTONES.map(m=>`<div class="milestone ${achieved.has(m.id)?'confirmed':''}"><div class="stamp">${milestoneIcon(m.icon)}</div><h3>${m.name}</h3><p>${m.caption}</p><small>${achieved.has(m.id)?'CONFIRMED ✓':'AWAITING A CHECK-IN'}</small></div>`).join('');
}
picker();renderDay();refreshClocks();renderUpdates();
map=createTrekMap(days,n=>selectDay(n));map.selectDay(selected,false);
$('previous-day').addEventListener('click',()=>selectDay(selected-1));$('next-day').addEventListener('click',()=>selectDay(selected+1));
$('plan').addEventListener('change',()=>{stopTour();days=getPlan($('plan').value);picker();renderDay();map.setPlan(days);refreshClocks();});
for(const mode of ['imperial','metric'])$(mode).addEventListener('click',()=>{units=mode;for(const u of ['imperial','metric'])$(u).setAttribute('aria-pressed',String(u===mode));renderDay();});
for(const mode of ['sort-newest','sort-oldest'])$(mode).addEventListener('click',()=>{oldestFirst=mode==='sort-oldest';for(const m of ['sort-newest','sort-oldest'])$(m).setAttribute('aria-pressed',String(m===mode));renderUpdates();});
$('map-mode').addEventListener('click',()=>{stopTour();const is3D=map.toggleTerrain();$('map-mode').textContent=is3D?'3D terrain':'2D map';$('map-mode').setAttribute('aria-pressed',String(is3D));});
$('map-overview').addEventListener('click',()=>{stopTour();map.overview();});
$('flyover').setAttribute('aria-pressed','false');
$('flyover').addEventListener('click',()=>{
  if(tour){stopTour();return;}
  if(track){map.overview();return;}
  let n=1;
  function step(){if(n>13){stopTour();map.overview();return;}selectDay(n,true,true);n++;$('flyover').innerHTML='<span aria-hidden="true">Ⅱ</span> Pause the tour';$('flyover').setAttribute('aria-pressed','true');tour=setTimeout(step,reduced()?3200:3500);}
  step();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')stopTour();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTour();});
$('map').addEventListener('pointerdown',stopTour);
document.querySelectorAll('[data-jump]').forEach(a=>a.addEventListener('click',()=>selectDay(Number(a.dataset.jump))));
$('gpx-file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try {if(file.size>10*1024*1024)throw new Error('Choose a GPX file smaller than 10 MB.');const result=parseGPX(await file.text());stopTour();track=result;map.setTrack(track);$('clear-track').hidden=false;$('import-status').textContent=`${file.name} · ${result.points.length.toLocaleString()} points · local preview only`;$('profile-label').textContent='IMPORTED GPS TRACK';$('profile-title').textContent='Trace the trail.';$('profile-legend').hidden=true;$('profile-note').textContent='Move across the profile or use the arrow keys to explore. Elevations come from your GPX file.';$('flyover').disabled=true;$('flyover').title='Return to the itinerary to fly the planned route.';document.querySelector('.map-caption span:last-child').textContent='IMPORTED TRACK';renderDay();}
  catch(error){$('import-status').textContent=error.message;}finally{e.target.value='';}
});
$('clear-track').addEventListener('click',()=>{track=null;map.setTrack(null);$('clear-track').hidden=true;$('import-status').textContent='Showing the planned itinerary.';$('profile-label').textContent='THE UPS & DOWNS';$('profile-title').textContent='15 days, a whole new perspective.';$('profile-legend').hidden=false;$('profile-note').textContent='Daily itinerary estimates, not a continuous trail profile. Choose a point to explore that day.';$('flyover').disabled=false;$('flyover').removeAttribute('title');document.querySelector('.map-caption span:last-child').textContent='PLANNED ROUTE';renderDay();});
fetch('./data/updates.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Could not load updates');return r.json();}).then(data=>{if(!Array.isArray(data))throw new Error('Invalid update feed');updates=data;renderUpdates();refreshClocks();}).catch(()=>renderUpdates(true));
setInterval(refreshClocks,30000);
