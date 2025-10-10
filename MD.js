// MD.js, copyright (c) by Zbigniew Lipka
// Distributed under an MIT License: https://github.com/zbyso23/MD/blob/master/LICENSE
const log = console.log;

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
	link: /([\[]{1,1})([^\]]{1,})([\]]{1,1})([\(]{1,1})([^\)]{1,})([\)]{1,1})/,
	image: /([\!]{1,1})(([\[]{1,1}([^\]]{1,})[\]]{1,1}){0,1})([\(]{1,1}([^\)]{4,})[\)]{1,1}\s{0,})/,
	list: /^((\*|\-){1,1})([^\*\-]{1,})/,
	lang: /^([a-zA-Z0-9]{2,}[\s]{1,})/g,
	codeInline: /([\`]{1,1})([^\`]{1,})([\`]{1,1})/g,

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

export class MDUtils {
	static unHTML(string) {
		return string.replace(/[<>{};:$]/g, (m) => HTML_SANITIZE_TABLE[m]);
	}

	static processLinksItem(line) {
		const lineTitleResult = RE.link.exec(line); //[zde](http://www.x4u.cz)
		if (lineTitleResult === null) return line;
		const name = lineTitleResult[2];
		const lineLink = `<a href="${lineTitleResult[5]}" target="_blank">${name}</a>`;
		line = line.replace(lineTitleResult[0], lineLink);
		return this.processLinksItem(line);
	}

	static parseLinks(lines) {
		var linesOutput = [];
		for (var i in lines) {
			linesOutput.push(this.processLinksItem(lines[i]));
		}
		return linesOutput;
	}

	static processImagesItem(line, imageClass) {
		const lineResult = RE.image.exec(line);
		if (lineResult === null) {
			return line;
		}
		const lineImage = `<img src="${lineResult[6]}" alt="${lineResult[4]}" class="${imageClass}" />`;
		line = line.replace(lineResult[0], lineImage);
		return this.processImagesItem(line);
	}

	static codeHighlighterGeneral(_language, lines, _addTags, _parseCodeFunction) {
		for (const i in lines) {
			lines[i] = this.unHTML(lines[i]);
		}
		return lines;
	}
}

export class MD {
	modesAllowed = ['basic', 'extended']; // , custom @todo :)
	allowedHighlights = [LANGUAGE_GENERAL, 'javascript', 'python'];
	configUI = { ...UI_CONFIG_DEFAULT };

	constructor(config) {
		this.config = this.sanitizeConfig(config);
		this.registeredCodeHighlight = {
			general: this.codeHighlighterGeneral,
			// javascript: codeHighlighterJavascript,
			// python: codeHighlighterPython,
			// html: codeHighlighterHTML,
			// css: codeHighlighterCSS,
			// bash: codeHighlighterBash,
			// ini: codeHighlighterIni,
			// php: codeHighlighterPHP
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
			mode = (this.modesAllowed.includes(modeNew)) ? mode : modeNew;
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
			var lineResult = RE.list.exec(lines[i]);
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
					line += (false === isListOrderedCurrent) ? '</ol><ul class="' + configUI.list['class'] + '">' : '</ul><ol class="' + configUI.listOrdered['class'] + '">';
					isListOrdered = isListOrderedCurrent;
				}
				line += '<li>' + lineResult[3].trim() + '</li>';
			}
			else {
				isListOrdered = (lineResult[1] === '-') ? true : false;
				if (isListOrdered) {
					line = '<ol class="' + configUI.listOrdered['class'] + '">';
				}
				else {
					line = '<ul class="' + configUI.list['class'] + '">';
				}
				isListStarted = true;
				line += '<li>' + lineResult[3].trim() + '</li>';
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
		var language = LANGUAGE_GENERAL;
		var linesOutput = [];
		
		const replaceCode = (...args) => {
			const input = args[5];
			const language = LANGUAGE_GENERAL;
			const langResult = (typeof args[2] === 'string') ? RE.lang.exec(args[2]) : null;
			let codeIndex = 0;
			if (langResult !== null) {
				var languageNew = langResult[1].trim();
				codeIndex = langResult[1].length;
				language = (this.isRegisteredCodeHighlight(languageNew)) ? this.getModeLanguage(languageNew) : LANGUAGE_GENERAL;
			}
			let code = (language === LANGUAGE_GENERAL) ? args[2] : args[2].substring(codeIndex);//.replace('[\s]');
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

			const re = new RegExp('([\`]{1,1})([^\`]{1,})([\`]{1,1})', 'g');
			lines[i] = lines[i].replace(re, (...args) => replaceCode(...args));
			linesOutput.push(lines[i]);
		}
		return linesOutput;
	}

	parseCode(lines) {
		const configUI = this.configUI;
		var language = LANGUAGE_GENERAL;
		var linesOutput = [];
		var linesCode = [];
		var isCodeStarted = false;

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

			var iLast = (output.length - 1);
			var i = 0;
			for (; i <= iLast; i++) {
				if (i === 0) {
					var useLabel = (language === LANGUAGE_GENERAL) ? false : true;
					const lineTagParts = [];
					lineTagParts.push('<pre');
					lineTagParts.push(` class="${configUI.code['class']} md-code-syntax-lang-${language} ${(useLabel) ? 'lang-label' : ''}"`);
					if (useLabel) lineTagParts.push(`<span class="md-code-syntax-lang-label">${language.toUpperCase()}</span>`);
					output[i] = lineTagParts.join('');
				}
				if (i === iLast) {
					output[i] = output[i] + '</pre>';
				}
				linesOutput.push(output[i]);
			}
			linesCode = [];
		}

		for (var i in lines) {
			if (isCodeStarted) {
				var lineResult = /^([^`]{0,})(([\`]{3,3}){0,1})/.exec(lines[i]);
			}
			else {
				var lineResult = /^([\`]{3,3})([^`]*)(([\`]{3,3}){0,1})/.exec(lines[i]);
			}

			if (lineResult === null) {
				if (false === isCodeStarted) {
					var line = '';
					linesOutput.push(lines[i]);
					continue;
				}
				linesCode.push(lines[i]);
				continue;
			}

			if (false === isCodeStarted) {
				linesCode = [];
				var languageNew = lineResult[2].trim();
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
			var line = lines[i].trim();
			if (line !== '') {
				linesOutput.push(lines[i]);
				continue;
			}
			this.formatNonBreak.push(i);
			linesOutput.push(`<br />`);
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
			const lineResult = /^((\#{1,4})([^\n]+))/.exec(lines[i]);
			if (lineResult === null) {
				linesOutput.push(lines[i]);
				continue;
			}
			let headerType;
			switch (lineResult[2]) {
				case '#':
					headerType = 'h1';
					break;
				case '##':
					headerType = 'h2';
					break;
				case '###':
					headerType = 'h3';
					break;
				case '####':
					headerType = 'h4';
					break;
			}
			const line = `<${headerType} class="${configUI.header['class']}">${lineResult[3]}</${headerType}>`;
			linesOutput.push(line);
			this.formatNonBreak.push(i);
		}
		return linesOutput;
	}

	processInlineItem(line) {
		const configUI = this.configUI;
		const lineResult = /(?:([\*]{1,3}))([^\*\n]+[^\*\s])\1/.exec(line);
		if (lineResult === null) {
			return line;
		}
		var formatType;
		var className = '';
		switch (lineResult[1]) {
			case '*':
				formatType = 'em';
				className = configUI.em['class'];
				break;
			case '**':
				formatType = 'strong';
				className = configUI.strong['class'];
				break;
			default:
				formatType = 'strong';
				break;
		}
		const lineInline = `<${formatType} class="${className}">${lineResult[2]}</${formatType}>`;
		line = line.replace(lineResult[0], lineInline);
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
		var linesOutput = [];
		for (var i in lines) {
			if (this.formatCode.indexOf(+i) !== -1) {
				linesOutput.push(lines[i]);
				continue;
			}
			linesOutput.push(MDUtils.processImagesItem(lines[i], this.configUI.image['class']));
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
		for (const i in lines) {
			if (this.formatCode.indexOf(i) !== -1) {
				linesOutput.push(lines[i]);
				continue;
			}
			if (isTableStarted) {
				var lineResult = /^([^\]]+)(([\]]{1,1}){0,1})/.exec(lines[i]);
			}
			else {
				var lineResult = /^([\[]{1,1})([^\]]+)$/.exec(lines[i]);
			}
			if (lineResult === null) {
				if (isTableStarted) {
					linesOutput.push('</table>');
					isTableStarted = false;
				}
				linesOutput.push(lines[i]);
				continue;
			}

			if (isTableStarted) {
				var rows = lineResult[1].split(';');
				var line = '<tr>';
				for (var r in rows) {
					line += '<td>' + rows[r].trim() + '</td>';
				}
				line += '</tr>';
				if (lineResult[2] !== '') {
					isTableStarted = false;
					line += '</table>';
				}
			}
			else {
				isTableStarted = true;
				var rows = lineResult[2].split(';');
				var line = '<table class="' + this.configUI.table['class'] + '"><tr>';
				for (var r in rows) {
					line += '<th>' + rows[r].trim() + '</th>';
				}
				line += '</tr>';
			}
			this.formatNonBreak.push(i);
			linesOutput.push(line);
		}
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
			var cols = line.split('|');
			var row = [];
			for (var c in cols) {
				row.push(cols[c].trim());
			}
			return row;
		}

		const processTable = () => {
			var line = '<table class="' + this.configUI.table['class'] + '"><tr>';
			for (var c in table.header) {
				var i = parseInt(c);
				var align = table.align[i];
				line += '<th align="' + align + '" class="text-' + align + '">' + table.header[c] + '</th>';
			}
			line += '</tr>';
			linesOutput.push(line);
			for (var r in table.rows) {
				var row = table.rows[r];
				var line = '<tr>';
				for (var c in row) {
					var i = parseInt(c);
					var align = table.align[i];
					line += '<td align="' + align + '" class="text-' + align + '">' + row[c] + '</td>';
				}
				line += '</tr>';
				linesOutput.push(line);
			}
			linesOutput[(linesOutput.length - 1)] += '</table>';
			table.header.length = 0;
			table.rows.length = 0;
			table.align.length = 0;
		}

		for (const i in lines) {
			if (this.formatCode.indexOf(i) !== -1) {
				linesOutput.push(lines[i]);
				continue;
			}

			var line = lines[i].replace(/^([\|]{1,1})/, '');
			line = line.replace(/([\|]{1,1})$/, '');
			if (isTableWaitingAlign) {
				var lineResult = /([\|]{0,1}[\s\:]{0,1}[\-]{1,})/.exec(line);
			}
			else {
				var lineResult = /([\|]{1,1}[^\|]{1,})/.exec(line);
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
				var cols = line.split('|');
				if (cols.length !== table.header.length) {
					throw new Error('align cols not match!');
				}
				for (var c in cols) {
					var colResult = /(([\:]{0,1})[\-]{1,}[\s]{0,}([\:]{0,1}))/.exec(cols[c]); //[":--- :", ":--- :", ":", ":", index: 0, input: ":--- :"]
					var align = 'left';
					if (colResult === null) {
						table.align.push(align);
						continue;
					}
					var alignText = colResult[2] + '-' + colResult[3];

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
				var row = processTableRow(line);
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
			lines[i] += '<br>';
		}
		return lines;
	}

	/*@todo Perpare for modular code highlight*/
	registerCodeHighlight(language, processFunction) {
		if (typeof language !== "string") {
			throw new Error('MD registerCodeHighlight Error: invalid language!');
		}
		if (typeof processFunction !== "function") {
			throw new Error('MD registerCodeHighlight Error: invalid process function!');
		}
		if (true === this.isRegisteredCodeHighlight(language)) {
			throw new Error('MD registerCodeHighlight Error: language allready registered!');
		}
		if (language !== this.getModeLanguage(language)) {
			throw new Error(`MD registerCodeHighlight Error: language not allowed by selected mode "${this.config.mode}"!`);
		}
		this.registeredCodeHighlight[language] = processFunction;
	}
}


