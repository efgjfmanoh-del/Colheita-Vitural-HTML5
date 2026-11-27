import {readFileSync} from 'node:fs';
function validate(d){
 const assert=(c,m)=>{if(!c)throw Error(m)};
 const inside=(p,poly)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!=(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c}return c};
 const samples=(pts,step=3)=>pts.flatMap((p,i)=>{if(!i)return [p];const a=pts[i-1],n=Math.ceil(Math.hypot(p[0]-a[0],p[1]-a[1])/step);return Array.from({length:n},(_,k)=>[a[0]+(p[0]-a[0])*(k+1)/n,a[1]+(p[1]-a[1])*(k+1)/n])});
 const bbox=p=>[Math.min(...p.map(x=>x[0])),Math.min(...p.map(x=>x[1])),Math.max(...p.map(x=>x[0])),Math.max(...p.map(x=>x[1]))];
 const bounds=[0,0,d.reference.width,d.reference.height];
 const validPoint=p=>p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&p[0]>=0&&p[1]>=0&&p[0]<=bounds[2]&&p[1]<=bounds[3];
 assert(d.fields.length===18,"18 fields");
 assert([1,2,3,4,5,6,7,8].map(i=>d.fields.filter(f=>f.row===i).length).join(",")==="3,2,3,3,1,2,3,1","eight agricultural rows");
 assert(new Set(d.fields.map(f=>f.id)).size===18,"unique field IDs");assert(d.fields.every(f=>f.polygon.every(p=>p[0]>=650)),"east-only cultivation");
 for(let i=0;i<d.fields.length;i++){const f=d.fields[i],a=bbox(f.polygon);assert(f.polygon.every(validPoint)&&validPoint(f.gate.at),"field bounds "+f.id);assert(f.gate.at[1]===a[3],"gate at bottom "+f.id);for(let j=i+1;j<d.fields.length;j++){const b=bbox(d.fields[j].polygon);assert(a[2]<=b[0]||b[2]<=a[0]||a[3]<=b[1]||b[3]<=a[1],"field overlap "+f.id)}}
 for(const road of d.roads){assert(road.points.every(validPoint)&&road.width>0,"road bounds "+road.id);for(const field of d.fields)assert(!samples(road.points).some(p=>inside(p,field.polygon)),"road center intersects crop "+road.id+" "+field.id)}
 for(const w of d.water.channels){assert(w.points.every(validPoint),"water bounds");for(let i=1;i<w.points.length;i++)assert(w.points[i][2]<=w.points[i-1][2],"uphill flow "+w.id)}
 for(const f of d.water.falls)assert(f.from>f.to&&validPoint(f.at),"waterfall direction");
 assert(d.water.falls.length===4&&d.bridges.length===3,"hydro landmarks");
 assert(d.residence.objects.every(o=>o.footprint?o.footprint.every(p=>inside(p,d.residence.boundary)):inside(o.position,d.residence.boundary)),"residence objects within fence");
 return {fields:d.fields.length,rows:[3,2,3,3,1,2,3,1],roads:d.roads.length,roadFieldChecks:d.roads.length*d.fields.length,bridges:d.bridges.length,falls:d.water.falls.length};
}
const data=JSON.parse(readFileSync(new URL('./layout.json',import.meta.url),'utf8'));console.log('PASS',JSON.stringify(validate(data)));
