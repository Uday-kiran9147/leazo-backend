import { IUserRepository } from '../repositories/UserRepository';

export class UserService {
    constructor(private userRepository: IUserRepository) {}

    async getUser(id: string) {
        return await this.userRepository.findById(id);
    }

    async updateProfile(id: string, updateData: any) {
        return await this.userRepository.update(id, updateData);
    }
}
