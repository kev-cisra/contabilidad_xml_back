import express from 'express';
import cors from 'cors';

export const app = express();

const corsOptions = {
    origin: process.env.NODE_CORS_ACCESS ? JSON.parse(process.env.NODE_CORS_ACCESS) : '*',
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}

app.use(cors(corsOptions));

app.use(express.json());

app.get('/', (req, res) => {
    res.send('API is running');
});