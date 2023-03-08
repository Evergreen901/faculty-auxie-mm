import express, { Express, Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ApiServerWorkplan } from './config/apiserverConfiguration';
import winston from 'winston';

export class ApiServer {
    constructor(logger: winston.Logger, httpPort: Number, controllers: Array<express.Router>) {
        this.logger = logger;
        this.httpPort = httpPort;

        // instate express with json and urlencoded parsers
        this.app = express();
        this.app.use(cors());
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: false}));

        // health endpoint
        this.app.get("/health", this.healthCheck);

        // add multiple controllers
        controllers.forEach((controller) => {
            this.app.use('/', controller);
        });

        //add error handler
        this.app.use(this.errorHandler);
    
        // start server
        this.app.listen(this.httpPort, () => {
            this.logger.info(`Server started on port ${this.httpPort}`)
        });
    }

    private readonly logger: winston.Logger;
    private readonly httpPort: Number;
    private app: Express;
    private apiKeys = new Map<String, ApiServerWorkplan>();

    private errorHandler: ErrorRequestHandler = 
        (err: any, req: Request, res: Response, next: NextFunction) => {
            res.status(err.status || 500).json({error: {message: err.message}});
        }

    private healthCheck: RequestHandler =
        (req: Request, res: Response, next: NextFunction) => {
            res.sendStatus(200);
        }

    addApiKey = (apiKey: String, config: ApiServerWorkplan) => {
        this.logger.info(`Api key added: ${apiKey}`);
        this.apiKeys.set(apiKey, config);
    }

    invalidate = () => {
        this.logger.info(`Api keys removed`);
        this.apiKeys.clear();
    }
}
