import { NextFunction, Request, Response } from 'express';
import { hashToken } from '../utils/token';
import { prisma } from '../config/prisma';

// src/middleware/auth.middleware.ts
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    console.log('-------------------- Token recibido en el middleware de autenticación:', token  );
    console.log('-------------------- Encabezado de autorización completo:', authHeader);
    
    if (!token) {
        return res.status(401).json({ message: 'Token requerido' });
    }
    
    const secretHash = hashToken(token);
    const tokenRecord = await prisma.token.findFirst({
        where: {
            secretHash: token,
            type: 'session',
            expiresAt: { gt: new Date() }
        },
        include: { usuario: true }
    });
    
    if (!tokenRecord) {
        return res.status(401).json({ message: 'Token inválido' });
    }
    
    // Adjuntar usuario al request
    req.user = tokenRecord.usuario;
    next();
}