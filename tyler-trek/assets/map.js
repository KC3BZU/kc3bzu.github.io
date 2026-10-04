import { PLACES } from '../data/itinerary.js';

const collection=features=>({type:'FeatureCollection',features});
const line=(coordinates,properties={})=>({type:'Feature',properties,geometry:{type:'LineString',coordinates}});
const point=coordinates=>({type:'Feature',properties:{},geometry:{type:'Point',coordinates}});
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createTrekMap(days,onSelect) {
  let plan=days,selected=1,map=null,ready=false,terrain=true,track=null,fallback=false;
  let markers=[],cursor=null,loadTimeout=null;
  const status=document.querySelector('#map-status');
  const fallbackEl=document.querySelector('#map-fallback');
  const geometry=()=>collection(plan.filter(d=>d.route.length>1).map(d=>line(d.route.map(p=>PLACES[p]),{day:d.day})));
  const coords=()=>track?track.segments.flat().map(c=>c.slice(0,2)):plan.flatMap(d=>d.route.map(p=>PLACES[p]));
  function bounds(points) {
    return [[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1]))],[Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]];
  }
  function svgFallback() {
    const points=coords(); if(!points.length)return;
    const [[minX,minY],[maxX,maxY]]=bounds(points);
    const project=([x,y])=>[65+(x-minX)/Math.max(.001,maxX-minX)*570,345-(y-minY)/Math.max(.001,maxY-minY)*265];
    const path=cs=>cs.map((p,i)=>`${i?'L':'M'}${project(p).join(',')}`).join(' ');
    const route=track?track.segments.map(s=>`<path d="${path(s)}"/>`).join(''):plan.filter(d=>d.route.length>1).map(d=>`<path d="${path(d.route.map(p=>PLACES[p]))}" stroke="${d.day===selected?'#bd5d35':'#75958b'}" stroke-width="${d.day===selected?3:1.5}"/>`).join('');
    const used=[...new Set(plan.flatMap(d=>d.route))];
    fallbackEl.innerHTML=`<svg class="fallback-svg" viewBox="0 0 700 405" role="img" aria-label="Approximate route diagram. Select days using the day buttons."><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#d4ded1" stroke-width=".5"/></pattern></defs><rect width="700" height="405" fill="url(#grid)"/><g fill="none" stroke="#bd5d35" stroke-width="2" stroke-dasharray="4 4">${route}</g>${track?'':used.filter(p=>!['Everest View','Chukhung Ri','Nangkartshang','Gorak Shep','Thagnak'].includes(p)).map(p=>{const [x,y]=project(PLACES[p]);return `<circle cx="${x}" cy="${y}" r="3" fill="#183238"/><text x="${x+7}" y="${y-7}">${p}</text>`;}).join('')}<text x="640" y="65">N ↑</text><circle id="fallback-cursor" r="5" fill="#bd5d35" stroke="white" stroke-width="2" visibility="hidden"/></svg>`;
    fallbackEl.project=project;
  }
  function showFallback(message) {
    if(fallback)return;
    fallback=true;ready=false;clearTimeout(loadTimeout);
    if(map){map.remove();map=null;}markers=[];cursor=null;
    fallbackEl.hidden=false;svgFallback();
    document.querySelector('#map').hidden=true;
    const mode=document.querySelector('#map-mode');mode.textContent='Route diagram';mode.disabled=true;mode.setAttribute('aria-pressed','false');
    status.textContent=message;
  }
  function syncMarkers() {
    markers.forEach(m=>m.remove());markers=[];
    const stops=[...new Set(plan.flatMap(d=>d.route))].filter(p=>!['Everest View','Chukhung Ri','Nangkartshang','Gorak Shep','Thagnak'].includes(p));
    for(const name of stops) {
      const button=document.createElement('button');button.className='place-marker';button.textContent=name;
      button.setAttribute('aria-label',`Explore ${name}`);
      button.addEventListener('click',()=>{const day=plan.find(d=>d.place===name)??plan.find(d=>d.route.includes(name));onSelect(day.day);});
      const marker=new maplibregl.Marker({element:button,anchor:'bottom',offset:[0,-6]}).setLngLat(PLACES[name]).addTo(map);
      marker.placeName=name;markers.push(marker);
    }
    layoutLabels();
  }
  function layoutLabels() {
    if(!ready)return;
    const occupied=[];
    const chosen=plan.find(d=>d.day===selected)?.place;
    // DOM markers do not participate in MapLibre's symbol collision detection.
    // Prefer the selected stop, then the two ends of the journey and major stops.
    const priority=[chosen,'Lukla','Kala Patthar','Gokyo','Namche Bazaar','Kongma La','Cho La'];
    const ordered=[...markers].sort((a,b)=>{
      const rank=m=>priority.includes(m.placeName)?priority.indexOf(m.placeName):99;
      return rank(a)-rank(b);
    });
    for(const m of ordered) {
      const el=m.getElement();
      if(track){el.hidden=true;continue;}
      el.hidden=false;
      const p=map.project(PLACES[m.placeName]);
      const width=el.offsetWidth||90,height=el.offsetHeight||24;
      const box={l:p.x-width/2-4,r:p.x+width/2+4,t:p.y-height-10,b:p.y-2};
      const overlaps=occupied.some(o=>box.l<o.r&&box.r>o.l&&box.t<o.b&&box.b>o.t);
      el.hidden=overlaps;
      if(!overlaps)occupied.push(box);
    }
  }
  function updateSelection(fly) {
    if(fallback){svgFallback();return;}
    if(!ready)return;
    const day=plan.find(d=>d.day===selected);
    map.setFilter('selected-route',['==',['get','day'],selected]);
    markers.forEach(m=>m.getElement().classList.toggle('selected',m.placeName===day.place));
    layoutLabels();
    if(fly&&day.route.length&&!track) {
      const points=day.route.map(p=>PLACES[p]);
      map.fitBounds(bounds(points),{padding:{top:80,bottom:90,left:65,right:65},maxZoom:12.1,pitch:terrain?55:0,bearing:terrain?-18:0,duration:reduced()?0:1400});
    }
  }
  function overview() {
    if(fallback){svgFallback();return;}
    if(!ready)return;
    map.fitBounds(bounds(coords()),{padding:{top:75,bottom:85,left:60,right:65},maxZoom:11.4,pitch:terrain?52:0,bearing:terrain?-15:0,duration:reduced()?0:1000});
  }
  function applyTrack() {
    if(fallback){svgFallback();return;}
    if(!ready)return;
    map.getSource('track').setData(track?collection(track.segments.filter(s=>s.length>1).map(s=>line(s))):collection([]));
    for(const id of ['route','selected-route'])map.setLayoutProperty(id,'visibility',track?'none':'visible');
    markers.forEach(m=>{m.getElement().hidden=!!track;});
    layoutLabels();
    cursor?.remove();cursor=null;
    overview();
  }
  try {
    if(!window.maplibregl)throw new Error('Map library unavailable');
    status.textContent='Loading the mountains…';
    map=new maplibregl.Map({container:'map',center:[86.77,27.85],zoom:10.1,pitch:52,bearing:-15,maxPitch:75,maxZoom:15,attributionControl:true,cooperativeGestures:true,
      style:{version:8,sources:{
        satellite:{type:'raster',tiles:['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg'],tileSize:256,maxzoom:14,attribution:'<a href="https://s2maps.eu">Sentinel-2 cloudless © EOX / Copernicus</a>'},
        terrain:{type:'raster-dem',url:'https://tiles.mapterhorn.com/tilejson.json',tileSize:512},
        route:{type:'geojson',data:geometry()},track:{type:'geojson',data:collection([])}
      },layers:[
        {id:'background',type:'background',paint:{'background-color':'#a7b1a2'}},
        {id:'satellite',type:'raster',source:'satellite',paint:{'raster-saturation':-.3,'raster-brightness-min':.08,'raster-brightness-max':.85}},
        {id:'route',type:'line',source:'route',paint:{'line-color':'#f3d8b7','line-width':2,'line-dasharray':[2,2],'line-opacity':.85}},
        {id:'selected-route',type:'line',source:'route',filter:['==',['get','day'],selected],paint:{'line-color':'#f28e58','line-width':4,'line-dasharray':[2,1]}},
        {id:'track',type:'line',source:'track',paint:{'line-color':'#ff9c6b','line-width':3}}
      ],terrain:{source:'terrain',exaggeration:1},sky:{'sky-color':'#cbd9db','horizon-color':'#dbe5df','fog-color':'#dbe5df','fog-ground-blend':.15}}
    });
    map.addControl(new maplibregl.NavigationControl({showCompass:true,visualizePitch:true}),'bottom-right');
    map.on('move',layoutLabels);
    map.on('load',()=>{ready=true;clearTimeout(loadTimeout);status.textContent='';syncMarkers();updateSelection(false);applyTrack();});
    map.on('error',e=>{
      if(e.sourceId==='terrain'&&ready){map.setTerrain(null);terrain=false;const mode=document.querySelector('#map-mode');mode.textContent='2D map';mode.setAttribute('aria-pressed','false');status.textContent='Terrain could not load. Showing the flat map.';}
      if(e.sourceId==='satellite'&&ready)showFallback('Map imagery is unavailable. Showing the approximate route diagram.');
    });
    loadTimeout=setTimeout(()=>{if(!ready)showFallback('Map could not load. The approximate route diagram and itinerary are available.');},15000);
  } catch { showFallback('3D maps are unavailable in this browser. Explore the approximate route diagram.'); }
  return {
    selectDay(day,fly=true){selected=day;updateSelection(fly);},
    setPlan(days){plan=days;if(ready){map.getSource('route').setData(geometry());syncMarkers();applyTrack();}updateSelection(false);},
    overview,
    toggleTerrain(){if(!ready)return terrain;terrain=!terrain;map.setTerrain(terrain?{source:'terrain',exaggeration:1}:null);map.easeTo({pitch:terrain?55:0,bearing:terrain?-15:0,duration:reduced()?0:900});return terrain;},
    setTrack(value){track=value;applyTrack();},
    scrubTrack(p){if(fallback){const dot=fallbackEl.querySelector('#fallback-cursor');if(dot&&fallbackEl.project){const [x,y]=fallbackEl.project([p.lng,p.lat]);dot.setAttribute('cx',x);dot.setAttribute('cy',y);dot.setAttribute('visibility','visible');}return;}if(!ready)return;if(!cursor){const el=document.createElement('div');el.className='scrub-marker';cursor=new maplibregl.Marker({element:el});}cursor.setLngLat([p.lng,p.lat]).addTo(map);},
    stop(){map?.stop();}
  };
}
