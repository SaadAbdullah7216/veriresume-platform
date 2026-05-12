// Get current user info from JWT
export const getMe = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Set role for user after Google sign-in
export const setRole = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { role } = req.body;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!role || !["jobseeker", "hr"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.role = role;
    await user.save();
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateOTP, sendOTPEmail, sendPasswordResetEmail } from '../utils/emailService.js';

const getJwtSecret = () => process.env.JWT_SECRET || 'devsecret';

export const signup = async (req, res) => {
  const {
    email,
    password,
    name,
    role,
    companyName,
    companyLogoUrl,
    companyDescription,
    companyWebsite,
    companyLocation,
  } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'User already exists' });
    
    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    const normalizedRole = role || "jobseeker";
    const hasCompanyProfile = Boolean(
      companyName || companyLogoUrl || companyDescription || companyWebsite || companyLocation
    );

    const userPayload = {
      email,
      password,
      name,
      role: normalizedRole,
      emailVerificationOTP: otp,
      otpExpires: otpExpires,
      isEmailVerified: false,
    };

    if (normalizedRole === "hr" && hasCompanyProfile) {
      userPayload.company = companyName || "";
      userPayload.companyProfile = {
        name: companyName || "",
        logoUrl: companyLogoUrl || "",
        description: companyDescription || "",
        website: companyWebsite || "",
        location: companyLocation || "",
      };
    }

    const user = await User.create(userPayload);
    
    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp, name);
    if (!emailResult.success) {
      console.error('Email send failed:', emailResult.error);
      return res.status(500).json({ message: 'Failed to send verification email', error: emailResult.error });
    }
    
    res.json({ 
      message: 'Signup successful. Please check your email for OTP.',
      email: user.email,
      requiresVerification: true
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message });
  }
};

export const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    
    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }
    
    if (!user.emailVerificationOTP || user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }
    
    if (user.emailVerificationOTP !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    user.isEmailVerified = true;
    user.emailVerificationOTP = undefined;
    user.otpExpires = undefined;
    await user.save();
    
    const token = jwt.sign({ id: user._id }, getJwtSecret(), { expiresIn: '7d' });
    res.json({ message: 'Email verified successfully', user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const resendOTP = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    
    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }
    
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    
    user.emailVerificationOTP = otp;
    user.otpExpires = otpExpires;
    await user.save();
    
    const emailResult = await sendOTPEmail(email, otp, user.name);
    if (!emailResult.success) {
      console.error('Email send failed:', emailResult.error);
      return res.status(500).json({ message: 'Failed to send verification email', error: emailResult.error });
    }
    
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
    if (!user.password) {
      return res.status(400).json({ message: 'Please use Google Sign-In for this account' });
    }
    
    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });
    
    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({ 
        message: 'Email not verified. Please verify your email.',
        requiresVerification: true,
        email: user.email
      });
    }
    
    const token = jwt.sign({ id: user._id }, getJwtSecret(), { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ message: 'If the email exists, a reset OTP has been sent.' });
    }
    
    if (!user.password) {
      return res.status(400).json({ message: 'This account uses Google Sign-In. Password reset is not available.' });
    }
    
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = otpExpires;
    await user.save();
    
    const emailResult = await sendPasswordResetEmail(email, otp, user.name);
    if (!emailResult.success) {
      return res.status(500).json({ message: 'Failed to send reset email' });
    }
    
    res.json({ message: 'If the email exists, a reset OTP has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid request' });
    
    if (!user.resetPasswordOTP || user.resetPasswordOTPExpires < new Date()) {
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }
    
    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    await user.save();
    
    res.json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const googleCallback = (req, res) => {
  // after passport sets req.user, issue a JWT and redirect or respond
  const user = req.user;
  if (!user) return res.status(400).json({ message: 'No user from OAuth provider' });
  const token = jwt.sign({ id: user._id }, getJwtSecret(), { expiresIn: '7d' });
  // For simplicity, return token as JSON (in production you may redirect to frontend)
  res.json({ user, token });
};
