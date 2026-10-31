const assert=require('node:assert/strict');const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'minichem.js'),'utf8'),ctx);const M=ctx.MiniChem;
for(const [input,regex] of [['H2O',/H.*_\{2\}.*O/],['Ca(OH)2',/Ca.*O.*H.*_\{2\}/],['SO4^2-',/O.*_\{4\}.*\^\{2-\}/],['2H2 + O2 -> 2H2O',/\\rightarrow/],['Na+',/\^\{\+\}/],['H2SO4',/_\{2\}.*_\{4\}/]]){assert.match(M.formula(input),regex,input);}
assert.equal(M.expand('x+\\ce{H2O}'), 'x+\\mathrm{H}_{2}\\mathrm{O}');
for(const bad of ['x','H_{2}','H2 ->','H'.repeat(2049)])assert.throws(()=>M.formula(bad));
console.log('MiniChem Basic: PASS');
