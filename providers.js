import {dateValid} from './public/logic.js';
export function normalize(e){
 const v=e._embedded?.venues?.[0]||{};const c=e.classifications?.[0]||{};const segment=c.segment?.name||'';const genre=c.genre?.name||'';
 let category=segment==='Music'?'Live music':segment==='Sports'?'Sports':genre==='Comedy'?'Comedy':segment==='Arts & Theatre'?'Theater':'Social';
 const price=e.priceRanges?.find(p=>p.currency==='USD'&&Number.isFinite(p.min));
 const sale=e.sales?.public;const status=e.dates?.status?.code||'unknown';
 return {id:'tm-'+e.id,title:e.name||'Untitled event',category,genre:[genre,c.subGenre?.name].filter(x=>x&&x!=='Undefined').join(' · '),artists:(e._embedded?.attractions||[]).map(a=>a.name),date:e.dates?.start?.localDate||null,time:e.dates?.start?.timeTBA||e.dates?.start?.noSpecificTime?null:e.dates?.start?.localTime||null,timezone:e.dates?.timezone||v.timezone||null,venue:v.name||'Venue to be confirmed',city:v.city?.name||'',cost:price?.min??null,maxCost:price?.max??null,url:safeURL(e.url),source:'Ticketmaster',status,onSale:sale?.startDateTime||null,onSaleTBD:!!sale?.startTBD,minutes:null,checkedAt:new Date().toISOString()};
}
function safeURL(url){try{const u=new URL(url);return u.protocol==='https:'?u.href:null;}catch{return null;}}
export async function discover({zip,from,to}, {apiKey=process.env.TICKETMASTER_API_KEY,fetcher=fetch}={}){
 if(!/^\d{5}$/.test(zip||'')||!dateValid(from)||!dateValid(to)||to<from||(Date.parse(to)-Date.parse(from))/86400000>366)throw Object.assign(new Error('Use a valid ZIP and a date range of at most 366 days.'),{status:400});
 if(!apiKey)throw Object.assign(new Error('Live listings need a Ticketmaster API key. Add TICKETMASTER_API_KEY in Render → Environment, then redeploy. No sample results are substituted.'),{status:503});
 const url=new URL('https://app.ticketmaster.com/discovery/v2/events.json');
 // Broad UTC boundaries avoid dropping events whose local day differs from UTC.
 const end=new Date(to+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+2);
 for(const [k,v] of Object.entries({apikey:apiKey,postalCode:zip,radius:'25',unit:'miles',countryCode:'US',startDateTime:from+'T00:00:00Z',endDateTime:end.toISOString().replace('.000',''),sort:'date,asc',size:'200'}))url.searchParams.set(k,v);
 let response;try{response=await fetcher(url,{signal:AbortSignal.timeout(20000)});}catch{throw Object.assign(new Error('The event provider could not be reached. Please try again later.'),{status:502});}
 if(!response.ok)throw Object.assign(new Error(response.status===401||response.status===403?'Ticketmaster rejected the configured API key. Check its Discovery API access in Render.':response.status===429?'Ticketmaster’s request limit was reached. Please try again later.':'The event provider returned an error. Please try again later.'),{status:502});
 let data;try{data=await response.json();}catch{throw Object.assign(new Error('The event provider returned an invalid response.'),{status:502});}
 const events=(data._embedded?.events||[]).map(normalize).filter(e=>e.date>=from&&e.date<=to&&!['cancelled','canceled','postponed','offsale'].includes(e.status));
 return {events:[...new Map(events.map(e=>[e.id,e])).values()],source:'Ticketmaster',truncated:(data.page?.totalElements||0)>200,notice:'Search covers a 25-mile radius, not a one-hour transit boundary. Travel times, event end times, and fees are not verified. Coverage is limited to Ticketmaster’s feed.'};
}
