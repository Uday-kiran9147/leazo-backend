import { Building } from '../models/building.model';
import mongoose from 'mongoose';

export interface IBuildingRepository {
    create(data: any): Promise<any>;
    findById(id: string): Promise<any>;
    findByOwnerId(ownerId: string, page?: number, limit?: number): Promise<any[]>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
}

export class MongooseBuildingRepository implements IBuildingRepository {
    private static instance: MongooseBuildingRepository;

    private constructor() { }

    public static getInstance(): MongooseBuildingRepository {
        if (!MongooseBuildingRepository.instance) {
            MongooseBuildingRepository.instance = new MongooseBuildingRepository();
        }
        return MongooseBuildingRepository.instance;
    }
    async create(data: any): Promise<any> {
        const building = new Building(data);
        return await building.save();
    }

    async findById(id: string): Promise<any> {
        return await Building.findById(id).lean();
    }

    async findByOwnerId(ownerId: string, page: number = 1, limit: number = 10): Promise<any[]> {
        return await Building.find({ ownerId })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
    }

    async update(id: string, data: any): Promise<any> {
        return await Building.findOneAndUpdate(
            { _id: id },
            { $set: data },
            { runValidators: true, new: true }
        ).lean();
    }

    async delete(id: string): Promise<any> {
        return await Building.findOneAndDelete({ _id: id });
    }
}

import { RedisClientManager } from '../cache/RedisClientManager';

export class CachedBuildingRepository implements IBuildingRepository {
    private static instance: CachedBuildingRepository;

    private constructor(private baseRepo: IBuildingRepository) { }

    public static getInstance(baseRepo: IBuildingRepository): CachedBuildingRepository {
        if (!CachedBuildingRepository.instance) {
            CachedBuildingRepository.instance = new CachedBuildingRepository(baseRepo);
        }
        return CachedBuildingRepository.instance;
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
        const building = await this.baseRepo.create(data);
        if (building.ownerId) {
            await RedisClientManager.deletePattern(`buildings:owner:${building.ownerId}:*`);
        }
        return building;
    }

    async findById(id: string): Promise<any> {
        const cacheKey = `buildings:id:${id}`;
        const cached = await this.getFromCache<any>(cacheKey);
        if (cached) return cached;

        const building = await this.baseRepo.findById(id);
        if (building) {
            await RedisClientManager.set(cacheKey, building);
        }
        return building;
    }

    async findByOwnerId(ownerId: string, page: number = 1, limit: number = 10): Promise<any[]> {
        const cacheKey = `buildings:owner:${ownerId}:page:${page}:limit:${limit}`;
        const cached = await this.getFromCache<any[]>(cacheKey);
        if (cached) return cached;

        const buildings = await this.baseRepo.findByOwnerId(ownerId, page, limit);
        await RedisClientManager.set(cacheKey, buildings);
        return buildings;
    }

    async update(id: string, data: any): Promise<any> {
        const building = await this.baseRepo.update(id, data);
        if (building) {
            await RedisClientManager.delete(`buildings:id:${id}`);
            if (building.ownerId) {
                await RedisClientManager.deletePattern(`buildings:owner:${building.ownerId}:*`);
            }
        }
        return building;
    }

    async delete(id: string): Promise<any> {
        const building = await this.baseRepo.delete(id);
        if (building) {
            await RedisClientManager.delete(`buildings:id:${id}`);
            if (building.ownerId) {
                await RedisClientManager.deletePattern(`buildings:owner:${building.ownerId}:*`);
            }
        }
        return building;
    }
}
