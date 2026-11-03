const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const proxy = http.request({hostname:'127.0.0.1', port:8080, path:req.url, method:req.method, headers:{...req.headers, host:'localhost:8080'}}, response => {
      res.writeHead(response.statusCode, response.headers); response.pipe(res);
    });
    proxy.on('error', () => { if (!res.headersSent) res.writeHead(502, {'Content-Type':'application/json'}); res.end(JSON.stringify({message:'Cannot connect to the backend on port 8080.'})); });
    req.pipe(proxy); return;
  }
  const files = {'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
  const file = files[req.url.split('?')[0]];
  if (!file) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, {'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'});
  fs.createReadStream(path.join(root,file)).pipe(res);
}).listen(3000, '127.0.0.1', () => console.log('Open http://localhost:3000'));
