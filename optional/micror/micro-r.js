/* MD.js Ultra Micro R Statistics Lab — original minimal offline interpreter, no eval. */
(function(root){'use strict';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const arr=x=>Array.isArray(x)?x:[x];
const scalar=x=>{if(Array.isArray(x))throw Error('Expected scalar');if(!finite(x))throw Error('Expected finite number');return x;};
const nums=x=>{const a=arr(x);if(!a.length||!a.every(finite))throw Error('Expected nonempty numeric vector');return a;};
const mean=x=>{const a=nums(x);return a.reduce((s,v)=>s+v,0)/a.length;};
const quantile=(x,q)=>{const a=nums(x).slice().sort((a,b)=>a-b);q=scalar(q);if(q<0||q>1)throw Error('quantile probability must be between 0 and 1');let i=(a.length-1)*q,k=Math.floor(i);return a[k]+(a[Math.min(k+1,a.length-1)]-a[k])*(i-k);};
const variance=x=>{let a=nums(x);if(a.length<2)throw Error('sample variance needs at least two values');const m=mean(a);return a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1)};
const vectorOp=(a,b,fn)=>{if(!Array.isArray(a)&&!Array.isArray(b))return fn(scalar(a),scalar(b));let aa=nums(a),bb=nums(b);if(aa.length!==bb.length&&aa.length!==1&&bb.length!==1)throw Error('length mismatch (recycling is not supported)');let n=Math.max(aa.length,bb.length);return Array.from({length:n},(_,i)=>{const v=fn(aa[i%aa.length],bb[i%bb.length]);if(!finite(v))throw Error('Non-finite result');return v;});};
const isFrame=x=>x&&typeof x==='object'&&x.kind==='data.frame'&&Array.isArray(x.columns);
const makeFrame=cols=>{const names=Object.keys(cols);if(!names.length)throw Error('Empty data frame');const n=arr(cols[names[0]]).length;if(names.some(k=>arr(cols[k]).length!==n))throw Error('Columns must have equal lengths');return {kind:'data.frame',columns:names,rows:Array.from({length:n},(_,i)=>Object.fromEntries(names.map(k=>[k,arr(cols[k])[i]]))),nrow:n,ncol:names.length};};
const column=(frame,name)=>{if(!isFrame(frame))throw Error('Expected data frame');if(!frame.columns.includes(name))throw Error('Unknown column '+name);return frame.rows.map(row=>row[name]);};
const cov=(x,y)=>{const a=nums(x),b=nums(y);if(a.length!==b.length||a.length<2)throw Error('cov needs equal vectors length >= 2');const mx=mean(a),my=mean(b);return a.reduce((s,v,i)=>s+(v-mx)*(b[i]-my),0)/(a.length-1);};
const correlation=(x,y)=>cov(x,y)/(Math.sqrt(variance(x))*Math.sqrt(variance(y)));
const numeric=()=>root.MDNumerical||(typeof require==='function'?require('./numerical-core.js'):null);
const isMissing=v=>v===null||v===undefined||(typeof v==='number'&&Number.isNaN(v));
const withoutNA=(x,remove)=>{const v=arr(x);if(!remove&&v.some(isMissing))throw Error('Missing values: use na.rm=TRUE');return v.filter(a=>!isMissing(a));};
function modelFormula(formula,data){if(!isFrame(data))throw Error('lm formula requires data frame');const parts=formula.split('~');if(parts.length!==2)throw Error('Expected y ~ predictors');const target=parts[0].trim(),rhs=parts[1].trim();if(!/^[A-Za-z][\w.]*$/.test(target))throw Error('Invalid response variable');let terms=[];for(const piece of rhs.split('+').map(x=>x.trim())){if(!piece)continue;if(piece==='1'||piece==='0'||piece==='-1')continue;if(piece.includes('*')){let m=piece.split('*').map(x=>x.trim());if(m.length!==2)throw Error('Only two-way interactions supported');for(const t of [m[0],m[1],m[0]+':'+m[1]])if(!terms.includes(t))terms.push(t);}else if(!terms.includes(piece))terms.push(piece);}if(terms.length>30)throw Error('Too many predictors');let intercept=!/(?:^|\+)\s*(?:0|-1)\s*(?:\+|$)/.test(rhs);if(!terms.length&&!intercept)throw Error('Empty model');let xs=[],ys=[],omitted=0;for(const row of data.rows){let yy=row[target],values=[],bad=isMissing(yy);if(!bad&&typeof yy!=='number')throw Error('Response must be numeric');for(const term of terms){let factors=term.split(':');if(factors.some(k=>!data.columns.includes(k)))throw Error('Unknown predictor '+term);let vals=factors.map(k=>row[k]);if(vals.some(isMissing)){bad=true;break;}if(vals.some(v=>typeof v!=='number'))throw Error('Categorical predictors not yet supported: '+term);values.push(vals.reduce((a,b)=>a*b,1));}if(bad){omitted++;continue;}xs.push(intercept?[1,...values]:values);ys.push(yy);}if(!xs.length)throw Error('No complete observations');const fit=numeric().leastSquares(xs,ys);return {kind:'lm',formula,n:fit.n,omitted,terms:intercept?['(Intercept)',...terms]:terms,coefficients:fit.coefficients,r2:fit.r2,adjR2:fit.adjR2,residuals:fit.residuals,fitted:fit.fitted,sse:fit.sse,dfResidual:fit.dfResidual};}
const m2=()=>numeric();
const functions={
 fft:x=>m2().fft(nums(x)),ifft:x=>m2().ifft(x),fft_mag:x=>m2().fft(nums(x)).map(z=>Math.hypot(z.re,z.im)),
 hann:n=>m2().window(scalar(n),'hann'),hamming:n=>m2().window(scalar(n),'hamming'),
 sine:(freq,rate,n)=>m2().signal('sine',scalar(freq),scalar(rate),scalar(n)),
 square:(freq,rate,n)=>m2().signal('square',scalar(freq),scalar(rate),scalar(n)),
 saw:(freq,rate,n)=>m2().signal('saw',scalar(freq),scalar(rate),scalar(n)),
 convolve:(a,b)=>m2().convolve(nums(a),nums(b)),
 integrate_poly:(coeff,a,b,n=256)=>m2().integrate(x=>nums(coeff).reduce((z,c,i)=>z+c*x**i,0),scalar(a),scalar(b),scalar(n)),
 derivative_poly:(coeff,x)=>m2().derivative(t=>nums(coeff).reduce((z,c,i)=>z+c*t**i,0),scalar(x)),
 ode_decay:(rate,y0,dt,steps)=>m2().ode((t,y)=>[-scalar(rate)*y[0]],0,[scalar(y0)],scalar(dt),scalar(steps),'rk4').map(p=>p.y[0]),
 spectrum:(x,rate)=>{const a=nums(x),sp=m2().fft(a),half=Math.floor(a.length/2)+1;return {chart:'spectrum',x:Array.from({length:half},(_,i)=>i*scalar(rate)/a.length),y:sp.slice(0,half).map(z=>Math.hypot(z.re,z.im)/a.length)};},

 lm_formula:modelFormula,coef:m=>{if(m.kind!=='lm')throw Error('Expected lm model');return Object.fromEntries(m.terms.map((k,i)=>[k,m.coefficients[i]]));},
 residuals:m=>{if(m.kind!=='lm')throw Error('Expected lm model');return m.residuals;},fitted:m=>{if(m.kind!=='lm')throw Error('Expected lm model');return m.fitted;},
 predict:(m,d)=>{if(m.kind!=='lm')throw Error('Expected lm model');if(d===undefined)return m.fitted;throw Error('predict(newdata) is not available yet; use fitted(model)');},
 data_frame:(...args)=>makeFrame(Object.fromEntries(args.map((v,i)=>['V'+(i+1),v]))),
 c:(...xs)=>xs.flatMap(x=>arr(x)),sum:x=>nums(x).reduce((s,v)=>s+v,0),mean,median:x=>quantile(x,.5),min:x=>Math.min(...nums(x)),max:x=>Math.max(...nums(x)),length:x=>arr(x).length,var:variance,sd:x=>Math.sqrt(variance(x)),quantile:(x,q=.5)=>quantile(x,q),
 seq:(from,to,by=1)=>{from=scalar(from);to=scalar(to);by=scalar(by);if(by===0||(to-from)*by<0)throw Error('Invalid seq step');const n=Math.floor(Math.abs((to-from)/by))+1;if(n>10000)throw Error('Vector too large');return Array.from({length:n},(_,i)=>from+i*by)},
 rep:(x,n)=>{n=scalar(n);if(!Number.isInteger(n)||n<0||arr(x).length*n>10000)throw Error('Invalid repetition');return Array.from({length:n},()=>arr(x)).flat()},
 sqrt:x=>arr(x).map(v=>Math.sqrt(v)),abs:x=>arr(x).map(v=>Math.abs(v)),log:x=>arr(x).map(v=>Math.log(v)),exp:x=>arr(x).map(v=>Math.exp(v)),round:(x,d=0)=>arr(x).map(v=>Number(v.toFixed(d))),
 summary:x=>{if(x&&x.kind==='lm')return {formula:x.formula,coefficients:Object.fromEntries(x.terms.map((t,i)=>[t,x.coefficients[i]])),r2:x.r2,adjustedR2:x.adjR2,n:x.n,omitted:x.omitted,dfResidual:x.dfResidual,residualStandardError:x.dfResidual>0?Math.sqrt(x.sse/x.dfResidual):null};const a=nums(x);return {min:Math.min(...a),q1:quantile(a,.25),median:quantile(a,.5),mean:mean(a),q3:quantile(a,.75),max:Math.max(...a),n:a.length}},
 lm:(y,x)=>{const a=nums(x),b=nums(y);if(a.length!==b.length||a.length<2)throw Error('lm requires equal vectors of length >= 2');const mx=mean(a),my=mean(b),den=a.reduce((s,v)=>s+(v-mx)**2,0);if(!den)throw Error('No variation in x');const slope=a.reduce((s,v,i)=>s+(v-mx)*(b[i]-my),0)/den;const intercept=my-slope*mx;const resid=b.map((v,i)=>v-intercept-slope*a[i]);const ssr=resid.reduce((s,v)=>s+v*v,0),sst=b.reduce((s,v)=>s+(v-my)**2,0);return {intercept,slope,r2:sst?1-ssr/sst:1,n:a.length}},
 nrow:x=>{if(!isFrame(x))throw Error('Expected data frame');return x.nrow},ncol:x=>{if(!isFrame(x))throw Error('Expected data frame');return x.ncol},
 head:(x,n=6)=>isFrame(x)?{...x,rows:x.rows.slice(0,Math.max(0,scalar(n))),nrow:Math.min(x.nrow,Math.max(0,scalar(n)))}:arr(x).slice(0,Math.max(0,scalar(n))),
 tail:(x,n=6)=>isFrame(x)?{...x,rows:x.rows.slice(-Math.max(0,scalar(n))),nrow:Math.min(x.nrow,Math.max(0,scalar(n)))}:arr(x).slice(-Math.max(0,scalar(n))),
 names:x=>isFrame(x)?x.columns.slice():Object.keys(x),
 cov,cor:correlation, range:x=>[Math.min(...nums(x)),Math.max(...nums(x))],
 sort:x=>nums(x).slice().sort((a,b)=>a-b),unique:x=>[...new Set(arr(x))],
 cumsum:x=>{let v=0;return nums(x).map(a=>v+=a)},
 diff:x=>nums(x).slice(1).map((v,i)=>v-nums(x)[i]),
 prod:x=>nums(x).reduce((a,b)=>a*b,1),
 boxplot:x=>({chart:'box',x:nums(x)}),
 barplot:x=>({chart:'bar',x:nums(x)}),
 hist:x=>({chart:'hist',x:nums(x)}),plot:(x,y)=>{let a=nums(x),b=nums(y);if(a.length!==b.length)throw Error('plot vectors have different lengths');return {chart:'scatter',x:a,y:b}}
};
const lex=s=>{const out=[];let i=0;while(i<s.length){if(/\s/.test(s[i])){i++;continue;}if(s[i]==='#')break;if(s[i]==='\"'||s[i]==="'"){const q=s[i++];let v='';while(i<s.length&&s[i]!==q){if(s[i]==='\\'&&i+1<s.length){i++;v+=s[i++];}else v+=s[i++];}if(i===s.length)throw Error('Unclosed string');i++;out.push({t:'str',v});continue;}let m=s.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);if(m){out.push({t:'num',v:Number(m[0])});i+=m[0].length;continue;}m=s.slice(i).match(/^[A-Za-z][A-Za-z0-9_.]*/);if(m){out.push({t:'id',v:m[0]});i+=m[0].length;continue;}if(s.slice(i,i+2)==='<-'){out.push({t:'<-'});i+=2;continue;}if('()+-*/^,=:$'.includes(s[i])){out.push({t:s[i++]});continue;}throw Error('Unsupported syntax at '+s.slice(i,i+12));}out.push({t:'eof'});return out;};
function parse(s,env){const ts=lex(s);let pos=0;const peek=()=>ts[pos].t;function eat(t){if(peek()!==t)throw Error('Expected '+t+', got '+peek());return ts[pos++];}
 function atom(){if(peek()==='-'){eat('-');return vectorOp(0,atom(),(a,b)=>a-b);}if(peek()==='+'){eat('+');return atom();}if(peek()==='num')return eat('num').v;if(peek()==='str')return eat('str').v;if(peek()==='('){eat('(');let v=expr(0);eat(')');return v;}if(peek()==='id'){let id=eat('id').v;if(id==='NA')return null;if(id==='TRUE')return true;if(id==='FALSE')return false;if(peek()==='('){eat('(');let args=[];if(peek()!==')'){do{args.push(expr(0));if(peek()!==',')break;eat(',');}while(true);}eat(')');if(!Object.prototype.hasOwnProperty.call(functions,id))throw Error('Unknown function: '+id);return functions[id](...args);}if(!Object.prototype.hasOwnProperty.call(env,id))throw Error('Unknown variable: '+id);let value=env[id];while(peek()==='$'){eat('$');let k=eat('id').v;value=column(value,k);}return value;}throw Error('Unexpected token: '+peek());}
 function expr(min){let lhs=atom();const prec={'+':10,'-':10,'*':20,'/':20,'^':30,':':25};while(prec[peek()]>=min){let op=ts[pos++].t;let rhs=expr(prec[op]+(op==='^'?0:1));lhs=op===':'?functions.seq(lhs,rhs,lhs<=rhs?1:-1):vectorOp(lhs,rhs,{'+':(a,b)=>a+b,'-':(a,b)=>a-b,'*':(a,b)=>a*b,'/':(a,b)=>a/b,'^':(a,b)=>a**b,':':(a,b)=>{throw Error('Unexpected range')} }[op]);}return lhs;}
 let assignment=peek()==='id'&&ts[1]&&ts[1].t==='<-';if(assignment){let id=eat('id').v;eat('<-');if(Object.prototype.hasOwnProperty.call(functions,id))throw Error('Cannot overwrite built-in function');let value=expr(0);eat('eof');env[id]=value;return {assignment:id,value};}let result=expr(0);eat('eof');return result;}
const run=(src,initial={})=>{if(src.length>10000)throw Error('Program too long');let env=Object.assign(Object.create(null),initial),out=[];for(const [n,line] of src.split(/\r?\n/).entries()){if(!line.trim()||line.trim().startsWith('#'))continue;if(out.length>=100)throw Error('Too many statements');try{let stmt=line;
 // Formula syntax is parsed separately from the arithmetic expression lexer.
 const formula=/^(?:(\w+)\s*<-\s*)?lm\(\s*([A-Za-z][\w.]*)\s*~\s*([^,]+),\s*data\s*=\s*([A-Za-z][\w.]*)\s*\)\s*$/;
 let match=stmt.trim().match(formula);
 const dfstmt=stmt.trim().match(/^(\w+)\s*<-\s*data\.frame\((.*)\)\s*$/);
 if(dfstmt){const source=dfstmt[2],fields=[];let depth=0,start=0,quote=null;for(let i=0;i<=source.length;i++){let c=source[i];if(quote){if(c===quote&&source[i-1]!=='\\')quote=null;continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='(')depth++;if(c===')')depth--;if(depth<0)throw Error('Unbalanced data.frame parentheses');if((c===','&&depth===0)||i===source.length){fields.push(source.slice(start,i).trim());start=i+1;}}if(depth!==0)throw Error('Unbalanced data.frame parentheses');let cols=Object.create(null);for(const field of fields){let m=field.match(/^([A-Za-z][\w.]*)\s*=\s*(.+)$/);if(!m)throw Error('Expected named data.frame column');if(Object.prototype.hasOwnProperty.call(cols,m[1]))throw Error('Duplicate column');cols[m[1]]=parse(m[2],env);}let df=makeFrame(cols);env[dfstmt[1]]=df;out.push({line:n+1,source:line,value:{assignment:dfstmt[1],value:df}});}
 else if(match){let [,dest,y,x,frame]=match;if(!Object.prototype.hasOwnProperty.call(env,frame))throw Error('Unknown data frame: '+frame);const result=modelFormula(y+' ~ '+x,env[frame]);if(dest)env[dest]=result;out.push({line:n+1,source:line,value:dest?{assignment:dest,value:result}:result});}
 else out.push({line:n+1,source:line,value:parse(line,env)});}
catch(e){throw Error('Line '+(n+1)+': '+e.message);}}return {env,outputs:out};};
root.MDMicroR={run,functions,makeFrame,isFrame,column,version:'5.3'};if(typeof module!=='undefined'&&module.exports)module.exports=root.MDMicroR;
})(typeof window!=='undefined'?window:globalThis);
