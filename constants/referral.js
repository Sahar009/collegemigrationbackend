import CommissionRate from '../schema/CommissionRateSchema.js';

export const REFERRAL_STATUS = {
    PAID: 'paid',
    UNPAID: 'unpaid'
};

export const getCommissionRates = async () => {
    const rates = await CommissionRate.findAll();
    return rates.reduce((acc, rate) => {
        acc[rate.userType] = rate.amount;
        return acc;
    }, {});
};

// Remove the static COMMISSION_RATES object since we're now using getCommissionRates()
export const COMMISSION_RATES = {
    Agent: 100, // $100 per successful referral
    Member: 50  // $50 per successful referral
};