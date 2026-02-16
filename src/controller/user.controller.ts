import { Request, Response } from 'express';
import { User } from '../models/user.model';
import ApiResponse from '../utils/api_response';
import { ApprovalStatus, Portion } from '../models/portion.model';
import { sendPushNotification } from '../utils/push_notifications';
import { handleError } from '../utils/api_error';
import { Notification } from '../models/notification.model';
import { Feedback } from '../models/feedback.model';
import { Owner } from '../models/owner.model';
import { getTenantPlanRules } from '../config/tenantConfig';
import { getPlanRules } from '../config/ownerConfig';
import { logger } from '../utils/logger';
import { MongooseUserRepository, CachedUserRepository } from '../repositories/UserRepository';
import { MongoosePortionRepository, CachedPortionRepository } from '../repositories/PortionRepository';
import { MongooseOwnerRepository, CachedOwnerRepository } from '../repositories/OwnerRepository';
import { RedisClientManager } from '../cache/RedisClientManager';

const userRepository = CachedUserRepository.getInstance(MongooseUserRepository.getInstance());
const portionRepository = CachedPortionRepository.getInstance(MongoosePortionRepository.getInstance());
const ownerRepository = CachedOwnerRepository.getInstance(MongooseOwnerRepository.getInstance());

export const searchPortions = async (req: Request, res: Response) => {
  // /api/users/search?q=hyderabad luxary&limit=10
  const { q, limit = 20 } = req.query;
  logger.debug("Search query received", { query: q, limit });
  
  if (!q || typeof q !== "string") {
    return res.status(400).json(new ApiResponse(400, "Search term is required", null));
  }

  // Split into words & build AND-of-OR query
  const terms = q.trim().split(/\s+/).map(term => new RegExp(term, "i"));

  const mongoQuery = {
    approvalStatus: ApprovalStatus.Approved,
    isActive: true,
    isDeleted: false,
    $and: terms.map(regx => ({
      $or: [
        { "address.state": regx },
        { "address.country": regx },
        { "address.city": regx },
        { "address.locality": regx },
        { title: regx },
        { description: regx }
      ]
    }))
  };

  try {
    // 1. Lazy Boost Expiration
    await Portion.updateMany(
      { isBoosted: true, boostExpiresAt: { $lt: new Date() } },
      { $set: { isBoosted: false } }
    );

    const portions = await Portion.find(mongoQuery)
      .select("-contact")
      .limit(parseInt(limit as string, 10))
      .sort({ isBoosted: -1, createdAt: -1 });

    const responseData = { count: portions.length, portions };
    return res.status(200).json(new ApiResponse(200, "Search results", responseData));

  } catch (error) {
    const apiResponse: ApiResponse = handleError(error, req, res);
    return res.status(apiResponse.status).json(apiResponse);
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const user = req.body.user;
  try {
    if (user) {
      await userRepository.delete(user._id.toString());
      const apiResponse: ApiResponse = new ApiResponse(204, "User deleted successfully", null);
      return res.status(apiResponse.status).json(apiResponse);
    }
    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    let apiResponse: ApiResponse = handleError(error, req, res);
    return res.status(apiResponse.status).json(apiResponse);
  }
}

export const getAllPortions = async (req: Request, res: Response) => {
  try {
    // 1. Lazy Boost Expiration
    const result = await Portion.updateMany(
      { isBoosted: true, boostExpiresAt: { $lt: new Date() } },
      { $set: { isBoosted: false } }
    );

    const cacheKey = "portions:all";

    // If we expired any boosts, invalidate the global cache
    if (result.modifiedCount > 0) {
      await RedisClientManager.delete(cacheKey);
    }

    const cachedPortions = await RedisClientManager.get(cacheKey);

    if (cachedPortions) {
      logger.debug("Serving all portions from cache");
      const apiResponse = new ApiResponse(200, "success", JSON.parse(cachedPortions));
      
      return res.status(apiResponse.status).json(apiResponse);
    }

    /* 
    In Mongoose, .select("-contact") is used for Field Projection.
    Specifically, the minus sign (-) tells MongoDB to exclude the contact field from the results.
    */
    const portions = await Portion.find({ approvalStatus: ApprovalStatus.Approved, isActive: true, isDeleted: false })
      .select("-contact")
      .sort({ isBoosted: -1, createdAt: -1 });
    const responseData = { count: portions.length, portions };

    // Cache result with expiration time
    await RedisClientManager.set(cacheKey, JSON.stringify(responseData),);

    const apiResponse = new ApiResponse(200, "success", responseData);
    return res.status(apiResponse.status).json(apiResponse);
  } catch (error) {
    const apiResponse: ApiResponse = handleError(error, req, res);
    return res.status(apiResponse.status).json(apiResponse);
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    // Check Redis cache
    const cacheKey = "users:all";
    const cachedUsers = await RedisClientManager.get(cacheKey);

    if (cachedUsers) {
      logger.debug("Serving all users from cache");
      const apiResponse = new ApiResponse(200, "success", JSON.parse(cachedUsers));
      return res.status(apiResponse.status).json(apiResponse);
    }

    // Fetch from database if not in cache
    const users = await User.find();
    const responseData = { count: users.length, users };

    // Cache result with expiration time
    await RedisClientManager.set(cacheKey, JSON.stringify(responseData), /* 300 */); // cache for 5 minutes

    const apiResponse = new ApiResponse(200, "success", responseData);
    return res.status(apiResponse.status).json(apiResponse);
  } catch (error) {
    const apiResponse: ApiResponse = handleError(error, req, res);
    return res.status(apiResponse.status).json(apiResponse);
  }
};

export const getNotifications = async (req: Request, res: Response) => {
  const userId = req.body.user._id;
  try {
    const notifications = await Notification.getNotifications(userId);
    const apiResponse = new ApiResponse(200, "Notifications fetched successfully", notifications);
    return res.status(apiResponse.status).json(apiResponse);
  } catch (error) {
    const apiResponse: ApiResponse = handleError(error, req, res);
    return res.status(apiResponse.status).json(apiResponse);
  }
}

export const submitFeedback = async (req: Request, res: Response) => {
  const { feedback, userId } = req.body;

  if (!feedback || !userId) {
    return res.status(400).json(new ApiResponse(400, "Feedback and userId are required", null));
  }
  try {
    const newFeedback = await Feedback.submitFeedback(userId, feedback);
    const apiResponse = new ApiResponse(201, "Feedback submitted successfully", newFeedback);
    return res.status(apiResponse.status).json(apiResponse);
  } catch (error) {
    const apiResponse: ApiResponse = handleError(error, req, res);
    return res.status(apiResponse.status).json(apiResponse);
  }
}

export const getFeedbacks = async (req: Request, res: Response) => {
  try {
    const feedbacks = await Feedback.getFeedBacks();
    const apiResponse = new ApiResponse(200, "Feedbacks fetched successfully", feedbacks);
    return res.status(apiResponse.status).json(apiResponse);
  } catch (error) {
    const apiResponse: ApiResponse = handleError(error, req, res);
    return res.status(apiResponse.status).json(apiResponse);
  }
}

export const markAsRead = async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  try {
    await Notification.markAsRead(id as string);
    const apiResponse = new ApiResponse(200, "Notification marked as read successfully", null);
    return res.status(apiResponse.status).json(apiResponse);
  } catch (error) {
    const apiResponse: ApiResponse = handleError(error, req, res);
    return res.status(apiResponse.status).json(apiResponse);
  }
}

export const createUser = async (req: Request, res: Response) => {
  const user = new User(req.body);
  try {
    await user.save();
    const token = await user.generateAccessToken();
    const response = new ApiResponse(201, "Account created successfully", {user, token});
    res.status(response.status).json(response);

    // Clear the users list cache after creating a new user
    await RedisClientManager.delete("users:all");

    setTimeout(async () => {
      try {
        await sendNewUserNotification(user);
        logger.debug("New User notification sent successfully");
      } catch (error) {
        logger.error("Failed to send New User notification", error);
      }
    }, 5 * 60000); 

  } catch (error) {
    const apiResponse: ApiResponse = handleError(error, req, res);
    return res.status(apiResponse.status).json(apiResponse);
  }
}
async function sendNewUserNotification(user: any) {
  if (user.deviceToken) {
    try {
      await sendPushNotification(user.deviceToken, "Welcome to Leazo! 🏡", "Your account has been successfully created. Explore amazing rooms available for rent and start your journey with Leazo!");
        // Create a notification for the user
        const notification = await (Notification as any).createNotification(
          user._id,
          "Welcome to Leazo! 🏡",
          "Your account has been successfully created. Explore amazing rooms available for rent and start your journey with Leazo!",
          'info'
        );
      logger.info("Push notification sent to new user", { user: user._id });
    } catch (error) {
      logger.error("Failed to send push notification to new user", error);
    }
  } else {
    logger.warn("No device token found for new user. Notification skipped.", { user: user._id });
  }
}




/**
 * Handles the request to get a user.
 * 
 * @param req - The request object containing the user data.
 * @param res - The response object used to send back the appropriate response.
 * @returns A JSON response with the user data if found, or an error message if not found.
 * 
 * @throws Will return an error response if an exception occurs during the process.
 */
export const getUser = async (req: Request, res: Response) => {
  try {
    const user = req.body.user;

    if (user) {
      const userData = await userRepository.findById(user._id.toString());
      const apiResponse = new ApiResponse(200, "User fetched successfully", userData || user);
      return res.status(apiResponse.status).json(apiResponse);
    }

    const apiResponse = new ApiResponse(404, "User not found", null);
    return res.status(apiResponse.status).json(apiResponse);
  } catch (error) {
    const apiResponse: ApiResponse = handleError(error, req, res);
    return res.status(apiResponse.status).json(apiResponse);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  let missingFields: string[] = [];
  const { firstName, lastName } = req.body;
  if (!firstName && !lastName) {
    missingFields.push('firstName');
    missingFields.push('lastName');
    return res.status(400).json(new ApiResponse(400, `Please provide any of ${missingFields.join(',')}`, null));
  }
  const user = req.body.user;
  try {
    const updatedUser = await userRepository.update(user._id.toString(), {
      firstName,
      lastName,
    });

    if (!updatedUser) {
      return res.status(404).json(new ApiResponse(404, "User not found", null));
    }

    setTimeout(async () => {
      try {
        if (user.deviceToken) {
          await sendPushNotification(user.deviceToken, "Profile Updated 🎉", "Great job! Your profile has been successfully updated. Everything’s looking good!");
        }
        logger.debug("Profile update notification sent successfully", { user: user._id });
      } catch (error) {
        logger.error("Failed to send profile update notification", error);
      }
    }, 30000); // 30 seconds

    const apiResponse = new ApiResponse(200, "User updated successfully", updatedUser);
    return res.status(apiResponse.status).json(apiResponse);

  } catch (error) {
    let apiResponse: ApiResponse = handleError(error, req, res);
    return res.status(apiResponse.status).json(apiResponse);
  }
};

export const revealPortionContact = async (req: Request, res: Response) => {
  const { portionId } = req.body;
  const user = req.body.user;

  if (!portionId) {
    return res.status(400).json(new ApiResponse(400, "Portion ID is required", null));
  }

  try {
    const portion = await portionRepository.findById(portionId);
    if (!portion) {
      return res.status(404).json(new ApiResponse(404, "Portion not found", null));
    }

    const tenant = await userRepository.findById(user._id.toString());
    if (!tenant) {
      return res.status(404).json(new ApiResponse(404, "Tenant not found", null));
    }

    const owner = await ownerRepository.findById(portion.ownerId.toString());
    if (!owner) {
      return res.status(404).json(new ApiResponse(404, "Owner not found", null));
    }

    const tenantPlanId = (tenant.planId || "tenant_free") as any;
    const tenantPlan = getTenantPlanRules(tenantPlanId);
    const tenantUsed = tenant.usage?.ownerContactsUsed || 0;

    if (tenantPlan.ownerContacts !== -1 && tenantUsed >= tenantPlan.ownerContacts) {
      return res.status(403).json(new ApiResponse(403, "Tenant contact limit reached. Upgrade your plan.", null));
    }

    const ownerPlanId = (owner.planId || "owner_free") as any;
    const ownerPlan = getPlanRules(ownerPlanId);
    const ownerUsed = owner.usage?.tenantContactsUsed || 0;

    if (ownerPlan.tenantContacts !== -1 && ownerUsed >= ownerPlan.tenantContacts) {
      return res.status(403).json(new ApiResponse(403, "This owner has reached their tenant contact limit.", null));
    }

    await userRepository.update(tenant._id.toString(), { $inc: { "usage.ownerContactsUsed": 1 } });
    await ownerRepository.update(owner._id.toString(), { $inc: { "usage.tenantContactsUsed": 1 } });

    try {
      await (Notification as any).createNotification(
        owner.userId,
        "Contact viewed! 📞",
        `${tenant.firstName} viewed your contact for ${portion.title}.`,
        "info"
      );

      const ownerUser = await userRepository.findById(owner.userId.toString());
      if (ownerUser?.deviceToken) {
        await sendPushNotification(
          ownerUser.deviceToken,
          "Contact viewed! 📞",
          `${tenant.firstName} viewed your contact for ${portion.title}.`
        );
      }
    } catch (notifError) {
      logger.error("Failed to notify owner about contact reveal", notifError);
      // Don't fail the request if notification fails
    }

    // Invalidate caches
    await RedisClientManager.delete(`user:${tenant._id}`);
    await RedisClientManager.delete(`owner:${owner._id}`);

    return res.status(200).json(new ApiResponse(200, "Contact viewed successfully", portion.contact));

  } catch (error) {
    const apiResponse: ApiResponse = handleError(error, req, res);
    return res.status(apiResponse.status).json(apiResponse);
  }
};
