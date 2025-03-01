// JWT Configuration
export const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-here';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Application Status
export const APPLICATION_STATUS = {
    PENDING: 'Pending',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
    WITHDRAWN: 'Withdrawn',
    COMPLETED: 'Completed'
};

// Payment Status
export const PAYMENT_STATUS = {
    PAID: 'Paid',
    UNPAID: 'Unpaid',
    PENDING: 'Pending',
    REFUNDED: 'Refunded'
};

// Agent Status
export const AGENT_STATUS = {
    ACTIVE: 'active',
    PENDING: 'pending',
    INACTIVE: 'inactive'
};

// Program Categories
export const PROGRAM_CATEGORIES = {
    UNDERGRADUATE: 'undergraduate',
    POSTGRADUATE: 'postgraduate',
    PHD: 'phd'
};

// HTTP Status Codes
export const STATUS_CODES = {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500
};

// Validation Constants
export const VALIDATION = {
    PASSWORD_MIN_LENGTH: 8,
    OTP_LENGTH: 6,
    OTP_EXPIRY: 30, // minutes
    EMAIL_VERIFICATION_EXPIRY: '24h',
    PASSWORD_RESET_EXPIRY: '1h'
};

// File Upload Constants
export const UPLOAD = {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
    UPLOAD_PATH: 'uploads/'
};

// Commission Rates
export const COMMISSION = {
    DEFAULT_RATE: 0,
    MIN_RATE: 0,
    MAX_RATE: 100
};

// API Routes
export const API_ROUTES = {
    BASE: '/api',
    AGENT: {
        BASE: '/agent',
        AUTH: '/auth',
        STUDENTS: '/students',
        APPLICATIONS: '/applications',
        PROFILE: '/profile'
    }
};

// Email Templates
export const EMAIL_TEMPLATES = {
    AGENT_VERIFICATION: 'agentVerification',
    PASSWORD_RESET: 'agentResetPassword',
    APPLICATION_STATUS: 'applicationStatus'
};

// Response Messages
export const MESSAGES = {
    AUTH: {
        REGISTRATION_SUCCESS: 'Registration successful. Please check your email for verification.',
        LOGIN_SUCCESS: 'Login successful',
        INVALID_CREDENTIALS: 'Invalid credentials',
        ACCOUNT_INACTIVE: 'Account is not active. Please contact support.',
        PASSWORD_RESET_SENT: 'Password reset OTP sent to your email',
        PASSWORD_RESET_SUCCESS: 'Password reset successful',
        INVALID_OTP: 'Invalid or expired OTP',
        EMAIL_VERIFIED: 'Email verified successfully',
        PASSWORD_CHANGED: 'Password changed successfully'
    },
    ERROR: {
        SERVER_ERROR: 'Internal server error',
        NOT_FOUND: 'Resource not found',
        UNAUTHORIZED: 'Unauthorized access',
        VALIDATION_ERROR: 'Validation error'
    }
};

// Default Pagination
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10
}; 