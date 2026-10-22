/*
 * MD.js Reborn — standalone, safe-by-default Markdown renderer.
 * Derived from the user's MD.js (2016); modern ES6 rewrite (2026).
 * ZERO runtime dependencies, no imports, no eval or DOM required.
 * The output is an HTML string: use it only in an HTML context.
 * This is a pragmatic GFM-oriented Markdown subset, NOT full CommonMark conformance.
 */
(function (root) {
  'use strict';

  let nextDocumentId = 1;
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);


  // Bounded HTML entity decoding for ordinary text and attribute content.
  // We always escape the decoded value at HTML serialization, never inject markup.
  const ENTITIES = Object.freeze({amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:'\u00a0',
    copy:'©', reg:'®', trade:'™', hellip:'…', mdash:'—', ndash:'–', euro:'€'});
  function decodeEntities(text) {
    return String(text).replace(/&(#(?:[xX][0-9a-fA-F]{1,6}|[0-9]{1,7})|[a-zA-Z]{2,12});/g, (whole, entity) => {
      if (entity[0] !== '#') return Object.prototype.hasOwnProperty.call(ENTITIES, entity) ? ENTITIES[entity] : whole;
      const hex = entity[1] === 'x' || entity[1] === 'X';
      const point = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (!Number.isFinite(point) || point <= 0 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) return '\ufffd';
      // Make C0 controls nonfunctional and visible as replacement glyphs.
      if ((point < 0x20 && point !== 9 && point !== 10) || point === 0x7f) return '\ufffd';
      return String.fromCodePoint(point);
    });
  }
  function refKey(label) { return label.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 150); }

  const LANG = /^[a-z][a-z0-9_-]{0,31}$/;
  const HIGHLIGHT_TYPES = new Set(['command', 'controls', 'symbol', 'comment', 'attribute-name', 'attribute-value']);
  const MAX_NESTING = 12;
  const MAX_INLINE_NESTING = 12;
  const EXTENDED_LANGUAGES = new Set(['general', 'javascript', 'js', 'python', 'py', 'html', 'css', 'bash', 'sh', 'ini', 'php', 'json']);

  function safeURL(raw, image = false) {
    const url = String(raw).trim();
    // Never accept controls, whitespace, backslashes, encoded entity tricks in destinations.
    if (!url || /[\u0000-\u0020\u007f\\]/.test(url) || url.length > 4096) return null;
    if (url.startsWith('//')) return null; // explicit protocol required for external URLs
    const match = /^([a-z][a-z0-9+.-]*):/i.exec(url);
    if (match && (image ? ['http', 'https'] : ['http', 'https', 'mailto']).indexOf(match[1].toLowerCase()) === -1) return null;
    // Relative URL can never contain a colon before the first path segment.
    if (!match && !/^(?:\/|\.\/|\.\.\/|#|\?|[^/:?#]+(?:[/?#]|$))/.test(url)) return null;
    // A scheme reconstructed from numeric HTML entities will not be accepted either.
    if (/&(?:#(?:x[\da-f]+|\d+)|colon|tab|newline);/i.test(url)) return null;
    try {
      const parsed = new URL(url, 'https://mdjs.invalid/');
      if (['http:', 'https:', ...(image ? [] : ['mailto:'])].indexOf(parsed.protocol) === -1) return null;
    } catch (_) { return null; }
    return url;
  }

  function splitTableRow(line) {
    let body = line.trim();
    if (body.startsWith('|')) body = body.slice(1);
    if (body.endsWith('|') && !body.endsWith('\\|')) body = body.slice(0, -1);
    const cells = [];
    let cell = '';
    let escape = false;
    let backticks = 0;
    for (const char of body) {
      if (escape) { cell += char; escape = false; continue; }
      if (char === '\\') { escape = true; cell += char; continue; }
      if (char === '`') { backticks = backticks ? 0 : 1; cell += char; continue; }
      if (char === '|' && !backticks) { cells.push(cell.trim()); cell = ''; continue; }
      cell += char;
    }
    if (escape) cell += '\\';
    cells.push(cell.trim());
    return cells;
  }

  function tableAlignment(line, expected) {
    const parts = splitTableRow(line);
    if (parts.length !== expected || expected < 2 || expected > 64) return null;
    const aligns = [];
    for (const part of parts) {
      if (!/^:?-{3,}:?$/.test(part.replace(/[ \t]/g, ''))) return null;
      const left = part.startsWith(':');
      const right = part.endsWith(':');
      aligns.push(left && right ? 'center' : right ? 'right' : 'left');
    }
    return aligns;
  }

  function listMarker(line) {
    const match = /^( {0,3})([-+*]|\d{1,9}[.)])(?:[ \t]+|$)(.*)$/.exec(line);
    if (!match) return null;
    return { indent: match[1].length, type: /^\d/.test(match[2]) ? 'ol' : 'ul',
      start: /^\d/.test(match[2]) ? Math.min(parseInt(match[2], 10), 999999999) : 1,
      text: match[3] };
  }

  function isFence(line) {
    const match = /^ {0,3}(`{3,}|~{3,})([^`]*)$/.exec(line);
    return match ? { marker: match[1][0], count: match[1].length,
      lang: (match[2].trim().split(/\s+/)[0] || 'general').toLowerCase() } : null;
  }

  function isHeading(line) { return /^ {0,3}(#{1,6})(?:[ \t]+|$)(.*)$/.exec(line); }
  function isRule(line) { return /^ {0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line); }
  function isQuote(line) { return /^ {0,3}>[ \t]?/.test(line); }
  function isIndentedCode(line) { return /^ {4}|^\t/.test(line); }
  function isSetext(line) { return /^ {0,3}(?:=+|-+)[ \t]*$/.test(line); }

  function builtinHighlighter(source, language) {
    // Dedicated lightweight lexers for the original 2016 HTML/CSS/INI modes.
    // These produce *tokens*, never arbitrary HTML; the renderer escapes them.
    const paint = (regex, classify) => {
      const result = [];
      let last = 0;
      let match;
    while ((match = regex.exec(source)) !== null) {
        if (match.index > last) result.push({ text: source.slice(last, match.index) });
        const type = classify(match[0]);
        result.push({ text: match[0], ...(type ? { type } : {}) });
        last = match.index + match[0].length;
      }
      if (last < source.length) result.push({ text: source.slice(last) });
      return result;
    };
    if (language === 'html') return paint(
      /<!--[\s\S]*?-->|<\/?[A-Za-z][\w:-]*|\b[\w:-]+(?=\s*=)|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[<>=/]/g,
      token => token.startsWith('<!--') ? 'comment' : /^<\/?[A-Za-z]/.test(token) ? 'command'
        : /^["']/.test(token) ? 'attribute-value' : /^[A-Za-z]/.test(token) ? 'attribute-name' : 'controls'
    );
    if (language === 'css') return paint(
      /\/\*[\s\S]*?\*\/|(?:--)?[-A-Za-z_][\w-]*(?=\s*:)|@[\w-]+|#[\da-fA-F]{3,8}\b|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[{}:;(),]/g,
      token => token.startsWith('/*') ? 'comment' : token.startsWith('@') ? 'command'
        : /^[-A-Za-z_]/.test(token) ? 'attribute-name' : /^#[\da-fA-F]/.test(token) || /^["']/.test(token) ? 'attribute-value' : 'controls'
    );
    if (language === 'ini') return paint(
      /^[ \t]*[;#][^\n]*|^\[[^\]\n]*\]|^[-\w.]+(?=\s*=)|[=]|"[^"\n]*"/gm,
      token => /^[ \t]*[;#]/.test(token) ? 'comment' : token.startsWith('[') ? 'command'
        : token === '=' ? 'controls' : token.startsWith('"') ? 'attribute-value' : 'attribute-name'
    );
    const js = /^(?:javascript|js)$/.test(language);
    const py = /^(?:python|py)$/.test(language);
    const shell = /^(?:bash|sh)$/.test(language);
    const json = language === 'json';
    if (!js && !py && !shell && !json && language !== 'php') return [{ text: source }];
    const words = js
      ? /^(?:async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|false|finally|for|from|function|if|import|in|instanceof|let|new|null|of|return|static|super|switch|this|throw|true|try|typeof|undefined|var|void|while|yield)$/
      : py ? /^(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)$/
        : shell ? /^(?:echo|export|if|then|else|fi|for|in|do|done|case|esac|function|read)$/
          : /^(?:function|class|echo|return|if|else|new|true|false|null)$/;
    const tokens = [];
    // Finite lexer: regex alternatives always consume input; never insert unescaped code.
    const tokenRE = /\/\/[^\n]*|\#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b[A-Za-z_$][\w$]*\b|\b\d+(?:\.\d+)?\b/g;
    let previous = 0;
    let match;
    while ((match = tokenRE.exec(source)) !== null) {
      if (match.index > previous) tokens.push({ text: source.slice(previous, match.index) });
      const word = match[0];
      const type = (!json && ((js && word.startsWith('//')) || ((py || shell) && word.startsWith('#')))) ? 'comment'
        : /^["']/.test(word) ? 'symbol' : words.test(word) ? 'command'
          : /^\d/.test(word) ? 'controls' : null;
      tokens.push({ text: word, ...(type ? { type } : {}) });
      previous = match.index + word.length;
    }
    if (previous < source.length) tokens.push({ text: source.slice(previous) });
    return tokens;
  }

  class MD {
    constructor(config = {}) {
      if (config === null || typeof config !== 'object' || Array.isArray(config)) {
        throw new TypeError('MD configuration must be an object');
      }
      this.options = Object.freeze({
        mode: config.mode === 'extended' ? 'extended' : 'basic',
        maxInputLength: Math.min(Math.max(Number.isSafeInteger(config.maxInputLength) ? config.maxInputLength : 4 * 1024 * 1024, 1), 16 * 1024 * 1024),
        highlight: config.highlight !== false,
      });
      this.highlighters = new Map();
      this._docId = nextDocumentId++;
      this._references = new Map();
      this._footnotes = new Map();
      this._noteOrder = [];
      this._noteCounts = new Map();
      this._noteNumbers = new Map();
      this._renderingFootnote = false;
    }

    // Safe extension contract: return [{text, type?}], NOT an HTML string.
    // All token text is escaped, and CSS classes come from a hardcoded allowlist.
    registerCodeHighlight(language, tokenizer) {
      if (typeof language !== 'string' || !LANG.test(language) || typeof tokenizer !== 'function') {
        throw new TypeError('Expected (lowercase language, tokenizer function)');
      }
      if (this.highlighters.has(language) || EXTENDED_LANGUAGES.has(language)) {
        throw new Error(`Highlighter already registered: ${language}`);
      }
      this.highlighters.set(language, tokenizer);
      return this;
    }

    parse(input) {
      if (typeof input !== 'string') throw new TypeError('MD.parse expects a string');
      if (input.length > this.options.maxInputLength) throw new RangeError('Markdown input exceeds maxInputLength');
      const clean = input.replace(/\r\n?/g, '\n').replace(/\u0000/g, '\ufffd');
      const lines = clean.split('\n');
      if (lines.length > 150000 || lines.some(line => line.length > 65536)) {
        throw new RangeError('Markdown exceeds line limits');
      }
      // State is reset per document; repeated parse() calls are independent.
      this._references = new Map();
      this._footnotes = new Map();
      this._noteOrder = [];
      this._noteCounts = new Map();
      this._noteNumbers = new Map();
      this._renderingFootnote = false;
      const filtered = this.options.mode === 'extended' ? this._definitions(lines) : lines;
      const body = this._blocks(filtered, 0);
      return body + this._footnotesHTML();
    }


    _definitions(lines) {
      const output = [];
      let fence = null;
      let count = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (fence) {
          output.push(line);
          const close = new RegExp(`^ {0,3}${fence.marker === '`' ? '`' : '~'}{${fence.count},}[ \t]*$`);
          if (close.test(line)) fence = null;
          continue;
        }
        const start = isFence(line);
        if (start) { fence = start; output.push(line); continue; }
        // Do not interpret definitions inside indented code, nor in blockquotes.
        if (isIndentedCode(line) || /^ {0,3}>/.test(line) || count >= 2048) { output.push(line); continue; }
        const footnote = /^ {0,3}\[\^([^\]\n]{1,150})\]:[ \t]*(.*)$/.exec(line);
        if (footnote) {
          const key = refKey(footnote[1]);
          const content = [footnote[2]];
          while (i + 1 < lines.length && /^(?: {4}|\t)/.test(lines[i + 1]) && content.join('').length < 8192) {
            content.push(lines[++i].replace(/^(?: {4}|\t)/, ''));
          }
          if (key && !this._footnotes.has(key)) { this._footnotes.set(key, content.join(' ').slice(0, 8192)); count++; }
          continue;
        }
        const ref = /^ {0,3}\[([^\]\n]{1,150})\]:[ \t]*(<[^<>\n]*>|\S+)(?:[ \t]+(?:"([^"\n]*)"|'([^'\n]*)'))?[ \t]*$/.exec(line);
        if (ref) {
          const key = refKey(ref[1]);
          const url = ref[2].startsWith('<') ? ref[2].slice(1, -1) : ref[2];
          if (key && !this._references.has(key)) {
            this._references.set(key, { url, title: ref[3] || ref[4] || '' }); count++;
          }
          continue;
        }
        output.push(line);
      }
      return output;
    }

    _footnotesHTML() {
      if (!this._noteOrder.length) return '';
      const pieces = [];
      this._renderingFootnote = true;
      for (let i = 0; i < this._noteOrder.length; i++) {
        const key = this._noteOrder[i];
        const n = i + 1;
        const body = this._inline(this._footnotes.get(key));
        const backs = [];
        for (let j = 1; j <= this._noteCounts.get(key); j++) {
          const id = `mdfnref-${this._docId}-${n}-${j}`;
          backs.push(`<a class="md-footnote-back" href="#${id}" aria-label="Zpět na odkaz ${n}.${j}">↩</a>`);
        }
        pieces.push(`<li id="mdfn-${this._docId}-${n}">${body} ${backs.join(' ')}</li>`);
      }
      this._renderingFootnote = false;
      return `\n<section class="md-footnotes" aria-label="Poznámky pod čarou"><hr><ol>${pieces.join('')}</ol></section>`;
    }

    _referenceHTML(label, ref, image, depth) {
      const safe = safeURL(decodeEntities(ref.url), image);
      if (!safe) return null;
      if (image) {
        const alt = label.replace(/\\([\\`*_{}\[\]()#+.!|>~\-])/g, '$1').replace(/[`*_~]/g, '');
        return `<img class="md-image" src="${escapeHTML(safe)}" alt="${escapeHTML(decodeEntities(alt))}" loading="lazy">`;
      }
      const title = ref.title ? ` title="${escapeHTML(decodeEntities(ref.title))}"` : '';
      return `<a href="${escapeHTML(safe)}"${title} rel="noopener noreferrer" target="_blank">${this._inline(label, depth + 1)}</a>`;
    }

    // Render HTML fallback first; hydrate only if optional browser-side scripts are loaded.
    // Repeated mount() calls preserve reader preferences on the container itself.
    mount(container, markdown) {
      if (!container || typeof container.innerHTML !== 'string') throw new TypeError('Expected an HTML container');
      container.classList.add('md-root');
      container.innerHTML = this.parse(markdown);
      if (root.MDDiagrams && typeof root.MDDiagrams.enhance === 'function') root.MDDiagrams.enhance(container);
      if (root.MDDocUX && typeof root.MDDocUX.enhance === 'function') root.MDDocUX.enhance(container);
      if (root.MDReader && typeof root.MDReader.enhance === 'function') root.MDReader.enhance(container);
      return container;
    }

    _highlight(code, language) {
      let lang = LANG.test(language) ? language : 'general';
      if (this.options.mode === 'basic' && ['general', 'javascript', 'js', 'python', 'py'].indexOf(lang) === -1) lang = 'general';
      const label = escapeHTML(lang);
      let output;
      if (language === 'mermaid' || language === 'code-tabs' || language === 'diff' || !this.options.highlight || code.length > 128 * 1024) output = escapeHTML(code);
      else {
        let tokens;
        try { tokens = this.highlighters.has(lang) ? this.highlighters.get(lang)(code, lang) : builtinHighlighter(code, lang); }
        catch (_) { tokens = [{ text: code }]; }
        if (!Array.isArray(tokens) || tokens.length > 100000 || tokens.some(token => !token || typeof token.text !== 'string' || (token.type !== undefined && !HIGHLIGHT_TYPES.has(token.type)))) {
          tokens = [{ text: code }];
        }
        output = tokens.map(token => {
          const text = escapeHTML(token.text);
          return token.type ? `<span class="md-code-syntax md-code-syntax-${token.type}">${text}</span>` : text;
        }).join('');
      }
      const diagram = language.toLowerCase() === 'mermaid' ? ' data-md-diagram="mermaid"' : '';
      const tabs = language.toLowerCase() === 'code-tabs' ? ' data-md-code-tabs="true"' : '';
      return `<pre class="md-code md-code-syntax-lang-${label}"${diagram}${tabs}><code>${output}</code></pre>`;
    }

    _inline(input, depth = 0) {
      if (depth > MAX_INLINE_NESTING) return escapeHTML(input);
      let out = '';
      let plain = '';
      const flush = () => { out += escapeHTML(decodeEntities(plain)); plain = ''; };
      let i = 0;
      while (i < input.length) {
        const ch = input[i];
        if (ch === '\\' && input[i + 1] === '\n') { flush(); out += '<br>'; i += 2; continue; }
        if (ch === '\\' && i + 1 < input.length && /[\\`*_{}\[\]()#+.!|>~\-]/.test(input[i + 1])) {
          plain += input[i + 1]; i += 2; continue;
        }
        if (ch === '`') {
          let n = 1;
          while (input[i + n] === '`') n++;
          const delimiter = '`'.repeat(n);
          let end = input.indexOf(delimiter, i + n);
          if (end !== -1) {
            flush();
            let content = input.slice(i + n, end).replace(/\n/g, ' ');
            if (content.length > 1 && content.startsWith(' ') && content.endsWith(' ') && content.trim()) content = content.slice(1, -1);
            out += `<code class="md-inline-code">${escapeHTML(content)}</code>`;
            i = end + n; continue;
          }
          plain += delimiter; i += n; continue;
        }
        if (this.options.mode === 'extended' && !this._renderingFootnote && ch === '[' && input[i + 1] === '^') {
          const close = input.indexOf(']', i + 2);
          if (close > 0 && close - i <= 152) {
            const key = refKey(input.slice(i + 2, close));
            if (this._footnotes.has(key)) {
              flush();
              if (!this._noteCounts.has(key)) {
                this._noteOrder.push(key); this._noteCounts.set(key, 0);
                this._noteNumbers.set(key, this._noteOrder.length);
              }
              const count = this._noteCounts.get(key) + 1;
              this._noteCounts.set(key, count);
              const num = this._noteNumbers.get(key);
              out += `<sup class="md-footnote-ref" id="mdfnref-${this._docId}-${num}-${count}"><a href="#mdfn-${this._docId}-${num}" aria-label="Poznámka ${num}">${num}</a></sup>`;
              i = close + 1; continue;
            }
          }
        }
        if (ch === '[' || (ch === '!' && input[i + 1] === '[')) {
          const image = ch === '!';
          const start = i + (image ? 1 : 0);
          let cursor = start + 1;
          let nesting = 1;
          // A string containing thousands of unmatched '[' must not trigger
          // repeated O(n²) scans. Reject unusually long link labels early.
          const firstClose = input.indexOf(']', cursor);
          if (firstClose === -1) { plain += input.slice(i); break; }
          if (firstClose - cursor > 2048) { plain += ch; i++; continue; }
          while (cursor < input.length && cursor < start + 4096 && nesting > 0) {
            if (input[cursor] === '\\') { cursor += 2; continue; }
            if (input[cursor] === '[') nesting++;
            if (input[cursor] === ']') nesting--;
            cursor++;
          }
          if (!nesting && input[cursor] === '(') {
            const close = this._linkEnd(input, cursor);
            if (close !== -1) {
              const label = input.slice(start + 1, cursor - 1);
              const rawDest = input.slice(cursor + 1, close).trim();
              const match = /^(<[^<>\n]*>|[^\s]+?)(?:\s+["']([^"']*)["'])?$/.exec(rawDest);
              const destination = match ? (match[1].startsWith('<') ? match[1].slice(1, -1) : match[1]) : '';
              const linkHTML = this._referenceHTML(label, { url: destination, title: match && match[2] || '' }, image, depth);
              if (linkHTML) { flush(); out += linkHTML; i = close + 1; continue; }
              // Dangerous destinations remain visible as TEXT (not clickable).
              plain += input.slice(i, close + 1);
              i = close + 1; continue;
            }
          }
          // [label][ref], [label][] and [ref] (also image references).
          if (!nesting && this.options.mode === 'extended') {
            const label = input.slice(start + 1, cursor - 1);
            let key = refKey(label);
            let end = cursor;
            if (input[cursor] === '[') {
              const after = input.indexOf(']', cursor + 1);
              if (after > cursor && after - cursor < 153) {
                key = refKey(input.slice(cursor + 1, after) || label);
                end = after + 1;
              } else if (after === cursor + 1) { end = after + 1; }
            }
            if (this._references.has(key)) {
              const html = this._referenceHTML(label, this._references.get(key), image, depth);
              if (html) { flush(); out += html; i = end; continue; }
            }
          }
        }
        if (ch === '<') {
          const match = /^<((?:https?:\/\/|mailto:)[^\s<>]+)>/.exec(input.slice(i));
          if (match && safeURL(match[1])) {
            flush(); out += `<a href="${escapeHTML(match[1])}" rel="noopener noreferrer" target="_blank">${escapeHTML(match[1])}</a>`;
            i += match[0].length; continue;
          }
        }
        if (this.options.mode === 'extended' && (ch === 'h' || ch === 'w') &&
            (i === 0 || !/[\w@/]/.test(input[i - 1]))) {
          const m = /^(https?:\/\/|www\.)([^\s<>"']{1,2048})/i.exec(input.slice(i));
          if (m) {
            let dest = m[0].replace(/[.,;:!?]+$/, '');
            while (dest.endsWith(')') && (dest.match(/\)/g) || []).length > (dest.match(/\(/g) || []).length) dest = dest.slice(0, -1);
            const href = dest.startsWith('www.') ? 'https://' + dest : dest;
            const safe = safeURL(href);
            if (safe && dest.length > m[1].length) {
              flush();
              out += `<a href="${escapeHTML(safe)}" rel="noopener noreferrer" target="_blank">${escapeHTML(dest)}</a>`;
              i += dest.length; continue;
            }
          }
        }
        if (ch === '*' || ch === '_' || ch === '~') {
          const markers = ch === '~' ? (this.options.mode === 'extended' ? ['~~', '~'] : ['~~']) : [ch.repeat(3), ch.repeat(2), ch];
          let matched = false;
          for (const marker of markers) {
            if (!input.startsWith(marker, i)) continue;
            if (ch === '_' && i > 0 && /\w/.test(input[i - 1])) continue;
            if (i + marker.length >= input.length || /\s/.test(input[i + marker.length])) continue;
            const end = this._emphasisEnd(input, marker, i + marker.length);
            if (end < 0 || /\s/.test(input[end - 1])) continue;
            flush();
            const middle = this._inline(input.slice(i + marker.length, end), depth + 1);
            out += marker.length === 3 ? `<strong class="md-strong"><em class="md-em">${middle}</em></strong>`
              : ch === '~' ? `<del>${middle}</del>`
                : marker.length === 2 ? `<strong class="md-strong">${middle}</strong>` : `<em class="md-em">${middle}</em>`;
            i = end + marker.length; matched = true; break;
          }
          if (matched) continue;
        }
        if (ch === '\n' && plain.endsWith('  ')) {
          plain = plain.slice(0, -2); flush(); out += '<br>'; i++; continue;
        }
        plain += ch;
        i++;
      }
      flush();
      return out;
    }

    _linkEnd(s, open) {
      let nesting = 1;
      let quote = null;
      for (let i = open + 1; i < s.length && i < open + 4096; i++) {
        const ch = s[i];
        if (ch === '\\') { i++; continue; }
        if (quote) { if (ch === quote) quote = null; continue; }
        if (ch === '"' || ch === "'") { quote = ch; continue; }
        if (ch === '(') nesting++;
        if (ch === ')') { nesting--; if (!nesting) return i; }
      }
      return -1;
    }

    _emphasisEnd(input, marker, start) {
      let pos = start;
      while (pos < input.length) {
        const end = input.indexOf(marker, pos);
        if (end < 0) return -1;
        if (input[end - 1] !== '\\' && end > start) return end;
        pos = end + marker.length;
      }
      return -1;
    }

    _boundary(lines, index) {
      const line = lines[index];
      if (!line || !line.trim()) return true;
      if (isFence(line) || isHeading(line) || isRule(line) || isQuote(line) || listMarker(line)) return true;
      if (this.options.mode === 'extended' && /^ {0,3}:::(?:details|faq)[ \t]+\S/.test(line)) return true;
      if (index + 1 < lines.length && line.includes('|') && tableAlignment(lines[index + 1], splitTableRow(line).length)) return true;
      if (this.options.mode === 'extended' && /^\[[^\]]*;/.test(line.trim())) return true;
      return false;
    }

    _blocks(lines, depth) {
      if (depth > MAX_NESTING) return `<p>${this._inline(lines.join('\n'))}</p>`;
      const result = [];
      for (let i = 0; i < lines.length;) {
        const line = lines[i];
        if (!line.trim()) { i++; continue; }

        // Phase 4.5: a bounded, non-nesting details/FAQ directive.
        // Its content uses the same safe Markdown renderer; raw HTML remains escaped.
        const details = this.options.mode === 'extended'
          ? /^ {0,3}:::(?:details|faq)[ \t]+(.{1,160})[ \t]*$/.exec(line) : null;
        if (details) {
          let end = i + 1, size = 0;
          while (end < lines.length && end - i <= 120 && size <= 16384 && !/^ {0,3}:::[ \t]*$/.test(lines[end])) {
            size += lines[end].length; end++;
          }
          if (end < lines.length && end - i <= 120 && size <= 16384 && /^ {0,3}:::[ \t]*$/.test(lines[end])) {
            result.push(`<details class="md-details"><summary>${this._inline(details[1].trim())}</summary><div class="md-details-body">${this._blocks(lines.slice(i+1, end), depth+1)}</div></details>`);
            i = end + 1; continue;
          }
          // Incomplete directives are escaped as ordinary text, never swallowed.
          result.push(`<p>${this._inline(line)}</p>`); i++; continue;
        }
        const fence = isFence(line);
        if (fence) {
          const code = [];
          i++;
          const closeRE = new RegExp(`^ {0,3}${fence.marker === '`' ? '`' : '~'}{${fence.count},}[ \\t]*$`);
          while (i < lines.length && !closeRE.test(lines[i])) code.push(lines[i++]);
          if (i < lines.length) i++;
          // Reserved for phase 2: fenced ```mermaid is safely displayed as code today.
          result.push(this._highlight(code.join('\n'), fence.lang));
          continue;
        }

        const heading = isHeading(line);
        if (heading) {
          const level = heading[1].length;
          const content = heading[2].replace(/[ \t]+#+[ \t]*$/, '').trim();
          result.push(`<h${level} class="md-header">${this._inline(content)}</h${level}>`);
          i++; continue;
        }
        if (isRule(line)) { result.push('<hr>'); i++; continue; }

        if (isQuote(line)) {
          const inner = [];
          while (i < lines.length && (isQuote(lines[i]) || (lines[i].trim() === '' && i + 1 < lines.length && isQuote(lines[i + 1])))) {
            inner.push(lines[i].replace(/^ {0,3}>[ \t]?/, '')); i++;
          }
          const alert = this.options.mode === 'extended' && /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*$/i.exec(inner[0].trim());
          if (alert) {
            const type = alert[1].toLowerCase();
            const text = { note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution' }[type];
            result.push(`<aside class="md-alert md-alert-${type}" role="note"><div class="md-alert-title">${text}</div>${this._blocks(inner.slice(1), depth + 1)}</aside>`);
          } else result.push(`<blockquote class="md-blockquote">${this._blocks(inner, depth + 1)}</blockquote>`);
          continue;
        }

        const marker = listMarker(line);
        if (marker) {
          const type = marker.type;
          const items = [];
          const first = marker.start;
          while (i < lines.length) {
            const current = listMarker(lines[i]);
            if (!current || current.indent !== marker.indent || current.type !== type) break;
            const content = [current.text]; i++;
            while (i < lines.length) {
              const next = lines[i];
              if (!next.trim()) {
                if (i + 1 < lines.length && ((listMarker(lines[i + 1]) && listMarker(lines[i + 1]).indent === marker.indent) || /^\s{2,}\S/.test(lines[i + 1]))) { content.push(''); i++; continue; }
                break;
              }
              if ((listMarker(next) && listMarker(next).indent === marker.indent)) break;
              const indent = /^(\s*)/.exec(next)[1].replace(/\t/g, '    ').length;
              if (indent < marker.indent + 2) break;
              content.push(next.slice(marker.indent + 2)); i++;
            }
            let checkbox = '';
            let taskClass = '';
            if (this.options.mode === 'extended') {
              const task = /^\[([ xX])\][ \t]+/.exec(content[0]);
              if (task) {
                content[0] = content[0].slice(task[0].length);
                taskClass = ' class="md-task-item"';
                checkbox = `<input type="checkbox" disabled${task[1].toLowerCase() === 'x' ? ' checked' : ''} aria-label="Task status"> `;
              }
            }
            const rendered = this._blocks(content, depth + 1);
            const tight = rendered.replace(/^<p>([\s\S]*?)<\/p>(?=(?:<ul|<ol|$))/, '$1');
            items.push(`<li${taskClass}>${checkbox}${tight}</li>`);
            if (i < lines.length && !lines[i].trim()) {
              const nextMarker = i + 1 < lines.length ? listMarker(lines[i + 1]) : null;
              if (nextMarker && nextMarker.type === type && nextMarker.indent === marker.indent) i++;
              else break;
            }
          }
          result.push(`<${type} class="${type === 'ol' ? 'md-list-ordered' : 'md-list'}"${type === 'ol' && first !== 1 ? ` start="${first}"` : ''}>${items.join('')}</${type}>`);
          continue;
        }

        if (i + 1 < lines.length && line.includes('|')) {
          const headers = splitTableRow(line);
          const aligns = tableAlignment(lines[i + 1], headers.length);
          if (aligns) {
            const th = headers.map((cell, c) => `<th class="md-align-${aligns[c]}">${this._inline(cell)}</th>`).join('');
            i += 2;
            const rows = [];
            while (i < lines.length && lines[i].trim() && lines[i].includes('|') && rows.length < 10000) {
              const cells = splitTableRow(lines[i++]);
              const td = headers.map((_, c) => `<td class="md-align-${aligns[c]}">${this._inline(cells[c] || '')}</td>`).join('');
              rows.push(`<tr>${td}</tr>`);
            }
            result.push(`<table class="md-table"><thead><tr>${th}</tr></thead><tbody>${rows.join('')}</tbody></table>`);
            continue;
          }
        }

        // Original MD.js extended shorthand: [Header; Header\nValue; Value]
        if (this.options.mode === 'extended' && /^\[[^\]]*;/.test(line.trim())) {
          const contents = [];
          let finished = false;
          let lookahead = i;
          while (lookahead < lines.length && contents.length < 10000) {
            const source = lines[lookahead];
            const entry = lookahead === i ? source.trim().slice(1) : source.trim();
            if (entry.includes(']')) {
              const close = entry.indexOf(']');
              if (entry.slice(close + 1).trim()) break;
              contents.push(entry.slice(0, close)); finished = true; lookahead++; break;
            }
            contents.push(entry); lookahead++;
          }
          if (finished && contents.length && contents.every(item => item.includes(';'))) {
            const cells = contents.map(entry => entry.split(';').slice(0, 64).map(cell => this._inline(cell.trim())));
            const header = cells.shift().map(cell => `<th>${cell}</th>`).join('');
            const rows = cells.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('');
            result.push(`<table class="md-table md-table-compact"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`);
            i = lookahead; continue;
          }
        }

        if (isIndentedCode(line)) {
          const code = [];
          while (i < lines.length && (isIndentedCode(lines[i]) || !lines[i].trim())) {
            code.push(lines[i].replace(/^(?: {4}|\t)/, '')); i++;
          }
          result.push(this._highlight(code.join('\n').replace(/\n+$/, ''), 'general'));
          continue;
        }

        const paragraph = [line.replace(/^[ \t]+/, '')]; i++;
        if (i < lines.length && isSetext(lines[i])) {
          const level = lines[i].trim()[0] === '=' ? 1 : 2;
          result.push(`<h${level} class="md-header">${this._inline(paragraph[0])}</h${level}>`);
          i++; continue;
        }
        while (i < lines.length && !this._boundary(lines, i) && !isIndentedCode(lines[i])) {
          paragraph.push(lines[i]); i++;
        }
        result.push(`<p>${this._inline(paragraph.join('\n'))}</p>`);
      }
      return result.join('\n');
    }
  }

  root.MD = MD;
  if (typeof module === 'object' && module.exports) module.exports = MD;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
