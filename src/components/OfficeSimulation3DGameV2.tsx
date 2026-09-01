import React,{useEffect,useRef}from'react';
import * as THREE from'three';
import {OrbitControls}from'three/examples/jsm/controls/OrbitControls.js';
import {RoundedBoxGeometry}from'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {AgentDefinition,TaskRecord}from'../types';

interface Props{agents:AgentDefinition[];activeTask:TaskRecord|null}

const OfficeSimulation3DGameV2:React.FC<Props>=({agents})=>{
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const el=host.current;if(!el)return;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x060a0f);
  const camera=new THREE.OrthographicCamera(-16,16,11,-11,.1,100);camera.position.set(0,22,0);camera.lookAt(0,0,0);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;el.replaceChildren(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableRotate=false;controls.enablePan=false;controls.enableDamping=false;controls.minZoom=.65;controls.maxZoom=2.2;controls.zoomSpeed=.8;controls.target.set(0,0,0);
  const root=new THREE.Group();scene.add(root);
  const mat=(c:number,r=.55,m=.05)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
  const box=(s:[number,number,number],p:[number,number,number],m:THREE.Material,r=.04)=>{const q=new THREE.Mesh(new RoundedBoxGeometry(s[0],s[1],s[2],3,r),m);q.position.set(...p);q.receiveShadow=true;root.add(q);return q};
  box([30,.4,20],[0,-.25,0],mat(0x081018,.9,.2),.02);box([29,.12,19],[0,.02,0],mat(0x34434b,.82,.08),.01);
  for(let x=-13;x<=13;x+=2)box([.012,.015,18],[x,.1,0],mat(0x202a30,.95),.001);
  for(let z=-8;z<=8;z+=2)box([28,.015,.012],[0,.1,z],mat(0x202a30,.95),.001);
  box([29,4,.35],[0,2,-9.35],mat(0x0d1720,.7,.2),.02);box([.35,4,18],[14.8,2,0],mat(0x0d1720,.7,.2),.02);box([.35,4,18],[-14.8,2,0],mat(0x0d1720,.7,.2),.02);
  const deskMat=mat(0x6b472e,.38,.16),metal=mat(0x11181d,.3,.7),screen=mat(0x08718b,.2,.45);
  const desks=[[-10,-5.6],[-3.4,-5.6],[3.4,-5.6],[10,-5.6],[-10,5.6],[-3.4,5.6],[3.4,5.6],[10,5.6]] as const;
  desks.forEach(([x,z])=>{box([2.7,.18,1.25],[x,1,z],deskMat,.06);for(const sx of[-1,1])for(const sz of[-.42,.42])box([.07,.9,.07],[x+sx*1.08,.52,z+sz],metal,.02);box([1.5,.7,.07],[x,1.45,z-.3],metal,.03);box([1.3,.58,.025],[x,1.48,z-.34],screen,.01);box([.7,.04,.3],[x+.2,1.12,z+.28],mat(0xe8e7e0,.5),.01);});
  box([4.8,.18,2.1],[0,1.02,-2.3],deskMat,.1);box([3.2,.12,1.1],[0,.78,6.2],deskMat,.08);
  const sofa=(x:number,z:number)=>{box([1.65,.18,.75],[x,.55,z],mat(0x155b73,.43,.08),.12);box([1.55,.75,.14],[x,1,z+.34],mat(0x1c718b,.42,.08),.1)};[-7.8,-5.8,-3.8,3.8,5.8,7.8].forEach(x=>sofa(x,7.35));
  const addPerson=(x:number,z:number,i:number)=>{const g=new THREE.Group();g.position.set(x,.05,z);root.add(g);const suit=mat([0x17283a,0x24364b,0x3b2930,0x20352c,0x30333b,0x4a392c][i%6],.62);const skin=mat([0x8b5a3c,0xa86f4c,0xc58b62,0x70452f,0xd09a78,0x9d6748][i%6],.72);const hair=mat(0x171311,.8);const body=new THREE.Mesh(new RoundedBoxGeometry(.72,.95,.44,3,.14),suit);body.position.y=1.25;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.3,16,10),skin);head.position.y=2.02;g.add(head);const h=new THREE.Mesh(new THREE.SphereGeometry(.31,16,10),hair);h.scale.y=.65;h.position.y=2.14;g.add(h);for(const sx of[-1,1]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.7,10),metal);leg.position.set(sx*.2,.55,0);g.add(leg)} };
  agents.slice(0,8).forEach((a,i)=>{const p=desks[i];addPerson(p[0],p[1]+(i<4?.72:-.72),i)});
  scene.add(new THREE.HemisphereLight(0xdff8ff,0x071018,2.2));const key=new THREE.DirectionalLight(0xffead0,3.2);key.position.set(-10,18,8);scene.add(key);
  const resize=()=>{const w=Math.max(1,el.clientWidth),h=Math.max(360,Math.min(720,el.clientWidth*.62)),aspect=w/h;const halfH=11,halfW=halfH*aspect;camera.left=-halfW;camera.right=halfW;camera.top=halfH;camera.bottom=-halfH;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};resize();const ro=new ResizeObserver(resize);ro.observe(el);renderer.render(scene,camera);
  return()=>{ro.disconnect();controls.dispose();renderer.dispose();root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose()}});el.replaceChildren()};
 },[agents]);
 return <div ref={host} className="w-full overflow-hidden bg-[#060a0f]" aria-label="Shaheen AI Office top view"/>;
};
export default OfficeSimulation3DGameV2;
