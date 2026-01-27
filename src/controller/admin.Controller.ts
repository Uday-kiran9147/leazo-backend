import { Request, Response, Router } from "express";
import { Portion } from "../models/portion.model";
import { User } from "../models/user.model";
import { handleError } from "../utils/api_error";
import ApiResponse from "../utils/api_response";
import { sendPushNotification } from "../utils/push_notifications";
import { Owner } from "../models/owner.model";
import { RedisClientManager } from "../cache/RedisClientManager";
import { Building } from "../models/building.model";
import { Notification } from "../models/notification.model";
import { MongoosePortionRepository } from "../repositories/PortionRepository";
import { MongooseOwnerRepository } from "../repositories/OwnerRepository";
import { PortionService } from "../services/PortionService";
import { logger } from "../utils/logger";

/**
 * Helper function to fetch user device tokens with names
 * Returns array of users with _id, name, and deviceToken
 */
const getUserDeviceTokens = async () => {
    const users = await User.find({ deviceToken: { $exists: true, $ne: null } })
        .select('_id firstName lastName deviceToken')
        .lean();

    return users.map(user => ({
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        deviceToken: user.deviceToken
    }));
};

/**
 * Send notification to all users (Admin/Moderator only)
 */
export const sendNotificationToUsers = async (req: Request, res: Response) => {
    try {
        const { title, body, type = 'info' } = req.body;

        // Validate required fields
        if (!title || !body) {
            return res.status(400).json(new ApiResponse(400, "Title and body are required", null));
        }

        // Fetch all users
        const users = await User.find({}).select('_id deviceToken').lean();

        if (users.length === 0) {
            return res.status(404).json(new ApiResponse(404, "No users found", null));
        }

        // Get users with device tokens for push notifications
        const usersWithTokens = await getUserDeviceTokens();
        const tokenMap = new Map(usersWithTokens.map(u => [u._id.toString(), u.deviceToken]));

        // Create notifications and send push notifications in parallel
        const notificationPromises = users.map(async (user) => {
            // Save notification to database
            await Notification.createNotification(
                user._id,
                title,
                body,
                type,
                { sentBy: req.body.user._id, sentByRole: req.body.user.role }
            );

            // Send push notification if user has device token
            const deviceToken = tokenMap.get(user._id.toString());
            if (deviceToken) {
                try {
                    await sendPushNotification(deviceToken, title, body);
                } catch (pushError) {
                    logger.error(`Failed to send push notification to user`, { user: user._id, error: pushError });
                }
            }
        });

        await Promise.all(notificationPromises);

        return res.status(200).json(new ApiResponse(200, `Notification sent to ${users.length} user(s) successfully`, {
            totalUsers: users.length,
            pushNotificationsSent: usersWithTokens.length,
            title,
            body
        }));
    } catch (error) {
        const apiError = handleError(error, req, res);
        return res.status(apiError.status).json(apiError);
    }
};
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find({}).sort({ createdAt: -1 });
        return res.status(200).json(new ApiResponse(200, "Users fetched successfully.", users));
    } catch (error) {
        const apiError = handleError(error, req, res);
        return res.status(apiError.status).json(apiError);
    }
}

export const getUserRolesDistribution = async (req: Request, res: Response) => {
    try {
        const distribution = await User.aggregate([
            { $group: { _id: "$role", value: { $sum: 1 } } },
            { $project: { name: "$_id", value: 1, _id: 0 } }
        ]);
        return res.status(200).json(new ApiResponse(200, "User roles distribution fetched successfully.", distribution));
    } catch (error) {
        const apiError = handleError(error, req, res);
        return res.status(apiError.status).json(apiError);
    }
}

const portionRepository = new MongoosePortionRepository();
const ownerRepository = new MongooseOwnerRepository();
const portionService = new PortionService(portionRepository, ownerRepository);

interface DashboardStats {
    totalListings: number;
    activeListings: number;
    pendingInquiries: number;
    holdInquiries: number;
    occupiedPortions: number;
    rejectedPortions: number;
    occupancyRate?: string;
    totalBuildings?: number;
    totalUsers?: number;
    totalOwners?: number;
}

export const getDashboardStats = async (_: Request, res: Response) => {
    logger.debug("Fetching dashboard stats");
    
    try {
        const stats: DashboardStats[] = await Portion.aggregate([
            {
                $group: {
                    _id: null,
                    totalListings: { $sum: 1 },
                    activeListings: { 
                        $sum: { 
                            $cond: [
                                { 
                                    $and: [
                                        { $eq: ["$availabilityStatus", "available"] },
                                        { $eq: ["$approvalStatus", "Approved"] }
                                    ] 
                                }, 
                                1, 
                                0
                            ] 
                        } 
                    },
                    pendingInquiries: { 
                        $sum: { 
                            $cond: [
                                { $eq: ["$approvalStatus", "Review"] }, 
                                1, 
                                0
                            ] 
                        } 
                    },
                    holdInquiries: { 
                        $sum: { 
                            $cond: [
                                { $eq: ["$approvalStatus", "Hold"] }, 
                                1, 
                                0
                            ] 
                        } 
                    },
                    occupiedPortions: { 
                        $sum: { 
                            $cond: [
                                { 
                                    $and: [
                                        { $eq: ["$availabilityStatus", "not available"] },
                                        { $eq: ["$approvalStatus", "Approved"] }
                                    ]
                                }, 
                                1, 
                                0
                            ] 
                        } 
                    },
                    rejectedPortions: { 
                        $sum: { 
                            $cond: [
                                { $eq: ["$approvalStatus", "Rejected"] }, 
                                1, 
                                0
                            ] 
                        } 
                    }
                }
            }
        ]);

        const totalBuildings = await Building.countDocuments({});
        const totalUsers = await User.countDocuments({});
        const totalOwners = await Owner.countDocuments({});

        const defaultStats: DashboardStats = {
            totalListings: 0,
            activeListings: 0,
            pendingInquiries: 0,
            holdInquiries: 0,
            occupiedPortions: 0,
            rejectedPortions: 0,
            occupancyRate: "0%",
            totalBuildings,
            totalUsers,
            totalOwners
        };

        const resultStats = stats.length > 0 ? { ...stats[0], totalBuildings, totalUsers, totalOwners } : defaultStats;

        const approvedPortions = resultStats.activeListings + resultStats.occupiedPortions;
        resultStats.occupancyRate = approvedPortions > 0
            ? `${((resultStats.occupiedPortions / approvedPortions) * 100).toFixed(2)}%`
            : "0%";

        return res.status(200).json(new ApiResponse(200, "Dashboard statistics fetched successfully.", resultStats));

    } catch (error) {
        logger.error("Error fetching dashboard stats", error);
        return res.status(500).json({ 
            message: "Failed to fetch dashboard statistics",
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};


async function clearPortionsCache() {
    logger.debug("Portions cache cleared");
    await RedisClientManager.delete("portions:all");
}
async function clearUsersCache() {
    logger.debug("Users cache cleared");
    await RedisClientManager.delete("users:all");
}
export const UpdateRole = async (req: Request, res: Response) => {
    logger.debug(`Update Role request: ${req.originalUrl}`);

    const validRoles = ["Admin", "User", "Moderator"];
    const { id } = req.params;
    const { role } = req.body;
    if (!role || !id) {
        return res.status(400).json({ message: "Role and ID are required" });
    }
    if (req.body.user.role !== 'Admin') {
        return res.status(403).json({ message: "Only Admins can update user roles." });
    }
    if (req.body.user.role === role) {
        return res.status(400).json({ message: "User already has this role" });
    }
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role provided." });
    }
    // Find the user and update the role
    try {
        var apiResponse: ApiResponse;
        const updatedUser = await User.findByIdAndUpdate(id, { role: role }, { new: true });
        if (!updatedUser) {
            apiResponse = new ApiResponse(404, "User not found.");
            return res.status(apiResponse.status).json(apiResponse);
        }
        await clearUsersCache();
        apiResponse = new ApiResponse(200, `Role updated to ${role}`, updatedUser);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        var apiError = handleError(error, req, res);
        return res.status(apiError.status).json(apiError);
    }

}
export const getPortionsByStatus = async (req: Request, res: Response) => {
    logger.debug(`Get Portions By Status: ${req.originalUrl}`);
    try {
        const { status } = req.params;
        logger.debug("Requested status", { status });

        const portions = await Portion.find({ approvalStatus: status });
        var apiResponse: ApiResponse;
        if (!portions) {
            apiResponse = new ApiResponse(404, "No portions found.");
            return res.status(apiResponse.status).json(apiResponse);
        }
        apiResponse = new ApiResponse(200, "Portions found.", { count: portions.length, portions: portions });
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        var apiError = handleError(error, req, res);
        return res.status(apiError.status).json(apiError);
    }
}
export const UpdatePortionStatus = async (req: Request, res: Response) => {
    try {
        const { id: portionId, status } = req.params;

        // Validate the status 📝, ⏸️, ✅, ❌
        const validStatuses = ["Review", "Hold", "Approved", "Rejected"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid approval status provided." });
        }

        const updateData: any = { approvalStatus: status };

        // Automatically deactivate if rejected or on hold to free up plan limit slots
        if (status === "Rejected" || status === "Hold") {
            updateData.isActive = false;
        }

        const updatedPortion = await portionService.updatePortion(portionId, updateData);

        if (!updatedPortion) {
            return res.status(404).json(new ApiResponse(404, "Portion not found."));
        }

        const apiResponse = new ApiResponse(200, `Portion status updated to ${status} successfully.`, updatedPortion);
        const owner = await Owner.findById(updatedPortion.ownerId);
        if (!owner) {
            return res.status(404).json(new ApiResponse(404, "Owner not found."));
        }

        const user = await User.findById(owner.userId);
        const message = `Your portion, "${updatedPortion.title}", has been ${getStatusMessage(status)}.`;
        const emoji = getStatusEmoji(status);

        if (user && user.deviceToken) {
            await sendPushNotification(user.deviceToken, `${status}${emoji}`, message);
            const notification = Notification.createNotification(
                user._id,
                `${status}${emoji}`,
                message,
            );
            (await notification).save();
        }

        await clearPortionsCache();
        return res.status(200).json(apiResponse);
    } catch (error) {
        logger.error("Error updating portion status", error);
        const apiError = handleError(error, req, res);
        res.status(apiError.status).json(apiError);
    }
};

export const getStatusEmoji = function (status: String) {
    switch (status) {
        case "Review":
            return "📝";
        case "Hold":
            return "⏸️";
        case "Approved":
            return "✅";
        case "Rejected":
            return "❌";
        default:
            return "";
    }
}

export const getStatusMessage = (status: String) => {
    switch (status) {
        case "Review":
            return "under review";
        case "Hold":
            return "on hold";
        case "Approved":
            return "approved";
        case "Rejected":
            return "rejected";
        default:
            return "";
    }
}