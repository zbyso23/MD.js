const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const enc=fs.readFileSync(path.join(root,'MD-Encyclopedia.css'),'utf8');
const ex=fs.readFileSync(path.join(root,'examples/index.html'),'utf8');
test('encyclopedia print hides the application only if the overlay is visible',()=>{
 assert.match(enc,/body:has\(> \.md-ency-overlay:not\(\[hidden\]\)\) > :not\(\.md-ency-overlay\)/);
 assert.doesNotMatch(enc,/body>\*:not\(\.md-ency-overlay\)/);
});
test('hidden overlay remains hidden in print',()=>assert.match(enc,/\.md-ency-overlay\[hidden\]\{display:none!important\}/));
test('print expands preview and hides source pane',()=>{
 assert.match(ex,/main>\.pane:first-child\{display:none!important\}/);
 assert.match(ex,/max-height:none!important;overflow:visible!important/);
});
