import { IOwnerRepository } from "../repositories/OwnerRepository";
import { IUserRepository } from "../repositories/UserRepository";

export class OwnerService {
    constructor(
        private ownerRepository: IOwnerRepository,
        private userRepository: IUserRepository
    ) {}

    async createOwner(userId: string, ownerData: any) {
        const owner = await this.ownerRepository.create({ ...ownerData, userId });

        await this.userRepository.update(userId, {
            isOwner: true,
            ownerId: owner._id
        });

        // Note: User caching might still be handled manually or we could create a CachedUserRepository
        return owner;
    }

    async getOwner(id: string) {
        return await this.ownerRepository.findById(id);
    }

    async listOwners(page: number = 1, limit: number = 10) {
        return await this.ownerRepository.findAll(page, limit);
    }

    async updateOwner(id: string, updateData: any) {
        return await this.ownerRepository.update(id, updateData);
    }

    async deleteOwner(id: string, userId: string) {
        const owner = await this.ownerRepository.delete(id);

        await this.userRepository.update(userId, {
            isOwner: false,
            ownerId: null
        });

        return owner;
    }
}
