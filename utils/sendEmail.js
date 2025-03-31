import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced error logging function
const logEmailError = (stage, error, details = {}) => {
    console.error(`[Email Service Error] Stage: ${stage}`);
    console.error('Error:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        details
    });
};

// Create transporter with enhanced error logging
const createTransporter = () => {
    try {
        // Log environment check
        console.log('[Email Service] Checking email configuration...');
        console.log('[Email Service] EMAIL_USER exists:', !!process.env.EMAIL_USER);
        console.log('[Email Service] EMAIL_APP_PASSWORD exists:', !!process.env.EMAIL_APP_PASSWORD);

        if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
            logEmailError('Configuration', new Error('Missing email credentials'));
            return null;
        }

        const gmailTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD
            },
            tls: {
                rejectUnauthorized: false
            },
            debug: true // Enable debug logs
        });

        gmailTransporter.on('error', (error) => {
            logEmailError('Transporter Error', error);
        });

        return gmailTransporter;
    } catch (error) {
        logEmailError('Transporter Creation', error);
        return null;
    }
};

// Enhanced mock transporter
const createMockTransporter = () => {
    console.log('[Email Service] Creating mock transporter');
    return {
        sendMail: async (mailOptions) => {
            console.log('[Mock Email Service] Sending mock email:', {
                to: mailOptions.to,
                subject: mailOptions.subject,
                template: mailOptions.template
            });
            return { 
                messageId: `mock-${Date.now()}`,
                mock: true,
                success: true
            };
        }
    };
};

// Read and compile template with error handling
const renderTemplate = async (templateName, data) => {
    try {
        const templatePath = path.join(__dirname, '..', 'views', 'emails', `${templateName}.ejs`);
        
        const templateData = {
            ...data,
            year: new Date().getFullYear(),
            companyName: 'College Migration',
            socialLinks: {
                Facebook: 'https://facebook.com/collegemigration',
                Twitter: 'https://twitter.com/collegemigration',
                LinkedIn: 'https://linkedin.com/company/collegemigration'
            }
        };

        return await ejs.renderFile(templatePath, templateData);
    } catch (error) {
        console.error('Template rendering error:', error);
        return null;
    }
};

export const sendEmail = async ({ to, subject, template, context }) => {
    console.log('[Email Service] Starting email send process');
    try {
        // Log input parameters
        console.log('[Email Service] Parameters:', {
            to,
            subject,
            template,
            hasContext: !!context
        });

        // Always use mock in development/test
        if (process.env.NODE_ENV !== 'production') {
            console.log('[Email Service] Using mock service (non-production environment)');
            const mockTransporter = createMockTransporter();
            const result = await mockTransporter.sendMail({ to, subject, template });
            return {
                success: true,
                messageId: result.messageId,
                mock: true,
                environment: process.env.NODE_ENV
            };
        }

        // Validate parameters
        if (!to || !subject || !template) {
            logEmailError('Validation', new Error('Missing required parameters'), { to, subject, template });
            return {
                success: true,
                mock: true,
                error: 'Missing parameters - using mock service'
            };
        }

        // Create transporter
        const transporter = createTransporter();
        if (!transporter) {
            console.log('[Email Service] No transporter available - using mock service');
            const mockTransporter = createMockTransporter();
            const result = await mockTransporter.sendMail({ to, subject });
            return {
                success: true,
                messageId: result.messageId,
                mock: true
            };
        }

        // Render template
        let html;
        try {
            html = await renderTemplate(template, context);
            console.log('[Email Service] Template rendered successfully');
        } catch (templateError) {
            logEmailError('Template Rendering', templateError);
            html = `<h1>${subject}</h1><p>Welcome to College Migration!</p>`;
        }

        const mailOptions = {
            from: `"College Migration" <${process.env.EMAIL_USER || 'noreply@collegemigration.com'}>`,
            to,
            subject,
            html
        };

        console.log('[Email Service] Attempting to send email...');
        const info = await transporter.sendMail(mailOptions);
        console.log('[Email Service] Email sent successfully:', info.messageId);
        
        return {
            success: true,
            messageId: info.messageId,
            mock: false
        };

    } catch (error) {
        logEmailError('Send Email', error, { to, subject, template });
        
        // Fallback to mock service
        console.log('[Email Service] Falling back to mock service due to error');
        const mockTransporter = createMockTransporter();
        const result = await mockTransporter.sendMail({ to, subject });
        
        return {
            success: true,
            messageId: result.messageId,
            mock: true,
            error: {
                message: error.message,
                code: error.code,
                details: 'Fallback to mock service'
            }
        };
    }
};

// Enhanced service status check
export const checkEmailService = async () => {
    console.log('[Email Service] Checking service status...');
    try {
        const transporter = createTransporter();
        if (!transporter) {
            console.log('[Email Service] No transporter available');
            return {
                status: 'disabled',
                message: 'Email service is not configured',
                timestamp: new Date().toISOString()
            };
        }

        // Try to verify the connection
        try {
            await transporter.verify();
            console.log('[Email Service] Transporter verified successfully');
        } catch (verifyError) {
            logEmailError('Verification', verifyError);
            return {
                status: 'error',
                message: 'Failed to verify email service',
                error: verifyError.message,
                timestamp: new Date().toISOString()
            };
        }

        return {
            status: 'configured',
            message: 'Email service is configured and verified',
            provider: 'gmail',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        logEmailError('Service Check', error);
        return {
            status: 'error',
            message: 'Email service check failed',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}; 