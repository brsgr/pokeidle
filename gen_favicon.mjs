// Generates favicon.png (32x32) and apple-touch-icon.png (180x180):
// an original 16x16 pixel-art pokeball, upscaled nearest-neighbor.
import fs from "node:fs";
import zlib from "node:zlib";

const SIZE=16,C=7.5;
const COL={
  K:[26,26,26,255],      // outline / band
  R:[227,53,13,255],     // red top
  L:[255,128,96,255],    // highlight
  W:[248,248,248,255],   // white bottom
  S:[216,216,206,255],   // bottom shade
  B:[255,255,255,255],   // button
  _:[0,0,0,0],           // transparent
};
function pixel(x,y){
  const r=Math.hypot(x-C,y-C);
  if(r>7.9)return"_";
  if(r>6.6)return"K";
  const rb=Math.hypot(x-C,y-C);
  if(rb<1.6)return"B";
  if(rb<2.8)return"K";
  if(Math.abs(y-C)<=1.0)return"K";
  if(y<C)return Math.hypot(x-5,y-4)<1.9?"L":"R";
  return y>=12.5?"S":"W";
}
const grid=[...Array(SIZE)].map((_,y)=>[...Array(SIZE)].map((_,x)=>pixel(x,y)));
console.log(grid.map(r=>r.map(c=>c==="_"?".":c).join("")).join("\n"));

/* ---- minimal PNG writer ---- */
const crcTable=[...Array(256)].map((_,n)=>{
  let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;
});
const crc32=buf=>{let c=0xffffffff;for(const b of buf)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
function chunk(type,data){
  const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
  const td=Buffer.concat([Buffer.from(type),data]);
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len,td,crc]);
}
function writePng(path,px,w,h){ // px: flat RGBA array
  const raw=Buffer.alloc(h*(w*4+1));
  for(let y=0;y<h;y++){
    raw[y*(w*4+1)]=0; // filter: none
    for(let x=0;x<w*4;x++)raw[y*(w*4+1)+1+x]=px[y*w*4+x];
  }
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);
  ihdr[8]=8;ihdr[9]=6;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
  fs.writeFileSync(path,Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk("IHDR",ihdr),
    chunk("IDAT",zlib.deflateSync(raw,{level:9})),
    chunk("IEND",Buffer.alloc(0)),
  ]));
  console.log(path,w+"x"+h,fs.statSync(path).size+" bytes");
}
function render(scale,canvas,offset){
  const px=new Uint8Array(canvas*canvas*4);
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const[cr,cg,cb,ca]=COL[grid[y][x]];
    for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){
      const py=offset+y*scale+dy,pxx=offset+x*scale+dx;
      const i=(py*canvas+pxx)*4;
      px[i]=cr;px[i+1]=cg;px[i+2]=cb;px[i+3]=ca;
    }
  }
  return px;
}
writePng("favicon.png",render(2,32,0),32,32);
writePng("apple-touch-icon.png",render(11,180,2),180,180);
