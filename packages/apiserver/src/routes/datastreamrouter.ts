import { Request, Response, NextFunction, RequestHandler } from 'express';
import winston from 'winston';
import { RedisClientType } from '@redis/client';
import { GathererConfiguration, WorkPlan, DbSyncConfiguration, DbSyncWorkplan } from '@fg/utils';
import { BaseRouter, DBSYNC_KEY, GATHERER_KEY } from './baserouter';

export class DatastreamRouter extends BaseRouter {
    constructor(logger: winston.Logger, redis: RedisClientType) {
        super(logger, redis);

        // routes for dealing with data streams (gatherer, dbsync)
        this.router.get("/datastream", this.listDatastreams);
        this.router.post("/datastream", this.addDatastream);
        this.router.put("/datastream/:tenant/:exchange", this.editDatastream);
        this.router.delete("/datastream/:tenant/:exchange", this.deleteDatastream);
    }

    private listDatastreams: RequestHandler = 
    async (req: Request, res: Response, next: NextFunction) => {
        const config:GathererConfiguration = await this.loadGathererConfig();

        res.status(200).json(config.workplans);
    }

private addDatastream: RequestHandler = 
    async (req: Request, res: Response, next: NextFunction) => {
        const workplan:WorkPlan = req.body;
        
        const config:GathererConfiguration = await this.loadGathererConfig();

        if (!config.workplans) {
            config.workplans = [];
        }

        for (const plan of config.workplans) {
            if (plan.tenant === workplan.tenant && plan.exchangeId === workplan.exchangeId) {
                next(new Error(`Datastream for tenant ${workplan.tenant} and ${workplan.exchangeId} already exists.`));
                return;
            }
        }

        config.workplans.push(workplan);

        const feedback = await this.redis.set(GATHERER_KEY, JSON.stringify(config, null, 2));

        if (feedback !== 'OK') {
            next(new Error("Could not save redis"));
            return;
        }

        if (await this.syncDbsync(config) !== 'OK') {
            next(new Error("Could not save redis"));
            return;
        }

        res.sendStatus(200);
    }

private editDatastream: RequestHandler = 
    async (req: Request, res: Response, next: NextFunction) => {
        const workplan:WorkPlan = req.body;

        if (req.params.tenant !== workplan.tenant || req.params.exchange !== workplan.exchangeId) {
            next(new Error("Invalid request"));
            return;
        }
        
        const config:GathererConfiguration = await this.loadGathererConfig();

        for (const plan of config.workplans) {
            if (plan.tenant === workplan.tenant && plan.exchangeId === workplan.exchangeId) {
                plan.assetPairs = workplan.assetPairs;
                plan.delayOnFetch = workplan.delayOnFetch;
                plan.dataPoints = workplan.dataPoints;

                const feedback = await this.redis.set(GATHERER_KEY, JSON.stringify(config, null, 2));
                
                if (feedback !== 'OK') {
                    next(new Error("Could not save redis"));
                    return;
                }

                if (await this.syncDbsync(config) !== 'OK') {
                    next(new Error("Could not save redis"));
                    return;
                }
                
                res.sendStatus(200);
                return;
            }
        }
        
        next(new Error(`Datastream for tenant ${workplan.tenant} and ${workplan.exchangeId} not found.`));
    }

private deleteDatastream: RequestHandler = 
    async (req: Request, res: Response, next: NextFunction) => {
        const { tenant, exchange } = req.params;

        const config:GathererConfiguration = await this.loadGathererConfig();

        let planToRemove:WorkPlan;

        for (const plan of config.workplans) {
            if (plan.tenant === tenant && plan.exchangeId === exchange) {
                planToRemove = plan;
                break;
            }
        }

        if (!planToRemove) {
            next(new Error("Workplan not found"));
            return;
        }

        config.workplans.splice(config.workplans.indexOf(planToRemove), 1);

        const feedback = await this.redis.set(GATHERER_KEY, JSON.stringify(config, null, 2));
                
        if (feedback !== 'OK') {
            next(new Error("Could not save redis"));
            return;
        }

        if (await this.syncDbsync(config) !== 'OK') {
            next(new Error("Could not save redis"));
            return;
        }
        
        res.sendStatus(200);
    }

private syncDbsync = async (gatherer: GathererConfiguration) => {
        const dbsync: DbSyncConfiguration = JSON.parse(await this.redis.get(DBSYNC_KEY));

        dbsync.workplans = [];

        gatherer.workplans.forEach((workplan) => {
            let datastream:DbSyncWorkplan = dbsync.workplans.find(plan => plan.tenantId === workplan.tenant);

            if (!datastream) {
                dbsync.workplans.push(datastream = new DbSyncWorkplan(workplan.tenant));
            }

            workplan.assetPairs.forEach((assetPair) => {
                if (workplan.dataPoints.includes("watchOrderBook")) {
                    datastream.assets.push(`stream.${workplan.tenant}.${workplan.exchangeId}.watchOrderBook.${assetPair}`);
                    datastream.assets.push(`stream.snapshot.${workplan.tenant}.${workplan.exchangeId}.watchOrderBook.${assetPair}`);
                } 
                if (workplan.dataPoints.includes("watchBalance")) {
                    datastream.assets.push(`stream.${workplan.tenant}.${workplan.exchangeId}.watchBalance`);
                }
            });

        });

        return await this.redis.set(DBSYNC_KEY, JSON.stringify(dbsync, null, 2));
    }
}