// MD.js, copyright (c) by Zbigniew Lipka
// Distributed under an MIT License: https://github.com/zbyso23/MD/blob/master/LICENSE

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
}

class MD {
	modesAllowed = ['basic', 'extended']; // , custom @todo :)
	allowedHighlights = ['general', 'javascript', 'python'];
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


