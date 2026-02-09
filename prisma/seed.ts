import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from '../src/utils/password';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
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

    console.log('Cargando catálogo de regímenes fiscales...');
    const regimenesFiscalesData = [
        { clave: '601', descripcion: 'General de Ley Personas Morales', tipoPersona: 'moral' },
        { clave: '603', descripcion: 'Personas Morales con Fines no Lucrativos', tipoPersona: 'moral' },
        { clave: '605', descripcion: 'Sueldos y Salarios e Ingresos Asimilados a Salarios', tipoPersona: 'fisica' },
        { clave: '606', descripcion: 'Arrendamiento', tipoPersona: 'fisica' },
        { clave: '607', descripcion: 'Régimen de Enajenación o Adquisición de Bienes', tipoPersona: 'fisica' },
        { clave: '608', descripcion: 'Demás ingresos', tipoPersona: 'fisica' },
        { clave: '610', descripcion: 'Residentes en el Extranjero sin Establecimiento Permanente en México', tipoPersona: 'ambas' },
        { clave: '611', descripcion: 'Ingresos por Dividendos (socios y accionistas)', tipoPersona: 'fisica' },
        { clave: '612', descripcion: 'Personas Físicas con Actividades Empresariales y Profesionales', tipoPersona: 'fisica' },
        { clave: '614', descripcion: 'Ingresos por intereses', tipoPersona: 'fisica' },
        { clave: '615', descripcion: 'Régimen de los ingresos por obtención de premios', tipoPersona: 'fisica' },
        { clave: '616', descripcion: 'Sin obligaciones fiscales', tipoPersona: 'fisica' },
        { clave: '620', descripcion: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos', tipoPersona: 'moral' },
        { clave: '621', descripcion: 'Incorporación Fiscal', tipoPersona: 'fisica' },
        { clave: '622', descripcion: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', tipoPersona: 'moral' },
        { clave: '623', descripcion: 'Opcional para Grupos de Sociedades', tipoPersona: 'moral' },
        { clave: '624', descripcion: 'Coordinados', tipoPersona: 'moral' },
        { clave: '625', descripcion: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', tipoPersona: 'fisica' },
        { clave: '626', descripcion: 'Régimen Simplificado de Confianza', tipoPersona: 'ambas' },
    ] as const;

    const regimenesUpsert = await Promise.all(
        regimenesFiscalesData.map((r) =>
            prisma.regimenFiscal.upsert({
                where: { clave: r.clave },
                update: {
                    descripcion: r.descripcion,
                    tipoPersona: r.tipoPersona as any,
                    deletedAt: null,
                },
                create: {
                    clave: r.clave,
                    descripcion: r.descripcion,
                    tipoPersona: r.tipoPersona as any,
                },
            })
        )
    );

    console.log(`✅ Regímenes fiscales cargados/actualizados: ${regimenesUpsert.length}`);

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
                ruta: '/dashboard',
                empresaId: empresa.id
            }
        }),
        prisma.menus.create( {
            data: {
                nombre: 'Clientes',
                orden: 2,
                icono: 'UsergroupAddOutlined',
                ruta: '/clientes',
                empresaId: empresa.id
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
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });