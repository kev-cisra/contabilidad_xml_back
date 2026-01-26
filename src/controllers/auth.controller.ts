import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { LoginRequestBody } from '../interfaces/login.interface';
import { generateSessionToken, hashToken } from '../utils/token';
import { randomUUID } from 'crypto';


export class AuthController {
    // POST /auth/login
    static async login(req: Request, res: Response) {
        const { email, password } = (req.body ?? {}) as LoginRequestBody;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'El email y la contraseña son obligatorios' });
        }

        try {
            // Busca al usuario por el email
            const user = await prisma.usuario.findUnique({ 
                where: { email: email },
                select: {
                    id: true,
                    password: true
                } 
            });

            if (!user) {
                return res.status(401).json({ message: 'Credenciales inválidas, contraseña incorrecta' });
            }

            // Verifica la contraseña
            const isPasswordValid = await verifyPassword(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Credenciales inválidas, contraseña incorrecta' });
            }

            // Obtenemos la informacion del usuario
            const safeUser = await prisma.usuario.findUnique({
                where: {
                    id: user.id
                },
                select: {
                    uuid: true,
                    email: true,
                    nombre: true,
                }
            })

            // Consulta si ya existe un token de sesión válido para el usuario
            const existingToken = await prisma.token.findFirst({
                where: {
                    usuarioId: user.id,
                    type: 'session',
                    expiresAt: { gt: new Date() }
                }
            });
            if (existingToken && existingToken.expiresAt > new Date()) {
                return res.status(200).json({ 
                    message: 'Login exitoso',
                    user: safeUser,
                    token: { 
                        value: existingToken.secretHash, 
                        expiresAt: existingToken.expiresAt.toISOString() 
                    } 
                });
            }else {
                // Elimina los tokens expirados
                await prisma.token.deleteMany({
                    where: {
                        usuarioId: user.id,
                        type: 'session',
                        expiresAt: { lte: new Date() }
                    }
                });
            }

            const { token, secretHash, expiresAt } = generateSessionToken();

            // Guarda el token de sesión en la base de datos
            await prisma.token.create({
                data: {
                    uuid: randomUUID(),
                    secretHash: secretHash,
                    type: 'session',
                    usuarioId: user.id,
                    expiresAt: expiresAt
                }
            });

            const tokenRes = {
                value: token,
                expiresAt: expiresAt.toISOString()
            }

            return res.status(200).json({ message: 'Login exitoso', user: safeUser, token: tokenRes });
        } catch (error) {
            console.error('Error al buscar el usuario:', error);
            return res.status(500).json({ message: 'Error interno del servidor' });
        }
    }

    // POST /auth/logout
    static async logout(req: Request, res: Response) {
        // Asumiendo que el token de sesión se envía en el encabezado Authorization
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token de sesión requerido' });
        }
        try {
            const secretHash = hashToken(token);
            await prisma.token.deleteMany({
                where: {
                    secretHash: secretHash,
                    type: 'session'
                }
            });
            return res.status(200).json({ message: 'Logout exitoso' });
        } catch (error) {
            console.error('Error al eliminar el token de sesión:', error);
            return res.status(500).json({ message: 'Error interno del servidor' });
        }
    }

    // POST /auth/refresh-token
    static async refreshToken(req: Request, res: Response) {
        // Implementar la lógica para refrescar el token de sesión si es necesario
        return res.status(501).json({ message: 'No implementado' });
    }

    // POST /auth/menus
    static async getUserMenus(req: Request, res: Response) {
        
        return res.status(501).json({ message: 'No implementado' });
    }
}