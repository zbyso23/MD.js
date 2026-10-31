const {test}=require('node:test');const assert=require('node:assert/strict');const N=require('./numerical-core.js'),R=require('./micro-r.js');
function near(a,b,tol=1e-8){assert.ok(Math.abs(a-b)<tol, `${a} != ${b}`)}
test('FFT impulse and sinusoid peak',()=>{assert.deepEqual(N.fft([1,0,0,0]).map(x=>x.re),[1,1,1,1]);let a=N.signal('sine',64,1024,256),f=N.fft(a);let mags=f.map(z=>Math.hypot(z.re,z.im));assert.ok(Math.abs(mags[16]-Math.max(...mags))<1e-8);assert.ok(Math.abs(mags[240]-Math.max(...mags))<1e-8);});
test('FFT inverse round-trip + Parseval',()=>{let x=[.1,.8,-.5,2,1,-1,.2,.3],f=N.fft(x),y=N.ifft(f);x.forEach((v,i)=>near(y[i].re,v));near(x.reduce((s,v)=>s+v*v,0),f.reduce((s,z)=>s+z.re*z.re+z.im*z.im,0)/x.length);});
test('FFT power of 2 limit',()=>assert.throws(()=>N.fft([1,2,3]),/power of two/));
test('Hann endpoints + convolution impulse',()=>{let w=N.window(8,'hann');near(w[0],0);near(w[7],0);assert.deepEqual(N.convolve([0,0,1,0,0],[.25,.5,.25]),[0,0,.25,.5,.25,0,0]);});
test('integration and derivative',()=>{near(N.integrate(Math.sin,0,Math.PI),2,1e-8);near(N.integrate(x=>x*x,0,1,100,'trapezoid'),1/3,1e-4);near(N.derivative(x=>x*x,3),6,1e-8);});
test('RK4 versus exponential analytic',()=>{let val=N.ode((t,y)=>[-y[0]],0,[1],.1,10).at(-1).y[0];near(val,Math.exp(-1),5e-6);});
test('Micro R M2 scripts',()=>{for(const code of ['spectrum(sine(440,8192,1024),8192)','convolve(c(1,0),c(0.5,0.5))','integrate_poly(c(1,0,1),0,2)','derivative_poly(c(1,0,1),2)','ode_decay(0.5,1,0.1,20)'])assert.ok(R.run(code).outputs.length);});
