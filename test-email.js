
async function sendTest() {
    const url = "https://vjlvvmriqerfmztwtewa.supabase.co/functions/v1/email-worker";

    // Test Recipients
    const recipients = [
        { email: "isafsemencio@gmail.com", name: "Isa Semencio" },
        { email: "medralsgi@gmail.com", name: "Medral SGI" }
    ];

    console.log(`Starting batch send for ${recipients.length} recipients...\n`);

    for (const recipient of recipients) {
        console.log(`Sending to: ${recipient.email} (${recipient.name})...`);

        const payload = {
            to: recipient.email,
            type: "welcome",
            data: {
                name: recipient.name
            }
        };

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log(`Status: ${res.status}`);
            const text = await res.text();
            console.log(`Response: ${text}\n`);

        } catch (e) {
            console.error(`Error sending to ${recipient.email}:`, e);
        }
    }
}

sendTest();
