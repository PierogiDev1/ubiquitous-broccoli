import {discover} from './providers.js';
import {discoverPublic} from './public-feed.js';
export async function discoverSources(query,{ticketmaster=discover,parks=discoverPublic,hasTicketmaster=!!process.env.TICKETMASTER_API_KEY}={}){
 const selected=query.source||'all';
 if(!['all','ticketmaster','parks'].includes(selected))throw Object.assign(new Error('Choose All sources, Ticketmaster, or NYC Parks.'),{status:400});
 if(selected==='ticketmaster'&&!hasTicketmaster)throw Object.assign(new Error('Ticketmaster is not configured. Select NYC Parks, or add TICKETMASTER_API_KEY in Render.'),{status:503});
 const tasks=[];
 if(selected==='parks'||selected==='all')tasks.push({name:'NYC Parks',run:()=>parks(query)});
 if(selected==='ticketmaster'||selected==='all'&&hasTicketmaster)tasks.push({name:'Ticketmaster',run:()=>ticketmaster(query)});
 const results=await Promise.allSettled(tasks.map(t=>t.run()));
 const sources=results.map((r,i)=>r.status==='fulfilled'?{name:tasks[i].name,status:'ok',count:r.value.events.length,truncated:!!r.value.truncated,notice:r.value.notice}:{name:tasks[i].name,status:'error',count:0,error:r.reason?.status?r.reason.message:'Source unavailable.'});
 const good=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
 if(!good.length)throw Object.assign(new Error(sources.map(s=>`${s.name}: ${s.error}`).join(' ')),{status:results.find(r=>r.status==='rejected'&&r.reason?.status===400)?400:502,sources});
 return {events:[...new Map(good.flatMap(r=>r.events).map(e=>[e.id,e])).values()],source:sources.filter(s=>s.status==='ok').map(s=>s.name).join(' + '),sources,truncated:good.some(r=>r.truncated),notice:good.map(r=>`${r.source}: ${r.notice}`).join(' ')};
}
