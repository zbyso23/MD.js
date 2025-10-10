// MD.js, copyright (c) by Zbigniew Lipka
// Distributed under an MIT License: https://github.com/zbyso23/MD/blob/master/LICENSE

const LANGUAGE_GENERAL = 'general';

let MDOLD, MD_ADDONS;

class MDUtils {
	static unHTML(string) {
		return string.replace(/[<>{};:]/g, function (m) {
			return {
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
			}[m];
		});
	}

	static processInlineItem(line) {
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

	static formatBreaks(lines) {
		for (let i in lines) {
			if (this.formatCode.indexOf(i) !== -1) {
				continue;
			}
			if (this.formatNonBreak.indexOf(i) !== -1) {
				continue;
			}
			lines[i] += '<br>';
		}
		return lines;
	}

	static processLinksItem(line) {
		const lineTitleResult = /([\[]{1,1})([^\]]{1,})([\]]{1,1})([\(]{1,1})([^\)]{1,})([\)]{1,1})/.exec(line); //[zde](http://www.x4u.cz)
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
		const lineResult = /([\!]{1,1})(([\[]{1,1}([^\]]{1,})[\]]{1,1}){0,1})([\(]{1,1}([^\)]{4,})[\)]{1,1}\s{0,})/.exec(line);
		if (lineResult === null) {
			return line;
		}
		const lineImage = `<img src="${lineResult[6]}"  class="${imageClass}" />`;
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

class MD {
	modesAllowed = ['basic', 'extended']; // , custom @todo :)
	allowedHighlights = [LANGUAGE_GENERAL, 'javascript', 'python'];
	configUI = {
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
	registeredCodeHighlight = {
		general: codeHighlighterGeneral,
		javascript: codeHighlighterJavascript,
		python: codeHighlighterPython,
		html: codeHighlighterHTML,
		css: codeHighlighterCSS,
		bash: codeHighlighterBash,
		ini: codeHighlighterIni,
		php: codeHighlighterPHP
	};

	constructor(config) {
		this.config = sanitizeConfig(config);
		this.reset();
	}

	reset() {
		this.formatNonBreak = [];
		this.formatCode = [];
	}

	sanitizeConfig(config) {
		config = (config !== "object" || config === null || Array.isArray(config)) ? {} : config;
		const configNew = {};
		let mode = this.modesAllowed[0];
		if (typeof config === "object" && Object.prototype.hasOwnProperty.call(config, 'mode')) {
			const modeNew = (typeof config['mode'] === "string") ? config['mode'] : mode;
			mode = (this.modesAllowed.includes(modeNew)) ? mode : modeNew;
		}
		configNew.mode = mode;
		return configNew;
	}

	codeHighlighterGeneral(_language, lines, _addTags, _parseCodeFunction) {
		return MDUtils.codeHighlighterGeneral(_language, lines, _addTags, _parseCodeFunction);
	}

	parseLists(lines) {
		const linesOutput = [];
		let isListStarted = false;
		let isListOrdered = false;
		for (const i in lines) {
			if (formatCode.indexOf(i) !== -1) {
				linesOutput.push(lines[i]);
				continue;
			}
			var lineResult = /^((\*|\-){1,1})([^\*\-]{1,})/.exec(lines[i]);
			if (lineResult === null) {
				var line = lines[i];
				if (isListStarted) {
					line = ((isListOrdered) ? '</ol>' : '</ul>') + line;
					isListStarted = false;
				}
				linesOutput.push(line);
				continue;
			}

			if (isListStarted) {
				var line = '';
				isListOrderedCurrent = (lineResult[1] === '-') ? true : false;
				if (isListOrderedCurrent !== isListOrdered) {
					line += (false === isListOrderedCurrent) ? '</ol><ul class="' + this.configUI.list['class'] + '">' : '</ul><ol class="' + this.configUI.listOrdered['class'] + '">';
					isListOrdered = isListOrderedCurrent;
				}
				line += '<li>' + lineResult[3].trim() + '</li>';
			}
			else {
				isListOrdered = (lineResult[1] === '-') ? true : false;
				if (isListOrdered) {
					var line = '<ol class="' + configUI.listOrdered['class'] + '">';
				}
				else {
					var line = '<ul class="' + configUI.list['class'] + '">';
				}
				isListStarted = true;
				line += '<li>' + lineResult[3].trim() + '</li>';
			}
			formatNonBreak.push(i);
			linesOutput.push(line);
		}

		if (isListStarted) {
			var line = (isListOrdered) ? '</ol>' : '</ul>';
			linesOutput[i] += line;
		}
		return linesOutput;
	}

	parseCodeLinesByLanguage(language, lines) {
		let languageInternal = this.getModeLanguage(language);
		languageInternal = (isRegisteredCodeHighlight(languageInternal)) ? languageInternal : LANGUAGE_GENERAL;
		return this.registeredCodeHighlight[languageInternal](languageInternal, lines, false, this.parseCodeLinesByLanguage);
	}

	parseCodeInline(lines) {
		var language = LANGUAGE_GENERAL;
		var linesOutput = [];

		const replaceCode = function (symbol) {
			const input = arguments[5];
			const language = LANGUAGE_GENERAL;
			const langResult = /^([a-zA-Z0-9]{2,}[\s]{1,})/g.exec(arguments[2]);
			let codeIndex = 0;
			if (langResult !== null) {
				var languageNew = langResult[1].trim();
				codeIndex = langResult[1].length;
				language = (this.isRegisteredCodeHighlight(languageNew)) ? this.getModeLanguage(languageNew) : LANGUAGE_GENERAL;
			}
			let code = (language === LANGUAGE_GENERAL) ? arguments[2] : arguments[2].substring(codeIndex);//.replace('[\s]');
			code = this.parseCodeLinesByLanguage(language, [code]).join('');
			const output = '<pre class="inline ' + this.configUI.code['class'] + ' md-code-syntax-lang-' + language + '" title="' + ((language === LANGUAGE_GENERAL) ? 'code' : 'code: ' + language) + '">' + code + '</pre>';
			return output;
		}

		for (var i in lines) {
			if (formatCode.indexOf(i) !== -1) {
				linesOutput.push(lines[i]);
				continue;
			}

			const lineResult = /([\`]{1,1})([^\`]{1,})([\`]{1,1})/g.exec(lines[i]);
			if (lineResult === null) {
				linesOutput.push(lines[i]);
				continue;
			}

			const re = new RegExp('([\`]{1,1})([^\`]{1,})([\`]{1,1})', 'g');
			lines[i] = lines[i].replace(re, replaceCode);
			linesOutput.push(lines[i]);
		}
		return linesOutput;
	}

	parseCode(lines) {
		var language = LANGUAGE_GENERAL;
		var linesOutput = [];
		var linesCode = [];
		var isCodeStarted = false;

		const processCodeLines = function () {
			if (linesCode.length === 0) {
				return;
			}
			language = (this.isRegisteredCodeHighlight(language)) ? language : LANGUAGE_GENERAL;

			var output = this.parseCodeLinesByLanguage(language, linesCode);
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
					var lineTag = '<pre';
					lineTag += ' class="' + configUI.code['class'];
					lineTag += (useLabel) ? ' lang-label' : '';
					lineTag += ' md-code-syntax-lang-' + language + '">';
					lineTag += (useLabel) ? '<span class="md-code-syntax-lang-label">' + (language.toUpperCase()) + '</span>' : '';
					output[i] = lineTag;
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
				var lineResult = /^([\`]{3,3})([^`]+)(([\`]{3,3}){0,1})/.exec(lines[i]);
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
				language = (isRegisteredCodeHighlight(languageNew)) ? getModeLanguage(languageNew) : 'general';
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

			formatCode.push(i);
			formatNonBreak.push(i);
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
			if (this.formatCode.indexOf(i) !== -1) {
				linesOutput.push(lines[i]);
				continue;
			}
			var line = lines[i].trim();
			if (line !== '') {
				linesOutput.push(lines[i]);
				continue;
			}
			formatNonBreak.push(i);
			linesOutput.push(`<br />`);
		}
		return linesOutput;
	}




	parseHeaders(lines) {
		const linesOutput = [];
		for (const i in lines) {
			if (this.formatCode.indexOf(i) !== -1) {
				linesOutput.push(lines[i]);
				continue;
			}
			var lineResult = /^((\#{1,4})([^\n]+))/.exec(lines[i]);
			if (lineResult === null) {
				linesOutput.push(lines[i]);
				continue;
			}
			var headerType;
			var className = configUI.header.class;
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
			var line = '<' + headerType + ' class="' + configUI.header['class'] + '">' + lineResult[3] + '</' + headerType + '>';
			linesOutput.push(line);
			formatNonBreak.push(i);
		}
		return linesOutput;
	}



	processInlineItem(line) {
		return MDUtils.processInlineItem(line);
	}

	parseInline(lines) {
		const linesOutput = [];
		for (const i in lines) {
			if (this.formatCode.indexOf(i) !== -1) {
				linesOutput.push(lines[i]);
				continue;
			}
			linesOutput.push(processInlineItem(lines[i]));
		}
		return linesOutput;
	}

	processImagesItem(line) {
		MDUtils.processImagesItem(line, this.configUI.image['class'])
	}

	//http://meta.stackexchange.com/questions/38915/creating-an-image-link-in-markdown-format - with links
	/*
	[![Foo](http://www.google.com.au/images/nav_logo7.png)](http://google.com.au/)
	*/
	parseImages(lines) {
		var linesOutput = [];
		for (var i in lines) {
			if (this.formatCode.indexOf(i) !== -1) {
				linesOutput.push(lines[i]);
				continue;
			}
			linesOutput.push(MDUtils.processImagesItem(lines[i]));
		}
		return linesOutput;
	}

	parseLinks(lines) {
		return MDUtils.parseLinks(lines)
	}

	processLinksItem(line) {
		return MDUtils.processLinksItem(line);
	}

	getModeLanguage(language) {
		language = (config.mode === 'basic' && this.allowedHighlights.includes(language)) ? 'general' : language;
		return language;
	}

	unHTML(string) {
		return MDUtils.unHTML(string)
	}

	isRegisteredCodeHighlight(language) {
		return (this.registeredCodeHighlight.hasOwnProperty(language));
	}

	formatBreaks(lines) {
		return MDUtils.formatBreaks(lines);
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
			throw new Error(`MD registerCodeHighlight Error: language not allowed by selected mode "${config.mode}"!`);
		}
		this.registeredCodeHighlight[language] = processFunction;
	}
}


