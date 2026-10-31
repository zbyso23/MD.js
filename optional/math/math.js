/* Math Plugin: KaTeX offline. Does not evaluate expressions. */
(function(root){'use strict';
 const config={enabled:true,throwOnError:false,trust:false,strict:'warn',maxExpand:1000,maxSize:10};
 const skip=new Set(['SCRIPT','STYLE','TEXTAREA','PRE','CODE','NOSCRIPT','KBD','SAMP','SVG','MATH']);
 function delimiters(s){
   let result=[],i=0,start=0;
   function match(pos){const pairs=[['$$','$$',true],['\\[','\\]',true],['\\(','\\)',false],['$','$',false]];
     for(const [open,close,display] of pairs){if(s.startsWith(open,pos) && !(pos&&s[pos-1]==='\\')){
       if(open==='$' && s[pos+1]==='$')continue;
       let j=pos+open.length;
       for(;j<s.length;j++){if(s.startsWith(close,j)&&s[j-1]!=='\\'){
         if(open==='$' && s[j+1]==='$')continue;
         if(j===pos+open.length)return null;
         return {begin:pos,end:j+close.length,tex:s.slice(pos+open.length,j),display};
       }} }
     }return null;
   }
   while(i<s.length){let hit=match(i);if(hit){if(i>start)result.push({text:s.slice(start,i)});result.push(hit);i=hit.end;start=i;}else i++;}
   if(start<s.length)result.push({text:s.slice(start)});return result;
 }
 function render(rootElement){if(!config.enabled||!root.katex||!rootElement)return 0;let nodes=[],walker=document.createTreeWalker(rootElement,NodeFilter.SHOW_TEXT);let n;
   while((n=walker.nextNode())){let p=n.parentElement;if(!p||!n.nodeValue||!n.nodeValue.includes('$')&&!n.nodeValue.includes('\\(')&&!n.nodeValue.includes('\\['))continue;
     if(p.closest('[data-md-math-rendered]')||p.closest('a,button,input,select,textarea'))continue;
     let blocked=false;for(let q=p;q&&q!==rootElement.parentElement;q=q.parentElement){if(skip.has(q.tagName)){blocked=true;break;}}if(!blocked)nodes.push(n);
   }
   let count=0;for(let node of nodes){const parts=delimiters(node.nodeValue);if(!parts.some(x=>x.tex!==undefined))continue;let frag=document.createDocumentFragment();
     for(let x of parts){if(x.text!==undefined){frag.appendChild(document.createTextNode(x.text));continue;}
       const holder=document.createElement(x.display?'span':'span');holder.className=x.display?'md-math-block':'md-math-inline';holder.setAttribute('data-md-math-rendered','');
       try{root.katex.render(root.MiniChem?root.MiniChem.expand(x.tex):x.tex,holder,{displayMode:x.display,throwOnError:config.throwOnError,trust:false,strict:config.strict,maxExpand:config.maxExpand,maxSize:config.maxSize,output:'htmlAndMathml'});count++;}
       catch(err){holder.className='md-math-error';holder.textContent=x.tex;holder.title=String(err.message||err);}
       frag.appendChild(holder);
     }node.replaceWith(frag);
   }return count;
 }
 root.MDMathPlugin={config,render,parse:delimiters};
})(typeof window!=='undefined'?window:globalThis);
