import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,matches,validate,rank,dateValid,recommendations} from '../public/logic.js';
import {normalize,discover} from '../providers.js';
import {parsePublicFeed,discoverPublic} from '../public-feed.js';
import {createServer} from '../server.js';
const profile={...defaults,dateFrom:'2026-11-01',dateTo:'2026-11-30',interests:['Live music','Sports','Food','Outdoors']};
const event={id:'a',title:'Mitski in concert',category:'Live music',genre:'Indie Rock',artists:['Mitski'],cost:50,minutes:null,date:'2026-11-07',time:'19:00:00',venue:'Brooklyn'};
test('date, category, budget and start-hour constraints are enforced; unknown facts stay unknown',()=>{
 assert.equal(matches(event,profile),true);
 for(const patch of [{cost:201},{date:'2026-12-01'},{category:'Theater'},{date:null}])assert.equal(matches({...event,...patch},profile),false);
 assert.equal(matches({...event,cost:null,time:null},profile),true);
 assert.equal(matches(event,{...profile,start:20}),false);
 assert.equal(matches(event,{...profile,days:['Mon']}),false);
 assert.equal(matches({...event,date:profile.dateFrom},profile),true);
 assert.equal(matches({...event,date:profile.dateTo},profile),true);
});
test('survey validates dates and date range',()=>{
 assert.equal(validate(profile),true);
 for(const patch of [{zip:'abc'},{start:22,end:9},{interests:[]},{days:[]},{budget:-1},{minutes:NaN},{dateFrom:'2026-02-30'},{dateFrom:'2026-12-01'},{dateTo:'2028-01-01'}])assert.equal(validate({...profile,...patch}),false);
 assert.equal(dateValid('2026-02-29'),false);
});
test('music and sports favorites boost relevant events and exclusions hide them',()=>{
 assert.equal(rank(event,{...profile,artists:'Mitski',genres:'indie'}).score,12);
 assert.equal(rank({...event,category:'Sports',title:'New York Liberty Basketball'},{...profile,teams:'Liberty',sports:'basketball'}).score,12);
 assert.equal(rank(event,{...profile,teams:'Mitski'}).score,0);
 assert.equal(matches(event,{...profile,exclude:'MITSKI'}),false);
 assert.equal(recommendations([{...event,id:'b',title:'Other',artists:[],genre:''},event],{...profile,artists:'Mitski'})[0].id,'a');
});
test('Ticketmaster normalization preserves source evidence without invented prices or transit',()=>{
 const e=normalize({id:'123',name:'Game',url:'javascript:alert(1)',classifications:[{segment:{name:'Sports'}}],dates:{start:{localDate:'2026-11-03',localTime:'19:00:00'},status:{code:'onsale'}},sales:{public:{startDateTime:'2026-10-01T10:00:00Z'}},_embedded:{venues:[{name:'Arena'}]}});
 assert.equal(e.category,'Sports');assert.equal(e.cost,null);assert.equal(e.minutes,null);assert.equal(e.url,null);assert.equal(e.status,'onsale');assert.equal(e.date,'2026-11-03');
});
test('Ticketmaster uses bounded queries, deduplicates and removes cancelled or out-of-range listings',async()=>{
 let query;
 const data={page:{totalElements:400},_embedded:{events:[{id:'a',dates:{start:{localDate:'2026-11-03'}}},{id:'a',dates:{start:{localDate:'2026-11-03'}}},{id:'b',dates:{start:{localDate:'2026-12-01'}}},{id:'c',dates:{start:{localDate:'2026-11-03'},status:{code:'cancelled'}}}]}};
 const r=await discover({zip:'11201',from:profile.dateFrom,to:profile.dateTo},{apiKey:'test-only',fetcher:async url=>{query=url;return Response.json(data);}});
 assert.equal(r.events.length,1);assert.equal(r.truncated,true);assert.equal(query.searchParams.get('postalCode'),'11201');assert.equal(query.searchParams.get('size'),'200');
 await assert.rejects(()=>discover({zip:'11201',from:profile.dateFrom,to:profile.dateTo},{apiKey:''}),{status:503});
 await assert.rejects(()=>discover({zip:'11201',from:'bad',to:profile.dateTo},{apiKey:'test-only'}),{status:400});
});
const xml=`<?xml version="1.0"?><events><event><id>1</id><title>Outdoor Jazz</title><date>2026-11-07</date><start_time>7:30 pm</start_time><location>Brooklyn Park</location><cost>Free</cost><link>https://www.nycgovparks.org/events/1</link><description><![CDATA[<b>Music outdoors</b>]]></description></event><event><title>Undated event</title><link>https://example.com</link></event></events>`;
test('public feed imports dated listings, parses time and free prices, rejects unsafe XML',()=>{
 const [e]=parsePublicFeed(xml);assert.equal(e.title,'Outdoor Jazz');assert.equal(e.category,'Live music');assert.equal(e.cost,0);assert.equal(e.time,'19:30:00');assert.equal(e.description,'Music outdoors');assert.equal(parsePublicFeed(xml).length,1);
 assert.throws(()=>parsePublicFeed('<!DOCTYPE x [<!ENTITY x SYSTEM "file:///etc/passwd">]><events/>'));
 assert.throws(()=>parsePublicFeed('<events>'));
});
test('no-key source filters dates, rejects unsupported locations and never falls back to samples',async()=>{
 const query={zip:'11201',from:'2026-11-01',to:'2026-11-30'};
 const r=await discoverPublic(query,{fetcher:async()=>new Response(xml)});assert.equal(r.events.length,1);assert.equal(r.source,'NYC Parks');
 const empty=await discoverPublic({...query,from:'2026-12-01',to:'2026-12-30'},{fetcher:async()=>new Response(xml)});assert.equal(empty.events.length,0);
 await assert.rejects(()=>discoverPublic({...query,zip:'90210'}),{status:400});
 await assert.rejects(()=>discoverPublic(query,{fetcher:async()=>new Response('<html>Unavailable</html>')}),{status:502});
 await assert.rejects(()=>discoverPublic(query,{fetcher:async()=>{throw new Error('network');}}),{status:502});
});
test('HTTP endpoints return real provider results and errors without exposing credentials',async()=>{
 const server=createServer({discovery:async q=>{if(q.zip==='00000')throw Object.assign(new Error('Provider unavailable'),{status:502});return {events:[event],source:'Fixture'};}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const base=`http://127.0.0.1:${server.address().port}`;const page=await fetch(base);assert.equal(page.status,200);assert.match(await page.text(),/Sidequest/);const status=await(await fetch(base+'/api/status')).json();assert.equal(status.calendarConnected,false);assert.equal('TICKETMASTER_API_KEY' in status,false);const data=await(await fetch(base+'/api/events?zip=11201')).json();assert.equal(data.events[0].title,event.title);const fail=await fetch(base+'/api/events?zip=00000');assert.equal(fail.status,502);assert.equal((await fail.json()).error,'Provider unavailable');assert.equal((await fetch(base+'/missing')).status,404);assert.equal((await fetch(base+'/api/events',{method:'POST'})).status,405);}finally{await new Promise(resolve=>server.close(resolve));}
});

test('December 21–25 2026 boundaries are sent correctly and later pages are searched',async()=>{
 const calls=[];
 const r=await discover({zip:'11201',from:'2026-12-21',to:'2026-12-25'},{apiKey:'test-only',fetcher:async url=>{
  calls.push(new URL(url));const page=Number(url.searchParams.get('page'));
  return Response.json({page:{totalElements:201,totalPages:2},_embedded:{events:page===0?[{id:'early',dates:{start:{localDate:'2026-12-21'}}}]:[{id:'xmas',dates:{start:{localDate:'2026-12-25'}}},{id:'too-late',dates:{start:{localDate:'2026-12-26'}}}]}});
 }});
 assert.equal(calls.length,2);assert.equal(calls[0].searchParams.get('startDateTime'),'2026-12-21T00:00:00Z');assert.equal(calls[0].searchParams.get('endDateTime'),'2026-12-27T00:00:00Z');assert.deepEqual(r.events.map(e=>e.id),['tm-early','tm-xmas']);
});

test('combined sources keep successful events and report Parks failures independently',async()=>{
 const {discoverSources}=await import('../discovery.js');let parksCalls=0;
 const r=await discoverSources({source:'all'},{hasTicketmaster:true,ticketmaster:async()=>({events:[event],source:'Ticketmaster',notice:'Ticketmaster notice'}),parks:async()=>{parksCalls++;throw Object.assign(new Error('Feed unreadable'),{status:502});}});
 assert.equal(parksCalls,1);assert.equal(r.events.length,1);assert.equal(r.sources.find(s=>s.name==='NYC Parks').status,'error');assert.match(r.sources.find(s=>s.name==='NYC Parks').error,/unreadable/);
 const only=await discoverSources({source:'ticketmaster'},{hasTicketmaster:true,ticketmaster:async()=>({events:[],source:'Ticketmaster'}),parks:async()=>{throw new Error('Should not run');}});assert.equal(only.events.length,0);assert.equal(only.sources.length,1);
 await assert.rejects(()=>discoverSources({source:'bogus'}),{status:400});
});

test('filter diagnostics explain December results hidden by retained weekday preferences',async()=>{
 const {filterSummary}=await import('../public/logic.js');
 const p={...profile,dateFrom:'2026-12-21',dateTo:'2026-12-25',days:['Sat','Sun']};
 const e={...event,date:'2026-12-21'};assert.equal(matches(e,p),false);assert.equal(filterSummary([e],p).day,1);
 assert.equal(matches(e,{...p,days:['Mon','Tue','Wed','Thu','Fri']}),true);
});
