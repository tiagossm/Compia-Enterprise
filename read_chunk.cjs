
const fs = require('fs');
const fileName = process.argv[2];
const start = parseInt(process.argv[3]);
const length = parseInt(process.argv[4]);

const buffer = Buffer.alloc(length);
const fd = fs.openSync(fileName, 'r');
const bytesRead = fs.readSync(fd, buffer, 0, length, start);
fs.closeSync(fd);

process.stdout.write(buffer.slice(0, bytesRead).toString('utf8'));
