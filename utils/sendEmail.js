import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create transporter with error handling
const createTransporter = () => {
    try {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    } catch (error) {
        console.error('Error creating mail transporter:', error);
        return null;
    }
};

// Read and compile template with error handling
const renderTemplate = async (templateName, data) => {
    try {
        const templatePath = path.join(__dirname, '..', 'views', 'emails', `${templateName}.ejs`);
        
        // Add common data for all templates
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
        throw new Error('Failed to render email template');
    }
};

export const sendEmail = async ({ to, subject, template, context }) => {
    try {
        // Validate required parameters
        if (!to || !subject || !template) {
            throw new Error('Missing required email parameters');
        }

        // Create transporter
        const transporter = createTransporter();
        if (!transporter) {
            throw new Error('Failed to create email transporter');
        }

        // Verify transporter connection
        try {
            await transporter.verify();
        } catch (error) {
            console.error('Email transporter verification failed:', error);
            throw new Error('Email service not available');
        }

        // Render template
        const html = await renderTemplate(template, context);

        // Send email
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
        
        // Return a structured error response instead of throwing
        return {
            success: false,
            error: {
                message: error.message || 'Failed to send email',
                code: error.code || 'UNKNOWN_ERROR',
                details: error.response || null
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
                status: 'error',
                message: 'Failed to create email transporter'
            };
        }

        await transporter.verify();
        return {
            status: 'ok',
            message: 'Email service is working'
        };
    } catch (error) {
        return {
            status: 'error',
            message: 'Email service is not available',
            error: error.message
        };
    }
}; 