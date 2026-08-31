import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AgentDefinition, TaskRecord } from '../types';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface Props { agents: AgentDefinition[]; activeTask: TaskRecord | null; }

const SUITS=[0x1ccbd0,0x4f7fe8,0xdca64a,0xe36aa8,0x9078dc,0x36b98b,0xd96666,0x45a9d8];
const SKIN=[0xf2c7a5,0xd9a27b,0x8c6247,0xefc09e,0xc88764,0xf0b58e];
const HAIR=[0x1d2024,0x30251f,0x151719,0x3a2922,0x25282d];
const ROOMS=[
  ['PAPER LAB',-10,-6.25],['DOCUMENTS',-3.35,-6.25],['DPP ROOM',3.35,-6.25],['DESIGN STUDIO',10,-6.25],
  ['RESEARCH',-10,6.25],['QA ROOM',-3.35,6.25],['MEDIA LAB',3.35,6.25],['DATA / FILES',10,6.25]
] as const;
const HOMES=[[-10,-5.0],[-3.35,-5.0],[3.35,-5.0],[10,-5.0],[-10,5.0],[-3.35,5.0],[3.35,5.0],[10,5.0]] as const;

export const OfficeSimulation3D:React.FC<Props>=({agents,activeTask})=>{
 const host=useRef<HTMLDivElement>(null); const taskRef=useRef<TaskRecord|null>(activeTask); taskRef.current=activeTask;
 useEffect(()=>{
  if(!host.current)return;
  let disposed=false,raf=0; const workers:any[]=[]; let jarvis:any,boss:any;
  const scene=new THREE.Scene(); scene.background=new THREE.Color(0x071017); scene.fog=new THREE.FogExp2(0x071017,.020);
  const camera=new THREE.PerspectiveCamera(42,1,.05,120); camera.position.set(18,19,20);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.12;
  renderer.physicallyCorrectLights=true; host.current.innerHTML=''; host.current.appendChild(renderer.domElement);
  const composer=new EffectComposer(renderer); composer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(900,600),.20,.62,.84); composer.addPass(bloom);
  const controls=new OrbitControls(camera,renderer.domElement); controls.target.set(0,.55,0); controls.enableDamping=true; controls.dampingFactor=.065; controls.minDistance=15; controls.maxDistance=36; controls.maxPolarAngle=1.39; controls.minPolarAngle=.48; controls.enablePan=true; controls.panSpeed=.35; controls.rotateSpeed=.38; controls.zoomSpeed=.65;

  const pmrem=new THREE.PMREMGenerator(renderer); const env=new RoomEnvironment(); const envTex=pmrem.fromScene(env,0.04).texture; scene.environment=envTex; env.dispose(); pmrem.dispose();
  const mat=(color:number,rough=.5,metal=.05,emissive?:number,ei=0)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,emissive:emissive??0,emissiveIntensity:ei});
  const add=<T extends THREE.Object3D>(o:T)=>{scene.add(o);return o;};
  const box=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number,rough=.5,metal=.05)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat(color,rough,metal));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return add(m);};
  const cyl=(x:number,y:number,z:number,r:number,h:number,color:number,rough=.5)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,20),mat(color,rough,.05));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return add(m);};

  add(new THREE.HemisphereLight(0xd7f5ff,0x111820,1.65));
  const key=new THREE.DirectionalLight(0xfff8ed,3.6); key.position.set(-8,25,12); key.castShadow=true; key.shadow.mapSize.set(3072,3072); key.shadow.camera.left=-25;key.shadow.camera.right=25;key.shadow.camera.top=24;key.shadow.camera.bottom=-24;key.shadow.bias=-.0004;add(key);
  const fill=new THREE.DirectionalLight(0x8fdcff,1.15); fill.position.set(18,10,-18);add(fill);
  const cyan=new THREE.PointLight(0x21d8ff,80,24,2); cyan.position.set(0,5.5,0);add(cyan);
  const violet=new THREE.PointLight(0x775cff,55,18,2); violet.position.set(-10,4,7);add(violet);

  box(0,-.3,0,30,.55,20,0x101a21,.82,.12);
  box(0,-.015,0,29.1,.04,19.1,0x1a2830,.72,.1);
  const floorGrid=new THREE.GridHelper(29,58,0x3a5c67,0x253a43); floorGrid.position.y=.015; (floorGrid.material as THREE.Material).transparent=true; (floorGrid.material as THREE.Material).opacity=.12; add(floorGrid);

  const glass=new THREE.MeshPhysicalMaterial({color:0x8adff2,transparent:true,opacity:.11,roughness:.1,metalness:.08,transmission:.18,thickness:.08});
  const darkWall=mat(0x1a2831,.78,.18);
  const wall=(x:number,y:number,z:number,sx:number,sy:number,sz:number,transparent=false)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),transparent?glass:darkWall);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;add(m);return m;};
  wall(0,1.35,-9.55,30,.28,.42);wall(-14.65,1.35,0,.42,2.7,19.2);wall(14.65,1.35,0,.42,2.7,19.2);wall(0,1.35,9.55,30,.28,.42);
  [-6.7,0,6.7].forEach(x=>{wall(x,1.38,-4.42,.09,2.72,9.0,true);wall(x,1.38,4.42,.09,2.72,9.0,true);});
  [-6.7,0,6.7].forEach(x=>{box(x,1.38,-4.42,.045,2.72,9.0,0x6ed7e8,.28,.35);box(x,1.38,4.42,.045,2.72,9.0,0x6ed7e8,.28,.35);});
  [-13.8,13.8].forEach(x=>{for(let z=-7;z<=7;z+=3.5)box(x,1.45,z,.04,2.5,.025,0x4dd7eb,.22,.5);});

  const textSprite=(text:string,x:number,y:number,z:number,scale=1,accent=false)=>{const c=document.createElement('canvas');c.width=900;c.height=160;const ctx=c.getContext('2d')!;ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='rgba(3,10,15,.90)';ctx.roundRect(8,8,884,144,26);ctx.fill();ctx.strokeStyle=accent?'rgba(46,225,243,.72)':'rgba(112,155,169,.25)';ctx.lineWidth=4;ctx.stroke();ctx.font='700 34px Arial';ctx.fillStyle='#e8fbff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,450,80);const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true,depthTest:false}));s.scale.set(3.4*scale,.61*scale,1);s.position.set(x,y,z);add(s);return s;};
  ROOMS.forEach(r=>textSprite(r[0],r[1],2.72,r[2],.74));
  textSprite('SHAHEEN AI OFFICE',0,3.28,-9.25,1.05,true);

  const ceiling=(x:number,z:number)=>{box(x,2.72,z,3.8,.055,.18,0x27363e,.25,.55);box(x,2.69,z,3.2,.025,.025,0x43e6f4,.18,.6);const l=new THREE.PointLight(0xe8fbff,8.5,6,2);l.position.set(x,2.52,z);add(l);};
  ROOMS.forEach(r=>ceiling(r[1],r[2]));
  for(let i=-2;i<=2;i++){box(i*5.2,1.6,-9.32,4.5,2.05,.04,0x102c38,.12,.25);const glow=box(i*5.2,1.6,-9.30,4.1,1.65,.025,0x123e4d,.2,.18);(glow.material as THREE.MeshStandardMaterial).emissive.setHex(0x0a2732);}

  const desk=(x:number,z:number,rot=0,width=2.5)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;const wood=mat(0x604432,.52,.08);const metal=mat(0x26323a,.35,.58);const top=new THREE.Mesh(new THREE.BoxGeometry(width,.15,1.2),wood);top.position.y=1.02;top.castShadow=true;g.add(top);[-width*.38,width*.38].forEach(px=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(.105,.92,.105),metal);leg.position.set(px,.5,0);leg.castShadow=true;g.add(leg);});const monitor=new THREE.Mesh(new THREE.BoxGeometry(1.25,.78,.075),metal);monitor.position.set(0,1.62,-.14);g.add(monitor);const screen=new THREE.Mesh(new THREE.PlaneGeometry(1.08,.59),new THREE.MeshStandardMaterial({color:0x07313a,roughness:.22,metalness:.3,emissive:0x05242c,emissiveIntensity:1.2}));screen.position.set(0,1.62,-.185);g.add(screen);const stand=new THREE.Mesh(new THREE.BoxGeometry(.14,.35,.12),metal);stand.position.set(0,1.27,-.13);g.add(stand);const keyboard=new THREE.Mesh(new THREE.BoxGeometry(.82,.035,.32),mat(0x9ba5aa,.38,.15));keyboard.position.set(0,1.13,.22);g.add(keyboard);const chair=new THREE.Group();const seat=new THREE.Mesh(new THREE.BoxGeometry(.9,.16,.9),mat(0x263d47,.55,.12));seat.position.y=.58;seat.castShadow=true;chair.add(seat);const back=new THREE.Mesh(new THREE.BoxGeometry(.82,1.0,.13),mat(0x263d47,.55,.12));back.position.set(0,1.05,.42);back.castShadow=true;chair.add(back);const stem=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.55,10),metal);stem.position.y=.27;chair.add(stem);chair.position.z=.82;g.add(chair);add(g);return g;};
  HOMES.forEach((p,i)=>desk(p[0],p[1],i<4?0:Math.PI));
  desk(0,-1.25,0,3.8);desk(10,7.0,Math.PI,2.9);

  const keyboardGlow=(x:number,z:number)=>{for(let i=0;i<8;i++){const k=box(x-.35+i*.1,1.15,z+.22,.055,.012,.025,0x30e5f2,.2,.45);(k.material as THREE.MeshStandardMaterial).emissive.setHex(0x20cfe0);(k.material as THREE.MeshStandardMaterial).emissiveIntensity=.8;}};
  HOMES.forEach(p=>keyboardGlow(p[0],p[1]));

  const chairPerson=(name:string,i:number,x:number,z:number)=>{
    const g=new THREE.Group();g.position.set(x,0,z); const suit=mat(SUITS[i%SUITS.length],.38,.16),skin=mat(SKIN[i%SKIN.length],.62,.02),hairMat=mat(HAIR[i%HAIR.length],.9,.02);
    const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.32,.68,8,16),suit);torso.position.y=1.05;torso.castShadow=true;g.add(torso);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.105,.12,.18,12),skin);neck.position.y=1.59;g.add(neck);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.305,24,18),skin);head.position.y=1.9;head.castShadow=true;g.add(head);
    const hair=new THREE.Mesh(new THREE.SphereGeometry(.325,22,12,0,Math.PI*2,0,Math.PI*.43),hairMat);hair.position.y=2.03;g.add(hair);
    const eyeMat=new THREE.MeshStandardMaterial({color:0x11171b,roughness:.3,metalness:.1});[-1,1].forEach(s=>{const eye=new THREE.Mesh(new THREE.SphereGeometry(.026,8,8),eyeMat);eye.position.set(s*.105,1.91,-.285);g.add(eye);});
    const arms:any[]=[];[-1,1].forEach(s=>{const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.073,.54,6,10),suit);arm.position.set(s*.25,1.03,.08);arm.rotation.z=-s*.18;arm.castShadow=true;g.add(arm);arms.push(arm);});
    [-1,1].forEach(s=>{const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.082,.52,6,10),mat(0x1a232a,.52,.22));leg.position.set(s*.11,.43,.02);leg.castShadow=true;g.add(leg);});
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.44,.016,8,32),new THREE.MeshBasicMaterial({color:SUITS[i%SUITS.length],transparent:true,opacity:.75}));ring.rotation.x=Math.PI/2;ring.position.y=.035;g.add(ring);
    const plate=textSprite(name.length>18?name.slice(0,17)+'…':name,x,2.68,z,.57);plate.scale.set(2.05,.35,1);
    g.userData={name,agent:agents[i],home:new THREE.Vector3(x,0,z),torso,arms,plate,ring,busy:false,index:i,phase:i*.77,workTime:Math.random()*5};add(g);return g;
  };
  HOMES.forEach((p,i)=>{if(agents[i])workers.push(chairPerson(agents[i].name,i,p[0],p[1]));});
  jarvis=chairPerson('JARVIS',7,0,-1.8);jarvis.scale.setScalar(1.13);textSprite('JARVIS • MANAGER',0,2.98,-1.8,1.0,true);
  boss=chairPerson('BOSS / CEO',6,10,6.95);boss.scale.setScalar(1.1);textSprite('YOUR COMMAND DESK',10,2.55,7.0,.82,true);

  box(0,.08,1.55,3.1,.14,1.7,0x283943,.66,.1);box(0,.42,1.55,2.35,.62,1.15,0x1c2930,.76,.04);cyl(.0,.86,1.55,.62,.1,0x4b3528,.5);cyl(0,.49,1.55,.06,.7,0x303b42,.42);
  for(const dx of [-.55,.55]){const cup=cyl(dx,.94,1.55,.13,.22,0xc9a46d,.4);const handle=new THREE.Mesh(new THREE.TorusGeometry(.075,.025,8,16),mat(0xc9a46d,.4));handle.rotation.y=Math.PI/2;handle.position.set(dx+.13,.94,1.55);add(handle);}
  textSprite('COFFEE • BREAK LOUNGE',0,1.45,1.55,.68);
  const plant=(x:number,z:number)=>{cyl(x,.22,z,.27,.42,0x5b4336,.76);for(let k=0;k<7;k++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.2,12,10),mat(0x267e5b,.7,.02));leaf.scale.set(.55,1.6,.42);leaf.position.set(x+(k-3)*.13,.68+(k%2)*.06,z+(k%3-.9)*.12);leaf.castShadow=true;add(leaf);}};
  plant(-12.9,-7.8);plant(12.9,-7.8);plant(-12.9,7.8);plant(12.9,7.8);

  for(let k=0;k<3;k++){const rack=box(8.95+k*.72,1.0,5.75,.5,1.75,1.05,0x17232a,.28,.72);for(let j=0;j<5;j++){const led=box(8.95+k*.72,.52+j*.27,5.19,.25,.025,.025,0x22d9e8,.18,.5);(led.material as THREE.MeshStandardMaterial).emissive.setHex(0x22d9e8);(led.material as THREE.MeshStandardMaterial).emissiveIntensity=1.4;}}

  const clock=new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,.08,32),mat(0x18242c,.25,.55));clock.rotation.x=Math.PI/2;clock.position.set(-11.9,2.25,-9.3);add(clock);for(let a=0;a<12;a++){const tick=new THREE.Mesh(new THREE.BoxGeometry(.025,.12,.025),mat(0x8aeaf4,.25,.35));tick.position.set(-11.9+Math.sin(a*Math.PI/6)*.45,2.25+Math.cos(a*Math.PI/6)*.45,-9.38);add(tick);}
  textSprite('JARVIS AI • LIVE FLOOR',0,2.55,9.28,.72,true);

  const resize=()=>{if(!host.current)return;const w=host.current.clientWidth,h=Math.max(560,host.current.clientHeight||650);renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};resize();window.addEventListener('resize',resize);
  let lastTask='';
  const route=(g:any,target:THREE.Vector3)=>{g.userData.target=target.clone();g.userData.busy=true;};
  const animate=(time:number)=>{if(disposed)return;raf=requestAnimationFrame(animate);const t=time*.001;const task=taskRef.current;
    if(task?.id&&task.id!==lastTask){lastTask=task.id;const idx=workers.findIndex(w=>w.userData.name===task.agentName||w.userData.agent?.name===task.agentName);if(idx>=0)route(workers[idx],new THREE.Vector3(0,0,-1.8));}
    workers.forEach((g:any,i:number)=>{const u=g.userData;let typing=false;const target=u.target;
      if(target){const dx=target.x-g.position.x,dz=target.z-g.position.z,dist=Math.hypot(dx,dz);if(dist>.14){g.position.x+=dx*.032;g.position.z+=dz*.032;g.rotation.y=Math.atan2(dx,dz);typing=false;}else if(u.busy&&taskRef.current){u.target=u.home.clone();u.busy=false;}else if(Math.sin(t*.33+i)>0.985&&!u.busy){u.target=new THREE.Vector3(u.home.x+(Math.random()-.5)*1.15,0,u.home.z+(Math.random()-.5)*.65);}}
      else typing=true;
      if(typing){u.torso.rotation.x=.025+Math.sin(t*4+i)*.012;u.arms[0].rotation.z=-.32+Math.sin(t*8+i)*.055;u.arms[1].rotation.z=.32-Math.sin(t*8+i)*.055;}
      else {u.torso.rotation.x=0;u.arms[0].rotation.z=-.18;u.arms[1].rotation.z=.18;}
      u.ring.rotation.z=t*.35;u.plate.position.set(g.position.x,2.68,g.position.z);
    });
    if(jarvis)jarvis.position.y=.055+Math.sin(t*1.5)*.018;if(boss)boss.position.y=.018+Math.sin(t*1.2)*.012;
    controls.update(); composer.render();
  };
  animate(performance.now());
  return()=>{disposed=true;cancelAnimationFrame(raf);window.removeEventListener('resize',resize);controls.dispose();composer.dispose();renderer.dispose();scene.traverse((o:any)=>{o.geometry?.dispose?.();if(o.material){if(Array.isArray(o.material))o.material.forEach((m:any)=>m.dispose?.());else o.material.dispose?.();}});envTex.dispose();if(host.current)host.current.innerHTML='';};
 },[agents]);
 return <div className="relative w-full overflow-hidden rounded-[26px] border border-cyan-300/15 bg-[#071017] shadow-[0_35px_120px_rgba(0,0,0,.65)]"><div className="pointer-events-none absolute left-4 top-4 z-10 rounded-xl border border-cyan-300/25 bg-[#071017]/85 px-3 py-2 text-[10px] font-bold tracking-[.12em] text-cyan-100 backdrop-blur">3D AI OFFICE · LIVE · HD · MINIATURE</div><div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-lg bg-black/45 px-2 py-1 text-[9px] text-slate-300">Drag = rotate · Wheel = zoom · Right drag = pan · Missions move employees</div><div ref={host} className="h-[620px] w-full"/></div>;
};
export default OfficeSimulation3D;