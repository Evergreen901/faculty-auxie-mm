import * as winston from 'winston';

const { combine, timestamp } = winston.format;

export class LoggingService {

    logger : winston.Logger;
    private static instance: LoggingService;
    private constructor(moduleName: string) {
        this.logger = winston.createLogger({
            levels: winston.config.syslog.levels,
            format:  combine(timestamp(), winston.format.json()),
            defaultMeta: { service: moduleName },
            handleExceptions: true,
            transports: [
                new winston.transports.File({ filename: `logs/${moduleName}-logfile.log`, level:'debug' }),
                new winston.transports.Console({ format: winston.format.simple(), level:'debug' })
            ],
        });
    }

    // / Used for tests only - move it into tests project
    public static DummyLogger = winston.createLogger({
    });
    public static getLogger(moduleName: string) :winston.Logger {
        if (!LoggingService.instance) {
            this.instance = new LoggingService(moduleName);
            process.on('uncaughtException', (err) => {
                console.log(err);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                this.instance.logger.log('error', 'Fatal uncaught exception crashed cluster', err, function(_err, _level, _msg, _meta) {
                    process.exit(1);
                });
            });
        }

        return this.instance.logger;
    }
}
