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
  private static instance: MongoosePlanRepository;

  private constructor() { }

  public static getInstance(): MongoosePlanRepository {
    if (!MongoosePlanRepository.instance) {
      MongoosePlanRepository.instance = new MongoosePlanRepository();
    }
    return MongoosePlanRepository.instance;
  }
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

import { RedisClientManager } from '../cache/RedisClientManager';

export class CachedPlanRepository implements IPlanRepository {
  private static instance: CachedPlanRepository;

  private constructor(private baseRepo: IPlanRepository) { }

  public static getInstance(baseRepo: IPlanRepository): CachedPlanRepository {
    if (!CachedPlanRepository.instance) {
      CachedPlanRepository.instance = new CachedPlanRepository(baseRepo);
    }
    return CachedPlanRepository.instance;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    const cached = await RedisClientManager.get(key);
    if (!cached) return null;
    if (typeof cached === 'string') {
      return JSON.parse(cached);
    }
    return cached as T;
  }

  async create(data: any): Promise<IPlan> {
    const plan = await this.baseRepo.create(data);
    await RedisClientManager.deletePattern('plans:*');
    return plan;
  }

  async findById(id: string): Promise<IPlan | null> {
    const cacheKey = `plans:id:${id}`;
    const cached = await this.getFromCache<IPlan>(cacheKey);
    if (cached) return cached;

    const plan = await this.baseRepo.findById(id);
    if (plan) {
      await RedisClientManager.set(cacheKey, plan);
    }
    return plan;
  }

  async findByNameAndType(name: string, userType: UserType): Promise<IPlan | null> {
    const cacheKey = `plans:name:${name}:type:${userType}`;
    const cached = await this.getFromCache<IPlan>(cacheKey);
    if (cached) return cached;

    const plan = await this.baseRepo.findByNameAndType(name, userType);
    if (plan) {
      await RedisClientManager.set(cacheKey, plan);
    }
    return plan;
  }

  async findByType(userType: UserType): Promise<IPlan[]> {
    const cacheKey = `plans:type:${userType}`;
    const cached = await this.getFromCache<IPlan[]>(cacheKey);
    if (cached) return cached;

    const plans = await this.baseRepo.findByType(userType);
    await RedisClientManager.set(cacheKey, plans);
    return plans;
  }

  async findAll(): Promise<IPlan[]> {
    const cacheKey = 'plans:all';
    const cached = await this.getFromCache<IPlan[]>(cacheKey);
    if (cached) return cached;

    const plans = await this.baseRepo.findAll();
    await RedisClientManager.set(cacheKey, plans);
    return plans;
  }

  async update(id: string, data: any): Promise<IPlan | null> {
    const plan = await this.baseRepo.update(id, data);
    if (plan) {
      await RedisClientManager.deletePattern('plans:*');
    }
    return plan;
  }

  async delete(id: string): Promise<IPlan | null> {
    const plan = await this.baseRepo.delete(id);
    if (plan) {
      await RedisClientManager.deletePattern('plans:*');
    }
    return plan;
  }
}
