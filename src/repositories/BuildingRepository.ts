import { Building } from '../models/building.model';
import mongoose from 'mongoose';

export interface IBuildingRepository {
    create(data: any): Promise<any>;
    findById(id: string): Promise<any>;
    findByOwnerId(ownerId: string, page?: number, limit?: number): Promise<any[]>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
}

export class MongooseBuildingRepository implements IBuildingRepository {
    async create(data: any): Promise<any> {
        const building = new Building(data);
        return await building.save();
    }

    async findById(id: string): Promise<any> {
        return await Building.findById(id).lean();
    }

    async findByOwnerId(ownerId: string, page: number = 1, limit: number = 10): Promise<any[]> {
        return await Building.find({ ownerId })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
    }

    async update(id: string, data: any): Promise<any> {
        return await Building.findOneAndUpdate(
            { _id: id },
            { $set: data },
            { runValidators: true, new: true }
        ).lean();
    }

    async delete(id: string): Promise<any> {
        return await Building.findOneAndDelete({ _id: id });
    }
}
