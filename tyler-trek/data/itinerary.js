// Distance and elevation gain updated 2026-10-20 to Tyler's actual Garmin stats (from the journal entries).
// High and sleeping altitudes remain reference figures. Day 3 = Everest View round trip (up + down combined); Day 7 = Chukhung + Chukhung Ri combined.
// Oct 18 changed to a rest day in Gokyo on 2026-10-17 (Gokyo Ri dropped).
// Geographic waypoints are approximate, not GPS fixes or navigable trails.
export const PLACES = {
  Lukla:[86.7297,27.6869], Monjo:[86.7228,27.7742], 'Namche Bazaar':[86.714,27.8069],
  'Everest View':[86.7232,27.8167], Tengboche:[86.7639,27.8358], Dingboche:[86.8296,27.892],
  Nangkartshang:[86.826,27.916], Chukhung:[86.870,27.903], 'Chukhung Ri':[86.878,27.928],
  'Kongma La':[86.835,27.932], Lobuche:[86.810,27.948], 'Gorak Shep':[86.828,27.981],
  'Kala Patthar':[86.828,27.995], 'Everest Base Camp':[86.859,28.002], Dzongla:[86.768,27.939], 'Cho La':[86.750,27.962],
  Thagnak:[86.708,27.941], Gokyo:[86.692,27.954], 'Gokyo Ri':[86.692,27.970], Phortse:[86.750,27.847]
};

const rows = [
  ['Lukla to Monjo','Monjo',7.82,2090,9354,9307,'A little runway. A very big beginning.','A flight into Lukla marks the start of the trail. The first walk heads toward Monjo and the entrance to Sagarmatha National Park.',['Lukla','Monjo'],'On the trail','namche'],
  ['Into Namche Bazaar','Namche Bazaar',3.84,2487,11114,11114,'The mountains have a hometown.','The trail climbs to Namche Bazaar, the mountain town that will bookend the higher part of the journey.',['Monjo','Namche Bazaar'],'Mountain village','namche'],
  ['A day above Namche','Namche Bazaar',3.86,1500,12649,11114,'A slower day, with a bigger view.','An acclimatization day based in Namche, with a planned walk to Hotel Everest View before returning for the night.',['Namche Bazaar','Everest View','Namche Bazaar'],'Acclimatization','namche'],
  ['The path to Tengboche','Tengboche',6.47,2671,12543,12543,'A monastery among giants.','Today’s plan leads to Tengboche and its monastery, with another night a little higher in the Khumbu.',['Namche Bazaar','Tengboche'],'Monastery stop','dingboche'],
  ['Up to Dingboche','Dingboche',6.4,2270,14235,14235,'Following the valley toward the sky.','The itinerary notes views of Ama Dablam on the way to Dingboche, home for the next two nights.',['Tengboche','Dingboche'],'Alpine valley','dingboche'],
  ['Above the tree line','Dingboche',3.59,2795,16453,14235,'Climb a little higher. Sleep a little lower.','A second acclimatization day. Nangkartshang Peak is an optional outing; the overnight base remains Dingboche.',['Dingboche','Nangkartshang','Dingboche'],'Acclimatization','dingboche'],
  ['Toward Chukhung','Chukhung',7.73,4636,18053,15492,'One last valley before the pass.','The original plan includes an optional Chukhung Ri climb. The stated high point and mileage may include that side trip.',['Dingboche','Chukhung','Chukhung Ri','Chukhung'],'Optional summit','dingboche'],
  ['Across Kongma La','Lobuche',7.57,3806,18037,16125,'The first high crossing.','From Chukhung over Kongma La, then onward to Lobuche.',['Chukhung','Kongma La','Lobuche'],'High pass','dingboche'],
  ['Everest Base Camp day hike','Lobuche',10.04,2595,17600,16125,'A detour to the most famous camp on Earth.','A day hike from Lobuche to Everest Base Camp and back, following the trail through Gorak Shep. Overnight again in Lobuche.',['Lobuche','Gorak Shep','Everest Base Camp','Gorak Shep','Lobuche'],'Side trip','dingboche'],
  ['A shorter day to Dzongla','Dzongla',4.24,761,16165,15800,'A pause before the next pass.','A shorter trek to Dzongla to stage for Cho La.',['Lobuche','Dzongla'],'Staging day','dingboche'],
  ['Over Cho La to Gokyo','Gokyo',9.88,4331,17617,15594,'From a high pass to turquoise water.','A crossing of Cho La and a descent toward the Gokyo lakes, with a guide.',['Dzongla','Cho La','Thagnak','Gokyo'],'High pass','gokyo'],
  ['A rest day in Gokyo','Gokyo',0,0,15594,15594,'A day to rest by the lakes.','A rest day in Gokyo before the return toward Namche.',['Gokyo'],'Rest day','gokyo'],
  ['Back to Namche','Namche Bazaar',15.4,3613,13033,11114,'A familiar bend in the trail.','Back to Namche Bazaar before the final trekking day.',['Gokyo','Namche Bazaar'],'The return','namche'],
  ['The last miles to Lukla','Lukla',11.87,2736,11137,9322,'Full circle in the foothills.','A long final trail day back to Lukla. One buffer day remains before the planned flight to Kathmandu.',['Namche Bazaar','Monjo','Lukla'],'Trail finish','namche'],
  ['Room for the unexpected',null,null,null,null,null,'A little breathing room.','A flexible day for weather, rest, or a change of plans. The plan lists the flight to Kathmandu on October 22.',[],'Buffer day','gokyo']
];
export const ORIGINAL = rows.map((r,i)=>({day:i+1,date:`2026-10-${String(i+7).padStart(2,'0')}`,title:r[0],place:r[1],distance:r[2],gain:r[3],high:r[4],sleep:r[5],headline:r[6],description:r[7],route:r[8],tag:r[9],image:r[10]}));
export const MILESTONES = [
  {id:'namche',name:'Namche Bazaar',day:2,caption:'Into the Khumbu',icon:'village'},
  {id:'kongma',name:'Kongma La',day:8,caption:'First high pass',icon:'mountain'},
  {id:'ebc',name:'Everest Base Camp',day:9,caption:'A detour to Base Camp',icon:'mountain'},
  {id:'chola',name:'Cho La',day:11,caption:'Second high pass',icon:'mountain'},
  {id:'gokyo',name:'Gokyo Lakes',day:11,caption:'Turquoise at altitude',icon:'lake'},
  {id:'lukla',name:'Back to Lukla',day:14,caption:'The loop comes home',icon:'flag'}
];
