import { IOwnerRepository } from "../repositories/OwnerRepository";
import { IUserRepository } from "../repositories/UserRepository";
import { RedisClientManager } from "../cache/RedisClientManager";

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

        await RedisClientManager.delete(`user:${userId}`);
        await RedisClientManager.deletePattern("owners:all:*");

        return owner;
    }

    async getOwner(id: string) {
        const cacheKey = `owner:${id}`;
        const cached = await RedisClientManager.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const owner = await this.ownerRepository.findById(id);
        if (owner) {
            await RedisClientManager.set(cacheKey, JSON.stringify(owner));
        }
        return owner;
    }

    async listOwners(page: number = 1, limit: number = 10) {
        const cacheKey = `owners:all:p${page}:l${limit}`;
        const cached = await RedisClientManager.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const owners = await this.ownerRepository.findAll(page, limit);
        await RedisClientManager.set(cacheKey, JSON.stringify(owners));
        return owners;
    }

    async updateOwner(id: string, updateData: any) {
        const owner = await this.ownerRepository.update(id, updateData);

        await RedisClientManager.delete(`owner:${id}`);
        await RedisClientManager.deletePattern("owners:all:*");

        return owner;
    }

    async deleteOwner(id: string, userId: string) {
        const owner = await this.ownerRepository.delete(id);

        await this.userRepository.update(userId, {
            isOwner: false,
            ownerId: null
        });

        await RedisClientManager.delete(`owner:${id}`);
        await RedisClientManager.deletePattern("owners:all:*");

        return owner;
    }
}
