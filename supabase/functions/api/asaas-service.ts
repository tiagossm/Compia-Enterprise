
export interface AsaasCustomer {
    id: string;
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string;
    mobilePhone?: string;
    address?: string;
    addressNumber?: string;
    complement?: string;
    province?: string;
    postalCode?: string;
}

export interface AsaasSubscription {
    id: string;
    customer: string;
    value: number;
    nextDueDate: string;
    cycle: 'MONTHLY' | 'YEARLY';
    description?: string;
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
    status: 'ACTIVE' | 'EXPIRED';
}

export class AsaasService {
    private apiKey: string;
    private apiUrl: string;

    constructor() {
        this.apiKey = Deno.env.get('ASAAS_API_KEY') || '';
        // Default to Sandbox if not specified, explicitly check for 'production' value
        const mode = Deno.env.get('ASAAS_MODE'); // 'sandbox' or 'production'
        this.apiUrl = mode === 'production'
            ? 'https://api.asaas.com/v3'
            : 'https://sandbox.asaas.com/api/v3';

        if (!this.apiKey) {
            console.warn('[AsaasService] ASAAS_API_KEY not found in environment variables.');
        }
    }

    private async request(endpoint: string, method: string = 'GET', body?: any) {
        const url = `${this.apiUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'access_token': this.apiKey
        };

        const options: RequestInit = {
            method,
            headers
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        console.log(`[AsaasService] ${method} ${url}`);

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[AsaasService] Error ${response.status}: ${errorText}`);
                throw new Error(`Asaas API Error: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[AsaasService] Request failed:', error);
            throw error;
        }
    }

    /**
     * Create or Update a customer in Asaas
     * First checks if customer exists by email/cpfCnpj to avoid duplicates
     */
    async createOrUpdateCustomer(data: Partial<AsaasCustomer>): Promise<AsaasCustomer> {
        // 1. Try to find by CPF/CNPJ
        if (data.cpfCnpj) {
            const search = await this.request(`/customers?cpfCnpj=${data.cpfCnpj}`);
            if (search.data && search.data.length > 0) {
                return search.data[0];
            }
        }

        // 2. Try to find by Email
        if (data.email) {
            const search = await this.request(`/customers?email=${data.email}`);
            if (search.data && search.data.length > 0) {
                return search.data[0];
            }
        }

        // 3. Create new customer
        return await this.request('/customers', 'POST', data);
    }

    /**
     * Create a new Subscription
     */
    async createSubscription(data: {
        customer: string;
        billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
        value: number;
        nextDueDate: string;
        cycle: 'MONTHLY' | 'YEARLY';
        description?: string;
        externalReference?: string;
    }): Promise<AsaasSubscription> {
        return await this.request('/subscriptions', 'POST', data);
    }

    /**
     * Update an existing subscription (Upgrade/Downgrade)
     */
    async updateSubscription(subscriptionId: string, data: {
        value?: number;
        nextDueDate?: string;
        cycle?: 'MONTHLY' | 'YEARLY';
        billingType?: string;
        description?: string;
        updatePendingPayments?: boolean; // If true, updates pending invoices
    }): Promise<AsaasSubscription> {
        // Note: Asaas API might require specific handling for value updates vs cycle updates
        return await this.request(`/subscriptions/${subscriptionId}`, 'POST', data);
    }

    /**
     * Get Subscription details
     */
    async getSubscription(subscriptionId: string): Promise<AsaasSubscription> {
        return await this.request(`/subscriptions/${subscriptionId}`);
    }

    /**
     * Get Payments (Invoices) for a Subscription
     */
    async getSubscriptionPayments(subscriptionId: string) {
        return await this.request(`/payments?subscription=${subscriptionId}`);
    }

    /**
     * Generate a One-Time Payment Link (for Pay-as-you-go Credits)
     */
    async createPaymentLink(data: {
        name: string;
        description: string;
        value: number;
        dueDateLimitDays?: number; // Days until link expires
        billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
        chargeType: 'DETACHED'; // One-time charge
    }) {
        return await this.request('/paymentLinks', 'POST', data);
    }
}
