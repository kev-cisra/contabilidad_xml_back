import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

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