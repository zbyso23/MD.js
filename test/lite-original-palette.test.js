const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');const css=fs.readFileSync(path.join(root,'MD.css'),'utf8');const js=fs.readFileSync(path.join(root,'MD.js'),'utf8');const enc=fs.readFileSync(path.join(root,'MD-Encyclopedia.js'),'utf8');
test('original light language palettes retained',()=>{for(const c of ['#ffedc5','#edffc5','#f5f6ff','#6a709a','#11442c','#99a4d6','#b75757','#3d6562'])assert.ok(css.includes(c),c)});
test('per-language CSS applied to pre and full width',()=>{assert.match(css,/pre\.md-code\.md-code-syntax-lang-javascript/);assert.match(css,/width:100%/);assert.match(css,/pre\.md-code code/)});
test('language labels rendered',()=>assert.match(js,/md-code-syntax-lang-label/));
test('Assembler tab removed',()=>assert.doesNotMatch(enc,/['"]Assembler['"]/));

test('Code tabs use normal fenced highlighter',()=>{const docux=fs.readFileSync(path.join(root,'MD-docux.js'),'utf8');assert.match(docux,/const preview=new root\.MD/);assert.match(docux,/content\.innerHTML=colored\.innerHTML/);});
