
const fs = require('fs');
const path = require('path');

const integrityDir = 'supabase/functions/api';
const rootDir = path.resolve(integrityDir);

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

const allFiles = getAllFiles(rootDir);
const payload = allFiles.map(filePath => {
    // Get relative path from api folder
    // e.g. C:\...\api\index.ts -> index.ts
    // e.g. C:\...\api\shared\utils.ts -> shared/utils.ts
    let relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    return {
        name: relativePath,
        content: fs.readFileSync(filePath, 'utf8')
    };
});

console.log(JSON.stringify(payload));
