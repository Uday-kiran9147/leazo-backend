import { Portion } from '../models/portion.model';

export interface IPortionRepository {
    create(data: any): Promise<any>;
    findById(id: string): Promise<any>;
    findByBuildingId(buildingId: string, page?: number, limit?: number): Promise<any[]>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
    countActiveByOwner(ownerId: string): Promise<number>;
}

export class MongoosePortionRepository implements IPortionRepository {
    private static instance: MongoosePortionRepository;

    private constructor() { }

    public static getInstance(): MongoosePortionRepository {
        if (!MongoosePortionRepository.instance) {
            MongoosePortionRepository.instance = new MongoosePortionRepository();
        }
        return MongoosePortionRepository.instance;
    }
    async create(data: any): Promise<any> {
        const portion = new Portion(data);
        return await portion.save();
    }

    async findById(id: string): Promise<any> {
        return await Portion.findById(id).lean();
    }

    async findByBuildingId(buildingId: string, page: number = 1, limit: number = 10): Promise<any[]> {
        return await Portion.find({ buildingId, isDeleted: false })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
    }

    async update(id: string, data: any): Promise<any> {
        return await Portion.findOneAndUpdate(
            { _id: id },
            { $set: data },
            { runValidators: true, new: true }
        ).lean();
    }

    async delete(id: string): Promise<any> {
        return await Portion.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { $set: { isDeleted: true } },
            { new: true }
        ).lean();
    }

    async countActiveByOwner(ownerId: string): Promise<number> {
        return await Portion.countDocuments({
            ownerId,
            isActive: true,
            isDeleted: false
        });
    }
}

import { RedisClientManager } from '../cache/RedisClientManager';

export class CachedPortionRepository implements IPortionRepository {
    private static instance: CachedPortionRepository;

    private constructor(private baseRepo: IPortionRepository) { }

    public static getInstance(baseRepo: IPortionRepository): CachedPortionRepository {
        if (!CachedPortionRepository.instance) {
            CachedPortionRepository.instance = new CachedPortionRepository(baseRepo);
        }
        return CachedPortionRepository.instance;
    }

    private async getFromCache<T>(key: string): Promise<T | null> {
        const cached = await RedisClientManager.get(key);
        if (!cached) return null;
        if (typeof cached === 'string') {
            return JSON.parse(cached);
        }
        return cached as T;
    }

    async create(data: any): Promise<any> {
        const portion = await this.baseRepo.create(data);
        if (portion.buildingId) {
            await RedisClientManager.deletePattern(`portions:building:${portion.buildingId.toString()}:*`);
        }
        return portion;
    }

    async findById(id: string): Promise<any> {
        const cacheKey = `portions:id:${id}`;
        const cached = await this.getFromCache<any>(cacheKey);
        if (cached) return cached;

        const portion = await this.baseRepo.findById(id);
        if (portion) {
            await RedisClientManager.set(cacheKey, portion);
        }
        return portion;
    }

    async findByBuildingId(buildingId: string, page: number = 1, limit: number = 10): Promise<any[]> {
        const cacheKey = `portions:building:${buildingId}:page:${page}:limit:${limit}`;
        const cached = await this.getFromCache<any[]>(cacheKey);
        if (cached) return cached;

        const portions = await this.baseRepo.findByBuildingId(buildingId, page, limit);
        await RedisClientManager.set(cacheKey, portions);
        return portions;
    }

    async update(id: string, data: any): Promise<any> {
        const portion = await this.baseRepo.update(id, data);
        if (portion) {
            await RedisClientManager.delete(`portions:id:${id}`);
            if (portion.buildingId) {
                await RedisClientManager.deletePattern(`portions:building:${portion.buildingId.toString()}:*`);
            }
        }
        return portion;
    }

    async delete(id: string): Promise<any> {
        const portion = await this.baseRepo.delete(id);
        if (portion) {
            await RedisClientManager.delete(`portions:id:${id}`);
            if (portion.buildingId) {
                await RedisClientManager.deletePattern(`portions:building:${portion.buildingId.toString()}:*`);
            }
        }
        return portion;
    }

    async countActiveByOwner(ownerId: string): Promise<number> {
        // We usually don't cache counts unless they are very expensive, 
        // but for consistency we could or just call base.
        return await this.baseRepo.countActiveByOwner(ownerId);
    }
}
