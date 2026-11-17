const git = require('isomorphic-git');
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..');

async function initAndCommit() {
    console.log('📦 Inicializando repositorio Git local con isomorphic-git...');
    await git.init({ fs, dir });

    // Encontrar todos los archivos a añadir ignorando los de .gitignore
    const gitignoreContent = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');
    const ignoreList = gitignoreContent.split('\n').map(s => s.trim()).filter(Boolean);

    function shouldIgnore(relPath) {
        if (relPath.startsWith('.git')) return true;
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
    console.log(`📄 Añadiendo ${files.length} archivos al área de preparación (stage)...`);

    for (const filepath of files) {
        await git.add({ fs, dir, filepath });
    }

    const sha = await git.commit({
        fs,
        dir,
        message: 'Initial commit: iOS native project setup with Capacitor and GitHub Actions workflow',
        author: {
            name: 'DaemonX Team',
            email: 'daemonx@music.local'
        }
    });

    console.log(`✅ Commit inicial completado con éxito: ${sha}`);
}

initAndCommit().catch(console.error);
