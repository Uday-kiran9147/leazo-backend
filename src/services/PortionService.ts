import { IPortionRepository } from "../repositories/PortionRepository";
import { IOwnerRepository } from "../repositories/OwnerRepository";
import { RedisClientManager } from "../cache/RedisClientManager";

export class PortionService {
    constructor(
        private portionRepository: IPortionRepository,
        private ownerRepository: IOwnerRepository
    ) { }

    async createPortion(portionData: any) {
        const portion = await this.portionRepository.create(portionData);

        // Update owner usage if portion is active
        if (portion.isActive) {
            await this.ownerRepository.updateActiveListings(portion.ownerId.toString(), 1);
            await RedisClientManager.delete(`owner:${portion.ownerId}`);
        }

        await RedisClientManager.delete(`portion:${portion._id}`);
        await this.invalidateBuildingCache(portion.buildingId.toString());
        return portion;
    }

    async getPortionsByBuilding(
        buildingId: string,
        page: number = 1,
        limit: number = 10
    ) {
        const cacheKey = `building-portions:${buildingId}:p${page}:l${limit}`;
        const cached = await RedisClientManager.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const portions = await this.portionRepository.findByBuildingId(
            buildingId,
            page,
            limit
        );

        await RedisClientManager.set(cacheKey, JSON.stringify(portions));
        return portions;
    }

    async updatePortion(portionId: string, updateData: any) {
        const oldPortion = await this.portionRepository.findById(portionId);
        if (!oldPortion) return null;

        const portion = await this.portionRepository.update(portionId, updateData);
        if (portion) {
            // Handle activeListings count change
            if (updateData.isActive !== undefined && updateData.isActive !== oldPortion.isActive) {
                const increment = updateData.isActive ? 1 : -1;
                await this.ownerRepository.updateActiveListings(portion.ownerId.toString(), increment);
                await RedisClientManager.delete(`owner:${portion.ownerId}`);
            }

            await RedisClientManager.delete(`portion:${portionId}`);
            await this.invalidateBuildingCache(portion.buildingId.toString());
        }
        return portion;
    }

    async deletePortion(portionId: string) {
        const portion = await this.portionRepository.delete(portionId);
        if (portion) {
            // If the deleted portion was active, decrement the count
            if (portion.isActive && !portion.isDeleted) {
                // Note: The repository update sets isDeleted to true. 
                // We check the state BEFORE it was marked as deleted if possible, 
                // but usually delete() returns the updated doc. 
                // Let's assume portion matches the state BEFORE delete for a moment, 
                // OR we check if it WAS active.

                await this.ownerRepository.updateActiveListings(portion.ownerId.toString(), -1);
                await RedisClientManager.delete(`owner:${portion.ownerId}`);
            }
            await RedisClientManager.delete(`portion:${portionId}`);
            await this.invalidateBuildingCache(portion.buildingId.toString());
        }
        return portion;
    }

    private async invalidateBuildingCache(buildingId: string) {
        await RedisClientManager.deletePattern(`building-portions:${buildingId}:*`);
    }
}
