/* MiniChem Plus III — offline chemical typography; no execution. */
(function(root){'use strict';
 class MiniChem {
  static formula(input){
   if(typeof input!=='string'||!input.length||input.length>2048)throw Error('MiniChem: invalid input length');
   const arrows={'<=>':'\\rightleftharpoons','<->':'\\leftrightarrow','->':'\\rightarrow','<-':'\\leftarrow'};
   const atom=x=>'\\mathrm{'+x+'}';
   let out='',i=0,depth=0,needSpecies=true,groupStack=[];
   function charge(s){if(!/^(?:[1-9][0-9]*)?[+-]$/.test(s))throw Error('MiniChem: invalid ionic charge');return '^{'+s+'}';}
   while(i<input.length){
    let rest=input.slice(i),a=Object.keys(arrows).find(x=>rest.startsWith(x));
    if(a){
      if(needSpecies)throw Error('MiniChem: missing left species');
      i+=a.length;
      const annotations=[];
      while(input[i]==='['){
       if(annotations.length===2)throw Error('MiniChem: too many arrow annotations');
       const end=input.indexOf(']',i+1);
       if(end<0)throw Error('MiniChem: unclosed arrow annotation');
       const label=input.slice(i+1,end).trim();
       if(!label||label.length>48||!/^[A-Za-z0-9 .,+°/()_-]+$/.test(label))throw Error('MiniChem: unsupported arrow annotation');
       annotations.push(label);i=end+1;
      }
      if(!input.slice(i).trim())throw Error('MiniChem: missing right species');
      if(annotations.length){
       // A closed, deliberately restricted plain-text label: no raw TeX commands.
       const label=x=>'\\text{'+x.replace(/([{}\\])/g,'\\$1')+'}';
       const extensible={'->':'\\xrightarrow','<-':'\\xleftarrow','<->':'\\xleftrightarrow','<=>':'\\xrightleftharpoons'};
       let cmd=extensible[a];
       out+='\\;'+cmd+(annotations[1]?'['+label(annotations[1])+']':'')+'{'+label(annotations[0])+'}\\;';
      }else out+='\\;'+arrows[a]+'\\;';
      needSpecies=true;continue;
     }
    let c=input[i];
    if(/\s/.test(c)){while(i<input.length&&/\s/.test(input[i]))i++;if(!needSpecies)out+='\\;';continue;}
    if(c==='^'){
      // Leading isotope or explicit ionic charge. Nested braces supported at the outer \\ce level.
      let m=rest.match(/^\^\{([0-9]+)\}/)||rest.match(/^\^([0-9]+)(?=_|[A-Z])/);
      if(m && (needSpecies || (i>0 && input[i-1]==='_'))){out+='^{'+m[1]+'}';i+=m[0].length;continue;}
      m=rest.match(/^\^\{([^{}]+)\}/)||rest.match(/^\^([0-9]*[+-]|[+-])/);
      if(!m)throw Error('MiniChem: malformed superscript');out+=charge(m[1]);i+=m[0].length;needSpecies=false;continue;
    }
    if(c==='_'){
      let m=rest.match(/^_\{([0-9]+)\}/)||rest.match(/^_([0-9]+)/);
      if(!m || !needSpecies)throw Error('MiniChem: invalid isotope subscript');out+='_{'+m[1]+'}';i+=m[0].length;continue;
    }
    const state=rest.match(/^\((aq|s|l|g)\)(?![A-Za-z0-9])/);
    if(state&&!needSpecies){out+='\\,\\mathrm{('+state[1]+')}';i+=state[0].length;continue;}
    // Hydrate separator: * and middle dot; coefficients after the separator are not subscripts.
    if(c==='*'||c==='·'||c==='•'){
      if(needSpecies||!input.slice(i+1).trim())throw Error('MiniChem: incomplete hydrate');
      out+='\\cdot ';i++;needSpecies=true;continue;
    }
    if(c==='+'){
      if(!needSpecies && (i===input.length-1 || (i+1<input.length && /\s/.test(input[i+1]) && !input.slice(i+1).trim()))){out+=charge('+');i++;needSpecies=false;continue;}
      if(needSpecies)throw Error('MiniChem: unexpected plus');
      // Adjacent + after a formula denotes an ionic charge; a spaced + with next species is a separator.
      if(i>0&&!/\s/.test(input[i-1]) && i+1<input.length&&/\s/.test(input[i+1])){
       const remaining=input.slice(i+1).trim();if(remaining && !remaining.startsWith('+')){out+='\\;+\\;';i++;needSpecies=true;continue;}
      }
      out+='\\;+\\;';i++;needSpecies=true;continue;
    }
    if(c==='-'){if(!needSpecies&&(i===input.length-1|| /\s/.test(input[i+1]||''))){out+=charge('-');i++;continue;}throw Error('MiniChem: unsupported dash');}
    if(/[A-Z]/.test(c)){const m=rest.match(/^[A-Z][a-z]?/)[0];out+=atom(m);i+=m.length;needSpecies=false;continue;}
    if(/[0-9]/.test(c)){const m=rest.match(/^\d+/)[0];out+=needSpecies?m:'_{'+m+'}';i+=m.length;needSpecies=false;continue;}
    if('(['.includes(c)){if(depth>=32)throw Error('MiniChem: group nesting exceeds 32 at '+i);out+=c==='['?'\\lbrack ':'(';groupStack.push(c);depth++;i++;needSpecies=true;continue;}
    if(')]'.includes(c)){if(!depth || groupStack.pop()!==(c===')'?'(':'['))throw Error('MiniChem: mismatched bracket at '+i);out+=c===']'?'\\rbrack ':')';depth--;i++;needSpecies=false;continue;}
    throw Error('MiniChem: unsupported token '+c);
   }
   if(depth||needSpecies)throw Error('MiniChem: incomplete formula at '+i);return out;
  }
  static diagnose(input){
   if(typeof input!=='string')return {ok:false,index:0,message:'Expected text',hint:'Enter a chemical formula.'};
   try {const tex=MiniChem.formula(input);return {ok:true,tex,index:-1,message:'OK',hint:''};}
   catch(err){const msg=String(err.message||err);let index=Number((msg.match(/ at (\d+)/)||[])[1]);
    if(!Number.isFinite(index)){
     if(/unclosed arrow annotation/.test(msg))index=input.lastIndexOf('[');
     else if(/unmatched|incomplete/.test(msg))index=input.length;
     else index=0;
    }
    const hint=/annotation/.test(msg)?'Use ->[catalyst][temperature] with plain-text labels (max 48 characters).':
     /bracket|group/.test(msg)?'Check paired parentheses and square brackets.':
     /charge|superscript/.test(msg)?'Use ^{2-}, ^{3+} or ^2- for charges.':
     'Check the MiniChem supported syntax; this is a limited mhchem subset.';
    return {ok:false,index:Math.max(0,index),message:msg,hint};
   }
  }
  static expand(tex){
   if(typeof tex!=='string')throw Error('MiniChem: expected TeX string');
   let out='',i=0;
   while(i<tex.length){const p=tex.indexOf('\\ce{',i);if(p<0){out+=tex.slice(i);break;}out+=tex.slice(i,p);let j=p+4,depth=1;
    const start=j;while(j<tex.length&&depth){if(tex[j]==='{')depth++;if(tex[j]==='}')depth--;j++;}
    if(depth)throw Error('MiniChem: unmatched \\ce braces');out+=MiniChem.formula(tex.slice(start,j-1));i=j;
   }return out;
  }
 }
 root.MiniChem=MiniChem;
})(typeof window!=='undefined'?window:globalThis);
