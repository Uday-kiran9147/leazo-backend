import { Router } from "express";
import { getOwnerPlans, getTenantPlans } from "../controller/plans.Controller";

const plansRouter = Router();

plansRouter.get('/tenant', getTenantPlans);
plansRouter.get('/owner', getOwnerPlans);

export default plansRouter;
