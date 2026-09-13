const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 8765);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon',
    '.webp': 'image/webp', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer((req, res) => {
    try {
        const url = new URL(req.url, 'http://localhost');
        const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
        if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
        const file = path.resolve(root, relative);
        if (!file.startsWith(root + path.sep) || !(relative === 'index.html' || relative === 'changelog.txt' || relative === 'LICENSE' || relative === 'THIRD_PARTY_NOTICES.md'
            || /^(js|css|img|design|licenses)\//.test(relative))) { res.writeHead(404).end(); return; }
        const contents = fs.readFileSync(file);
        res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(req.method === 'HEAD' ? undefined : contents);
    } catch { res.writeHead(404).end(); }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log('Lianara: http://127.0.0.1:' + port + ' (Ctrl+C to stop)'));
