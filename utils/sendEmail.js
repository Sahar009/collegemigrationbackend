import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    },
    tls: {
        rejectUnauthorized: false // Only if you're having SSL issues
    }
});

// Read and compile template
const renderTemplate = async (templateName, data) => {
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
};

export const sendEmail = async ({ to, subject, template, context }) => {
    try {
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
        console.log('Email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        throw error;
    }
}; 