const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ZipArchive } = require('archiver');
const { createMachOBinary } = require('./make-macho');

async function buildIPA() {
    console.log('🚀 [DaemonX IPA Builder] Iniciando empaquetado optimizado para iOS...');

    const rootDir = path.resolve(__dirname, '..');
    const payloadDir = path.join(rootDir, 'Payload');
    const appDir = path.join(payloadDir, 'DaemonX.app');
    const ipaPath = path.join(rootDir, 'DaemonX-Music.ipa');
    const ipaShortPath = path.join(rootDir, 'DaemonX.ipa');

    // 1. Limpieza de directorios temporales previos
    if (fs.existsSync(payloadDir)) {
        fs.rmSync(payloadDir, { recursive: true, force: true });
    }
    fs.mkdirSync(appDir, { recursive: true });

    // 2. Preparar el binario ejecutable nativo Mach-O ARM64
    const binaryPath = path.join(appDir, 'DaemonX');
    createMachOBinary(binaryPath);

    // 3. Crear PkgInfo de iOS
    fs.writeFileSync(path.join(appDir, 'PkgInfo'), 'APPL????');

    // 4. Copiar Info.plist procesando cualquier variable de entorno de Xcode
    const infoPlistSrc = path.join(rootDir, 'ios', 'App', 'App', 'Info.plist');
    if (fs.existsSync(infoPlistSrc)) {
        let content = fs.readFileSync(infoPlistSrc, 'utf8');
        content = content.replace(/\$\(PRODUCT_BUNDLE_IDENTIFIER\)/g, 'com.daemonx.music');
        content = content.replace(/\$\(EXECUTABLE_NAME\)/g, 'DaemonX');
        content = content.replace(/\$\(PRODUCT_NAME\)/g, 'DaemonX');
        content = content.replace(/\$\(MARKETING_VERSION\)/g, '1.2.0');
        content = content.replace(/\$\(CURRENT_PROJECT_VERSION\)/g, '1');
        fs.writeFileSync(path.join(appDir, 'Info.plist'), content, 'utf8');
        console.log('✅ Info.plist verificado y configurado con Bundle ID explícito: com.daemonx.music');
    } else {
        console.error('Info.plist no encontrado en ios/App/App/');
    }

    // 5. Función auxiliar de copiado recursivo
    function copyDirRecursive(src, dest) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
                copyDirRecursive(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    // 6. Copiar iconos de iOS a la raíz de DaemonX.app
    const iconsDir = path.join(rootDir, 'ios-icons');
    if (fs.existsSync(iconsDir)) {
        fs.readdirSync(iconsDir).forEach(iconFile => {
            fs.copyFileSync(path.join(iconsDir, iconFile), path.join(appDir, iconFile));
        });
        console.log('✅ Iconos de alta resolución copiados al bundle de la aplicación.');
    }

    // 7. Copiar todos los recursos web desde www/
    const wwwDir = path.join(rootDir, 'www');
    if (fs.existsSync(wwwDir)) {
        copyDirRecursive(wwwDir, appDir);
        // También colocar dentro de public/ para compatibilidad con el puente WKWebView de Capacitor
        const publicDir = path.join(appDir, 'public');
        copyDirRecursive(wwwDir, publicDir);
        console.log('✅ Archivos web optimizados integrados en DaemonX.app y public/.');
    }

    // 8. Empaquetar Payload en un archivo .ipa (formato ZIP de iOS)
    console.log('📦 Comprimiendo Payload en DaemonX-Music.ipa con permisos Unix nativos (0755)...');
    
    await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(ipaPath);
        const archive = new ZipArchive({
            zlib: { level: 9 }
        });

        output.on('close', () => {
            console.log(`🎉 Archivo .ipa generado con éxito: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
            resolve();
        });

        archive.on('error', err => reject(err));
        archive.pipe(output);

        // Añadir Payload completo estableciendo permisos de ejecución en el binario Mach-O
        archive.directory(payloadDir, 'Payload', entry => {
            if (entry.name && entry.name.endsWith('DaemonX')) {
                entry.mode = 0o755; // Permiso ejecutable obligatorio para iOS
            } else {
                entry.mode = 0o644;
            }
            return entry;
        });

        archive.finalize();
    });

    // Copia con nombre corto DaemonX.ipa para comodidad de descarga/sideload
    fs.copyFileSync(ipaPath, ipaShortPath);

    // Calcular Hash SHA-256 para verificación de integridad
    const ipaBuffer = fs.readFileSync(ipaPath);
    const sha256 = crypto.createHash('sha256').update(ipaBuffer).digest('hex');

    // Limpiar carpeta temporal Payload
    fs.rmSync(payloadDir, { recursive: true, force: true });

    console.log('\n======================================================');
    console.log('✅ PAQUETE .IPA PARA iOS GENERADO CORRECTAMENTE');
    console.log(`📁 Archivo principal: ${ipaPath}`);
    console.log(`📁 Acceso directo:   ${ipaShortPath}`);
    console.log(`⚖️  Tamaño:          ${(ipaBuffer.length / 1024 / 1024).toFixed(2)} MB (${ipaBuffer.length} bytes)`);
    console.log(`🔒 SHA-256:         ${sha256}`);
    console.log('======================================================\n');
}

buildIPA().catch(err => {
    console.error('Error generando IPA:', err);
    process.exit(1);
});
