import { paymentConfig } from '../config/paymentConfig.js';
import axios from 'axios';

class PaymentProviderService {
    constructor(provider) {
        this.config = paymentConfig[provider];
        this.provider = provider;
        this.axios = axios.create({
            baseURL: this.config.baseUrl,
            headers: this.getHeaders()
        });
    }

    getHeaders() {
        switch(this.provider) {
            case 'paystack':
                return {
                    'Authorization': `Bearer ${this.config.secretKey}`,
                    'Content-Type': 'application/json'
                };
            case 'stripe':
                return {
                    'Authorization': `Bearer ${this.config.secretKey}`,
                    'Content-Type': 'application/json'
                };
            case 'flutterwave':
                return {
                    'Authorization': `Bearer ${this.config.secretKey}`,
                    'Content-Type': 'application/json'
                };
            default:
                throw new Error('Invalid payment provider');
        }
    }

    async initializePayment(paymentData) {
        try {
            switch(this.provider) {
                case 'paystack':
                    return await this.initializePaystackPayment(paymentData);
                case 'stripe':
                    return await this.initializeStripePayment(paymentData);
                case 'flutterwave':
                    return await this.initializeFlutterwavePayment(paymentData);
                default:
                    throw new Error('Invalid payment provider');
            }
        } catch (error) {
            throw new Error(`Payment initialization failed: ${error.message}`);
        }
    }

    async initializePaystackPayment(paymentData) {
        const response = await this.axios.post('/transaction/initialize', paymentData);
        return response.data;
    }

    async initializeStripePayment(paymentData) {
        const response = await this.axios.post('/payment_intents', paymentData);
        return response.data;
    }

    async initializeFlutterwavePayment(paymentData) {
        const response = await this.axios.post('/payments', paymentData);
        return response.data;
    }

    async verifyPayment(reference) {
        try {
            console.log('Verifying payment with provider:', this.provider);
            console.log('Reference:', reference);
            
            const response = await this.axios.get(`/transaction/verify/${reference}`);
            console.log('Provider verification response:', response.data);
            
            return response;
        } catch (error) {
            console.error('Provider verification error:', {
                provider: this.provider,
                reference: reference,
                error: error.response?.data || error.message
            });
            throw error;
        }
    }

    getPublicKey() {
        return this.config.publicKey;
    }

    getChannels() {
        return this.config.channels;
    }
}

export default PaymentProviderService; 