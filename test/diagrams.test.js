'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Diagrams = require('../MD-diagrams.js');
const MD = require('../MD.js');

const sample = `flowchart LR\n A[Pacient] --> B(Urgent)\n B --> C{Diagnóza}\n C -- OK --> D((Hotovo))\n C -.-> B`;
const good = [
  ['flow LR', sample, 'flow'],
  ['flow TB', 'flowchart TB\n A --> B', 'flow'],
  ['flow RL', 'graph RL\n A --> B', 'flow'],
  ['flow BT', 'flowchart BT\n A --> B', 'flow'],
  ['state', 'stateDiagram-v2\n [*] --> Active\n Active --> [*]', 'flow'],
  ['sequence', 'sequenceDiagram\n actor User as User One\n participant Agent\n User->>Agent: Hello\n activate Agent\n Note over User,Agent: Work\n Agent-->>User: Done\n deactivate Agent', 'sequence'],
  ['pie', 'pie showData\n title Results\n "pass": 76\n "fail": 4', 'pie'],
  ['flow chained', 'flowchart LR\n A --> B ==> C --- D', 'flow'],
  ['subgraph', 'flowchart TB\n subgraph Team[Team One]\n A[Start] --> B[Done]\n end', 'flow'],
  ['class', 'classDiagram\n class Animal {\n +eat()\n }\n Animal <|-- Duck', 'class'],
  ['timeline', 'timeline\n title History\n section A\n 2016 : Start\n 2026 : Reborn\n : Arctic', 'timeline'],
  ['long Unicode', 'flowchart LR\n A[Pacient a lékař 👩‍⚕️] --> B{Kontrola?}', 'flow']
];
for (const [name, source, kind] of good) {
  test(`valid diagram: ${name}`, () => {
    const ir = Diagrams.parse(source);
    assert.equal(ir.kind, kind);
    assert.ok(ir.kind !== 'flow' || ir.nodes.length > 0);
  });
}
const rejected = [
  ['javascript', 'flowchart LR\n A --> B\n click A "javascript:alert(1)"'],
  ['HTML style directive', 'flowchart LR\n A --> B\n style A fill:red'],
  ['unknown type', 'mindmap\n Root'],
  ['invalid ID', 'flowchart TB\n __proto__ --> A'],
  ['unknown arrow', 'flowchart TB\n A <--> B'],
  ['conflicting declaration', 'flowchart TB\n A[One] --> B\n A[Two]'],
  ['missing bracket', 'flowchart TB\n A[broken --> B'],
  ['unclosed group', 'flowchart TB\n subgraph Team\n A --> B'],
  ['nested group', 'flowchart TB\n subgraph A\n subgraph B\n A --> B\n end\n end'],
  ['long input', 'flowchart LR\n A --> B\n'.repeat(1100)],
  ['control label', 'flowchart LR\n A[\u0001xx] --> B'],
  ['bidi control', 'flowchart LR\n A[\u202Eevil] --> B'],
  ['unpaired activation', 'sequenceDiagram\n activate A'],
  ['sequence unknown', 'sequenceDiagram\n loop forever\n A->>B: Hi\n end'],
  ['pie negative', 'pie\n "negative": -10'],
  ['pie non-numeric', 'pie\n "A": Infinity'],
  ['pie empty', 'pie'],
  ['unknown state', 'stateDiagram-v2\n state A: hello'],
  ['oversize label', `flowchart LR\n A[${'a'.repeat(121)}] --> B`],
  ['bare script', 'flowchart LR\n <script>alert(1)</script>'],
  ['class unsafe directive', 'classDiagram\n click Animal javascript:alert(1)'],
  ['class unclosed body', 'classDiagram\n class A {\n +do()'],
  ['timeline unsupported config', 'timeline\n title X\n click A javascript:evil'],
  ['Mermaid config', '%%{init: {"securityLevel":"loose"}}%%\n flowchart LR\n A --> B']
];
for (const [name, source] of rejected) test(`reject unsupported: ${name}`, () => assert.throws(() => Diagrams.parse(source)));

test('escaping of diagram fences in parser HTML fallback', () => {
  const md = new MD({ mode: 'extended' });
  const html = md.parse('```mermaid\nflowchart LR\n A[<script>alert(1)</script>] --> B\n```');
  assert.match(html, /data-md-diagram="mermaid"/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
test('fallback in basic mode still carries diagram marker', () => {
  assert.match(new MD().parse('```mermaid\nflowchart LR\nA --> B\n```'), /data-md-diagram="mermaid"/);
});
test('reused parser remains deterministic and unchanged', () => {
  const md = new MD();
  const input = '## Header\n\n```mermaid\nflowchart TB\nA --> B\n```';
  assert.equal(md.parse(input), md.parse(input));
});

test('SVG renderer creates only namespaced text-safe nodes', () => {
  const old = global.document;
  const tags = [];
  global.document = {
    createElementNS(ns, tag) {
      assert.equal(ns, 'http://www.w3.org/2000/svg');
      tags.push(tag);
      const el = { tag, children: [], attributes: {}, textContent: '',
        appendChild(c) { this.children.push(c); return c; },
        setAttribute(key, value) { this.attributes[key] = String(value); }
      };
      return el;
    }
  };
  try {
    for (const item of [sample, 'sequenceDiagram\n A->>B: <script>alert(1)</script>', 'pie\n "</svg>": 5', 'classDiagram\n class X {\n +hello()\n }', 'timeline\n 2016 : <script>hello</script>']) {
      const tree = Diagrams.render(Diagrams.parse(item));
      assert.equal(tree.tag, 'svg');
      assert.equal(tree.attributes.role, 'img');
    }
    assert.ok(tags.length > 15);
    for (const tag of tags) assert.ok(['svg','title','desc','rect','polygon','ellipse','g','line','path','text','tspan','circle'].includes(tag), tag);
  } finally { global.document = old; }
});

test('bounded randomized parser does not spin indefinitely', () => {
  let state = 0xdeadbeef;
  const rand = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return state >>> 0; };
  const chars = 'A->|[](){};<>\'"~%:. =&!á𐐷';
  for (let j=0; j<2000; j++) {
    let s = 'flowchart TB\n';
    for (let i=0, length=rand()%180; i<length; i++) s += [...chars][rand()%[...chars].length];
    try { const ir = Diagrams.parse(s); assert.equal(ir.kind, 'flow'); }
    catch (error) { assert.ok(error instanceof Error); }
  }
});
