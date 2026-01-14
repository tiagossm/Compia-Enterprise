const fs = require('fs');
try {
    const image = fs.readFileSync('public/compia_logo.png');
    console.log(image.toString('base64'));
} catch (e) {
    console.error('Error reading file:', e);
}
