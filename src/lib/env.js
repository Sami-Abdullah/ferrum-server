import dotenv from 'dotenv';
dotenv.config();

console.log('CWD:', process.cwd());
console.log('MONGODB_URL loaded:', process.env.MONGODB_URL ? 'yes' : 'NO');