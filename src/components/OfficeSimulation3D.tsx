import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AgentDefinition, TaskRecord } from '../types';

interface Props { agents: AgentDefinition[]; activeTask: TaskRecord | null; }

const SUITS=[0x21d4d8,0x5b8def,0xe8ad4b,0xec6aa9,0x9b7bea,0x35c99b,0xf06d6d,0x43b7e8];
const SKIN=[0xf1c39f,0xd9a27c,0x8f6046,0xf0c6a4,0xc98563,0xf1b98e];
const rooms=[
  ['PAPER LAB',-10,-6.4],['DOCUMENTS',-3.35,-6.4],['DPP ROOM',3.35,-6.4],['DESIGN STUDIO',10,-6.4],
  ['RESEARCH',-10,6.4],['QA ROOM',-3.35,6.4],['MEDIA LAB',3.35,6.4],['DATA / FILES',10,6.4]
] as const;

export const OfficeSimulation3D:React.FC<Props>=({agents,activeTask})=>{
 const host=useRef<HTMLDivElement>(null); const taskRef=useRef<TaskRecord|null>(activeTask); taskRef.current=activeTask;
 useEffect(()=>{
  if(!host.current)return;
  let disposed=false,raf=0; const workers:any[]=[]; let jarvis:any,boss:any;
  let dragging=false,lastX=0,lastY=0,theta=.72,phi=.92,radius=31;
  const scene=new THREE.Scene(); scene.background=new THREE.Color(0x050a10); scene.fog=new THREE.Fog(0x050a10,28,58);
  const camera=new THREE.PerspectiveCamera(43,1,.1,100); const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace;
  host.current.innerHTML=''; host.current.appendChild(renderer.domElement);

  const mat=(color:number,rough=.55,metal=.04)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
  const add=(o:any)=>{scene.add(o);return o;};
  const box=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number,rough=.55,metal=.04)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat(color,rough,metal));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return add(m);};

  add(new THREE.HemisphereLight(0xbfefff,0x080d13,2.0));
  const key=new THREE.DirectionalLight(0xffffff,3.0); key.position.set(12,24,10); key.castShadow=true; key.shadow.mapSize.set(2048,2048); key.shadow.camera.left=-25;key.shadow.camera.right=25;key.shadow.camera.top=22;key.shadow.camera.bottom=-22;add(key);
  const cyan=new THREE.PointLight(0x20d9ff,42,22);cyan.position.set(0,5,0);add(cyan);
  const purple=new THREE.PointLight(0x775cff,28,20);purple.position.set(-10,4,7);add(purple);

  const floor=box(0,-.28,0,29,.5,20,0x121d26,.78,.12); floor.receiveShadow=true;
  const inset=box(0,-.005,0,27.8,.035,18.8,0x172630,.7); inset.receiveShadow=true;
  const grid=new THREE.GridHelper(28,28,0x34515d,0x22343e);grid.position.y=.012;(grid.material as THREE.Material).transparent=true;(grid.material as THREE.Material).opacity=.22;add(grid);

  const wallMat=mat(0x1b2933,.82,.12), glass=new THREE.MeshPhysicalMaterial({color:0x66d8f5,transparent:true,opacity:.075,roughness:.16,metalness:.18});
  const wall=(x:number,y:number,z:number,sx:number,sy:number,sz:number,transparent=false)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),transparent?glass:wallMat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;add(m);return m;};
  wall(0,1.35,-9.55,29,.25,.38);wall(-14.35,1.35,0,.38,.25,19.1);wall(14.35,1.35,0,.38,.25,19.1);wall(0,1.35,9.55,29,.25,.38);
  [-6.7,0,6.7].forEach(x=>{wall(x,1.3,-4.45,.12,2.6,9.1,true);wall(x,1.3,4.45,.12,2.6,9.1,true);});

  const label=(text:string,x:number,y:number,z:number,scale=1)=>{const c=document.createElement('canvas');c.width=640;c.height=120;const ctx=c.getContext('2d')!;ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='rgba(3,9,14,.88)';ctx.roundRect(8,8,624,104,22);ctx.fill();ctx.strokeStyle='rgba(66,220,240,.24)';ctx.lineWidth=3;ctx.stroke();ctx.font='700 28px Arial';ctx.fillStyle='#c7f7fb';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,320,60);const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true,depthTest:false}));sp.scale.set(3.6*scale,.68*scale,1);sp.position.set(x,y,z);add(sp);return sp;};
  rooms.forEach(r=>label(r[0],r[1],2.85,r[2],.86));
  label('SHAHEEN AI OFFICE',0,3.35,-9.25,1.15);

  const ceilingLight=(x:number,z:number,color=0x63e8ff)=>{box(x,2.72,z,3.8,.035,.06,color,.25,.55);const l=new THREE.PointLight(color,8,7);l.position.set(x,2.55,z);add(l);};
  rooms.forEach(r=>ceilingLight(r[1],r[2]));

  const desk=(x:number,z:number,rot=0,wide=2.45)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;const top=new THREE.Mesh(new THREE.BoxGeometry(wide,.16,1.22),mat(0x4b3529,.65,.08));top.position.y=1.08;top.castShadow=true;g.add(top);[-wide*.38,wide*.38].forEach(px=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(.12,.95,.12),mat(0x202a31,.55,.3));leg.position.set(px,.53,0);leg.castShadow=true;g.add(leg);});const monitor=new THREE.Mesh(new THREE.BoxGeometry(1.18,.72,.07),mat(0x111b23,.25,.35));monitor.position.set(0,1.63,-.12);g.add(monitor);const screen=new THREE.Mesh(new THREE.PlaneGeometry(1.03,.56),new THREE.MeshBasicMaterial({color:0x07303b}));screen.position.set(0,1.63,-.16);g.add(screen);const base=new THREE.Mesh(new THREE.BoxGeometry(.18,.08,.18),mat(0x11171c,.4,.3));base.position.set(0,1.18,-.12);g.add(base);scene.add(g);return g;};
  const homes=[[-10,-5.15],[-3.35,-5.15],[3.35,-5.15],[10,-5.15],[-10,5.15],[-3.35,5.15],[3.35,5.15],[10,5.15]] as const;
  homes.forEach((p,i)=>desk(p[0],p[1],i<4?0:Math.PI));

  const person=(name:string,i:number,x:number,z:number)=>{const g=new THREE.Group();g.position.set(x,0,z);const suit=mat(SUITS[i%SUITS.length],.46,.08),skin=mat(SKIN[i%SKIN.length],.7);const body=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.72,7,14),suit);body.position.y=1.05;body.castShadow=true;g.add(body);const neck=new THREE.Mesh(new THREE.CylinderGeometry(.11,.12,.18,12),skin);neck.position.y=1.62;g.add(neck);const head=new THREE.Mesh(new THREE.SphereGeometry(.31,20,16),skin);head.position.y=1.92;head.castShadow=true;g.add(head);const hair=new THREE.Mesh(new THREE.SphereGeometry(.33,18,10,0,Math.PI*2,0,Math.PI*.38),mat(0x1c2228,.9));hair.position.y=2.04;g.add(hair);
    [-1,1].forEach(s=>{const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.58,5,8),suit);arm.position.set(s*.25,1.08,0);arm.rotation.z=-s*.18;arm.castShadow=true;g.add(arm);});[-1,1].forEach(s=>{const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.085,.55,5,8),mat(0x1a222a,.65,.12));leg.position.set(s*.115,.43,0);leg.castShadow=true;g.add(leg);});
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.46,.018,8,32),new THREE.MeshBasicMaterial({color:SUITS[i%SUITS.length],transparent:true,opacity:.72}));ring.rotation.x=Math.PI/2;ring.position.y=.035;g.add(ring);
    const plate=label(name.length>16?name.slice(0,15)+'…':name,x,2.72,z,.68);plate.scale.set(2.15,.38,1);g.userData={name,agent:agents[i],home:new THREE.Vector3(x,0,z),body,plate,busy:false,index:i,phase:i*.7};add(g);return g;};
  homes.forEach((p,i)=>{if(agents[i])workers.push(person(agents[i].name,i,p[0],p[1]));});

  const command=box(0,1.0,-1.15,3.8,.16,1.35,0x254a57,.42,.25); command.receiveShadow=true;
  jarvis=person('JARVIS',7,0,-1.85);jarvis.scale.setScalar(1.06);label('JARVIS • MANAGER',0,2.9,-1.85,1.0);
  boss=person('BOSS / CEO',6,10,7.0);boss.scale.setScalar(1.06);desk(10,7.05,Math.PI,2.8);label('YOUR COMMAND DESK',10,2.55,7.05,.86);

  // Central collaboration lounge.
  box(0,.08,1.55,3.0,.12,1.8,0x263844,.7);box(0,.32,1.55,2.2,.5,1.25,0x18242c,.8);label('BREAK AREA',0,1.22,1.55,.72);
  const mug=new THREE.Mesh(new THREE.CylinderGeometry(.16,.19,.28,16),mat(0xc9a06a,.5));mug.position.set(.62,.76,1.55);add(mug);
  const plant=(x:number,z:number)=>{const pot=new THREE.Mesh(new THREE.CylinderGeometry(.22,.28,.35,14),mat(0x5c4638,.75));pot.position.set(x,.2,z);add(pot);for(let k=0;k<5;k++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.22,10,8),mat(0x1c795d,.72));leaf.scale.set(.55,1.35,.45);leaf.position.set(x+(k-2)*.12,.62+Math.abs(k-2)*.03,z+(k%2?.1:-.05));add(leaf);}};
  plant(-12.9,-7.9);plant(12.9,-7.9);plant(-12.9,7.9);plant(12.9,7.9);

  // Server/data rack details make the DATA / FILES room feel distinct.
  for(let k=0;k<3;k++){const rack=box(9.1+k*.65,1.05,5.95, .48,1.8,1.1,0x17232c,.4,.45);for(let j=0;j<4;j++)box(9.1+k*.65,0.55+j*.3,5.35,.28,.035,.025,0x27d7e5,.25,.5);}

  const resize=()=>{if(!host.current)return;const w=host.current.clientWidth,h=host.current.clientHeight||620;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};resize();window.addEventListener('resize',resize);
  const onDown=(e:PointerEvent)=>{dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId);};const onUp=()=>dragging=false;const onMove=(e:PointerEvent)=>{if(!dragging)return;theta-=(e.clientX-lastX)*.007;phi=Math.max(.48,Math.min(1.35,phi+(e.clientY-lastY)*.005));lastX=e.clientX;lastY=e.clientY;};const onWheel=(e:WheelEvent)=>{radius=Math.max(20,Math.min(40,radius+e.deltaY*.018));};renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointerup',onUp);renderer.domElement.addEventListener('pointerleave',onUp);renderer.domElement.addEventListener('pointermove',onMove);renderer.domElement.addEventListener('wheel',onWheel,{passive:true});
  let lastTask=''; const route=(g:any,target:THREE.Vector3)=>{g.userData.target=target.clone();g.userData.busy=true;};
  const tick=(time:number)=>{if(disposed)return;raf=requestAnimationFrame(tick);const task=taskRef.current;if(task?.id&&task.id!==lastTask){lastTask=task.id;const idx=Math.max(0,workers.findIndex(w=>w.userData.name===task.agentName||w.userData.agent?.name===task.agentName));const w=workers[idx];if(w)route(w,new THREE.Vector3(0,0,-1.85));}
    workers.forEach((g:any,i:number)=>{const u=g.userData,target=u.target;if(target){const dx=target.x-g.position.x,dz=target.z-g.position.z,dist=Math.hypot(dx,dz);if(dist>.13){g.position.x+=dx*.038;g.position.z+=dz*.038;g.rotation.y=Math.atan2(dx,dz);}else if(u.busy&&taskRef.current){u.target=u.home.clone();u.busy=false;}else if(Math.sin(time*.00035+i)>0.985&&!u.busy){u.target=new THREE.Vector3(u.home.x+(Math.random()-.5)*1.0,0,u.home.z+(Math.random()-.5)*.65);}u.body.position.y=1.05+Math.sin(time*.009+i)*.018;}u.plate.position.set(g.position.x,2.72,g.position.z);});
    if(jarvis){jarvis.position.y=.055+Math.sin(time*.0015)*.025;}if(boss)boss.position.y=.015+Math.sin(time*.0012)*.015;
    camera.position.set(Math.sin(theta)*radius*Math.sin(phi),radius*Math.cos(phi),Math.cos(theta)*radius*Math.sin(phi));camera.lookAt(0,.45,0);renderer.render(scene,camera);
  };tick(performance.now());
  return()=>{disposed=true;cancelAnimationFrame(raf);window.removeEventListener('resize',resize);renderer.domElement.removeEventListener('pointerdown',onDown);renderer.domElement.removeEventListener('pointerup',onUp);renderer.domElement.removeEventListener('pointerleave',onUp);renderer.domElement.removeEventListener('pointermove',onMove);renderer.domElement.removeEventListener('wheel',onWheel);renderer.dispose();scene.traverse((o:any)=>{o.geometry?.dispose?.();if(o.material){if(Array.isArray(o.material))o.material.forEach((m:any)=>m.dispose?.());else o.material.dispose?.();}});if(host.current)host.current.innerHTML='';};
 },[agents]);
 return <div className="relative w-full overflow-hidden rounded-[26px] border border-cyan-300/15 bg-[#050a10] shadow-[0_30px_100px_rgba(0,0,0,.55)]"><div className="pointer-events-none absolute left-4 top-4 z-10 rounded-xl border border-cyan-300/20 bg-[#071017]/90 px-3 py-2 text-[10px] font-bold tracking-[.12em] text-cyan-100 backdrop-blur">3D AI OFFICE · LIVE</div><div className="pointer-events-none absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[9px] text-slate-400 backdrop-blur">LIVE WORKPLACE</div><div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-lg border border-white/5 bg-black/45 px-2.5 py-1.5 text-[9px] text-slate-300 backdrop-blur">Drag = rotate · Wheel = zoom · Missions move employees</div><div ref={host} className="h-[620px] w-full"/></div>;
};
export default OfficeSimulation3D;
