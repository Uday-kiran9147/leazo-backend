import { IBuildingRepository } from '../repositories/BuildingRepository';

export class BuildingService {
    constructor(private buildingRepository: IBuildingRepository) {}

    async createBuilding(ownerId: string, buildingData: any) {
        return await this.buildingRepository.create({ ...buildingData, ownerId });
    }

    async getBuilding(buildingId: string) {
        return await this.buildingRepository.findById(buildingId);
    }

    async getBuildingsByOwner(ownerId: string, page: number = 1, limit: number = 10) {
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
