export const categories=['Live music','Theater','Comedy','Museums','Food','Classes','Outdoors','Sports','Social'];
export function localToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function initialDates(){const start=localToday();const end=new Date(start+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+30);return {dateFrom:start,dateTo:end.toISOString().slice(0,10)};}
export const defaults={zip:'11201',minutes:60,budget:200,frequency:'Weekly',source:'all',interests:['Live music','Museums','Food','Outdoors'],days:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],start:0,end:24,artists:'',genres:'',sports:'',teams:'',exclude:'',...initialDates()};
export const terms=s=>String(s||'').split(/[,\n]/).map(s=>s.trim().toLowerCase()).filter(Boolean);
export function dateValid(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
export function validate(p){return !!p&&/^\d{5}$/.test(p.zip)&&Number.isFinite(p.budget)&&p.budget>=0&&p.budget<=10000&&Number.isFinite(p.minutes)&&p.minutes>=5&&p.minutes<=180&&p.start>=0&&p.end<=24&&p.start<p.end&&Array.isArray(p.interests)&&p.interests.length>0&&p.interests.every(c=>categories.includes(c))&&Array.isArray(p.days)&&p.days.length>0&&p.days.every(d=>['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].includes(d))&&dateValid(p.dateFrom)&&dateValid(p.dateTo)&&p.dateTo>=p.dateFrom&&(Date.parse(p.dateTo)-Date.parse(p.dateFrom))/86400000<=366;}
export function matches(e,p){
 if(!p.interests.includes(e.category)||!e.date||e.date<p.dateFrom||e.date>p.dateTo)return false;
 if(e.cost!==null&&e.cost>p.budget)return false;
 const day=new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'UTC'}).format(new Date(e.date+'T12:00:00Z'));
 if(!p.days.includes(day))return false;
 if(e.time){const hour=Number(e.time.slice(0,2))+Number(e.time.slice(3,5))/60;if(hour<p.start||hour>=p.end)return false;}
 const text=[e.title,e.genre,...(e.artists||[]),e.venue].join(' ').toLowerCase();
 return !terms(p.exclude).some(t=>text.includes(t));
}
export function rank(e,p){
 const text=[e.title,e.genre,...(e.artists||[])].join(' ').toLowerCase();let score=0;const reasons=[];
 for(const [field,label,weight] of [['artists','Artist',8],['genres','Genre',4],['teams','Team',8],['sports','Sport',4]]){
  if((field==='artists'||field==='genres')&&e.category!=='Live music')continue;
  if((field==='teams'||field==='sports')&&e.category!=='Sports')continue;
  const found=terms(p[field]).filter(t=>text.includes(t));if(found.length){score+=found.length*weight;reasons.push(`${label} match: ${found.join(', ')}`);}
 }
 if(!reasons.length)reasons.push(`Matches your ${e.category.toLowerCase()} interest`);
 return {...e,score,reasons};
}
export function recommendations(events,p){return events.filter(e=>matches(e,p)).map(e=>rank(e,p)).sort((a,b)=>b.score-a.score||a.date.localeCompare(b.date));}

export function filterSummary(events,p,dismissed=[]){
 const counts={category:0,date:0,budget:0,day:0,time:0,exclusion:0,dismissed:0};
 for(const e of events){
  if(dismissed.includes(e.id)){counts.dismissed++;continue;}
  const neutral={...p,interests:categories,dateFrom:'0000-01-01',dateTo:'9999-12-31',budget:100000000,days:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],start:0,end:24,exclude:''};
  if(!matches(e,{...neutral,dateFrom:p.dateFrom,dateTo:p.dateTo})){counts.date++;continue;}
  if(!p.interests.includes(e.category)){counts.category++;continue;}
  if(e.cost!==null&&e.cost>p.budget){counts.budget++;continue;}
  if(!matches(e,{...neutral,days:p.days})){counts.day++;continue;}
  if(!matches(e,{...neutral,start:p.start,end:p.end})){counts.time++;continue;}
  if(!matches(e,{...neutral,exclude:p.exclude})){counts.exclusion++;continue;}
 }
 return counts;
}
