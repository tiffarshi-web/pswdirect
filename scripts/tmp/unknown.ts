import { readFileSync, readdirSync } from "fs";
const locs:string[]=[];
for(const f of readdirSync("public").filter(f=>/^sitemap-main(-\d+)?\.xml$/.test(f)))
  for(const m of readFileSync(`public/${f}`,"utf8").matchAll(/<loc>([^<]+)<\/loc>/g)) locs.push(new URL(m[1]).pathname);
const app=readFileSync("src/App.tsx","utf8");
const known=new Set<string>();
for(const m of app.matchAll(/path="\/([^"*:]+)"/g)) known.add(m[1]);
const mods=readdirSync("src/pages/seo").filter(f=>f.endsWith(".ts")||f.endsWith(".tsx"));
const unknown=locs.map(p=>p.replace(/^\//,"")).filter(s=>s&&!known.has(s));
// which module mentions each unknown slug
const owner:Record<string,string[]>={};
const srcs=mods.map(f=>[f,readFileSync(`src/pages/seo/${f}`,"utf8")] as const);
for(const s of unknown.slice(0,4000)){
  const hit=srcs.filter(([,c])=>c.includes(`"${s}"`)||c.includes(`'${s}'`)).map(([f])=>f);
  const key=hit.join(",")||"NONE";
  (owner[key]??=[]).push(s);
}
for(const [k,v] of Object.entries(owner).sort((a,b)=>b[1].length-a[1].length).slice(0,15)) console.log(v.length, k, v.slice(0,3));
