
async function check() {
    console.log('Verifying API fix...');
    try {
        const res = await fetch('https://vjlvvmriqerfmztwtewa.supabase.co/functions/v1/api/ai-assistants');
        console.log('Status:', res.status); // Should be 200

        if (res.ok) {
            const json = await res.json();
            console.log('Success!', json.assistants ? `Found ${json.assistants.length} assistants` : 'No assistants field?');
            console.log('Sample:', json.assistants && json.assistants[0] ? json.assistants[0].name : 'N/A');
        } else {
            const text = await res.text();
            console.log('Still failing:', text);
        }

    } catch (e) {
        console.error('Error:', e);
    }
}
check();
