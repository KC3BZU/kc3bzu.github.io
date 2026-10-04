import { formatAltitude, formatDistance, nearestIndex } from './model.js';

export function createProfile(container,onDay,onTrackPoint) {
  let days=[],units='imperial',selected=1,track=null;
  let W=720;
  const H=130,left=42,right=12,top=13,bottom=22;
  let xValues=[];
  function draw() {
    if(!days.length)return;
    W=Math.max(260,container.clientWidth);
    const focusDay=container.contains(document.activeElement)?document.activeElement.dataset.day:null;
    const samples=track?track.points:days;
    const heights=track?samples.map(p=>p.altitude/0.3048):days.flatMap(d=>[d.high,d.sleep]).filter(Number.isFinite);
    const lo=Math.floor(Math.min(...heights)/2000)*2000-1000,hi=Math.ceil(Math.max(...heights)/2000)*2000+1000;
    const y=v=>top+(hi-v)/(hi-lo)*(H-top-bottom);
    const max=track?samples.at(-1).distance:14;
    xValues=track?samples.map(p=>p.distance):days.map((_,i)=>i);
    const x=v=>left+(v/max)*(W-left-right);
    const grid=[0,.5,1].map(f=>{const v=lo+(hi-lo)*f;return `<line x1="${left}" x2="${W-right}" y1="${y(v)}" y2="${y(v)}" stroke="#eaede6" stroke-dasharray="2 4"/><text x="${left-7}" y="${y(v)+3}" text-anchor="end">${Math.round(units==='metric'?v*.3048:v).toLocaleString('en-US')}</text>`;}).join('');
    let shapes='';
    if(track) {
      const stride=Math.max(1,Math.floor(samples.length/1800));
      let path='';
      samples.forEach((p,i)=>{if(i%stride===0||p.breakBefore||samples[i+1]?.breakBefore||i===samples.length-1)path+=`${p.breakBefore?'M':'L'}${x(p.distance)},${y(p.altitude/.3048)} `;});
      shapes=`<path d="${path}" fill="none" stroke="#ba613d" stroke-width="2"/><circle id="track-cursor" cx="${x(0)}" cy="${y(samples[0].altitude/.3048)}" r="4" fill="#ba613d" stroke="white" stroke-width="2"/>`;
      shapes+=Array.from({length:5},(_,i)=>`<text x="${x(max*i/4)}" y="${H-3}" text-anchor="middle">${formatDistance(max*i/4/1.609344,units)}</text>`).join('');
    } else {
      const path=key=>days.filter(d=>Number.isFinite(d[key])).map((d,i)=>`${i?'L':'M'}${x(d.day-1)},${y(d[key])}`).join(' ');
      const usable=days.filter(d=>Number.isFinite(d.sleep));
      shapes=`<path d="${path('sleep')} L${x(usable.at(-1).day-1)},${H-bottom} L${left},${H-bottom} Z" fill="#e6efea"/><path d="${path('high')}" fill="none" stroke="#c4a283" stroke-width="1.5" stroke-dasharray="3 4"/><path d="${path('sleep')}" fill="none" stroke="#60938c" stroke-width="2"/><line x1="${x(selected-1)}" x2="${x(selected-1)}" y1="${top-4}" y2="${H-bottom+4}" stroke="#bd5d35" stroke-opacity=".5"/>`;
      const hitWidth=Math.min(34,(W-left-right)/14);
      shapes+=days.map(d=>`<g role="button" tabindex="0" aria-label="Day ${d.day}, ${d.place??'buffer day'}, sleeping altitude ${formatAltitude(d.sleep,units)}" data-day="${d.day}"><rect x="${x(d.day-1)-hitWidth/2}" y="0" width="${hitWidth}" height="${H}" fill="transparent"/>${Number.isFinite(d.sleep)?`<circle cx="${x(d.day-1)}" cy="${y(d.sleep)}" r="${d.day===selected?4.5:3}" fill="${d.day===selected?'#bd5d35':'#60938c'}" stroke="white" stroke-width="1.5"/><circle cx="${x(d.day-1)}" cy="${y(d.high)}" r="2" fill="#c4a283"/>`:''}<text x="${x(d.day-1)}" y="${H-3}" text-anchor="middle">${d.day}</text></g>`).join('');
    }
    container.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="${track?'Imported GPS track elevation':'Planned high and sleeping elevations by day'}">${grid}${shapes}</svg>`;
    container.querySelectorAll('[data-day]').forEach(g=>{g.addEventListener('click',()=>onDay(Number(g.dataset.day),false));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onDay(Number(g.dataset.day),false);}});});
    if(focusDay)container.querySelector(`[data-day="${focusDay}"]`)?.focus({preventScroll:true});
    if(track) {
      container.tabIndex=0;container.setAttribute('role','slider');container.setAttribute('aria-label','Explore imported track elevation');container.setAttribute('aria-valuemin','0');container.setAttribute('aria-valuemax',String(samples.length-1));container.setAttribute('aria-valuenow','0');
    } else {container.setAttribute('aria-label','Planned daily elevation chart');container.removeAttribute('tabindex');for(const a of ['role','aria-valuemin','aria-valuemax','aria-valuenow','aria-valuetext'])container.removeAttribute(a);}
    container.updateCursor=p=>{const el=container.querySelector('#track-cursor');if(el){el.setAttribute('cx',x(p.distance));el.setAttribute('cy',y(p.altitude/.3048));}};
  }
  function inspect(index) {
    const p=track.points[index];if(!p)return;
    container.setAttribute('aria-valuenow',String(index));container.setAttribute('aria-valuetext',`${formatDistance(p.distance/1.609344,units)}, ${formatAltitude(p.altitude/.3048,units)}`);
    container.updateCursor(p);onTrackPoint(p);
  }
  container.addEventListener('pointermove',e=>{if(!track)return;const rect=container.getBoundingClientRect();const target=Math.max(0,Math.min(1,((e.clientX-rect.left)/rect.width*W-left)/(W-left-right)))*track.points.at(-1).distance;inspect(nearestIndex(xValues,target));});
  container.addEventListener('keydown',e=>{if(!track)return;let n=Number(container.getAttribute('aria-valuenow'));if(e.key==='ArrowRight')n++;else if(e.key==='ArrowLeft')n--;else if(e.key==='Home')n=0;else if(e.key==='End')n=track.points.length-1;else return;e.preventDefault();inspect(Math.max(0,Math.min(track.points.length-1,n)));});
  new ResizeObserver(()=>draw()).observe(container);
  return {render(d,u,s,t=null){days=d;units=u;selected=s;track=t;draw();}};
}
