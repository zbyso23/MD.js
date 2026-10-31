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
const functions={
 c:(...xs)=>xs.flatMap(x=>arr(x)),sum:x=>nums(x).reduce((s,v)=>s+v,0),mean,median:x=>quantile(x,.5),min:x=>Math.min(...nums(x)),max:x=>Math.max(...nums(x)),length:x=>arr(x).length,var:variance,sd:x=>Math.sqrt(variance(x)),quantile:(x,q=.5)=>quantile(x,q),
 seq:(from,to,by=1)=>{from=scalar(from);to=scalar(to);by=scalar(by);if(by===0||(to-from)*by<0)throw Error('Invalid seq step');const n=Math.floor(Math.abs((to-from)/by))+1;if(n>10000)throw Error('Vector too large');return Array.from({length:n},(_,i)=>from+i*by)},
 rep:(x,n)=>{n=scalar(n);if(!Number.isInteger(n)||n<0||arr(x).length*n>10000)throw Error('Invalid repetition');return Array.from({length:n},()=>arr(x)).flat()},
 sqrt:x=>arr(x).map(v=>Math.sqrt(v)),abs:x=>arr(x).map(v=>Math.abs(v)),log:x=>arr(x).map(v=>Math.log(v)),exp:x=>arr(x).map(v=>Math.exp(v)),round:(x,d=0)=>arr(x).map(v=>Number(v.toFixed(d))),
 summary:x=>{const a=nums(x);return {min:Math.min(...a),q1:quantile(a,.25),median:quantile(a,.5),mean:mean(a),q3:quantile(a,.75),max:Math.max(...a),n:a.length}},
 lm:(y,x)=>{const a=nums(x),b=nums(y);if(a.length!==b.length||a.length<2)throw Error('lm requires equal vectors of length >= 2');const mx=mean(a),my=mean(b),den=a.reduce((s,v)=>s+(v-mx)**2,0);if(!den)throw Error('No variation in x');const slope=a.reduce((s,v,i)=>s+(v-mx)*(b[i]-my),0)/den;const intercept=my-slope*mx;const resid=b.map((v,i)=>v-intercept-slope*a[i]);const ssr=resid.reduce((s,v)=>s+v*v,0),sst=b.reduce((s,v)=>s+(v-my)**2,0);return {intercept,slope,r2:sst?1-ssr/sst:1,n:a.length}},
 nrow:x=>{if(!isFrame(x))throw Error('Expected data frame');return x.nrow},ncol:x=>{if(!isFrame(x))throw Error('Expected data frame');return x.ncol},
 head:(x,n=6)=>isFrame(x)?{...x,rows:x.rows.slice(0,Math.max(0,scalar(n))),nrow:Math.min(x.nrow,Math.max(0,scalar(n)))}:arr(x).slice(0,Math.max(0,scalar(n))),
 tail:(x,n=6)=>isFrame(x)?{...x,rows:x.rows.slice(-Math.max(0,scalar(n))),nrow:Math.min(x.nrow,Math.max(0,scalar(n)))}:arr(x).slice(-Math.max(0,scalar(n))),
 names:x=>isFrame(x)?x.columns.slice():Object.keys(x),
 data_frame:(...args)=>makeFrame(Object.fromEntries(args.map((v,i)=>['V'+(i+1),v]))),
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
 function atom(){if(peek()==='-'){eat('-');return vectorOp(0,atom(),(a,b)=>a-b);}if(peek()==='+'){eat('+');return atom();}if(peek()==='num')return eat('num').v;if(peek()==='str')return eat('str').v;if(peek()==='('){eat('(');let v=expr(0);eat(')');return v;}if(peek()==='id'){let id=eat('id').v;if(peek()==='('){eat('(');let args=[];if(peek()!==')'){do{args.push(expr(0));if(peek()!==',')break;eat(',');}while(true);}eat(')');if(!Object.prototype.hasOwnProperty.call(functions,id))throw Error('Unknown function: '+id);return functions[id](...args);}if(!Object.prototype.hasOwnProperty.call(env,id))throw Error('Unknown variable: '+id);let value=env[id];while(peek()==='$'){eat('$');let k=eat('id').v;value=column(value,k);}return value;}throw Error('Unexpected token: '+peek());}
 function expr(min){let lhs=atom();const prec={'+':10,'-':10,'*':20,'/':20,'^':30,':':25};while(prec[peek()]>=min){let op=ts[pos++].t;let rhs=expr(prec[op]+(op==='^'?0:1));lhs=op===':'?functions.seq(lhs,rhs,lhs<=rhs?1:-1):vectorOp(lhs,rhs,{'+':(a,b)=>a+b,'-':(a,b)=>a-b,'*':(a,b)=>a*b,'/':(a,b)=>a/b,'^':(a,b)=>a**b,':':(a,b)=>{throw Error('Unexpected range')} }[op]);}return lhs;}
 let assignment=peek()==='id'&&ts[1]&&ts[1].t==='<-';if(assignment){let id=eat('id').v;eat('<-');if(Object.prototype.hasOwnProperty.call(functions,id))throw Error('Cannot overwrite built-in function');let value=expr(0);eat('eof');env[id]=value;return {assignment:id,value};}let result=expr(0);eat('eof');return result;}
const run=(src,initial={})=>{if(src.length>10000)throw Error('Program too long');let env=Object.assign(Object.create(null),initial),out=[];for(const [n,line] of src.split(/\r?\n/).entries()){if(!line.trim()||line.trim().startsWith('#'))continue;if(out.length>=100)throw Error('Too many statements');try{out.push({line:n+1,source:line,value:parse(line,env)})}catch(e){throw Error('Line '+(n+1)+': '+e.message);}}return {env,outputs:out};};
root.MDMicroR={run,functions,makeFrame,isFrame,column,version:'5.0'};if(typeof module!=='undefined'&&module.exports)module.exports=root.MDMicroR;
})(typeof window!=='undefined'?window:globalThis);
