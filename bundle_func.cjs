
const fs = require('fs');
const path = require('path');

const files = [];
const apiDir = "c:\\Users\\engti\\Downloads\\COMPIA 06092520\\supabase\\functions\\api";

function readDir(dir, relativePath = "") {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const rel = relativePath ? `${relativePath}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
            readDir(fullPath, rel);
        } else if (entry.isFile()) {
            const content = fs.readFileSync(fullPath, 'utf8');
            files.push({ name: rel, content });
        }
    }
}

readDir(apiDir);
fs.writeFileSync('func_bundle.json', JSON.stringify(files), 'utf8');
