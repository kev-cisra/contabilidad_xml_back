import path from 'path';
import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { saveAppFile, type AppFileInput } from '../utils/file-storage';
import type { createSucursal } from '../interfaces/clientes.interface';

type RequestWithFile = Request & { file?: AppFileInput };
type RequestWithUser = Request & { user?: { empresaId: string | number } };

type CreateClienteBody = {
    nombre?: string;
    rfc?: string;
    curp?: string;
    regimenFiscal?: string;
    sucursales?: unknown;
    fielPassword?: string;
};

const parseSucursales = (value: unknown) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (Array.isArray(value)) return value as createSucursal[];
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
            throw new Error('El campo sucursales debe ser un arreglo.');
        }
        return parsed as createSucursal[];
    }
    throw new Error('El campo sucursales debe ser un arreglo o una cadena JSON.');
};

export class ClientesController {
    // GET /clientes
    static async getClientes(req: RequestWithUser, res: Response) {
        try {
            const clientes = await prisma.clientes.findMany({
                where: {
                    deletedAt: null,
                    empresaId: req.user?.empresaId || undefined
                },
                orderBy: {
                    nombre: 'asc'
                },
                include: {
                    sucursales: {
                        where: {
                            deletedAt: null
                        },
                        select: {
                            uuid: true,
                            nombre: true,
                            calle: true,
                            numeroExterior: true,
                            numeroInterior: true,
                            colonia: true,
                            municipio: true,
                            estado: true,
                            codigoPostal: true,
                            telefono: true,
                            email: true
                        }
                    },
                    // Relación con el catálogo de régimen fiscal (campo "regimen" en el schema)
                    regimen: {
                        select: {
                            uuid: true,
                            clave: true,
                            descripcion: true
                        }
                    }
                }
            });

            return res.status(200).json({ message: 'ok', datos: clientes });
        } catch (error) {
            console.error('Error al obtener clientes:', error);
            res.status(500).json({ message: 'Error interno del servidor' });
        }
    }

     //GET /clientes/direccion/:cp
    static async obtenerDireccionasync (req: Request, res: Response) {
        try {
            const { cp } = req.params
            const apiKey = process.env.DIRECCION_API // Tu API key del .env
            
            if (!apiKey) {
                return res.status(500).json({ message: 'API key no configurada' })
            }
            
            const response = await fetch(`https://api.tau.com.mx/dipomex/v1/codigo_postal?cp=${cp}`, {
                method: 'GET',
                headers: { 'APIKEY': apiKey }
            })
            
            console.log('Respuesta de la API de direcciones:', response)

            const data = await response.json()
            res.json({ message: 'ok', datos: data })
        } catch (error) {
            res.status(500).json({ message: 'Error al buscar dirección' })
        }
    }

    // GET /clientes/RegimenesFiscales
    static async getRegimenesFiscales(req: Request, res: Response) {
        try {
            const regimenes = await prisma.regimenFiscal.findMany({
                where: {
                    deletedAt: null
                },
                orderBy: {
                    clave: 'asc'
                },
                select: {
                    uuid: true,
                    clave: true,
                    descripcion: true
                }
            });

            return res.status(200).json({ message: 'ok', datos: regimenes });
        } catch (error) {
            console.error('Error al obtener regimenes fiscales:', error);
            res.status(500).json({ message: 'Error interno del servidor' });
        }
    }

    static async createCliente(req: RequestWithUser, res: Response) {
        const { nombre, rfc, curp, regimenFiscal, sucursales, fielPassword } = (req.body ?? {}) as CreateClienteBody;
        const empresaId = req.user?.empresaId;

        if (!empresaId) {
            return res.status(401).json({ message: 'Empresa no encontrada para el usuario autenticado' });
        }

        if (!nombre || !rfc || !regimenFiscal) {
            return res.status(400).json({ message: 'nombre, rfc y regimenFiscal son obligatorios' });
        }

        const getRegimen = await prisma.regimenFiscal.findFirst({
            where: {
                uuid: regimenFiscal,
                deletedAt: null
            }
        });

        // Verificar duplicados por RFC y/o CURP antes de crear (por empresa y no eliminados)
        const existingCliente = await prisma.clientes.findFirst({
            where: {
                empresaId: empresaId as any,
                deletedAt: null,
                OR: [
                    { rfc: rfc.toUpperCase() },
                    ...(curp ? [{ curp: curp.toUpperCase() }] : [])
                ]
            }
        });

        if (existingCliente) {
            const duplicatedFields: string[] = [];
            if (existingCliente.rfc === rfc.toUpperCase()) duplicatedFields.push('RFC');
            if (curp && existingCliente.curp === curp.toUpperCase()) duplicatedFields.push('CURP');

            return res.status(409).json({
                message: `Ya existe un cliente registrado con el mismo ${duplicatedFields.join(' y ')}.`,
                duplicatedFields
            });
        }

        let parsedSucursales: createSucursal[] | undefined;
        try {
            parsedSucursales = parseSucursales(sucursales);
        } catch (error) {
            return res.status(400).json({ message: (error as Error).message });
        }

        const validaciones = [
            { campo: 'nombre', valor: nombre, max: 150 },
            { campo: 'rfc', valor: rfc.toUpperCase(), max: 13 },
            { campo: 'curp', valor: curp ? curp.toUpperCase() : undefined, max: 18 },
            { campo: 'fielPassword', valor: fielPassword, max: 255 }
        ];

        for (const validacion of validaciones) {
            if (validacion.valor && validacion.valor.length > validacion.max) {
                return res.status(400).json({
                    message: `El campo '${validacion.campo}' excede el limite de ${validacion.max} caracteres. Longitud actual: ${validacion.valor.length}`
                });
            }
        }

        try {
            const archivoFiel = (req as RequestWithFile).file;
            let fielPath: string | undefined;
            let fielArchivo: string | undefined;

            if (archivoFiel) {
                const saved = await saveAppFile({
                    file: archivoFiel,
                    subDir: `clientes${path.sep}${empresaId.toString()}`
                });
                fielPath = saved.fileDir;
                fielArchivo = saved.fileName;
            }

            const sucursalesCreate = parsedSucursales?.map((sucursal) => ({
                nombre: sucursal.nombre,
                calle: sucursal.calle,
                numeroExterior: sucursal.numeroExterior,
                numeroInterior: sucursal.numeroInterior,
                colonia: sucursal.colonia,
                municipio: sucursal.municipio,
                estado: sucursal.estado,
                codigoPostal: sucursal.codigoPostal,
                telefono: sucursal.telefono,
                email: sucursal.email,
                empresaId: empresaId
            }));

            if (!getRegimen?.id) {
                return res.status(400).json({ message: 'Régimen fiscal no encontrado' });
            }

            const newCliente = await prisma.clientes.create({
                data: {
                    nombre,
                    rfc: rfc.toUpperCase(),
                    curp: curp ? curp.toUpperCase() : undefined,
                    regimenFiscalId: getRegimen.id,
                    fielPath,
                    fielArchivo,
                    fielPassword: fielPassword || undefined,
                    empresaId,
                    ...(sucursalesCreate && sucursalesCreate.length
                        ? { sucursales: { create: sucursalesCreate } }
                        : {})
                }
            });

            return res.status(201).json({ message: 'El cliente ha sido creado exitosamente', datos: newCliente });
        } catch (error) {
            // Manejo específico de error de constraint único de Prisma
            if ((error as any)?.code === 'P2002') {
                console.error('Error de duplicidad al crear cliente:', error);
                return res.status(409).json({
                    message: 'Ya existe un cliente con datos únicos duplicados (RFC o CURP).',
                    code: 'CLIENTE_DUPLICADO'
                });
            }

            console.error('Error al crear cliente:', error);
            res.status(500).json({ message: 'Error interno del servidor' });
        }
    }

    static async updateCliente(req: Request, res: Response) {
         try {
             const { uuid } = req.params;
             const { nombre, rfc, curp, regimenFiscal, sucursales } = (req.body || {}) as CreateClienteBody;

             // Validar que el cliente exista
             const clienteExistente = await prisma.clientes.findUnique({
                 where: { uuid: Array.isArray(uuid) ? uuid[0] : uuid },
                 include: {
                     sucursales: {
                         where: {
                             deletedAt: null
                         },
                         select: {
                             uuid: true,
                             nombre: true,
                             calle: true,
                             numeroExterior: true,
                             numeroInterior: true,
                             colonia: true,
                             municipio: true,
                             estado: true,
                             codigoPostal: true,
                             telefono: true,
                             email: true
                         }
                     },
                     // Relación con el catálogo de régimen fiscal (campo "regimen" en el schema)
                     regimen: {
                         select: {
                             uuid: true,
                             clave: true,
                             descripcion: true
                         }
                     }
                 }
             });

             if (!clienteExistente || clienteExistente.deletedAt) {
                 return res.status(404).json({ message: 'Cliente no encontrado' });
             }

             // Aquí iría la lógica para actualizar el cliente y sus sucursales
             clienteExistente.nombre = nombre ?? clienteExistente.nombre;
             clienteExistente.rfc = rfc ?? clienteExistente.rfc;
             clienteExistente.curp = curp ?? clienteExistente.curp;

             if (regimenFiscal) {
                 const getRegimen = await prisma.regimenFiscal.findFirst({
                     where: {
                         uuid: regimenFiscal,
                         deletedAt: null
                     }
                 });

                 if (!getRegimen?.id) {
                     return res.status(400).json({ message: 'Régimen fiscal no encontrado' });
                 }

                 clienteExistente.regimenFiscalId = getRegimen.id;
             }

            // Lógica para actualizar sucursales (esto es solo un ejemplo, la lógica real dependerá de cómo quieras manejar las actualizaciones)
             if (sucursales && Array.isArray(sucursales)) {
                 for (const sucursal of sucursales) {
                     if (sucursal.uuid) {
                         // Actualizar sucursal existente
                         await prisma.sucursales.update({
                             where: { uuid: sucursal.uuid },
                             data: {
                                 nombre: sucursal.nombre,
                                 calle: sucursal.calle,
                                 numeroExterior: sucursal.numeroExterior,
                                 numeroInterior: sucursal.numeroInterior,
                                 colonia: sucursal.colonia,
                                 municipio: sucursal.municipio,
                                 estado: sucursal.estado,
                                 codigoPostal: sucursal.codigoPostal,
                                 telefono: sucursal.telefono,
                                 email: sucursal.email
                             }
                         });
                     } else {
                         // Crear nueva sucursal
                         await prisma.sucursales.create({
                             data: {
                                 nombre: sucursal.nombre,
                                 calle: sucursal.calle,
                                 numeroExterior: sucursal.numeroExterior,
                                 numeroInterior: sucursal.numeroInterior,
                                 colonia: sucursal.colonia,
                                 municipio: sucursal.municipio,
                                 estado: sucursal.estado,
                                 codigoPostal: sucursal.codigoPostal,
                                 telefono: sucursal.telefono,
                                 email: sucursal.email,
                                 clienteId: clienteExistente.id,
                                 empresaId: clienteExistente.empresaId
                             }
                         });
                     }
                 }
             }

            // Manejo de archivo FIEL opcional al actualizar
            const archivoFiel = (req as RequestWithFile).file;
            let fielPath = clienteExistente.fielPath ?? undefined;
            let fielArchivo = clienteExistente.fielArchivo ?? undefined;

            if (archivoFiel) {
                const saved = await saveAppFile({
                    file: archivoFiel,
                    subDir: `clientes${path.sep}${clienteExistente.empresaId.toString()}`
                });
                fielPath = saved.fileDir;
                fielArchivo = saved.fileName;
            }

             await prisma.clientes.update({
                 where: { uuid: Array.isArray(uuid) ? uuid[0] : uuid },
                 data: {
                     nombre: clienteExistente.nombre,
                     rfc: clienteExistente.rfc?.toUpperCase(),
                     curp: clienteExistente.curp ? clienteExistente.curp.toUpperCase() : undefined,
                     regimenFiscalId: clienteExistente.regimenFiscalId,
                     fielPath,
                     fielArchivo
                 }
             });

             res.status(200).json({ message: 'Cliente actualizado exitosamente' });
         } catch (error) {
             console.error('Error al actualizar cliente:', error);
             res.status(500).json({ message: 'Error interno del servidor' });
         }
    }

    static async deleteCliente(req: Request, res: Response) {
        // Lógica para eliminar cliente (soft delete)
        const { uuid } = req.params;

        try {
            const clienteExistente = await prisma.clientes.findUnique({
                where: { uuid: Array.isArray(uuid) ? uuid[0] : uuid }
            });

            if (!clienteExistente || clienteExistente.deletedAt) {
                return res.status(404).json({ message: 'Cliente no encontrado' });
            }

            await prisma.clientes.update({
                where: { uuid: Array.isArray(uuid) ? uuid[0] : uuid },
                data: { deletedAt: new Date() }
            });

            await prisma.sucursales.updateMany({
                where: { clienteId: clienteExistente.id },
                data: { deletedAt: new Date() }
            });

            res.status(200).json({ message: 'Cliente eliminado exitosamente' });
        } catch (error) {
            console.error('Error al eliminar cliente:', error);
            res.status(500).json({ message: 'Error interno del servidor' });
        }
    }
}
