const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..','..');
const katex=fs.readFileSync(path.join(__dirname,'vendor/katex.min.js'),'utf8');
const math=fs.readFileSync(path.join(__dirname,'math.js'),'utf8');
const scope={}; scope.globalThis=scope;vm.createContext(scope);vm.runInContext(katex,scope);vm.runInContext(math,scope);
test('KaTeX offline renderer is available',()=>{assert.match(scope.katex.version,/^0\.16\./);assert.match(scope.katex.renderToString('\\frac{1}{2}'),/katex/)});
test('both inline and display delimiters parsed',()=>{const a=scope.MDMathPlugin.parse('x=$x^2$ and $$\\int_0^1 x dx$$');assert.equal(a.filter(x=>x.tex!==undefined).length,2);assert.equal(a.filter(x=>x.display).length,1)});
test('KaTeX does not trust HTML',()=>{const s=scope.katex.renderToString('\\href{javascript:alert(1)}{click}',{trust:false,throwOnError:false});assert.doesNotMatch(s,/href="javascript:/)});
test('offline entry points link math plugin',()=>{for(const p of ['index.html','MD-Playground.html']){const f=path.join(root,p);if(fs.existsSync(f)&&fs.readFileSync(f,'utf8').includes('MD-Encyclopedia.js'))assert.match(fs.readFileSync(f,'utf8'),/optional\/math\/math\.js/);}});
