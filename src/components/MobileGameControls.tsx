import React,{useEffect,useRef,useState}from'react';

const press=(key:string)=>window.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));
const release=(key:string)=>window.dispatchEvent(new KeyboardEvent('keyup',{key,bubbles:true}));

const HoldButton:React.FC<{label:string;keyName:string;className?:string}>=({label,keyName,className=''})=>{
 const active=useRef(false);
 const down=(e:React.PointerEvent)=>{e.preventDefault();if(active.current)return;active.current=true;e.currentTarget.setPointerCapture?.(e.pointerId);press(keyName)};
 const up=(e:React.PointerEvent)=>{e.preventDefault();if(!active.current)return;active.current=false;release(keyName)};
 useEffect(()=>()=>{if(active.current)release(keyName)},[keyName]);
 return <button aria-label={label} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onPointerLeave={(e)=>{if(e.currentTarget.hasPointerCapture?.(e.pointerId))return;up(e)}} className={`touch-none select-none rounded-2xl border border-white/15 bg-black/45 text-white/90 shadow-lg backdrop-blur-md active:scale-95 ${className}`}>
  {label}
 </button>
};

export const MobileGameControls:React.FC=()=>{
 const [mobile,setMobile]=useState(false);
 useEffect(()=>{const mq=window.matchMedia('(pointer:coarse)');const sync=()=>setMobile(mq.matches);sync();mq.addEventListener?.('change',sync);return()=>mq.removeEventListener?.('change',sync)},[]);
 if(!mobile)return null;
 return <div className="pointer-events-none absolute inset-0 z-20 select-none">
  <div className="absolute bottom-5 left-4 grid grid-cols-3 gap-2 pointer-events-auto">
   <span/><HoldButton label="▲" keyName="w" className="h-14 w-14 text-2xl"/><span/>
   <HoldButton label="◀" keyName="a" className="h-14 w-14 text-2xl"/><HoldButton label="▼" keyName="s" className="h-14 w-14 text-2xl"/><HoldButton label="▶" keyName="d" className="h-14 w-14 text-2xl"/>
  </div>
  <div className="absolute bottom-7 right-4 flex items-end gap-2 pointer-events-auto">
   <HoldButton label="RUN" keyName="shift" className="h-14 w-14 text-[11px] font-bold"/>
   <HoldButton label="JUMP" keyName=" " className="h-16 w-16 text-[11px] font-bold"/>
  </div>
  <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] tracking-wide text-white/65 backdrop-blur-md">
   TOUCH CONTROLS · drag screen to look
  </div>
 </div>;
};

export default MobileGameControls;
