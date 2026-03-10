import 'dotenv/config';
import { PrismaClient, ModuleCode, SubscriptionStatus, TipoPersona } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PermissionCatalog } from '@contabilidad/shared-rules';
import { hashPassword } from '../src/utils/password';

// NOTE:
// - Este seed asume el schema actualizado (multi-tenant + emisores + mÃƒÆ’Ã‚Â³dulos + RBAC + auditorÃƒÆ’Ã‚Â­a).
// - "empresas" = tenant (despacho/contador)
// - Sucursales pertenecen al emisor.
// - moduleCatalog es global (no se borra; se hace upsert).

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['info', 'warn', 'error'],
});

async function main() {
  console.log('ÃƒÂ°Ã…Â¸Ã…â€™Ã‚Â± Iniciando seed...');

  // =========================================================
  // Limpieza (ordenada por dependencias)
  // =========================================================
  console.log('ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â¹ Limpiando datos existentes...');
  await prisma.auditLog.deleteMany();
  await prisma.token.deleteMany();

  // RBAC / mÃƒÆ’Ã‚Â³dulos por usuario
  await prisma.usuarioModulo.deleteMany();
  await prisma.usuarioRole.deleteMany();
  await prisma.rolePermission.deleteMany();

  // FacturaciÃƒÆ’Ã‚Â³n / emisores
  await prisma.cfdiInvoiceItem.deleteMany();
  await prisma.cfdiInvoice.deleteMany();
  await prisma.facturapiProductTax.deleteMany();
  await prisma.facturapiProduct.deleteMany();
  await prisma.facturapiTaxabilityCatalog.deleteMany();
  await prisma.facturapiCertificate.deleteMany();
  await prisma.facturapiApiKey.deleteMany();
  await prisma.facturapiOrganization.deleteMany();
  await prisma.sucursales.deleteMany();
  await prisma.receptor.deleteMany();
  await prisma.emisor.deleteMany();

  // Suscripciones
  await prisma.subscriptionPayment.deleteMany();
  await prisma.tenantModule.deleteMany();

  // Config tenant
  await prisma.menus.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.empresas.deleteMany();

  console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Limpieza completada');

  // =========================================================
  // CatÃƒÆ’Ã‚Â¡logo de regÃƒÆ’Ã‚Â­menes fiscales (upsert)
  // =========================================================
  console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â¡ Cargando catÃƒÆ’Ã‚Â¡logo de regÃƒÆ’Ã‚Â­menes fiscales...');
  const regimenesFiscalesData = [
    { clave: '601', descripcion: 'General de Ley Personas Morales', tipoPersona: 'moral' },
    { clave: '603', descripcion: 'Personas Morales con Fines no Lucrativos', tipoPersona: 'moral' },
    { clave: '605', descripcion: 'Sueldos y Salarios e Ingresos Asimilados a Salarios', tipoPersona: 'fisica' },
    { clave: '606', descripcion: 'Arrendamiento', tipoPersona: 'fisica' },
    { clave: '607', descripcion: 'RÃƒÆ’Ã‚Â©gimen de EnajenaciÃƒÆ’Ã‚Â³n o AdquisiciÃƒÆ’Ã‚Â³n de Bienes', tipoPersona: 'fisica' },
    { clave: '608', descripcion: 'DemÃƒÆ’Ã‚Â¡s ingresos', tipoPersona: 'fisica' },
    { clave: '610', descripcion: 'Residentes en el Extranjero sin Establecimiento Permanente en MÃƒÆ’Ã‚Â©xico', tipoPersona: 'ambas' },
    { clave: '611', descripcion: 'Ingresos por Dividendos (socios y accionistas)', tipoPersona: 'fisica' },
    { clave: '612', descripcion: 'Personas FÃƒÆ’Ã‚Â­sicas con Actividades Empresariales y Profesionales', tipoPersona: 'fisica' },
    { clave: '614', descripcion: 'Ingresos por intereses', tipoPersona: 'fisica' },
    { clave: '615', descripcion: 'RÃƒÆ’Ã‚Â©gimen de los ingresos por obtenciÃƒÆ’Ã‚Â³n de premios', tipoPersona: 'fisica' },
    { clave: '616', descripcion: 'Sin obligaciones fiscales', tipoPersona: 'fisica' },
    { clave: '620', descripcion: 'Sociedades Cooperativas de ProducciÃƒÆ’Ã‚Â³n que optan por diferir sus ingresos', tipoPersona: 'moral' },
    { clave: '621', descripcion: 'IncorporaciÃƒÆ’Ã‚Â³n Fiscal', tipoPersona: 'fisica' },
    { clave: '622', descripcion: 'Actividades AgrÃƒÆ’Ã‚Â­colas, Ganaderas, SilvÃƒÆ’Ã‚Â­colas y Pesqueras', tipoPersona: 'moral' },
    { clave: '623', descripcion: 'Opcional para Grupos de Sociedades', tipoPersona: 'moral' },
    { clave: '624', descripcion: 'Coordinados', tipoPersona: 'moral' },
    { clave: '625', descripcion: 'RÃƒÆ’Ã‚Â©gimen de las Actividades Empresariales con ingresos a travÃƒÆ’Ã‚Â©s de Plataformas TecnolÃƒÆ’Ã‚Â³gicas', tipoPersona: 'fisica' },
    { clave: '626', descripcion: 'RÃƒÆ’Ã‚Â©gimen Simplificado de Confianza', tipoPersona: 'ambas' },
  ] as const;

  await Promise.all(
    regimenesFiscalesData.map((r) =>
      prisma.regimenFiscal.upsert({
        where: { clave: r.clave },
        update: {
          descripcion: r.descripcion,
          tipoPersona: r.tipoPersona as TipoPersona,
          deletedAt: null,
        },
        create: {
          clave: r.clave,
          descripcion: r.descripcion,
          tipoPersona: r.tipoPersona as TipoPersona,
        },
      })
    )
  );

  const regimen601 = await prisma.regimenFiscal.findUnique({ where: { clave: '601' } });
  if (!regimen601) throw new Error('No se encontrÃƒÆ’Ã‚Â³ el rÃƒÆ’Ã‚Â©gimen 601 luego del upsert.');

  // =========================================================
  // Catalogo de taxability (Facturapi)
  // =========================================================
  console.log('Cargando catalogo de taxability...');
  const taxabilityCatalogData = [
    { code: '01', description: 'No objeto de impuesto.' },
    { code: '02', description: 'Si objeto de impuesto.' },
    { code: '03', description: 'Si objeto de impuesto, pero no obligado a desglose.' },
    { code: '04', description: 'Si objeto de impuesto, y no causa impuesto.' },
    { code: '05', description: 'Si objeto de impuesto, IVA credito PODEBI.' },
    { code: '06', description: 'Si objeto de impuesto, no IVA trasladado.' },
    { code: '07', description: 'No traslado de IVA, pero desglose de IEPS.' },
    { code: '08', description: 'No traslado de IVA sin desglose de IEPS.' },
  ] as const;

  await Promise.all(
    taxabilityCatalogData.map((item) =>
      prisma.facturapiTaxabilityCatalog.upsert({
        where: { code: item.code },
        update: {
          description: item.description,
          deletedAt: null,
        },
        create: {
          code: item.code,
          description: item.description,
        },
      })
    )
  );

  console.log('Catalogo de taxability listo');


  // =========================================================
  // CatÃƒÆ’Ã‚Â¡logo global de mÃƒÆ’Ã‚Â³dulos (upsert)
  // =========================================================
  console.log('ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â© Cargando catÃƒÆ’Ã‚Â¡logo global de mÃƒÆ’Ã‚Â³dulos...');
  const modules = [
    {
      code: ModuleCode.facturacion,
      name: 'FacturaciÃƒÆ’Ã‚Â³n CFDI',
      description: 'EmisiÃƒÆ’Ã‚Â³n, cancelaciÃƒÆ’Ã‚Â³n y descarga de CFDI vÃƒÆ’Ã‚Â­a Facturapi.',
    },
    {
      code: ModuleCode.import_xml,
      name: 'ImportaciÃƒÆ’Ã‚Â³n XML',
      description: 'Importa XML (SAT) y conviÃƒÆ’Ã‚Â©rtelos a Excel/PDF u otros formatos.',
    },
    {
      code: ModuleCode.administracion,
      name: 'AdministraciÃƒÆ’Ã‚Â³n',
      description: 'GestiÃƒÆ’Ã‚Â³n de usuarios, roles, permisos y acceso a mÃƒÆ’Ã‚Â³dulos.',
    },
  ] as const;

  const moduleRecords = await Promise.all(
    modules.map((m) =>
      prisma.moduleCatalog.upsert({
        where: { code: m.code },
        update: {
          name: m.name,
          description: m.description,
          isActive: true,
        },
        create: {
          code: m.code,
          name: m.name,
          description: m.description,
          isActive: true,
        },
      })
    )
  );

  const moduleByCode = new Map(moduleRecords.map((m) => [m.code, m]));
  console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ MÃƒÆ’Ã‚Â³dulos listos: ${moduleRecords.length}`);

  // =========================================================
  // Crear empresa (tenant) con suscripciÃƒÆ’Ã‚Â³n base
  // =========================================================
  console.log('ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â¢ Creando empresa (tenant)...');

  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(expires.getMonth() + 1);

  const empresa = await prisma.empresas.create({
    data: {
      nombre: 'Despacho Demo',
      direccion: 'Calle Falsa 123, Ciudad, MX',
      email: 'despacho@demo.com',
      telefono: '5551234567',
      subscriptionStatus: SubscriptionStatus.trial,
      subscriptionLastPaidAt: null,
      subscriptionExpiresAt: expires, // trial de 1 mes (ajusta a tu lÃƒÆ’Ã‚Â³gica real)
      userLimit: 2,
    },
  });

  console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Empresa creada:', empresa.nombre);

  // =========================================================
  // Habilitar mÃƒÆ’Ã‚Â³dulos para el tenant (lo que paga/posee)
  // =========================================================
  console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å“ Habilitando mÃƒÆ’Ã‚Â³dulos del tenant...');
  await prisma.tenantModule.createMany({
    data: [
      { empresaId: empresa.id, moduleId: moduleByCode.get(ModuleCode.facturacion)!.id, isEnabled: true },
      { empresaId: empresa.id, moduleId: moduleByCode.get(ModuleCode.import_xml)!.id, isEnabled: true },
      { empresaId: empresa.id, moduleId: moduleByCode.get(ModuleCode.administracion)!.id, isEnabled: true },
    ],
  });

  // =========================================================
  // Roles y permisos base (por tenant)
  // =========================================================
  console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂºÃ‚Â¡ÃƒÂ¯Ã‚Â¸Ã‚Â Creando roles y permisos base...');

  // Permisos sugeridos (mÃƒÆ’Ã‚Â­nimos y extensibles).
  // Si todavÃƒÆ’Ã‚Â­a no tienes el detalle, esto te da un esqueleto consistente por mÃƒÆ’Ã‚Â³dulos.
  const permissionNames = Object.keys(PermissionCatalog);

  const permissions = await Promise.all(
    permissionNames.map((name) =>
      prisma.permission.upsert({
        where: {
          empresaId_name: {
            empresaId: empresa.id,
            name,
          },
        },
        update: {
          description: name,
          deletedAt: null,
        },
        create: {
          empresaId: empresa.id,
          name,
          description: name,
        }
      })
    )
  );

  const permByName = new Map(permissions.map((p) => [p.name, p]));

  // Roles:
  // - OWNER: acceso completo + administraciÃƒÆ’Ã‚Â³n.
  // - STAFF: acceso operativo (sin administraciÃƒÆ’Ã‚Â³n), se filtra ademÃƒÆ’Ã‚Â¡s por usuarioModulo.
  const ownerRole = await prisma.role.create({
    data: {
      empresaId: empresa.id,
      name: 'OWNER',
      description: 'DueÃƒÆ’Ã‚Â±o del despacho. Puede administrar usuarios, roles y mÃƒÆ’Ã‚Â³dulos.',
      rolePermissions: {
        create: permissions.map((p) => ({ permissionId: p.id })),
      },
    },
  });

  const staffRole = await prisma.role.create({
    data: {
      empresaId: empresa.id,
      name: 'STAFF',
      description: 'Empleado del despacho. Acceso limitado (sin administraciÃƒÆ’Ã‚Â³n).',
      rolePermissions: {
        create: [
          permByName.get('facturacion.read')!,
          permByName.get('facturacion.create_invoice')!,
          permByName.get('facturacion.download')!,
          permByName.get('import_xml.read')!,
          permByName.get('import_xml.import')!,
          permByName.get('import_xml.export')!,
        ].map((p) => ({ permissionId: p.id })),
      },
    },
  });

  console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Roles base creados:', ownerRole.name, staffRole.name);

  // =========================================================
  // Crear usuario owner (1er usuario del tenant)
  // =========================================================
  console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â¤ Creando usuario owner...');
  const ownerUser = await prisma.usuario.create({
    data: {
      nombre: 'Owner Demo',
      email: 'owner@demo.com',
      password: await hashPassword('owner123'),
      empresaId: empresa.id,
      isOwner: true,
      isActive: true,
      usuarioRoles: {
        create: [{ roleId: ownerRole.id }],
      },
      // Por defecto, el owner tiene acceso a todos los mÃƒÆ’Ã‚Â³dulos (si el tenant los tiene).
      usuarioModulos: {
        create: [
          { moduleId: moduleByCode.get(ModuleCode.facturacion)!.id },
          { moduleId: moduleByCode.get(ModuleCode.import_xml)!.id },
          { moduleId: moduleByCode.get(ModuleCode.administracion)!.id },
        ],
      },
    },
  });

  console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Usuario owner creado:', ownerUser.email);

  // =========================================================
  // (Opcional) Crear usuario staff (respeta lÃƒÆ’Ã‚Â­mite base de 2)
  // =========================================================
  console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â¥ Creando usuario staff...');
  const staffUser = await prisma.usuario.create({
    data: {
      nombre: 'Staff Demo',
      email: 'staff@demo.com',
      password: await hashPassword('staff123'),
      empresaId: empresa.id,
      isOwner: false,
      isActive: true,
      usuarioRoles: {
        create: [{ roleId: staffRole.id }],
      },
      // Acceso por mÃƒÆ’Ã‚Â³dulos (solo mÃƒÆ’Ã‚Â³dulos ya comprados por el tenant).
      usuarioModulos: {
        create: [
          { moduleId: moduleByCode.get(ModuleCode.facturacion)!.id },
          { moduleId: moduleByCode.get(ModuleCode.import_xml)!.id },
          // NOTA: staff sin administracion
        ],
      },
    },
  });

  console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Usuario staff creado:', staffUser.email);

  // =========================================================
  // MenÃƒÆ’Ã‚Âºs (por tenant) - ejemplo simple
  // =========================================================
  console.log('ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â­ Creando menÃƒÆ’Ã‚Âºs...');
  const menuSeed = [
    {
      nombre: 'Dashboard',
      orden: 1,
      icono: 'HomeOutlined',
      ruta: '/dashboard',
      empresaId: empresa.id,
    },
    {
      nombre: 'Emisores',
      orden: 2,
      icono: 'UsergroupAddOutlined',
      ruta: '/emisores',
      empresaId: empresa.id,
    },
    {
      nombre: 'Importar XML',
      orden: 3,
      icono: 'SnippetsOutlined',
      ruta: '/import-xml',
      empresaId: empresa.id,
    },
    {
      nombre: 'AdministraciÃƒÆ’Ã‚Â³n',
      orden: 4,
      icono: 'SettingOutlined',
      ruta: '/admin',
      empresaId: empresa.id,
    },
  ];

  await Promise.all(
    menuSeed.map((menu) =>
      prisma.menus.upsert({
        where: { nombre: menu.nombre },
        update: {
          orden: menu.orden,
          icono: menu.icono,
          ruta: menu.ruta,
          empresaId: menu.empresaId,
          deletedAt: null,
        },
        create: menu,
      })
    )
  );

  // =========================================================
  // Crear emisor demo (RFC) + sucursal + receptor
  // =========================================================
  console.log('ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â¾ Creando emisor demo + sucursal + receptor...');
  const emisor = await prisma.emisor.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Cliente Emisor Demo',
      razonSocial: 'CLIENTE EMISOR DEMO SA DE CV',
      rfc: 'AAA010101AAA',
      regimenFiscalId: regimen601.id,
      codigoPostal: '01000',
      email: 'emisor@demo.com',
      telefono: '5550000000',
      sucursales: {
        create: [
          {
            nombre: 'Matriz',
            calle: 'Av. Principal',
            numeroExterior: '100',
            colonia: 'Centro',
            municipio: 'Ciudad',
            estado: 'CDMX',
            codigoPostal: '01000',
            email: 'matriz@demo.com',
            telefono: '5550000000',
          },
        ],
      },
      receptores: {
        create: [
          {
            nombre: 'PUBLICO EN GENERAL',
            rfc: 'XAXX010101000',
            email: 'receptor@demo.com',
            usoCfdi: 'G03',
            codigoPostal: '01000',
          },
        ],
      },
    },
    include: { sucursales: true, receptores: true },
  });

  // =========================================================
  // AuditorÃƒÆ’Ã‚Â­a demo
  // =========================================================
  await prisma.auditLog.createMany({
    data: [
      {
        empresaId: empresa.id,
        usuarioId: ownerUser.id,
        module: ModuleCode.administracion,
        action: 'seed.create_tenant',
        entity: 'empresas',
        entityId: empresa.uuid,
        message: 'Seed creÃƒÆ’Ã‚Â³ el tenant demo',
        meta: { userLimit: empresa.userLimit, subscriptionExpiresAt: empresa.subscriptionExpiresAt },
      },
      {
        empresaId: empresa.id,
        usuarioId: ownerUser.id,
        module: ModuleCode.facturacion,
        action: 'seed.create_emisor',
        entity: 'emisor',
        entityId: emisor.uuid,
        message: 'Seed creÃƒÆ’Ã‚Â³ el emisor demo',
        meta: { rfc: emisor.rfc },
      },
    ],
  });

  console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Seed completado exitosamente');
  console.log(`   - Empresa: ${empresa.nombre}`);
  console.log(`   - Usuarios: ${ownerUser.email}, ${staffUser.email} (lÃƒÆ’Ã‚Â­mite: ${empresa.userLimit})`);
  console.log(`   - Emisor: ${emisor.rfc} (${emisor.sucursales.length} sucursal/es, ${emisor.receptores.length} receptor/es)`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Error en seed:', e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });



