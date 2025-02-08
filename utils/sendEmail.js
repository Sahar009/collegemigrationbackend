import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs/promises'; // Using promises version for cleaner async code
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
const readTemplate = async (templateName) => {
    const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.hbs`);
    const template = await fs.readFile(templatePath, 'utf-8');
    return handlebars.compile(template);
};

export const sendEmail = async ({ to, subject, template, context }) => {
    try {
        // Compile template
        const compiledTemplate = await readTemplate(template);
        const html = compiledTemplate(context);

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