import { BuildingService } from '../../src/services/BuildingService';
import { IBuildingRepository } from '../../src/repositories/BuildingRepository';

describe('BuildingService', () => {
    let buildingService: BuildingService;
    let mockBuildingRepository: jest.Mocked<IBuildingRepository>;

    beforeEach(() => {
        mockBuildingRepository = {
            create: jest.fn(),
            findByOwnerId: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        } as any;

        buildingService = new BuildingService(mockBuildingRepository);
    });

    it('should create a building', async () => {
        const ownerId = 'owner123';
        const buildingData = { buildingName: 'Empire State' };
        const mockBuilding = { _id: 'b123', ...buildingData, ownerId };
        
        mockBuildingRepository.create.mockResolvedValue(mockBuilding as any);

        const result = await buildingService.createBuilding(ownerId, buildingData);
        expect(result).toEqual(mockBuilding);
        expect(mockBuildingRepository.create).toHaveBeenCalledWith({ ...buildingData, ownerId });
    });

    it('should get buildings by owner id', async () => {
        const ownerId = 'owner123';
        const mockBuildings = [{ _id: 'b123', buildingName: 'Empire State' }];
        
        mockBuildingRepository.findByOwnerId.mockResolvedValue(mockBuildings as any);

        const result = await buildingService.getBuildingsByOwner(ownerId);
        expect(result).toEqual(mockBuildings);
        expect(mockBuildingRepository.findByOwnerId).toHaveBeenCalledWith(ownerId, undefined, undefined);
    });

    it('should update a building', async () => {
        const buildingId = 'b123';
        const updateData = { buildingName: 'Updated Name' };
        const mockBuilding = { _id: buildingId, ...updateData };
        
        mockBuildingRepository.update.mockResolvedValue(mockBuilding as any);

        const result = await buildingService.updateBuilding(buildingId, updateData);
        expect(result).toEqual(mockBuilding);
        expect(mockBuildingRepository.update).toHaveBeenCalledWith(buildingId, updateData);
    });

    it('should throw error if building to update not found', async () => {
        mockBuildingRepository.update.mockResolvedValue(null);
        await expect(buildingService.updateBuilding('b123', {})).rejects.toThrow('Building not found');
    });

    it('should delete a building', async () => {
        const buildingId = 'b123';
        const mockBuilding = { _id: buildingId };
        
        mockBuildingRepository.delete.mockResolvedValue(mockBuilding as any);

        const result = await buildingService.deleteBuilding(buildingId);
        expect(result).toEqual(mockBuilding);
        expect(mockBuildingRepository.delete).toHaveBeenCalledWith(buildingId);
    });

    it('should throw error if building to delete not found', async () => {
        mockBuildingRepository.delete.mockResolvedValue(null);
        await expect(buildingService.deleteBuilding('b123')).rejects.toThrow('Building not found');
    });
});
