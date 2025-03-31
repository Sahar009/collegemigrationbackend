import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create transporter with fallback options
const createTransporter = () => {
    try {
        // Check if required environment variables are set
        if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
            console.warn('Email credentials not configured. Email service will be disabled.');
            return null;
        }

        // First try Gmail
        const gmailTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Add error handler
        gmailTransporter.on('error', (error) => {
            console.error('Gmail transporter error:', error);
        });

        return gmailTransporter;
    } catch (error) {
        console.error('Error creating mail transporter:', error);
        return null;
    }
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
    // Skip email sending if in test mode
    if (process.env.NODE_ENV === 'test') {
        console.log('Test mode: Email would have been sent to', to);
        return {
            success: true,
            messageId: 'test-mode',
            testMode: true
        };
    }

    try {
        // Validate required parameters
        if (!to || !subject || !template) {
            console.warn('Missing required email parameters');
            return {
                success: false,
                error: {
                    message: 'Missing required email parameters',
                    code: 'INVALID_PARAMS'
                }
            };
        }

        // Create transporter
        const transporter = createTransporter();
        if (!transporter) {
            console.warn('Email service disabled - no transporter available');
            return {
                success: false,
                error: {
                    message: 'Email service is not configured',
                    code: 'SERVICE_DISABLED'
                }
            };
        }

        // Render template
        const html = await renderTemplate(template, context);
        if (!html) {
            return {
                success: false,
                error: {
                    message: 'Failed to render email template',
                    code: 'TEMPLATE_ERROR'
                }
            };
        }

        // Send email without verification
        const mailOptions = {
            from: `"College Migration" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error('Email sending error:', error);
        
        return {
            success: false,
            error: {
                message: 'Failed to send email',
                code: error.code || 'UNKNOWN_ERROR',
                details: error.response || error.message
            }
        };
    }
};

// Helper function to check email service status
export const checkEmailService = async () => {
    try {
        const transporter = createTransporter();
        if (!transporter) {
            return {
                status: 'disabled',
                message: 'Email service is not configured'
            };
        }

        return {
            status: 'configured',
            message: 'Email service is configured',
            provider: 'gmail'
        };
    } catch (error) {
        return {
            status: 'error',
            message: 'Email service configuration error',
            error: error.message
        };
    }
}; 