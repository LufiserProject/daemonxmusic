const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');

if (fs.existsSync(www)) {
    fs.rmSync(www, { recursive: true, force: true });
}
fs.mkdirSync(www, { recursive: true });

const items = [
    'index.html',
    'manifest.json',
    'sw.js',
    'favicon.svg',
    'logo.png',
    'apple-touch-icon.png',
    'apple-touch-icon-120x120.png',
    'apple-touch-icon-152x152.png',
    'apple-touch-icon-167x167.png',
    'apple-touch-icon-180x180.png',
    'favicon-192.png',
    'favicon-512.png',
    'assets',
    'avatars'
];

for (const item of items) {
    const srcPath = path.join(root, item);
    const destPath = path.join(www, item);
    if (fs.existsSync(srcPath)) {
        copyRecursiveSync(srcPath, destPath);
        console.log(`Copied ${item} -> www/`);
    }
}

console.log('Production www directory prepared successfully for iOS!');
