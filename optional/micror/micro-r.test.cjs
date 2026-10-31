const test=require('node:test'),assert=require('node:assert/strict');const R=require('./micro-r.js');
test('statistics and regression',()=>{const o=R.run('x <- c(1,2,3)\nmean(x)\nmedian(x)\nsd(x)\nlm(c(2,4,6),x)').outputs;assert.equal(o[1].value,2);assert.equal(o[2].value,2);assert.equal(o[3].value,1);assert.equal(o[4].value.slope,2);});
test('charts and vector expressions',()=>{const o=R.run('x <- c(1,2,3)\nx^2\nhist(x)\nplot(x,c(3,2,1))').outputs;assert.deepEqual(o[1].value,[1,4,9]);assert.equal(o[2].value.chart,'hist');assert.equal(o[3].value.chart,'scatter');});
test('reject injection, bad input and unsupported syntax',()=>{for(const s of ['eval(123)','x <- process.exit(1)','x <- c(1,2); alert(1)','mean(c())','x <- c(1,2)\nplot(x,c(1))'])assert.throws(()=>R.run(s));});
test('no implicit recycling or global mutable state',()=>{assert.throws(()=>R.run('c(1,2)+c(1,2,3)'));assert.throws(()=>R.run('x'));});
