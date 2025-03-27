import { getDashboardMetricsService } from '../service/adminDashboardService.js';

export const getDashboardMetrics = async (req, res) => {
  try {
    if (!req.user && !req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        statusCode: 401
      });
    }

    const { startDate, endDate } = req.query;
    
    // Validate dates if provided
    if ((startDate && !isValidDate(startDate)) || (endDate && !isValidDate(endDate))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD format.',
        statusCode: 400
      });
    }
    
    // If endDate is before startDate, return error
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date',
        statusCode: 400
      });
    }
    
    const result = await getDashboardMetricsService(startDate, endDate);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve dashboard metrics',
      statusCode: 500
    });
  }
};

// Helper function to validate date format
function isValidDate(dateString) {
  // Check if the date string matches YYYY-MM-DD format
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  // Check if it's a valid date
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
} 