# MD.js
simple markdown javascript parser

Requires U (small utils library) - included in project folder

support:
- lists
- simple tables *(1)*: `[cel1; cel2; cel3 \nrow2 cel1; row2 cel2; row2 cel3]`
- tables
- headers
- links
- images
- code
- code inline
- links with images

built in code syntax highlight:
- javascript
- python
- html *(1)*
- css *(1)*
- bash *(1)*
- ini *(1)*
- php *(1)*


(1) is supported only in extended mode (default: basic)

usage:
```javascript
var mdConfig = { mode: 'extended' }; //mode: ['basic', 'extended']
var md = new MD(mdConfig);
var text = "#Header 1\n##Header 2\n###Header 3\n[Link Title](https://github.com/zbyso23/MD)";
document.body.innerHTML = md.parse(text);
```

new syntax highlight supported by modules:
```javascript
md.registerCodeHighlight(languageName, callback(language, linesCode, addTags, parseCodeFunction){
  //do something with lines code
  //possible to call parseCodeFunction(language, lines) for lines with sublanguage - for example css in html
  return linesCode;
});
```

🧱 This project is licensed under the MIT License.
🧨 However, the author explicitly discourages use by corporations that:
- Enforce vendor lock-in
- Restrict indie developer rights
- Exploit OSS without giving back

This includes (but is not limited to): **Valve Corporation**.

You may technically use this software — but if you do, we’ll all know.
