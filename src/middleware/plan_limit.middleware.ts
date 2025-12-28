import { Request, Response, NextFunction } from "express";
import { Owner } from "../models/owner.model";
import { Portion } from "../models/portion.model";
import { getPlanRules } from "../config/ownerConfig";
import ApiResponse from "../utils/api_response";

/**
 * Middleware to enforce owner plan limits before allowing certain actions.
 * Specifically checks for active listings limit.
 */
export const checkPlanLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ownerId = req.body.user.ownerId;
        if (!ownerId) {
            return res.status(403).json(new ApiResponse(403, "Owner profile required to perform this action", null));
        }

        const owner = await Owner.findById(ownerId);
        if (!owner) {
            return res.status(404).json(new ApiResponse(404, "Owner not found", null));
        }

        const planRules = getPlanRules(owner.planId);
        
        // Check active listings limit
        // -1 means unlimited
        if (planRules.activeListings !== -1) {
            let isActivating = false;

            if (req.method === "POST") {
                // For creation, if isActive is not provided it defaults to true
                isActivating = req.body.isActive !== false;
            } else if (req.method === "PATCH" || req.method === "PUT") {
                // For updates, we only care if they are setting isActive to true
                if (req.body.data && req.body.data.isActive === true) {
                    const portionId = req.params.portionId || req.body.portionId || req.query.portionId;
                    if (portionId) {
                        const portion = await Portion.findById(portionId);
                        // Only a limit check if it was previously NOT active
                        if (portion && !portion.isActive) {
                            isActivating = true;
                        }
                    }
                }
            }

            if (isActivating && owner.usage.activeListings >= planRules.activeListings) {
                // update reqbody to not activate
                req.body.data.isActive = false;
                return next();
            }
        }

        next();
    } catch (error) {
        console.error("PlanLimitMiddleware Error:", error);
        return res.status(500).json(new ApiResponse(500, "Internal server error checking plan limits", null));
    }
};
