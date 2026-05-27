import { Owner } from '../models/owner.model';

export interface IOwnerRepository {
    create(data: any): Promise<any>;
    findById(id: string): Promise<any>;
    findByUserId(userId: string): Promise<any>;
    findAll(page?: number, limit?: number): Promise<any[]>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
    updateUsage(id: string, usage: any): Promise<any>;
    updateActiveListings(id: string, increment: number): Promise<any>;
    updateUsageCount(id: string, field: string, count: number): Promise<any>;
}

export class MongooseOwnerRepository implements IOwnerRepository {
    private static instance: MongooseOwnerRepository;

    private constructor() { }

    public static getInstance(): MongooseOwnerRepository {
        if (!MongooseOwnerRepository.instance) {
            MongooseOwnerRepository.instance = new MongooseOwnerRepository();
        }
        return MongooseOwnerRepository.instance;
    }

    async create(data: any): Promise<any> {
        const owner = new Owner(data);
        return await owner.save();
    }

    async findById(id: string): Promise<any> {
        return await Owner.findById(id).lean();
    }

    async findByUserId(userId: string): Promise<any> {
        return await Owner.findOne({ userId }).lean();
    }

    async findAll(page: number = 1, limit: number = 10): Promise<any[]> {
        return await Owner.find()
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
    }

    async update(id: string, data: any): Promise<any> {
        return await Owner.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    }

    async delete(id: string): Promise<any> {
        return await Owner.findByIdAndDelete(id);
    }

    async updateUsage(id: string, usage: any): Promise<any> {
        return await Owner.findByIdAndUpdate(id, { $set: { usage } }, { new: true }).lean();
    }

    async updateActiveListings(id: string, increment: number): Promise<any> {
        return await Owner.findByIdAndUpdate(
            id,
            { $inc: { "usage.activeListings": increment } },
            { new: true }
        ).lean();
    }

    async updateUsageCount(id: string, field: string, count: number): Promise<any> {
        return await Owner.findByIdAndUpdate(
            id,
            { $set: { [`usage.${field}`]: count } },
            { new: true }
        ).lean();
    }
}

import { RedisClientManager } from '../cache/RedisClientManager';

export class CachedOwnerRepository implements IOwnerRepository {
    private static instance: CachedOwnerRepository;

    private constructor(private baseRepo: IOwnerRepository) { }

    public static getInstance(baseRepo: IOwnerRepository): CachedOwnerRepository {
        if (!CachedOwnerRepository.instance) {
            CachedOwnerRepository.instance = new CachedOwnerRepository(baseRepo);
        }
        return CachedOwnerRepository.instance;
    }

    private async getFromCache<T>(key: string): Promise<T | null> {
        const cached = await RedisClientManager.get(key);
        if (!cached) return null;
        // Upstash Redis auto-deserializes JSON, so cached may already be an object
        if (typeof cached === 'string') {
            return JSON.parse(cached);
        }
        return cached as T;
    }

    async create(data: any): Promise<any> {
        return await this.baseRepo.create(data);
    }

    async findById(id: string): Promise<any> {
        const cacheKey = `owner:id:${id}`;
        const cached = await this.getFromCache<any>(cacheKey);
        if (cached) return cached;

        const owner = await this.baseRepo.findById(id);
        if (owner) {
            await RedisClientManager.set(cacheKey, owner);
        }
        return owner;
    }

    async findByUserId(userId: string): Promise<any> {
        const cacheKey = `owner:user:${userId}`;
        const cached = await this.getFromCache<any>(cacheKey);
        if (cached) return cached;

        const owner = await this.baseRepo.findByUserId(userId);
        if (owner) {
            await RedisClientManager.set(cacheKey, owner);
        }
        return owner;
    }

    async findAll(page: number = 1, limit: number = 10): Promise<any[]> {
        const cacheKey = `owners:page:${page}:limit:${limit}`;
        const cached = await this.getFromCache<any[]>(cacheKey);
        if (cached) return cached;

        const owners = await this.baseRepo.findAll(page, limit);
        await RedisClientManager.set(cacheKey, owners);
        return owners;
    }

    private async invalidateCache(id: string, userId?: string) {
        await RedisClientManager.delete(`owner:id:${id}`);
        if (userId) {
            await RedisClientManager.delete(`owner:user:${userId}`);
        }
        // Also invalidate lists if necessary
        await RedisClientManager.deletePattern('owners:page:*');
    }

    async update(id: string, data: any): Promise<any> {
        const owner = await this.baseRepo.update(id, data);
        if (owner) {
            await this.invalidateCache(id, owner.userId);
        }
        return owner;
    }

    async delete(id: string): Promise<any> {
        const owner = await this.baseRepo.delete(id);
        if (owner) {
            await this.invalidateCache(id, owner.userId);
        }
        return owner;
    }

    async updateUsage(id: string, usage: any): Promise<any> {
        const owner = await this.baseRepo.updateUsage(id, usage);
        if (owner) {
            await this.invalidateCache(id, owner.userId);
        }
        return owner;
    }

    async updateActiveListings(id: string, increment: number): Promise<any> {
        const owner = await this.baseRepo.updateActiveListings(id, increment);
        if (owner) {
            await this.invalidateCache(id, owner.userId);
        }
        return owner;
    }

    async updateUsageCount(id: string, field: string, count: number): Promise<any> {
        const owner = await this.baseRepo.updateUsageCount(id, field, count);
        if (owner) {
            await this.invalidateCache(id, owner.userId);
        }
        return owner;
    }
}
