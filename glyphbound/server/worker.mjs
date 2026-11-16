// GLYPHBOUND guest-room service for Cloudflare Workers + Durable Objects (SQLite-backed).
// Room membership, poses, chat, and shared structures only. Not a trusted-authoritative game server.
// Deployment substitutes the exact __GLYPHBOUND_HTML__ token with JSON-encoded self-contained HTML.
const HTML = __GLYPHBOUND_HTML__;
const ROOM_RE=/^[a-z0-9-]{1,24}$/;
const BUILD_TYPES=new Set(['campfire','workbench','floor','wall','roof','farmplot','dock','lantern']);
const CORS_HEADERS={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=()'};
function pose(v){if(!v||typeof v!=='object')return null;const x=+v.x,z=+v.z,yaw=+v.yaw;if(![x,z,yaw].every(Number.isFinite)||x<2||x>262||z<2||z>262)return null;return {x:+x.toFixed(2),z:+z.toFixed(2),yaw:+yaw.toFixed(2)}}
function structure(v){if(!v||typeof v!=='object'||!BUILD_TYPES.has(v.type)||typeof v.id!=='string'||!/^[a-zA-Z0-9-]{1,70}$/.test(v.id))return null;const x=+v.x,z=+v.z,rotation=+v.rotation||0;if(!Number.isFinite(x)||!Number.isFinite(z)||x<2||x>262||z<2||z>262||!Number.isFinite(rotation))return null;return {id:v.id,type:v.type,x:+x.toFixed(1),z:+z.toFixed(1),rotation:Math.floor(rotation)%4}}
function name(v){return String(v??'').replace(/[^a-zA-Z0-9 _-]/g,'').trim().slice(0,22)||'Wanderer'}
export class WorldRoom{
  constructor(state,env){this.state=state;this.env=env;this.lastMessage=new WeakMap()}
  async fetch(req){if(req.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
    const clients=this.state.getWebSockets();if(clients.length>=16)return new Response('Room full',{status:429});
    const pair=new WebSocketPair(),[client,server]=Object.values(pair);
    const id=crypto.randomUUID().slice(0,12),clientName='Wanderer-'+id.slice(0,4);
    this.state.acceptWebSocket(server);server.serializeAttachment({id,name:clientName,pose:null});
    const peers=clients.map(ws=>ws.deserializeAttachment?.()).filter(a=>a?.id).map(a=>({id:a.id,name:a.name,pose:a.pose}));
    let builds=await this.state.storage.get('builds');if(!Array.isArray(builds))builds=[];
    server.send(JSON.stringify({type:'welcome',id,peers,builds,seed:91627}));
    this.broadcast({type:'join',id,name:clientName},server);
    return new Response(null,{status:101,webSocket:client});
  }
  broadcast(msg,except){const text=JSON.stringify(msg);for(const ws of this.state.getWebSockets())if(ws!==except)try{ws.send(text)}catch{}}
  async webSocketMessage(ws,message){if(typeof message!=='string'||message.length>2000)return;let msg;try{msg=JSON.parse(message)}catch{return}
    const attachment=ws.deserializeAttachment?.();if(!attachment?.id)return;
    const now=Date.now(),last=this.lastMessage.get(ws)||0;if(now-last<70)return;this.lastMessage.set(ws,now);
    if(msg.type==='hello'){attachment.name=name(msg.name);ws.serializeAttachment(attachment);this.broadcast({type:'join',id:attachment.id,name:attachment.name},ws);return}
    if(msg.type==='pose'){const p=pose(msg);if(!p)return;attachment.pose=p;ws.serializeAttachment(attachment);this.broadcast({type:'pose',id:attachment.id,name:attachment.name,...p},ws);return}
    if(msg.type==='chat'){const message=String(msg.text||'').replace(/[<>\x00-\x1F]/g,'').trim().slice(0,140);if(message)this.broadcast({type:'chat',id:attachment.id,name:attachment.name,text:message,at:now});return}
    if(msg.type==='build'){const b=structure(msg.structure);if(!b)return;let builds=await this.state.storage.get('builds');if(!Array.isArray(builds))builds=[];
      if(builds.length>=350||builds.some(s=>s.id===b.id))return;builds.push(b);await this.state.storage.put('builds',builds);this.broadcast({type:'build',structure:b});return}
  }
  webSocketClose(ws){const a=ws.deserializeAttachment?.();if(a?.id)this.broadcast({type:'leave',id:a.id},ws)}
  webSocketError(ws){const a=ws.deserializeAttachment?.();if(a?.id)this.broadcast({type:'leave',id:a.id},ws)}
}
export default {async fetch(req,env){const url=new URL(req.url);if(url.pathname==='/health')return new Response(JSON.stringify({ok:true,mode:'guest-coop',engine:'glyphbound-original-js',build:'0.7',authoritative:false}),{headers:{'Content-Type':'application/json',...CORS_HEADERS}});
  if(url.pathname==='/'||url.pathname==='/index.html')return new Response(HTML,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public,max-age=60',...CORS_HEADERS}});
  const match=/^\/api\/rooms\/([a-z0-9-]{1,24})$/.exec(url.pathname);
  if(match){if(!ROOM_RE.test(match[1]))return new Response('Invalid room',{status:400});if(req.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});const room=env.ROOMS.idFromName('glyphbound:'+match[1]);return env.ROOMS.get(room).fetch(req)}
  return new Response('Not found',{status:404,headers:CORS_HEADERS});
}}