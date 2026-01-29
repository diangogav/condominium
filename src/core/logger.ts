import pino from 'pino';
import { Config } from './config';

export const logger = pino({
    level: Config.ENV === 'development' ? 'debug' : 'info',
    transport: Config.ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    } : undefined
});
