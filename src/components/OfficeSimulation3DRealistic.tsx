import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {AgentDefinition,TaskRecord} from '../types';
interface Props{agents:AgentDefinition[];activeTask:TaskRecord|null}

/** Premium procedural miniature office. Pure Three.js geometry; no generated image/background. */
export const OfficeSimulation3DRealistic:React.FC<Props>=({agents,activeTask})=>{
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const el=host.current;if(!el)return;let raf=0,dead=false;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x071015);scene.fog=new THREE.Fog(0x071015,27,50);
  const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(15.5,12.5,18.5);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.55));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;el.replaceChildren(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.25,0);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=10;controls.maxDistance=28;controls.minPolarAngle=.52;controls.maxPolarAngle=1.36;controls.rotateSpeed=.4;controls.zoomSpeed=.7;
  const root=new THREE.Group();scene.add(root);
  const M=(c:number,r=.5,m=.05,e?:number)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m,emissive:e??0,emissiveIntensity:e?1.25:0});
  const box=(x:number,y:number,z:number,sx:number,sy:number,sz:number,ma:THREE.Material,cast=true,parent=root)=>{const q=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),ma);q.position.set(x,y,z);q.castShadow=cast;q.receiveShadow=true;parent.add(q);return q};
  const rbox=(x:number,y:number,z:number,sx:number,sy:number,sz:number,r:number,ma:THREE.Material,cast=true,parent=root)=>{const q=new THREE.Mesh(new RoundedBoxGeometry(sx,sy,sz,3,r),ma);q.position.set(x,y,z);q.castShadow=cast;q.receiveShadow=true;parent.add(q);return q};
  const cyl=(x:number,y:number,z:number,r:number,h:number,ma:THREE.Material,parent=root)=>{const q=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,20),ma);q.position.set(x,y,z);q.castShadow=true;q.receiveShadow=true;parent.add(q);return q};
  const sphere=(x:number,y:number,z:number,r:number,ma:THREE.Material,parent=root)=>{const q=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),ma);q.position.set(x,y,z);q.castShadow=true;q.receiveShadow=true;parent.add(q);return q};

  // Miniature architectural shell.
  const concrete=M(0x1d272b,.82,.14),floor=M(0x4b4945,.72,.1),grout=M(0x252b2e,.82,.02),wall=M(0x18252a,.72,.2),dark=M(0x0d1519,.32,.72),trim=M(0x718b90,.3,.62);
  box(0,-.48,0,25.8,.8,16.8,concrete);rbox(0,-.055,0,24.9,.12,15.9,.025,floor,false);
  for(let x=-12;x<=12;x+=2)box(x,.02,0,.018,.018,15.7,grout,false);for(let z=-7;z<=7;z+=2)box(0,.021,z,24.5,.018,.018,grout,false);
  box(0,3.45,-7.92,25.4,.42,.5,wall);box(-12.65,3.45,0,.5,7.5,16.1,wall);box(12.65,3.45,0,.5,7.5,16.1,wall);

  // Full-height rear windows, mullions and subtle cyan glass reflections.
  const frame=M(0x101a1e,.24,.82),glassWin=new THREE.MeshPhysicalMaterial({color:0x65b7c7,transparent:true,opacity:.18,roughness:.05,metalness:.22,transmission:.42,thickness:.07});
  for(let x=-10;x<=10;x+=5){box(x,3.35,-7.61,4.55,3.0,.08,glassWin,false);box(x,4.85,-7.67,4.7,.09,.13,frame);box(x,1.85,-7.67,4.7,.09,.13,frame);box(x-2.28,3.35,-7.67,.08,3.1,.13,frame);box(x+2.28,3.35,-7.67,.08,3.1,.13,frame)}
  box(0,5.12,-7.68,24.7,.13,.16,trim);

  // Glass offices / meeting bays with real rails and handles.
  const glass=new THREE.MeshPhysicalMaterial({color:0x86dce5,transparent:true,opacity:.12,roughness:.06,metalness:.18,transmission:.38,thickness:.06});const rail=M(0x6d8589,.23,.78),handle=M(0xc7d2d0,.16,.86);
  [-6,0,6].forEach(x=>{for(const z of [-3.55,3.55]){box(x,1.72,z,.055,3.45,7.15,glass,false);box(x,1.72,z,.075,3.52,7.2,rail,false);box(x,3.48,z,.10,.08,7.25,trim,false)}cyl(x+.17,1.62,-.12,.032,.65,handle)});

  // Ceiling architecture: acoustic panels, beams and warm miniature practicals.
  const ceiling=M(0x151e22,.7,.18),warm=M(0xffd8a0,.2,.2,0xffa34b);for(let x=-9;x<=9;x+=6){rbox(x,5.72,0,4.5,.14,.2,.025,trim,false);rbox(x,5.55,0,3.25,.07,1.15,.025,ceiling,false);rbox(x,5.49,0,2.45,.035,.12,.018,warm,false);const l=new THREE.PointLight(0xffd7a2,5.2,7.4);l.position.set(x,5.15,0);root.add(l)}
  // Recessed ceiling downlights along the central corridor.
  const downMat=M(0xffe9c5,.18,.1,0xffbd68);for(let z=-6;z<=6;z+=3){rbox(0,5.68,z,.48,.045,.48,.08,downMat,false)}

  // Furniture materials.
  const wood=M(0x68452f,.38,.12),woodEdge=M(0x9a6a49,.31,.13),metal=M(0x151d21,.23,.8),screen=M(0x041b23,.13,.5,0x078b98),screenFrame=M(0x0d1418,.2,.72),paper=M(0xe1ded4,.74,.01),blue=M(0x237ba0,.42,.2),green=M(0x2d7859,.7,.02),silver=M(0xb8c4c2,.22,.72);
  const positions:number[][]=[[-9,-5.5],[-3,-5.5],[3,-5.5],[9,-5.5],[-9,5.5],[-3,5.5],[3,5.5],[9,5.5]];
  const desks:THREE.Group[]=[];
  const desk=(x:number,z:number,rot=0)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;root.add(g);desks.push(g);
    rbox(0,1.18,0,2.82,.16,1.3,.045,wood,true,g);rbox(0,1.09,0,2.84,.035,1.32,.015,woodEdge,false,g);
    [-1,1].forEach(s=>{rbox(s*1.04,.54,0,.09,1.05,.09,.025,metal,true,g);rbox(s*1.04,.06,0,.55,.06,.08,.025,metal,false,g)});
    rbox(0,1.78,-.23,1.68,.94,.12,.055,screenFrame,true,g);rbox(0,1.78,-.30,1.42,.72,.025,.025,screen,false,g);rbox(0,1.32,-.20,.14,.43,.13,.025,metal,false,g);rbox(0,1.10,-.20,.50,.05,.28,.02,metal,false,g);
    // Keyboard with individual keys.
    const kb=new THREE.Group();kb.position.set(-.06,1.285,.25);for(let rr=0;rr<3;rr++)for(let cc=0;cc<10;cc++)rbox((cc-4.5)*.12,0,(rr-1)*.115,.095,.025,.09,.015,paper,false,kb);g.add(kb);rbox(.66,1.31,.25,.16,.045,.25,.06,paper,false,g);
    // Desk lamp, documents, pen and mug.
    cyl(-1.02,1.30,.35,.055,.12,silver,g);cyl(-1.02,1.41,.35,.105,.035,green,g);const lampStem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.42,10),metal);lampStem.position.set(-.90,1.58,.35);lampStem.rotation.z=-.3;g.add(lampStem);rbox(-.79,1.75,.35,.32,.14,.25,.07,warm,false,g);rbox(.88,1.285,.34,.32,.025,.42,.01,paper,false,g);rbox(.55,1.30,.36,.12,.03,.22,.025,blue,false,g);cyl(.73,1.34,.38,.08,.15,silver,g);
    // Detailed task chair.
    const chair=new THREE.Group();rbox(0,.67,.0,.92,.16,.84,.08,blue,true,chair);rbox(0,1.14,.39,.84,1.06,.14,.07,blue,true,chair);[-.44,.44].forEach(ax=>rbox(ax,.91,.10,.07,.10,.48,.03,metal,false,chair));const stem=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,.46,12),metal);stem.position.y=.39;chair.add(stem);cyl(0,.16,0,.16,.07,metal,chair);for(let a=0;a<5;a++){const ang=a*Math.PI*2/5;const leg=new THREE.Mesh(new THREE.BoxGeometry(.055,.05,.50),metal);leg.position.set(Math.cos(ang)*.25,.12,Math.sin(ang)*.25);leg.rotation.y=ang;chair.add(leg)}chair.position.z=.93;g.add(chair);return g;
  };
  positions.forEach((p,i)=>desk(p[0],p[1],i<4?0:Math.PI));

  // More natural seated staff: torso/head above chair with arms directed toward keyboard.
  const suits=[0x167f94,0x416da7,0x8b6246,0x714b78,0x34765f,0x9a5b61,0x536d8d,0x8a684e],skins=[0xe6b58b,0xc98663,0x93634b,0xefc19c],hairs=[0x181716,0x30251f,0x252a2c];const people:THREE.Group[]=[];
  const person=(x:number,z:number,i:number,active:boolean)=>{const g=new THREE.Group();g.position.set(x,z===z?0:0,z);root.add(g);const shirt=M(suits[i%suits.length],.48,.08),skin=M(skins[i%skins.length],.58,.02),hair=M(hairs[i%hairs.length],.7,.02),trouser=M(0x242a2e,.62,.08);const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.28,.68,7,14),shirt);torso.position.y=1.42;torso.castShadow=true;g.add(torso);sphere(0,2.12,0,.25,skin,g);const hc=new THREE.Mesh(new THREE.SphereGeometry(.255,16,8,0,Math.PI*2,0,Math.PI*.48),hair);hc.position.y=2.20;g.add(hc);
    [-.13,.13].forEach((dx,j)=>{const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.065,.42,5,8),shirt);arm.position.set(dx,1.40,.22);arm.rotation.x=-.35;arm.rotation.z=dx<0?.15:-.15;g.add(arm);sphere(dx,1.18,.38,.065,skin,g)});[-.11,.11].forEach(dx=>{const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.085,.54,5,8),trouser);leg.position.set(dx,.70,.10);g.add(leg)});rbox(0,1.56,-.285,.18,.11,.025,.015,silver,false,g);
    if(active){const ring=new THREE.Mesh(new THREE.TorusGeometry(.50,.026,8,36),M(0x35e7ef,.18,.58,0x35e7ef));ring.rotation.x=Math.PI/2;ring.position.y=.06;g.add(ring);const glow=new THREE.PointLight(0x2ddbea,1.4,2.6);glow.position.y=1.45;g.add(glow)}people.push(g);return g};
  const activeId=activeTask?.agentId;agents.slice(0,8).forEach((a,i)=>{const p=positions[i];const front=i<4?p[1]+.58:p[1]-.58;const g=person(p[0],front,i,a.id===activeId);g.rotation.y=i<4?0:Math.PI});

  // Reception island, storage, server rack and wall details.
  rbox(-9.6,.82,0,3.35,1.65,1.05,.09,M(0x27363b,.35,.55));rbox(-9.6,1.72,0,3.10,.12,.94,.04,wood);
  for(let j=0;j<5;j++)rbox(-10.85+j*.62,1.82,-.46,.40,.03,.02,.005,[green,blue,silver,woodEdge,paper][j],false);
  const cabinet=M(0x253238,.31,.72);rbox(-10.5,1.25,6.65,1.5,2.25,1.05,.06,cabinet);for(let j=0;j<4;j++)rbox(-10.5,.55+j*.39,6.08,1.12,.035,.035,.008,trim,false);
  for(let k=0;k<3;k++){rbox(8.8+k*.72,1.12,6.65,.52,2.02,1.05,.05,M(0x121b20,.27,.8));for(let j=0;j<6;j++)rbox(8.8+k*.72,.48+j*.25,6.08,.20,.028,.028,.008,M(0x2ed9e8,.17,.5,0x2ed9e8),false)}
  // Plants with multiple leaves.
  const pot=M(0x805843,.7,.02),leaf=M(0x286f52,.7,.02);for(const [x,z] of [[-11,-6.45],[11,-6.45],[-11,6.45],[11,6.45]]){cyl(x,.24,z,.30,.42,pot);for(let j=0;j<8;j++){const l=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),leaf);l.scale.set(.46,1.7,.46);l.position.set(x+(j-3.5)*.10,.68+(j%3)*.10,z+(j%2-.5)*.13);l.rotation.z=(j-3.5)*.17;root.add(l)}}
  // Wall-mounted art/notice board and a small digital clock.
  rbox(10.9,3.18,-7.35,1.65,1.05,.05,.025,M(0x202e33,.42,.35));rbox(10.9,3.18,-7.32,1.38,.78,.025,.015,M(0x0a2026,.18,.45,0x075d69),false);for(let j=0;j<4;j++)rbox(10.9,3.18,-7.29,.06,.42,.01,.005,M(0x45d8df,.2,.4,0x45d8df),false);

  // Lighting stack: soft sky, warm key, cool fill.
  scene.add(new THREE.HemisphereLight(0xdff5ff,0x11191d,1.45));const key=new THREE.DirectionalLight(0xffeed6,2.9);key.position.set(-9,18,11);key.castShadow=true;key.shadow.mapSize.set(1536,1536);key.shadow.camera.left=-19;key.shadow.camera.right=19;key.shadow.camera.top=17;key.shadow.camera.bottom=-17;scene.add(key);const fill=new THREE.DirectionalLight(0x6ad5e9,.75);fill.position.set(13,10,-13);scene.add(fill);
  const clock=new THREE.Clock();const onResize=()=>{const w=el.clientWidth||600,h=el.clientHeight||430;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};window.addEventListener('resize',onResize);onResize();
  const tick=()=>{if(dead)return;raf=requestAnimationFrame(tick);const t=clock.getElapsedTime();people.forEach((p,i)=>{const isActive=!!p.children.find(c=>c instanceof THREE.Mesh&&c.geometry instanceof THREE.TorusGeometry);if(isActive){const pulse=1+Math.sin(t*3+i)*.018;p.scale.setScalar(pulse);p.position.y=Math.sin(t*2.2)*.012;p.rotation.z=Math.sin(t*.8)*.012}});controls.update();renderer.render(scene,camera)};tick();
  return()=>{dead=true;cancelAnimationFrame(raf);window.removeEventListener('resize',onResize);controls.dispose();renderer.dispose();root.clear();el.replaceChildren()};
 },[agents,activeTask]);
 return <div ref={host} className="h-full min-h-[360px] w-full"/>;
};
export default OfficeSimulation3DRealistic;
