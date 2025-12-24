import { IBuildingRepository } from '../repositories/BuildingRepository';

export class BuildingService {
    constructor(private buildingRepository: IBuildingRepository) {}

    async createBuilding(ownerId: string, buildingData: any) {
        // Business logic: check if owner exists (could be done in OwnerService)
        // For now, simple creation
        return await this.buildingRepository.create({ ...buildingData, ownerId });
    }

    async getBuildingsByOwner(ownerId: string, page?: number, limit?: number) {
        return await this.buildingRepository.findByOwnerId(ownerId, page, limit);
    }

    async updateBuilding(buildingId: string, updateData: any) {
        const building = await this.buildingRepository.update(buildingId, updateData);
        if (!building) {
            throw new Error('Building not found');
        }
        return building;
    }

    async deleteBuilding(buildingId: string) {
        const building = await this.buildingRepository.delete(buildingId);
        if (!building) {
            throw new Error('Building not found');
        }
        return building;
    }
}
