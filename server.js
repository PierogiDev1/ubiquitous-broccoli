import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {discover} from './providers.js';
import {discoverPublic} from './public-feed.js';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/logic.js':'logic.js'};
export function createServer({discovery=(query)=>process.env.TICKETMASTER_API_KEY?discover(query):discoverPublic(query)}={}){return http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');const path=url.pathname;
 const json=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
 if(req.method!=='GET'){res.writeHead(405,{Allow:'GET'});return res.end('Method not allowed');}
 if(path==='/api/status')return json(200,{mode:'live',calendarConnected:false,liveDiscovery:true,providerVerified:false,source:process.env.TICKETMASTER_API_KEY?'Ticketmaster':'NYC Parks',spotifyClientId:process.env.SPOTIFY_CLIENT_ID||null});
 if(path==='/api/events'){try{return json(200,await discovery({zip:url.searchParams.get('zip'),from:url.searchParams.get('from'),to:url.searchParams.get('to')}));}catch(error){return json(error.status||500,{error:error.status?error.message:'Unable to retrieve events.'});}}
 if(!files[path]){res.writeHead(404);return res.end('Not found');}
 try {const file=files[path];const data=await readFile(fileURLToPath(new URL('./public/'+file,import.meta.url)));res.writeHead(200,{'Content-Type':types[file.slice(file.lastIndexOf('.'))],'X-Content-Type-Options':'nosniff'});res.end(data);}catch{res.writeHead(500);res.end('Unable to load application');}
});}
export const server=createServer();
if(process.argv[1]===fileURLToPath(import.meta.url)) server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Sidequest listening on port '+(process.env.PORT||3000)));
