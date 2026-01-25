const fs = require('fs');
const path = require('path');

const basePath = "c:\\Users\\engti\\Downloads\\COMPIA 06092520\\supabase\\functions\\api";

function getAllFiles(dirPath, arrayOfFiles) {
    try {
        const files = fs.readdirSync(dirPath);

        arrayOfFiles = arrayOfFiles || [];

        files.forEach(function (file) {
            const fullPath = path.join(dirPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            } else {
                if (file.endsWith('.ts') || file.endsWith('.json')) {
                    arrayOfFiles.push(fullPath);
                }
            }
        });
    } catch (e) { console.error(e); }

    return arrayOfFiles;
}

const files = getAllFiles(basePath);
const result = files.map(file => {
    const content = fs.readFileSync(file, 'utf8');
    const relative = file.replace(basePath, '').replace(/^[\\\/]/, '').replace(/\\/g, '/');
    return { name: relative, content: content };
});

fs.writeFileSync("c:\\Users\\engti\\Downloads\\COMPIA 06092520\\files_bundle.json", JSON.stringify(result));
console.log("Done");
