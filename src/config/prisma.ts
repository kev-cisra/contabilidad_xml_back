import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Validar que DATABASE_URL esté definido
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no está definido en las variables de entorno');
}

// Parsear la URL de conexión manualmente
const dbUrl = new URL(process.env.DATABASE_URL);

const pool = new Pool({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port),
    database: dbUrl.pathname.slice(1),
    user: dbUrl.username,
    password: dbUrl.password,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
    adapter,
    log: ['query', 'info', 'warn', 'error'],
});

export async function connectPrisma() {
    try {
        await prisma.$connect();
        console.log('Connected to the database successfully.');
    } catch (error) {
        console.error('Error connecting to the database:', error);
        process.exit(1);
    }
}

export async function disconnectPrisma(): Promise<void> {
    try {
        await prisma.$disconnect();
        console.log('Disconnected from the database successfully.');
    } catch (error) {
        console.error('Error disconnecting from the database:', error);
        process.exit(1);
    }
}