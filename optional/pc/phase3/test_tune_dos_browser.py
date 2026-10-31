#!/usr/bin/env python3
"""Real browser gate for the 137-byte TUNE.COM loaded from the embedded FAT12 disk."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[3]
PC=ROOT/'optional/pc'
html=(PC/'index.html').read_text('utf8')
for name in ('PC-Core.js','PC-Video.js','PC-VGA.js','PC-BIOS.js','PC-Floppy.js','PC-IDE.js','PC-FPU287.js','PC-Audio.js','PC-OPL2.js','PC-SB2.js','PC-Machine.js','PC-Audio-Output.js','PC-EmbeddedAssets.js','PC-UX.js'):
    html=html.replace(f'<script src="{name}"></script>',f'<script>{(PC/name).read_text("utf8")}</script>')
for name in ('MD-Runtime.js','MD-UX-Shell.js'):
    html=html.replace(f'<script src="../../{name}"></script>',f'<script>{(ROOT/name).read_text("utf8")}</script>')
with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1260,'height':1000})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='load')
  page.wait_for_function('window.__mdPCUniversal && !window.__mdPCUniversal.running', timeout=110000)
  for profile in ['xt','at']:
    page.select_option('#machine',profile)
    page.wait_for_function('!window.__mdPCUniversal.running',timeout=110000)
    info=page.evaluate('''() => {
      const m=__mdPCUniversal.machine,x=m.fdd.disks[0].data;
      const bps=x[11]|x[12]<<8, spf=x[22]|x[23]<<8, reserved=x[14]|x[15]<<8;
      const root= (reserved+x[16]*spf)*bps, entries=x[17]|x[18]<<8;
      for(let i=0;i<entries;i++){
        const p=root+32*i;
        if(String.fromCharCode(...x.slice(p,p+11))==='TUNE    COM')
           return {profile:m.profile,size:x[p+28]|x[p+29]<<8|x[p+30]<<16|x[p+31]<<24};
      }
      return null;
    }''')
    assert info=={'profile':profile,'size':137},(profile,info)
    # Capture writes from the actual guest process, not any isolated diagnostics.
    page.evaluate('''() => {window.tuneEvents=[];window.tuneAudio={chunks:0,nonzero:0,peak:0,invalid:0};window.tuneFlushes=0;
      const output=__mdPCUniversal.audioOutput;const originalFlush=output.flush.bind(output);output.flush=()=>{window.tuneFlushes++;return originalFlush();};
      const m=__mdPCUniversal.machine;
      const old=m.opl.writeData.bind(m.opl);
      m.opl.writeData=(val,sec)=>{if(m.opl.addr===0xa0||m.opl.addr===0xb0)window.tuneEvents.push([m.opl.addr,val]);old(val,sec);};
      const oldOutput=__mdPCUniversal.audioOutput.enqueue.bind(__mdPCUniversal.audioOutput);
      __mdPCUniversal.audioOutput.enqueue=(pcm)=>{window.tuneAudio.chunks++;
        for(const x of pcm){if(!Number.isFinite(x))window.tuneAudio.invalid++;if(Math.abs(x)>0.0001)window.tuneAudio.nonzero++;window.tuneAudio.peak=Math.max(window.tuneAudio.peak,Math.abs(x));}
        return oldOutput(pcm);
      };
    }''')
    page.locator('#audio-enable').click()
    page.evaluate("__mdPCUniversal.queueText('TUNE\\n')")
    page.wait_for_function('''() => {
      const m=__mdPCUniversal.machine;
      return window.tuneEvents?.filter(x=>x[0]===0xb0).length>=14 && !__mdPCUniversal.running;
    }''',timeout=130000)
    state=page.evaluate('''() => ({events:window.tuneEvents,audio:window.tuneAudio,flushes:window.tuneFlushes,stop:!__mdPCUniversal.running,
       last:document.querySelector('#pc-boot-progress').textContent,errors:[]})''')
    on=[e[1] for e in state['events'] if e[0]==0xb0 and (e[1]&0x20)]
    off=[e[1] for e in state['events'] if e[0]==0xb0 and not(e[1]&0x20)]
    note_low=[e[1] for e in state['events'] if e[0]==0xa0]
    assert note_low==[0x59,0xb3,0x05,0xb0,0x05,0xb3,0x59],(profile,'wrong tune',note_low)
    assert on==[0x31,0x31,0x32,0x32,0x32,0x31,0x31],(profile,'wrong octaves',on)
    assert len(on)==7,(profile,'not seven notes',state)
    assert len(off)>=7,(profile,'not seven releases',state)
    assert state['audio']['nonzero']>200,(profile,'No guest FM PCM',state['audio'])
    assert state['audio']['invalid']==0,(profile,'Invalid PCM samples',state['audio'])
    assert state['stop'],(profile,'process still running')
    assert page.evaluate('__mdPCUniversal.audioOutput.dropped')==0,(profile,'WebAudio discarded PCM blocks')
    assert 'GUEST ERROR' not in state['last'],state
    print('PASS',profile,'FreeDOS TUNE.COM:',len(on),'key-on,',len(off),'key-off,',state['audio']['nonzero'],'nonzero PCM;',state['last'])
  assert not errors,errors
  browser.close()
