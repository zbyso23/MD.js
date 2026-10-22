/* MD.js Reborn diagrams — bounded Mermaid-like SUBSET. Vanilla ES6, no imports.
 * No untrusted HTML/SVG interpolation. SVG via createElementNS + textContent only.
 */
(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const MAX_CHARS = 12288, MAX_LINES = 260, MAX_NODES = 120, MAX_EDGES = 200;
  const ID = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;
  const err = message => { throw new Error(message); };
  const okayLabel = (text, limit = 120) => {
    if (!text || text.length > limit || /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(text)) err('Invalid or oversized label');
    return text;
  };
  function linesOf(source) {
    if (typeof source !== 'string' || !source.trim() || source.length > MAX_CHARS) err('Diagram too large or empty');
    const lines = source.replace(/\r\n?/g, '\n').split('\n').map(line => line.trim()).filter(line => line && !/^%%(?:\s|$)/.test(line));
    if (lines.length > MAX_LINES || lines.some(line => line.length > 320)) err('Diagram line limit exceeded');
    if (lines.some(line => /^(?:click|style|classDef|linkStyle|accTitle|accDescr)(?:\b|:)|^%%\{/.test(line))) err('Unsupported Mermaid directive');
    return lines;
  }
  function readNode(line, offset) {
    const found = /^[A-Za-z][A-Za-z0-9_]{0,31}/.exec(line.slice(offset));
    if (!found) err('Expected a node ID');
    const id = found[0];
    let cursor = offset + id.length;
    let shape = 'rect', label = id;
    const formats = [['((', '))', 'circle'], ['([', '])', 'stadium'], ['[', ']', 'rect'], ['(', ')', 'round'], ['{', '}', 'diamond']];
    for (const [open, close, kind] of formats) {
      if (line.slice(cursor).startsWith(open)) {
        const end = line.indexOf(close, cursor + open.length);
        if (end < 0) err('Unclosed node label');
        label = okayLabel(line.slice(cursor + open.length, end).trim());
        shape = kind;
        cursor = end + close.length;
        break;
      }
    }
    return { node: { id, label, shape }, cursor };
  }
  function connector(src, pos) {
    const s = src.slice(pos).trimStart();
    let m;
    if ((m = /^-->\|([^|]{1,120})\|/.exec(s))) return { length: src.length - pos - s.length + m[0].length, kind: 'arrow', label: okayLabel(m[1].trim()) };
    if ((m = /^--\s+(.{1,120}?)\s+-->/.exec(s))) return { length: src.length - pos - s.length + m[0].length, kind: 'arrow', label: okayLabel(m[1].trim()) };
    if ((m = /^-\.\s+(.{1,120}?)\s+\.->/.exec(s))) return { length: src.length - pos - s.length + m[0].length, kind: 'dashed', label: okayLabel(m[1].trim()) };
    for (const [op, kind] of [['-.->', 'dashed'], ['==>', 'bold'], ['-->', 'arrow'], ['---', 'line']]) {
      if (s.startsWith(op)) return { length: src.length - pos - s.length + op.length, kind, label: '' };
    }
    return null;
  }
  function graphOf(lines, state = false) {
    const header = state ? /^stateDiagram(?:-v2)?$/.exec(lines[0]) : /^(?:flowchart|graph)\s+(LR|RL|TB|TD|BT)$/.exec(lines[0]);
    if (!header) err('Unsupported diagram header');
    const direction = state ? 'TB' : header[1] === 'TD' ? 'TB' : header[1];
    const nodes = new Map(), edges = [], groups = [];
    let activeGroup = null;
    function add(node) {
      const current = nodes.get(node.id);
      if (!current) {
        if (nodes.size >= MAX_NODES) err('Too many nodes');
        nodes.set(node.id, { ...node });
      } else if (node.label !== node.id) {
        if (current.label !== current.id && (current.label !== node.label || current.shape !== node.shape)) err('Conflicting node declaration: ' + node.id);
        Object.assign(current, node);
      }
      if (activeGroup && !activeGroup.members.includes(node.id)) activeGroup.members.push(node.id);
    }
    for (const source of lines.slice(1)) {
      if (!state && source.startsWith('subgraph ')) {
        if (activeGroup || groups.length >= 12) err('Nested or excessive subgraphs');
        const match = /^subgraph\s+(?:([A-Za-z][\w]{0,31})\s*)?(?:\[([^\]]{1,80})\]|([^\[\]]{1,80}))?$/.exec(source);
        if (!match) err('Invalid subgraph');
        activeGroup = { title: okayLabel((match[2] || match[3] || match[1] || 'Group').trim(), 80), members: [] };
        groups.push(activeGroup); continue;
      }
      if (source === 'end' && activeGroup) { activeGroup = null; continue; }
      if (state) {
        const stmt = /^(\[\*\]|[A-Za-z][A-Za-z0-9_]{0,31})\s+-->\s+(\[\*\]|[A-Za-z][A-Za-z0-9_]{0,31})(?:\s*:\s*(.{1,120}))?$/.exec(source);
        if (!stmt) err('Unsupported state syntax');
        const from = stmt[1] === '[*]' ? 'START' : stmt[1];
        const to = stmt[2] === '[*]' ? 'END' : stmt[2];
        add({ id: from, label: from === 'START' ? 'Start' : from, shape: from === 'START' ? 'circle' : 'round' });
        add({ id: to, label: to === 'END' ? 'End' : to, shape: to === 'END' ? 'circle' : 'round' });
        edges.push({ from, to, kind: 'arrow', label: stmt[3] ? okayLabel(stmt[3].trim()) : '' });
      } else {
        const first = readNode(source, 0);
        add(first.node);
        let cursor = first.cursor, from = first.node.id, count = 0;
        while (source.slice(cursor).trim()) {
          const op = connector(source, cursor);
          if (!op) err('Unsupported flowchart statement');
          cursor += op.length;
          cursor += /^\s*/.exec(source.slice(cursor))[0].length;
          const target = readNode(source, cursor);
          add(target.node);
          edges.push({ from, to: target.node.id, kind: op.kind, label: op.label });
          from = target.node.id;
          cursor = target.cursor;
          if (++count > 24) err('Too many chained edges');
        }
      }
      if (edges.length > MAX_EDGES) err('Too many edges');
    }
    if (activeGroup) err('Unclosed subgraph');
    if (!nodes.size) err('No nodes found');
    return { kind: 'flow', direction, nodes: [...nodes.values()], edges, groups };
  }
  function sequenceOf(lines) {
    if (lines[0] !== 'sequenceDiagram') err('Unsupported sequence header');
    const participants = new Map(), steps = [], active = new Set();
    const ensure = id => {
      if (!ID.test(id)) err('Invalid participant');
      if (!participants.has(id)) {
        if (participants.size >= 16) err('Too many participants');
        participants.set(id, { id, label: id, actor: false });
      }
    };
    for (const line of lines.slice(1)) {
      let m;
      if ((m = /^(participant|actor)\s+([A-Za-z][\w]{0,31})(?:\s+as\s+(.{1,90}))?$/.exec(line))) {
        ensure(m[2]);
        Object.assign(participants.get(m[2]), { label: m[3] ? okayLabel(m[3], 90) : m[2], actor: m[1] === 'actor' });
      } else if ((m = /^([A-Za-z][\w]{0,31})\s*(-->>|->>|-->|->)\s*([A-Za-z][\w]{0,31})\s*:\s*(.{1,180})$/.exec(line))) {
        ensure(m[1]); ensure(m[3]);
        steps.push({ type: 'message', from: m[1], to: m[3], dotted: m[2].startsWith('--'), label: okayLabel(m[4], 180) });
      } else if ((m = /^Note\s+(?:over|right of|left of)\s+([A-Za-z][\w]{0,31})(?:,([A-Za-z][\w]{0,31}))?\s*:\s*(.{1,180})$/i.exec(line))) {
        ensure(m[1]); if (m[2]) ensure(m[2]);
        steps.push({ type: 'note', from: m[1], to: m[2] || m[1], label: okayLabel(m[3], 180) });
      } else if ((m = /^(activate|deactivate)\s+([A-Za-z][\w]{0,31})$/.exec(line))) {
        ensure(m[2]); if (m[1] === 'activate') { if (active.has(m[2])) err('Already activated'); active.add(m[2]); }
        else { if (!active.has(m[2])) err('Not activated'); active.delete(m[2]); }
        steps.push({ type: m[1], from: m[2] });
      } else err('Unsupported sequence statement');
      if (steps.length > 120) err('Too many sequence steps');
    }
    if (active.size) err('Unclosed activation');
    if (!participants.size || !steps.length) err('Empty sequence');
    return { kind: 'sequence', participants: [...participants.values()], steps };
  }
  function pieOf(lines) {
    if (!/^pie(?:\s+showData)?$/.test(lines[0])) err('Unsupported pie header');
    const slices = [];
    let title = 'Pie chart';
    for (const line of lines.slice(1)) {
      if (/^title\s+/.test(line)) { title = okayLabel(line.slice(6).trim(), 100); continue; }
      const match = /^"([^"\n]{1,80})"\s*:\s*(\d+(?:\.\d{1,6})?)$/.exec(line);
      if (!match || slices.length >= 16) err('Invalid pie slice');
      const value = Number(match[2]);
      if (!Number.isFinite(value) || value <= 0 || value > 1e9) err('Invalid pie value');
      slices.push({ name: okayLabel(match[1], 80), value });
    }
    if (!slices.length) err('Empty pie chart');
    return { kind: 'pie', title, showData: lines[0].includes('showData'), slices };
  }
  function classOf(lines) {
    if (lines[0] !== 'classDiagram') err('Unsupported class diagram');
    const classes = new Map(), edges = [];
    let open = null;
    const ensure = id => {
      if (!ID.test(id)) err('Invalid class identifier');
      if (!classes.has(id)) {
        if (classes.size >= 60) err('Too many classes');
        classes.set(id, { id, label: id, shape: 'class', members: [] });
      }
      return classes.get(id);
    };
    const member = (id, item) => {
      const value = okayLabel(item.trim(), 80);
      const target = ensure(id);
      if (target.members.length >= 8) err('Too many class members');
      target.members.push(value);
    };
    for (const line of lines.slice(1)) {
      if (open) {
        if (line === '}') { open = null; continue; }
        member(open, line); continue;
      }
      let m;
      if ((m = /^class\s+([A-Za-z][\w]{0,31})(\s*\{)?$/.exec(line))) {
        ensure(m[1]); if (m[2]) open = m[1];
      } else if ((m = /^([A-Za-z][\w]{0,31})\s*:\s*(.{1,80})$/.exec(line))) member(m[1], m[2]);
      else if ((m = /^([A-Za-z][\w]{0,31})\s*(<\|--|\*--|o--|-->|\.\.>|--)\s*([A-Za-z][\w]{0,31})(?:\s*:\s*(.{1,70}))?$/.exec(line))) {
        ensure(m[1]); ensure(m[3]);
        const inherit = m[2] === '<|--';
        edges.push({ from: inherit ? m[3] : m[1], to: inherit ? m[1] : m[3],
          kind: m[2] === '..>' ? 'dashed' : m[2] === '--' ? 'line' : 'arrow',
          label: m[4] ? okayLabel(m[4].trim(), 70) : inherit ? 'extends' : '' });
      } else err('Unsupported class statement');
      if (edges.length > 120) err('Too many class relations');
    }
    if (open) err('Unclosed class body');
    if (!classes.size) err('Empty class diagram');
    return { kind: 'class', nodes: [...classes.values()], edges, groups: [], direction: 'LR' };
  }
  function timelineOf(lines) {
    if (lines[0] !== 'timeline') err('Unsupported timeline header');
    const entries = [];
    let title = 'Timeline', section = '';
    for (const line of lines.slice(1)) {
      if (/^title\s+/.test(line)) { title = okayLabel(line.slice(6).trim(), 100); continue; }
      if (/^section\s+/.test(line)) { section = okayLabel(line.slice(8).trim(), 60); continue; }
      if (line.startsWith(':')) {
        if (!entries.length) err('Timeline event without date');
        const item = okayLabel(line.slice(1).trim(), 160);
        if (entries[entries.length - 1].events.length >= 4) err('Too many events at date');
        entries[entries.length - 1].events.push(item);
        continue;
      }
      const m = /^([^:]{1,50})\s*:\s*(.{1,160})$/.exec(line);
      if (!m || entries.length >= 30) err('Invalid timeline item');
      entries.push({ when: okayLabel(m[1].trim(), 50), events: [okayLabel(m[2].trim(), 160)], section });
    }
    if (!entries.length) err('Empty timeline');
    return { kind: 'timeline', title, entries };
  }
  function parse(source) {
    const lines = linesOf(source);
    if (/^(flowchart|graph)\s/.test(lines[0])) return graphOf(lines);
    if (/^stateDiagram/.test(lines[0])) return graphOf(lines, true);
    if (lines[0] === 'sequenceDiagram') return sequenceOf(lines);
    if (/^pie(?:\s|$)/.test(lines[0])) return pieOf(lines);
    if (lines[0] === 'classDiagram') return classOf(lines);
    if (lines[0] === 'timeline') return timelineOf(lines);
    return err('Unsupported Mermaid diagram type');
  }

  function element(tag, attrs = {}, content) {
    const el = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(name => el.setAttribute(name, String(attrs[name])));
    if (content !== undefined) el.textContent = String(content);
    return el;
  }
  function svgBase(width, height, titleText, description) {
    const svg = element('svg', { xmlns: NS, viewBox: `0 0 ${Math.ceil(width)} ${Math.ceil(height)}`, width: Math.ceil(width), height: Math.ceil(height), role: 'img', 'aria-label': titleText, class: 'md-svg' });
    svg.appendChild(element('title', {}, titleText));
    svg.appendChild(element('desc', {}, description));
    return svg;
  }
  function text(parent, x, y, label, extra = {}) {
    const el = element('text', { x, y, 'text-anchor': 'middle', ...extra }, label);
    parent.appendChild(el);
    return el;
  }
  function wrapped(value, chars = 22, max = 6) {
    const words = value.split(/\s+/), lines = [], token = [];
    for (const word of words) {
      if ((token.join(' ').length + 1 + word.length > chars) && token.length) { lines.push(token.join(' ')); token.length = 0; }
      if (word.length > chars) {
        if (token.length) { lines.push(token.join(' ')); token.length = 0; }
        for (let i = 0; i < word.length; i += chars) lines.push(word.slice(i, i + chars));
      } else token.push(word);
    }
    if (token.length) lines.push(token.join(' '));
    return lines.slice(0, max).concat(lines.length > max ? ['…'] : []);
  }
  function caption(parent, cx, cy, label, cls = 'md-diagram-text') {
    const parts = wrapped(label);
    const labelNode = element('text', { 'text-anchor': 'middle', class: cls });
    parts.forEach((part, index) => labelNode.appendChild(element('tspan', { x: cx, y: cy + (index - (parts.length - 1) / 2) * 17 + 5 }, part)));
    parent.appendChild(labelNode);
  }
  function arrow(parent, fromX, fromY, toX, toY, type = 'arrow') {
    if (type === 'line') return;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const length = type === 'bold' ? 13 : 10, spread = 0.50;
    const x1 = toX - length * Math.cos(angle - spread), y1 = toY - length * Math.sin(angle - spread);
    const x2 = toX - length * Math.cos(angle + spread), y2 = toY - length * Math.sin(angle + spread);
    parent.appendChild(element('polygon', { points: `${toX},${toY} ${x1},${y1} ${x2},${y2}`, class: 'md-diagram-arrow' }));
  }
  function drawFlow(ir) {
    const vertical = ['TB', 'BT'].includes(ir.direction), reverse = ['RL', 'BT'].includes(ir.direction);
    const level = new Map(ir.nodes.map(n => [n.id, 0]));
    const indegree = new Map(ir.nodes.map(n => [n.id, 0]));
    const outgoing = new Map(ir.nodes.map(n => [n.id, []]));
    ir.edges.forEach(e => { indegree.set(e.to, indegree.get(e.to) + 1); outgoing.get(e.from).push(e.to); });
    const queue = ir.nodes.filter(n => indegree.get(n.id) === 0).map(n => n.id);
    // Bounded topological layering; cyclic remainders stay in rank 0, not an infinite loop.
    for (let j = 0; j < queue.length; j++) {
      const key = queue[j];
      for (const dest of outgoing.get(key)) {
        level.set(dest, Math.max(level.get(dest), Math.min(40, level.get(key) + 1)));
        indegree.set(dest, indegree.get(dest) - 1);
        if (!indegree.get(dest)) queue.push(dest);
      }
    }
    const maxRank = Math.max(...level.values());
    const buckets = new Map();
    ir.nodes.forEach(n => { const rank = level.get(n.id); if (!buckets.has(rank)) buckets.set(rank, []); buckets.get(rank).push(n); });
    const most = Math.max(...[...buckets.values()].map(bucket => bucket.length));
    const stepMain = 255, stepSide = 190, margin = 92;
    const width = vertical ? Math.max(440, most * stepSide + 2 * margin) : Math.max(440, (maxRank + 1) * stepMain + 2 * margin);
    const height = vertical ? Math.max(320, (maxRank + 1) * stepMain + 2 * margin) : Math.max(320, most * stepSide + 2 * margin);
    const positions = new Map();
    for (const [rank, bucket] of buckets) {
      bucket.forEach((n, index) => {
        const side = (index - (bucket.length - 1) / 2) * stepSide;
        const main = (reverse ? maxRank - rank : rank) * stepMain;
        positions.set(n.id, { x: vertical ? width / 2 + side : margin + main, y: vertical ? margin + main : height / 2 + side });
      });
    }
    const svg = svgBase(width, height, `${ir.nodes.length} node flowchart`, 'Read the source code for a linear accessible description.');
    // Groups drawn behind edges and nodes.
    for (const group of ir.groups) {
      const coords = group.members.map(id => positions.get(id)).filter(Boolean);
      if (!coords.length) continue;
      const left = Math.min(...coords.map(p => p.x)) - 106, right = Math.max(...coords.map(p => p.x)) + 106;
      const top = Math.min(...coords.map(p => p.y)) - 78, bottom = Math.max(...coords.map(p => p.y)) + 65;
      svg.appendChild(element('rect', { x: left, y: top, width: right - left, height: bottom - top, rx: 16, class: 'md-diagram-group' }));
      text(svg, (left + right) / 2, top + 17, group.title, { class: 'md-diagram-group-title' });
    }
    const edgeG = element('g', { class: 'md-diagram-edges' }); svg.appendChild(edgeG);
    ir.edges.forEach(e => {
      const a = positions.get(e.from), b = positions.get(e.to);
      const loop = e.from === e.to;
      const angle = loop ? 0 : Math.atan2(b.y - a.y, b.x - a.x);
      const x1 = a.x + 84 * Math.cos(angle), y1 = a.y + 47 * Math.sin(angle);
      const x2 = b.x - 84 * Math.cos(angle), y2 = b.y - 47 * Math.sin(angle);
      if (loop) {
        edgeG.appendChild(element('path', { d: `M${a.x+65},${a.y-20} C${a.x+170},${a.y-105} ${a.x+180},${a.y+105} ${a.x+65},${a.y+20}`, class: `md-diagram-edge ${e.kind === 'dashed' ? 'md-dashed' : ''}` }));
        arrow(edgeG, a.x+100, a.y+42, a.x+65, a.y+20, e.kind);
        if (e.label) text(edgeG, a.x+160, a.y, e.label, { class: 'md-diagram-edge-label' });
      } else {
        const curve = vertical ? `M${x1},${y1} C${x1},${(y1+y2)/2} ${x2},${(y1+y2)/2} ${x2},${y2}`
          : `M${x1},${y1} C${(x1+x2)/2},${y1} ${(x1+x2)/2},${y2} ${x2},${y2}`;
        edgeG.appendChild(element('path', { d: curve, class: `md-diagram-edge ${e.kind === 'dashed' ? 'md-dashed' : ''} ${e.kind === 'bold' ? 'md-bold-edge' : ''}` }));
        arrow(edgeG, vertical ? x2 : x2 - Math.cos(angle) * 14, vertical ? y2 - Math.sin(angle) * 14 : y2, x2, y2, e.kind);
        if (e.label) text(edgeG, (x1 + x2) / 2, (y1 + y2) / 2 - 8, e.label, { class: 'md-diagram-edge-label' });
      }
    });
    ir.nodes.forEach(node => {
      const pos = positions.get(node.id), g = element('g', { class: 'md-diagram-node' });
      const labelLines = wrapped(node.label);
      const h = node.shape === 'class' ? Math.max(72, 42 + node.members.length * 19) : Math.max(54, 22 + labelLines.length * 18);
      if (node.shape === 'class') {
        g.appendChild(element('rect', { x: pos.x-96, y: pos.y-h/2, width: 192, height: h, rx: 5, class: 'md-diagram-shape' }));
        g.appendChild(element('line', { x1: pos.x-96, y1: pos.y-h/2+33, x2: pos.x+96, y2: pos.y-h/2+33, class: 'md-diagram-class-divider' }));
        text(g, pos.x, pos.y-h/2+23, node.label, { class: 'md-diagram-class-title' });
        node.members.forEach((member, i) => {
          const clipped = member.length > 26 ? member.slice(0, 25) + '…' : member;
          const part = element('text', { x: pos.x-86, y: pos.y-h/2+54 + i*19, class: 'md-diagram-member' }, clipped);
          g.appendChild(part);
        });
      } else if (node.shape === 'diamond') {
        const radius = Math.max(90, h);
        g.appendChild(element('polygon', { points: `${pos.x},${pos.y-radius*.72} ${pos.x+110},${pos.y} ${pos.x},${pos.y+radius*.72} ${pos.x-110},${pos.y}`, class: 'md-diagram-shape' }));
      } else if (node.shape === 'circle') {
        g.appendChild(element('ellipse', { cx: pos.x, cy: pos.y, rx: 92, ry: Math.max(45, h/2), class: 'md-diagram-shape' }));
      } else {
        g.appendChild(element('rect', { x: pos.x-90, y: pos.y-h/2, width: 180, height: h, rx: node.shape === 'rect' ? 3 : node.shape === 'round' ? 13 : 35, class: 'md-diagram-shape' }));
      }
      if (node.shape !== 'class') caption(g, pos.x, pos.y, node.label);
      svg.appendChild(g);
    });
    return svg;
  }
  function drawSequence(ir) {
    const margin = 115, stepX = 235, stepY = 95;
    const width = Math.max(440, margin * 2 + (ir.participants.length - 1) * stepX);
    const height = 150 + ir.steps.filter(s => s.type === 'message' || s.type === 'note').length * stepY + 75;
    const pos = new Map(ir.participants.map((p, i) => [p.id, margin + i*stepX]));
    const svg = svgBase(width, height, 'Sequence diagram', `${ir.steps.length} steps`);
    ir.participants.forEach(p => {
      const x = pos.get(p.id);
      svg.appendChild(element('line', { x1: x, y1: 95, x2: x, y2: height-46, class: 'md-diagram-lifeline' }));
      svg.appendChild(element('rect', { x: x-95, y: 27, width: 190, height: 51, rx: p.actor ? 26 : 7, class: 'md-diagram-shape' }));
      caption(svg, x, 51, p.label);
    });
    const activations = new Map();
    let y = 133;
    ir.steps.forEach(s => {
      if (s.type === 'activate') { activations.set(s.from, y); return; }
      if (s.type === 'deactivate') {
        const start = activations.get(s.from);
        if (start !== undefined) svg.appendChild(element('rect', { x: pos.get(s.from)-6, y: start, width: 12, height: Math.max(5, y-start), class: 'md-diagram-activation' }));
        activations.delete(s.from); return;
      }
      const x1 = pos.get(s.from), x2 = pos.get(s.to);
      if (s.type === 'note') {
        const center = (x1+x2)/2;
        svg.appendChild(element('rect', { x: center-100, y: y-31, width: 200, height: 61, rx: 7, class: 'md-diagram-note' }));
        caption(svg, center, y, s.label, 'md-diagram-note-text');
      } else if (x1 === x2) {
        svg.appendChild(element('path', { d: `M${x1},${y} h75 v35 h-75`, class: 'md-diagram-edge' }));
        arrow(svg, x1+18, y+35, x1, y+35);
        caption(svg, x1+84, y-24, s.label, 'md-diagram-edge-label');
      } else {
        svg.appendChild(element('line', { x1, y1: y, x2, y2: y, class: `md-diagram-edge ${s.dotted ? 'md-dashed' : ''}` }));
        arrow(svg, x1, y, x2, y);
        caption(svg, (x1+x2)/2, y-24, s.label, 'md-diagram-edge-label');
      }
      y += stepY;
    });
    return svg;
  }
  function drawPie(ir) {
    const width = 660, height = Math.max(300, 90 + ir.slices.length*26);
    const svg = svgBase(width, height, ir.title, `${ir.slices.length} slices`);
    text(svg, width/2, 32, ir.title, { class: 'md-diagram-pie-title' });
    const total = ir.slices.reduce((sum, slice) => sum+slice.value, 0);
    let angle = -Math.PI/2;
    ir.slices.forEach((slice, index) => {
      const delta = slice.value / total * 2 * Math.PI;
      const color = `var(--md-pie-${index % 8})`;
      const attrs = { class: 'md-diagram-sector', fill: color };
      if (delta > 2*Math.PI-0.000001) svg.appendChild(element('circle', { cx: 165, cy: height/2+15, r: 105, ...attrs }));
      else {
        const a = angle, b = angle + delta;
        const point = t => `${165+105*Math.cos(t)},${height/2+15+105*Math.sin(t)}`;
        svg.appendChild(element('path', { d: `M165,${height/2+15} L${point(a)} A105,105 0 ${delta > Math.PI ? 1 : 0} 1 ${point(b)} Z`, ...attrs }));
      }
      angle += delta;
      const y = 65 + index*26;
      svg.appendChild(element('rect', { x: 318, y: y-12, width: 14, height: 14, rx: 2, fill: color }));
      const value = ir.showData ? ` — ${slice.value}` : ` — ${(slice.value/total*100).toFixed(1)}%`;
      const clippedName = slice.name.length > 29 ? slice.name.slice(0, 28)+'…' : slice.name;
      const label = element('text', { x: 342, y, class: 'md-diagram-legend' }, clippedName + value);
      svg.appendChild(label);
    });
    return svg;
  }
  function drawTimeline(ir) {
    const width = Math.max(500, ir.entries.length * 240 + 80), height = 430;
    const svg = svgBase(width, height, ir.title, `${ir.entries.length} timeline milestones`);
    text(svg, width/2, 35, ir.title, { class: 'md-diagram-pie-title' });
    const middle = 225;
    svg.appendChild(element('line', { x1: 80, y1: middle, x2: width-80, y2: middle, class: 'md-diagram-edge' }));
    ir.entries.forEach((item, i) => {
      const cx = 120 + i*240;
      const upper = i % 2 === 0;
      const cardTop = upper ? 72 : 264;
      svg.appendChild(element('line', { x1: cx, y1: middle, x2: cx, y2: upper ? 196 : 264, class: 'md-diagram-edge md-dashed' }));
      svg.appendChild(element('circle', { cx, cy: middle, r: 7, class: 'md-diagram-shape' }));
      svg.appendChild(element('rect', { x: cx-107, y: cardTop, width: 214, height: 127, rx: 9, class: 'md-diagram-shape' }));
      text(svg, cx, cardTop+23, item.when, { class: 'md-diagram-class-title' });
      if (item.section) text(svg, cx, cardTop+42, item.section.slice(0, 29), { class: 'md-diagram-group-title' });
      const details = item.events.join(' · ');
      caption(svg, cx, cardTop + (item.section ? 84 : 75), details, 'md-diagram-note-text');
    });
    return svg;
  }
  function render(ir) {
    if (typeof document === 'undefined' || !document.createElementNS) err('Rendering requires a browser DOM');
    if (ir.kind === 'flow' || ir.kind === 'class') return drawFlow(ir);
    if (ir.kind === 'timeline') return drawTimeline(ir);
    if (ir.kind === 'sequence') return drawSequence(ir);
    if (ir.kind === 'pie') return drawPie(ir);
    return err('Unsupported diagram');
  }
  function control(label, action, help) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'md-diagram-button';
    button.textContent = label;
    button.setAttribute('aria-label', help || label);
    button.addEventListener('click', action);
    return button;
  }
  function enhance(container) {
    if (!container || !container.querySelectorAll) return { mounted: 0, fallback: 0 };
    let mounted = 0, fallback = 0;
    const sources = container.querySelectorAll('pre[data-md-diagram="mermaid"]');
    Array.from(sources).forEach(pre => {
      // Do not read source from HTML attributes or embedded scripts.
      const code = pre.querySelector('code');
      if (!code) return;
      const source = code.textContent;
      let diagram;
      try { diagram = render(parse(source)); }
      catch (e) {
        fallback++;
        pre.classList.add('md-diagram-fallback');
        pre.setAttribute('title', `Diagram fallback: ${e.message}`);
        return;
      }
      const frame = document.createElement('figure'); frame.className = 'md-diagram';
      const bar = document.createElement('div'); bar.className = 'md-diagram-toolbar';
      const wrap = document.createElement('div'); wrap.className = 'md-diagram-viewport';
      const help = document.createElement('span'); help.className = 'md-diagram-hint'; help.textContent = 'Diagram · SVG';
      bar.appendChild(help);
      let zoom = 1;
      function setZoom(next) {
        zoom = Math.min(2.5, Math.max(0.5, next));
        diagram.style.width = `${Math.round(Number(diagram.getAttribute('width')) * zoom)}px`;
        diagram.style.height = `${Math.round(Number(diagram.getAttribute('height')) * zoom)}px`;
      }
      bar.appendChild(control('−', () => setZoom(zoom-0.25), 'Oddálit diagram'));
      bar.appendChild(control('100%', () => setZoom(1), 'Obnovit velikost diagramu'));
      bar.appendChild(control('+', () => setZoom(zoom+0.25), 'Přiblížit diagram'));
      const sourceButton = control('Zdroj', () => {
        const show = pre.hidden;
        pre.hidden = !show;
        wrap.hidden = show;
        sourceButton.setAttribute('aria-pressed', String(show));
      }, 'Přepnout zdroj diagramu');
      sourceButton.setAttribute('aria-pressed', 'false'); bar.appendChild(sourceButton);
      wrap.appendChild(diagram);
      frame.appendChild(bar); frame.appendChild(wrap);
      pre.parentNode.replaceChild(frame, pre);
      pre.hidden = true;
      frame.appendChild(pre);
      mounted++;
    });
    return { mounted, fallback };
  }
  const api = Object.freeze({ parse, render, enhance });
  root.MDDiagrams = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
