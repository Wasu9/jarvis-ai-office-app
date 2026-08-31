import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { AgentDefinition, TaskRecord } from '../types';

interface Props { agents: AgentDefinition[]; activeTask: TaskRecord | null; }

const palette = [0x1aa6a8,0x466fbd,0xb58a4b,0x9b5f8f,0x5b7690,0x3f8b6e,0x8b5e4b,0x63707a];
const skin = [0xf0c6a2,0xdca77f,0xc98761,0xe8b995,0xb8734e];

function material(color:number, roughness=.5, metalness=.05, emissive=0, intensity=0) {
  return new THREE.MeshStandardMaterial({color, roughness, metalness, emissive, emissiveIntensity:intensity});
}

export const OfficeSimulation3DHyperReal: React.FC<Props> = ({ agents, activeTask }) => {
  const host = useRef<HTMLDivElement>(null);
  const taskRef = useRef<TaskRecord | null>(activeTask);
  taskRef.current = activeTask;

  useEffect(() => {
    const root = host.current;
    if (!root) return;
    let dead = false;
    let raf = 0;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071015);
    scene.fog = new THREE.FogExp2(0x071015, .018);

    const camera = new THREE.PerspectiveCamera(38, 1, .05, 160);
    camera.position.set(18, 15, 21);

    const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    root.innerHTML = '';
    root.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene,camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1000,650), .16, .45, .9));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0,1.0,0);
    controls.enableDamping = true;
    controls.dampingFactor = .055;
    controls.minDistance = 13;
    controls.maxDistance = 34;
    controls.minPolarAngle = .42;
    controls.maxPolarAngle = 1.35;
    controls.enablePan = true;
    controls.panSpeed = .28;
    controls.rotateSpeed = .34;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = new RoomEnvironment();
    scene.environment = pmrem.fromScene(env,.035).texture;
    env.dispose(); pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0xd9f3ff,0x10171d,1.35));
    const key = new THREE.DirectionalLight(0xfff5e8,3.2);
    key.position.set(-10,22,11); key.castShadow=true; key.shadow.mapSize.set(2048,2048);
    key.shadow.camera.left=-24; key.shadow.camera.right=24; key.shadow.camera.top=22; key.shadow.camera.bottom=-22; scene.add(key);
    const fill = new THREE.DirectionalLight(0x9bdcff,1.1); fill.position.set(15,9,-17); scene.add(fill);
    const rim = new THREE.PointLight(0x20d9ff,45,22,2); rim.position.set(0,5,-2); scene.add(rim);
    const warm = new THREE.PointLight(0xffc27a,18,18,2); warm.position.set(-10,4,7); scene.add(warm);

    const add = <T extends THREE.Object3D>(o:T) => { scene.add(o); return o; };
    const box = (x:number,y:number,z:number,sx:number,sy:number,sz:number,c:number,r=.55,m=.05) => {
      const o=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material(c,r,m)); o.position.set(x,y,z); o.castShadow=true;o.receiveShadow=true;return add(o);
    };
    const cylinder = (x:number,y:number,z:number,r:number,h:number,c:number) => {
      const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,32),material(c,.48,.08));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return add(o);
    };

    // Architectural shell: physical miniature office, not a background image.
    box(0,-.3,0,30,.55,19.5,0x11191e,.82,.12);
    box(0,-.01,0,29.2,.04,18.7,0x263239,.72,.12);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(29,18.5),new THREE.MeshPhysicalMaterial({color:0x263239,roughness:.43,metalness:.18,clearcoat:.35}));
    floor.rotation.x=-Math.PI/2;floor.position.y=.025;floor.receiveShadow=true;add(floor);

    const wallMat = new THREE.MeshPhysicalMaterial({color:0x9bdce6,transparent:true,opacity:.075,roughness:.08,metalness:.18,transmission:.25,thickness:.1});
    const glassWall=(x:number,z:number,sx:number,sz:number)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(sx,2.65,sz),wallMat);o.position.set(x,1.32,z);o.castShadow=true;add(o);};
    glassWall(-6.8,-4.4,.055,8.7);glassWall(0,-4.4,.055,8.7);glassWall(6.8,-4.4,.055,8.7);
    glassWall(-6.8,4.4,.055,8.7);glassWall(0,4.4,.055,8.7);glassWall(6.8,4.4,.055,8.7);
    for (const x of [-14.55,14.55]) box(x,1.35,0,.28,2.7,18.9,0x182228,.72,.18);
    box(0,1.35,-9.45,29.1,2.7,.3,0x182228,.72,.18);

    // Tall windows with exterior light impression.
    for(let i=-2;i<=2;i++) {
      box(i*5.1,1.55,-9.26,4.45,2.15,.04,0x183b48,.18,.15);
      const pane=box(i*5.1,1.55,-9.21,4.12,1.8,.025,0x4b8fa1,.14,.18);
      (pane.material as THREE.MeshStandardMaterial).emissive.setHex(0x123744);
      (pane.material as THREE.MeshStandardMaterial).emissiveIntensity=.7;
      box(i*5.1,1.55,-9.19,.045,1.8,.035,0x879da4,.24,.5);
    }

    // Ceiling luminaires.
    for (const x of [-10,-3.35,3.35,10]) for (const z of [-5.9,5.9]) {
      box(x,2.75,z,3.0,.045,.42,0x303b40,.25,.65);
      const light = new THREE.PointLight(0xeafcff,7,6,2);light.position.set(x,2.58,z);scene.add(light);
    }

    // Reception / command table.
    box(0,.98,-1.4,4.4,.16,1.35,0x664a38,.45,.08);
    box(-1.65,.5,-1.4,.12,.92,.12,0x252e33,.3,.6);box(1.65,.5,-1.4,.12,.92,.12,0x252e33,.3,.6);
    const commandScreen=box(0,1.62,-1.52,2.25,1.25,.08,0x10181d,.18,.35);
    const commandGlow=material(0x07323a,.16,.28,0x16d5e6,1.3);
    const cs=new THREE.Mesh(new THREE.PlaneGeometry(1.95,1.0),commandGlow);cs.position.set(0,1.62,-1.57);scene.add(cs);
    cylinder(0,.22,-1.4,.55,.06,0x303a3e);

    const makeDesk=(x:number,z:number,flip=false)=>{
      const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=flip?Math.PI:0;
      const wood=material(0x6b4b38,.43,.1), metal=material(0x2b353a,.3,.62);
      const top=new THREE.Mesh(new THREE.BoxGeometry(2.65,.13,1.15),wood);top.position.y=1.0;top.castShadow=true;g.add(top);
      for(const sx of [-.95,.95]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.09,.9,.09),metal);leg.position.set(sx,.5,0);leg.castShadow=true;g.add(leg);}
      const mon=new THREE.Mesh(new THREE.BoxGeometry(1.25,.76,.07),metal);mon.position.set(0,1.6,-.16);g.add(mon);
      const screenMat=material(0x071a20,.17,.35,0x07343d,1.35);
      const screen=new THREE.Mesh(new THREE.PlaneGeometry(1.08,.59),screenMat);screen.position.set(0,1.6,-.205);g.add(screen);
      const stand=new THREE.Mesh(new THREE.BoxGeometry(.12,.32,.1),metal);stand.position.set(0,1.27,-.15);g.add(stand);
      const kb=new THREE.Mesh(new THREE.BoxGeometry(.82,.035,.31),material(0xa4adb0,.3,.2));kb.position.set(0,1.1,.18);g.add(kb);
      const chair=new THREE.Group();
      const seat=new THREE.Mesh(new THREE.BoxGeometry(.88,.14,.8),material(0x293b43,.5,.12));seat.position.y=.57;chair.add(seat);
      const back=new THREE.Mesh(new THREE.BoxGeometry(.8,.95,.12),material(0x293b43,.5,.12));back.position.set(0,1.02,.38);chair.add(back);
      chair.position.z=.82;g.add(chair);scene.add(g);return g;
    };

    const spots=[[-10,-6.0],[-3.35,-6.0],[3.35,-6.0],[10,-6.0],[-10,6.0],[-3.35,6.0],[3.35,6.0],[10,6.0]];
    spots.forEach((p,i)=>makeDesk(p[0],p[1],i>=4));

    const label=(text:string,x:number,y:number,z:number,scale=.55,accent=false)=>{
      const c=document.createElement('canvas');c.width=900;c.height=170;const ctx=c.getContext('2d')!;
      ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='rgba(5,11,15,.92)';ctx.beginPath();ctx.roundRect(10,12,880,146,25);ctx.fill();ctx.strokeStyle=accent?'rgba(41,224,241,.7)':'rgba(160,190,200,.22)';ctx.lineWidth=4;ctx.stroke();ctx.font='700 34px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#e8fbff';ctx.fillText(text,450,85);
      const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true,depthTest:false}));s.scale.set(2.55*scale,.48*scale,1);s.position.set(x,y,z);add(s);return s;
    };
    label('PAPER LAB',-10,2.72,-6.15,.72);label('DOCUMENTS',-3.35,2.72,-6.15,.72);label('DPP ROOM',3.35,2.72,-6.15,.72);label('DESIGN STUDIO',10,2.72,-6.15,.72);
    label('RESEARCH',-10,2.72,6.15,.72);label('QUALITY CONTROL',-3.35,2.72,6.15,.72);label('MEDIA LAB',3.35,2.72,6.15,.72);label('DATA / FILES',10,2.72,6.15,.72);
    label('SHAHEEN AI OFFICE',0,3.18,-9.0,1.0,true);

    const makePerson=(agent:AgentDefinition,i:number,x:number,z:number)=>{
      const g=new THREE.Group();g.position.set(x,0,z);
      const suit=material(palette[i%palette.length],.37,.15), sk=material(skin[i%skin.length],.58,.02), hair=material(0x202020,.88,.01);
      const body=new THREE.Mesh(new THREE.CapsuleGeometry(.29,.62,8,18),suit);body.position.y=1.02;body.castShadow=true;g.add(body);
      const neck=new THREE.Mesh(new THREE.CylinderGeometry(.095,.11,.18,16),sk);neck.position.y=1.54;g.add(neck);
      const head=new THREE.Mesh(new THREE.SphereGeometry(.285,28,20),sk);head.position.y=1.84;head.castShadow=true;g.add(head);
      const haircap=new THREE.Mesh(new THREE.SphereGeometry(.302,26,16,0,Math.PI*2,0,Math.PI*.46),hair);haircap.position.y=1.97;g.add(haircap);
      [-1,1].forEach(side=>{const eye=new THREE.Mesh(new THREE.SphereGeometry(.022,10,10),material(0x0b1013,.3,.1));eye.position.set(side*.095,1.86,-.27);g.add(eye);});
      [-1,1].forEach(side=>{const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.065,.5,7,12),suit);arm.position.set(side*.25,1.02,.08);arm.rotation.z=-side*.16;arm.castShadow=true;g.add(arm);});
      [-1,1].forEach(side=>{const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.48,7,12),material(0x1b252b,.48,.2));leg.position.set(side*.105,.43,.02);leg.castShadow=true;g.add(leg);});
      const halo=new THREE.Mesh(new THREE.TorusGeometry(.39,.012,8,36),new THREE.MeshBasicMaterial({color:palette[i%palette.length],transparent:true,opacity:.7}));halo.rotation.x=Math.PI/2;halo.position.y=.04;g.add(halo);
      label(agent.name.slice(0,22),x,2.55,z,.5,i===0);
      g.userData={agent,home:new THREE.Vector3(x,0,z),halo,phase:i*.9,working:false};scene.add(g);return g;
    };

    const people:THREE.Group[]=[];
    agents.slice(0,8).forEach((a,i)=>people.push(makePerson(a,i,spots[i][0],spots[i][1]+.72)));
    const jarvisAgent={id:'jarvis',name:'JARVIS',enabled:true} as AgentDefinition;
    const jarvis=makePerson(jarvisAgent,7,0,-2.75);jarvis.scale.setScalar(1.15);label('JARVIS • MANAGER',0,3.02,-2.75,1,true);

    // Small physical details make the scene read as a miniature model rather than a flat dashboard.
    for(const x of [-12.8,12.8]){cylinder(x,.7,0,.28,1.4,0x2e4540);cylinder(x,.9,0,.55,.12,0x3a5a4d);}
    for(const x of [-11.7,11.7]){box(x,.9,-7.9,.8,.12,.8,0x5a4638,.6,.04);for(let j=0;j<4;j++)cylinder(x+(j%2-.5)*.25,1.25,-7.9+(j%2-.5)*.2,.09,.55,0x39704e);}

    const resize=()=>{const w=Math.max(320,root.clientWidth),h=Math.max(280,root.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);composer.setSize(w,h);};
    const ro=new ResizeObserver(resize);ro.observe(root);resize();

    const clock=new THREE.Clock();
    const animate=()=>{
      if(dead)return;
      const t=clock.getElapsedTime();
      const active=taskRef.current?.agentId;
      people.forEach((p,i)=>{const id=p.userData.agent?.id;const working=!!active&&id===active;p.userData.working=working;p.position.y=working?Math.sin(t*2+i)*.018:0;p.userData.halo.material.opacity=working?.98:.55;p.userData.halo.scale.setScalar(working?1.15:1);});
      jarvis.rotation.y=Math.sin(t*.25)*.025;
      controls.update();composer.render();raf=requestAnimationFrame(animate);
    };
    animate();

    return()=>{dead=true;cancelAnimationFrame(raf);ro.disconnect();controls.dispose();composer.dispose();renderer.dispose();root.innerHTML='';};
  },[agents]);

  return <div ref={host} className="relative h-[min(72vh,720px)] min-h-[430px] w-full overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#071015] shadow-2xl" aria-label="Interactive hyper-realistic miniature Shaheen AI Office" />;
};

export default OfficeSimulation3DHyperReal;
