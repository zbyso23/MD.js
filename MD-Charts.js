/* MD.js Ultra Charts 0.6 — tiny, optional SVG renderer; no imports/eval/network.
   Supports chart fences: bar, bar-horizontal, line, pie.
   Unsupported/invalid charts remain escaped source text. */
(function (root) {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const TYPES=Object.freeze({bar:'bar',column:'bar',vertical:'bar',barv:'bar',horizontal:'barh',barh:'barh','bar-horizontal':'barh',line:'line',pie:'pie'});
  const COLORS=['#497fc6','#17a58d','#d49a40','#a383d5','#ce6e84','#35a1ba','#918b55','#6c93bc'];
  function fail(message){throw new Error(message);}
  function parse(source){
    if(typeof source!=='string'||source.length>6000)fail('Chart too long');
    const spec={type:'bar',title:'',x:'',y:'',unit:'',data:[]};
    const lines=source.replace(/\r/g,'').split('\n');
    let inData=false;
    for(const raw of lines){
      const line=raw.trim();
      if(!line||line[0]==='#')continue;
      if(!inData){
        const m=/^(type|title|x|y|unit|data)\s*:\s*(.*)$/i.exec(line);
        if(!m)fail('Invalid chart directive');
        const key=m[1].toLowerCase(), val=m[2].trim();
        if(key==='data'){if(val)fail('Put data on following lines');inData=true;continue;}
        if(val.length>90)fail('Chart label too long');
        if(key==='type'){if(!Object.prototype.hasOwnProperty.call(TYPES,val.toLowerCase()))fail('Unknown chart type');spec.type=TYPES[val.toLowerCase()];}
        else spec[key]=val;
      }else{
        const m=/^(.{1,64}?)\s*:\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*$/.exec(line);
        if(!m)fail('Expected Label: number');
        const value=Number(m[2]);
        if(!Number.isFinite(value)||value<0||value>1e9)fail('Out-of-range data');
        spec.data.push({label:m[1].trim(),value});
        if(spec.data.length>24)fail('Too many chart rows');
      }
    }
    if(spec.data.length===0)fail('Missing chart data');
    if(spec.data.every(d=>d.value===0) && spec.type==='pie')fail('Pie needs positive total');
    return spec;
  }
  function el(name,attrs,content){
    const element=document.createElementNS(NS,name);
    for(const key of Object.keys(attrs||{}))element.setAttribute(key,String(attrs[key]));
    if(content!==undefined)element.textContent=String(content);
    return element;
  }
  function line(parent,x1,y1,x2,y2,cls){parent.appendChild(el('line',{x1,y1,x2,y2,class:cls}));}
  function label(parent,x,y,content,cls,extra){parent.appendChild(el('text',Object.assign({x,y,class:cls},extra||{}),content));}
  function short(input,n=18){return input.length>n?input.slice(0,n-1)+'…':input;}
  function nice(max){const scale=Math.pow(10,Math.floor(Math.log10(Math.max(max,0.0001))));const ratio=max/scale;return (ratio<=1?1:ratio<=2?2:ratio<=5?5:10)*scale;}
  function fmt(num){return Number(num.toFixed(4)).toLocaleString('en-US',{maximumFractionDigits:4});}
  function render(spec){
    const horizontal=spec.type==='barh', pie=spec.type==='pie';
    const W=740, H=pie?Math.max(390,94+spec.data.length*24):horizontal?Math.max(320,Math.min(735,130+spec.data.length*35)):430;
    const svg=el('svg',{class:'md-svg md-chart-svg',xmlns:NS,viewBox:`0 0 ${W} ${H}`,width:W,height:H,role:'img','aria-label':spec.title||spec.type+' chart'});
    svg.appendChild(el('title',{},spec.title||'Chart'));
    svg.appendChild(el('desc',{},spec.data.map(d=>d.label+': '+fmt(d.value)).join('; ')));
    if(spec.title)label(svg,W/2,32,spec.title,'md-chart-title',{'text-anchor':'middle'});
    const max=nice(Math.max(...spec.data.map(d=>d.value),0.1));
    const titlePad=spec.title?48:25;
    if(pie){
      const cx=230,cy=H/2,r=131,sum=spec.data.reduce((a,d)=>a+d.value,0);
      let angle=-Math.PI/2;
      spec.data.forEach((d,i)=>{
        if(!d.value)return;
        const next=angle+d.value/sum*Math.PI*2;
        const color=COLORS[i%COLORS.length];
        if(next-angle>=2*Math.PI-.00001)svg.appendChild(el('circle',{cx,cy,r,fill:color}));
        else {
          const pt=a=>[(cx+r*Math.cos(a)).toFixed(3),(cy+r*Math.sin(a)).toFixed(3)];
          svg.appendChild(el('path',{d:`M ${cx} ${cy} L ${pt(angle).join(' ')} A ${r} ${r} 0 ${next-angle>Math.PI?1:0} 1 ${pt(next).join(' ')} Z`,fill:color}));
        }
        angle=next;
        const yy=82+i*24;
        svg.appendChild(el('rect',{x:421,y:yy-13,width:14,height:14,rx:3,fill:color}));
        label(svg,446,yy,short(d.label,22)+'  '+fmt(d.value)+(spec.unit?' '+spec.unit:'')+' ('+fmt(d.value/sum*100)+'%)','md-chart-legend');
      });
      return svg;
    }
    if(horizontal){
      const left=158,right=695,top=titlePad+22,bottom=H-71,w=right-left,h=bottom-top;
      const step=h/spec.data.length;
      for(let i=0;i<=5;i++){
        const x=left+w*i/5;
        line(svg,x,top,x,bottom,'md-chart-grid');
        label(svg,x,bottom+18,fmt(max*i/5),'md-chart-tick',{'text-anchor':'middle'});
      }
      spec.data.forEach((d,i)=>{
        const y=top+i*step+step*.13;
        label(svg,left-10,y+step*.35,short(d.label,20),'md-chart-tick',{'text-anchor':'end'});
        const bw=Math.max(0,w*d.value/max);
        svg.appendChild(el('rect',{x:left,y,width:bw,height:step*.68,rx:3,class:'md-chart-bar',fill:COLORS[i%COLORS.length]}));
        if(bw>0)label(svg,Math.min(right-3,left+bw+5),y+step*.43,fmt(d.value),'md-chart-value');
      });
      line(svg,left,top,left,bottom,'md-chart-axis');line(svg,left,bottom,right,bottom,'md-chart-axis');
      if(spec.x)label(svg,(left+right)/2,H-19,spec.x,'md-chart-axis-label',{'text-anchor':'middle'});
      if(spec.y)label(svg,16,titlePad+7,spec.y,'md-chart-axis-label');
      return svg;
    }
    const left=81,right=690,top=titlePad+14,bottom=H-86,w=right-left,h=bottom-top;
    for(let i=0;i<=5;i++){
      const y=bottom-h*i/5;
      line(svg,left,y,right,y,'md-chart-grid');
      label(svg,left-12,y+4,fmt(max*i/5),'md-chart-tick',{'text-anchor':'end'});
    }
    line(svg,left,top,left,bottom,'md-chart-axis');line(svg,left,bottom,right,bottom,'md-chart-axis');
    const step=w/spec.data.length;
    if(spec.type==='line'){
      const points=spec.data.map((d,i)=>[left+(i+.5)*step,bottom-h*d.value/max]);
      if(points.length>1)svg.appendChild(el('polyline',{points:points.map(p=>p.map(n=>n.toFixed(2)).join(',')).join(' '),class:'md-chart-line'}));
      points.forEach(([x,y],i)=>{
        svg.appendChild(el('circle',{cx:x,cy:y,r:5,class:'md-chart-dot'}));
        label(svg,x,y-11,fmt(spec.data[i].value),'md-chart-value',{'text-anchor':'middle'});
      });
    }else{
      spec.data.forEach((d,i)=>{
        const x=left+i*step+step*.16, bw=step*.68,bh=h*d.value/max;
        svg.appendChild(el('rect',{x,y:bottom-bh,width:bw,height:bh,rx:3,fill:COLORS[i%COLORS.length],class:'md-chart-bar'}));
        if(bh>2)label(svg,x+bw/2,bottom-bh-8,fmt(d.value),'md-chart-value',{'text-anchor':'middle'});
      });
    }
    spec.data.forEach((d,i)=>label(svg,left+(i+.5)*step,bottom+20,short(d.label,Math.max(5,Math.floor(20/spec.data.length)+7)),'md-chart-tick',{'text-anchor':'middle'}));
    if(spec.x)label(svg,(left+right)/2,H-22,spec.x,'md-chart-axis-label',{'text-anchor':'middle'});
    if(spec.y)label(svg,23,titlePad,spec.y+(spec.unit?' ('+spec.unit+')':''),'md-chart-axis-label');
    return svg;
  }
  function control(label,action){const b=document.createElement('button');b.type='button';b.className='md-diagram-button';b.textContent=label;b.addEventListener('click',action);return b;}
  function enhance(container){
    if(!container||!container.querySelectorAll)return {mounted:0,fallback:0};
    let mounted=0,fallback=0;
    Array.from(container.querySelectorAll('pre[data-md-chart="true"]')).forEach(pre=>{
      const code=pre.querySelector('code');if(!code)return;
      let svg;
      try{svg=render(parse(code.textContent));}catch(e){fallback++;pre.classList.add('md-chart-fallback');pre.title='Chart error: '+e.message;return;}
      const frame=document.createElement('figure');frame.className='md-diagram md-chart';
      const bar=document.createElement('div');bar.className='md-diagram-toolbar';
      const hint=document.createElement('span');hint.className='md-diagram-hint';hint.textContent='Chart · SVG';bar.appendChild(hint);
      const viewport=document.createElement('div');viewport.className='md-diagram-viewport';viewport.appendChild(svg);
      let zoom=1;
      const setZoom=val=>{zoom=Math.min(2,Math.max(.5,val));svg.style.width=Math.round(Number(svg.getAttribute('width'))*zoom)+'px';svg.style.height=Math.round(Number(svg.getAttribute('height'))*zoom)+'px';};
      bar.appendChild(control('−',()=>setZoom(zoom-.25)));bar.appendChild(control('100%',()=>setZoom(1)));bar.appendChild(control('+',()=>setZoom(zoom+.25)));
      const source=control('Zdroj',()=>{pre.hidden=!pre.hidden;viewport.hidden=!viewport.hidden;});bar.appendChild(source);
      frame.appendChild(bar);frame.appendChild(viewport);pre.replaceWith(frame);pre.hidden=true;frame.appendChild(pre);mounted++;
    });
    return {mounted,fallback};
  }
  const api=Object.freeze({parse,render,enhance});root.MDCharts=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:(typeof global!=='undefined'?global:this));
