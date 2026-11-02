import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {dateValid} from './public/logic.js';
const asArray=x=>x==null?[]:Array.isArray(x)?x:[x];
function text(value){if(value==null)return '';if(typeof value==='object')return text(value['#text']||value.name||value.title||'');return String(value).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
function dateOf(raw){const value=text(raw);const iso=value.match(/^(\d{4}-\d{2}-\d{2})/);if(iso&&dateValid(iso[1]))return iso[1];const ms=Date.parse(value);return Number.isFinite(ms)?new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms)):null;}
function timeOf(raw){const s=text(raw).toLowerCase().replaceAll('.','');const m=s.match(/(?:T|^|\s)(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/);if(!m)return null;let h=Number(m[1]);if(m[3])h=h%12+(m[3]==='pm'?12:0);return h<=23&&Number(m[2])<60?`${String(h).padStart(2,'0')}:${m[2]}:00`:null;}
function categoryOf(s){if(/concert|music|jazz|orchestra|singing|dj\b/i.test(s))return 'Live music';if(/basketball|baseball|soccer|tennis|football|volleyball|sports|hockey|pickleball/i.test(s))return 'Sports';if(/workshop|class|lesson|instruction/i.test(s))return 'Classes';if(/theat|performance|play\b/i.test(s))return 'Theater';if(/museum|exhibit|gallery/i.test(s))return 'Museums';if(/food|cook|tasting/i.test(s))return 'Food';return 'Outdoors';}
export function parsePublicFeed(xml){
 if(/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw new Error('Invalid event feed');
 const doc=new XMLParser({ignoreAttributes:false,processEntities:false,parseTagValue:false}).parse(xml);
 const rows=asArray(doc.rss?.channel?.item??doc.feed?.entry??doc.events?.event??doc.events?.item??doc.channel?.item);
 return rows.map((r,i)=>{
  const title=text(r.title||r.name);const desc=text(r.description||r.summary||r.content);const date=dateOf(r.start_date_time||r.start_datetime||r.start_date||r.startdate||r.date||r['ev:startdate']||r['dc:date']);
  const rawLink=asArray(r.link).find(x=>typeof x==='string'||x?.['@_href'])||r.url;
  let url=null;try{const u=new URL(typeof rawLink==='object'?rawLink['@_href']:rawLink,'https://www.nycgovparks.org');if(u.protocol==='https:'&&rawLink)url=u.href;}catch{}
  return {id:'parks-'+(text(r.id||r.guid)||url||`${date}-${title}-${i}`),title,category:categoryOf(title+' '+text(r.category)),genre:text(r.category),artists:[],date,time:timeOf(r.time_start||r.start_time||r.starttime||r.time||r.start_date_time||r.start_datetime),timezone:'America/New_York',venue:text(r.location||r.venue||r.park)||'See organizer for location',city:'New York City',cost:/^free$/i.test(text(r.cost||r.fee))?0:null,maxCost:null,url,source:'NYC Parks',status:'unknown',onSale:null,onSaleTBD:false,minutes:null,description:desc.slice(0,400),checkedAt:new Date().toISOString()};
 }).filter(e=>e.title&&e.date&&e.url);
}
export async function discoverPublic({zip,from,to},{fetcher=fetch}={}){
 if(!/^\d{5}$/.test(zip||'')||!dateValid(from)||!dateValid(to)||to<from||(Date.parse(to)-Date.parse(from))/86400000>366)throw Object.assign(new Error('Use a valid ZIP and a date range of at most 366 days.'),{status:400});
 if(!/^(10[0-4]|11[1-4]|116)\d{2}$/.test(zip)&&!['11004','11005'].includes(zip))throw Object.assign(new Error('The no-key public feed currently covers NYC only. Set a NYC ZIP code or configure Ticketmaster for broader coverage.'),{status:400});
 let response;try{response=await fetcher(process.env.PUBLIC_EVENTS_FEED_URL||'https://www.nycgovparks.org/xml/events_3000.xml',{signal:AbortSignal.timeout(20000),headers:{Accept:'application/xml, text/xml, application/rss+xml'}});}catch{throw Object.assign(new Error('NYC Parks could not be reached. Try again later. No sample events have been substituted.'),{status:502});}
 if(!response.ok)throw Object.assign(new Error('NYC Parks’ public feed is unavailable. Try again later or configure another supported feed.'),{status:502});
 let events;try{const xml=await response.text();if(xml.length>15000000)throw new Error('Feed too large');events=parsePublicFeed(xml);if(!events.length)throw new Error('No dated events found');}catch{throw Object.assign(new Error('The public feed did not contain readable dated events. Its format may have changed; no sample results are shown.'),{status:502});}
 events=events.filter(e=>e.date>=from&&e.date<=to);
 return {events:[...new Map(events.map(e=>[e.id,e])).values()],source:'NYC Parks',truncated:false,notice:'NYC-wide public event feed; it does not calculate routes from your ZIP. Travel times, prices unless explicitly free, ticket availability, and end times are unverified. Feed coverage may not extend to your selected dates. Concert and professional sports coverage is limited.'};
}
