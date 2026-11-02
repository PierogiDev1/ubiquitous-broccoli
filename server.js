import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/logic.js':'logic.js'};
export const server=http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/api/status'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({mode:'demo',calendarConnected:false,liveDiscovery:false}));}
 if(!files[path]){res.writeHead(404);return res.end('Not found');}
 try {const file=files[path];const data=await readFile(fileURLToPath(new URL('./public/'+file,import.meta.url)));res.writeHead(200,{'Content-Type':types[file.slice(file.lastIndexOf('.'))],'X-Content-Type-Options':'nosniff'});res.end(data);}catch{res.writeHead(500);res.end('Unable to load application');}
});
if(process.argv[1]===fileURLToPath(import.meta.url)) server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Activity app listening on port '+(process.env.PORT||3000)));
