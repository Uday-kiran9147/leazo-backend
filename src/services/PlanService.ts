import { IPlanRepository } from '../repositories/PlanRepository';
import { UserType, IPlan } from '../models/plan.model';

export class PlanService {
  constructor(private planRepository: IPlanRepository) {}

  async getPlans(userType: UserType): Promise<IPlan[]> {
    return await this.planRepository.findByType(userType);
  }

  async createPlan(data: any): Promise<IPlan> {
    return await this.planRepository.create(data);
  }

  async updatePlan(id: string, data: any): Promise<IPlan | null> {
    return await this.planRepository.update(id, data);
  }

  async deletePlan(id: string): Promise<IPlan | null> {
    return await this.planRepository.delete(id);
  }
}
