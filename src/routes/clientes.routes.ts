import e, {  Router } from 'express';
import multer from 'multer';
import { ClientesController } from '../controllers/clientes.controller';
import { authMiddleware } from "../middleware/auth.middleware";

const clientesRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

clientesRouter.get('/', authMiddleware, ClientesController.getClientes);

// Crear cliente con archivo FIEL opcional (campo de archivo: "archivo")
clientesRouter.post('/', authMiddleware, upload.single('archivo'), ClientesController.createCliente);

clientesRouter.get('/direccion/:cp', authMiddleware, ClientesController.obtenerDireccionasync);

clientesRouter.get('/RegimenesFiscales', authMiddleware, ClientesController.getRegimenesFiscales);

// Actualizar cliente con archivo FIEL opcional (campo de archivo: "archivo")
clientesRouter.put('/:uuid', authMiddleware, upload.single('archivo'), ClientesController.updateCliente);

clientesRouter.delete('/:uuid', authMiddleware, ClientesController.deleteCliente);

export { clientesRouter };