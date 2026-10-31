/* Blocks Lite educational playback planner. No DOM, timers, eval, build, or dependencies.
 * Virtual event timestamps describe program behavior; wall-clock dwell is deliberately
 * slower and independent of real Arduino timing. The caller owns playback/cancellation.
 */
(function(root){'use strict';
  const MIN_DWELL=800,MAX_DWELL=8000;
  function plan(trace, dwellMs=2000){
    if(!Array.isArray(trace)||!Number.isInteger(dwellMs)||dwellMs<MIN_DWELL||dwellMs>MAX_DWELL)
      throw new TypeError('Invalid playback trace or teaching pace');
    const groups=[];
    for(const event of trace){
      if(!event||!Number.isSafeInteger(event.time)||event.time<0 ||
         (groups.length&&event.time<groups[groups.length-1].time))
        throw new TypeError('Playback events must be in ascending virtual time');
      if(!groups.length||event.time!==groups[groups.length-1].time)
        groups.push({time:event.time,events:[],dwellMs:0});
      groups[groups.length-1].events.push(event);
    }
    for(let i=0;i<groups.length-1;i++){
      const virtualGap=groups[i+1].time-groups[i].time;
      // Every time transition is visible even if the example uses delay(1).
      // Very large delays do not make a student wait a minute for the next step.
      groups[i].dwellMs=Math.max(dwellMs,Math.min(2*dwellMs,virtualGap*dwellMs/1000));
    }
    return groups;
  }
  root.MDBlocksPlayback=Object.freeze({plan});
})(typeof globalThis!=='undefined'?globalThis:this);
