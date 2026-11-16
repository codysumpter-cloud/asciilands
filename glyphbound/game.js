(()=>{'use strict';
// GLYPHBOUND 0.2 — expanded standalone survival game. Independently implemented; does NOT contain Asciicker C++ source.
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d',{alpha:false}),view=$('viewport');
const MIN=(x,a,b)=>Math.max(a,Math.min(b,x)), TAU=Math.PI*2, W=264,H=264, SEA=.06, SAVE_KEY='glyphbound_world_v1';
const RES={wood:0,stone:0,berry:0,crystal:0,fiber:0,seed:0,meat:0,fish:0,meal:0,hide:0,coin:5};
const state={seed:91627,x:128,z:132,yaw:0.18,zoom:1,day:1,time:8/24,yearDay:0,health:100,hunger:100,inv:{...RES},craft:{axe:false,workbench:false},placed:[],removed:{},hits:{},quest:{wood:false,stone:false,axe:false,camp:false},fireplace:null,weatherOverride:'auto',quality:6,buildKind:null,buildRotation:0,playing:true,seconds:0,killCount:0,rpg:null};
const T={MEADOW:0,FOREST:1,SAND:2,ROCK:3,SNOW:4,WATER:5,MARSH:6,PATH:7};
let heights,biomes,objects=[],buckets=new Map(),creatures=[],particles=[],w=960,h=580,scale=1,cw=5,ch=7,cols=0,rows=0,zbuf,cellMat,cellGlyph,cellShade,cellFog,cellExtras,cellGlow;
let last=0,lastRender=0,frameClock=0,fps=0,fpsN=0,uiClock=0,mapClock=0,saveClock=0,toastTime=0,viewDrag=null,drawer=null,projCam=null,nearest=null,lastNotice='The morning sun rises over the vale.',mapDirty=true;
const pressed=new Set(),touchDir=new Set(),net=window.GLYPH_NET||{status:'offline',peers:new Map(),builds:new Map(),tick(){},sendBuild(){},connect(){return false},disconnect(){},sendChat(){return false}};
const G=[' ','.',',',':',';','!','i','/','\\','|','=','+','*','#','%','@','~','^','v','Y','o','x','O','&'];
const M={sky:0,grass:1,forest:2,sand:3,rock:4,snow:5,water:6,marsh:7,wood:8,leaf:9,pine:10,birch:11,ore:12,berry:13,flower:14,animal:15,player:16,fire:17,shadow:18,build:19,dirt:20,white:21};
const BASE=[[89,122,117],[103,164,97],[65,123,91],[210,187,128],[132,143,141],[226,233,209],[84,165,194],[89,126,99],[131,101,72],[108,183,89],[68,139,104],[212,199,154],[186,165,111],[228,99,133],[213,172,96],[204,164,125],[241,206,163],[245,152,83],[51,74,56],[201,173,112],[129,118,83],[224,226,195]];
let colorCache=[],lightQuant=-1,fogQuant=-1,nightFactor=1,skyC=[40,76,85];
const str=v=>String(v).padStart(2,'0');
const fmtTime=()=>{const hr=Math.floor(state.time*24)%24, min=Math.floor((state.time*24%1)*60);return `${str(hr)}:${str(min)}`};
const hash=(x,z,s=0)=>{let n=Math.imul(x|0,374761393)+Math.imul(z|0,668265263)+Math.imul((state.seed+s)|0,2246822519);n=(n^(n>>>13));n=Math.imul(n,1274126177);return ((n^(n>>>16))>>>0)/4294967295};
const sCurve=t=>t*t*(3-2*t);
function noise(x,z,seed=0){const ix=Math.floor(x),iz=Math.floor(z),fx=sCurve(x-ix),fz=sCurve(z-iz);const a=hash(ix,iz,seed),b=hash(ix+1,iz,seed),c=hash(ix,iz+1,seed),d=hash(ix+1,iz+1,seed);return (a+(b-a)*fx)*(1-fz)+(c+(d-c)*fx)*fz;}
function fbm(x,z){return .53*noise(x*.053,z*.053,11)+.26*noise(x*.127,z*.127,23)+.15*noise(x*.31,z*.31,41)+.06*noise(x*.67,z*.67,67)}
const smooth=(a,b,t)=>sCurve(MIN((t-a)/(b-a),0,1));
const index=(x,z)=>Math.floor(MIN(z,0,H-1))*W+Math.floor(MIN(x,0,W-1));
function heightAt(x,z){x=MIN(x,0,W-2.001);z=MIN(z,0,H-2.001);const ix=x|0,iz=z|0,dx=x-ix,dz=z-iz,i=iz*W+ix;return (heights[i]*(1-dx)+heights[i+1]*dx)*(1-dz)+(heights[i+W]*(1-dx)+heights[i+W+1]*dx)*dz;}
const biomeAt=(x,z)=>biomes[index(x,z)];
const isWater=(x,z)=>heightAt(x,z)<SEA;
function biomeName(x,z){const b=biomeAt(x,z);return ['SUNLIT MEADOWS','WHISPERING WOODS','GOLDEN DUNES','STONE HIGHLANDS','FROSTFALL RIDGE','MIRRORWATER','FERN MARSHES','OLD TRAIL'][b]||'THE VALE'}
function generateTerrain(){heights=new Float32Array(W*H);biomes=new Uint8Array(W*H);
  for(let z=0;z<H;z++)for(let x=0;x<W;x++){
    const n=fbm(x,z),r=155+Math.sin(z*.072)*6+Math.sin(z*.023+1)*7,river=Math.abs(x-r);
    let y=1.65+(n-.5)*5.8 + Math.sin(x*.029)*.42 + Math.cos(z*.035)*.5;
    const northness=1-smooth(55,112,z),mount=northness*northness*(7+15*noise(x*.018,z*.018,84));
    y+=mount;
    if(river<9)y-=2.6*(1-smooth(2.3,9,river));
    const lake=Math.hypot((x-101)*1.15,z-173);if(lake<19)y-=4.6*(1-smooth(7,19,lake));
    if(x>175)y-=smooth(174,234,x)*7.5;
    const spawn=Math.hypot(x-128,z-132);if(spawn<12)y=y*smooth(4,12,spawn)+1.45*(1-smooth(4,12,spawn));
    y=MIN(y,-4,29);const wet=noise(x*.031,z*.031,72);let b=T.MEADOW;
    if(y<SEA)b=T.WATER;
    else if(y>13 || (mount>8&&y>7))b=T.SNOW;
    else if(y>6 || (northness>.5&&y>4.8))b=T.ROCK;
    else if(x>178|| (river<12&&y<1.4) || (lake<23&&y<1.4))b=T.SAND;
    else if(z>180&&wet>.54)b=T.MARSH;
    else if(x<110||z<115||wet>.61)b=T.FOREST;
    if(spawn<10&&y>=SEA)b=T.MEADOW;
    heights[z*W+x]=y;biomes[z*W+x]=b;
  }
}
function addToBucket(o){const k=((o.x/14)|0)+':'+((o.z/14)|0);let b=buckets.get(k);if(!b)buckets.set(k,b=[]);b.push(o)}
function spawnObjects(){objects=[];buckets.clear();let num=0;
 for(let z=9;z<H-9;z+=2.8)for(let x=9;x<W-9;x+=2.8){
   let xx=x+(hash(x*17,z*13,1)-.5)*1.9,zz=z+(hash(x*13,z*17,2)-.5)*1.9;
   const b=biomeAt(xx,zz),yy=heightAt(xx,zz),r=hash(x*11,z*31,3),spawnDist=Math.hypot(xx-128,zz-132);
   if(b===T.WATER||yy<SEA+.2 || spawnDist<4.6 || yy>19)continue;
   let type=null;
   if((b===T.FOREST||b===T.MEADOW||b===T.MARSH)&&r<(b===T.FOREST?.63:b===T.MARSH?.31:.29) &&spawnDist>8)type=b===T.FOREST&&hash(x*19,z*23,3)<.42?'pine':hash(x*31,z*9,4)<.56?'birch':'oak';
   else if(r<.72&&r>.62 &&b!==T.SAND)type='rock';
   else if(r>.88&&r<.923&&(b===T.FOREST||b===T.MEADOW||b===T.MARSH))type='berry';
   else if(r>.936&&r<.953&&(b===T.ROCK||b===T.FOREST||b===T.MEADOW))type='ore';
   else if(r>.956&&r<.986&&(b===T.MEADOW||b===T.FOREST))type='flower';
   if(!type)continue;
   const o={id:'r'+num++,x:xx,z:zz,y:yy,type,scale:.79+hash(x*41,z*29,21)*.7,spin:hash(x*11,z*7,15)*6.28,seed:hash(x*7,z*23,29),lastHit:0};
   objects.push(o);addToBucket(o);
 }
 // Starting valley always contains a few reachable resources, without blocking the player.
 for(const [dx,dz,t] of [[5.9,-2.8,'birch'],[-6.4,-1.2,'pine'],[-4.2,4.5,'rock'],[4.6,5.8,'rock'],[1.5,-7.6,'berry'],[-6.4,6.1,'berry'],[6.5,-7.2,'oak'],[-3.7,-6.2,'ore']]){
   const x=128+dx,z=132+dz,o={id:'start'+t+num++,x,z,y:heightAt(x,z),type:t,scale:1.04,spin:hash(dx*100,dz*100,10)*TAU,seed:hash(dx*91,dz*93,18),lastHit:0};objects.push(o);addToBucket(o);
 }
}
function objectsNear(x,z,r){const result=[];const loX=Math.floor((x-r)/14),hiX=Math.floor((x+r)/14),loZ=Math.floor((z-r)/14),hiZ=Math.floor((z+r)/14);for(let bz=loZ;bz<=hiZ;bz++)for(let bx=loX;bx<=hiX;bx++){const bb=buckets.get(bx+':'+bz);if(!bb)continue;for(const o of bb)if(Math.abs(o.x-x)<r&&Math.abs(o.z-z)<r&&!state.removed[o.id])result.push(o)}return result}
function initCreatures(){creatures=[];for(let i=0;i<35;i++){
  const a=hash(i,11,1)*TAU,r=12+hash(i,5,2)*104,x=MIN(128+Math.cos(a)*r,6,W-6),z=MIN(132+Math.sin(a)*r,6,H-6);if(isWater(x,z))continue;
  creatures.push({x,z,baseX:x,baseZ:z,dir:a,phase:hash(i,9,6)*TAU,type:i%5===0?'fox':i%4===0?'deer':'rabbit',speed:.13+hash(i,6,3)*.34})
}}
function skyLight(){const sun=Math.sin(state.time*TAU-Math.PI*.5);return MIN(.2+Math.max(0,sun)*.8+(sun<0?.012:0),.16,1)}
function weather(){if(state.weatherOverride!=='auto')return state.weatherOverride;const k=Math.sin(state.seconds/75+.65)+.6*Math.sin(state.seconds/37-1.7);return k>1.1?'rain':k>.67?'cloudy':'clear'}
function lerp(a,b,t){return a+(b-a)*t}
function mixRGB(a,b,t){return [lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)]}
function cacheColors(){const sun=skyLight(),quant=Math.floor(sun*24),wx=weather(),fogColor=wx==='rain'?[60,83,83]:wx==='cloudy'?[80,99,102]:[104,136,129];if(lightQuant===quant&&fogQuant===wx)return;lightQuant=quant;fogQuant=wx;nightFactor=sun;
 skyC=mixRGB([11,24,32],wx==='rain'?[88,110,116]:[105,160,184],sun);
 colorCache=BASE.map((a,mat)=>{const out=[];for(let s=0;s<13;s++){out[s]=[];for(let f=0;f<5;f++){
   const shade=(.31+sun*1.08)*(.62+s/13*.78);
   const lit=a.map(v=>Math.min(255,v*shade+(mat===M.fire?90:0)));
   const fog=f*.07;const blend=mixRGB(lit,skyC,fog);
   out[s][f]=`rgb(${blend.map(v=>Math.round(MIN(v,0,255))).join(',')})`;
 }}return out})}
function biomeColor(b){return [['#4c9160','#3a714e'],['#3b7652','#316546'],['#c9b077','#a98f66'],['#949b91','#7c847e'],['#d4dbcd','#a9b8ba'],['#468aa2','#2f6c8e'],['#527e60','#405f4f'],['#806f53','#665d49']][b]||['#4a805a','#3d7551']}
function resize(){const b=view.getBoundingClientRect(),width=Math.max(250,b.width),height=Math.max(300,b.height);w=Math.round(width);h=Math.round(height);scale=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);ctx.setTransform(scale,0,0,scale,0,0);ctx.imageSmoothingEnabled=false;setQuality(state.quality,false);mapDirty=true}
function setQuality(size,resizeBuffer=true){state.quality=Number(size);cw=state.quality*.64;ch=state.quality*1.16;cols=Math.max(25,Math.min(162,Math.floor(w/cw)));rows=Math.max(20,Math.min(105,Math.floor(h/ch)));cw=w/cols;ch=h/rows;const n=cols*rows;zbuf=new Float32Array(n);cellMat=new Uint8Array(n);cellGlyph=new Uint8Array(n);cellShade=new Uint8Array(n);cellFog=new Uint8Array(n);cellExtras=new Uint8Array(n);cellGlow=new Uint8Array(n);$('render-stats').textContent=`${size} PX GLYPHS • ${fps} FPS`}
const vnorm=(x,y,z)=>{const d=Math.hypot(x,y,z)||1;return [x/d,y/d,z/d]};
function camera(){const distance=17*state.zoom,xx=state.x-Math.sin(state.yaw)*distance,zz=state.z+Math.cos(state.yaw)*distance,py=heightAt(state.x,state.z),yy=py+12.3*state.zoom;
 const targetX=state.x+Math.sin(state.yaw)*5.6,targetZ=state.z-Math.cos(state.yaw)*5.6,targetY=py+1.35;
 const [fx,fy,fz]=vnorm(targetX-xx,targetY-yy,targetZ-zz),[rx,ry,rz]=vnorm(-fz,0,fx),[ux,uy,uz]=vnorm(ry*fz-rz*fy,rz*fx-rx*fz,rx*fy-ry*fx);
 return {xx,yy,zz,fx,fy,fz,rx,ry,rz,ux,uy,uz,fov:.63,aspect:w/h,focal:h/(2*.63)};
}
function project(x,y,z){const c=projCam,dx=x-c.xx,dy=y-c.yy,dz=z-c.zz,d=dx*c.fx+dy*c.fy+dz*c.fz;if(d<.5||d>112)return null;const sx=(dx*c.rx+dy*c.ry+dz*c.rz)*c.focal/d+w*.5;const sy=h*.5-(dx*c.ux+dy*c.uy+dz*c.uz)*c.focal/d;if(sx<0||sx>=w||sy<0||sy>=h)return null;return [(sx/cw)|0,(sy/ch)|0,d]}
function placeGlyph(x,y,z,g,m,shade=9,glow=0){const p=project(x,y,z);if(!p)return;const i=p[1]*cols+p[0];if(p[2]<zbuf[i]+.02){zbuf[i]=p[2]-.02;cellMat[i]=m;cellGlyph[i]=g;cellShade[i]=shade;cellFog[i]=MIN((p[2]/23)|0,0,4);cellGlow[i]=glow}}
function cellGround(x,y,z,t,g,b,shade,fog){const ix=((x/cw)|0),iy=((y/ch)|0);if(ix<0||iy<0||ix>=cols||iy>=rows)return;const i=iy*cols+ix;if(t>=zbuf[i])return;zbuf[i]=t;cellMat[i]=b;cellGlyph[i]=g;cellShade[i]=shade;cellFog[i]=fog;cellGlow[i]=0}
function traceTerrain(){const c=projCam,aspect=c.aspect,tilt=c.fov;const colorSun=Math.sin(state.time*TAU);let hitCount=0;
 for(let gy=0;gy<rows;gy++){
   const sv=(1-(gy+.5)/rows*2)*tilt,baseX=c.fx+c.ux*sv,baseY=c.fy+c.uy*sv,baseZ=c.fz+c.uz*sv;
   for(let gx=0;gx<cols;gx++){
    const i=gy*cols+gx,sh=((gx+gy*17)%17),sr=(sh===3)?10:sh===1?7:sh===11?8:6;
    cellMat[i]=M.sky;cellGlyph[i]=(hash(gx,gy,92)>.989&&gy<rows*.5)?1:0;cellShade[i]=sr;cellFog[i]=0;zbuf[i]=1e5;cellGlow[i]=0;
    const su=((gx+.5)/cols*2-1)*aspect*tilt,dx=baseX+c.rx*su,dy=baseY+c.ry*su,dz=baseZ+c.rz*su;
    if(dy>-.015)continue;
    let prev=1.2,y=c.yy+prev*dy,prevAbove=true,t=1.2,xx=0,zz=0,hit=false;
    for(let it=0;it<87;it++){
      t+=.43+t*.027;xx=c.xx+dx*t;zz=c.zz+dz*t;if(xx<1||zz<1||xx>W-2||zz>H-2)break;
      y=c.yy+dy*t;
      if(y<=Math.max(SEA,heightAt(xx,zz))){hit=true;break}
      prev=t;
      if(t>94)break;
    }
    if(!hit)continue;
    let lo=prev,hi=t;for(let k=0;k<3;k++){const m=(lo+hi)*.5;const hx=c.xx+dx*m,hz=c.zz+dz*m,hy=c.yy+dy*m;if(hy<=Math.max(SEA,heightAt(hx,hz)))hi=m;else lo=m}
    t=(lo+hi)*.5;xx=c.xx+dx*t;zz=c.zz+dz*t;
    const b=biomeAt(xx,zz),ix=(xx*3|0),iz=(zz*3|0),rand=hash(ix,iz,6),tWater=(b===T.WATER),terrain=heightAt(xx,zz);
    let mat=[M.grass,M.forest,M.sand,M.rock,M.snow,M.water,M.marsh,M.dirt][b]||M.grass;
    let g=1;if(tWater){g=rand>.75?16:rand>.43?11:rand>.22?2:7;mat=M.water}else if(b===T.SAND)g=rand>.88?3:rand>.42?2:1;
    else if(b===T.ROCK)g=rand>.72?14:rand>.42?13:rand>.2?3:11;
    else if(b===T.SNOW)g=rand>.82?12:rand>.42?2:1;
    else if(b===T.FOREST)g=rand>.8?19:rand>.48?5:rand>.17?3:2;
    else if(b===T.MARSH)g=rand>.67?18:rand>.45?6:rand>.22?3:2;
    else g=rand>.86?18:rand>.63?6:rand>.41?3:rand>.21?2:1;
    if(b!==T.WATER &&rand>.979&&(b===T.MEADOW||b===T.FOREST)) {mat=M.flower;g=12}
    let shade=7;
    if(!tWater){const gradX=heightAt(xx+.65,zz)-heightAt(xx-.65,zz),gradZ=heightAt(xx,zz+.65)-heightAt(xx,zz-.65);shade=MIN(Math.floor(8+(-gradX*.25+gradZ*.16)*5+(rand-.5)*4),1,12)}
    else shade=MIN(7+Math.sin(state.seconds*1.9+xx*.4+zz*.3)*2+(rand-.5)*3,2,11)|0;
    const fog=MIN((t/21)|0,0,4);
    zbuf[i]=t;cellMat[i]=mat;cellGlyph[i]=g;cellShade[i]=shade;cellFog[i]=fog;hitCount++;
   }
 }
 return hitCount;
}
function fillCanopy(x,y,z,rX,rY,rZ,mat,seed,style=0){
 const p=project(x,y,z);if(!p)return;
 const cx=p[0],cy=p[1],d=p[2],radiusX=MIN((rX*projCam.focal/d)/cw,1,32),radiusY=MIN((rY*projCam.focal/d)/ch,1,29);
 const left=MIN(Math.floor(cx-radiusX),0,cols-1),right=MIN(Math.ceil(cx+radiusX),0,cols-1),top=MIN(Math.floor(cy-radiusY),0,rows-1),bottom=MIN(Math.ceil(cy+radiusY),0,rows-1);
 for(let gy=top;gy<=bottom;gy++)for(let gx=left;gx<=right;gx++){
   const u=(gx+.5-cx)/radiusX,v=(gy+.5-cy)/radiusY,q=u*u+v*v;if(q>1)continue;
   const bulge=Math.sqrt(1-q),depth=d-rZ*bulge-.16,idx=gy*cols+gx;
   if(depth>zbuf[idx]+.1)continue;
   const rand=hash(gx+(seed*500|0),gy+((seed*300)|0),31),illum=MIN(Math.floor(8+2.4*bulge-2.1*u-1.6*v+(rand-.5)*2.6),2,12);
   zbuf[idx]=depth;cellMat[idx]=(rand>.972&&mat===M.leaf)?M.flower:mat;
   cellGlyph[idx]=style===1?(rand>.83?19:rand>.4?12:13):rand>.77?15:rand>.45?14:rand>.18?13:12;
   cellShade[idx]=illum;cellFog[idx]=MIN((depth/27)|0,0,4);
 }
}
function drawTree(o){
 const r=o.scale,wind=Math.sin(state.seconds*.7+o.spin)*.07,pine=o.type==='pine',birch=o.type==='birch';
 const ht=r*(pine?6.5:birch?5.5:5.5),base=o.y,trunk=pine?M.wood:birch?M.birch:M.wood;
 // Depth-tested trunks and branching stems.
 for(let k=0;k<32;k++){const f=k/31,yy=base+f*ht*.82;
   placeGlyph(o.x+wind*f,yy,o.z+wind*f*.6,k%4===0?9:7,trunk,k%3===0?10:8)
 }
 for(let i=0;i<5;i++){const j=i*TAU/5;placeGlyph(o.x+Math.cos(j)*.42*r,base+ht*.62,o.z+Math.sin(j)*.42*r,7,trunk,8)}
 if(pine){for(let j=0;j<4;j++){
   const yy=base+ht*(.40+j*.145),wid=(1.6-j*.3)*r;
   fillCanopy(o.x+wind*.5,yy,o.z,wid,wid*.66,wid,M.pine,o.seed+j*.05,1)
 }}else{
   const cy=base+ht*.78;
   fillCanopy(o.x+wind,cy,o.z,(birch?1.6:2.0)*r,(birch?1.30:1.7)*r,(birch?1.15:1.6)*r,birch?M.leaf:M.forest,o.seed);
   fillCanopy(o.x+wind-.45*r,cy+.26*r,o.z+.22*r,.9*r,.95*r,.8*r,birch?M.leaf:M.forest,o.seed+.11);
   fillCanopy(o.x+wind+.44*r,cy+.03*r,o.z-.25*r,.85*r,.85*r,.8*r,birch?M.leaf:M.forest,o.seed+.21);
 }
}
function drawRock(o){const n=o.type==='ore'?42:33,bright=o.type==='ore',r=.75*o.scale;
 fillCanopy(o.x,o.y+.52*r,o.z,r*.95,r*.62,r*.85,bright?M.ore:M.rock,o.seed);
 for(let k=0;k<n;k++){const a=k*2.399,rad=Math.sqrt(k/n)*r,wx=o.x+Math.cos(a)*rad,wz=o.z+Math.sin(a)*rad,y=o.y+Math.sqrt(Math.max(.02,1-(rad/r)**2))*.9*r;
 placeGlyph(wx,y,wz,bright&&k%4===0?12:k%3===0?13:14,bright&&k%4===0?M.ore:M.rock,bright?10:7+k%4)
 }}
function drawBerry(o){const r=o.scale;fillCanopy(o.x,o.y+.85*r,o.z,.74*r,.53*r,.75*r,M.leaf,o.seed);for(let j=0;j<7;j++)placeGlyph(o.x,o.y+.28+j*.17*r,o.z,9,M.wood,7);
 for(let k=0;k<52;k++){const a=k*2.399,u=k/51*2-1,s=Math.sqrt(1-u*u)*.75*r,x=o.x+Math.cos(a)*s,z=o.z+Math.sin(a)*s,y=o.y+.8+u*.5*r;
 placeGlyph(x,y,z,k%8===0?22:18,k%8===0?M.berry:M.leaf,7+k%5)}
}
function drawFlower(o){placeGlyph(o.x,o.y+.2,o.z,9,M.pine,6);placeGlyph(o.x,o.y+.45,o.z,12,M.flower,11)}
function drawAnimal(a){const ht=heightAt(a.x,a.z);if(ht<SEA)return;const t=a.type;const y=ht+(t==='deer'?.75:.34)+Math.sin(state.seconds*3+a.phase)*.025;
 const body=t==='deer'?20:t==='fox'?18:22;placeGlyph(a.x,y,a.z,body,M.animal,9);
 placeGlyph(a.x+Math.cos(a.dir)*.27,y+.17,a.z+Math.sin(a.dir)*.27,t==='rabbit'?19:15,t==='fox'?M.fire:M.animal,11);
 if(t==='deer'){placeGlyph(a.x-.22,y+.48,a.z-.11,18,M.animal,9);placeGlyph(a.x+.18,y+.48,a.z+.08,18,M.animal,9)}
}
function drawPlayer(){const y=Math.max(SEA,heightAt(state.x,state.z))+(state.rpg?.jumpHeight||0),f=Math.sin(state.seconds*8)*.08;
 fillCanopy(state.x,y+.87,state.z,.40,.52,.34,M.player,.913);fillCanopy(state.x,y+1.46,state.z,.28,.30,.29,M.white,.919);
 placeGlyph(state.x,y+.05,state.z,1,M.shadow,4);
 placeGlyph(state.x-.13,y+.3,state.z,7,M.player,10);placeGlyph(state.x+.12,y+.3+f,state.z,7,M.player,9);
 placeGlyph(state.x,y+.72,state.z,13,M.build,10);placeGlyph(state.x,y+1.05,state.z,22,M.player,11);
 placeGlyph(state.x-.27,y+.8,state.z,7,M.player,10);placeGlyph(state.x+.27,y+.8,state.z,7,M.player,10);
 placeGlyph(state.x,y+1.33,state.z,15,M.white,12);
 // Head position glows gently during the night.
}
function drawStructure(s,isGhost=false){const mat=isGhost?M.flower:M.build,wx=s.x,wz=s.z,y=heightAt(wx,wz),kind=s.type;
 if(kind==='campfire'){
  for(let i=0;i<10;i++){const a=i*TAU/10;placeGlyph(wx+Math.cos(a)*.66,y+.25,wz+Math.sin(a)*.66,13,isGhost?M.flower:M.rock,7)}
  for(let i=0;i<6;i++){const a=i*TAU/6;placeGlyph(wx+Math.cos(a)*.26,y+.18,wz+Math.sin(a)*.26,8,M.wood,7)}
  for(let i=0;i<13;i++){const a=i*2.3+state.seconds*1.8,yy=y+.32+i*.08,x=wx+Math.sin(a)*.16,z=wz+Math.cos(a)*.16;
   placeGlyph(x,yy,z,i%3===0?15:12,isGhost?M.flower:M.fire,9+i%4,1)
  }
  return;
 }
 if(kind==='wall'){const rot=s.rotation||0,dx=rot%2?0:1,dz=rot%2?1:0;for(let u=-1.3;u<1.31;u+=.25)for(let v=0;v<2.7;v+=.32)placeGlyph(wx+u*dx,y+v,wz+u*dz,u%2===0?9:11,mat,6+Math.floor(v)%4);return}
 if(kind==='workbench'){for(let i=-1;i<=1;i+=.3)for(let j=-.5;j<=.5;j+=.3)placeGlyph(wx+i,y+1,wz+j,11,mat,10);for(let i of [-.8,.8])for(let j of [-.35,.35])placeGlyph(wx+i,y+.5,wz+j,9,mat,7);return}
 if(kind==='floor'){for(let i=-1.2;i<1.2;i+=.3)for(let j=-1.2;j<1.2;j+=.3)placeGlyph(wx+i,y+.14,wz+j,j<-.9||i<-.9?13:11,mat,8);return}
 if(kind==='farmplot'){for(let i=-1;i<=1;i+=.22)for(let j=-1;j<=1;j+=.22)placeGlyph(wx+i,y+.14,wz+j,((i*100|0)%3)?13:11,M.dirt,7);const f=state.rpg?.farms.find(f=>f.id===s.id);if(f?.plantedDay>0){for(let j=0;j<13;j++){const xx=wx+(j%4-.5)*.43,z=wz+((j/4|0)-1)*.45;placeGlyph(xx,y+.27+Math.min(.6,(state.day-f.plantedDay)*.26),z,19,M.leaf,8)}}return}
 if(kind==='dock'){for(let i=-1.5;i<=1.5;i+=.3)for(let j=-1;j<=1;j+=.3)placeGlyph(wx+i,y+.5,wz+j,11,M.wood,9);return}
 if(kind==='lantern'){for(let i=0;i<12;i++)placeGlyph(wx,y+i*.18,wz,9,M.wood,7);placeGlyph(wx,y+2.25,wz,15,M.fire,12,1);return}
 if(kind==='roof'){for(let i=-1.6;i<=1.6;i+=.24)for(let j=-1.6;j<=1.6;j+=.24)placeGlyph(wx+i,y+3.3-Math.abs(i)*.5,wz+j,i%3===0?11:13,mat,8);return}
}
function drawWorldObjects(){const objs=objectsNear(projCam.xx,projCam.zz,77);objs.sort((a,b)=>((b.x-projCam.xx)**2+(b.z-projCam.zz)**2)-((a.x-projCam.xx)**2+(a.z-projCam.zz)**2));
 for(const o of objs){if(Math.hypot(o.x-state.x,o.z-state.z)>61)continue;
  if(['pine','birch','oak'].includes(o.type))drawTree(o);else if(o.type==='rock'||o.type==='ore')drawRock(o);else if(o.type==='berry')drawBerry(o);else drawFlower(o)
 }
 for(const s of state.placed){if(Math.hypot(s.x-state.x,s.z-state.z)<64)drawStructure(s)}
 for(const s of net.builds.values())if(!state.placed.some(local=>local.id===s.id)&&Math.hypot(s.x-state.x,s.z-state.z)<64)drawStructure(s)
 if(state.buildKind)drawStructure(buildLocation(),true);
 for(const a of creatures){if(Math.hypot(a.x-state.x,a.z-state.z)<58)drawAnimal(a)}
 rpgDrawWorld();
 for(const peer of net.peers.values()){if(Number.isFinite(peer.x)&&Number.isFinite(peer.z)&&Math.hypot(peer.x-state.x,peer.z-state.z)<65){const y=Math.max(SEA,heightAt(peer.x,peer.z));fillCanopy(peer.x,y+.9,peer.z,.36,.55,.32,M.water,.83);fillCanopy(peer.x,y+1.5,peer.z,.25,.3,.27,M.ore,.9);placeGlyph(peer.x,y+1.88,peer.z,23,M.white,12,1)}}
 drawPlayer();
}
function drawOverlay(){ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${Math.max(5,state.quality)}px ui-monospace,Menlo,Consolas,monospace`;
 let shown=0;for(let i=0;i<rows*cols;i++){
 const g=cellGlyph[i];if(g===0)continue;
 const m=cellMat[i];let col=colorCache[m][cellShade[i]][cellFog[i]];
 if(cellGlow[i])col=nightFactor<.5?'#ffce79':'#ffc878';ctx.fillStyle=col;
 const xx=((i%cols)+.5)*cw,yy=(((i/cols)|0)+.49)*ch;
 ctx.fillText(G[g],xx,yy);shown++;
 }
 // A small, highlighted player glyph makes the avatar readable even at 4.5 px.
 const hero=project(state.x,heightAt(state.x,state.z)+1.75+(state.rpg?.jumpHeight||0),state.z);if(hero){
   ctx.font=`bold ${Math.max(10,state.quality*1.65)}px ui-monospace,Menlo,monospace`;
   ctx.lineWidth=2.5;ctx.strokeStyle='rgba(5,19,14,.85)';ctx.fillStyle='#ffe1a4';
   const hx=(hero[0]+.5)*cw,hy=(hero[1]+.5)*ch;ctx.strokeText('@',hx,hy);ctx.fillText('@',hx,hy);
   ctx.font=`${Math.max(5,state.quality)}px ui-monospace,Menlo,Consolas,monospace`;
 }
 // Screen-space ASCII precipitation and floating pollen are drawn on the same glyph grid.
 const wx=weather(),rain=wx==='rain';
 if(rain){const amount=Math.min(100,cols*rows*.011)|0;ctx.fillStyle=nightFactor>.4?'rgba(202,225,229,.55)':'rgba(145,188,201,.62)';for(let i=0;i<amount;i++){
   const px=((hash(i,2,15)*w+state.seconds*83*(i%3+1))%w),py=((hash(i,7,18)*h+state.seconds*270*(i%4+1))%h);ctx.fillText(i%3===0?'|':'/',px,py)
 }}else{ctx.fillStyle='rgba(221,230,173,.35)';for(let i=0;i<22;i++){
  const x=((hash(i,15,10)*w+state.seconds*(2+i%4))%w),y=((hash(i,17,11)*h+Math.sin(state.seconds+i)*13+h)%h);if(i%3===0)ctx.fillText('.',x,y)
 }}
 return shown;
}
function render(){if(!heights||!canvas.width)return;cacheColors();projCam=camera();
 const sk=skyC.map(Math.round),top=`rgb(${sk.map(v=>Math.round(v*.78)).join(',')})`,bottom=`rgb(${sk.map(v=>Math.round(v*1.1)).join(',')})`;
 const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,top);gradient.addColorStop(.7,bottom);gradient.addColorStop(1,'#253a2f');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
 const count=traceTerrain();drawWorldObjects();const glyphCount=drawOverlay();
 // Atmospheric night tint and exposure, independent of scene geometry.
 if(nightFactor<.4){ctx.fillStyle=`rgba(4,11,27,${(.4-nightFactor)*.25})`;ctx.fillRect(0,0,w,h)}
 return {glyphCount,count};
}
function isTree(o){return o&&['pine','birch','oak'].includes(o.type)}
function pickNearest(){let best=null,d=Infinity;for(const o of objectsNear(state.x,state.z,4.5)){
 const v=Math.hypot(o.x-state.x,o.z-state.z);if(v<d&&v<(isTree(o)?3.2:o.type==='berry'?2.8:2.75)){d=v;best=o}
 }return best}
function resourceName(o){return o.type==='pine'?'pine tree':o.type==='birch'?'birch tree':o.type==='oak'?'oak tree':o.type==='berry'?'berry bush':o.type==='ore'?'crystal deposit':o.type==='rock'?'stone outcrop':'wildflower'}
function log(text){const box=$('world-log'),p=document.createElement('p');p.innerHTML='<strong>'+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'</strong> · '+text;box.prepend(p);while(box.children.length>4)box.lastChild.remove();lastNotice=text}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');toastTime=3.2}
function addRes(kind,n){state.inv[kind]=(state.inv[kind]||0)+n;mapDirty=true}
function itemCost(cost){return Object.entries(cost).every(([k,v])=>(state.inv[k]||0)>=v)}
function payCost(cost){if(!itemCost(cost))return false;for(const [k,v] of Object.entries(cost))state.inv[k]-=v;return true}
const RECIPES={axe:{title:'Stone axe',cost:{wood:3,stone:2},desc:'Chop trees in fewer hits',kind:'tool'},campfire:{title:'Campfire',cost:{wood:4,stone:3},desc:'Light a fire, establish your camp',kind:'build'},workbench:{title:'Workbench',cost:{wood:8,stone:4},desc:'Your first crafting station',kind:'build'},floor:{title:'Wooden floor',cost:{wood:3},desc:'A foundation for your shelter',kind:'build'},wall:{title:'Timber wall',cost:{wood:4},desc:'Rotate using R while building',kind:'build'},roof:{title:'Thatch roof',cost:{wood:6,berry:2},desc:'Shelter beneath the rain',kind:'build'},farmplot:{title:'Garden plot',cost:{wood:2,stone:1},desc:'Plant wild seeds, harvest later',kind:'build'},dock:{title:'Small dock',cost:{wood:7,stone:3},desc:'A place to fish beside the water',kind:'build'},lantern:{title:'Signal lantern',cost:{wood:2,crystal:1},desc:'Glowing light for your camp',kind:'build'}};
function gather(){if(!state.playing)return;if(state.buildKind){placeBuild();return}
 const o=pickNearest();if(o){
  const key=o.id,need=o.type==='ore'?3:isTree(o)?(state.craft.axe?1:3):o.type==='rock'?2:1;
  const hits=(state.hits[key]||0)+1;state.hits[key]=hits;
  if(hits<need){toast(`${resourceName(o).toUpperCase()}  •  ${hits}/${need} HIT${need===1?'':'S'}`);return}
  delete state.hits[key];state.removed[key]=o.type==='rock'||o.type==='ore'?999:(state.day+3);
  if(isTree(o)){const n=state.craft.axe?5:3;addRes('fiber',1);addRes('wood',n);toast(`+${n} WOOD · ${o.type.toUpperCase()} HARVESTED`);log(`Harvested ${resourceName(o)} — <strong>+${n} wood</strong>`)}
  else if(o.type==='rock'){addRes('stone',3);toast('+3 STONE');log('Mined an outcrop — <strong>+3 stone</strong>')}
  else if(o.type==='ore'){addRes('coin',1);addRes('stone',2);addRes('crystal',1);toast('+2 STONE · +1 CRYSTAL');log('Unearthed <strong>glowing crystal</strong>')}
  else if(o.type==='berry'){addRes('seed',2);addRes('berry',4);toast('+4 WILDBERRIES');log('Foraged <strong>four wildberries</strong>')}
  else {addRes('berry',1);toast('FOUND AN EDIBLE WILD PLANT')}
  if(state.inv.wood>=3)state.quest.wood=true;if(state.inv.stone>=2)state.quest.stone=true;
  saveWorld(false);refreshUI(true);return;
 }
 if(rpgInteract())return;
 const fire=state.placed.find(s=>s.type==='campfire'&&Math.hypot(s.x-state.x,s.z-state.z)<2.8);if(fire){state.health=MIN(state.health+12,0,100);state.hunger=MIN(state.hunger+2,0,100);toast('RESTED BY THE FIRE  ·  +12 HEALTH');return}
 toast('NOTHING TO GATHER NEARBY  •  APPROACH A TREE OR ROCK');
}
function getBuildPosition(){const dx=Math.sin(state.yaw),dz=-Math.cos(state.yaw);return {x:MIN(Math.round(state.x+dx*3),2,W-3),z:MIN(Math.round(state.z+dz*3),2,H-3)}}
function buildLocation(){const p=getBuildPosition();return {...p,type:state.buildKind,rotation:state.buildRotation}}
function chooseBuild(type){if(!RECIPES[type]||RECIPES[type].kind!=='build')return;state.buildKind=type;state.buildRotation=0;closeDialog();toast(`PLACING ${RECIPES[type].title.toUpperCase()} · E TO CONFIRM`);refreshUI()}
function placeBuild(){const type=state.buildKind,rec=RECIPES[type];if(!rec)return;
 const p=buildLocation();if(isWater(p.x,p.z)){toast('BUILDING BLOCKED  ·  WATER');return}
 if(Math.abs(heightAt(p.x+1,p.z)-heightAt(p.x-1,p.z))>3.5||Math.abs(heightAt(p.x,p.z+1)-heightAt(p.x,p.z-1))>3.5){toast('GROUND TOO STEEP  ·  FIND A FLATTER SITE');return}
 if(state.placed.some(s=>Math.hypot(p.x-s.x,p.z-s.z)<1.25)){toast('THERE IS ALREADY A STRUCTURE HERE');return}
 if(!payCost(rec.cost)){toast('NOT ENOUGH MATERIALS · GATHER MORE');return}
 const s={...p,id:'build-'+Date.now()+'-'+Math.round(Math.random()*9999),type,rotation:state.buildRotation};state.placed.push(s);net.sendBuild(s);
 if(type==='campfire'){state.quest.camp=true;state.fireplace={x:p.x,z:p.z};state.health=MIN(state.health+10,0,100)}
 if(type==='workbench')state.craft.workbench=true
 if(type==='farmplot')state.rpg.farms.push({id:s.id,plantedDay:0,harvested:0})
 state.buildKind=null;log(`Built a <strong>${rec.title.toLowerCase()}</strong> at ${p.x}, ${p.z}`);toast(`${rec.title.toUpperCase()} BUILT · PROGRESS SAVED`);refreshUI(true);saveWorld(false)
}
function craftAxe(){const rec=RECIPES.axe;if(state.craft.axe){toast('STONE AXE ALREADY EQUIPPED');return}if(!payCost(rec.cost)){toast('NOT ENOUGH MATERIALS');return}state.craft.axe=true;state.quest.axe=true;log('Crafted a <strong>stone axe</strong> · harvesting improved');toast('STONE AXE CRAFTED · 1-HIT TREES');closeDialog();saveWorld(false);refreshUI()}
function eat(){if(state.inv.berry<1){toast('NO BERRIES TO EAT');return}state.inv.berry--;state.hunger=MIN(state.hunger+24,0,100);state.health=MIN(state.health+3,0,100);toast('ATE WILDBERRIES  ·  +24 HUNGER');log('Ate a handful of wildberries');refreshUI();saveWorld(false)}
function respawn(){state.health=100;state.hunger=85;if(state.fireplace){state.x=state.fireplace.x;state.z=state.fireplace.z}else{state.x=128;state.z=132}state.buildKind=null;log('You woke up at your last camp');toast('RESPAWNED AT CAMP · PROGRESS RETAINED');refreshUI()}
function cleanExpiredHarvests(){for(const [id,day] of Object.entries(state.removed))if(day!==999&&day<=state.day)delete state.removed[id]}
function move(dt){const k=pressed;let dx=0,dz=0;const up=k.has('w')||k.has('arrowup')||touchDir.has('up'),down=k.has('s')||k.has('arrowdown')||touchDir.has('down'),left=k.has('a')||k.has('arrowleft')||touchDir.has('left'),right=k.has('d')||k.has('arrowright')||touchDir.has('right');
 if(up){dx+=Math.sin(state.yaw);dz-=Math.cos(state.yaw)}if(down){dx-=Math.sin(state.yaw);dz+=Math.cos(state.yaw)}if(right){dx+=Math.cos(state.yaw);dz+=Math.sin(state.yaw)}if(left){dx-=Math.cos(state.yaw);dz-=Math.sin(state.yaw)}
 const mag=Math.hypot(dx,dz);if(mag>0){const sprint=k.has('shift')&&state.rpg.stamina>3;const speed=state.rpg.sailing?8:sprint?6.5:4.1; if(sprint)state.rpg.stamina=MIN(state.rpg.stamina-dt*12,0,100);const step=dt*speed/mag,xx=MIN(state.x+dx*step,4,W-5),zz=MIN(state.z+dz*step,4,H-5),nextY=heightAt(xx,zz),curY=heightAt(state.x,state.z);
   if((state.rpg.sailing?(isWater(xx,zz)||nextY<SEA+.4):nextY>SEA-.7)&& (state.rpg.sailing||Math.abs(curY-nextY)<(state.rpg.jumpHeight>0?4:2.1))&&!rpgBlocked(xx,zz)){
   if(state.rpg.sailing&&nextY>SEA+.37){state.rpg.sailing=false;toast('RAFT MOORED · ASHORE')}state.x=xx;state.z=zz;state.hunger=MIN(state.hunger-dt*(k.has('shift')?.12:.04),0,100)}
 }
}

// GLYPHBOUND RPG expansion — original gameplay code, informed by Asciicker's published
// Inventory/Physics/Renderer interface contracts, NOT copied from its C++ implementation.
const RPG_RECIPES={
 pickaxe:{title:'Stone pickaxe',kind:'tool',cost:{wood:3,stone:4},desc:'Faster stone and crystal extraction'},
 spear:{title:'Hunting spear',kind:'tool',cost:{wood:4,stone:2,fiber:2},desc:'Defend the camp from wolves'},
 rod:{title:'Fishing rod',kind:'tool',cost:{wood:3,fiber:3},desc:'Catch fish in rivers and lakes'},
 armor:{title:'Hide tunic',kind:'tool',cost:{hide:4,fiber:3},desc:'Protection against wild creatures'},
 raft:{title:'River raft',kind:'tool',cost:{wood:12,fiber:4,stone:2},desc:'Travel across deeper water (T to embark)'},
 staff:{title:'Crystal staff',kind:'tool',cost:{wood:4,crystal:4,fiber:2},desc:'Channel a protective energy bolt (K)'},
 cooked:{title:'Cooked fish',kind:'food',cost:{fish:1,wood:1},desc:'Restore 40 hunger (needs campfire)'},
 stew:{title:'Hearty stew',kind:'food',cost:{meat:1,berry:2,wood:1},desc:'Restore 55 hunger (needs campfire)'},
 seeds:{title:'Wild seed bundle',kind:'food',cost:{berry:3},desc:'Create 2 seeds to plant'}
};
const MARKET=[
 {id:'buySeed',title:'Buy 3 garden seeds',cost:{coin:2},gain:{seed:3}},
 {id:'buyFood',title:'Buy a cooked meal',cost:{coin:5},gain:{meal:1}},
 {id:'sellStone',title:'Sell 5 stone',cost:{stone:5},gain:{coin:3}},
 {id:'sellCrystal',title:'Sell a crystal',cost:{crystal:1},gain:{coin:8}},
 {id:'sellHide',title:'Sell 2 hides',cost:{hide:2},gain:{coin:4}},
 {id:'sellFish',title:'Sell 3 fish',cost:{fish:3},gain:{coin:5}}
];
const TRADERS=[{x:118,z:143,name:'WAYFARER MARKET'},{x:187,z:157,name:'COASTAL EXCHANGE'},{x:83,z:101,name:'HIGHLAND TRADING POST'}];
const RPG_DEFAULT={level:1,xp:0,stamina:100,mana:100,sailing:false,lastSpell:-99,spellFx:0,jumpHeight:0,jumpVelocity:0,equipment:{},farms:[],wolvesDefeated:{},fishCount:0,combatCount:0,trades:0,muted:true,lastAttack:-99,attackFx:0};
const wolfPack=[];
function makeRPG(){return { ...RPG_DEFAULT,equipment:{},farms:[],wolvesDefeated:{} }}
function mergeRPG(data){const r=makeRPG();
 for(const k of ['level','xp','stamina','mana','fishCount','combatCount','trades','muted'])if(typeof data[k]===(k==='muted'?'boolean':'number'))r[k]=data[k];
 if(data.equipment&&typeof data.equipment==='object')for(const k of ['pickaxe','spear','rod','armor','raft','staff'])r.equipment[k]=!!data.equipment[k];
 if(Array.isArray(data.farms))r.farms=data.farms.filter(f=>f&&typeof f.id==='string').slice(0,400).map(f=>({id:f.id,plantedDay:Math.max(0,+f.plantedDay||0),harvested:+f.harvested||0}));
 if(data.wolvesDefeated&&typeof data.wolvesDefeated==='object')r.wolvesDefeated=data.wolvesDefeated;
 return r;
}
function initRPG(){wolfPack.length=0;for(let i=0;i<23;i++){
 const theta=hash(i,44,19)*TAU,r=16+hash(i,25,20)*105,x=MIN(128+Math.sin(theta)*r,6,W-6),z=MIN(132+Math.cos(theta)*r,6,H-6);
 if(isWater(x,z))continue;wolfPack.push({id:'wolf-'+i,x,z,homeX:x,homeZ:z,dir:theta,health:32,phase:hash(i,77,22)*TAU,cooldown:0})
 }
 // A guaranteed visible but safely distant pack near the starter forest.
 const x=126,z=117;if(!isWater(x,z))wolfPack.push({id:'wolf-tutorial',x,z,homeX:x,homeZ:z,dir:1.3,health:32,phase:0,cooldown:0});
}
function rpgBlocked(x,z){for(const s of state.placed){if(s.type==='wall'&&Math.hypot(s.x-x,s.z-z)<.65)return true}return false}
function gainXP(xp){const r=state.rpg;r.xp+=xp;while(r.xp>=r.level*20){r.xp-=r.level*20;r.level++;state.health=MIN(state.health+15,0,100);toast('LEVEL UP · '+r.level+' · +15 HEALTH');log('Reached level <strong>'+r.level+'</strong>') }}
function rpgJump(){const r=state.rpg;if(r.jumpHeight>.02||r.stamina<8||drawer)return;r.jumpVelocity=5.5;r.stamina-=8;playTone(250,.1)}
function rpgTick(dt){const r=state.rpg;
 r.stamina=MIN(r.stamina+dt*6,0,100);r.jumpVelocity-=dt*14;r.jumpHeight=Math.max(0,r.jumpHeight+r.jumpVelocity*dt);if(r.jumpHeight===0)r.jumpVelocity=0;
 r.attackFx=Math.max(0,r.attackFx-dt);r.spellFx=Math.max(0,r.spellFx-dt);r.mana=MIN(r.mana+dt*1.5,0,100);for(const wolf of wolfPack){if(r.wolvesDefeated[wolf.id]>state.day)continue;
 wolf.cooldown=Math.max(0,wolf.cooldown-dt);const distance=Math.hypot(wolf.x-state.x,wolf.z-state.z);let theta=wolf.dir;
 if(distance<8&&distance>.6)theta=Math.atan2(state.z-wolf.z,state.x-wolf.x);
 else if(Math.hypot(wolf.x-wolf.homeX,wolf.z-wolf.homeZ)>9)theta=Math.atan2(wolf.homeZ-wolf.z,wolf.homeX-wolf.x);
 else if(Math.sin(state.seconds*.4+wolf.phase)>.985)theta+=.3;
 wolf.dir=theta;const speed=distance<8?.87:.18,nx=wolf.x+Math.cos(theta)*speed*dt,nz=wolf.z+Math.sin(theta)*speed*dt;
 if(nx>3&&nx<W-4&&nz>3&&nz<H-4&&!isWater(nx,nz)&&Math.abs(heightAt(nx,nz)-heightAt(wolf.x,wolf.z))<1.7&&!rpgBlocked(nx,nz)){wolf.x=nx;wolf.z=nz}
 if(distance<1.5&&wolf.cooldown===0){wolf.cooldown=2.1;const damage=r.equipment.armor?3:7;state.health=Math.max(0,state.health-damage);toast('WOLF ATTACK · -'+damage+' HEALTH');playTone(105,.15)}
 }
 // Simple gamepad support: left stick walk, right stick orbit, A jump, X attack, Y fish.
 const gp=typeof navigator.getGamepads==='function'?[...navigator.getGamepads()].find(g=>g&&g.connected):null;
 if(gp&&!drawer){for(const key of ['up','down','left','right'])touchDir.delete('gp-'+key);
 const ax=gp.axes[0]||0,ay=gp.axes[1]||0;if(ay<-.25)touchDir.add('up');if(ay>.25)touchDir.add('down');if(ax<-.25)touchDir.add('left');if(ax>.25)touchDir.add('right');
 if(Math.abs(gp.axes[2]||0)>.18)state.yaw+=(gp.axes[2]||0)*dt*1.5;
 if(gp.buttons[0]?.pressed&&!r.gamepadA){rpgJump()}r.gamepadA=!!gp.buttons[0]?.pressed;
 if(gp.buttons[2]?.pressed&&!r.gamepadX)rpgAttack();r.gamepadX=!!gp.buttons[2]?.pressed;
 if(gp.buttons[3]?.pressed&&!r.gamepadY)rpgFish();r.gamepadY=!!gp.buttons[3]?.pressed;
 }else for(const key of ['up','down','left','right'])touchDir.delete('gp-'+key);
}
function drawWolf(wolf){const y=heightAt(wolf.x,wolf.z);fillCanopy(wolf.x,y+.55,wolf.z,.54,.35,.6,M.animal,.3);placeGlyph(wolf.x+.23,y+.88,wolf.z,22,M.animal,9);placeGlyph(wolf.x+.28,y+.95,wolf.z,15,M.fire,11);for(const dx of [-.35,.35])placeGlyph(wolf.x+dx,y+.17,wolf.z,7,M.wood,6)}
function drawTrader(t){const y=heightAt(t.x,t.z);for(let xx=-2;xx<=2;xx+=.3)for(let zz=-1.5;zz<=1.5;zz+=.4){const roofY=y+3.2-Math.abs(xx)*.35;placeGlyph(t.x+xx,roofY,t.z+zz,xx<0?15:14,M.fire,8)}for(const dx of [-1.7,1.7])for(let yy=.2;yy<2.7;yy+=.3)placeGlyph(t.x+dx,y+yy,t.z,9,M.wood,7);fillCanopy(t.x,y+.95,t.z,.29,.49,.28,M.player,.77);placeGlyph(t.x,y+1.53,t.z,22,M.white,11);placeGlyph(t.x,y+2.4,t.z+.35,15,M.fire,12,1)}
function rpgDrawWorld(){for(const t of TRADERS)if(Math.hypot(t.x-state.x,t.z-state.z)<58)drawTrader(t);
 for(const wolf of wolfPack)if(!(state.rpg.wolvesDefeated[wolf.id]>state.day)&&Math.hypot(wolf.x-state.x,wolf.z-state.z)<55)drawWolf(wolf);
 if(state.rpg.sailing){const y=Math.max(SEA,heightAt(state.x,state.z))+.25;for(let j=-1;j<=1;j+=.25)for(let i=-1.5;i<=1.5;i+=.25)placeGlyph(state.x+i,y,state.z+j,11,M.wood,8)}
 if(state.rpg.spellFx>0){const y=heightAt(state.x,state.z)+1.5;for(let j=0;j<24;j++){const a=j*TAU/24,rad=2+Math.sin(state.seconds*8)*.4;placeGlyph(state.x+Math.cos(a)*rad,y+Math.sin(a*2)*.35,state.z+Math.sin(a)*rad,12,M.ore,12,1)}}
 if(state.rpg.attackFx>0){const y=heightAt(state.x,state.z)+1;for(let i=0;i<15;i++){const a=state.yaw-.7+i*.1;placeGlyph(state.x+Math.sin(a)*(1.3+i*.02),y+Math.sin(i*.3)*.5,state.z-Math.cos(a)*1.6,15,M.fire,12,1)}}
}
function rpgNearbyTrader(){return TRADERS.find(t=>Math.hypot(t.x-state.x,t.z-state.z)<4)}
function rpgNearbyPlot(){const p=state.placed.find(s=>s.type==='farmplot'&&Math.hypot(s.x-state.x,s.z-state.z)<3.2);return p||null}
function rpgInteract(){const t=rpgNearbyTrader();if(t){openDialog('trade');return true}
 const p=rpgNearbyPlot();if(p){rpgPlant(p);return true}return false}
function rpgPlant(plot=rpgNearbyPlot()){if(!plot){toast('BUILD OR APPROACH A GARDEN PLOT');return false}
 let f=state.rpg.farms.find(f=>f.id===plot.id);if(!f){f={id:plot.id,plantedDay:0,harvested:0};state.rpg.farms.push(f)}
 if(f.plantedDay>0){if(state.day<f.plantedDay+2){toast('CROPS NEED '+(f.plantedDay+2-state.day)+' MORE DAY(S)');return false}
 f.harvested++;f.plantedDay=0;addRes('berry',6);addRes('seed',2);gainXP(3);toast('HARVESTED · +6 BERRIES · +2 SEEDS');saveWorld(false);refreshUI();return true}
 if(state.inv.seed<1){toast('NO SEEDS · FORAGE BERRY BUSHES OR TRADE');return false}
 state.inv.seed--;f.plantedDay=state.day;toast('GARDEN SEEDED · HARVEST IN TWO DAYS');saveWorld(false);refreshUI();return true}
function rpgAttack(){if(!state.playing||drawer)return false;
 const r=state.rpg;if(state.seconds-r.lastAttack<.48){return false}if(r.stamina<12){toast('TOO TIRED TO ATTACK');return false}
 r.lastAttack=state.seconds;r.stamina-=12;r.attackFx=.24;playTone(r.equipment.spear?330:250,.13);
 let enemy=null,min=3.7;for(const wolf of wolfPack){if(r.wolvesDefeated[wolf.id]>state.day)continue;const d=Math.hypot(wolf.x-state.x,wolf.z-state.z);if(d<min){min=d;enemy=wolf}}
 if(enemy){const damage=r.equipment.spear?21:7;enemy.health-=damage;if(enemy.health<=0){rpgDefeatWolf(enemy)}else toast('HIT WOLF · '+enemy.health+' HP REMAINING');refreshUI();return true}
 let animal=null;min=3.5;for(const a of creatures){const d=Math.hypot(a.x-state.x,a.z-state.z);if(d<min){min=d;animal=a}}
 if(animal){creatures.splice(creatures.indexOf(animal),1);addRes('meat',animal.type==='deer'?3:1);addRes('hide',animal.type==='deer'?2:1);gainXP(4);toast('HUNTED '+animal.type.toUpperCase()+' · MEAT +HIDE');saveWorld(false);refreshUI();return true}
 toast('SWING · NO CREATURE IN RANGE');return false
}
function rpgDefeatWolf(enemy){const r=state.rpg;r.wolvesDefeated[enemy.id]=state.day+3;enemy.health=32;state.killCount++;r.combatCount++;addRes('hide',2);addRes('meat',2);addRes('coin',1);gainXP(10);toast('WOLF DEFEATED · +HIDE +MEAT +COIN');log('Defended your camp against a wolf');saveWorld(false)}
function rpgSail(){const r=state.rpg;if(!r.equipment.raft){toast('CRAFT A RAFT FIRST');return false}if(r.sailing){r.sailing=false;toast('LEFT THE RAFT');return true}
 const spot=findFishSpot();if(!spot){toast('GET NEAR A RIVER, LAKE, OR SEA');return false}
 state.x=spot.x;state.z=spot.z;r.sailing=true;toast('RAFT LAUNCHED · SAIL WITH WASD');playTone(270,.16);return true}
function rpgSpell(){const r=state.rpg;if(drawer||!state.playing)return false;if(!r.equipment.staff){toast('CRAFT A CRYSTAL STAFF');return false}
 if(state.seconds-r.lastSpell<1.1)return false;if(r.mana<25){toast('NOT ENOUGH MAGIC ENERGY');return false}
 r.lastSpell=state.seconds;r.mana-=25;r.spellFx=.5;playTone(670,.28);let best=null,dist=9;
 for(const wolf of wolfPack){if(r.wolvesDefeated[wolf.id]>state.day)continue;const d=Math.hypot(wolf.x-state.x,wolf.z-state.z);if(d<dist){dist=d;best=wolf}}
 if(best){best.health-=38;if(best.health<=0)rpgDefeatWolf(best);else toast('ARCANE BOLT · WOLF '+best.health+' HP');gainXP(3)}else toast('ARCANE LIGHT · NO FOES WITHIN 9M');refreshUI();return true}
function findFishSpot(){for(let dist=1;dist<=6;dist+=.8)for(let a=0;a<TAU;a+=Math.PI/8){const x=state.x+Math.cos(a)*dist,z=state.z+Math.sin(a)*dist;if(x>=2&&x<W-2&&z>=2&&z<H-2&&isWater(x,z))return {x,z}}return null}
function rpgFish(){if(drawer)return false;if(!state.rpg.equipment.rod){toast('CRAFT A FISHING ROD FIRST');return false}const spot=findFishSpot();if(!spot){toast('FIND THE SHORE OF A RIVER OR LAKE');return false}
 state.rpg.fishCount++;addRes('fish',1);gainXP(2);toast('CAUGHT A RIVER FISH · +1 FISH');playTone(440,.22);saveWorld(false);refreshUI();return true}
function closeCampfire(){return state.placed.some(s=>s.type==='campfire'&&Math.hypot(s.x-state.x,s.z-state.z)<5.5)}
function rpgCraft(id){if(id==='axe'){craftAxe();return true}const rec=RPG_RECIPES[id];if(!rec)return false;
 if(rec.kind==='tool'&&state.rpg.equipment[id]){toast('ALREADY EQUIPPED');return false}
 if(['cooked','stew'].includes(id)&&!closeCampfire()){toast('YOU NEED A NEARBY CAMPFIRE');return false}
 if(!payCost(rec.cost)){toast('GATHER MORE MATERIALS FIRST');return false}
 if(rec.kind==='tool')state.rpg.equipment[id]=true;
 else if(id==='cooked'||id==='stew')addRes('meal',id==='stew'?2:1);else if(id==='seeds')addRes('seed',2);
 gainXP(3);toast(rec.title.toUpperCase()+' CRAFTED');playTone(610,.12);saveWorld(false);openDialog('craft');refreshUI();return true}
function rpgTradeHTML(){const t=rpgNearbyTrader();if(!t)return '<p class="field-note">Travel to a market stall to trade.</p>';
 let h='<div class="field-note">'+t.name+' · Coins: <strong>'+state.inv.coin+'</strong>. Barter resources for tools, food and seeds.</div>';
 for(const rec of MARKET)h+='<div class="recipe"><div class="details"><strong>'+rec.title+'</strong><small>Pay: '+costHTML(rec.cost)+' → Receive: '+costHTML(rec.gain)+'</small></div><button data-trade="'+rec.id+'" '+(itemCost(rec.cost)?'':'disabled')+'>Trade</button></div>';
 return h}
function rpgTrade(id){if(!rpgNearbyTrader()){toast('RETURN TO A MARKET STALL');return false}const rec=MARKET.find(r=>r.id===id);if(!rec||!payCost(rec.cost)){toast('NOT ENOUGH GOODS TO TRADE');return false}for(const [k,v] of Object.entries(rec.gain))addRes(k,v);state.rpg.trades++;gainXP(2);toast('TRADE COMPLETE');playTone(510,.12);saveWorld(false);openDialog('trade');refreshUI();return true}
function rpgEat(kind){if(kind!=='meal'||!state.inv.meal)return false;state.inv.meal--;state.hunger=MIN(state.hunger+48,0,100);state.health=MIN(state.health+8,0,100);toast('ATE A WARM MEAL · +48 HUNGER');saveWorld(false);openDialog('pack');return true}
function rpgPackHTML(){const r=state.rpg,items=[['fiber','Plant fiber'],['seed','Wild seeds'],['meat','Raw meat'],['fish','Fresh fish'],['meal','Cooked meals'],['hide','Animal hides'],['coin','Coins']];let html='<div class="inventory">';for(const [id,name] of items)html+='<div class="resource"><span>'+name+'</span><b>'+Math.max(0,state.inv[id]||0)+'</b></div>';html+='</div>';
 html+='<div class="field-note">EQUIPPED: '+(['axe','pickaxe','spear','rod','armor','raft','staff'].filter(k=>k==='axe'?state.craft.axe:r.equipment[k]).join(' · ')||'bare hands')+'<br>Combat: F / Attack · Fishing: V / Fish · Boat: T · Magic: K · Jump: Space · Travel to the market southeast of camp to trade.</div>';
 html+='<div class="recipe"><div class="details"><strong>Eat cooked meal</strong><small>Restores 48 hunger and 8 health</small></div><button data-eat="meal" '+(state.inv.meal?'':'disabled')+'>Eat</button></div>';return html;
}
let audioCtx=null;
function playTone(hz,duration){if(state.rpg?.muted)return;try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='triangle';osc.frequency.value=hz;gain.gain.value=.035;osc.connect(gain);gain.connect(audioCtx.destination);osc.start();gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);osc.stop(audioCtx.currentTime+duration+.01)}catch{}}
function rpgRefreshHUD(){const r=state.rpg;if(!r)return;const el=$('rpg-status');if(el)el.textContent='LV '+r.level+' · '+Math.round(r.stamina)+' STA · '+(state.inv.coin||0)+' COIN · '+Math.round(r.mana)+' MANA';
 const gear=$('rpg-gear');if(gear)gear.textContent='GEAR '+(r.equipment.spear?'SPEAR':state.craft.axe?'AXE':'HANDS')+(r.equipment.armor?' · HIDE ARMOR':'')+' · '+state.killCount+' WOLVES'+(r.sailing?' · SAILING':'');}

function tick(dt){state.seconds+=dt;
 state.time+=dt/(13*60);if(state.time>=1){state.time-=1;state.day++;state.yearDay++;cleanExpiredHarvests();log(`Dawn breaks on <strong>day ${state.day}</strong> of your journey`)}
 state.hunger=MIN(state.hunger-dt/26,0,100);
 if(state.hunger<=0)state.health=MIN(state.health-dt*.6,0,100);else if(state.health<100&&state.hunger>50)state.health=MIN(state.health+dt*.033,0,100);
 if(state.health<=0)respawn();
 if(!drawer)move(dt);
 net.tick(dt,state);
 rpgTick(dt);
 for(const a of creatures){a.phase+=dt*.8;let nx=a.x+Math.cos(a.dir)*a.speed*dt,nz=a.z+Math.sin(a.dir)*a.speed*dt;
 if(isWater(nx,nz)||Math.hypot(nx-a.baseX,nz-a.baseZ)>9||heightAt(nx,nz)-heightAt(a.x,a.z)>1.3){a.dir+=2.3+Math.sin(a.phase)*.4}else{a.x=nx;a.z=nz}if(Math.sin(a.phase*.4)>.99)a.dir+=.05
 }
 if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('show')}
 uiClock+=dt;mapClock+=dt;saveClock+=dt;if(uiClock>.25){refreshUI();uiClock=0}if(mapClock>1.3){updateMinimap();mapClock=0}if(saveClock>20){saveWorld(false);saveClock=0}
}
function refreshUI(questUpdate=false){nearest=pickNearest();const stateHit=state.inv;
 $('hp').textContent=Math.round(state.health);$('food').textContent=Math.round(state.hunger);$('hp-bar').style.width=state.health+'%';$('food-bar').style.width=state.hunger+'%';
 $('time-label').textContent=`DAY ${str(state.day)} · ${fmtTime()}`;$('biome-label').textContent=biomeName(state.x,state.z);
 $('weather-label').textContent=weather()==='rain'?'RAINFALL':weather()==='cloudy'?'OVERCAST':'CLEAR SKY';
 $('compass').textContent=['N','NE','E','SE','S','SW','W','NW'][((Math.round(state.yaw/(Math.PI/4))%8)+8)%8];
 $('coordinates').textContent=`${Math.round(state.x)}, ${Math.round(state.z)}`;$('map-position').textContent=`${Math.round(state.x)} E / ${Math.round(state.z)} S`;
 $('season-display').textContent=`${['SPRING','SUMMER','AUTUMN','WINTER'][Math.floor((state.yearDay%32)/8)]} / ${nightFactor<.32?'☾':'☼'}`;
 for(const v of ['wood','stone','berry','crystal'])$('res-'+v).textContent=stateHit[v]||0;
 rpgRefreshHUD();
 if(!state.quest.wood&&state.inv.wood>=3)state.quest.wood=true;if(!state.quest.stone&&state.inv.stone>=2)state.quest.stone=true;
 const q=[['wood','Gather 3 wood from trees'],['stone','Collect 2 stone from rocks'],['axe','Craft your first stone axe'],['camp','Build a campfire']];const done=q.filter(([k])=>state.quest[k]).length;
 $('quest-count').textContent=`${done} / 4`;let html='';for(const [k,n] of q){html+=`<div class="objective ${state.quest[k]?'done':''}"><span class="check">${state.quest[k]?'✓':'·'}</span><span>${n}</span></div>`}$('objectives').innerHTML=html;
 $('quest-progress').textContent=done===4?'Camp established. Explore, build, and survive!':`${done} of 4 camp milestones completed`;
 $('map-scale').textContent=`64 × 36`;
 const hint=$('target-hint');if(state.buildKind){hint.innerHTML=`BUILD MODE <b>${RECIPES[state.buildKind].title.toUpperCase()}</b> · Press <b>E</b> to place · <b>R</b> rotate · <b>Esc</b> cancel`; $('btn-action').textContent='⌂ Place (E)'}
 else if(rpgNearbyTrader()){hint.innerHTML='<b>E</b> · WAYFARER MERCHANT · TRADE GOODS';$('btn-action').textContent='◇ Trade (E)'}
 else if(rpgNearbyPlot()){hint.innerHTML='<b>E</b> · GARDEN PLOT · PLANT OR HARVEST';$('btn-action').textContent='✿ Tend (E)'}
 else if(nearest){const hit=state.hits[nearest.id]||0;hint.innerHTML=`<b>E</b> · ${resourceName(nearest).toUpperCase()}${hit?' · '+hit+' hits':''} · ${Math.hypot(nearest.x-state.x,nearest.z-state.z).toFixed(1)}m`; $('btn-action').textContent='✦ Gather (E)'}
 else{hint.innerHTML=`Move with <b>WASD</b> · explore the woods and press <b>E</b> to harvest`;$('btn-action').textContent='✦ Gather (E)'}
 $('world-note').classList.toggle('hide',!!state.buildKind);
}
function updateMinimap(){const c=$('minimap'),ct=c.getContext('2d'),iw=c.width,ih=c.height,img=ct.createImageData(iw,ih),sz=1,worldW=64,worldH=36;
 for(let y=0;y<ih;y++)for(let x=0;x<iw;x++){
  const wx=state.x+(x/iw-.5)*worldW,wz=state.z+(y/ih-.5)*worldH,b=biomeAt(wx,wz),rgb=[[[79,139,88]],[[53,101,74]],[[177,153,103]],[[107,117,110]],[[194,205,199]],[[56,129,159]],[[67,101,72]],[[111,103,74]]][b][0],i=(y*iw+x)*4;
  img.data[i]=rgb[0];img.data[i+1]=rgb[1];img.data[i+2]=rgb[2];img.data[i+3]=255;
 }
 ct.putImageData(img,0,0);
 ct.save();ct.strokeStyle='#f6dda1';ct.lineWidth=1.5;ct.beginPath();ct.arc(iw/2,ih/2,4,0,TAU);ct.stroke();ct.beginPath();ct.moveTo(iw/2,ih/2);ct.lineTo(iw/2+Math.sin(state.yaw)*12,ih/2-Math.cos(state.yaw)*12);ct.stroke();
 for(const s of state.placed){const x=(s.x-state.x)/64*iw+iw/2,y=(s.z-state.z)/36*ih+ih/2;if(x<0||x>iw||y<0||y>ih)continue;ct.fillStyle='#ffcd8e';ct.fillRect(x-2,y-2,4,4)}ct.restore();
}
function costHTML(cost){return Object.entries(cost).map(([k,v])=>`${v} ${k}`).join(' · ')}
function recipeRow(id,rec,action){const available=itemCost(rec.cost),owned=rec.kind==='tool'&&(id==='axe'?state.craft.axe:!!state.rpg.equipment[id]);return `<div class="recipe"><div class="details"><strong>${rec.title}</strong><small>${rec.desc}<br>Cost: ${costHTML(rec.cost)}</small></div><button data-recipe="${id}" data-action="${action}" ${!available||owned?'disabled':''}>${owned?'Owned':action==='craft'?'Craft':'Select'}</button></div>`}
function openDialog(type){drawer=type;const name={craft:'CRAFTING & EQUIPMENT',build:'BUILD STRUCTURES',pack:'TRAVELER’S PACK',map:'THE SHATTERED VALE',trade:'WAYFARER MARKET',help:'FIELD GUIDE',settings:'SETTINGS & SAVES',coop:'GUEST CO-OP / SHARED CAMP'}[type]||'FIELD GUIDE';$('dialog-title').textContent=name;
 let html='';if(type==='craft'){html='<div class="field-note">Collect raw materials in the wild. Your <strong>stone axe</strong> makes felling trees faster. Select a structure in the Build menu to place it in the world.</div>';html+=recipeRow('axe',RECIPES.axe,'craft');for(const [id,rec] of Object.entries(RPG_RECIPES))html+=recipeRow(id,rec,'craft')}
 if(type==='build'){html='<div class="field-note">Select a piece, then walk into position. A glowing ghost shows where it will be placed. Press <strong>E</strong> to build, <strong>R</strong> to rotate, <strong>Esc</strong> to cancel.</div>';for(const [id,rec] of Object.entries(RECIPES))if(rec.kind==='build')html+=recipeRow(id,rec,'build')}
 if(type==='pack'){html=`<div class="field-note">Your gear: <strong>${state.craft.axe?'Stone axe equipped':'Bare hands'}</strong>. Your gathered materials and camp structures are saved to this browser automatically.</div><div class="inventory"><div class="resource">♧ Wood <b>${state.inv.wood}</b></div><div class="resource">◆ Stone <b>${state.inv.stone}</b></div><div class="resource">◕ Berries <b>${state.inv.berry}</b></div><div class="resource">✧ Crystal <b>${state.inv.crystal}</b></div></div>${rpgPackHTML()}<div class="recipe"><div class="details"><strong>Eat wildberries</strong><small>1 berry → +24 hunger, +3 health</small></div><button id="eat-berries" ${state.inv.berry<1?'disabled':''}>Eat</button></div>`}
 if(type==='trade')html=rpgTradeHTML();
 if(type==='map')html='<canvas id="fullmap" class="map-large" width="420" height="420" aria-label="Map of the full procedural world"></canvas><div class="field-note">◇ = your position. The world is procedurally generated from a fixed seed. Blue: water; green: forest; yellow: sand; white: snow. Structures you build remain in the same location after saving.</div>';
 if(type==='help')html=`<div class="help"><p><b>W A S D / arrows</b> — move relative to the camera.<br><b>Shift</b> — sprint.<br><b>Mouse drag / finger drag</b> — orbit the view.<br><b>Mouse wheel</b> — camera zoom.<br><b>Q / Z</b> — rotate view left / right.<br><b>E / Action</b> — harvest nearby resources, tend gardens, or trade.<br><b>R</b> — rotate a build piece. <b>F</b> — attack. <b>V</b> — fish. <b>T</b> — sail raft. <b>K</b> — cast magic. <b>Space</b> — jump.<br><b>C</b> — craft · <b>B</b> — build · <b>I</b> — pack and eat · <b>M</b> — world map.<br><b>Esc</b> — close menu or cancel building.</p><p><b>Your first camp:</b> gather wood and stone, craft the axe, place a campfire. Rest beside a lit campfire with E to restore health. Rain, animal movement, and day/night run on the shared world clock. Each local save remembers what you build and harvest.</p><p><b>Mobile:</b> use the direction pad and Action, or drag the world to orbit. Use the View buttons to adjust the camera.</p></div>`;
 if(type==='coop')html=`<div class="field-note">Optional guest co-op: up to 16 travelers can explore the same seeded terrain, see one another, chat, and place persistent shared structures. Inventories, combat and survival are local (not server-authoritative). Anyone with the room link can join.</div><div class="settings-grid"><label>Your display name<input id="coop-name" maxlength="22" autocomplete="off" placeholder="Wanderer"></label><label>Room code<input id="coop-room" maxlength="24" autocomplete="off" placeholder="forest"></label></div><div class="menu-actions"><button id="coop-join">Join / Create Room</button><button id="coop-leave">Leave</button><button id="coop-share">Copy Invite URL</button></div><p class="field-note" id="coop-status"></p><div class="field-note" id="coop-chat" aria-live="polite"></div><div class="menu-actions"><input id="coop-message" maxlength="140" aria-label="Chat message" placeholder="Say hello..."><button id="coop-send">Send</button></div>`;
 if(type==='settings')html=`<div class="settings-grid"><label>Audio <select id="audio-setting"><option value="off">Muted</option><option value="on">Effects on</option></select></label><label>Character size <select id="detail-setting"><option value="4.5">Ultra · 4.5 px</option><option value="6">Fine · 6 px</option><option value="8">Balanced · 8 px</option><option value="11">Classic · 11 px</option></select></label><label>Weather <select id="weather-setting"><option value="auto">Dynamic (recommended)</option><option value="clear">Clear</option><option value="rain">Rain</option><option value="cloudy">Cloudy</option></select></label><label>Camera distance <input id="zoom-setting" type="range" min=".75" max="1.4" step=".05" value="${state.zoom}"></label></div><div class="divider"></div><div class="menu-actions"><button id="save-now">Save now</button><button id="export-now">Export save JSON</button><button id="import-now">Import save JSON</button><button class="danger" id="new-world">Reset world</button></div><div class="field-note">Progress is stored on this browser and origin via localStorage. Export a save file to move your progress to a different browser or device. No login or server account is required.</div><input type="file" accept="application/json,.json" id="save-file" class="sr-only">`;
 $('dialog-body').innerHTML=html;$('drawer').classList.add('open');
 for(const button of $('dialog-body').querySelectorAll('[data-recipe]'))button.addEventListener('click',()=>{if(button.dataset.action==='craft')rpgCraft(button.dataset.recipe);else chooseBuild(button.dataset.recipe)});
 for(const button of $('dialog-body').querySelectorAll('[data-trade]'))button.addEventListener('click',()=>rpgTrade(button.dataset.trade));
 for(const button of $('dialog-body').querySelectorAll('[data-eat]'))button.addEventListener('click',()=>rpgEat(button.dataset.eat));
 if(type==='pack')$('eat-berries').addEventListener('click',()=>{eat();openDialog('pack')});
 if(type==='coop'){
   $('coop-name').value=net.name||'Wanderer';$('coop-room').value=net.room||'vale';
   $('coop-join').onclick=()=>{net.connect($('coop-room').value,$('coop-name').value);refreshCoop()};
   $('coop-leave').onclick=()=>{net.disconnect();refreshCoop()};
   $('coop-share').onclick=()=>{if(!net.room)return;const url=net.shareUrl();if(navigator.clipboard?.writeText)navigator.clipboard.writeText(url).then(()=>toast('INVITE URL COPIED')).catch(()=>toast('COPY THE URL FROM YOUR ADDRESS BAR'));else toast('COPY THE URL FROM YOUR ADDRESS BAR')};
   const send=()=>{if(net.sendChat($('coop-message').value))$('coop-message').value=''};
   $('coop-send').onclick=send;$('coop-message').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();send()}};refreshCoop();
 }
 if(type==='map')drawFullMap();
 if(type==='settings'){
   $('detail-setting').value=String(state.quality);$('weather-setting').value=state.weatherOverride;$('audio-setting').value=state.rpg.muted?'off':'on';$('audio-setting').onchange=e=>{state.rpg.muted=e.target.value!=='on';playTone(420,.12);saveWorld(false)};
   $('detail-setting').onchange=e=>{setQuality(+e.target.value);saveWorld(false)};
   $('weather-setting').onchange=e=>{state.weatherOverride=e.target.value;lightQuant=-1;saveWorld(false)};
   $('zoom-setting').oninput=e=>{state.zoom=+e.target.value};
   $('save-now').onclick=()=>{saveWorld(true);closeDialog()};
   $('export-now').onclick=exportSave;
   $('import-now').onclick=()=>$('save-file').click();
   $('save-file').onchange=importSave;
   $('new-world').onclick=()=>{if(confirm('Reset your local world and all structures? This cannot be undone unless you exported a save.')){localStorage.removeItem(SAVE_KEY);location.reload()}}
 }
}
function refreshCoop(){const online=net.status==='online',head=$('coop-count');if(head)head.textContent=online?`${net.peers.size+1} ONLINE · ${net.room.toUpperCase()}`:'OFFLINE · SOLO';if(drawer!=='coop')return;const status=$('coop-status');if(status)status.textContent=online?`Connected to ${net.room} · ${net.peers.size+1} traveler(s) · ${net.builds.size} shared structures`:net.reason||'Offline · solo play remains available.';const box=$('coop-chat');if(box){box.replaceChildren();for(const m of net.messages.slice(-8)){const p=document.createElement('p');const b=document.createElement('strong');b.textContent=m.name+': ';p.append(b,document.createTextNode(m.text));box.append(p)}}}
function closeDialog(){$('drawer').classList.remove('open');drawer=null;canvas.focus({preventScroll:true})}
function drawFullMap(){const c=$('fullmap');if(!c)return;const m=c.getContext('2d'),img=m.createImageData(c.width,c.height);
 const rgb=[[82,144,89],[50,98,70],[185,153,98],[104,114,108],[224,223,210],[59,127,158],[70,104,76],[117,99,68]];
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const b=biomeAt(x/c.width*W,y/c.height*H),cc=rgb[b],i=(y*c.width+x)*4;img.data[i]=cc[0];img.data[i+1]=cc[1];img.data[i+2]=cc[2];img.data[i+3]=255}
 m.putImageData(img,0,0);m.fillStyle='#eed299';m.beginPath();m.arc(state.x/W*c.width,state.z/H*c.height,5,0,TAU);m.fill();m.strokeStyle='#34271a';m.lineWidth=1.4;m.stroke();
 for(const s of state.placed){m.fillStyle='#f5a35e';m.fillRect(s.x/W*c.width-2,s.z/H*c.height-2,4,4)}
}
function cleanSave(){return {version:1,seed:state.seed,x:state.x,z:state.z,yaw:state.yaw,zoom:state.zoom,day:state.day,time:state.time,yearDay:state.yearDay,health:state.health,hunger:state.hunger,inv:state.inv,craft:state.craft,quest:state.quest,placed:state.placed,removed:state.removed,fireplace:state.fireplace,killCount:state.killCount,seconds:state.seconds,weatherOverride:state.weatherOverride,quality:state.quality,rpg:state.rpg}}
function saveWorld(notify=true){try{localStorage.setItem(SAVE_KEY,JSON.stringify(cleanSave()));$('status-text').textContent='WORLD SAVED';if(notify)toast('WORLD SAVED IN THIS BROWSER')}catch(e){$('status-text').textContent='SAVE UNAVAILABLE';if(notify)toast('BROWSER STORAGE BLOCKED · EXPORT JSON IN SETTINGS')}}
function loadWorld(){try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(!saved||saved.version!==1)return false;hydrate(saved);return true}catch(e){return false}}
function hydrate(data){const allowed=['seed','x','z','yaw','zoom','day','time','yearDay','health','hunger','killCount','seconds','quality','weatherOverride','fireplace'];for(const k of allowed)if(data[k]!==undefined&&data[k]!==null)state[k]=data[k];
 if(data.inv)state.inv={...RES,...data.inv};if(data.rpg&&typeof data.rpg==='object')state.rpg=mergeRPG(data.rpg);if(data.quest)state.quest={...state.quest,...data.quest};if(data.craft)state.craft={...state.craft,...data.craft};if(data.placed&&Array.isArray(data.placed))state.placed=data.placed.slice(0,1000);if(data.removed)state.removed=data.removed;state.x=MIN(Number(state.x)||128,4,W-4);state.z=MIN(Number(state.z)||132,4,H-4);state.zoom=MIN(Number(state.zoom)||1,.7,1.5);state.quality=[4.5,6,8,11].includes(+state.quality)?+state.quality:6}
function exportSave(){const blob=new Blob([JSON.stringify(cleanSave(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`glyphbound-day-${state.day}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('SAVE FILE EXPORTED')}
function importSave(e){const file=e.target.files?.[0];if(!file)return;file.text().then(text=>{const data=JSON.parse(text);if(data.version!==1||!data.inv||!Array.isArray(data.placed))throw Error('Invalid Glyphbound save');hydrate(data);generateTerrain();spawnObjects();initCreatures();setQuality(state.quality);refreshUI(true);saveWorld(true);closeDialog();toast('WORLD SAVE IMPORTED')}).catch(()=>toast('COULD NOT IMPORT THIS SAVE FILE'))}
function frame(t){requestAnimationFrame(frame);const dt=Math.min((t-last)/1000||.016,.09);last=t;if(!state.playing)return;
 tick(dt);frameClock+=dt;if((t-lastRender)<(state.quality<=4.5?1000/20:state.quality<=6?1000/27:1000/35))return;
 lastRender=t;try{render();fpsN++;if(frameClock>.75){fps=Math.round(fpsN/frameClock);frameClock=0;fpsN=0;$('render-stats').textContent=`${state.quality} PX GLYPHS • ${fps} FPS · ${cols}×${rows}`}}catch(e){console.error('Render error',e);$('live-status').textContent='RENDER ERROR';state.playing=false;toast('RENDER ERROR · CHECK CONSOLE')}
}
function installInputs(){window.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement)return;
  const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();
  if(key==='escape'){if(drawer)closeDialog();else if(state.buildKind){state.buildKind=null;refreshUI()}return}
  if(drawer)return;
  if(key==='e'){if(!e.repeat)gather();e.preventDefault();return}
  if(key===' '){if(!e.repeat)rpgJump();e.preventDefault();return}
  if(key==='f'){if(!e.repeat)rpgAttack();return}
  if(key==='v'){if(!e.repeat)rpgFish();return}
  if(key==='t'){if(!e.repeat)rpgSail();return}
  if(key==='k'){if(!e.repeat)rpgSpell();return}
  if(key==='c'){openDialog('craft');return}if(key==='b'){openDialog('build');return}if(key==='i'){openDialog('pack');return}if(key==='m'){openDialog('map');return}
  if(key==='q'){state.yaw-=.13;return}if(key==='z'){state.yaw+=.13;return}
  if(key==='r'&&state.buildKind){state.buildRotation=(state.buildRotation+1)%4;toast('BUILD PIECE ROTATED');return}
  pressed.add(key)
 });
 window.addEventListener('keyup',e=>pressed.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{pressed.clear();touchDir.clear()});
 let px=0,py=0,dragging=false,dragPointer=null;
 view.addEventListener('pointerdown',e=>{if(e.target.closest('.drawer'))return;if(e.target!==canvas&&e.target!==view)return;dragging=true;dragPointer=e.pointerId;px=e.clientX;py=e.clientY;view.setPointerCapture(e.pointerId)});
 view.addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==dragPointer||drawer)return;state.yaw+=(e.clientX-px)*.009;px=e.clientX;py=e.clientY});
 const clearDrag=()=>{dragging=false;dragPointer=null};view.addEventListener('pointerup',clearDrag);view.addEventListener('pointercancel',clearDrag);
 view.addEventListener('wheel',e=>{e.preventDefault();state.zoom=MIN(state.zoom*(e.deltaY<0?.92:1.08),.72,1.45)},{passive:false});
 const buttons=[['btn-action',gather],['touch-action',gather],['btn-attack',rpgAttack],['touch-attack',rpgAttack],['btn-fish',rpgFish],['touch-fish',rpgFish],['btn-boat',rpgSail],['touch-boat',rpgSail],['btn-spell',rpgSpell],['touch-spell',rpgSpell],['touch-jump',rpgJump],['btn-craft',()=>openDialog('craft')],['btn-build',()=>openDialog('build')],['btn-pack',()=>openDialog('pack')],['btn-map',()=>openDialog('map')],['touch-build',()=>openDialog('build')],['btn-coop',()=>openDialog('coop')],['btn-settings',()=>openDialog('settings')],['btn-help',()=>openDialog('help')],['btn-save',()=>saveWorld(true)],['close-drawer',closeDialog]];for(const [id,fn] of buttons)$(id).addEventListener('click',fn);
 $('drawer').addEventListener('pointerdown',e=>{if(e.target===$('drawer'))closeDialog()});
 for(const b of document.querySelectorAll('[data-dir]')){
   const d=b.dataset.dir;const down=e=>{e.preventDefault();touchDir.add(d);b.classList.add('pressing');try{b.setPointerCapture(e.pointerId)}catch{}};
   const up=()=>{touchDir.delete(d);b.classList.remove('pressing')};b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up)
 }
 for(const [id,dir] of [['touch-turn-l',-1],['touch-turn-r',1]]){
   $(id).addEventListener('click',()=>state.yaw+=dir*.35)
 }
 window.addEventListener('beforeunload',()=>saveWorld(false));window.addEventListener('resize',resize,{passive:true});
}
function boot(){net.onChange=refreshCoop;state.rpg=makeRPG();const resumed=loadWorld();generateTerrain();spawnObjects();initCreatures();initRPG();resize();installInputs();cacheColors();updateMinimap();refreshUI(true);
 $('viewport').classList.add('ready');if(resumed){log('Returned to your saved camp in the vale');toast('WORLD RESTORED · WELCOME BACK')}else {log('Your journey begins beneath the birches');toast('WELCOME TO GLYPHBOUND · ESTABLISH YOUR FIRST CAMP')}
 const requestedRoom=new URLSearchParams(location.search).get('room');if(requestedRoom)net.connect(requestedRoom,net.name);refreshCoop();
 requestAnimationFrame(frame);window.GLYPHBOUND_DEBUG={state,objectsNear,pickNearest,chooseBuild,placeBuild,gather,craftAxe,render,saveWorld,loadWorld,biomeAt,heightAt,recipe:RECIPES,setQuality,openDialog,rpgAttack,rpgFish,rpgPlant,rpgTrade,rpgCraft,rpgTick,rpgJump,rpgSail,rpgSpell,rpgNearbyTrader,findFishSpot,initRPG,cleanSave,hydrate,closeDialog}
}
try{boot()}catch(e){console.error('World initialization failed:',e);$('live-status').textContent='INITIALIZATION ERROR';$('fallback').querySelector('small').textContent='The world could not start. See browser console for details.'}
})();