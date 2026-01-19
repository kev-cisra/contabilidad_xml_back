import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);
const SALT_ROUNDS = 16;
const KEY_LENGTH = 64;
const ITERATIONS = 100000;
const DIGEST = 'sha512';

/**
 * Cifra una contraseña usando PBKDF2
 * @param password - Contraseña en texto plano
 * @returns Contraseña cifrada en formato: salt:hash
 */
export function hashPassword(password: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
        try {
            const salt = randomBytes(SALT_ROUNDS).toString('hex');
            const derivedKey = await scrypt(password, salt, KEY_LENGTH) as Buffer;
            resolve(`${salt}:${derivedKey.toString('hex')}`);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Valida una contraseña contra su hash
 * @param password - Contraseña en texto plano
 * @param hashedPassword - Contraseña cifrada (formato: salt:hash)
 * @returns true si la contraseña es correcta
 */
export function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
        try {
            const [salt, key] = hashedPassword.split(':');
            const derivedKey = await scrypt(password, salt, KEY_LENGTH) as Buffer;
            const originalKey = Buffer.from(key, 'hex');
            const isMatch = timingSafeEqual(derivedKey, originalKey);
            resolve(isMatch);
        } catch (error) {
            reject(error);
        }
    });
}