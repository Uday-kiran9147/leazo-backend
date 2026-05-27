import { Request, Response, NextFunction } from "express";
import { Owner } from "../models/owner.model";
import ApiResponse from "../utils/api_response";
import { logger } from "../utils/logger";

/**
 * Checks if a date is in the past (plan has expired).
 */
function isPlanExpired(planExpiresAt: Date | undefined | null): boolean {
    if (!planExpiresAt) return false; // No expiry set (free plan or legacy) — not expired
    return new Date(planExpiresAt) < new Date();
}

/**
 * Middleware to reject premium owner actions when the owner's plan has expired.
 * 
 * Checks the Owner document linked to the authenticated user.
 * If the plan is expired and not already on 'owner_free', returns 403.
 * Free-plan owners are allowed through (they have their own limit checks elsewhere).
 */
export const checkOwnerPlanExpiry = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ownerId = req.body?.user?.ownerId;

        if (!ownerId) {
            return res.status(403).json(new ApiResponse(403, "Owner profile required", null));
        }

        const owner = await Owner.findById(ownerId).select('planId planExpiresAt').lean();

        if (!owner) {
            return res.status(404).json(new ApiResponse(404, "Owner not found", null));
        }

        // Free plan users pass through — they have separate limit checks
        if (owner.planId === 'owner_free') {
            return next();
        }

        // Check if the paid plan has expired
        if (isPlanExpired(owner.planExpiresAt)) {
            logger.warn(`[PlanExpiry] Blocking expired owner from premium action`, {
                owner: ownerId,
                plan: owner.planId,
                expiredAt: owner.planExpiresAt
            });
            return res.status(403).json(
                new ApiResponse(403, "Your owner plan has expired. Please renew to continue using premium features.", null)
            );
        }

        next();
    } catch (error) {
        logger.error("[PlanExpiry] Error in checkOwnerPlanExpiry middleware", error);
        return res.status(500).json(new ApiResponse(500, "Internal server error checking plan status", null));
    }
};

/**
 * Middleware to reject premium tenant actions when the user's plan has expired.
 * 
 * Checks the authenticated user's plan fields directly from req.body.user
 * (populated by the auth middleware).
 * If the plan is expired and not on 'tenant_free', returns 403.
 */
export const checkTenantPlanExpiry = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.body?.user;

        if (!user) {
            return res.status(401).json(new ApiResponse(401, "Authentication required", null));
        }

        const planId = user.planId || 'tenant_free';

        // Free plan users pass through
        if (planId === 'tenant_free') {
            return next();
        }

        // Check if the paid plan has expired
        if (isPlanExpired(user.planExpiresAt)) {
            logger.warn(`[PlanExpiry] Blocking expired tenant from premium action`, {
                user: user._id,
                plan: planId,
                expiredAt: user.planExpiresAt
            });
            return res.status(403).json(
                new ApiResponse(403, "Your tenant plan has expired. Please renew to continue using premium features.", null)
            );
        }

        next();
    } catch (error) {
        logger.error("[PlanExpiry] Error in checkTenantPlanExpiry middleware", error);
        return res.status(500).json(new ApiResponse(500, "Internal server error checking plan status", null));
    }
};
