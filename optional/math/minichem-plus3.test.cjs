const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx={};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'minichem.js'),'utf8'),ctx);const M=ctx.MiniChem;
const kc={window:{},document:{compatMode:'CSS1Compat'},console};kc.globalThis=kc.window;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'vendor/katex.min.js'),'utf8'),kc);
const formulas=['K4[Fe(CN)6]','Al2(SO4)3','(NH4)2SO4','^{14}C','^{235}_{92}U','H2O(l)','CaCO3 ->[heat] CaO + CO2','N2 + 3H2 <=> 2NH3'];
for(const s of formulas){const d=M.diagnose(s);assert.equal(d.ok,true,`${s}: ${d.message}`);assert.match(kc.window.katex.renderToString(d.tex,{throwOnError:true}),/katex-html/);}
const mixed=String.raw`\Delta H = H_{\ce{H2O(l)}} - H_{\ce{H2O(g)}}`;assert.match(kc.window.katex.renderToString(M.expand(mixed),{throwOnError:true}),/katex-html/);
for(const input of ['Al2(SO4]3','K4[Fe(CN)6','X ->[heat B','Fe^{0+}','X'.repeat(2049)]){const d=M.diagnose(input);assert.equal(d.ok,false,input);assert.equal(typeof d.index,'number');assert.ok(d.hint);}
assert.equal(M.diagnose('Al2(SO4]3').index,7);
console.log('MiniChem Plus III: PASS 8 formulas, 1 mixed formula, 5 negatives, diagnostic index');
