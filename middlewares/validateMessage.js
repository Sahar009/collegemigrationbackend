export const validateMessage = (req, res, next) => {
    const { receiverId, receiverType, message } = req.body;
    const validTypes = ['admin', 'agent', 'member', 'student'];
    
    if (!receiverId || !receiverType || !message) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields'
        });
    }

    if (!validTypes.includes(receiverType)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid receiver type'
        });
    }

    if (isNaN(Number(receiverId))) {
        return res.status(400).json({
            success: false,
            message: 'Invalid receiver ID'
        });
    }

    if (req.files?.attachments?.length > 5) {
        return res.status(400).json({
            success: false,
            message: 'Maximum 5 attachments allowed'
        });
    }

    next();
};