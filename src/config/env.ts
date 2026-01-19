import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = ['DATABASE_URL'] as const;

requiredEnvVars.forEach((name) => {
    if (!process.env[name]) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
})

export const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT ? Number(process.env.PORT) : 3120,
    databaseUrl: process.env.DATABASE_URL as string,
}