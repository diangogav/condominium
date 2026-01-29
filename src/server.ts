import { app } from './app';
import { Config } from './core/config';
import { logger } from './core/logger';

app.listen(Config.PORT, ({ hostname, port }) => {
    logger.info(`🦊 Elysia is running at ${hostname}:${port}`);
});
