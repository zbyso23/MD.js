// MD.js, copyright (c) by Zbigniew Lipka
// Distributed under an MIT License: https://github.com/zbyso23/MD/blob/master/LICENSE
const LANGUAGE_GENERAL = 'general';
const HTML_SANITIZE_TABLE = {
	'<': '&lt;',
	'>': '&gt;',
	'{': '&#123;',
	'}': '&#125;',
	'[': '&#123;',
	']': '&#125;',
	'(': '&#40;',
	')': '&#41;',
	'$': '&#36;',
	';': '&#59;',
	':': '&#58;'
};

const RE = {
	unHTML: /[<>{};:$]/g,
	link: /([\[]{1,1})([^\]]{1,})([\]]{1,1})([\(]{1,1})([^\)]{1,})([\)]{1,1})/,
	image: /([\!]{1,1})(([\[]{1,1}([^\]]{1,})[\]]{1,1}){0,1})([\(]{1,1}([^\)]{4,})[\)]{1,1}\s{0,})/,
	list: /^((\*|\-){1,1})([^\*\-]{1,})/,
	header: /^((\#{1,4})([^\n]+))/,
	inline: /(?:([\*]{1,3}))([^\*\n]+[^\*\s])\1/,
	lang: /^([a-zA-Z0-9]{2,}[\s]{1,})/g,
	codeInline: /([\`]{1,1})([^\`]{1,})([\`]{1,1})/g,
	tableRow: /^[^\[]*;[^\s;]+/,
	tableSimpleAlign: /(([\:]{0,1})[\-]{1,}[\s]{0,}([\:]{0,1}))/,

};
const UI_CONFIG_DEFAULT = {
	strong: {
		'html': 'strong',
		'class': 'md-strong',
	},
	em: {
		'html': 'em',
		'class': 'md-em',
	},
	header: {
		'class': 'md-header'
	},
	code: {
		'class': 'md-code'
	},
	codeLabel: {
		'class': 'md-code-syntax-lang-label'
	},
	listOrdered: {
		'class': 'md-list-ordered'
	},
	list: {
		'class': 'md-list'
	},
	image: {
		'class': 'md-image'
	},
	table: {
		'class': 'table md-table table-striped table-hover'
	}
};

let MDOLD, MD_ADDONS;

export class MDTags {
	static link(content, url) {
		return `<a href="${url}" target="_blank">${content}</a>`
	}
	static image(url, alt, className) {
		return `<img src="${url}" alt="${alt}" class="${className}" />`;
	}
	static span(content, className) {
		return `<span class="${className}">${content}</span>`;
	}
	static break() {
		return `<br />`;
	}

}

export class MDUtils {
	static unHTML(string) {
		return string.replace(RE.unHTML, (m) => HTML_SANITIZE_TABLE[m]);
	}

	static processLinksItem(line) {
		const lineTitleResult = RE.link.exec(line); //[zde](http://www.x4u.cz)
		if (lineTitleResult === null) return line;
		line = line.replace(lineTitleResult[0], MDTags.link(lineTitleResult[2], lineTitleResult[5]));
		return this.processLinksItem(line);
	}

	static parseLinks(lines) {
		const linesOutput = [];
		for (let i in lines) {
			linesOutput.push(this.processLinksItem(lines[i]));
		}
		return linesOutput;
	}

	static processImagesItem(line, imageClass) {
		const lineResult = RE.image.exec(line);
		if (lineResult === null) return line;
		line = line.replace(lineResult[0], MDTags.image(lineResult[6], lineResult[4], imageClass));
		return this.processImagesItem(line);
	}

	static codeHighlighterGeneral(_language, lines, _addTags, _parseCodeFunction) {
		for (const i in lines) {
			lines[i] = this.unHTML(lines[i]);
		}
		return lines;
	}
}

export class MDFormatter {
	static headersMap = new Map([['#', 'h1'], ['##', 'h2'], ['###', 'h3'], ['####', 'h4']]);
	static inlineMap = new Map([['*', 'em'], ['**', 'strong']]);

	static header(line, configUI) {
		let detected = false;
		if (!line) return { line, detected };
		const lineResult = RE.header.exec(line);
		if (lineResult === null || !lineResult[2] || !lineResult[3] || !this.headersMap.has(lineResult[2])) return { line, detected };
		detected = true;
		const headerType = this.headersMap.get(lineResult[2]);
		return { line: `<${headerType} class="${configUI.header['class']}">${lineResult[3].trim()}</${headerType}>`, detected };
	}

	static inline(line, configUI) {
		let detected = false;
		const lineResult = RE.inline.exec(line);
		if (lineResult === null || lineResult.length < 3) {
			return { line, detected };
		}
		detected = true;
		const formatType = this.inlineMap.has(lineResult[1]) ? this.inlineMap.get(lineResult[1]) : 'strong';
		let className = '';
		switch (lineResult[1]) {
			case '*':
				className = configUI.em['class'];
				break;
			case '**':
				className = configUI.strong['class'];
				break;
		}
		const lineInline = `<${formatType} class="${className}">${lineResult[2]}</${formatType}>`;
		const lineNew = line.replace(lineResult[0], lineInline);
		return { line: lineNew, detected };
	}
}

export class MD {
	modesAllowed = ['basic', 'extended']; // , custom @todo :)
	allowedHighlights = [LANGUAGE_GENERAL, 'javascript', 'python'];
	configUI = { ...UI_CONFIG_DEFAULT };

	constructor(config, skipErrors = true) {
		this.config = this.sanitizeConfig(config);
		this.skipErrors = skipErrors;
		this.registeredCodeHighlight = {
			general: this.codeHighlighterGeneral,
			javascript: this.codeHighlighterJavascript,
			python: this.codeHighlighterPython,
			html: this.codeHighlighterHTML,
			css: this.codeHighlighterCSS,
			bash: this.codeHighlighterBash,
			ini: this.codeHighlighterIni,
			php: this.codeHighlighterPHP
		};
		this.reset();
	}

	parse(string) {
		let lines = string.split('\n');
		lines = this.parseCode(lines);
		lines = this.parseEmpty(lines);
		lines = this.parseImages(lines);
		lines = this.parseHeaders(lines);
		lines = this.parseInline(lines);
		lines = this.parseLinks(lines);
		if (this.config.mode === 'extended') {
			lines = this.parseTableSimple(lines);
		}
		lines = this.parseTable(lines);
		lines = this.parseLists(lines);
		lines = this.formatBreaks(lines);
		lines = this.parseCodeInline(lines);
		return lines.join('\n');
	}

	sanitizeConfig(config) {
		config = (typeof config !== "object" || config === null || Array.isArray(config)) ? {} : config;
		const configNew = {};
		let mode = this.modesAllowed[0];
		if (typeof config === "object" && Object.prototype.hasOwnProperty.call(config, 'mode')) {
			const modeNew = (typeof config['mode'] === "string") ? config['mode'] : mode;
			mode = (this.modesAllowed.includes(modeNew)) ? modeNew : mode;
		}
		configNew.mode = mode;
		return configNew;
	}

	reset() {
		this.formatNonBreak = [];
		this.formatCode = [];
	}

	codeHighlighterGeneral = (_language, lines, _addTags, _parseCodeFunction) => {
		return MDUtils.codeHighlighterGeneral(_language, lines, _addTags, _parseCodeFunction);
	}

	#codeHighlighter = (lines, getResult) => {
		for (let i in lines) {
			lines[i] = getResult(lines[+i]);
		}
		return lines;
	}

	codeHighlighterJavascript = (language, lines, addTags, parseCodeFunction) => {
		const replaceSymbols = (symbol) => MDTags.span(symbol, 'md-code-syntax md-code-syntax-symbol');
		const replaceCommands = (value) => MDTags.span(value, `md-code-syntax md-code-syntax-${(value.length === 1) ? 'controls' : 'command'}`);
		const replaceComments = (line, from) => `${(from > 0) ? line.substring(0, from - 1) : ''}${MDTags.span(line.substring(from), `md-code-syntax md-code-syntax-comment`)}`;
		const reCommands = /(([\=\;\{\}\(\)\[\]\"\.]){1,1}|(join[\.]{1,1})|(console\.log)|break|case|catch|class[^a-z0-9]{1,}|continue|default|delete|(do[^a-z0-9]{1,})|(else[^a-z0-9]{1,})|(enum[^a-z0-9]{1,})|(export[s]{0,1})|module|extends|false|(for[^a-z0-9]{1,1})|from|(as[^a-z0-9]{1,1})|([\s]{1,}in[\s]{1,})|function|if|implements|import|instanceof|interface|let|new[^a-z0-9]{1,}|null|package|private|protected|static|return|super|switch|this|throw|true|try|(typeof[\s]{1,1})|var|while|with|yield){1,1}/g;
		const reSymbols = /([\']{1,1}[^\']{0,}[\']{1,1}){1,1}/g;
		const getResult = (lineInput) => {
			let line = lineInput.replace(reCommands, replaceCommands).replace(reSymbols, replaceSymbols);
			if (line.indexOf('//') > -1) {
				line = replaceComments(line, line.indexOf('//'));
			}
			return line;
		}
		return this.#codeHighlighter(lines, getResult);
	}

	codeHighlighterPython = (language, lines, addTags, parseCodeFunction) => {
		const replaceSymbols = (symbol) => MDTags.span(symbol, 'md-code-syntax md-code-syntax-symbol');
		const replaceCommands = (line, y) => {
			return [
				MDTags.span(y, `md-code-syntax md-code-syntax-${(line.length === 1) ? 'controls' : 'command'}`),
				((y.length !== line.length) ? line.substring(y.length) : '')
			].join('');
		}
		const replaceComments = (line, from) => `${(from > 0) ? line.substring(0, from - 1) : ''}${MDTags.span(line.substring(from), `md-code-syntax md-code-syntax-comment`)}`;
		const replaceHelper = () => MDTags.span('&#37;', `md-code-syntax md-code-syntax-percent`);
		const reCommands = new RegExp('(([\(\)]){1,1}|True|False|class|finally|return|None|print|continue|lambda|from|nonlocal|while|global|with|elif|yield|assert|else|import|pass|break|except|raise|(def[\s\:]{1,})|in|if|(or[\s]{1,})|(is[\s]{1,})|(def[^a-zA-Z0-9]{1,})|try|not|as[\s]{1,}){1,1}', 'g');
		const reSymbols = /([\']{1,1}[^\']{0,}[\']{1,1}){1,1}/g;
		const reHelper = /([\:]{3,3}){1,1}/g;
		const getResult = function (lineInput) {
			let line = lineInput;
			while (line.indexOf('%') >= 0) {
				line = line.replace('%', ':::');
			}
			if (line.indexOf('#') > -1) {
				return replaceComments(line, line.indexOf('#'));
			}
			return line.replace(reCommands, replaceCommands).replace(reSymbols, replaceSymbols).replace(reHelper, replaceHelper);
		}
		return this.#codeHighlighter(lines, getResult);
	}

	codeHighlighterBash = (language, lines, addTags, parseCodeFunction) =>  {
		const replaceCommands = function(x, y) {
			const className = (x.length === 1) ? 'controls' : 'command';
			return [
				MDTags.span(y, `md-code-syntax md-code-syntax-${className}`),
				((y.length !== x.length) ? x.substring(y.length) : '')
			].join('');
		}
		const reCommands = new RegExp('(([#]{1,1}[^#]{1,})|(\!#.*)|echo[^a-zA-Z0-9]{1,}|tar[^a-zA-Z0-9]{1,}|print[^a-zA-Z0-9]{1,})', 'g')
		for(let i in lines) {
			lines[+i] = lines[+i].replace(reCommands, replaceCommands);
		}
		return lines;
	}

	codeHighlighterIni = (language, lines, addTags, parseCodeFunction) => {
		// function replacer(match, p1, p2, /* …, */ pN, offset, string, groups) {
		// 	return replacement;
		// }
		const replaceCommands = function(x, y) {
			console.log('>> INI <<', arguments);
			if(arguments[3] === ';') {
				return MDTags.span(`&#59;${arguments[4]}`, 'md-code-syntax md-code-syntax-comments');
			}
			if(arguments[7] === '=') {
				return [
					MDTags.span(arguments[6], `md-code-syntax md-code-syntax-attribute-name`),
					MDTags.span('=', `md-code-syntax md-code-syntax-attribute-control`),
					MDTags.span(arguments[8].trim(), `md-code-syntax md-code-syntax-attribute-value`),
				].join('');
			}
			return [
				MDTags.span('[', `md-code-syntax md-code-syntax-controls`),
				MDTags.span(arguments[10], `md-code-syntax md-code-syntax-command`),
				MDTags.span(']', `md-code-syntax md-code-syntax-controls`),
			].join('');
		}
		const reCommands = new RegExp('((([;]{1,1})(.*))|(^([a-zA-Z0-9]{1,})([\=]{1,1})([^;]{1,}))|([\[]{1,1}([^\]]{1,})[\]]{1,1}))', 'g');
		for(let i in lines) {
			lines[+i] = lines[+i].replace(reCommands, replaceCommands);
		}
		return lines;
	}

	codeHighlighterPHP = (language, lines, addTags, parseCodeFunction) => {
		const replaceCommands = function(x, y) {
			if(arguments[5] === '$') {
				return [
					MDTags.span('&#36;', `md-code-syntax md-code-syntax-controls`),
					MDTags.span(unHTML(arguments[2].substring(1)), `md-code-syntax md-code-syntax-symbol`),
					arguments[0].substring(arguments[2].length),
				].join('');
			}
			if(typeof arguments[3] === "string") {
				return [
					MDTags.span(arguments[3], `md-code-syntax md-code-syntax-controls`),
					arguments[0].substring(arguments[3].length),
				].join('');
			}
			return [
				MDTags.span(arguments[2], `md-code-syntax md-code-syntax-command`),
				arguments[0].substring(arguments[2].length),
			].join('');
		}
		const replaceComments = (line, from) => [
			(from > 0) ? line.substring(0, from - 1) : '',
			MDTags.span(line.substring(from), `md-code-syntax md-code-syntax-comment`),
		].join('');

		const reCommands = new RegExp('((([\=\(\)\{\}]{1,1})|(([$]{1,1})[a-zA-Z0-9_\-]{1,})|halt_compiler|endforeach|abstract|callable|case|catch|class|clone|const|continue|declare|default|elseif|empty|enddeclare|endfor|endif|endswitch|endwhile|exit|extends|final|finally|foreach|function|global|goto|implements|include|include_once|instanceof|insteadof|interface|isset|list|namespace|print|private|protected|public|require_once|require|return|static|switch|array|break|throw|trait|unset|while|yield|eval|echo|else|die|for|try|use|var|new|xor|and|as|do|if|or){1,1}[^a-zA-Z0-9$\(\)]{0,}){1,1}', 'gi');
		const getResult = (line) => {
			line = line.replace(reCommands, replaceCommands);
			if(line.indexOf('//') > -1) {
				line = replaceComments(line, line.indexOf('//'));
			}
			return line;
		}
		return this.#codeHighlighter(lines, getResult);
	}

	codeHighlighterHTML = (language, lines, addTags, parseCodeFunction) => {
		let isCodeJs         = false;
		let isCodeJsStarted  = false;
		let isCodeJsEnded    = false;
		let isCodeCss        = false;
		let isCodeCssStarted = false;
		let isCodeCssEnded   = false;
		let codeJs           = [];
		let codeCss          = [];
		const reSymbols = new RegExp('(([a-zA-Z0-9]{1,})([\=]{1,1})([\"]{1,1})([^\"]{0,})([\"]{1,1}))', 'g');
		const reCommands = new RegExp('(([<]{1,1}[/]{0,1})(([\!]{1,1}DOCTYPE)|html|head|body|title|meta|link|style|a|h1|h2|h3|h4|h5|h6|p|img|audio|video|script|ul|ol|li|div|span|table|thead|tbody|tr|th|td|col|form|input|select|option|button|header|footer){1,1}([^>]{0,})([>]{1,1}))', 'g');
		const replaceSymbols = function() {
			return [
				MDTags.span(arguments[2].trim(), `md-code-syntax md-code-syntax-attribute-name`),
				MDTags.span('&#61;', `md-code-syntax md-code-syntax-attribute-control`),
				MDTags.span('&#34;', `md-code-syntax md-code-syntax-attribute-quote`),
				MDTags.span('&#34;', `md-code-syntax md-code-syntax-attribute-quote`),
				MDTags.span(arguments[5], `md-code-syntax md-code-syntax-attribute-value`),
			].join('');
		}
		const replaceCommands = function() {
			if(isCodeJs === false) {
				isCodeJs = (arguments[2] === '<' && arguments[3] === 'script' && (/(src)/g.exec(arguments[1]) === null)) ? true : false;
				if(isCodeJs) {
					isCodeJsStarted = true;
					return [
						MDTags.span('&lt;', `md-code-syntax md-code-syntax-controls`),
						MDTags.span('script', `md-code-syntax md-code-syntax-command`),
						arguments[5],
						MDTags.span('&gt;', `md-code-syntax md-code-syntax-controls`),
						`<pre class="inline ${configUI.code['class']} md-code-syntax-lang-javascript">`,
						MDTags.span('JAVASCRIPT', `md-code-syntax-lang-label`),
					].join('');
				}
			} else
			//if(isCodeJs === true)
			{
				isCodeJs = (arguments[2] === '</' && arguments[3] === 'script') ? false : true;
				if(false === isCodeJs)
				{
					isCodeJsEnded = true;
					return [
						`</pre>${arguments[8].substring(0, arguments[7])}`,
						MDTags.span('&lt;', `md-code-syntax md-code-syntax-controls`),
						MDTags.span('script', `md-code-syntax md-code-syntax-command`),
						arguments[5],
						MDTags.span('&gt;', `md-code-syntax md-code-syntax-controls`),
					].join('');
				}
			}

			if(isCodeCss === false) {
				isCodeCss = (arguments[2] === '<' && arguments[3] === 'style' && (/(src)/g.exec(arguments[1]) === null)) ? true : false;
				if(isCodeCss) {
					isCodeCssStarted = true;
					return [
						MDTags.span('&lt;', `md-code-syntax md-code-syntax-controls`),
						MDTags.span('style', `md-code-syntax md-code-syntax-command`),
						arguments[5],
						MDTags.span('&gt;', `md-code-syntax md-code-syntax-controls`),
						`<pre class="inline ${configUI.code['class']} md-code-syntax-lang-css">`,
						MDTags.span('CSS', `md-code-syntax-lang-label`),
					].join('');
				}
			} else {
				isCodeCss = (arguments[2] === '</' && arguments[3] === 'style') ? false : true;
				if(false === isCodeCss) {
					isCodeCssEnded = true;
					return [
						`</pre>${arguments[8].substring(0, arguments[7])}`,
						MDTags.span('&lt;', `md-code-syntax md-code-syntax-controls`),
						MDTags.span('style', `md-code-syntax md-code-syntax-command`),
						arguments[5],
						MDTags.span('&gt;', `md-code-syntax md-code-syntax-controls`),

					].join('');
				}
			}
			const attributes = (arguments[5] === '') ? '' : arguments[5].replace(reSymbols, replaceSymbols);
			return [
				MDTags.span(`&lt;${(arguments[2] === '</' ? '/' : '' )}`, `md-code-syntax md-code-syntax-controls`),
				MDTags.span(arguments[3], `md-code-syntax md-code-syntax-command`),
				attributes,
				MDTags.span('&gt;', `md-code-syntax md-code-syntax-controls`),

			].join('');
		}
		for(let i in lines) {
			if(lines[+i].length === 0) continue;
			let line = lines[+i];
			line = line.replace(reCommands, replaceCommands);
			if(isCodeJs && false === isCodeJsStarted && false === isCodeJsEnded) {
				line = line.replace(line, this.parseCodeLinesByLanguage('javascript', [line]).join(''));
			}
			if(isCodeCss && false === isCodeCssStarted && false === isCodeCssEnded) {
				line = line.replace(line, this.parseCodeLinesByLanguage('css', [line]).join(''));
			}
			lines[i] = line;
			if(true === isCodeJsStarted || true === isCodeJsEnded) {
				isCodeJsStarted = false;
				isCodeJsEnded   = false;
			}
			if(true === isCodeCssStarted || true === isCodeCssEnded) {
				isCodeCssStarted = false;
				isCodeCssEnded   = false;
			}
		}
		return lines;
	};

	codeHighlighterCSS = (language, lines, addTags, parseCodeFunction) => {
		const notSymbol = ['p', 'i', 'b', 'a', '@', '.', '#'];
		const replaceSymbols = (symbol) => {
			symbol = symbol.trim();
			let className = (symbol.length === 1 && notSymbol.indexOf(symbol) === -1) ? 'controls' : 'command';
			if(symbol.length === 1 && (symbol === '<' || symbol === '>')) {
				symbol = (symbol === '<' ? '&lt;' : '&gt;');
			}
			return MDTags.span(symbol, `md-code-syntax md-code-syntax-${className}`);
		}
		const reSymbols = new RegExp('(([\<\>\@\(\),]{1,})|([a-zA-Z0-9\-\.\#\:\=\",]{1,}))', 'g');
		const processRule = (rule) => {
			const isElements = (parts.length > 1);
			let parts = rule.split('{');
			let isColon = false;
			if(false === isElements) {
				const colonResult = /[,]{1,1}[\s]{0,}$/.exec(rule);
				if(colonResult !== null) {
					isElements = true;
					parts = [rule.substring(0, colonResult.index), ''];
				}
				isElements = (colonResult !== null);
				isColon = true;
			}
			const definition = (isElements) ? parts[1] : parts[0];
			if(isElements) {
				parts[0] = parts[0].replace(reSymbols, replaceSymbols);
			}
			const definitionParts = definition.split(';');
			for(let d in definitionParts) {
				const definitionPart = definitionParts[d].split(':');
				if(definitionPart.length === 1) continue; //@todo
				definitionPart[0] = `${MDTags.span(definitionPart[0], `md-code-syntax md-code-syntax-attribute-name`)}<span class="md-code-syntax md-code-syntax-controls">`;
				definitionPart[1] = `</span>${MDTags.span(definitionPart[1], `md-code-syntax md-code-syntax-attribute-value`)}`;				
				definitionParts[+d] = definitionPart.join(MDTags.span('&#58;', `md-code-syntax md-code-syntax-attribute-control`));  //:
			}
			definition = definitionParts.join(MDTags.span('&#59;', `md-code-syntax md-code-syntax-controls`)); //;
			if(isElements) {
				parts[1] = definition;
			} else {
				parts[0] = definition;	
			}
			return parts.join(MDTags.span((isColon) ? ',' : '&#123;', `md-code-syntax md-code-syntax-symbol`)); //{
		}
		const getResult = (line) => {
			const rules = line.split('}');
			for(let j in rules) {
				rules[+j] = processRule(rules[+j]);
			}
			return rules.join(MDTags.span('&#125;', `md-code-syntax md-code-syntax-symbol`)); //}
		}
		return this.#codeHighlighter(lines, getResult);
	}

	parseLists(lines) {
		const linesOutput = [];
		let isListStarted = false;
		let isListOrdered = false;
		const configUI = this.configUI;
		for (const i in lines) {
			let line = lines[i];
			if (this.formatCode.indexOf(+i) !== -1) {
				linesOutput.push(lines[i]);
				continue;
			}
			const lineResult = RE.list.exec(lines[i]);
			if (lineResult === null) {
				if (isListStarted) {
					line = ((isListOrdered) ? '</ol>' : '</ul>') + line;
					isListStarted = false;
				}
				linesOutput.push(line);
				continue;
			}

			if (isListStarted) {
				let line = '';
				let isListOrderedCurrent = (lineResult[1] === '-') ? true : false;
				if (isListOrderedCurrent !== isListOrdered) {
					line += (false === isListOrderedCurrent) ? `</ol><ul class="${configUI.list['class']}">` : `</ul><ol class="${configUI.listOrdered['class']}">`;
					isListOrdered = isListOrderedCurrent;
				}
				line += `<li>${lineResult[3].trim()}</li>`;
			} else {
				isListOrdered = (lineResult[1] === '-') ? true : false;
				if (isListOrdered) {
					line = `<ol class="${configUI.listOrdered['class']}">`;
				}
				else {
					line = `<ul class="${configUI.list['class']}">`;
				}
				isListStarted = true;
				line += `<li>${lineResult[3].trim()}</li>`;
			}
			this.formatNonBreak.push(i);
			linesOutput.push(line);
		}

		if (isListStarted && linesOutput.length > 0) {
			linesOutput[linesOutput.length - 1] += (isListOrdered) ? '</ol>' : '</ul>';
		}
		return linesOutput;
	}

	parseCodeLinesByLanguage(language, lines) {
		let languageInternal = this.getModeLanguage(language);
		languageInternal = (this.isRegisteredCodeHighlight(languageInternal)) ? languageInternal : LANGUAGE_GENERAL;
		return this.registeredCodeHighlight[languageInternal](languageInternal, lines, false, this.parseCodeLinesByLanguage.bind(this));
	}

	parseCodeInline(lines) {
		const linesOutput = [];
		const replaceCode = (...args) => {
			const language = LANGUAGE_GENERAL;
			const langResult = (typeof args[2] === 'string') ? RE.lang.exec(args[2]) : null;
			let codeIndex = 0;
			if (langResult !== null) {
				const languageNew = langResult[1].trim();
				codeIndex = langResult[1].length;
				language = (this.isRegisteredCodeHighlight(languageNew)) ? this.getModeLanguage(languageNew) : LANGUAGE_GENERAL;
			}
			let code = (language === LANGUAGE_GENERAL) ? args[2] : args[2].substring(codeIndex);
			code = this.parseCodeLinesByLanguage(language, [code]).join('');
			const output = `<pre class="inline ${this.configUI.code['class']} md-code-syntax-lang-${language}" title="${((language === LANGUAGE_GENERAL) ? 'code' : 'code: ' + language)}">${code}</pre>`;
			return output;
		}

		for (const i in lines) {
			if (this.formatCode.indexOf(+i) !== -1) {
				linesOutput.push(lines[i]);
				continue;
			}

			const lineResult = RE.codeInline.exec(lines[i]);
			if (lineResult === null) {
				linesOutput.push(lines[i]);
				continue;
			}

			lines[i] = lines[i].replace(RE.codeInline, (...args) => replaceCode(...args));
			linesOutput.push(lines[i]);
		}
		return linesOutput;
	}

	parseCode(lines) {
		const configUI = this.configUI;
		const linesOutput = [];
		let isCodeStarted = false;
		let language = LANGUAGE_GENERAL;
		let linesCode = [];

		const processCodeLines = () => {
			if (linesCode.length === 0) {
				return;
			}
			language = (this.isRegisteredCodeHighlight(language)) ? language : LANGUAGE_GENERAL;

			let output = this.parseCodeLinesByLanguage(language, linesCode);
			//error in other than general (built-in) codeHighlighter have fallback to switch to try general codeHighlighter
			if (false === Array.isArray(output)) {
				if (language === LANGUAGE_GENERAL) {
					linesCode = [];
					return;
				}
				output = this.parseCodeLinesByLanguage(LANGUAGE_GENERAL, linesCode);
				if (false === Array.isArray(output)) {
					linesCode = [];
					return;
				}
			}

			const iLast = (output.length - 1);
			for (let i = 0; i <= iLast; i++) {
				if (i === 0) {
					const useLabel = (language === LANGUAGE_GENERAL) ? false : true;
					const lineTagParts = [];
					lineTagParts.push('<pre');
					lineTagParts.push(` class="${configUI.code['class']} md-code-syntax-lang-${language} ${(useLabel) ? 'lang-label' : ''}"`);					
					if (useLabel) lineTagParts.push(MDTags.span(language.toUpperCase(), configUI.codeLabel['class']));
					output[i] = lineTagParts.join('');
				}
				if (i === iLast) {
					output[i] = `${output[i]}</pre>`;
				}
				linesOutput.push(output[i]);
			}
			linesCode = [];
		}

		for (const i in lines) {
			let lineResult;
			if (isCodeStarted) {
				lineResult = /^([^`]{0,})(([\`]{3,3}){0,1})/.exec(lines[i]);
			} else {
				lineResult = /^([\`]{3,3})([^`]*)(([\`]{3,3}){0,1})/.exec(lines[i]);
			}
			if (lineResult === null) {
				if (false === isCodeStarted) {
					linesOutput.push(lines[i]);
					continue;
				}
				linesCode.push(lines[i]);
				continue;
			}

			if (false === isCodeStarted) {
				linesCode = [];
				const languageNew = lineResult[2].trim();
				language = (this.isRegisteredCodeHighlight(languageNew)) ? this.getModeLanguage(languageNew) : LANGUAGE_GENERAL;
				linesCode.push(lineResult[2]);
				if (lineResult[3] === '') {
					isCodeStarted = true;
				}
			}
			else {
				linesCode.push(lineResult[1]);
				if (lineResult[2] !== '') {
					processCodeLines();
					isCodeStarted = false;
				}
			}

			this.formatCode.push(i);
			this.formatNonBreak.push(i);
		}
		if (true === isCodeStarted) {
			isCodeStarted = false;
			processCodeLines();
		}
		return linesOutput;
	}

	parseEmpty(lines) {
		const linesOutput = [];
		for (const i in lines) {
			if (this.formatCode.indexOf(+i) !== -1) {
				linesOutput.push(lines[i]);
				continue;
			}
			if (lines[i].trim() !== '') {
				linesOutput.push(lines[i]);
				continue;
			}
			this.formatNonBreak.push(i);
			linesOutput.push(MDTags.break());
		}
		return linesOutput;
	}

	parseHeaders(lines) {
		const linesOutput = [];
		const configUI = this.configUI;
		for (const i in lines) {
			if (this.formatCode.indexOf(+i) !== -1) {
				linesOutput.push(lines[i]);
				continue;
			}
			const { line, detected } = MDFormatter.header(lines[i], configUI);
			linesOutput.push(line);
			if (detected) this.formatNonBreak.push(i);
		}
		return linesOutput;
	}

	processInlineItem(lineRaw) {
		const configUI = this.configUI;
		const { line, detected } = MDFormatter.inline(lineRaw, configUI);
		if (!detected) return line;
		return this.processInlineItem(line);
	}

	parseInline(lines) {
		const linesOutput = [];
		for (const i in lines) {
			if (this.formatCode.indexOf(+i) !== -1) {
				linesOutput.push(lines[i]);
				continue;
			}
			linesOutput.push(this.processInlineItem(lines[i]));
		}
		return linesOutput;
	}

	processImagesItem(line) {
		return MDUtils.processImagesItem(line, this.configUI.image['class'])
	}

	//http://meta.stackexchange.com/questions/38915/creating-an-image-link-in-markdown-format - with links
	/*
	[![Foo](http://www.google.com.au/images/nav_logo7.png)](http://google.com.au/)
	*/
	parseImages(lines) {
		const linesOutput = [];
		for (const i in lines) {
			if (this.formatCode.indexOf(+i) !== -1) {
				linesOutput.push(lines[+i]);
				continue;
			}
			linesOutput.push(MDUtils.processImagesItem(lines[+i], this.configUI.image['class']));
		}
		return linesOutput;
	}

	parseLinks(lines) {
		return MDUtils.parseLinks(lines)
	}

	processLinksItem(line) {
		return MDUtils.processLinksItem(line);
	}

	parseTableSimple(lines) {
		const linesOutput = [];
		let isTableStarted = false;
		const isTableRow = (line) => !line.trim().startsWith('[') && line.includes(';');
		const terminateTable = () => {
			if (isTableStarted) {
				linesOutput.push('</table>');
				isTableStarted = false;
			}
		}
		for (const i in lines) {
			let lineResult;
			if (this.formatCode.indexOf(i) !== -1) {
				linesOutput.push(lines[i]);
				continue;
			}
			if (isTableStarted) {
				if (!isTableRow(lines[i])) {
					terminateTable();
					linesOutput.push(lines[i]);
					continue;
				}
				lineResult = /^([^\]]+)\]?$/.exec(lines[i]);
			} else {
				lineResult = /^\[([^\]]+)\]?$/.exec(lines[i]);
			}
			let line = '';
			if (isTableStarted) {
				const rows = lineResult[1].split(';');
				line = '<tr>';
				for (const r in rows) {
					line += `<td>${rows[+r].trim()}</td>`;
				}
				line += '</tr>';
			}
			else {
				isTableStarted = true;
				const rows = lineResult[1].split(';');
				line = `<table class="${this.configUI.table['class']}"><tr>`;
				for (const r in rows) {
					line += `<th>${rows[r].trim()}</th>`;
				}
				line += '</tr>';
			}
			this.formatNonBreak.push(i);
			linesOutput.push(line);
		}
		terminateTable();
		return linesOutput;
	}

	parseTable(lines) {
		const linesOutput = [];
		const table = {
			'header': [],
			'rows': [],
			'align': []
		};
		let isTableHeader = false;
		let isTableWaitingAlign = false;
		let isTableStarted = false;

		const processTableRow = (line) => {
			const cols = line.split('|');
			const row = [];
			cols.map(v => v.trim()).forEach(v => row.push(v));
			return row;
		}

		const processTable = () => {
			let line = `<table class="${this.configUI.table['class']}"><tr>`;
			for (let i = 0, len = table.header.length; i < len; i++) {
				const align = table.align[i];
				line += `<th align="${align}" class="text-${align}">${table.header[i]}</th>`;
			}
			line += '</tr>';
			linesOutput.push(line);
			for (let i = 0, len = table.rows.length; i < len; i++) {
				const row = table.rows[i];
				let line = '<tr>';
				for (let j = 0, len = row.length; j < len; j++) {
					const align = table.align[j];
					line += `<td align="${table.align[j]}" class="text-${align}">${row[j]}</td>`;
				}
				line += '</tr>';
				linesOutput.push(line);
			}
			linesOutput[(linesOutput.length - 1)] += `</table>`;
			table.header.length = 0;
			table.rows.length = 0;
			table.align.length = 0;
		}

		for (const i in lines) {
			if (this.formatCode.indexOf(i) !== -1) {
				linesOutput.push(lines[i]);
				continue;
			}

			let line = lines[i].replace(/^([\|]{1,1})/, '');
			line = line.replace(/([\|]{1,1})$/, '');
			let lineResult;
			if (isTableWaitingAlign) {
				lineResult = /([\|]{0,1}[\s\:]{0,1}[\-]{1,})/.exec(line);
			}
			else {
				lineResult = /([\|]{1,1}[^\|]{1,})/.exec(line);
			}

			if (lineResult === null) {
				if (isTableStarted) {
					processTable();
					isTableStarted = false;
					isTableWaitingAlign = false;
					isTableHeader = false;
				}
				linesOutput.push(lines[i]);
				continue;
			}
			if (isTableWaitingAlign) {
				const cols = line.split('|');
				if (cols.length !== table.header.length) {
					errorMsg = 'align cols not match!';
					if (this.skipErrors) {
						console.log(`Error skipped: ${errorMsg}`);
					} else {
						throw new Error(errorMsg);
					}
				}

				for (let j = 0, len = cols.length; j < len; j++) {
					const colsAlignResult = RE.tableSimpleAlign.exec(cols[j]); //[":--- :", ":--- :", ":", ":", index: 0, input: ":--- :"]
					let align = 'left';
					if (colsAlignResult === null) {
						table.align.push(align);
						continue;
					}
					const alignText = colsAlignResult[2] + '-' + colsAlignResult[3];
					switch (alignText) {
						case ':-:':
							align = 'center';
							break;

						case '-:':
							align = 'right';
							break;
					}
					table.align.push(align);
				}
				isTableWaitingAlign = false;
				isTableStarted = true;
				continue;
			}
			else {
				const row = processTableRow(line);
				if (false === isTableHeader) {
					table.header = row;
					isTableHeader = true;
					isTableWaitingAlign = true;
				}
				else {
					table.rows.push(row);
				}
			}
			this.formatNonBreak.push(i);
		}

		if (isTableStarted) {
			processTable();
		}
		return linesOutput;
	}

	getModeLanguage(language) {
		language = (this.config.mode === 'basic' && this.allowedHighlights.includes(language)) ? 'general' : language;
		return language;
	}

	unHTML(string) {
		return MDUtils.unHTML(string)
	}

	isRegisteredCodeHighlight(language) {
		return (this.registeredCodeHighlight.hasOwnProperty(language));
	}

	formatBreaks(lines) {
		for (const i in lines) {
			if (this.formatCode.indexOf(+i) !== -1) {
				continue;
			}
			if (this.formatNonBreak.indexOf(+i) !== -1) {
				continue;
			}
			lines[i] += MDTags.break();
		}
		return lines;
	}

	/*@todo Perpare for modular code highlight*/
	registerCodeHighlight(language, processFunction) {
		let errorMsg = null;
		if (typeof language !== "string") {
			errorMsg = 'MD registerCodeHighlight Error: invalid language!';
		}
		if (!errorMsg && typeof processFunction !== "function") {
			errorMsg = 'MD registerCodeHighlight Error: invalid process function!';
		}
		if (!errorMsg && true === this.isRegisteredCodeHighlight(language)) {
			errorMsg = 'MD registerCodeHighlight Error: language allready registered!';
		}
		if (!errorMsg && language !== this.getModeLanguage(language)) {
			errorMsg = `MD registerCodeHighlight Error: language not allowed by selected mode "${this.config.mode}"!`;
		}
		if (errorMsg) {
			if (this.skipErrors) {
				console.log(`Error skipped: ${errorMsg}`);
			} else {
				throw new Error(errorMsg);
			}
		}
		this.registeredCodeHighlight[language] = processFunction;
	}
}


