const git = require('isomorphic-git');
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..');

async function stageAndCommit() {
    console.log('📦 Escaneando todos los archivos (incluyendo .github)...');

    const gitignoreContent = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');
    const ignoreList = gitignoreContent.split('\n').map(s => s.trim()).filter(Boolean);

    function shouldIgnore(relPath) {
        if (relPath === '.git' || relPath.startsWith('.git/') || relPath.startsWith('.git\\')) return true;
        for (const pattern of ignoreList) {
            const cleanPattern = pattern.replace(/\/$/, '');
            if (relPath === cleanPattern || relPath.startsWith(cleanPattern + '/') || relPath.startsWith(cleanPattern + '\\')) return true;
            if (pattern.startsWith('*') && relPath.endsWith(pattern.slice(1))) return true;
        }
        return false;
    }

    function getAllFiles(currentDir, baseDir = '') {
        let results = [];
        const list = fs.readdirSync(currentDir);
        for (const file of list) {
            const fullPath = path.join(currentDir, file);
            const relPath = path.join(baseDir, file).replace(/\\/g, '/');
            if (shouldIgnore(relPath)) continue;
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                results = results.concat(getAllFiles(fullPath, relPath));
            } else {
                results.push(relPath);
            }
        }
        return results;
    }

    const files = getAllFiles(dir);
    console.log(`📄 Añadiendo ${files.length} archivos a Git...`);
    console.log('¿Incluye workflows?', files.filter(f => f.includes('workflows')));

    for (const filepath of files) {
        await git.add({ fs, dir, filepath });
    }

    const sha = await git.commit({
        fs,
        dir,
        message: 'Add iOS build workflow and native project configuration',
        author: {
            name: 'DaemonX Team',
            email: 'daemonx@music.local'
        }
    });

    console.log(`✅ Commit completado: ${sha}`);
}

stageAndCommit().catch(console.error);
