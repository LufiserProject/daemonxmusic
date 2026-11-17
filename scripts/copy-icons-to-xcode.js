const fs = require('fs');
const path = require('path');

const assetDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
const sourceIcon = path.join(__dirname, '..', 'ios-icons', 'AppIcon-1024.png');

if (fs.existsSync(sourceIcon) && fs.existsSync(assetDir)) {
    // Copy main 1024x1024 universal icon
    fs.copyFileSync(sourceIcon, path.join(assetDir, 'AppIcon-512@2x.png'));
    fs.copyFileSync(sourceIcon, path.join(assetDir, 'AppIcon-1024.png'));

    // Also copy all generated icons
    const iconDir = path.join(__dirname, '..', 'ios-icons');
    fs.readdirSync(iconDir).forEach(f => {
        fs.copyFileSync(path.join(iconDir, f), path.join(assetDir, f));
    });

    console.log('Copied all AppIcon assets to iOS Xcode Asset Catalog.');
}
