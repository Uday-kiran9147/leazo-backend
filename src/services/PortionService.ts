import { IPortionRepository } from "../repositories/PortionRepository";
import { IOwnerRepository } from "../repositories/OwnerRepository";
import { RedisClientManager } from "../cache/RedisClientManager";
import { logger } from "../utils/logger";
import { getPlanRules } from "../config/ownerConfig";

export class PortionService {
    constructor(
        private portionRepository: IPortionRepository,
        private ownerRepository: IOwnerRepository
    ) { }
    async isPortionActive(portionId: string): Promise<boolean> {
        const portion = await this.portionRepository.findById(portionId);
        if (!portion) throw new Error("Portion not found");
        return portion.isActive;
    }
    async boostPortion(portionId: string, userId: string) {
        const owner = await this.ownerRepository.findByUserId(userId);
        if (!owner) throw new Error("Owner profile not found");

        // 1. Weekly Reset Logic
        const now = new Date();
        const lastReset = owner.lastBoostResetAt || owner.planActivatedAt || owner.createdAt;
        const diffInDays = (now.getTime() - new Date(lastReset).getTime()) / (1000 * 3600 * 24);

        if (diffInDays >= 7) {
            await this.ownerRepository.update(owner._id.toString(), {
                "usage.weeklyBoostsUsed": 0,
                lastBoostResetAt: now.toISOString()
            });
            owner.usage.weeklyBoostsUsed = 0;
            owner.lastBoostResetAt = now.toISOString() as any;
        }

        // 2. Check Plan Limit
        const planRules = getPlanRules(owner.planId);
        if (owner.usage.weeklyBoostsUsed >= planRules.weeklyBoosts) {
            throw new Error(`Weekly boost limit reached (${planRules.weeklyBoosts}).`);
        }

        // 3. Portion Ownership Check
        const portion = await this.portionRepository.findById(portionId);
        if (!portion || portion.ownerId.toString() !== owner._id.toString()) {
            throw new Error("Access denied. You do not own this portion.");
        }

        // 4. Boost Portion
        const boostHours = 24;
        const boostExpiresAt = new Date(now.getTime() + boostHours * 60 * 60 * 1000).toISOString();

        const updatedPortion = await this.portionRepository.update(portionId, {
            isBoosted: true,
            boostExpiresAt: boostExpiresAt
        });

        // 5. Update Owner Usage
        await this.ownerRepository.update(owner._id.toString(), {
            $inc: { "usage.weeklyBoostsUsed": 1 }
        });

        // 6. Invalidate Cache
        await RedisClientManager.delete(`portion:${portionId}`);
        await RedisClientManager.deletePattern(`building-portions:${portion.buildingId.toString()}:*`);
        await RedisClientManager.delete("portions:all");

        return updatedPortion;
    }

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

        logger.debug(`Updating portion ${portionId}`, {
            previousIsActive: oldPortion.isActive,
            newIsActive: updateData.isActive
        });

        const portion = await this.portionRepository.update(portionId, updateData);
        if (portion) {
            // Handle activeListings count change
            if (updateData.isActive !== undefined && updateData.isActive !== oldPortion.isActive) {
                const increment = updateData.isActive ? 1 : -1;
                logger.debug(`Usage count change for owner`, { owner: portion.ownerId, increment });
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
