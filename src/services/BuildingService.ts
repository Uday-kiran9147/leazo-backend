import { IBuildingRepository } from '../repositories/BuildingRepository';
import { RedisClientManager } from '../cache/RedisClientManager';

export class BuildingService {
    constructor(private buildingRepository: IBuildingRepository) {}

    async createBuilding(ownerId: string, buildingData: any) {
        const building = await this.buildingRepository.create({ ...buildingData, ownerId });
        await RedisClientManager.delete(`owner-buildings:${ownerId}`);
        return building;
    }

    async getBuilding(buildingId: string) {
        const cacheKey = `building:${buildingId}`;
        const cached = await RedisClientManager.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const building = await this.buildingRepository.findById(buildingId);
        if (building) {
            await RedisClientManager.set(cacheKey, JSON.stringify(building));
        }
        return building;
    }

    async getBuildingsByOwner(ownerId: string, page: number = 1, limit: number = 10) {
        const cacheKey = `owner-buildings:${ownerId}`;

        const cached = await RedisClientManager.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const buildings = await this.buildingRepository.findByOwnerId(ownerId, page, limit);
        await RedisClientManager.set(cacheKey, JSON.stringify(buildings));
        return buildings;
    }

    async updateBuilding(buildingId: string, updateData: any) {
        const building = await this.buildingRepository.update(buildingId, updateData);
        if (!building) {
            throw new Error('Building not found');
        }
        await RedisClientManager.delete(`owner-buildings:${building.ownerId}`);
        return building;
    }

    async deleteBuilding(buildingId: string) {
        const building = await this.buildingRepository.delete(buildingId);
        if (!building) {
            throw new Error('Building not found');
        }
        await RedisClientManager.delete(`owner-buildings:${building.ownerId}`);
        return building;
    }
}
