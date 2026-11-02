import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,matches,validate} from '../public/logic.js';
import {server} from '../server.js';
test('recommendations enforce budget, interests, transit and full travel window',()=>{
 const event={category:'Food',cost:50,minutes:30,day:'Sat',hour:12,duration:2};
 assert.equal(matches(event,defaults),true);
 for(const patch of [{cost:201},{minutes:61},{category:'Sports'},{day:'Mon'},{hour:9},{hour:21}])assert.equal(matches({...event,...patch},defaults),false);
});
test('survey rejects invalid settings',()=>{
 assert.equal(validate(defaults),true);
 for(const patch of [{zip:'abc'},{start:22,end:9},{interests:[]},{days:[]},{budget:-1},{minutes:NaN}])assert.equal(validate({...defaults,...patch}),false);
});
test('HTTP serves app and truthfully reports integration status',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const base=`http://127.0.0.1:${server.address().port}`;const page=await fetch(base);assert.equal(page.status,200);assert.match(await page.text(),/Sidequest/);const status=await(await fetch(base+'/api/status')).json();assert.equal(status.liveDiscovery,false);assert.equal(status.calendarConnected,false);assert.equal((await fetch(base+'/missing')).status,404);}finally{await new Promise(resolve=>server.close(resolve));}
});
