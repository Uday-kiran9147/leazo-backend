import { Owner } from '../models/owner.model';

export interface IOwnerRepository {
    create(data: any): Promise<any>;
    findById(id: string): Promise<any>;
    findAll(page?: number, limit?: number): Promise<any[]>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
}

export class MongooseOwnerRepository implements IOwnerRepository {
    async create(data: any): Promise<any> {
        const owner = new Owner(data);
        return await owner.save();
    }

    async findById(id: string): Promise<any> {
        return await Owner.findById(id).lean();
    }

    async findAll(page: number = 1, limit: number = 10): Promise<any[]> {
        return await Owner.find()
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
    }

    async update(id: string, data: any): Promise<any> {
        return await Owner.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    }

    async delete(id: string): Promise<any> {
        return await Owner.findByIdAndDelete(id);
    }
}
