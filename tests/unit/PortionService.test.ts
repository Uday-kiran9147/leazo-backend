import { PortionService } from '../../src/services/PortionService';
import { IPortionRepository } from '../../src/repositories/PortionRepository';
import { RedisClientManager } from '../../src/cache/RedisClientManager';

jest.mock('../../src/cache/RedisClientManager');

describe('PortionService', () => {
    let portionService: PortionService;
    let mockPortionRepository: jest.Mocked<IPortionRepository>;

    beforeEach(() => {
        mockPortionRepository = {
            create: jest.fn(),
            findByBuildingId: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        } as any;

        portionService = new PortionService(mockPortionRepository);
        jest.clearAllMocks();
    });

    it('should create a portion and invalidate cache', async () => {
        const portionData = { title: 'Studio A', buildingId: 'b123' };
        const mockPortion = { _id: 'p123', ...portionData };
        
        mockPortionRepository.create.mockResolvedValue(mockPortion as any);

        const result = await portionService.createPortion(portionData);

        expect(result).toEqual(mockPortion);
        expect(mockPortionRepository.create).toHaveBeenCalledWith(portionData);
        expect(RedisClientManager.delete).toHaveBeenCalledWith('building-portions:b123');
        expect(RedisClientManager.delete).toHaveBeenCalledWith('portions:all');
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

    it('should update a portion and invalidate cache', async () => {
        const portionId = 'p123';
        const updateData = { title: 'Studio B' };
        const mockPortion = { _id: portionId, title: 'Studio B', buildingId: 'b123' };
        
        mockPortionRepository.update.mockResolvedValue(mockPortion as any);

        const result = await portionService.updatePortion(portionId, updateData);

        expect(result).toEqual(mockPortion);
        expect(mockPortionRepository.update).toHaveBeenCalledWith(portionId, updateData);
        expect(RedisClientManager.delete).toHaveBeenCalledWith('building-portions:b123');
    });

    it('should delete a portion and invalidate cache', async () => {
        const portionId = 'p123';
        const mockPortion = { _id: portionId, buildingId: 'b123' };
        
        mockPortionRepository.delete.mockResolvedValue(mockPortion as any);

        const result = await portionService.deletePortion(portionId);

        expect(result).toEqual(mockPortion);
        expect(mockPortionRepository.delete).toHaveBeenCalledWith(portionId);
        expect(RedisClientManager.delete).toHaveBeenCalledWith('building-portions:b123');
    });
});
