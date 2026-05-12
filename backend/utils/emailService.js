import nodemailer from 'nodemailer';

// Lazy-load transporter to ensure env vars are loaded
let transporter = null;

function getTransporter() {
  if (!transporter) {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
      console.warn('⚠️ Email credentials not configured. Email features (OTP) will fail.');
      return {
        sendMail: async (options) => {
          console.log('--- MOCK EMAIL ---');
          console.log(`To: ${options.to}`);
          console.log(`Subject: ${options.subject}`);
          console.log(`OTP: ${options.html.match(/\d{6}/)?.[0] || 'N/A'}`);
          console.log('------------------');
          return { messageId: 'mock-id' };
        }
      };
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    console.log('✅ Email transporter initialized');
  }
  return transporter;
}

// Generate 6-digit OTP
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email
export async function sendOTPEmail(email, otp, name = 'User') {
  const mailOptions = {
    from: `"VeriResume" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Email Verification - VeriResume',
    html: `
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
    `,
  };

  try {
    const transport = getTransporter();
    const info = await transport.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email, otp, name = 'User') {
  const mailOptions = {
    from: `"VeriResume" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset - VeriResume',
    html: `
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
    `,
  };

  try {
    const transport = getTransporter();
    const info = await transport.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Password reset email error:', error);
    return { success: false, error: error.message };
  }
}
