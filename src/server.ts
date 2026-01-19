import { app } from './app';
import { connectPrisma } from './config/prisma';
import { env } from './config/env';

async function bootstrap() {
    await connectPrisma();

    app.listen(env.port, () => {
        console.log(`Server is running on port ${env.port} in ${env.nodeEnv} mode.`);
    });
}

bootstrap().catch((error) => {
    console.error('Error during server bootstrap:', error);
    process.exit(1);
});