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

        console.log(`Updating portion ${portionId}. Previous isActive: ${oldPortion.isActive}, New isActive: ${updateData.isActive}`);

        const portion = await this.portionRepository.update(portionId, updateData);
        if (portion) {
            // Handle activeListings count change
            if (updateData.isActive !== undefined && updateData.isActive !== oldPortion.isActive) {
                const increment = updateData.isActive ? 1 : -1;
                console.log(`Usage count change for owner ${portion.ownerId}: ${increment}`);
                await this.ownerRepository.updateActiveListings(portion.ownerId.toString(), increment);
                await RedisClientManager.delete(`owner:${portion.ownerId}`);
            }

            await RedisClientManager.delete(`portion:${portionId}`);
            await this.invalidateBuildingCache(portion.buildingId.toString());
        }
        return portion;
    }

    async deletePortion(portionId: string) {
        const oldPortion = await this.portionRepository.findById(portionId);
        if (!oldPortion) return null;

        const portion = await this.portionRepository.delete(portionId);
        if (portion) {
            // If the deleted portion was active, decrement the count
            // We use oldPortion because repository.delete returns the portion with isDeleted: true
            if (oldPortion.isActive && !oldPortion.isDeleted) {
                await this.ownerRepository.updateActiveListings(portion.ownerId.toString(), -1);
                await RedisClientManager.delete(`owner:${portion.ownerId}`);
            }
            await RedisClientManager.delete(`portion:${portionId}`);
            await this.invalidateBuildingCache(portion.buildingId.toString());
        }
        return portion;
    }

    async reconcileUsage(ownerId: string) {
        // This is a recovery method to fix desynced usage counts
        const activeCount = await (this.portionRepository as any).countActiveByOwner(ownerId);
        await this.ownerRepository.updateUsageCount(ownerId, 'activeListings', activeCount);
        await RedisClientManager.delete(`owner:${ownerId}`);
        return activeCount;
    }

    private async invalidateBuildingCache(buildingId: string) {
        await RedisClientManager.deletePattern(`building-portions:${buildingId}:*`);
    }
}
