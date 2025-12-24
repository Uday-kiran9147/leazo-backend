import { IPortionRepository } from '../repositories/PortionRepository';
import { RedisClientManager } from '../cache/RedisClientManager';

export class PortionService {
    constructor(private portionRepository: IPortionRepository) {}

    async createPortion(portionData: any) {
        const portion = await this.portionRepository.create(portionData);
        await this.invalidateCache(portion.buildingId.toString());
        return portion;
    }

    async getPortionsByBuilding(buildingId: string, page: number = 1, limit: number = 10) {
        const cacheKey = `building-portions:${buildingId}:p${page}:l${limit}`;
        const cached = await RedisClientManager.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const portions = await this.portionRepository.findByBuildingId(buildingId, page, limit);
        await RedisClientManager.set(cacheKey, JSON.stringify(portions));
        return portions;
    }

    async updatePortion(portionId: string, updateData: any) {
        const portion = await this.portionRepository.update(portionId, updateData);
        if (portion) {
            await this.invalidateCache(portion.buildingId.toString());
        }
        return portion;
    }

    async deletePortion(portionId: string) {
        const portion = await this.portionRepository.delete(portionId);
        if (portion) {
            await this.invalidateCache(portion.buildingId.toString());
        }
        return portion;
    }

    private async invalidateCache(buildingId: string) {
        await RedisClientManager.delete(`building-portions:${buildingId}`);
        await RedisClientManager.delete(`portions:all`);
    }
}
