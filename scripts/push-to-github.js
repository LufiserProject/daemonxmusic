const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..');

async function pushRepo(repoUrl, token) {
    if (!repoUrl) {
        console.error('Uso: node scripts/push-to-github.js <URL_DEL_REPOSITORIO> [TOKEN_OPCIONAL]');
        process.exit(1);
    }

    console.log(`🚀 Conectando con GitHub y subiendo a: ${repoUrl}...`);
    try {
        await git.push({
            fs,
            http,
            dir,
            url: repoUrl,
            ref: 'main',
            force: true,
            onAuth: () => ({ username: token || 'git' })
        });
        console.log('\n🎉 ¡Código subido a GitHub con éxito!');
        console.log('⚡ El servidor Mac de GitHub Actions ya ha comenzado la compilación de tu .IPA nativo.');
    } catch (err) {
        console.error('Error al subir a GitHub:', err.message);
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    pushRepo(args[0], args[1]);
}

module.exports = { pushRepo };
