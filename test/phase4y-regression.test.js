const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');let ctx={};vm.runInNewContext(fs.readFileSync(path.join(root,'MD-Encyclopedia-Data.js'),'utf8'),ctx);const a=ctx.MDEncyclopediaChapters;
test('new sections and bilingual entries',()=>{for(const s of ['Arduino','Micro R']) assert.ok(a.filter(x=>x.section===s).length>=2);for(const x of a)assert.ok(x.title_en&&x.body_en&&x.body)});
test('required five interrupt cards',()=>{for(const id of ['p4y-int-08h','p4y-int-10h','p4y-int-13h','p4y-int-16h','p4y-int-21h'])assert.ok(a.some(x=>x.id===id));});
test('DOS AH index and instruction tables',()=>{assert.match(a.find(x=>x.id==='p4y-int-21h').body,/`4Ch`/);assert.match(a.find(x=>x.id==='p4y-x86-basic').body,/LOOP/);});
test('Mermaid defaults to responsive fit',()=>{let js=fs.readFileSync(path.join(root,'MD-diagrams.js'),'utf8');assert.match(js,/diagram.style.width = zoom === 1 \? '100%'/);assert.match(js,/setZoom\(1\)/);assert.match(fs.readFileSync(path.join(root,'MD.css'),'utf8'),/max-width: 100%/);});
test('extra example document exists and has valid fences',()=>{const s=fs.readFileSync(path.join(root,'examples/from-hardware-to-statistics.md'),'utf8');assert.match(s,/```mermaid/);assert.match(s,/```r/);assert.equal((s.match(/```/g)||[]).length%2,0);});
