import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { admin, emailOTP } from 'better-auth/plugins';
import mongoose from 'mongoose';
import { sendEmail } from './mailer.js';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.CLIENT_URL],
  database: mongodbAdapter(mongoose.connection),
  advanced: {
    useSecureCookies: true,
    defaultCookieAttributes: {
      sameSite: 'none',
      secure: true,
      partitioned: true,
    },
  },
  plugins: [
    admin({ defaultRole: 'customer' }),

    emailOTP({
      otpLength: 6,
      expiresIn: 600, // 10 minutes, per your doc
      sendVerificationOnSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type === 'email-verification') {
          await sendEmail({
            to: email,
            subject: 'Verify your Ferrum account',
            html: `
        <h2>Verify your email</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 4px;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
      `,
          });
        }
      },
    }),
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, token }) => {
      const resetUrl = `${process.env.BETTER_AUTH_URL}/api/auth/reset-password/${token}?callbackURL=${process.env.CLIENT_URL}/reset-password`;

      await sendEmail({
        to: user.email,
        subject: 'Reset your Ferrum password',
        html: `
      <h2>Reset your password</h2>
      <p>Hi ${user.name},</p>
      <p>Click the link below to reset your password. This link expires in 15 minutes.</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
      });
    },
    resetPasswordTokenExpiresIn: 900, // 15 minutes, per your doc's FR-05
  },
  emailVerification: {
    autoSignInAfterVerification: true,
  },
  user: {
    additionalFields: {
      phone: { type: 'string', required: false, input: true, returned: true },
      address: { type: 'string', required: false, input: true, returned: true },
      wishlist: {
        type: 'string',
        required: false,
        input: true,
        returned: true,
        defaultValue: '[]',
      },
    },
  },
});