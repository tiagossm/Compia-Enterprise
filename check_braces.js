
const fs = require('fs');
const filename = 'src/react-app/pages/InspectionDetail.tsx';
const content = fs.readFileSync(filename, 'utf8');

let braceStack = [];
let parenStack = [];
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '{') {
            braceStack.push({ line: i + 1, col: j + 1 });
        } else if (char === '}') {
            if (braceStack.length === 0) {
                console.log(`Extra '}' at line ${i + 1}, col ${j + 1}`);
            } else {
                braceStack.pop();
            }
        } else if (char === '(') {
            parenStack.push({ line: i + 1, col: j + 1 });
        } else if (char === ')') {
            if (parenStack.length === 0) {
                console.log(`Extra ')' at line ${i + 1}, col ${j + 1}`);
            } else {
                parenStack.pop();
            }
        }
    }
}

if (braceStack.length > 0) {
    console.log(`${braceStack.length} Unclosed '{' found. Last one at:`, braceStack[braceStack.length - 1]);
    // Show top 3 unclosed
    if (braceStack.length > 1) console.log('Previous:', braceStack[braceStack.length - 2]);
    if (braceStack.length > 2) console.log('Previous:', braceStack[braceStack.length - 3]);
}
if (parenStack.length > 0) {
    console.log(`${parenStack.length} Unclosed '(' found. Last one at:`, parenStack[parenStack.length - 1]);
}

if (braceStack.length === 0 && parenStack.length === 0) {
    console.log('Braces and Parens are balanced.');
}
