import { Portion } from '../models/portion.model';

export interface IPortionRepository {
    create(data: any): Promise<any>;
    findById(id: string): Promise<any>;
    findByBuildingId(buildingId: string, page?: number, limit?: number): Promise<any[]>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
    countActiveByOwner(ownerId: string): Promise<number>;
}

export class MongoosePortionRepository implements IPortionRepository {
    async create(data: any): Promise<any> {
        const portion = new Portion(data);
        return await portion.save();
    }

    async findById(id: string): Promise<any> {
        return await Portion.findById(id).lean();
    }

    async findByBuildingId(buildingId: string, page: number = 1, limit: number = 10): Promise<any[]> {
        return await Portion.find({ buildingId, isDeleted: false })
            // .skip((page - 1) * limit)
            // .limit(limit)
            // .lean();
    }

    async update(id: string, data: any): Promise<any> {
        return await Portion.findOneAndUpdate(
            { _id: id },
            { $set: data },
            { runValidators: true, new: true }
        ).lean();
    }

    async delete(id: string): Promise<any> {
        return await Portion.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { $set: { isDeleted: true } },
            { new: true }
        ).lean();
    }

    async countActiveByOwner(ownerId: string): Promise<number> {
        return await Portion.countDocuments({
            ownerId,
            isActive: true,
            isDeleted: false
        });
    }
}
