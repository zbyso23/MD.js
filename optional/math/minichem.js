/* MiniChem Basic: small, intentionally limited chemical typography helper. */
(function(root){'use strict';
 class MiniChem {
  static formula(input) {
   if(typeof input!=='string'||input.length>2048)throw new Error('MiniChem: invalid input length');
   const arrows={'<=>':'\\rightleftharpoons','<->':'\\leftrightarrow','->':'\\rightarrow','<-':'\\leftarrow'};
   let out='',i=0;
   const group=(s)=>'\\mathrm{'+s+'}';
   while(i<input.length){
    let s=input.slice(i),arrow=Object.keys(arrows).find(a=>s.startsWith(a));
    if(arrow){if(i===0 || !input.slice(i+arrow.length).trim())throw new Error('MiniChem: incomplete reaction');out+='\\;'+arrows[arrow]+'\\;';i+=arrow.length;continue;}
    let c=input[i];
    if(/\s/.test(c)){out+='\\;';while(/\s/.test(input[++i]||'')){}continue;}
    if(c==='+' && !(i===input.length-1|| /[\s+]/.test(input[i+1]||''))){out+='\\; + \\;';i++;continue;}
    if(c==='+') {if(i===input.length-1 && /[A-Za-z0-9\])]/.test(input[i-1]||'')){out+='^{+}';}else out+='\\;+\\;';i++;continue;}
    if(c==='^'){
      let m=input.slice(i).match(/^\^\{([^{}]+)\}/)||input.slice(i).match(/^\^([0-9]*[+-]|[+-])/);
      if(!m|| !/^[0-9]*[+-]$|^[+-]$/.test(m[1]))throw new Error('MiniChem: expected ionic charge');
      out+='^{'+m[1]+'}';i+=m[0].length;continue;
    }
    if(c==='-') {if(i===input.length-1){out+='^{-}';i++;continue;}throw new Error('MiniChem: unsupported dash');}
    if(/[A-Z]/.test(c)){let m=input.slice(i).match(/^[A-Z][a-z]?/)[0];out+=group(m);i+=m.length;continue;}
    if(/[0-9]/.test(c)){let m=input.slice(i).match(/^\d+/)[0];
      let initial=i===0|| /(?:\s|\+|>|<)/.test(input[i-1]);out+=initial?m:'_{'+m+'}';i+=m.length;continue;}
    if('()[]'.includes(c)){out+=c==='['?'\\lbrack ':c===']'?'\\rbrack ':c;i++;continue;}
    throw new Error('MiniChem: unsupported token '+c);
   }
   return out;
  }
  static expand(tex){return tex.replace(/\\ce\{([^{}]*)\}/g,(_,content)=>MiniChem.formula(content));}
 }
 root.MiniChem=MiniChem;
})(typeof window!=='undefined'?window:globalThis);
