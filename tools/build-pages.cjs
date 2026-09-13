const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '_site');
if (path.dirname(output) !== root || path.basename(output) !== '_site') throw Error('Unsafe output directory');
if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) throw Error('Output must not be a symlink');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output);
for (const name of ['index.html', 'changelog.txt', 'THIRD_PARTY_NOTICES.md', 'css', 'js', 'img', 'licenses']) {
    fs.cpSync(path.join(root, name), path.join(output, name), { recursive: true });
}
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log('Built _site with playable files only.');
