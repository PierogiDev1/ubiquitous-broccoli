export const categories=['Live music','Theater','Comedy','Museums','Food','Classes','Outdoors','Sports','Social'];
export const defaults={zip:'11201',minutes:60,budget:200,frequency:'Weekly',interests:['Live music','Museums','Food','Outdoors'],days:['Sat','Sun'],start:9,end:22};
export function matches(event,p){return p.interests.includes(event.category)&&event.cost<=p.budget&&event.minutes<=p.minutes&&p.days.includes(event.day)&&event.hour-event.minutes/60>=p.start&&event.hour+event.duration+event.minutes/60<=p.end;}
export function validate(p){return /^\d{5}$/.test(p.zip)&&Number.isFinite(p.budget)&&p.budget>=0&&p.budget<=10000&&Number.isFinite(p.minutes)&&p.minutes>=5&&p.minutes<=180&&p.start>=0&&p.end<=24&&p.start<p.end&&p.interests.length>0&&p.days.length>0;}
