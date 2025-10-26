function highlightLine(line, languageState) {
    // 1️⃣ Komentáře
    if (languageState.commentChar) {
        const commentIndex = line.indexOf(languageState.commentChar);
        if (commentIndex !== -1) {
            const comment = line.substring(commentIndex);
            line = line.substring(0, commentIndex) +
                `<span class="md-code-syntax md-code-syntax-comment">${comment}</span>`;
        }
    }

    // 2️⃣ Klíčová slova
    if (languageState.keywords && languageState.keywords.length > 0) {
        const reKeywords = new RegExp(`\\b(${languageState.keywords.join('|')})\\b`, 'g');
        line = line.replace(reKeywords, (match) => 
            `<span class="md-code-syntax md-code-syntax-command">${match}</span>`
        );
    }

    // 3️⃣ Symboly
    if (languageState.symbols && languageState.symbols.length > 0) {
        const reSymbols = new RegExp(`([${languageState.symbols.map(s => '\\' + s).join('')}])`, 'g');
        line = line.replace(reSymbols, (match) =>
            `<span class="md-code-syntax md-code-syntax-symbol">${match}</span>`
        );
    }

    // 4️⃣ Post-patterns (např. @instance, ?/! u metod)
    if (languageState.postPatterns && languageState.postPatterns.length > 0) {
        for (const pattern of languageState.postPatterns) {
            line = line.replace(pattern, (match) => 
                `<span class="md-code-syntax md-code-syntax-post">${match}</span>`
            );
        }
    }

    return line;
}



// 2nd
function highlightLine(line, languageState) {
    // 1️⃣ Komentáře
    if (languageState.commentChar) {
        const commentIndex = line.indexOf(languageState.commentChar);
        if (commentIndex !== -1) {
            const comment = line.substring(commentIndex);
            line = line.substring(0, commentIndex) +
                `<span class="md-code-syntax md-code-syntax-comment">${comment}</span>`;
        }
    }

    // 2️⃣ Special calls (např. console.log, Array.from)
    if (languageState.specialCalls && languageState.specialCalls.length > 0) {
        for (const call of languageState.specialCalls) {
            const reCall = new RegExp(call.replace(/\./g, '\\.'), 'g');
            line = line.replace(reCall, `<span class="md-code-syntax md-code-syntax-call">${call}</span>`);
        }
    }

    // 3️⃣ Klíčová slova
    if (languageState.keywords && languageState.keywords.length > 0) {
        const reKeywords = new RegExp(`\\b(${languageState.keywords.join('|')})\\b`, 'g');
        line = line.replace(reKeywords, (match) => 
            `<span class="md-code-syntax md-code-syntax-command">${match}</span>`
        );
    }

    // 4️⃣ Symboly
    if (languageState.symbols && languageState.symbols.length > 0) {
        const reSymbols = new RegExp(`([${languageState.symbols.map(s => '\\' + s).join('')}])`, 'g');
        line = line.replace(reSymbols, (match) =>
            `<span class="md-code-syntax md-code-syntax-symbol">${match}</span>`
        );
    }

    // 5️⃣ Post-patterns (např. @instance, ?/! u metod)
    if (languageState.postPatterns && languageState.postPatterns.length > 0) {
        for (const pattern of languageState.postPatterns) {
            line = line.replace(pattern, (match) => 
                `<span class="md-code-syntax md-code-syntax-post">${match}</span>`
            );
        }
    }

    return line;
}



const rubyConfig = {
  keywords: ['def', 'end', 'if', 'else', 'class', 'module', 'return'],
  symbols: ['(', ')', '{', '}', '[', ']', '.', ',', ':', ';'],
  commentChar: '#',
  postPatterns: [/@\w+/, /\w+[?!]/]
};

const jsConfig = {
  keywords: ['function', 'return', 'if', 'else', 'class', 'var', 'let', 'const'],
  symbols: ['(', ')', '{', '}', '[', ']', '.', ',', ':', ';'],
  commentChar: '//',
  postPatterns: [/\w+\?/]
};

highlightLine("result.success?", rubyConfig);