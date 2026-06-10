// Generates data.js: Gen 1 (Red/Blue) level-up learnsets + types for #1-151,
// and a move table (name, type, power) — all fetched from PokeAPI.
import fs from "node:fs";

async function J(url){
  for(let a=0;a<4;a++){
    try{const r=await fetch(url);if(r.ok)return r.json();}catch(e){}
    await new Promise(s=>setTimeout(s,800*(a+1)));
  }
  throw new Error("fetch failed: "+url);
}

const ids=[...Array(151)].map((_,i)=>i+1);
const raw={};
const moveNames=new Set();

for(let i=0;i<ids.length;i+=12){
  await Promise.all(ids.slice(i,i+12).map(async id=>{
    const p=await J(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const t=p.types.sort((a,b)=>a.slot-b.slot).map(x=>x.type.name);
    const lm=[];
    for(const m of p.moves){
      const v=m.version_group_details.find(v=>
        v.version_group.name==="red-blue"&&v.move_learn_method.name==="level-up");
      if(v)lm.push([Math.max(1,v.level_learned_at), m.move.name]);
    }
    lm.sort((a,b)=>a[0]-b[0]);
    lm.forEach(x=>moveNames.add(x[1]));
    raw[id]={t,lm};
  }));
  process.stdout.write(`pokemon ${Math.min(i+12,151)}/151\r`);
}
console.log("\npokemon done, fetching "+moveNames.size+" moves");

const moveInfo={};
const names=[...moveNames];
for(let i=0;i<names.length;i+=12){
  await Promise.all(names.slice(i,i+12).map(async n=>{
    const m=await J(`https://pokeapi.co/api/v2/move/${n}`);
    const status=m.damage_class.name==="status";
    // fixed-damage moves (Seismic Toss, Night Shade, ...) have null power: treat as 50
    moveInfo[n]={type:m.type.name,power:m.power??(status?0:50),status};
  }));
  process.stdout.write(`moves ${Math.min(i+12,names.length)}/${names.length}\r`);
}
console.log("\nmoves done");

const MOVES=[],idxOf={};
const disp=n=>n.split("-").map(w=>w[0].toUpperCase()+w.slice(1)).join(" ");
const mi=n=>{
  if(idxOf[n]==null){idxOf[n]=MOVES.length;MOVES.push([disp(n),moveInfo[n].type,moveInfo[n].power]);}
  return idxOf[n];
};
const MON={};
for(const id of ids){
  const{t,lm}=raw[id];
  const seen=new Set(),out=[];
  for(const[l,n]of lm){
    const inf=moveInfo[n];
    if(inf.status||!inf.power)continue;     // damaging moves only
    if(seen.has(n))continue;seen.add(n);
    out.push([l,mi(n)]);
  }
  MON[id]={t,lm:out};
}
// fallback for mons with no damaging level-up move in RB (Abra, Ditto, ...)
if(idxOf["struggle"]==null){idxOf["struggle"]=MOVES.length;MOVES.push(["Struggle","normal",50]);}
for(const id of ids)if(!MON[id].lm.length)MON[id].lm=[[1,idxOf["struggle"]]];

fs.writeFileSync("data.js",
  "// Generated from PokeAPI — Gen 1 (Red/Blue) level-up learnsets, modern types & move powers.\n"+
  "const GAME_DATA="+JSON.stringify({MOVES,MON})+";\n");
console.log("MOVES:",MOVES.length,"| data.js bytes:",fs.statSync("data.js").size);
