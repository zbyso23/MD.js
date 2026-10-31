const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ctx={console}; ctx.globalThis=ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../MD.js'),'utf8'),ctx);
const MD = ctx.MD || ctx.MDJS || ctx.Markdown;
test('math block remains exact, preserving TeX double slashes',()=>{
  const input=String.raw`$$
\begin{bmatrix}
a & b \\
c & d
\end{bmatrix}
$$`;
  const ctor = MD && (typeof MD==='function'?MD:(MD.Markdown||MD.Renderer));
  assert.ok(ctor,'Markdown export exists');
  const instance = new ctor();
  const html=instance.render?instance.render(input):(instance.parse?instance.parse(input):instance.toHTML(input));
  assert.match(html,/md-math-source/);
  assert.ok(html.includes(String.raw`a &amp; b \\`));
});
