import { User } from '../models/user.model';

export interface IUserRepository {
    create(data: any): Promise<any>;
    findById(id: string): Promise<any>;
    findByEmail(email: string): Promise<any>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
}

export class MongooseUserRepository implements IUserRepository {
    private static instance: MongooseUserRepository;

    private constructor() { }

    public static getInstance(): MongooseUserRepository {
        if (!MongooseUserRepository.instance) {
            MongooseUserRepository.instance = new MongooseUserRepository();
        }
        return MongooseUserRepository.instance;
    }
    async create(data: any): Promise<any> {
        const user = new User(data);
        return await user.save();
    }

    async findById(id: string): Promise<any> {
        return await User.findById(id).lean();
    }

    async findByEmail(email: string): Promise<any> {
        return await User.findOne({ email }).lean();
    }

    async update(id: string, data: any): Promise<any> {
        return await User.findByIdAndUpdate(id, data, { new: true }).lean();
    }

    async delete(id: string): Promise<any> {
        return await User.findByIdAndDelete(id);
    }
}

import { RedisClientManager } from '../cache/RedisClientManager';

export class CachedUserRepository implements IUserRepository {
    private static instance: CachedUserRepository;

    private constructor(private baseRepo: IUserRepository) { }

    public static getInstance(baseRepo: IUserRepository): CachedUserRepository {
        if (!CachedUserRepository.instance) {
            CachedUserRepository.instance = new CachedUserRepository(baseRepo);
        }
        return CachedUserRepository.instance;
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
        return await this.baseRepo.create(data);
    }

    async findById(id: string): Promise<any> {
        const cacheKey = `user:id:${id}`;
        const cached = await this.getFromCache<any>(cacheKey);
        if (cached) return cached;

        const user = await this.baseRepo.findById(id);
        if (user) {
            await RedisClientManager.set(cacheKey, user);
        }
        return user;
    }

    async findByEmail(email: string): Promise<any> {
        const cacheKey = `user:email:${email}`;
        const cached = await this.getFromCache<any>(cacheKey);
        if (cached) return cached;

        const user = await this.baseRepo.findByEmail(email);
        if (user) {
            await RedisClientManager.set(cacheKey, user);
        }
        return user;
    }

    private async invalidateCache(id: string, email?: string) {
        await RedisClientManager.delete(`user:id:${id}`);
        if (email) {
            await RedisClientManager.delete(`user:email:${email}`);
        }
    }

    async update(id: string, data: any): Promise<any> {
        const user = await this.baseRepo.update(id, data);
        if (user) {
            await this.invalidateCache(id, user.email);
        }
        return user;
    }

    async delete(id: string): Promise<any> {
        const user = await this.baseRepo.delete(id);
        if (user) {
            await this.invalidateCache(id, user.email);
        }
        return user;
    }
}
