import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/password.js';

const prisma = new PrismaClient();

async function main() {
    // Limpiar datos existentes
    await prisma.token.deleteMany();
    await prisma.usuario.deleteMany({});
    await prisma.role.deleteMany();
    await prisma.permission.deleteMany();
    
    // Crear permisos
    const permissions = await Promise.all([
        prisma.permission.create({
            data: {
                name: 'CREATE_USER',
                description: 'Permite crear usuarios',
            }
        }),
        prisma.permission.create({
            data: {
                name: 'READ_USER',
                description: 'Permite leer usuarios',
            }
        }),
        prisma.permission.create({
            data: {
                name: 'UPDATE_USER',
                description: 'Permite actualizar usuarios',
            }
        }),
        prisma.permission.create({
            data: {
                name: 'DELETE_USER',
                description: 'Permite eliminar usuarios',
            }
        }),
        prisma.permission.create({
            data: {
                name: 'FULL_ACCESS',
                description: 'Acceso completo a todos los recursos',
            }
        })
    ]);

    console.log(`${permissions.length} permisos creados`);

    // Crear rol admin con todos los permisos
    const adminRole = await prisma.role.create({
        data: {
            name: 'ADMIN',
            description: 'Rol de administrador con permisos completos',
            permissions: {
                connect: permissions.map(p => ({ id: p.id }))
            }
        },
        include: {
            permissions: true
        }
    });

    console.log(`Rol creado: ${adminRole.name} con ${adminRole.permissions.length} permisos`);

    // Crear usuario admin
    const adminUser = await prisma.usuario.create({
        data: {
            nombre: 'Admin',
            email: 'admin@admin.com',
            password: hashPassword('admin123'),
            rol: 'ADMIN',
            roles: {
                connect: { id: adminRole.id }
            }
        },
        include: {
            roles: {
                include: {
                    permissions: true
                }
            }
        }
    });

    console.log('Usuario admin creado:', {
        email: adminUser.email,
        nombre: adminUser.nombre,
        roles: adminUser.roles.map(r => r.name),
        permisos: adminUser.roles.flatMap(r => r.permissions.map(p => p.name))
    });
}

main()
    .catch((e) => {
        console.error('Error en seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });