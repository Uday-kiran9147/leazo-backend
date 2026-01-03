import { Request, Response } from 'express';
import { User } from '../models/user.model';
import ApiResponse from '../utils/api_response';
import { ApprovalStatus, Portion } from '../models/portion.model';
import { sendPushNotification } from '../utils/push_notifications';
import { handleError } from '../utils/api_error';
import { RedisClientManager } from '../cache/RedisClientManager';
import { Notification } from '../models/notification.model';
import { Feedback } from '../models/feedback.model';
import { Owner } from '../models/owner.model';
import { getTenantPlanRules } from '../config/tenantConfig';
import { getPlanRules } from '../config/ownerConfig';



export const searchPortions = async (req: Request, res: Response) => {
  // /api/users/search?q=hyderabad luxary&limit=10
  const { q, limit = 20 } = req.query;
  console.log("Search query:", q, "Limit:", limit);
  
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



/**
 * Deletes a user based on the provided request body.
 *
 * @param req - The request object containing the user information.
 * @param res - The response object to send the result of the deletion.
 * @returns A JSON response indicating the success or failure of the deletion operation.
 *
 * @remarks
 * - If the user is found and deleted successfully, a 200 status code with a success message is returned.
 * - If the user is not found, a 404 status code with an error message is returned.
 * - If an error occurs during the deletion process, the error is handled and an appropriate response is returned.
 */
export const deleteUser = async (req: Request, res: Response) => {
  const user = req.body.user;
  try {
    if (user) {
      await User.findByIdAndDelete({ id: user._id })
      /**
       * Creates a new ApiResponse object indicating a successful user deletion.
       *
       * @constant
       * @type {ApiResponse}
       * @default
       * @property {number} statusCode - The HTTP status code for the response, set to 204.
       * @property {string} message - A message indicating the user was deleted successfully.
       * @property {null} data - No additional data is provided in this response.
       */

      // Clear the user cache after deleting a user
      await RedisClientManager.delete(`user:${user._id}`);
      await RedisClientManager.delete("users:all");

      const apiResponse: ApiResponse = new ApiResponse(204, "User deleted successfully", null);
      return res.status(apiResponse.status).json(apiResponse);
    }
    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    let apiResponse: ApiResponse = handleError(error, req, res);
    return res.status(apiResponse.status).json(apiResponse);
  }
}
/**
 * Retrieves all portions from the database and sends them in the response.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * 
 * @returns A JSON response containing the count of portions and the portions themselves.
 * 
 * @throws Will return an error response if there is an issue retrieving the portions.
 */
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
      console.log("Serving portions from cache");
      const apiResponse = new ApiResponse(200, "success", JSON.parse(cachedPortions));
      console.log("Cache Hit");
      
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
/**
 * Retrieves all users from the database.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @returns A JSON response containing the status, message, and user data.
 *
 * @throws Will return an error response if the operation fails.
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    // Check Redis cache
    const cacheKey = "users:all";
    const cachedUsers = await RedisClientManager.get(cacheKey);

    if (cachedUsers) {
      console.log("Serving from cache");
      const apiResponse = new ApiResponse(200, "success", JSON.parse(cachedUsers));
      console.log("Cache Hit");
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
      const notifications = await Notification.getNotifications(
        userId,
      );
      const apiResponse = new ApiResponse(200, "Notifications fetched successfully", notifications);
      return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
      const apiResponse: ApiResponse = handleError(error, req, res);
      return res.status(apiResponse.status).json(apiResponse);
    }
    
  }

  export const submitFeedback = async (req: Request, res: Response) => {
    const {feedback,userId} = req.body;

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
    const id = req.params.id;
    try {
      await Notification.markAsRead(id);
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
        await sendNewUserNotification();
        console.log("New User notification sent successfully");
      } catch (error) {
        console.error("Failed to send New User notification:", error);
      }
    }, 5 * 60000); // 5 minutes

  } catch (error) {
    const apiResponse: ApiResponse = handleError(error, req, res);
    return res.status(apiResponse.status).json(apiResponse);
  }



  async function sendNewUserNotification() {
    if (user.deviceToken) {
      try {
        await sendPushNotification(user.deviceToken, "Welcome to Leazo! 🏡", "Your account has been successfully created. Explore amazing rooms available for rent and start your journey with Leazo!");
        // Create a notification for the user
        const notification = Notification.createNotification(
          user._id,
          "Welcome to Leazo! 🏡",
          "Your account has been successfully created. Explore amazing rooms available for rent and start your journey with Leazo!",
          'info'
        );
        (await notification).save();
        console.log("Push notification sent to new user");
      } catch (error) {
        console.error("Failed to send push notification:", error);
      }
    } else {
      console.warn("No device token found for user. Notification not sent.");
    }
  }
};




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
      const cacheKey = `user:${user._id}`;
      const cachedUser = await RedisClientManager.get(cacheKey);

      if (cachedUser) {
        console.log("Serving user from cache");
        const apiResponse = new ApiResponse(200, "User fetched successfully", JSON.parse(cachedUser));
        return res.status(apiResponse.status).json(apiResponse);
      }

      // Cache miss: store fetched user data in Redis
      await RedisClientManager.set(cacheKey, JSON.stringify(user),); // cache for 5 minutes

      const apiResponse = new ApiResponse(200, "User fetched successfully", user);
      return res.status(apiResponse.status).json(apiResponse);
    }

    const apiResponse = new ApiResponse(404, "User not found", null);
    return res.status(apiResponse.status).json(apiResponse);
  } catch (error) {
    const apiResponse: ApiResponse = handleError(error, req, res);
    return res.status(apiResponse.status).json(apiResponse);
  }
};

/**
 * Updates the user's first name and last name.
 * 
 * @param req - The request object containing user data.
 * @param res - The response object to send the response.
 * 
 * @returns A JSON response with the status and updated user information or an error message.
 * 
 * @remarks
 * - If both `firstName` and `lastName` are missing in the request body, a 400 status code is returned with an error message.
 * - If the user is not found, a 404 status code is returned with an error message.
 * - If the user has a `deviceToken`, a push notification is sent upon successful update.
 * - In case of any errors during the update process, an appropriate error response is returned.
 */
export const updateUser = async (req: Request, res: Response) => {
  let missingFields: string[] = [];
  const { firstName, lastName } = req.body;
  if (!firstName && !lastName) {
    missingFields.push('firstName');
    missingFields.push('lastName');
    return res.status(400).json(new ApiResponse(400, `Please provide any of ${missingFields.join(',')}`, null));
  }
  const user = req.body.user;
  let apiResponse: ApiResponse;
  try {
    /**
     * Updates a user's first and last name in the database.
     *
     * @param user - The user object containing the user's current details.
     * @param firstName - The new first name to update.
     * @param lastName - The new last name to update.
     * @returns The updated user document.
     *
     * @throws Will throw an error if the update operation fails.
     */
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      {
        $set:
        {
          firstName: firstName,
          lastName: lastName,
        }
      },
      { new: true, runValidators: true }
    );
    if (!updatedUser) {
      apiResponse = new ApiResponse(404, "User not found", null);
      return res.status(apiResponse.status).json(apiResponse);
    }

    // Clear the user cache after updating a user
    await RedisClientManager.delete(`user:${user._id}`);
    await RedisClientManager.delete("users:all");

    setTimeout(async () => {
      try {
        await sendProfileUpdateNotification();
        console.log("Profile update notification sent successfully");
      } catch (error) {
        console.error("Failed to send profile update notification:", error);
      }
    }, 30000); // 30 seconds


    apiResponse = new ApiResponse(200, "User updated successfully", updatedUser);
    return res.status(apiResponse.status).json(apiResponse);

  } catch (error) {
    let apiResponse: ApiResponse = handleError(error, req, res);
    return res.status(apiResponse.status).json(apiResponse);
  }

  async function sendProfileUpdateNotification(): Promise<void> {
    if (user.deviceToken) {
      await sendPushNotification(user.deviceToken, "Profile Updated 🎉", "Great job! Your profile has been successfully updated. Everything’s looking good!");
    }
  }
};

export const revealPortionContact = async (req: Request, res: Response) => {
  const { portionId } = req.body;
  const user = req.body.user;

  if (!portionId) {
    return res.status(400).json(new ApiResponse(400, "Portion ID is required", null));
  }

  try {
    const portion = await Portion.findById(portionId);
    if (!portion) {
      return res.status(404).json(new ApiResponse(404, "Portion not found", null));
    }

    const tenant = await User.findById(user._id);
    if (!tenant) {
      return res.status(404).json(new ApiResponse(404, "Tenant not found", null));
    }

    const owner = await Owner.findById(portion.ownerId);
    if (!owner) {
      return res.status(404).json(new ApiResponse(404, "Owner not found", null));
    }

    // Check Tenant Limits
    const tenantPlanId = (tenant.planId || "tenant_free") as any;
    const tenantPlan = getTenantPlanRules(tenantPlanId);
    const tenantUsed = tenant.usage?.ownerContactsUsed || 0;

    if (tenantPlan.ownerContacts !== -1 && tenantUsed >= tenantPlan.ownerContacts) {
      return res.status(403).json(new ApiResponse(403, "Tenant contact limit reached. Upgrade your plan.", null));
    }

    // Check Owner Limits
    const ownerPlanId = (owner.planId || "owner_free") as any;
    const ownerPlan = getPlanRules(ownerPlanId);
    const ownerUsed = owner.usage?.tenantContactsUsed || 0;

    if (ownerPlan.tenantContacts !== -1 && ownerUsed >= ownerPlan.tenantContacts) {
      return res.status(403).json(new ApiResponse(403, "This owner has reached their tenant contact limit.", null));
    }

    // Increment Usage
    await User.updateOne({ _id: tenant._id }, { $inc: { "usage.ownerContactsUsed": 1 } });
    await Owner.updateOne({ _id: owner._id }, { $inc: { "usage.tenantContactsUsed": 1 } });

    // Notify Owner
    try {
      // 1. In-app notification
      await (Notification as any).createNotification(
        owner.userId,
        "Contact viewed! 📞",
        `${tenant.firstName} viewed your contact for ${portion.title}.`,
        "info"
      );

      // 2. Push notification
      const ownerUser = await User.findById(owner.userId);
      if (ownerUser?.deviceToken) {
        await sendPushNotification(
          ownerUser.deviceToken,
          "Contact viewed! 📞",
          `${tenant.firstName} viewed your contact for ${portion.title}.`
        );
      }
    } catch (notifError) {
      console.error("Failed to notify owner:", notifError);
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
