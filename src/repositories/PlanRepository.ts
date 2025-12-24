import { Plan, IPlan, UserType } from '../models/plan.model';

export interface IPlanRepository {
  create(data: any): Promise<IPlan>;
  findById(id: string): Promise<IPlan | null>;
  findByNameAndType(name: string, userType: UserType): Promise<IPlan | null>;
  findByType(userType: UserType): Promise<IPlan[]>;
  findAll(): Promise<IPlan[]>;
  update(id: string, data: any): Promise<IPlan | null>;
  delete(id: string): Promise<IPlan | null>;
}

export class MongoosePlanRepository implements IPlanRepository {
  async create(data: any): Promise<IPlan> {
    const plan = new Plan(data);
    return await plan.save();
  }

  async findById(id: string): Promise<IPlan | null> {
    return await Plan.findById(id).lean() as IPlan | null;
  }

  async findByNameAndType(name: string, userType: UserType): Promise<IPlan | null> {
    return await Plan.findOne({ name, userType }).lean() as IPlan | null;
  }

  async findByType(userType: UserType): Promise<IPlan[]> {
    return await Plan.find({ userType, isActive: true }).lean() as IPlan[];
  }

  async findAll(): Promise<IPlan[]> {
    return await Plan.find().lean() as IPlan[];
  }

  async update(id: string, data: any): Promise<IPlan | null> {
    return await Plan.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean() as IPlan | null;
  }

  async delete(id: string): Promise<IPlan | null> {
    return await Plan.findByIdAndDelete(id);
  }
}
