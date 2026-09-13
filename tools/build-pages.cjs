const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '_site');
if (path.dirname(output) !== root || path.basename(output) !== '_site') throw Error('Unsafe output directory');
if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) throw Error('Output must not be a symlink');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output);
for (const name of ['index.html', 'changelog.txt', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'css', 'js', 'img', 'licenses']) {
    fs.cpSync(path.join(root, name), path.join(output, name), { recursive: true });
}
// Give changed assets a new URL so cached scripts cannot lag behind new HTML controls.
const indexPath = path.join(output, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8').replace(
    /\b(src|href)="((?:js|css)\/[^"?]+\.(?:js|css))"/g,
    (_, attribute, asset) => {
        const version = createHash('sha256').update(fs.readFileSync(path.join(output, asset))).digest('hex').slice(0, 16);
        return `${attribute}="${asset}?v=${version}"`;
    }
);
fs.writeFileSync(indexPath, html);
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log('Built _site with playable files only.');
