import CommissionRate from '../schema/CommissionRateSchema.js';

export const getCommissionRates = async () => {
    return await CommissionRate.findAll();
};

export const updateCommissionRate = async (userType, amount) => {
    const [updated] = await CommissionRate.update(
        { amount },
        { where: { userType } }
    );
    
    if (!updated) {
        throw new Error('Commission rate not found');
    }
    
    return await CommissionRate.findOne({ where: { userType } });
};