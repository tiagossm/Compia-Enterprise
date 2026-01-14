
const fs = require('fs');
const filename = 'src/react-app/pages/InspectionDetail.tsx';

try {
    const content = fs.readFileSync(filename, 'utf8');
    const lines = content.split('\n');
    let depth = 0;

    console.log(`Analyzing ${lines.length} lines for brace depth...`);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip comments (simple check)
        if (trimmed.startsWith('//')) continue;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '{') {
                depth++;
            } else if (char === '}') {
                depth--;
                if (depth === 0) {
                    // Potential end of function
                    // Ignore if it's the very last line
                    if (i < lines.length - 10) {
                        console.log(`[WARNING] Depth hit 0 at Line ${i + 1}: ${line.trim()}`);
                    }
                }
                if (depth < 0) {
                    console.log(`[ERROR] Negative depth at Line ${i + 1}: ${line.trim()}`);
                    process.exit(1);
                }
            }
        }

        // Periodic report
        if ((i + 1) % 200 === 0) {
            console.log(`Line ${i + 1}: Depth ${depth}`);
        }
    }

    console.log(`Final Depth: ${depth}`);
    if (depth !== 0) {
        console.log('[ERROR] Final depth is not zero. Unbalanced.');
    } else {
        console.log('[SUCCESS] File is balanced.');
    }

} catch (err) {
    console.error('Failed to read file:', err);
}
