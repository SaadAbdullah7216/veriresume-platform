import axios from 'axios';

// Generate 6-digit OTP
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generic function to send email via EmailJS API
async function sendEmailJSMail(to_email, to_name, subject, message_html, raw_otp) {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY; // Optional but recommended

  if (!serviceId || !templateId || !publicKey) {
    console.warn('⚠️ EmailJS credentials not fully configured. Email features will simulate/mock.');
    console.log('--- MOCK EMAIL ---');
    console.log(`To: ${to_email}`);
    console.log(`Subject: ${subject}`);
    console.log(`OTP: ${raw_otp}`);
    console.log('------------------');
    return { success: true, messageId: 'mock-id' };
  }

  const data = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    accessToken: privateKey,
    template_params: {
      to_email,
      to_name,
      subject,
      message: message_html,
      otp: raw_otp
    }
  };

  try {
    const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Email sent successfully via EmailJS');
    return { success: true };
  } catch (error) {
    console.error('EmailJS send error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

// Send OTP email
export async function sendOTPEmail(email, otp, name = 'User') {
  const subject = 'Email Verification - VeriResume';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Verify Your Email</h2>
      <p>Hi ${name},</p>
      <p>Thank you for signing up with VeriResume. Please use the following OTP to verify your email address:</p>
      <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <br>
      <p>Best regards,<br>VeriResume Team</p>
    </div>
  `;
  return await sendEmailJSMail(email, name, subject, html, otp);
}

// Send password reset email
export async function sendPasswordResetEmail(email, otp, name = 'User') {
  const subject = 'Password Reset - VeriResume';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Reset Your Password</h2>
      <p>Hi ${name},</p>
      <p>You requested to reset your password. Please use the following OTP to proceed:</p>
      <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
      <br>
      <p>Best regards,<br>VeriResume Team</p>
    </div>
  `;
  return await sendEmailJSMail(email, name, subject, html, otp);
}
