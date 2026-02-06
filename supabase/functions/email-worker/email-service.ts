
/**
 * Service to handle email sending via Resend API
 */
export class EmailService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.fromEmail = 'Compia.tech <system@compia.tech>'; // Official sender
    }

    /**
     * Send an email using Resend API
     */
    async sendEmail(to, subject, html) {
        if (!this.apiKey) {
            console.error('[EmailService] Missing RESEND_API_KEY');
            return { success: false, error: 'Missing configuration' };
        }

        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    from: this.fromEmail,
                    to: to,
                    subject: subject,
                    html: html
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('[EmailService] Error sending email:', data);
                return { success: false, error: data };
            }

            console.log(`[EmailService] Email sent successfully to ${to.join(', ')}. ID: ${data.id}`);
            return { success: true, id: data.id };

        } catch (error) {
            console.error('[EmailService] Network error:', error);
            return { success: false, error: error };
        }
    }
}
