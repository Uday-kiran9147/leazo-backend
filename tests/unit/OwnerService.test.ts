import { OwnerService } from '../../src/services/OwnerService';
import { IOwnerRepository } from '../../src/repositories/OwnerRepository';
import { IUserRepository } from '../../src/repositories/UserRepository';
import { RedisClientManager } from '../../src/cache/RedisClientManager';

// jest.mock('../../src/cache/RedisClientManager');

describe('OwnerService', () => {
    let ownerService: OwnerService;
    let mockOwnerRepository: jest.Mocked<IOwnerRepository>;
    let mockUserRepository: jest.Mocked<IUserRepository>;

    beforeEach(() => {
        mockOwnerRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        } as any;

        mockUserRepository = {
            update: jest.fn(),
        } as any;

        ownerService = new OwnerService(mockOwnerRepository, mockUserRepository);
        jest.clearAllMocks();
    });

    it('should create an owner and update user status', async () => {
        const userId = 'user123';
        const ownerData = { ownerName: 'John Doe' };
        const mockOwner = { _id: 'owner123', ...ownerData, userId };
        
        mockOwnerRepository.create.mockResolvedValue(mockOwner as any);

        const result = await ownerService.createOwner(userId, ownerData);

        expect(result).toEqual(mockOwner);
        expect(mockOwnerRepository.create).toHaveBeenCalledWith({ ...ownerData, userId });
        expect(mockUserRepository.update).toHaveBeenCalledWith(userId, { isOwner: true, ownerId: mockOwner._id });
        // expect(RedisClientManager.delete).toHaveBeenCalledWith(`user:${userId}`); // Handled by repository
    });

    it('should retrieve an owner from repository', async () => {
        const ownerId = 'owner123';
        const mockOwner = { _id: ownerId, ownerName: 'John Doe' };

        mockOwnerRepository.findById.mockResolvedValue(mockOwner as any);

        const result = await ownerService.getOwner(ownerId);

        expect(result).toEqual(mockOwner);
        expect(mockOwnerRepository.findById).toHaveBeenCalledWith(ownerId);
    });

    it('should list owners with pagination', async () => {
        const page = 1;
        const limit = 10;
        const mockOwners = [{ _id: 'owner1', ownerName: 'Owner 1' }];

        mockOwnerRepository.findAll.mockResolvedValue(mockOwners as any);

        const result = await ownerService.listOwners(page, limit);

        expect(result).toEqual(mockOwners);
        expect(mockOwnerRepository.findAll).toHaveBeenCalledWith(page, limit);
    });

    it('should update an owner', async () => {
        const ownerId = 'owner123';
        const updateData = { ownerName: 'Updated Name' };
        const mockOwner = { _id: ownerId, ...updateData };
        
        mockOwnerRepository.update.mockResolvedValue(mockOwner as any);

        const result = await ownerService.updateOwner(ownerId, updateData);

        expect(result).toEqual(mockOwner);
        expect(mockOwnerRepository.update).toHaveBeenCalledWith(ownerId, updateData);
        // expect(RedisClientManager.delete).toHaveBeenCalledWith(`owner:${ownerId}`); // Handled by repository
        // expect(RedisClientManager.deletePattern).toHaveBeenCalledWith('owners:all:*'); // Handled by repository
    });

    it('should delete an owner and update user status', async () => {
        const ownerId = 'owner123';
        const userId = 'user123';
        const mockOwner = { _id: ownerId };
        
        mockOwnerRepository.delete.mockResolvedValue(mockOwner as any);

        const result = await ownerService.deleteOwner(ownerId, userId);

        expect(result).toEqual(mockOwner);
        expect(mockOwnerRepository.delete).toHaveBeenCalledWith(ownerId);
        expect(mockUserRepository.update).toHaveBeenCalledWith(userId, { isOwner: false, ownerId: null });
        // expect(RedisClientManager.delete).toHaveBeenCalledWith(`owner:${ownerId}`); // Handled by repository
        // expect(RedisClientManager.deletePattern).toHaveBeenCalledWith('owners:all:*'); // Handled by repository
    });
});
