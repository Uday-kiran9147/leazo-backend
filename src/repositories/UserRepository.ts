import { User } from '../models/user.model';

export interface IUserRepository {
    create(data: any): Promise<any>;
    findById(id: string): Promise<any>;
    findByEmail(email: string): Promise<any>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
}

export class MongooseUserRepository implements IUserRepository {
    async create(data: any): Promise<any> {
        const user = new User(data);
        return await user.save();
    }

    async findById(id: string): Promise<any> {
        return await User.findById(id).lean();
    }

    async findByEmail(email: string): Promise<any> {
        return await User.findOne({ email }).lean();
    }

    async update(id: string, data: any): Promise<any> {
        return await User.findByIdAndUpdate(id, data, { new: true }).lean();
    }

    async delete(id: string): Promise<any> {
        return await User.findByIdAndDelete(id);
    }
}
