import { PaymentConfig } from '../schema/paymentConfigSchema.js';
import { messageHandler } from '../utils/index.js';
import { SUCCESS, BAD_REQUEST, NOT_FOUND } from '../constants/statusCode.js';

export const createExchangeRate = async (req, res) => {
    try {
        const { currency, symbol, exchangeRate, paymentMethods } = req.body;

        // Validation
        if (!currency || !symbol || !exchangeRate || !paymentMethods) {
            return res.status(BAD_REQUEST).json(
                messageHandler("All fields (currency, symbol, exchangeRate, paymentMethods) are required", false, BAD_REQUEST)
            );
        }

        if (exchangeRate <= 0) {
            return res.status(BAD_REQUEST).json(
                messageHandler("Exchange rate must be greater than 0", false, BAD_REQUEST)
            );
        }

        // Check if currency already exists
        const existingConfig = await PaymentConfig.findOne({ where: { currency } });
        if (existingConfig) {
            return res.status(BAD_REQUEST).json(
                messageHandler("Currency configuration already exists", false, BAD_REQUEST)
            );
        }

        const config = await PaymentConfig.create({
            currency,
            symbol,
            exchangeRate,
            paymentMethods,
            isActive: true
        });

        return res.status(SUCCESS).json(
            messageHandler("Exchange rate configuration created successfully", true, SUCCESS, config)
        );
    } catch (error) {
        console.error('Create exchange rate error:', error);
        return res.status(BAD_REQUEST).json(
            messageHandler(error.message || "Error creating exchange rate configuration", false, BAD_REQUEST)
        );
    }
};

export const updateExchangeRate = async (req, res) => {
    try {
        const { currency } = req.params;
        const updates = req.body;

        // Validate updates
        if (updates.exchangeRate && updates.exchangeRate <= 0) {
            return res.status(BAD_REQUEST).json(
                messageHandler("Exchange rate must be greater than 0", false, BAD_REQUEST)
            );
        }

        const config = await PaymentConfig.findOne({ where: { currency } });
        if (!config) {
            return res.status(NOT_FOUND).json(
                messageHandler("Currency configuration not found", false, NOT_FOUND)
            );
        }

        // Update only allowed fields
        const allowedUpdates = ['exchangeRate', 'symbol', 'isActive', 'paymentMethods'];
        const filteredUpdates = Object.keys(updates)
            .filter(key => allowedUpdates.includes(key))
            .reduce((obj, key) => {
                obj[key] = updates[key];
                return obj;
            }, {});

        await config.update(filteredUpdates);

        return res.status(SUCCESS).json(
            messageHandler("Exchange rate configuration updated successfully", true, SUCCESS, config)
        );
    } catch (error) {
        console.error('Update exchange rate error:', error);
        return res.status(BAD_REQUEST).json(
            messageHandler(error.message || "Error updating exchange rate configuration", false, BAD_REQUEST)
        );
    }
};

export const getExchangeRates = async (req, res) => {
    try {
        const { active } = req.query;
        const whereClause = {};

        if (active === 'true') {
            whereClause.isActive = true;
        }

        const rates = await PaymentConfig.findAll({
            where: whereClause,
            order: [['currency', 'ASC']]
        });

        return res.status(SUCCESS).json(
            messageHandler("Exchange rates retrieved successfully", true, SUCCESS, rates)
        );
    } catch (error) {
        console.error('Get exchange rates error:', error);
        return res.status(BAD_REQUEST).json(
            messageHandler(error.message || "Error retrieving exchange rates", false, BAD_REQUEST)
        );
    }
};

export const getExchangeRateByCode = async (req, res) => {
    try {
        const { currency } = req.params;
        const config = await PaymentConfig.findOne({
            where: { currency }
        });

        if (!config) {
            return res.status(NOT_FOUND).json(
                messageHandler("Currency configuration not found", false, NOT_FOUND)
            );
        }

        return res.status(SUCCESS).json(
            messageHandler("Exchange rate retrieved successfully", true, SUCCESS, config)
        );
    } catch (error) {
        console.error('Get exchange rate error:', error);
        return res.status(BAD_REQUEST).json(
            messageHandler(error.message || "Error retrieving exchange rate", false, BAD_REQUEST)
        );
    }
};

export const toggleExchangeRateStatus = async (req, res) => {
    try {
        const { currency } = req.params;
        const config = await PaymentConfig.findOne({ where: { currency } });

        if (!config) {
            return res.status(NOT_FOUND).json(
                messageHandler("Currency configuration not found", false, NOT_FOUND)
            );
        }

        await config.update({ isActive: !config.isActive });

        return res.status(SUCCESS).json(
            messageHandler(
                `Exchange rate ${config.isActive ? 'activated' : 'deactivated'} successfully`,
                true,
                SUCCESS,
                config
            )
        );
    } catch (error) {
        console.error('Toggle exchange rate status error:', error);
        return res.status(BAD_REQUEST).json(
            messageHandler(error.message || "Error toggling exchange rate status", false, BAD_REQUEST)
        );
    }
};

export const deleteExchangeRate = async (req, res) => {
    try {
        const { currency } = req.params;
        const config = await PaymentConfig.findOne({ where: { currency } });

        if (!config) {
            return res.status(NOT_FOUND).json(
                messageHandler("Currency configuration not found", false, NOT_FOUND)
            );
        }

        await config.destroy();

        return res.status(SUCCESS).json(
            messageHandler("Exchange rate configuration deleted successfully", true, SUCCESS)
        );
    } catch (error) {
        console.error('Delete exchange rate error:', error);
        return res.status(BAD_REQUEST).json(
            messageHandler(error.message || "Error deleting exchange rate configuration", false, BAD_REQUEST)
        );
    }
}; 