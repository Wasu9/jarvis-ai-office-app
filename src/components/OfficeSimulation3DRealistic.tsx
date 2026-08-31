import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {AgentDefinition,TaskRecord} from '../types';

interface Props{agents:AgentDefinition[];activeTask:TaskRecord|null}

/** A real Three.js miniature/diorama office. Geometry and materials are generated in-code; no image is used. */
export const OfficeSimulation3DRealistic:React.FC<Props>=({agents,activeTask})=>{
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const el=host.current;if(!el)return;let raf=0,dead=false;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x071016);
  const camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(17,15,18);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;el.replaceChildren(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=11;controls.maxDistance=30;controls.maxPolarAngle=1.35;controls.minPolarAngle=.55;controls.rotateSpeed=.45;
  const root=new THREE.Group();scene.add(root);
  const M=(c:number,r=.5,m=.05,e?:number)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m,emissive:e??0,emissiveIntensity:e?1.2:0});
  const box=(x:number,y:number,z:number,sx:number,sy:number,sz:number,ma:THREE.Material,cast=true)=>{const q=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),ma);q.position.set(x,y,z);q.castShadow=cast;q.receiveShadow=true;root.add(q);return q};
  const cyl=(x:number,y:number,z:number,r:number,h:number,ma:THREE.Material)=>{const q=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),ma);q.position.set(x,y,z);q.castShadow=true;q.receiveShadow=true;root.add(q);return q};
  const floor= M(0x2b3437,.72,.18);box(0,-.35,0,25,.65,16,floor);box(0,.01,0,24.5,.05,15.5,M(0x6a5948,.62,.08));
  const wall=M(0x273238,.7,.15),trim=M(0x89a7aa,.34,.55);box(0,3.2,-7.8,25,.35,.45,wall);box(-12.3,3.2,0,.45,6,16,wall);box(12.3,3.2,0,.45,6,16,wall);
  // Glass partitions create the physical miniature-office feeling.
  const glass=new THREE.MeshPhysicalMaterial({color:0x8ed9e2,transparent:true,opacity:.16,roughness:.08,metalness:.12,transmission:.25,thickness:.08});
  [-6,-0.0,6].forEach(x=>{box(x,1.65,-3.55,.07,3.3,7.2,glass);box(x,1.65,3.55,.07,3.3,7.2,glass);});
  // Ceiling beams and warm miniature practicals.
  const warm=M(0xffdca8,.25,.25,0xffb65a);for(let x=-9;x<=9;x+=6){box(x,5.9,0,4.2,.16,.18,trim);box(x,5.72,0,2.4,.035,.12,warm);const l=new THREE.PointLight(0xffd9a8,8,7);l.position.set(x,5.4,0);root.add(l)}
  // desks: top, metal frame, monitor, keyboard, mouse, lamp and mug.
  const wood=M(0x725039,.42,.08),metal=M(0x20292d,.28,.72),screen=M(0x061d25,.18,.4,0x0a6370),white=M(0xd5d8d6,.4,.08),green=M(0x2d7d5d,.72,.02);
  const desk=(x:number,z:number,rot=0)=>{const g=new THREE.Group();g.position.set(x,.0,z);g.rotation.y=rot;root.add(g);const add=(o:THREE.Object3D)=>g.add(o);const d=new THREE.Mesh(new THREE.BoxGeometry(2.8,.16,1.25),wood);d.position.y=1.18;d.castShadow=true;add(d);[-1,1].forEach(s=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(.09,1.05,.09),metal);leg.position.set(s*1.05,.55,0);add(leg)});const mon=new THREE.Mesh(new THREE.BoxGeometry(1.55,.9,.1),metal);mon.position.set(0,1.78,-.22);add(mon);const sc=new THREE.Mesh(new THREE.PlaneGeometry(1.3,.67),screen);sc.position.set(0,1.78,-.275);sc.rotation.y=Math.PI;add(sc);const st=new THREE.Mesh(new THREE.BoxGeometry(.14,.45,.12),metal);st.position.set(0,1.32,-.2);add(st);const kb=new THREE.Mesh(new THREE.BoxGeometry(.9,.04,.35),white);kb.position.set(0,1.3,.22);add(kb);const mouse=new THREE.Mesh(new THREE.SphereGeometry(.075,12,8),white);mouse.scale.set(1,.45,1.3);mouse.position.set(.62,1.31,.22);add(mouse);cyl( -.88,1.31,.32,.075,.13,white);cyl( -.88,1.39,.32,.11,.035,green);const chair=new THREE.Group();const seat=new THREE.Mesh(new THREE.BoxGeometry(.9,.16,.85),metal);seat.position.y=.64;chair.add(seat);const back=new THREE.Mesh(new THREE.BoxGeometry(.82,1.05,.12),metal);back.position.set(0,1.12,.42);chair.add(back);const stem=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.45,10),metal);stem.position.y=.36;chair.add(stem);chair.position.z=.92;add(chair);return g};
  const positions=[[-9,-5.5],[-3,-5.5],[3,-5.5],[9,-5.5],[-9,5.5],[-3,5.5],[3,5.5],[9,5.5]];positions.forEach((p,i)=>desk(p[0],p[1],i<4?0:Math.PI));
  // Detailed miniature employees, assembled from primitive body parts.
  const suits=[0x277f91,0x496ea8,0x8b6647,0x744b79,0x2e795f,0x9b5961];
  const person=(x:number,z:number,i:number,active:boolean)=>{const g=new THREE.Group();g.position.set(x,0,z);root.add(g);const shirt=M(suits[i%suits.length],.52,.08),skin=M([0xe9b98f,0xc88762,0x8e6045,0xf0c5a0][i%4],.62,.02),hair=M([0x191817,0x30251f,0x24282c][i%3],.7,.02);const body=new THREE.Mesh(new THREE.CapsuleGeometry(.29,.72,6,12),shirt);body.position.y=1.42;body.castShadow=true;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.25,16,12),skin);head.position.y=2.15;head.castShadow=true;g.add(head);const h=new THREE.Mesh(new THREE.SphereGeometry(.255,16,8,0,Math.PI*2,0,Math.PI*.48),hair);h.position.y=2.25;g.add(h);[-.12,.12].forEach(dx=>{const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.45,5,8),shirt);arm.position.set(dx*2,1.48,.02);arm.rotation.z=dx<0?.18:-.18;g.add(arm)});[-.12,.12].forEach(dx=>{const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.09,.58,5,8),metal);leg.position.set(dx,.72,0);g.add(leg)});if(active){const ring=new THREE.Mesh(new THREE.TorusGeometry(.46,.025,8,32),M(0x37e7ef,.25,.5,0x37e7ef));ring.rotation.x=Math.PI/2;ring.position.y=.08;g.add(ring)}return g};
  const activeId=activeTask?.agentId;agents.slice(0,8).forEach((a,i)=>{const p=positions[i%positions.length];person(p[0],p[1],i,a.id===activeId)});
  // Plants, filing cabinets, books and server rack details.
  const pot=M(0x8b6248,.7,.02);for(const [x,z] of [[-11,-6.5],[11,-6.5],[-11,6.5],[11,6.5]]){cyl(x,.25,z,.28,.42,pot);for(let j=0;j<6;j++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),green);leaf.scale.set(.55,1.7,.5);leaf.position.set(x+(j-2.5)*.12,.68+(j%2)*.1,z+(j%3-.9)*.1);root.add(leaf)}}
  for(let k=0;k<3;k++){box(9.1+k*.65,1.1,6.65,.48,1.9,1.05,M(0x172126,.3,.7));for(let j=0;j<5;j++)box(9.1+k*.65,.52+j*.27,6.1,.2,.025,.025,M(0x32d9e8,.2,.5,0x32d9e8))}
  const hemi=new THREE.HemisphereLight(0xe4f7ff,0x172126,1.5);scene.add(hemi);const key=new THREE.DirectionalLight(0xfff1dc,3.4);key.position.set(-8,18,10);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-18;key.shadow.camera.right=18;key.shadow.camera.top=16;key.shadow.camera.bottom=-16;scene.add(key);const fill=new THREE.DirectionalLight(0x72d8ff,1.1);fill.position.set(12,9,-12);scene.add(fill);
  const onResize=()=>{const w=el.clientWidth||600,h=el.clientHeight||430;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};window.addEventListener('resize',onResize);onResize();
  const tick=()=>{if(dead)return;raf=requestAnimationFrame(tick);controls.update();renderer.render(scene,camera)};tick();
  return()=>{dead=true;cancelAnimationFrame(raf);window.removeEventListener('resize',onResize);controls.dispose();renderer.dispose();el.replaceChildren()};
 },[agents,activeTask]);
 return <div ref={host} className="h-full min-h-[360px] w-full"/>;
};
export default OfficeSimulation3DRealistic;
