import { Request, Response } from 'express';
import { User } from '../models/user.model';
import ApiResponse from '../utils/api_response';
import { Portion } from '../models/portion.model';


export const deleteUser = async (req:Request, res:Response) => {
  const user = req.body.user;
  try {
    if (user) {
      await User.findByIdAndDelete({id:user._id})
      const apiResponse = new ApiResponse(200, "User deleted successfully", null);
      return res.status(apiResponse.status).json(apiResponse);
    }
    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
}
// Retrieve all portions from the database
export const getAllPortions = async (req: Request, res: Response) => {
  try {
    console.log(req.originalUrl); // Log the original URL for debugging purposes

    // Fetch all portions from the database
    const portions = await Portion.find();
    const apiResponse = new ApiResponse(200, "success", {count:portions.length,portions});
    // Return the portions with a 200 status code
    res.status(200).json(apiResponse);
  } catch (error) {
    // Handle any server errors
    res.status(500).json({ message: 'Server error' });
  }
};
// Retrieve all users from the database
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    console.log(req.originalUrl); // Log the original URL for debugging purposes

    // Fetch all users from the database
    const users = await User.find();

    // Return the users with a 200 status code
    res.status(200).json(users);
  } catch (error) {
    // Handle any server errors
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new user and save it to the database
export const createUser = async (req: Request, res: Response) => {
  try {
    // Create a new User instance with the request body data
    const user = new User(req.body);

    // Save the new user to the database
    await user.save();

    // Return the newly created user with a 201 status code
    res.status(201).json({ user });
  } catch (error) {
    // Handle any server errors and return a 500 status code with the error message
    res.status(500).json({ message: 'Server error', error: error });
  }
};

// Retrieve a single user based on the request body data
export const getUser = async (req: Request, res: Response) => {
  try {
    // Get the user object from the request body
    const user = req.body.user;

    console.log(req.originalUrl); // Log the original URL for debugging
    console.log(user._id); // Log the user ID for debugging

    // If the user exists, return the user in an ApiResponse
    if (user) {
      const apiResponse = new ApiResponse(200, "success", user);
      return res.status(apiResponse.status).json(apiResponse);
    }

    // If the user is not found, return a 404 error
    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    // Handle any server errors and return a 500 status code
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update an existing user based on the request body data
export const updateUser = async (req: Request, res: Response) => {
  // Get the user object from the request body
  const user = req.body.user;

  try {
    // Find the user by ID and update their information
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },        // Search criteria: user ID
      { $set: req.body },       // Update the user with the request body data
      { new: true, runValidators: true } // Return the updated user and run validations
    );

    // If the user is not found, return a 404 error
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the updated user in an ApiResponse with a 200 status code
    const apiResponse = new ApiResponse(200, "User updated successfully", updatedUser);
    return res.status(apiResponse.status).json(apiResponse);
  } catch (error) {
    // Handle any server errors and return a 500 status code with the error message
    return res.status(500).json({ message: "Server error", error: error });
  }
};
