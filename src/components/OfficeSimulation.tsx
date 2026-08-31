import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { AgentDefinition, TaskRecord } from '../types';

interface Props {
  agents: AgentDefinition[];
  activeTask: TaskRecord | null;
}

type Worker = {
  agent: AgentDefinition;
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Graphics;
  head: Phaser.GameObjects.Graphics;
  leftLeg: Phaser.GameObjects.Graphics;
  rightLeg: Phaser.GameObjects.Graphics;
  status: Phaser.GameObjects.Text;
  screen: Phaser.GameObjects.Graphics;
  home: Phaser.Math.Vector2;
  target: Phaser.Math.Vector2;
  busy: boolean;
  coffee: boolean;
  index: number;
};

const COLORS = [0x2dd4bf, 0x60a5fa, 0xf59e0b, 0xf472b6, 0xa78bfa, 0x34d399, 0xfb7185, 0x38bdf8];

function drawDesk(g: Phaser.GameObjects.Graphics, x: number, y: number, w = 170, h = 92) {
  g.fillStyle(0x7b5a43, 1); g.fillRoundedRect(x, y, w, h, 12);
  g.lineStyle(2, 0xa77a58, 0.8); g.strokeRoundedRect(x, y, w, h, 12);
  g.fillStyle(0x273746, 1); g.fillRoundedRect(x + w / 2 - 43, y - 42, 86, 54, 7);
  g.lineStyle(3, 0x526273, 1); g.strokeRoundedRect(x + w / 2 - 43, y - 42, 86, 54, 7);
  g.fillStyle(0x07131b, 1); g.fillRect(x + w / 2 - 36, y - 35, 72, 40);
  g.fillStyle(0x1fd1d8, 0.45); g.fillRect(x + w / 2 - 30, y - 28, 60, 3);
  g.fillStyle(0x7ef5c5, 0.25); g.fillRect(x + w / 2 - 30, y - 20, 42, 3);
  g.fillStyle(0x7ef5c5, 0.16); g.fillRect(x + w / 2 - 30, y - 12, 52, 3);
  g.fillStyle(0x526273, 1); g.fillRect(x + w / 2 - 26, y + h, 52, 7);
  g.fillStyle(0x3a2b21, 1); g.fillRect(x + 20, y + h - 2, 8, 22); g.fillRect(x + w - 28, y + h - 2, 8, 22);
}

function makePerson(scene: Phaser.Scene, x: number, y: number, color: number, name: string, scale = 1) {
  const root = scene.add.container(x, y).setDepth(30);
  const shadow = scene.add.ellipse(0, 25, 42, 13, 0x000000, 0.25);
  const legs = scene.add.graphics();
  legs.lineStyle(7, 0x18212a, 1); legs.lineBetween(-7, 8, -9, 25); legs.lineBetween(7, 8, 9, 25);
  const body = scene.add.graphics(); body.fillStyle(color, 1); body.fillRoundedRect(-18, -2, 36, 35, 12);
  body.lineStyle(2, 0xffffff, 0.22); body.strokeRoundedRect(-18, -2, 36, 35, 12);
  const head = scene.add.graphics(); head.fillStyle(0xf0c7a2, 1); head.fillCircle(0, -19, 15); head.fillStyle(0x252525, 1); head.fillCircle(-5, -22, 3); head.fillCircle(5, -22, 3);
  const badge = scene.add.text(0, 39, name.length > 18 ? `${name.slice(0, 17)}…` : name, {fontFamily:'Arial', fontSize:'10px', color:'#dbeafe', fontStyle:'bold'}).setOrigin(.5);
  root.add([shadow, legs, body, head, badge]);
  root.setScale(scale);
  return { root, body, head, legs };
}

class OfficeScene extends Phaser.Scene {
  workers: Worker[] = [];
  jarvis!: Phaser.GameObjects.Container;
  missionText!: Phaser.GameObjects.Text;
  missionBar!: Phaser.GameObjects.Graphics;
  missionTimer?: Phaser.Time.TimerEvent;
  activeTask: TaskRecord | null = null;
  agents: AgentDefinition[] = [];
  missionSerial = 0;

  constructor() { super('OfficeScene'); }

  init(data: { agents: AgentDefinition[]; activeTask: TaskRecord | null }) {
    this.agents = data.agents.filter(a => a.enabled).slice(0, 8);
    this.activeTask = data.activeTask;
  }

  create() {
    this.cameras.main.setBackgroundColor('#080d12');
    this.drawFloor();
    this.createJarvis();
    this.createBoss();
    this.createWorkers();
    this.createHud();
    this.startAmbient();
    if (this.activeTask) this.startMission(this.activeTask);
  }

  drawFloor() {
    const W = this.scale.width, H = this.scale.height;
    const g = this.add.graphics();
    g.fillStyle(0x17212a, 1); g.fillRect(0, 0, W, H);
    g.fillStyle(0x202c35, 1); g.fillRect(28, 28, W - 56, H - 56);
    g.lineStyle(3, 0x344653, 1); g.strokeRect(28, 28, W - 56, H - 56);
    g.lineStyle(1, 0x2b3a45, 0.65);
    for (let x = 48; x < W - 48; x += 42) g.lineBetween(x, 50, x, H - 50);
    for (let y = 50; y < H - 50; y += 42) g.lineBetween(48, y, W - 48, y);

    // central hallway
    g.fillStyle(0x111a21, 1); g.fillRect(40, H * .47, W - 80, 86);
    g.lineStyle(2, 0x41525e, .8); g.lineBetween(40, H * .47, W - 40, H * .47); g.lineBetween(40, H * .47 + 86, W - 40, H * .47 + 86);
    g.fillStyle(0x26343e, 1); g.fillRect(48, H * .47 + 36, W - 96, 3);

    const rooms = [
      ['PAPER LAB', 55, 75, 230, 275], ['DOCUMENTS', 310, 75, 230, 275], ['DPP ROOM', 565, 75, 230, 275], ['DESIGN STUDIO', 820, 75, 230, 275],
      ['RESEARCH', 55, 575, 230, 235], ['QA ROOM', 310, 575, 230, 235], ['MEDIA', 565, 575, 230, 235], ['DATA', 820, 575, 230, 235]
    ];
    const sx = W / 1100, sy = H / 850;
    // Scale the logical scene to the available canvas.
    this.cameras.main.setZoom(Math.min(sx, sy));
    this.cameras.main.centerOn(550, 425);
    rooms.forEach(([label, x, y, w, h]) => {
      g.lineStyle(2, 0x435663, .95); g.strokeRoundedRect(x as number, y as number, w as number, h as number, 14);
      g.fillStyle(0x0d151c, .72); g.fillRoundedRect((x as number)+7, (y as number)+7, (w as number)-14, 28, 8);
      this.add.text((x as number)+18, (y as number)+15, label as string, {fontFamily:'Arial',fontSize:'11px',color:'#8ea4b3',fontStyle:'bold',letterSpacing:2}).setDepth(5);
    });

    this.add.text(550, 48, 'SHAHEEN AI OFFICE  •  LIVE WORKPLACE', {fontFamily:'Arial',fontSize:'16px',color:'#dff8ff',fontStyle:'bold'}).setOrigin(.5).setDepth(5);
    this.add.text(550, 66, 'Physical simulation — movement is driven by real task state', {fontFamily:'Arial',fontSize:'10px',color:'#70828f'}).setOrigin(.5).setDepth(5);
  }

  createJarvis() {
    const p = makePerson(this, 550, 150, 0x22d3ee, 'JARVIS', 1.18);
    this.jarvis = p.root;
    this.jarvis.setDepth(50);
    this.add.rectangle(550, 205, 190, 18, 0x0c141b, .95).setStrokeStyle(2, 0x2b7182).setDepth(8);
    this.add.text(550, 200, 'MANAGER / ROUTING DESK', {fontFamily:'Arial',fontSize:'9px',color:'#71e7ef',fontStyle:'bold'}).setOrigin(.5).setDepth(9);
    this.tweens.add({targets:this.jarvis,y:148,duration:1600,yoyo:true,repeat:-1,ease:'Sine.inOut'});
  }

  createBoss() {
    const x = 965, y = 705;
    const g = this.add.graphics().setDepth(7);
    g.fillStyle(0x4a382a, 1); g.fillRoundedRect(x - 95, y - 40, 190, 100, 14); g.lineStyle(2, 0xa27a4e, .7); g.strokeRoundedRect(x - 95, y - 40, 190, 100, 14);
    g.fillStyle(0x202b33, 1); g.fillRoundedRect(x - 45, y - 78, 90, 45, 6); g.fillStyle(0x0b141a, 1); g.fillRect(x - 38, y - 70, 76, 34);
    const boss = makePerson(this, x, y - 10, 0xe5b86b, 'BOSS / CEO', 1.05); boss.root.setDepth(40);
    this.add.text(x, y + 76, 'YOUR COMMAND DESK', {fontFamily:'Arial',fontSize:'11px',color:'#d4b483',fontStyle:'bold'}).setOrigin(.5).setDepth(10);
  }

  createWorkers() {
    const homes = [[170,250],[425,250],[680,250],[935,250],[170,695],[425,695],[680,695],[935,695]];
    this.agents.forEach((agent, i) => {
      const [x,y] = homes[i];
      const p = makePerson(this, x, y + 30, COLORS[i % COLORS.length], agent.name, .88);
      drawDesk(this.add.graphics().setDepth(6), x - 85, y + 58, 170, 78);
      const screen = this.add.graphics().setDepth(12);
      screen.fillStyle(0x08151c, 1); screen.fillRect(x - 36, y + 23, 72, 34);
      screen.fillStyle(COLORS[i % COLORS.length], .25); screen.fillRect(x - 29, y + 29, 58, 3);
      screen.fillStyle(0x9cf6df, .14); screen.fillRect(x - 29, y + 37, 46, 3);
      const status = this.add.text(x, y + 155, 'IDLE • at desk', {fontFamily:'Arial',fontSize:'10px',color:'#6f8794'}).setOrigin(.5).setDepth(20);
      const worker: Worker = {agent,root:p.root,body:p.body,head:p.head,leftLeg:p.legs,rightLeg:p.legs,status,screen,home:new Phaser.Math.Vector2(x,y+30),target:new Phaser.Math.Vector2(x,y+30),busy:false,coffee:false,index:i};
      this.workers.push(worker);
    });
  }

  createHud() {
    this.add.rectangle(550, 820, 990, 34, 0x081118, .96).setStrokeStyle(1, 0x2b4551).setDepth(90);
    this.missionText = this.add.text(65, 811, 'OFFICE READY  •  Employees are working, walking and taking breaks.', {fontFamily:'monospace',fontSize:'11px',color:'#83a2ad'}).setDepth(95);
    this.missionBar = this.add.graphics().setDepth(95);
    this.add.text(1035, 811, 'LIVE', {fontFamily:'monospace',fontSize:'11px',color:'#34d399',fontStyle:'bold'}).setDepth(95);
  }

  startAmbient() {
    this.workers.forEach((w, i) => {
      this.time.addEvent({delay:6500 + i * 1300, loop:true, callback:()=>{
        if (w.busy) return;
        if (i === this.workers.length - 1 && !w.coffee) {
          w.coffee = true; this.walkTo(w, new Phaser.Math.Vector2(560, 515), '☕ coffee break');
          this.time.delayedCall(3800, () => { w.coffee = false; if (!w.busy) this.walkTo(w, w.home, 'IDLE • at desk'); });
        } else {
          const wander = new Phaser.Math.Vector2(w.home.x + Phaser.Math.Between(-28,28), w.home.y + Phaser.Math.Between(-12,12));
          this.walkTo(w, wander, 'moving around');
          this.time.delayedCall(1400, () => { if (!w.busy) this.walkTo(w, w.home, 'IDLE • at desk'); });
        }
      }});
    });
  }

  startMission(task: TaskRecord) {
    this.missionSerial += 1;
    const serial = this.missionSerial;
    this.activeTask = task;
    const idx = Math.max(0, this.workers.findIndex(w => w.agent.id === task.agentId || w.agent.name === task.agentName));
    const w = this.workers[idx >= 0 ? idx : 0];
    if (!w) return;
    w.busy = true;
    w.status.setText('🚶 going to JARVIS').setColor('#fbbf24');
    this.missionText.setText(`MISSION ${task.id.slice(-6)}  •  ${task.title.slice(0, 82)}`).setColor('#fbbf24');
    this.missionBar.clear().fillStyle(0xfbbf24, .75).fillRect(60, 838, 1, 3);
    const start = w.root.x;
    const startY = w.root.y;
    this.walkTo(w, new Phaser.Math.Vector2(550, 250), '🚶 briefing JARVIS', () => {
      if (serial !== this.missionSerial) return;
      w.status.setText('🧠 receiving assignment');
      this.tweens.add({targets:this.jarvis,scaleX:1.24,scaleY:1.24,duration:180,yoyo:true});
      this.time.delayedCall(900, () => {
        w.status.setText('💻 working at computer');
        this.walkTo(w, w.home, '💻 working at workstation', () => {
          this.animateWorkstation(w, serial);
        });
      });
    });
    void start; void startY;
  }

  animateWorkstation(w: Worker, serial: number) {
    let ticks = 0;
    const timer = this.time.addEvent({delay:500,repeat:9,callback:()=>{
      if (serial !== this.missionSerial) return;
      ticks++;
      w.screen.clear().fillStyle(0x08151c,1).fillRect(w.home.x-36,w.home.y-7,72,34);
      for(let i=0;i<4;i++) w.screen.fillStyle(i===ticks%4?0x7ef5c5:0x1fd1d8,.3).fillRect(w.home.x-29,w.home.y+i*7,Phaser.Math.Between(20,58),3);
      this.tweens.add({targets:w.body,angle:Phaser.Math.Between(-3,3),duration:100,yoyo:true});
    },callbackScope:this});
    this.time.delayedCall(5000,()=>{
      timer.remove(false);
      w.status.setText('📄 delivering result').setColor('#34d399');
      this.walkTo(w, new Phaser.Math.Vector2(850, 540), '📄 delivering result', () => {
        this.time.delayedCall(700,()=>{
          this.walkTo(w, new Phaser.Math.Vector2(965, 665), '📦 result to Boss', () => {
            w.status.setText('✅ mission complete').setColor('#34d399');
            this.add.text(965, 610, 'RESULT DELIVERED', {fontFamily:'monospace',fontSize:'12px',color:'#6ee7b7',fontStyle:'bold'}).setOrigin(.5).setDepth(100);
            this.time.delayedCall(1300,()=>{w.busy=false; this.walkTo(w,w.home,'IDLE • at desk');});
          });
        });
      });
    });
  }

  walkTo(w: Worker, target: Phaser.Math.Vector2, label: string, done?:()=>void) {
    w.target = target.clone(); w.status.setText(label);
    const distance = Phaser.Math.Distance.Between(w.root.x,w.root.y,target.x,target.y);
    this.tweens.add({targets:w.root,x:target.x,y:target.y,duration:Math.max(700, distance*7),ease:'Sine.inOut',onUpdate:(_tween, targetObj:any)=>{
      const moving = targetObj.x !== target.x || targetObj.y !== target.y;
      w.leftLeg.angle = moving ? Math.sin(this.time.now/90)*12 : 0;
      w.rightLeg.angle = moving ? -Math.sin(this.time.now/90)*12 : 0;
    },onComplete:()=>done?.()});
  }

  update() {
    this.workers.forEach(w=>{
      const dx=w.target.x-w.root.x, dy=w.target.y-w.root.y;
      if(Math.abs(dx)+Math.abs(dy)>5){
        const swing=Math.sin(this.time.now/85+w.index)*7;
        w.leftLeg.angle=swing; w.rightLeg.angle=-swing; w.root.setDepth(30+Math.floor(w.root.y/100));
      } else { w.leftLeg.angle=0; w.rightLeg.angle=0; }
    });
  }
}

export const OfficeSimulation: React.FC<Props> = ({agents, activeTask}) => {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Phaser.Game | null>(null);
  const lastTask = useRef<string>('');

  useEffect(() => {
    if (!host.current) return;
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: host.current,
      width: 1100,
      height: 850,
      transparent: false,
      antialias: true,
      render: { pixelArt: false, roundPixels: true },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1100, height: 850 },
      scene: OfficeScene,
      audio: { noAudio: true },
    };
    game.current = new Phaser.Game(config);
    game.current.scene.start('OfficeScene', {agents, activeTask});
    return () => { game.current?.destroy(true); game.current = null; };
  }, []);

  useEffect(() => {
    const id = activeTask?.id || '';
    if (!id || id === lastTask.current || !game.current) return;
    lastTask.current = id;
    const scene = game.current.scene.getScene('OfficeScene') as OfficeScene | undefined;
    if (scene) scene.startMission(activeTask!);
  }, [activeTask]);

  return <div className="relative w-full overflow-hidden rounded-[26px] border border-slate-700 bg-[#080d12] shadow-[0_30px_100px_rgba(0,0,0,.5)]">
    <div className="absolute left-4 top-4 z-20 rounded-lg border border-cyan-300/20 bg-[#071017]/90 px-3 py-2 text-[10px] font-bold text-cyan-200 backdrop-blur">2D OFFICE SIMULATION · LIVE</div>
    <div ref={host} className="min-h-[560px] w-full" />
  </div>;
};

export default OfficeSimulation;
