import { Request, Response } from 'express';
import { User } from '../models/user.model';
import ApiResponse from '../utils/api_response';
import { Portion } from '../models/portion.model';
import { sendPushNotification } from '../utils/push_notifications';
import { handleError } from '../utils/api_error';
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
    const portions = await Portion.find();
    const apiResponse = new ApiResponse(200, "success", { count: portions.length, portions });
    return res.status(200).json(apiResponse);
  } catch (error) {
    let apiResponse: ApiResponse = handleError(error, req, res);
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
    const users = await User.find();
    let apiResponse = new ApiResponse(200, "success", { count: users.length, users });
    return res.status(apiResponse.status).json(apiResponse);
  } catch (error) {
    let apiResponse: ApiResponse = handleError(error, req, res);
    return res.status(apiResponse.status).json(apiResponse);
  }
};


export const createUser = async (req: Request, res: Response) => {
  const user = new User(req.body);
  try {
    await user.save();
    console.log("User saved:", user);

    const response = new ApiResponse(201, "Account created successfully", user);
    res.status(response.status).json(response);

    setTimeout(async () => {
      try {
        await sendNewUserNotification();
        console.log("Profile update notification sent successfully");
      } catch (error) {
        console.error("Failed to send profile update notification:", error);
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
      const apiResponse = new ApiResponse(200, "User fetched successfully", user);
      return res.status(apiResponse.status).json(apiResponse);
    }
    const apiResponse = new ApiResponse(404, "User not found", null);
    return res.status(apiResponse.status).json(apiResponse);
  } catch (error) {
    let apiResponse: ApiResponse = handleError(error, req, res);
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

  /**
   * Sends a push notification to the user when their profile is updated.
   * 
   * This function checks if the user has a device token and, if so, sends a push notification
   * indicating that their profile has been successfully updated.
   * 
   * @async
   * @function sendProfileUpdateNotification
   * @returns {Promise<void>} A promise that resolves when the notification has been sent.
   */
  async function sendProfileUpdateNotification(): Promise<void> {
    if (user.deviceToken) {
      await sendPushNotification(user.deviceToken, "Profile Updated 🎉", "Great job! Your profile has been successfully updated. Everything’s looking good!");
    }
  }
};
