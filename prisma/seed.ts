import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    console.log('Iniciando seed...');
    
    // Limpiar datos existentes
    console.log('Limpiando datos existentes...');
    await prisma.token.deleteMany();
    await prisma.usuario.deleteMany({});
    await prisma.menus.deleteMany();
    await prisma.empresas.deleteMany();
    console.log('Datos limpiados exitosamente');
    // await prisma.role.deleteMany();
    // await prisma.permission.deleteMany();
    
    // Crear permisos
    // const permissions = await Promise.all([
    //     prisma.permission.create({
    //         data: {
    //             name: 'CREATE_USER',
    //             description: 'Permite crear usuarios',
    //         }
    //     }),
    //     prisma.permission.create({
    //         data: {
    //             name: 'READ_USER',
    //             description: 'Permite leer usuarios',
    //         }
    //     }),
    //     prisma.permission.create({
    //         data: {
    //             name: 'UPDATE_USER',
    //             description: 'Permite actualizar usuarios',
    //         }
    //     }),
    //     prisma.permission.create({
    //         data: {
    //             name: 'DELETE_USER',
    //             description: 'Permite eliminar usuarios',
    //         }
    //     }),
    //     prisma.permission.create({
    //         data: {
    //             name: 'FULL_ACCESS',
    //             description: 'Acceso completo a todos los recursos',
    //         }
    //     })
    // ]);

    // console.log(`${permissions.length} permisos creados`);

    // Crear rol admin con todos los permisos
    // const adminRole = await prisma.role.create({
    //     data: {
    //         name: 'ADMIN',
    //         description: 'Rol de administrador con permisos completos',
    //         rolePermissions: {
    //             create: permissions.map(p => ({ permissionId: p.id }))
    //         }
    //     },
    //     include: {
    //         rolePermissions: {
    //             include: {
    //                 permission: true
    //             }
    //         }
    //     }
    // });

    // console.log(`Rol creado: ${adminRole.name} con ${adminRole.rolePermissions.length} permisos`);

    // Crear empresa
    console.log('Creando empresa...');
    const empresa = await prisma.empresas.create({
        data: {
            nombre: 'Empresa Demo',
            direccion: 'Calle Falsa 123, Ciudad, País',
            email: 'empresa@demo.com',
            telefono: '5551234567',
            rfc: 'XAXX010101000',
        }
    });
    console.log('Empresa creada:', empresa.nombre);

    // Crear usuario admin
    console.log('Creando usuario admin...');
    const adminUser = await prisma.usuario.create({
        data: {
            nombre: 'Admin',
            email: 'admin@admin.com',
            password: await hashPassword('admin123'),
            empresaId: empresa.id,
            updatedAt: new Date()
        },
    });
    console.log('Usuario admin creado:', adminUser.email);

    console.log('Creando menús...');
    const menus = await Promise.all([
        prisma.menus.create({ 
            data: {
                nombre: 'Dashboard',
                orden: 1 ,
                icono: 'HomeOutlined',
                ruta: '/dashboard'
            }
        }),
        prisma.menus.create( {
            data: {
                nombre: 'Clientes',
                orden: 2,
                icono: 'UsergroupAddOutlined',
                ruta: '/clientes'
            }
        })
    ]);

    console.log(`✅ Seed completado exitosamente:`);
    console.log(`   - 1 empresa creada`);
    console.log(`   - 1 usuario admin creado (${adminUser.email})`);
    console.log(`   - ${menus.length} menús creados`);
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