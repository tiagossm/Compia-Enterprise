
const files = [];
const apiDir = "c:\\Users\\engti\\Downloads\\COMPIA 06092520\\supabase\\functions\\api";

async function readDir(dir, relativePath = "") {
    for await (const entry of Deno.readDir(dir)) {
        const fullPath = `${dir}\\${entry.name}`;
        const rel = relativePath ? `${relativePath}/${entry.name}` : entry.name;

        if (entry.isDirectory) {
            await readDir(fullPath, rel);
        } else if (entry.isFile) {
            const content = await Deno.readTextFile(fullPath);
            files.push({ name: rel, content });
        }
    }
}

await readDir(apiDir);
console.log(JSON.stringify(files));
