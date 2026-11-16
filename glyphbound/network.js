/* GLYPHBOUND guest co-op client. Optional: standalone game remains fully playable offline. */
(function(){'use strict';
  const saneRoom=s=>String(s||'').toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,24);
  const saneName=s=>String(s||'').replace(/[^a-zA-Z0-9 _-]/g,'').trim().slice(0,22);
  const net={room:'',name:'Wanderer',id:'',status:'offline',peers:new Map(),builds:new Map(),messages:[],socket:null,onChange:null,seconds:0,reason:'',_lastPose:''};
  function emit(){if(typeof net.onChange==='function')net.onChange()}
  function send(type,data={}){if(!net.socket||net.socket.readyState!==WebSocket.OPEN)return false;net.socket.send(JSON.stringify({type,...data}));return true}
  net.send=send;
  net.sendBuild=s=>{if(!s||!s.id)return false;return send('build',{structure:{id:s.id,type:s.type,x:s.x,z:s.z,rotation:s.rotation||0}})};
  net.disconnect=()=>{const old=net.socket;net.socket=null;if(old)old.close(1000,'Leave room');net.status='offline';net.room='';net.peers.clear();net.builds.clear();net.id='';emit()};
  net.connect=(room,name)=>{
    room=saneRoom(room);name=saneName(name)||'Wanderer';
    if(!room){net.reason='Enter a room code.';emit();return false}
    if(!/^https?:$/.test(location.protocol)){net.reason='Open the hosted game to play online. The HTML download remains offline-only.';emit();return false}
    if(net.socket)net.disconnect();net.room=room;net.name=name;net.status='connecting';net.reason='';net.peers.clear();net.builds.clear();net.messages=[];
    const proto=location.protocol==='https:'?'wss:':'ws:';
    const url=`${proto}//${location.host}/api/rooms/${encodeURIComponent(room)}`;
    let ws;try{ws=new WebSocket(url)}catch(e){net.status='offline';net.reason='Could not create connection';emit();return false}
    net.socket=ws;try{localStorage.setItem('glyphbound_guest_name',name)}catch{}
    ws.onopen=()=>{if(net.socket!==ws)return;net.status='online';send('hello',{name});emit()};
    ws.onmessage=e=>{if(net.socket!==ws||typeof e.data!=='string'||e.data.length>40000)return;
      let m;try{m=JSON.parse(e.data)}catch{return}
      if(!m||typeof m!=='object')return;
      if(m.type==='welcome'){
        net.id=String(m.id||'');net.peers.clear();net.builds.clear();
        for(const p of Array.isArray(m.peers)?m.peers:[])setPeer(p);
        for(const s of Array.isArray(m.builds)?m.builds:[])setBuild(s);
      } else if(m.type==='join'){if(m.id!==net.id)setPeer(m)}
      else if(m.type==='pose'){if(m.id!==net.id)setPeer(m)}
      else if(m.type==='leave'){net.peers.delete(String(m.id||''))}
      else if(m.type==='build'){setBuild(m.structure)}
      else if(m.type==='chat'){
        net.messages.push({name:saneName(m.name)||'Wanderer',text:String(m.text||'').slice(0,140)});
        if(net.messages.length>30)net.messages.shift();
      }
      emit();
    };
    ws.onclose=()=>{if(net.socket!==ws)return;net.socket=null;net.status='offline';net.reason='Connection closed. Rejoin to continue.';net.peers.clear();net.builds.clear();emit()};
    ws.onerror=()=>{if(net.socket!==ws)return;net.reason='Connection unavailable. Check the server and try again.';emit()};
    emit();return true;
  };
  function setPeer(p){if(!p||typeof p.id!=='string'||p.id===net.id||p.id.length>64)return;const pose=p.pose||p;const x=Number(pose.x),z=Number(pose.z),yaw=Number(pose.yaw);const prev=net.peers.get(p.id)||{};
    net.peers.set(p.id,{id:p.id,name:saneName(p.name)||prev.name||'Wanderer',x:Number.isFinite(x)?Math.max(2,Math.min(262,x)):prev.x,z:Number.isFinite(z)?Math.max(2,Math.min(262,z)):prev.z,yaw:Number.isFinite(yaw)?yaw:prev.yaw||0});}
  function setBuild(s){if(!s||typeof s.id!=='string'||s.id.length>70||!['campfire','workbench','floor','wall','roof','farmplot','dock','lantern'].includes(s.type))return;const x=Number(s.x),z=Number(s.z);if(!Number.isFinite(x)||!Number.isFinite(z)||x<2||x>262||z<2||z>262)return;net.builds.set(s.id,{id:s.id,type:s.type,x,z,rotation:(Number(s.rotation)||0)%4})}
  net.tick=(dt,state)=>{net.seconds+=dt;if(net.status!=='online'||net.seconds<.16)return;net.seconds=0;const p={x:+state.x.toFixed(2),z:+state.z.toFixed(2),yaw:+state.yaw.toFixed(2)};const next=JSON.stringify(p);if(next!==net._lastPose){send('pose',p);net._lastPose=next}};
  net.sendChat=t=>{t=String(t||'').replace(/[<>\x00-\x1f]/g,'').trim().slice(0,140);return t?send('chat',{text:t}):false};
  net.shareUrl=()=>{const u=new URL(location.href);u.searchParams.set('room',net.room);return u.toString()};
  try{net.name=saneName(localStorage.getItem('glyphbound_guest_name'))||'Wanderer'}catch{}
  window.GLYPH_NET=net;
})();