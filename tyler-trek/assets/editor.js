import { MILESTONES } from '../data/itinerary.js';
import { validUpdates,safePhoto } from './model.js';
const $=id=>document.getElementById(id);
let entries=[];
const nepalNow=new Date(Date.now()+345*60000).toISOString().slice(0,16);
$('at').value=nepalNow;
$('milestone-fields').replaceChildren(...MILESTONES.map(m=>{const label=document.createElement('label');const box=document.createElement('input');box.type='checkbox';box.name='milestones';box.value=m.id;label.append(box,document.createTextNode(m.name));return label;}));
function photoRow(src='',caption=''){const row=document.createElement('div');row.className='photo-row';const l1=document.createElement('label');const in1=document.createElement('input');in1.name='photo';in1.placeholder='https://… or assets/tyler-photo.jpg';in1.value=src;l1.append('Photo URL or site path',in1);const l2=document.createElement('label');const in2=document.createElement('input');in2.name='caption';in2.maxLength=300;in2.placeholder='A little context for this moment';in2.value=caption;l2.append('Photo caption',in2);const rm=document.createElement('button');rm.type='button';rm.className='remove-photo';rm.textContent='Remove';rm.addEventListener('click',()=>row.remove());row.append(l1,l2,rm);return row;}
$('add-photo').addEventListener('click',()=>$('photo-list').append(photoRow()));
$('photo-list').append(photoRow());
function render() {
  $('prepared-entries').replaceChildren(...entries.map(e=>{const card=document.createElement('article');card.className='prepared-entry';const t=document.createElement('time');t.textContent=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kathmandu',dateStyle:'medium',timeStyle:'short'}).format(new Date(e.at))+' NPT';const h=document.createElement('h3');h.textContent=e.place||'A note from the trail';const p=document.createElement('p');p.textContent=e.message;card.append(t,h,p);if(e.photos&&e.photos.length){const ph=document.createElement('small');ph.textContent=e.photos.length+(e.photos.length===1?' photo':' photos');card.append(ph);}if(e.milestones.length){const small=document.createElement('small');small.textContent='Confirmed: '+e.milestones.map(id=>MILESTONES.find(m=>m.id===id).name).join(', ');card.append(small);}return card;}));
  if(!entries.length)$('prepared-entries').textContent='No updates yet. Your first note starts the story.';
  $('download').disabled=!entries.length;
}
fetch('./data/updates.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('The existing journal could not be loaded.');return r.json();}).then(data=>{
  if(!Array.isArray(data))throw new Error('The existing journal is not a valid list.');
  const valid=validUpdates(data);if(valid.length!==data.length)throw new Error('Some existing entries are invalid or future-dated. Resolve those in data/updates.json first, so no entries are lost.');
  entries=valid;$('feed-state').textContent=`Loaded ${entries.length} existing ${entries.length===1?'update':'updates'}. New notes will be added to this copy.`;$('add-update').disabled=false;render();
}).catch(e=>{$('feed-state').textContent=e.message+' Refresh to try again. Editing is disabled to protect existing updates.';});
$('update-form').addEventListener('submit',e=>{
  e.preventDefault();const form=new FormData(e.currentTarget);
  const photos=[...document.querySelectorAll('#photo-list .photo-row')].map(row=>({src:row.querySelector('input[name=photo]').value.trim(),caption:row.querySelector('input[name=caption]').value.trim()})).filter(p=>p.src);
  for(const p of photos){if(!safePhoto(p.src)){$('form-status').textContent='Use an https:// photo URL or an image path such as assets/photo.jpg.';return;}}
  const item={at:String(form.get('at'))+':00+05:45',place:String(form.get('place')),message:String(form.get('message')),photos,milestones:form.getAll('milestones')};
  const parsed=validUpdates([item]);if(!parsed.length){$('form-status').textContent='Enter a message and a confirmation time that is not in the future.';return;}
  entries=validUpdates([...entries,parsed[0]]);render();$('form-status').textContent='Added to this prepared copy. Download the file to keep it; the live site has not changed.';
  e.currentTarget.elements.message.value='';e.currentTarget.elements.photo.value='';e.currentTarget.elements.caption.value='';e.currentTarget.querySelectorAll('[type=checkbox]').forEach(c=>{c.checked=false;});
});
$('download').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(entries,null,2)+'\n'],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='updates.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
