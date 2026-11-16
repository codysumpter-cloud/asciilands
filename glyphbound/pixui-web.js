(()=>{'use strict';
// DOM runtime adapter for Prismtek's real PixUI JSON interchange contracts.
// The original native Godot/Studio importer consumes these same JSON documents.
// This renderer does NOT embed Phaser 4 or the phaser-pixui runtime.
const layoutEl=document.getElementById('pixui-layout'),themeEl=document.getElementById('pixui-theme');
if(!layoutEl||!themeEl)return;
let layout,theme;try{layout=JSON.parse(layoutEl.textContent);theme=JSON.parse(themeEl.textContent)}catch(e){console.error('PixUI contract parse failed',e);return}
if(layout.schema!=='prismtek.pixui-widgets/v1'||layout.engine!=='phaser4'||theme.schema!=='prismtek.pixel-ui/v1'||theme.engine!=='phaser4')return;
const c=theme.theme||{};for(const key of ['background','surface','edge','ink','accent','muted'])if(/^#[a-f\d]{6}$/i.test(c[key]||''))document.documentElement.style.setProperty('--pixui-'+key,c[key]);
const bar=document.getElementById('pixui-hotbar'),status=document.getElementById('pixui-bindings');
const widgets=layout.widgets||[],hotbar=widgets.find(w=>w.kind==='hotbar');
const actions={Gather:['gather','✦','E'],Attack:['attack','⚔','F'],Craft:['craft','⚒','C'],Build:['build','⌂','B'],Pack:['pack','▣','I'],Map:['map','⊞','M'],Rest:['rest','☼','H'],Scout:['scout','◎','G']};
const buttons=[];if(hotbar&&bar){bar.setAttribute('aria-label',hotbar.label);for(const name of hotbar.choices||[]){
 const config=actions[name];if(!config)continue;const b=document.createElement('button');b.className='pixui-slot';b.type='button';b.dataset.action=config[0];b.setAttribute('aria-label',name+' ('+config[2]+')');
 const symbol=document.createElement('span');symbol.className='pixui-slot-icon';symbol.textContent=config[1];
 const label=document.createElement('span');label.className='pixui-slot-label';label.textContent=name;
 const key=document.createElement('span');key.className='pixui-slot-key';key.textContent=config[2];
 b.append(symbol,label,key);if(buttons.length===0)b.classList.add('is-primary');
 b.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('prismtek:pixui-action',{detail:{action:config[0]}})));
 bar.append(b);buttons.push(b);
 }}
const binders=[];if(status){for(const widget of widgets.filter(w=>w.binding&&w.binding!=='none'&&w.kind!=='hotbar')){
 const node=document.createElement('span');node.className='pixui-bind';node.dataset.binding=widget.binding;
 const title=document.createElement('span');title.textContent=widget.label+' ';node.append(title);
 const value=document.createElement('strong');value.textContent='—';node.append(value);
 status.append(node);binders.push({node,value,widget});
 }}
let last={};function setStats(stats){last={...stats};for(const {node,value,widget} of binders){const n=stats[widget.binding];if(n===undefined)continue;value.textContent=widget.binding==='health'?String(Math.round(n))+'%':String(n);node.setAttribute('aria-label',widget.label+': '+value.textContent)}
 const hp=document.getElementById('pixui-hp-fill'),sta=document.getElementById('pixui-sta-fill'),mana=document.getElementById('pixui-mana-fill');
 if(hp)hp.style.width=Math.max(0,Math.min(100,Number(stats.health)||0))+'%';
 if(sta)sta.style.width=Math.max(0,Math.min(100,Number(stats.stamina)||0))+'%';
 if(mana)mana.style.width=Math.max(0,Math.min(100,Number(stats.mana)||0))+'%';
}
function highlight(action){for(const b of buttons)b.classList.toggle('is-primary',b.dataset.action===action)}
window.PrismtekPixUI={layout,theme,setStats,highlight,get stats(){return {...last}},actions:Object.keys(actions)};
document.body.dataset.pixui='prismtek.pixui-widgets/v1';
})();