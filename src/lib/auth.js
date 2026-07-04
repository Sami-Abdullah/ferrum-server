import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { admin } from 'better-auth/plugins';
import mongoose from 'mongoose';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.CLIENT_URL],
  database: mongodbAdapter(mongoose.connection),
  plugins: [admin({ defaultRole: 'customer' })],
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      phone: { type: 'string', required: false },
      address: { type: 'string', required: false },
    },
  },
});