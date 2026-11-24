// Serverless Function for Contact Form (Netlify/Vercel)
// Alternative to Express server for static deployments

const nodemailer = require('nodemailer');

// Escape user input before inserting into HTML to prevent XSS
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Validation function
function validateContactForm(body) {
    const errors = [];
    
    if (!body.name || body.name.length < 2 || body.name.length > 100) {
        errors.push('Name must be between 2 and 100 characters');
    }
    
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        errors.push('Please provide a valid email address');
    }
    
    if (!body.organization || body.organization.length < 2 || body.organization.length > 100) {
        errors.push('Organization must be between 2 and 100 characters');
    }
    
    if (!body.message || body.message.length < 10 || body.message.length > 2000) {
        errors.push('Message must be between 10 and 2000 characters');
    }
    
    if (body.phone && !/^[\+]?[0-9\s\-\(\)]{10,15}$/.test(body.phone)) {
        errors.push('Please provide a valid phone number');
    }
    
    return errors;
}

// Create email transporter
function createTransporter() {
    // Configure based on environment variables
    if (process.env.SENDGRID_API_KEY) {
        return nodemailer.createTransporter({
            service: 'SendGrid',
            auth: {
                user: 'apikey',
                pass: process.env.SENDGRID_API_KEY
            }
        });
    }
    
    if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
        return nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS
            }
        });
    }
    
    // Default SMTP
    return nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

// Main handler function
exports.handler = async (event, context) => {
    // CORS headers
    const allowedOrigins = [
        'https://rapturetwelve.com',
        'https://www.rapturetwelve.com'
    ];
    const origin = event.headers?.origin || '';
    const headers = {
        'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Method not allowed'
            })
        };
    }
    
    try {
        // Parse request body
        const body = JSON.parse(event.body);
        
        // Validate input
        const validationErrors = validateContactForm(body);
        if (validationErrors.length > 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Validation failed',
                    errors: validationErrors
                })
            };
        }
        
        const { name, email, organization, role, phone, message } = body;

        // Escape all user inputs for safe HTML insertion
        const safeName = escapeHtml(name);
        const safeEmail = escapeHtml(email);
        const safeOrganization = escapeHtml(organization);
        const safeRole = role ? escapeHtml(role) : null;
        const safePhone = phone ? escapeHtml(phone) : null;
        const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

        // Create email transporter
        const transporter = createTransporter();
        
        // Email content for Rapture Twelve team
        const teamEmailContent = {
            from: process.env.FROM_EMAIL || 'noreply@rapturetwelve.com',
            to: ['antonyshane@rapturetwelve.com', 'kruthinvinay@rapturetwelve.com'],
            subject: `New Cybersecurity Inquiry - ${safeOrganization}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
                    <div style="background: #000; color: #fff; padding: 20px; text-align: center;">
                        <h2 style="margin: 0; font-family: 'Orbitron', monospace;">RAPTURE TWELVE</h2>
                        <p style="margin: 5px 0 0 0; letter-spacing: 2px; font-size: 12px;">INFILTRATE • EXPLOIT • SECURE</p>
                    </div>

                    <div style="background: #fff; padding: 30px; border: 1px solid #ddd;">
                        <h3 style="color: #333; margin-top: 0;">New Contact Form Submission</h3>

                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Name:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${safeName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Organization:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${safeOrganization}</td>
                            </tr>
                            ${safeRole ? `
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Role:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${safeRole}</td>
                            </tr>
                            ` : ''}
                            ${safePhone ? `
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="tel:${safePhone}">${safePhone}</a></td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td style="padding: 10px 0; font-weight: bold; vertical-align: top;">Message:</td>
                                <td style="padding: 10px 0;">${safeMessage}</td>
                            </tr>
                        </table>
                        
                        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-left: 4px solid #000;">
                            <p style="margin: 0; font-size: 14px; color: #666;">
                                Submitted on ${new Date().toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            `
        };
        
        // Auto-reply email for the sender
        const autoReplyContent = {
            from: process.env.FROM_EMAIL || 'noreply@rapturetwelve.com',
            to: email,
            subject: 'Thank you for contacting Rapture Twelve',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
                    <div style="background: #000; color: #fff; padding: 20px; text-align: center;">
                        <h2 style="margin: 0; font-family: 'Orbitron', monospace;">RAPTURE TWELVE</h2>
                        <p style="margin: 5px 0 0 0; letter-spacing: 2px; font-size: 12px;">INFILTRATE • EXPLOIT • SECURE</p>
                    </div>

                    <div style="background: #fff; padding: 30px; border: 1px solid #ddd;">
                        <h3 style="color: #333; margin-top: 0;">Thank you for your inquiry, ${safeName}</h3>

                        <p>We have received your message regarding cybersecurity and AI solutions for ${safeOrganization}. Our team will review your requirements and respond within 24 hours.</p>

                        <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-left: 4px solid #000;">
                            <h4 style="margin: 0 0 10px 0; color: #333;">Your Message:</h4>
                            <p style="margin: 0; color: #666;">${safeMessage}</p>
                        </div>
                        
                        <p>For urgent matters, please contact our leadership team directly:</p>
                        
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <h4 style="margin: 0 0 10px 0; color: #333;">Antony Shane - Founder & CEO</h4>
                            <p style="margin: 0;">
                                <a href="tel:+919790791723" style="color: #000; text-decoration: none;">📞 +91 97907 91723</a><br>
                                <a href="mailto:antonyshane@rapturetwelve.com" style="color: #000; text-decoration: none;">✉️ antonyshane@rapturetwelve.com</a>
                            </p>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <h4 style="margin: 0 0 10px 0; color: #333;">Vinay Venkat Kruthin - Co-Founder & COO</h4>
                            <p style="margin: 0;">
                                <a href="tel:+918925126949" style="color: #000; text-decoration: none;">📞 +91 89251 26949</a><br>
                                <a href="mailto:kruthinvinay@rapturetwelve.com" style="color: #000; text-decoration: none;">✉️ kruthinvinay@rapturetwelve.com</a>
                            </p>
                        </div>
                        
                        <p style="margin-top: 30px; font-size: 14px; color: #666;">
                            Best regards,<br>
                            The Rapture Twelve Team<br>
                            Defense-grade cybersecurity and AI solutions
                        </p>
                    </div>
                </div>
            `
        };
        
        // Send emails
        await Promise.all([
            transporter.sendMail(teamEmailContent),
            transporter.sendMail(autoReplyContent)
        ]);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Message sent successfully! We will contact you within 24 hours.'
            })
        };
        
    } catch (error) {
        console.error('Contact form error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Failed to send message. Please try again or contact us directly.'
            })
        };
    }
};
