/*
 * MD.js Reborn — standalone, safe-by-default Markdown renderer.
 * Derived from the user's MD.js (2016); modern ES6 rewrite (2026).
 * ZERO runtime dependencies, no imports, no eval or DOM required.
 * The output is an HTML string: use it only in an HTML context.
 * This is a pragmatic Markdown subset, NOT a full CommonMark implementation.
 */
(function (root) {
  'use strict';

  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

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
      return this._blocks(lines, 0);
    }

    _highlight(code, language) {
      let lang = LANG.test(language) ? language : 'general';
      if (this.options.mode === 'basic' && ['general', 'javascript', 'js', 'python', 'py'].indexOf(lang) === -1) lang = 'general';
      const label = escapeHTML(lang);
      let output;
      if (!this.options.highlight || code.length > 128 * 1024) output = escapeHTML(code);
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
      return `<pre class="md-code md-code-syntax-lang-${label}"><code>${output}</code></pre>`;
    }

    _inline(input, depth = 0) {
      if (depth > MAX_INLINE_NESTING) return escapeHTML(input);
      let out = '';
      let plain = '';
      const flush = () => { out += escapeHTML(plain); plain = ''; };
      let i = 0;
      while (i < input.length) {
        const ch = input[i];
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
              const safe = safeURL(destination, image);
              if (safe) {
                flush();
                if (image) {
                  const alt = label.replace(/\\([\\`*_{}\[\]()#+.!|>~\-])/g, '$1').replace(/[`*_~]/g, '');
                  out += `<img class="md-image" src="${escapeHTML(safe)}" alt="${escapeHTML(alt)}" loading="lazy">`;
                } else {
                  const title = match && match[2] ? ` title="${escapeHTML(match[2])}"` : '';
                  out += `<a href="${escapeHTML(safe)}"${title} rel="noopener noreferrer" target="_blank">${this._inline(label, depth + 1)}</a>`;
                }
                i = close + 1; continue;
              }
              // Dangerous destinations remain visible as TEXT (not clickable).
              plain += input.slice(i, close + 1);
              i = close + 1; continue;
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
        if (ch === '*' || ch === '_' || ch === '~') {
          const markers = ch === '~' ? ['~~'] : [ch.repeat(3), ch.repeat(2), ch];
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
              : marker === '~~' ? `<del>${middle}</del>`
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
          result.push(`<blockquote class="md-blockquote">${this._blocks(inner, depth + 1)}</blockquote>`);
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
            const rendered = this._blocks(content, depth + 1);
            // Tight-list paragraph (but preserve distinct nested blocks).
            items.push(`<li>${rendered.replace(/^<p>([\s\S]*?)<\/p>(?=(?:<ul|<ol|$))/, '$1')}</li>`);
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
