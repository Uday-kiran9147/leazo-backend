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
        const ownerId = req.body.user?.ownerId;
        const owner = ownerId ? await Owner.findById(ownerId) : null;

        if (!owner) {
            return res.status(403).json(new ApiResponse(403, "Owner profile required", null));
        }

        const planRules = getPlanRules(owner.planId);
        if (planRules.activeListings === -1) return next();

        // Only check if they are already at or over the limit
        if (owner.usage.activeListings >= planRules.activeListings) {
            if (await isActivatingPortion(req)) {
                console.log(`[PlanLimit] Muting activation for owner ${ownerId} (Limit: ${planRules.activeListings})`);
                applyActivationMute(req);
            }
        }

        next();
    } catch (error) {
        console.error("PlanLimitMiddleware Error:", error);
        return res.status(500).json(new ApiResponse(500, "Internal server error checking plan limits", null));
    }
};

/**
 * Determines if the current request is attempting to activate a portion
 */
async function isActivatingPortion(req: Request): Promise<boolean> {
    const { method, body, params, query } = req;

    // For POST, we check the body directly. For others, we check the 'data' wrapper.
    const data = method === "POST" ? body : (body.data || {});
    const wantsActive = data.isActive === true || (method === "POST" && data.isActive !== false);

    if (!wantsActive) return false;
    if (method === "POST") return true;

    // For updates, we only care if it's a transition from inactive to active
    const portionId = params.portionId || body.portionId || query.portionId;
    if (!portionId) return false;

    const portion = await Portion.findById(portionId).select("isActive").lean();
    return !!portion && !portion.isActive;
}

/**
 * Mutes the activation intent in the request body
 */
function applyActivationMute(req: Request) {
    if (req.method === "POST") {
        req.body.isActive = false;
    } else if (req.body.data) {
        req.body.data.isActive = false;
    }
}
