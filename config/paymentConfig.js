import dotenv from 'dotenv';
dotenv.config();

export const paymentConfig = {
    paystack: {
        secretKey: process.env.PAYSTACK_SECRET_KEY,
        publicKey: process.env.PAYSTACK_PUBLIC_KEY,
        baseUrl: 'https://api.paystack.co',
        channels: ['card', 'bank', 'ussd', 'qr', 'bank_transfer', 'mobile_money'],
        webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET
    },
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publicKey: process.env.STRIPE_PUBLIC_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        baseUrl: 'https://api.stripe.com/v1',
        channels: ['card']
    },
    flutterwave: {
        secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
        publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
        encryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY,
        baseUrl: 'https://api.flutterwave.com/v3',
        channels: ['card', 'bank', 'ussd', 'bank_transfer'],
        webhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET
    }
}; 