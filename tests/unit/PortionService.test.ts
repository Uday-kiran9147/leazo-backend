import { PortionService } from '../../src/services/PortionService';
import { IPortionRepository } from '../../src/repositories/PortionRepository';
import { IOwnerRepository } from '../../src/repositories/OwnerRepository';
import { RedisClientManager } from '../../src/cache/RedisClientManager';

jest.mock('../../src/cache/RedisClientManager');

describe('PortionService', () => {
    let portionService: PortionService;
    let mockPortionRepository: jest.Mocked<IPortionRepository>;
    let mockOwnerRepository: jest.Mocked<IOwnerRepository>;

    beforeEach(() => {
        mockPortionRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findByBuildingId: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        } as any;

        mockOwnerRepository = {
            updateActiveListings: jest.fn(),
            updateUsageCount: jest.fn(),
        } as any;

        portionService = new PortionService(mockPortionRepository, mockOwnerRepository);
        jest.clearAllMocks();
    });

    it('should create a portion and increment activeListings if active', async () => {
        const portionData = { title: 'Studio A', buildingId: 'b123', ownerId: 'o123', isActive: true };
        const mockPortion = { _id: 'p123', ...portionData };
        
        mockPortionRepository.create.mockResolvedValue(mockPortion as any);

        const result = await portionService.createPortion(portionData);

        expect(result).toEqual(mockPortion);
        expect(mockOwnerRepository.updateActiveListings).toHaveBeenCalledWith('o123', 1);
        expect(RedisClientManager.delete).toHaveBeenCalledWith('owner:o123');
        expect(RedisClientManager.delete).toHaveBeenCalledWith(`portion:${mockPortion._id}`);
        expect(RedisClientManager.deletePattern).toHaveBeenCalledWith(`building-portions:${portionData.buildingId}:*`);
    });

    it('should create a portion and NOT increment activeListings if NOT active', async () => {
        const portionData = { title: 'Studio A', buildingId: 'b123', ownerId: 'o123', isActive: false };
        const mockPortion = { _id: 'p123', ...portionData };

        mockPortionRepository.create.mockResolvedValue(mockPortion as any);

        const result = await portionService.createPortion(portionData);

        expect(result).toEqual(mockPortion);
        expect(mockOwnerRepository.updateActiveListings).not.toHaveBeenCalled();
    });

    it('should get portions by building with pagination and caching', async () => {
        const buildingId = 'b123';
        const page = 1;
        const limit = 10;
        const mockPortions = [{ _id: 'p123', title: 'Studio A' }];
        
        (RedisClientManager.get as jest.Mock).mockResolvedValue(null);
        mockPortionRepository.findByBuildingId.mockResolvedValue(mockPortions as any);

        const result = await portionService.getPortionsByBuilding(buildingId, page, limit);

        expect(result).toEqual(mockPortions);
        expect(mockPortionRepository.findByBuildingId).toHaveBeenCalledWith(buildingId, page, limit);
        expect(RedisClientManager.set).toHaveBeenCalledWith(`building-portions:${buildingId}:p${page}:l${limit}`, JSON.stringify(mockPortions));
    });

    it('should update a portion and increment activeListings if activated', async () => {
        const portionId = 'p123';
        const updateData = { isActive: true };
        const oldPortion = { _id: portionId, isActive: false, ownerId: 'o123', buildingId: 'b123' };
        const mockPortion = { ...oldPortion, isActive: true };

        mockPortionRepository.findById.mockResolvedValue(oldPortion as any);
        mockPortionRepository.update.mockResolvedValue(mockPortion as any);

        const result = await portionService.updatePortion(portionId, updateData);

        expect(result).toEqual(mockPortion);
        expect(mockOwnerRepository.updateActiveListings).toHaveBeenCalledWith('o123', 1);
        expect(RedisClientManager.delete).toHaveBeenCalledWith('owner:o123');
    });

    it('should update a portion and decrement activeListings if deactivated', async () => {
        const portionId = 'p123';
        const updateData = { isActive: false };
        const oldPortion = { _id: portionId, isActive: true, ownerId: 'o123', buildingId: 'b123' };
        const mockPortion = { ...oldPortion, isActive: false };
        
        mockPortionRepository.findById.mockResolvedValue(oldPortion as any);
        mockPortionRepository.update.mockResolvedValue(mockPortion as any);

        const result = await portionService.updatePortion(portionId, updateData);

        expect(result).toEqual(mockPortion);
        expect(mockOwnerRepository.updateActiveListings).toHaveBeenCalledWith('o123', -1);
    });

    it('should NOT update usage if isActive status has not changed', async () => {
        const portionId = 'p123';
        const updateData = { title: 'New Name' };
        const oldPortion = { _id: portionId, isActive: true, ownerId: 'o123', buildingId: 'b123' };
        const mockPortion = { ...oldPortion, title: 'New Name' };

        mockPortionRepository.findById.mockResolvedValue(oldPortion as any);
        mockPortionRepository.update.mockResolvedValue(mockPortion as any);

        await portionService.updatePortion(portionId, updateData);

        expect(mockOwnerRepository.updateActiveListings).not.toHaveBeenCalled();
    });

    it('should delete a portion and decrement activeListings if it was active', async () => {
        const portionId = 'p123';
        const oldPortion = { _id: portionId, buildingId: 'b123', ownerId: 'o123', isActive: true, isDeleted: false };
        const deletedPortion = { ...oldPortion, isDeleted: true };
        
        mockPortionRepository.findById.mockResolvedValue(oldPortion as any);
        mockPortionRepository.delete.mockResolvedValue(deletedPortion as any);

        const result = await portionService.deletePortion(portionId);

        expect(result.isDeleted).toBe(true);
        expect(mockOwnerRepository.updateActiveListings).toHaveBeenCalledWith('o123', -1);
        expect(RedisClientManager.delete).toHaveBeenCalledWith('owner:o123');
    });

    it('should reconcile usage count', async () => {
        const ownerId = 'o123';
        (mockPortionRepository as any).countActiveByOwner = jest.fn().mockResolvedValue(5);

        const result = await portionService.reconcileUsage(ownerId);

        expect(result).toBe(5);
        expect(mockOwnerRepository.updateUsageCount).toHaveBeenCalledWith(ownerId, 'activeListings', 5);
        expect(RedisClientManager.delete).toHaveBeenCalledWith('owner:o123');
    });
});
