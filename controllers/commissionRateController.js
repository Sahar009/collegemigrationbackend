import { getCommissionRates, updateCommissionRate } from '../service/commissionRateService.js';

export const getRates = async (req, res) => {
    const rates = await getCommissionRates();
    res.json(rates);
};

export const updateRate = async (req, res) => {
    const { userType, amount } = req.body;
    
    if (!userType || !amount) {
        return res.status(400).json({ message: 'userType and amount are required' });
    }
    
    const updatedRate = await updateCommissionRate(userType, amount);
    res.json(updatedRate);
}