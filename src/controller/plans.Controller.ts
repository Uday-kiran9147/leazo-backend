import { Request, Response } from "express";
import ApiResponse from "../utils/api_response";
import { handleError } from "../utils/api_error";
import { MongoosePlanRepository, CachedPlanRepository } from "../repositories/PlanRepository";
import { PlanService } from "../services/PlanService";
import { UserType } from "../models/plan.model";

const planRepository = CachedPlanRepository.getInstance(MongoosePlanRepository.getInstance());
const planService = new PlanService(planRepository);

export const getTenantPlans = async (req: Request, res: Response) => {
    try {
        const plans = await planService.getPlans(UserType.TENANT);
        return res.status(200).json(new ApiResponse(200, "Tenant plans fetched successfully", plans));
    } catch (error) {
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

export const getOwnerPlans = async (req: Request, res: Response) => {
    try {
        const plans = await planService.getPlans(UserType.OWNER);
        return res.status(200).json(new ApiResponse(200, "Owner plans fetched successfully", plans));
    } catch (error) {
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};
