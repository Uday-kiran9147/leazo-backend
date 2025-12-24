import { UserService } from '../../src/services/UserService';
import { IUserRepository } from '../../src/repositories/UserRepository';

describe('UserService', () => {
    let userService: UserService;
    let mockUserRepository: jest.Mocked<IUserRepository>;

    beforeEach(() => {
        mockUserRepository = {
            findById: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        } as any;

        userService = new UserService(mockUserRepository);
    });

    it('should retrieve a user by id', async () => {
        const mockUser = { _id: '123', firstName: 'John' };
        mockUserRepository.findById.mockResolvedValue(mockUser as any);

        const result = await userService.getUser('123');
        expect(result).toEqual(mockUser);
        expect(mockUserRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should update a user profile', async () => {
        const updateData = { firstName: 'Jane' };
        const mockUpdatedUser = { _id: '123', ...updateData };
        mockUserRepository.update.mockResolvedValue(mockUpdatedUser as any);

        const result = await userService.updateProfile('123', updateData);
        expect(result).toEqual(mockUpdatedUser);
        expect(mockUserRepository.update).toHaveBeenCalledWith('123', updateData);
    });
});
