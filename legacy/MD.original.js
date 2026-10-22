// MD.js, copyright (c) by Zbigniew Lipka
// Distributed under an GNU GENERAL PUBLIC LICENSE version 3: https://github.com/zbyso23/MD/blob/master/LICENSE

var MD, MD_ADDONS;
MD = function(config)
{
	/*
	config:
	{
		mode: 'basic' /* extended - with all new code highlighters and simple table
	}
	*/
	var sanitizeConfig = function(config)
	{
		config          = (false === U.isObject(config)) ? {} : config;
		var configNew   = {};
		var modeAllowed = ['basic', 'extended']; // , custom @todo :)
		var mode        = modeAllowed[0];
		if(U.has(config, 'mode'))
		{
			var modeNew = (U.isString(config['mode'])) ? config['mode'] : mode;
			mode        = (modeAllowed.indexOf(modeNew) === -1) ? mode : modeNew;
		}
		configNew.mode  = mode;
		return configNew;
	}
	config = sanitizeConfig(config);

	var getModeLanguage = function(language)
	{
		var allowedHighlights = ['general', 'javascript', 'python'];
		language = (config.mode === 'basic' && allowedHighlights.indexOf(language) === -1) ? 'general' : language;
		return language;
	}

	var configUI = {
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

	var unHTML = function(string)
	{
		string = string.replace(/[<>{};:]/g, function(m) {
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
		return string;
	}


	var codeHighlighterJavascript = function(language, lines, addTags, parseCodeFunction)
	{
		for(var i in lines)
		{
			var line = lines[i];
			var keywords;
			keywords = new RegExp("");
			var replaceSymbols = function(symbol) 
			{
				return '<span class="md-code-syntax md-code-syntax-symbol">' + symbol + '</span>';
			}
			var replaceCommands = function(x) 
			{
				var className = (x.length === 1) ? 'controls' : 'command';
				return '<span class="md-code-syntax md-code-syntax-' + className + '">' + x + '</span>';
			}
			var replaceComments = function(line, from) 
			{
				var newLine = '';
				if(from > 0) newLine += line.substring(0, from - 1);
				newLine += '<span class="md-code-syntax md-code-syntax-comment">' + line.substring(from) + '</span>';
				return newLine;
			}
			line = line.replace(/(([\=\;\{\}\(\)\[\]\"\.]){1,1}|(join[\.]{1,1})|(console\.log)|break|case|catch|class[^a-z0-9]{1,}|continue|default|delete|(do[^a-z0-9]{1,})|(else[^a-z0-9]{1,})|(enum[^a-z0-9]{1,})|(export[s]{0,1})|module|extends|false|(for[^a-z0-9]{1,1})|from|(as[^a-z0-9]{1,1})|([\s]{1,}in[\s]{1,})|function|if|implements|import|instanceof|interface|let|new[^a-z0-9]{1,}|null|package|private|protected|static|return|super|switch|this|throw|true|try|(typeof[\s]{1,1})|var|while|with|yield){1,1}/g, replaceCommands); 
			line = line.replace(/([\']{1,1}[^\']{0,}[\']{1,1}){1,1}/g, replaceSymbols);
			//line = line.replace(/([\"]{1,1}[^\"]{0,}[\"]{1,1}){1,1}/g, replaceSymbols);
			if(line.indexOf('//') > -1)
			{
				line = replaceComments(line, line.indexOf('//'));
			}
			lines[i] = line;
		}
		return lines;
	};

	var codeHighlighterPython = function(language, lines, addTags, parseCodeFunction) 
	{
		for(var i in lines)
		{
			var line = lines[i];
			var keywords;
			keywords = new RegExp("");
			var replaceSymbols = function(symbol) 
			{
				return '<span class="md-code-syntax md-code-syntax-symbol">' + symbol + '</span>';
			}
			var replaceCommands = function(x, y)
			{
				var className = (x.length === 1) ? 'controls' : 'command';
				return '<span class="md-code-syntax md-code-syntax-' + className + '">' + y + '</span>' + ((y.length !== x.length) ? x.substring(y.length) : '');
			}
			var replaceComments = function(line, from) 
			{
				var newLine = '';
				if(from > 0) newLine += line.substring(0, from - 1);
				newLine += '<span class="md-code-syntax md-code-syntax-comment">' + line.substring(from) + '</span>';
				return newLine;
			}
			while(line.indexOf('%') >= 0)
			{
				line = line.replace('%', ':::');
			}
			if(line.indexOf('#') > -1)
			{
				line = replaceComments(line, line.indexOf('#'));
			}
			else
			{
				var re = new RegExp('(([\(\)]){1,1}|True|False|class|finally|return|None|print|continue|lambda|from|nonlocal|while|global|with|elif|yield|assert|else|import|pass|break|except|raise|(def[\s\:]{1,})|in|if|(or[\s]{1,})|(is[\s]{1,})|(def[^a-zA-Z0-9]{1,})|try|not|as[\s]{1,}){1,1}', 'g')
				line = line.replace(re, replaceCommands);
				line = line.replace(/([\']{1,1}[^\']{0,}[\']{1,1}){1,1}/g, replaceSymbols);
				line = line.replace(/([\:]{3,3}){1,1}/g, function(x) {
					return '<span class="md-code-syntax md-code-syntax-percent">&#37;</span>';
				});
			}
			lines[i] = line;

		}
		return lines;

	};

	var codeHighlighterBash = function(language, lines, addTags, parseCodeFunction) 
	{
		for(var i in lines)
		{
			var line = lines[i];
			var replaceSymbols = function(symbol) 
			{
				return '<span class="md-code-syntax md-code-syntax-symbol">' + symbol + '</span>';
			}
			var replaceCommands = function(x, y)
			{
				var className = (x.length === 1) ? 'controls' : 'command';
				return '<span class="md-code-syntax md-code-syntax-' + className + '">' + y + '</span>' + ((y.length !== x.length) ? x.substring(y.length) : '');
			}
			var re = new RegExp('(([#]{1,1}[^#]{1,})|(\!#.*)|echo[^a-zA-Z0-9]{1,}|tar[^a-zA-Z0-9]{1,}|print[^a-zA-Z0-9]{1,})', 'g')
			line = line.replace(re, replaceCommands);
			lines[i] = line;
		}
		return lines;

	};


	var codeHighlighterIni = function(language, lines, addTags, parseCodeFunction) 
	{
		for(var i in lines)
		{
			var line = lines[i];
			var replaceSymbols = function(symbol) 
			{
				return '<span class="md-code-syntax md-code-syntax-symbol">' + symbol + '</span>';
			}
			var replaceCommands = function(x, y)
			{
				console.log('>> INI <<', arguments);
				if(arguments[3] === ';')
				{
					return '<span class="md-code-syntax md-code-syntax-comments">&#59;' + arguments[4] + '</span>';
				}
				if(arguments[7] === '=')
				{
					return '<span class="md-code-syntax md-code-syntax-attribute-name">' + arguments[6] + '</span><span class="md-code-syntax md-code-syntax-attribute-control">=</span><span class="md-code-syntax md-code-syntax-attribute-value">' + arguments[8].trim() + '</span>';
				}
				return '<span class="md-code-syntax md-code-syntax-controls">[</span><span class="md-code-syntax md-code-syntax-command">' + arguments[10] + '</span><span class="md-code-syntax md-code-syntax-controls">]</span>';
			}
			var re = new RegExp('((([;]{1,1})(.*))|(^([a-zA-Z0-9]{1,})([\=]{1,1})([^;]{1,}))|([\[]{1,1}([^\]]{1,})[\]]{1,1}))', 'g');
			line = line.replace(re, replaceCommands);
			lines[i] = line;
		}
		return lines;
	};


	var codeHighlighterPHP = function(language, lines, addTags, parseCodeFunction) 
	{
		for(var i in lines)
		{
			var line = lines[i];
			var keywords;
			keywords = new RegExp("");
			var replaceSymbols = function(symbol) 
			{
				return '<span class="md-code-syntax md-code-syntax-symbol">' + symbol + '</span>';
			}
			var replaceCommands = function(x, y)
			{
				if(arguments[5] === '$')
				{
					return '<span class="md-code-syntax md-code-syntax-controls">&#36;</span><span class="md-code-syntax md-code-syntax-symbol">' + unHTML(arguments[2].substring(1)) + '</span>' + arguments[0].substring(arguments[2].length);
				}
				if(U.isString(arguments[3]))
				{
					return '<span class="md-code-syntax md-code-syntax-controls">' + arguments[3] + '</span>' + arguments[0].substring(arguments[3].length);
				}
				var line = '<span class="md-code-syntax md-code-syntax-command">' + arguments[2] + '</span>' + arguments[0].substring(arguments[2].length);
				return line;
			}
			var replaceComments = function(line, from) 
			{
				var newLine = '';
				if(from > 0) newLine += line.substring(0, from - 1);
				newLine += '<span class="md-code-syntax md-code-syntax-comment">' + line.substring(from) + '</span>';
				return newLine;
			}
			var re = new RegExp('((([\=\(\)\{\}]{1,1})|(([$]{1,1})[a-zA-Z0-9_\-]{1,})|halt_compiler|endforeach|abstract|callable|case|catch|class|clone|const|continue|declare|default|elseif|empty|enddeclare|endfor|endif|endswitch|endwhile|exit|extends|final|finally|foreach|function|global|goto|implements|include|include_once|instanceof|insteadof|interface|isset|list|namespace|print|private|protected|public|require_once|require|return|static|switch|array|break|throw|trait|unset|while|yield|eval|echo|else|die|for|try|use|var|new|xor|and|as|do|if|or){1,1}[^a-zA-Z0-9$\(\)]{0,}){1,1}', 'gi')
			line = line.replace(re, replaceCommands);
			if(line.indexOf('//') > -1)
			{
				line = replaceComments(line, line.indexOf('//'));
			}
			lines[i] = line;
		}
		return lines;
	}


	var codeHighlighterHTML = function(language, lines, addTags, parseCodeFunction) 
	{
		var isCodeJs         = false;
		var isCodeJsStarted  = false;
		var isCodeJsEnded    = false;
		var isCodeCss        = false;
		var isCodeCssStarted = false;
		var isCodeCssEnded   = false;
		var codeJs           = [];
		var codeCss          = [];
		for(var i in lines)
		{
			var line = lines[i];
			var replaceSymbols = function(symbol) 
			{
				return '<span class="md-code-syntax md-code-syntax-attribute-name">' + arguments[2].trim() + '</span><span class="md-code-syntax md-code-syntax-attribute-control">&#61;</span><span class="md-code-syntax md-code-syntax-attribute-quote">&#34;</span><span class="md-code-syntax md-code-syntax-attribute-value">' + arguments[5] + '</span><span class="md-code-syntax md-code-syntax-attribute-quote">&#34;</span>';
			}
			var replaceCommands = function()
			{
				if(isCodeJs === false)
				{
					isCodeJs = (arguments[2] === '<' && arguments[3] === 'script' && (/(src)/g.exec(arguments[1]) === null)) ? true : false;
					if(isCodeJs)
					{
						isCodeJsStarted = true;
						return '<span class="md-code-syntax md-code-syntax-controls">&lt;</span><span class="md-code-syntax md-code-syntax-command">script</span>' + arguments[5] + '<span class="md-code-syntax md-code-syntax-controls">&gt;</span><pre class="inline ' + configUI.code['class'] + ' md-code-syntax-lang-javascript"><span class="md-code-syntax-lang-label">JAVASCRIPT</span>';
					}
				}
				else
				//if(isCodeJs === true)
				{
					isCodeJs = (arguments[2] === '</' && arguments[3] === 'script') ? false : true;
					if(false === isCodeJs)
					{
						isCodeJsEnded = true;
						return '</pre>' + arguments[8].substring(0, arguments[7]) + '<span class="md-code-syntax md-code-syntax-controls">&lt;/</span><span class="md-code-syntax md-code-syntax-command">script</span>' + arguments[5] + '<span class="md-code-syntax md-code-syntax-controls">&gt;</span>';
					}
				}

				if(isCodeCss === false)
				{
					isCodeCss = (arguments[2] === '<' && arguments[3] === 'style' && (/(src)/g.exec(arguments[1]) === null)) ? true : false;
					if(isCodeCss)
					{
						isCodeCssStarted = true;
						return '<span class="md-code-syntax md-code-syntax-controls">&lt;</span><span class="md-code-syntax md-code-syntax-command">style</span>' + arguments[5] + '<span class="md-code-syntax md-code-syntax-controls">&gt;</span><pre class="inline ' + configUI.code['class'] + ' md-code-syntax-lang-css"><span class="md-code-syntax-lang-label">CSS</span>';
					}
				}
				else
				{
					isCodeCss = (arguments[2] === '</' && arguments[3] === 'style') ? false : true;
					if(false === isCodeCss)
					{
						isCodeCssEnded = true;
						return '</pre>' + arguments[8].substring(0, arguments[7]) + '<span class="md-code-syntax md-code-syntax-controls">&lt;/</span><span class="md-code-syntax md-code-syntax-command">style</span>' + arguments[5] + '<span class="md-code-syntax md-code-syntax-controls">&gt;</span>';
					}
				}

				var attributes = (arguments[5] === '') ? '' : arguments[5];
				var res = new RegExp('(([a-zA-Z0-9]{1,})([\=]{1,1})([\"]{1,1})([^\"]{0,})([\"]{1,1}))', 'g');
				attributes = attributes.replace(res, replaceSymbols);
				var result = '<span class="md-code-syntax md-code-syntax-controls">&lt;' + (arguments[2] === '</' ? '/' : '' ) + '</span><span class="md-code-syntax md-code-syntax-command">' + arguments[3] + '</span>' + attributes + '<span class="md-code-syntax md-code-syntax-controls">&gt;</span>';
				return result;
			}
			var re = new RegExp('(([<]{1,1}[/]{0,1})(([\!]{1,1}DOCTYPE)|html|head|body|title|meta|link|style|a|h1|h2|h3|h4|h5|h6|p|img|audio|video|script|ul|ol|li|div|span|table|thead|tbody|tr|th|td|col|form|input|select|option|button|header|footer){1,1}([^>]{0,})([>]{1,1}))', 'g');
			line = line.replace(re, replaceCommands);
			if(isCodeJs && false === isCodeJsStarted && false === isCodeJsEnded)
			{
				line = (line.length > 1) ? line.replace(line, parseCodeLinesByLanguage('javascript', [line]).join('')) : line;
			}
			if(isCodeCss && false === isCodeCssStarted && false === isCodeCssEnded)
			{
				line = (line.length > 1) ? line.replace(line, parseCodeLinesByLanguage('css', [line]).join('')) : line;
			}
			lines[i] = line;

			if(true === isCodeJsStarted || true === isCodeJsEnded)
			{
				isCodeJsStarted = false;
				isCodeJsEnded   = false;
			}
			if(true === isCodeCssStarted || true === isCodeCssEnded)
			{
				isCodeCssStarted = false;
				isCodeCssEnded   = false;
			}
		}
		return lines;
	};

	var codeHighlighterCSS = function(language, lines, addTags, parseCodeFunction) 
	{
		var isCSSStarted = false;
		var replaceSymbols = function(symbol) 
		{
			var notSymbol = ['p', 'i', 'b', 'a', '@', '.', '#'];
			symbol = symbol.trim();
			var className = (symbol.length === 1 && notSymbol.indexOf(symbol) === -1) ? 'controls' : 'command';
			if(symbol.length === 1 && (symbol === '<' || symbol === '>'))
			{
				symbol = (symbol === '<' ? '&lt;' : '&gt;');
			}
			return '<span class="md-code-syntax md-code-syntax-' + className + '">' + symbol + '</span>';
		}

		for(var i in lines)
		{
			var line  = lines[i];
			var rules = line.split('}');
			for(var j in rules)
			{
				var rule = rules[j];
				var parts = rule.split('{');
				var isElements = (parts.length > 1);
				var isColon = false;
				if(false === isElements)
				{
					var colonResult = /[,]{1,1}[\s]{0,}$/.exec(rule);
					if(colonResult !== null)
					{
						isElements = true;
						parts = [rule.substring(0, colonResult.index), ''];
					}
					isElements = (colonResult !== null);
					isColon    = true;
				}
				var definition = (isElements) ? parts[1] : parts[0];
				if(isElements)
				{
					var re = new RegExp('(([\<\>\@\(\),]{1,})|([a-zA-Z0-9\-\.\#\:\=\",]{1,}))', 'g');
					parts[0] = parts[0].replace(re, replaceSymbols);
				}

				var definitionParts = definition.split(';');
				for(var d in definitionParts)
				{
					var definitionPart = definitionParts[d].split(':');
					if(definitionPart.length === 1)
					{
						continue; //@todo
					}
					definitionPart[0] = '<span class="md-code-syntax md-code-syntax-attribute-name">' + definitionPart[0] + '</span><span class="md-code-syntax md-code-syntax-controls">';
					definitionPart[1] = '</span><span class="md-code-syntax md-code-syntax-attribute-value">' + definitionPart[1] + '</span>';
					definitionParts[d] = definitionPart.join('<span class="md-code-syntax md-code-syntax-attribute-control">&#58;</span>');  //:
				}
				definition = definitionParts.join('<span class="md-code-syntax md-code-syntax-controls">&#59;</span>'); //;
				if(isElements)
				{
					parts[1] = definition;
				}
				else
				{
					parts[0] = definition;	
				}
				var symbolOpen = (isColon) ? ',' : '&#123;';
				rules[j] = parts.join('<span class="md-code-syntax md-code-syntax-symbol">' + symbolOpen + '</span>'); //{
			}
			lines[i] = rules.join('<span class="md-code-syntax md-code-syntax-symbol">&#125;</span>'); //}
		}
		return lines;
	};

	var codeHighlighterGeneral = function(language, lines, addTags, parseCodeFunction)
	{
		for(var i in lines)
		{
			lines[i] = unHTML(lines[i]);
		}
		return lines;
	}

	var registeredCodeHighlight = {	
		general: codeHighlighterGeneral,
		javascript: codeHighlighterJavascript,
		python: codeHighlighterPython,
		html: codeHighlighterHTML,
		css: codeHighlighterCSS,
		bash: codeHighlighterBash,
		ini: codeHighlighterIni,
		php: codeHighlighterPHP
	};

	var formatNonBreak = [];
	var formatCode     = [];

	var parseEmpty = function(lines)
	{
		var linesOutput = [];
		for (var i in lines) 
		{
			if(formatCode.indexOf(i) !== -1)
			{
				linesOutput.push(lines[i]);
				continue;
			}
			var line = lines[i].trim();
			if(line !== '')
			{
				linesOutput.push(lines[i]);
				continue;
			}
			formatNonBreak.push(i);
			linesOutput.push('<br>');
		}
		return linesOutput;
	}


	var parseHeaders = function(lines)
	{
		var linesOutput = [];
		for (var i in lines) 
		{
			if(formatCode.indexOf(i) !== -1)
			{
				linesOutput.push(lines[i]);
				continue;
			}
			var lineResult = /^((\#{1,4})([^\n]+))/.exec(lines[i]);
        	if (lineResult === null) 
        	{
        		linesOutput.push(lines[i]);
        		continue;
        	}
        	var headerType;
        	var className  = configUI.header.class;
        	switch(lineResult[2])
        	{
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

	var processInlineItem = function(line)
	{
		var lineResult = /(?:([\*]{1,3}))([^\*\n]+[^\*\s])\1/.exec(line);
		if (lineResult === null) 
		{
			return line;
		}
		var formatType;
		var className = '';
		switch(lineResult[1])
		{
			case '*':
				formatType = 'em';
				className  = configUI.em['class'];
				break;
			case '**':
				formatType = 'strong';
				className  = configUI.strong['class'];
				break;
			default:
				formatType = 'strong';
				break;
		}
		var lineInline = '<' + formatType + ' class="' + className + '">' + lineResult[2] + '</' + formatType + '>';
		line = line.replace(lineResult[0], lineInline);
		return processInlineItem(line);
	}

	var parseInline = function(lines)
	{
		var linesOutput = [];
		for (var i in lines) 
		{
			if(formatCode.indexOf(i) !== -1)
			{
				linesOutput.push(lines[i]);
				continue;
			}
        	linesOutput.push(processInlineItem(lines[i]));
        }
        return linesOutput;
	}

	var processImagesItem = function(line)
	{
		var lineResult = /([\!]{1,1})(([\[]{1,1}([^\]]{1,})[\]]{1,1}){0,1})([\(]{1,1}([^\)]{4,})[\)]{1,1}\s{0,})/.exec(line);
    	if (lineResult === null) 
    	{
    		return line;
    	}
    	var lineImage = '<img src="' + lineResult[6] + '"';
    	lineImage += ' class="' + configUI.image['class'] + '"';
    	lineImage += '>';
    	line = line.replace(lineResult[0], lineImage);
    	return processImagesItem(line);
	}


	//http://meta.stackexchange.com/questions/38915/creating-an-image-link-in-markdown-format - with links
	/*
	[![Foo](http://www.google.com.au/images/nav_logo7.png)](http://google.com.au/)
	*/
	var parseImages = function(lines)
	{
		var linesOutput = [];
		for (var i in lines) 
		{
			if(formatCode.indexOf(i) !== -1)
			{
				linesOutput.push(lines[i]);
				continue;
			}
        	linesOutput.push(processImagesItem(lines[i]));
        }
        return linesOutput;
	}

	var processLinksItem = function(line)
	{
		var lineTitleResult = /([\[]{1,1})([^\]]{1,})([\]]{1,1})([\(]{1,1})([^\)]{1,})([\)]{1,1})/.exec(line); //[zde](http://www.x4u.cz)
    	if (lineTitleResult === null)
    	{
    		return line;
    	}
    	var name = lineTitleResult[2];
    	var lineLink = '<a href="' + lineTitleResult[5] + '" target="_blank">' + name + '</a>';
    	line = line.replace(lineTitleResult[0], lineLink);
    	return processLinksItem(line);
	}

	var parseLinks = function(lines)
	{
		var linesOutput = [];
		for (var i in lines) 
		{
        	linesOutput.push(processLinksItem(lines[i]));
        }
        return linesOutput;
	}

	var parseCodeLinesByLanguage = function(language, lines)
	{
		language = getModeLanguage(language);
		language = (isRegisteredCodeHighlight(language)) ? language : 'general';
		return registeredCodeHighlight[language](language, lines, false, parseCodeLinesByLanguage);
	}

	var parseCodeInline = function(lines)
	{
		var language    = 'general';
		var linesOutput = [];

		var replaceCode = function(symbol) 
		{
			var input      = arguments[5];
			var language   = 'general';
        	var langResult = /^([a-zA-Z0-9]{2,}[\s]{1,})/g.exec(arguments[2]);
        	var codeIndex  = 0;
        	if(langResult !== null)
        	{
        		var languageNew = langResult[1].trim();
        		codeIndex       = langResult[1].length;
        		language        = (isRegisteredCodeHighlight(languageNew)) ? getModeLanguage(languageNew) : 'general';
        	}
			var code     = (language === 'general') ? arguments[2] : arguments[2].substring(codeIndex);//.replace('[\s]');
			code         = parseCodeLinesByLanguage(language, [code]).join('');
			var output   = '<pre class="inline ' + configUI.code['class'] + ' md-code-syntax-lang-' + language + '" title="' + ((language === 'general') ? 'code' : 'code: ' + language ) + '">' + code + '</pre>';
			return output;
		}

		for(var i in lines)
		{
			if(formatCode.indexOf(i) !== -1)
			{
				linesOutput.push(lines[i]);
				continue;
			}

			var lineResult = /([\`]{1,1})([^\`]{1,})([\`]{1,1})/g.exec(lines[i]);
        	if(lineResult === null)
        	{
				linesOutput.push(lines[i]);
				continue;
        	}

			var re = new RegExp('([\`]{1,1})([^\`]{1,})([\`]{1,1})', 'g');
			lines[i] = lines[i].replace(re, replaceCode);
			linesOutput.push(lines[i]);
        }	
        return linesOutput;
	}

	var parseCode = function(lines)
	{
		var language         = 'general';
		var linesOutput      = [];
		var linesCode        = [];
		var isCodeStarted    = false;

		var processCodeLines = function()
		{
			if(linesCode.length === 0)
			{
				return;
			}
			language   = (isRegisteredCodeHighlight(language)) ? language : 'general';

			var output = parseCodeLinesByLanguage(language, linesCode);
			//error in other than general (built-in) codeHighlighter have fallback to switch to try general codeHighlighter
			if(false === U.isArray(output))
			{
				if(language === 'general')
				{
					linesCode = [];
					return;
				}
				output = parseCodeLinesByLanguage('general', linesCode);
				if(false === U.isArray(output))
				{
					linesCode = [];
					return;
				}
			}

			var iLast = (output.length - 1);
			var i     = 0;
			for(;i <= iLast; i++)
			{
				if(i === 0)
				{
					var useLabel  = (language === 'general') ? false : true;
					var lineTag   = '<pre';
					lineTag      += ' class="' + configUI.code['class'];
					lineTag      += (useLabel) ? ' lang-label' : '';
					lineTag      += ' md-code-syntax-lang-' + language + '">';
					lineTag      += (useLabel) ? '<span class="md-code-syntax-lang-label">' + (language.toUpperCase()) + '</span>' : '';
					output[i]     = lineTag;
				}
				if(i === iLast)
				{
					output[i]     = output[i] + '</pre>';
				}
				linesOutput.push(output[i]);
			}
			linesCode = [];
		}

		for (var i in lines) 
		{
			if(isCodeStarted)
			{
				var lineResult = /^([^`]{0,})(([\`]{3,3}){0,1})/.exec(lines[i]);	
			}
			else
			{
				var lineResult = /^([\`]{3,3})([^`]+)(([\`]{3,3}){0,1})/.exec(lines[i]);
			}

        	if(lineResult === null)
        	{
        		if(false === isCodeStarted)
        		{
					var line  = '';
					linesOutput.push(lines[i]);
					continue;
        		}
        		linesCode.push(lines[i]);
        		continue;
        	}

        	if(false === isCodeStarted)
        	{
        		linesCode = [];
        		var languageNew = lineResult[2].trim();
				language = (isRegisteredCodeHighlight(languageNew)) ? getModeLanguage(languageNew) : 'general';
        		linesCode.push(lineResult[2]);
        		if(lineResult[3] === '')
        		{
        			isCodeStarted = true;
        		}
        	}
        	else
        	{
        		linesCode.push(lineResult[1]);
        		if(lineResult[2] !== '')
        		{
        			processCodeLines();
        			isCodeStarted = false;
        		}
        	}

        	formatCode.push(i);
        	formatNonBreak.push(i);
        }	
    	if(true === isCodeStarted)
    	{
    		isCodeStarted = false;
    		processCodeLines();
    	}
        return linesOutput;
	}

	var parseLists = function(lines)
	{
		var linesOutput = [];
		var isListStarted = false;
		var isListOrdered = false;
		for (var i in lines) 
		{
			if(formatCode.indexOf(i) !== -1)
			{
				linesOutput.push(lines[i]);
				continue;
			}
			var lineResult = /^((\*|\-){1,1})([^\*\-]{1,})/.exec(lines[i]);
        	if (lineResult === null) 
        	{
        		var line = lines[i];
        		if(isListStarted)
        		{
        			line = ((isListOrdered) ? '</ol>' : '</ul>') + line;
        			isListStarted = false;
        		}
        		linesOutput.push(line);
        		continue;
        	}
        	
        	if(isListStarted)
        	{
        		var line = '';
        		isListOrderedCurrent = (lineResult[1] === '-') ? true : false;
        		if(isListOrderedCurrent !== isListOrdered)
        		{
        			line += (false === isListOrderedCurrent) ? '</ol><ul class="' + configUI.list['class'] + '">' : '</ul><ol class="' + configUI.listOrdered['class'] + '">';
        			isListOrdered = isListOrderedCurrent;
        		}
        		line += '<li>' + lineResult[3].trim() + '</li>';
        	}
        	else
        	{
        		isListOrdered = (lineResult[1] === '-') ? true : false;
        		if(isListOrdered)
        		{
        			var line = '<ol class="' + configUI.listOrdered['class'] + '">';
        		}
        		else
        		{
        			var line = '<ul class="' + configUI.list['class'] + '">';
        		}
    			isListStarted = true;
        		line += '<li>' + lineResult[3].trim() + '</li>';
        	}
        	formatNonBreak.push(i);
        	linesOutput.push(line);
        }

		if(isListStarted)
		{
			var line = (isListOrdered) ? '</ol>' : '</ul>';
			linesOutput[i] += line;
		}
        return linesOutput;
	}

	var parseTableSimple = function(lines)
	{
		var linesOutput = [];
		var isTableStarted = false;
		for (var i in lines) 
		{
			if(formatCode.indexOf(i) !== -1)
			{
				linesOutput.push(lines[i]);
				continue;
			}
			if(isTableStarted)
			{
				var lineResult = /^([^\]]+)(([\]]{1,1}){0,1})/.exec(lines[i]);	
			}
			else
			{
				var lineResult = /^([\[]{1,1})([^\]]+)$/.exec(lines[i]);
			}
        	if (lineResult === null) 
        	{
        		if(isTableStarted)
        		{
        			linesOutput.push('</table>');
        			isTableStarted = false;
        		}
        		linesOutput.push(lines[i]);
        		continue;
        	}

        	if(isTableStarted)
        	{
        		var rows = lineResult[1].split(';');
        		var line = '<tr>';
        		for(var r in rows)
        		{
        			line += '<td>' + rows[r].trim() + '</td>';
        		}
    			line += '</tr>';
    			if(lineResult[2] !== '')
    			{
    				isTableStarted = false;
    				line += '</table>';
    			}
        	}
        	else
        	{
        		isTableStarted = true;
        		var rows = lineResult[2].split(';');
        		var line = '<table class="' + configUI.table['class'] + '"><tr>';
        		for(var r in rows)
        		{
        			line += '<th>' + rows[r].trim() + '</th>';
        		}
    			line += '</tr>';
        	}
			formatNonBreak.push(i);
        	linesOutput.push(line);
        }	
        return linesOutput;
	}

	var parseTable = function(lines)
	{
		var linesOutput = [];
		var table = {
			'header': [],
			'rows': [],
			'align': []
		};
		var isTableHeader       = false;
		var isTableWaitingAlign = false;
		var isTableStarted      = false;

		var processRow = function(line)
		{
			var cols = line.split('|');
			var row  = [];
			for(var c in cols)
			{
				row.push(cols[c].trim());
			}
			return row;
		}

		var processTable = function()
		{
    		var line = '<table class="' + configUI.table['class'] + '"><tr>';
			for(var c in table.header)
			{
				var i     = parseInt(c);
				var align = table.align[i];
				line += '<th align="' + align + '" class="text-' + align + '">' + table.header[c] + '</th>';
			}
			line += '</tr>';
			linesOutput.push(line);
			for(var r in table.rows)
			{
				var row    = table.rows[r];
				var line   = '<tr>';
				for(var c in row)
				{
					var i     = parseInt(c);
					var align = table.align[i];
					line += '<td align="' + align + '" class="text-' + align + '">' + row[c] + '</td>';
				}
				line += '</tr>';
				linesOutput.push(line);
			}
			linesOutput[(linesOutput.length - 1)] += '</table>';
			table = {
				'header': [],
				'rows': [],
				'align': []
			};
		}

		for (var i in lines) 
		{
			if(formatCode.indexOf(i) !== -1)
			{
				linesOutput.push(lines[i]);
				continue;
			}

			var line = lines[i].replace(/^([\|]{1,1})/, '');
			line     = line.replace(/([\|]{1,1})$/, '');
			if(isTableWaitingAlign)
			{
				var lineResult = /([\|]{0,1}[\s\:]{0,1}[\-]{1,})/.exec(line);
			}
			else
			{
				var lineResult = /([\|]{1,1}[^\|]{1,})/.exec(line);
			}

        	if (lineResult === null) 
        	{
        		if(isTableStarted)
        		{
        			processTable();
        			isTableStarted = false;
        			isTableWaitingAlign = false;
        			isTableHeader = false;
        		}
        		linesOutput.push(lines[i]);
        		continue;
        	}
        	if(isTableWaitingAlign)
        	{
        		var cols = line.split('|');
        		if(cols.length !== table.header.length)
        		{
        			throw new Error('align cols not match!');
        		}
        		for(var c in cols)
        		{
        			var colResult = /(([\:]{0,1})[\-]{1,}[\s]{0,}([\:]{0,1}))/.exec(cols[c]); //[":--- :", ":--- :", ":", ":", index: 0, input: ":--- :"]
        			var align     = 'left';
        			if(colResult === null)
        			{
        				table.align.push(align);
        				continue;
        			}
        			var alignText = colResult[2] + '-' + colResult[3];
        			
        			switch(alignText)
        			{
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
        		isTableStarted      = true;
        		continue;
        	}
        	else
        	{
				var row  = processRow(line);
				if(false === isTableHeader)
				{
					table.header        = row;
		    		isTableHeader       = true;
		    		isTableWaitingAlign = true;
				}
				else
				{
					table.rows.push(row);
				}
        	}
			formatNonBreak.push(i);
        }

		if(isTableStarted)
		{
			processTable();
		}
        return linesOutput;
	}

	var formatBreaks = function(lines)
	{
		for(var i in lines)
		{
			if(formatCode.indexOf(i) !== -1)
			{
				continue;
			}
			if(formatNonBreak.indexOf(i) !== -1)
			{
				continue;
			}
			lines[i] += '<br>';
		}
		return lines;
	}

	var isRegisteredCodeHighlight = function(language)
	{
		return (registeredCodeHighlight.hasOwnProperty(language));
	}

	var _parse = function(string)
	{
		var lines = string.split('\n');
		lines = parseCode(lines);
		lines = parseEmpty(lines);
		lines = parseImages(lines);
		lines = parseHeaders(lines);
		lines = parseInline(lines);
		lines = parseLinks(lines);
		if(config.mode === 'extended')
		{
			lines = parseTableSimple(lines);
		}
		lines = parseTable(lines);
		lines = parseLists(lines);
		lines = formatBreaks(lines);
		lines = parseCodeInline(lines);
		//console.log('parseCodeInline', parseCodeInline(lines));
		// console.log('MD RESULT:', lines.join('<br>'))
		return lines.join('\n');
	}



	/*@todo Perpare for modular code highlight*/
	var _registerCodeHighlight = function(language, processFunction)
	{
		if(false === U.isString(language))
		{
			throw new Error('MD registerCodeHighlight Error: invalid language!');
		}
		if(false === U.isFunction(processFunction))
		{
			throw new Error('MD registerCodeHighlight Error: invalid process function!');
		}
		if(true === isRegisteredCodeHighlight(language))
		{
			throw new Error('MD registerCodeHighlight Error: language allready registered!');
		}
		if(language !== getModeLanguage(language))
		{
			throw new Error('MD registerCodeHighlight Error: language not allowed by selected mode "' + config.mode + '"!');	
		}
		registeredCodeHighlight[language] = processFunction;
	}

	return {
		'parse': _parse,
		'registerCodeHighlight': _registerCodeHighlight
	}
}
