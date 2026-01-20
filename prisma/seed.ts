import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { hashPassword } from '../utils/password.js';

// Parsear la URL de conexión manualmente
const dbUrl = new URL(process.env.DATABASE_URL!);

const pool = new Pool({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port),
    database: dbUrl.pathname.slice(1),
    user: dbUrl.username,
    password: dbUrl.password,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
});

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
            rolePermissions: {
                create: permissions.map(p => ({ permissionId: p.id }))
            }
        },
        include: {
            rolePermissions: {
                include: {
                    permission: true
                }
            }
        }
    });

    console.log(`Rol creado: ${adminRole.name} con ${adminRole.rolePermissions.length} permisos`);

    // Crear usuario admin
    const adminUser = await prisma.usuario.create({
        data: {
            nombre: 'Admin',
            email: 'admin@admin.com',
            password: await hashPassword('admin123'),
            updatedAt: new Date(),
            usuarioRoles: {
                create: { roleId: adminRole.id }
            }
        },
        include: {
            usuarioRoles: {
                include: {
                    role: {
                        include: {
                            rolePermissions: {
                                include: {
                                    permission: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    console.log('Usuario admin creado:', {
        email: adminUser.email,
        nombre: adminUser.nombre,
        roles: adminUser.usuarioRoles.map(ur => ur.role.name),
        permisos: adminUser.usuarioRoles.flatMap(ur => 
            ur.role.rolePermissions.map(rp => rp.permission.name)
        )
    });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });