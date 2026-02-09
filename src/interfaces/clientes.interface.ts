export interface createCliente {
    nombre: string;
    rfc: string;
    curp: string;
    regimenFiscal: string;
    archivoFiel?: File;
    sucursales?: createSucursal[];
}

export interface createSucursal {
    uuid?: string;
    nombre: string;
    calle: string;
    numeroExterior?: string;
    numeroInterior?: string;
    colonia: string;
    municipio: string;
    estado: string;
    codigoPostal: string;
    telefono: string;
    email: string;
    clienteId?: bigint;
} 
