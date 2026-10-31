const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=__dirname,ctx={};ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir,'minichem.js'),'utf8'),ctx);
const M=ctx.MiniChem;
const katexCtx={window:{},document:{compatMode:'CSS1Compat'},console};katexCtx.globalThis=katexCtx.window;
vm.runInNewContext(fs.readFileSync(path.join(dir,'vendor/katex.min.js'),'utf8'),katexCtx);
const cases=[
 ['CaCO3 ->[heat] CaO + CO2',/\\xrightarrow\{\\text\{heat\}\}/],
 ['2SO2 + O2 ->[V2O5][450 C] 2SO3',/\\xrightarrow\[\\text\{450 C\}\]\{\\text\{V2O5\}\}/],
 ['N2 + 3H2 <=> 2NH3',/\\rightleftharpoons/],
 ['A <=>[Pt][300 C] B',/\\xrightleftharpoons/],
 ['A <-[light] B',/\\xleftarrow/],
 ['A <->[UV] B',/\\xleftrightarrow/],
 ['A -> B',/\\rightarrow/]
];
for(const [s,expected] of cases){const tex=M.formula(s);assert.match(tex,expected,s);assert.match(katexCtx.window.katex.renderToString(tex,{throwOnError:true}),/katex-html/,s)}
for(const s of ['A ->[heat B','A ->[] B','A ->[heat][cold][extra] B','A ->[\\htmlId] B','A ->[x]','->[heat] B','A ->['+'z'.repeat(49)+'] B'])assert.throws(()=>M.formula(s),s);
assert.equal(M.expand('ordinary text without chemistry'),'ordinary text without chemistry');
console.log(`MiniChem Plus II: PASS ${cases.length} rendering and 7 negative cases`);
