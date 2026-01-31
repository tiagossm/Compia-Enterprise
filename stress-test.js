import https from 'https';

// Configuration
const BASE_URL = 'https://vjlvvmriqerfmztwtewa.supabase.co/functions/v1/api';
// Use a lightweight public endpoint
const ENDPOINT = '/health';
const TOTAL_REQUESTS = 70; // Limit is 60/min, so 70 should trigger 429
const CONCURRENCY = 10;

console.log(`🚀 Starting Stress Test against ${BASE_URL}${ENDPOINT}`);
console.log(`🎯 Goal: Trigger 429 Too Many Requests (Limit ~60/min)`);
console.log(`📊 Requests: ${TOTAL_REQUESTS} | Concurrency: ${CONCURRENCY}\n`);

let completed = 0;
let success = 0;
let blocked = 0;
let errors = 0;

const start = Date.now();

function makeRequest(id) {
    return new Promise((resolve) => {
        https.get(`${BASE_URL}${ENDPOINT}`, (res) => {
            const status = res.statusCode;
            if (status === 200) {
                success++;
                process.stdout.write('✅');
            } else if (status === 429) {
                blocked++;
                process.stdout.write('⛔');
            } else {
                errors++;
                process.stdout.write(`[${status}]`);
            }

            // Read stream to free memory
            res.on('data', () => { });
            res.on('end', resolve);
        }).on('error', (e) => {
            errors++;
            process.stdout.write('❌');
            resolve();
        });
    });
}

async function runBatch(batchSize) {
    const promises = [];
    for (let i = 0; i < batchSize && completed < TOTAL_REQUESTS; i++) {
        promises.push(makeRequest(completed++));
    }
    await Promise.all(promises);
}

async function run() {
    while (completed < TOTAL_REQUESTS) {
        await runBatch(CONCURRENCY);
    }

    const duration = (Date.now() - start) / 1000;

    console.log('\n\n🏁 Test Completed!');
    console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
    console.log(`✅ Success (200): ${success}`);
    console.log(`⛔ Blocked (429): ${blocked}`);
    console.log(`❌ Errors: ${errors}`);

    if (blocked > 0) {
        console.log('\n✨ Rate Limiting is WORKING! blocked requests detected.');
    } else {
        console.log('\n⚠️  No requests blocked. Limit might be higher or not active.');
    }
}

run();
