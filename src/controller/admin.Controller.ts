import { Request, Response, Router } from "express";
import { isAdminMiddleware } from "../middleware/isAdmin.middleware";
import { Portion } from "../models/portion.model";
import { adminRouter } from "../routes/adminRoutes";
import { User } from "../models/user.model";
import { handleError } from "../utils/api_error";
import ApiResponse from "../utils/api_response";
import { sendPushNotification } from "../utils/push_notifications";
import { Owner } from "../models/owner.model";

export const UpdateRole = async (req: Request, res: Response) => {
    console.log(req.originalUrl);

    const validRoles = ["Admin", "User", "Moderator"];
    const { id } = req.params;
    const { role } = req.body;
    if (!role || !id) {
        return res.status(400).json({ message: "Role and ID are required" });
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
        apiResponse = new ApiResponse(200, `Role updated to ${role}`, updatedUser);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        var apiError = handleError(error, req, res);
        return res.status(apiError.status).json(apiError);
    }

}
export const getPortionsByStatus = async (req:Request,res:Response)=>{
    console.log(req.originalUrl);
    try {
        const { status } = req.params;
        console.log(status);
        
        const portions = await Portion.find({ approvalStatus: status });
        var apiResponse: ApiResponse;
        if (!portions) {
            apiResponse = new ApiResponse(404, "No portions found.");
            return res.status(apiResponse.status).json(apiResponse);
        }
        apiResponse = new ApiResponse(200, "Portions found.", {count:portions.length,portions:portions});
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        var apiError = handleError(error, req, res);
        return res.status(apiError.status).json(apiError);
    }
}
export const UpdatePortionStatus = async (req: Request, res: Response) => {
    console.log(req.originalUrl);

    try {
        const { id: portionId, status } = req.params;

        // Validate the status 📝, ⏸️, ✅, ❌
        const validStatuses = ["Review", "Hold", "Approved", "Rejected"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid approval status provided." });
        }

        // Find and update the portion's approval status
        const updatedPortion = await Portion.findByIdAndUpdate(
            portionId,
            { approvalStatus: status },
            { new: true }
        );
        var apiResponse: ApiResponse;
        if (!updatedPortion) {
            apiResponse = new ApiResponse(404, "Portion not found.");
            return res.status(apiResponse.status).json(apiResponse);
        }
        apiResponse = new ApiResponse(200, `Portion status updated to ${status} successfully.`, updatedPortion);
        var owner = await Owner.findById(updatedPortion.ownerId);
        if (!owner) {
            apiResponse = new ApiResponse(404, "Owner not found.");
            return res.status(apiResponse.status).json(apiResponse);
        }
        var user = await User.findById(owner?.userId);
        var message = `Your portion, "${updatedPortion.title}", has been ${getStatusMessage(status)}.`;

        var emoji = getStatusEmoji(status);
        if (user && user.deviceToken) {
            await sendPushNotification(user.deviceToken,`${status}${emoji}`, message);
            console.log(status + emoji);
            console.log(message);
        }
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        console.error("Error updating portion status:", error);
        var apiError = handleError(error, req, res);
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