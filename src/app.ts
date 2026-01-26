import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes';

export const app = express();

const corsOptions = {
    origin: process.env.NODE_CORS_ACCESS ? JSON.parse(process.env.NODE_CORS_ACCESS) : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}

app.use(express.json());
app.use(cors(corsOptions));

app.get('/', (req, res) => {
    res.send('API is running');
});

app.use('/auth', authRouter);

// Middleware de manejo de errores - debe ir al final
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Error de parseo JSON
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
            error: 'JSON malformado',
            message: 'El cuerpo de la solicitud contiene JSON inválido. Por favor verifica la sintaxis.',
            details: err.message
        });
    }

    // Otros errores
    console.error('Error no manejado:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: 'Ha ocurrido un error inesperado'
    });
});