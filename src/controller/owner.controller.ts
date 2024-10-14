import { Request, Response } from 'express';
import { Owner } from "../models/owner.model";
import ApiResponse from "../utils/api_response";
import { User } from '../models/user.model';
import { Building } from '../models/building.model';
import { Portion } from '../models/portion.model';

// Create a new owner
export const createOwner = async (req: Request, res: Response) => {
    try {
        // Check if the user is already an owner
        const isOwner = req.body.user.isOwner;
        // console.log(isOwner);

        // If the user is already an owner, return an error
        if (isOwner == true) {
            return res.status(400).json({ message: "User is already an owner" });
        }

        // Create a new owner object with the request body
        const owner = new Owner(req.body);
        await owner.save(); // Save the new owner to the database

        // Find the corresponding user by user ID and update user data
        var user = await User.findOne({ _id: req.body.user._id });
        if (user != null) {
            user.isOwner = true; // Set isOwner to true
            user.ownerId = owner._id; // Assign the newly created owner's ID to the user
            await user.save(); // Save the user changes
        }

        // Send the success response with the new owner
        const apiResponse = new ApiResponse(201, "Owner created successfully", owner);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        // Handle any server error
        return res.status(500).json({ error: error });
    }
};

// Update an existing owner
export const updateOwner = async (req: Request, res: Response) => {
    console.log(req.originalUrl); // Log the URL
    // console.log(req.body.user.ownerId); // Log the ownerId

    try {
        const ownerId = req.body.user.ownerId;

        // Find the owner by ownerId and update with request body data
        const owner = await Owner.findOneAndUpdate(
            { _id: ownerId },
            { $set: req.body }, // Set new data for the owner
            { runValidators: true, new: true }  // Return the updated owner and validate data
        );

        // If owner not found, return a 404 error
        if (!owner) {
            return res.status(404).json({ message: "Owner not found" });
        }

        // console.log(owner); // Log the updated owner

        // Send the success response with the updated owner
        const apiResponse = new ApiResponse(200, "Owner updated successfully", owner);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        // Handle any server error
        return res.status(500).json({ message: "Server error", error: error });
    }
};

// Delete an owner
export const deleteOwner = async (req: Request, res: Response) => {
    try {
        const ownerId = req.body.user.ownerId;
        const userId = req.body.user._id;

        // Check if ownerId and userId are present
        if (!ownerId || !userId) {
            return res.status(400).json({ message: "Owner ID and User ID are required" });
        }

        // Find and delete the owner by ownerId
        const owner = await Owner.findOneAndDelete({ _id: ownerId });

        // If owner not found, return a 404 error
        if (!owner) {
            return res.status(404).json({ message: "Owner not found" });
        }

        // Update the user: set isOwner to false and remove ownerId
        const user = await User.findOneAndUpdate(
            { _id: userId },
            {
                $set:{
                    isOwner: false, // Mark user as not being an owner
                    ownerId: null,  // Remove the ownerId reference
                }
            },
            { runValidators: true, new: true } // Validate and return the updated user
        );

        // If user not found, return a 404 error
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // console.log(user); // Log the updated user

        // Send the success response with the updated user
        const apiResponse = new ApiResponse(200, "Owner deleted successfully", user);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        // Handle any server error
        return res.status(500).json({ message: "Server error", error: error });
    }
};

// Retrieve all owners
export const getOwners = async (req: Request, res: Response) => {
    try {
        // Fetch all owners from the database
        const owners = await Owner.find();

        // Send success response with owners and their count
        const apiResponse = new ApiResponse(200, "Owners retrieved successfully", { count: owners.length, owners });
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        // Handle any server error
        return res.status(500).json({ message: "Server error", error: error });
    }
};

// Retrieve a specific owner by ID
export const getOwnerById = async (req: Request, res: Response) => {
    try {
        const ownerId = req.body.user.ownerId; // Get the ownerId from request body

        // Find the owner by ownerId
        const owner = await Owner.findOne({ _id: ownerId });

        // If owner not found, return a 404 error
        if (!owner) {
            return res.status(404).json({ message: "Owner not found" });
        }

        // Send success response with the owner details
        const apiResponse = new ApiResponse(200, "Owner retrieved successfully", owner);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        // Handle any server error
        return res.status(500).json({ message: "Server error", error: error });
    }
};

export const createBuilding = async (req: Request, res: Response) => {
    console.log(req.originalUrl);

    try {
        const ownerId = req.body.user.ownerId; // Get the ownerId from request body

        // Find the owner by ownerId
        const owner = await Owner.findOne({ _id: ownerId });
        

        // If owner not found, return a 404 error
        if (!owner) {
            return res.status(404).json({ message: "Owner not found" });
        }

        // Create a new building object with the request body
        const building = new Building(req.body);

        // Save the new building to the database

        await building.save();
        // Update user colletion with the building id

        const buildingId = building._id.toString();
        
        
        // Send the success response with the new building
        const apiResponse = new ApiResponse(201, "Building created successfully", building);

        return res.status(apiResponse.status).json(apiResponse);
    }
    catch (error) {
        // Handle any server error
        // console.log(error);

        return res.status(500).json({ message: "Server error", error: error });
    }
}

// update a building

export const updateBuilding = async (req: Request, res: Response) => {
    console.log(req.originalUrl);
    // console.log(req.body.user.ownerId);

    const buildingId = req.body.buildingId
    // console.log(req.body.data);


    try {
        // const ownerId = req.body.user.ownerId;

        // Find the owner by ownerId and update with request body data
        const building = await Building.findOneAndUpdate(
            { _id: buildingId },
            { $set: req.body.data }, // Set new data for the owner
            { runValidators: true, new: true }  // Return the updated owner and validate data
        );

        // If owner not found, return a 404 error
        if (!building) {
            return res.status(404).json({ message: "Building not found" });
        }

        // console.log(building); // Log the updated owner

        // Send the success response with the updated owner
        const apiResponse = new ApiResponse(200, "Building updated successfully", building);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        // Handle any server error
        return res.status(500).json({ message: "Server error", error: error });
    }
};

// delete a building

export const deleteBuilding = async (req: Request, res: Response) => {
    try {
        const buildingId = req.query.buildingId;
        const ownerId = req.body.user.ownerId;

        // Check if buildingId and ownerId are present
        if (!buildingId || !ownerId) {
            return res.status(400).json({ message: "Building ID and Owner ID are required" });
        }

        // Find and delete the building by buildingId
        const building = await Building.findOneAndDelete({ _id: buildingId },);

        // If building not found, return a 404 error
        if (!building) {
            return res.status(404).json({ message: "Building not found" });
        }

        // Send the success response with the deleted building
        const apiResponse = new ApiResponse(204, "Building deleted successfully", building);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        // Handle any server error
        return res.status(500).json({ message: "Server error", error: error });
    }
};
export const getOwnerBuildings = async (req: Request, res: Response) => {
    try {
        const ownerId = req.body.user.ownerId;
        if (!ownerId) {
            return res.status(400).json({ message: "Owner ID is required" });
        }
        const buildings = await Building.find({ ownerId: ownerId });
        const apiResponse = new ApiResponse(200, "Buildings retrieved successfully", { count: buildings.length, buildings });
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error });
    }
}

export const createPortion = async (req: Request, res: Response) => {


    try {
        const ownerId = req.body.user.ownerId; // Get the ownerId from request body

        // Find the owner by ownerId
        // const owner = await Owner.findOne({ _id: ownerId });

        // If owner not found, return a 404 error
        // if (!owner) {
        //     return res.status(404).json({ message: "Owner not found" });
        // }

        // Create a new building object with the request body
        const portion = new Portion(req.body);

        // Save the new building to the database

        await portion.save();

        // Send the success response with the new building

        const apiResponse = new ApiResponse(201, "Portion created successfully", portion);

        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        // Handle any server error
        // console.log(error);

        return res.status(500).json({ message: "Server error", error: error });
    }
}


// update a portion

export const updatePortion = async (req: Request, res: Response) => {
    console.log(req.originalUrl);
    // console.log(req.body.user.ownerId);

    const portionId = req.body.portionId
    // console.log(req.body.data);


    try {
        // const ownerId = req.body.user.ownerId;

        // Find the owner by ownerId and update with request body data
        const portion = await Portion.findOneAndUpdate(
            { _id: portionId },
            { $set: req.body.data }, // Set new data for the owner
            { runValidators: true, new: true }  // Return the updated owner and validate data
        );

        // If owner not found, return a 404 error
        if (!portion) {
            return res.status(404).json({ message: "Portion not found" });
        }

        // console.log(portion); // Log the updated owner

        // Send the success response with the updated owner
        const apiResponse = new ApiResponse(200, "Portion updated successfully", portion);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        // Handle any server error
        return res.status(500).json({ message: "Server error", error: error });
    }
}

// delete a portion

export const deletePortion = async (req: Request, res: Response) => {
    try {
        const portionId = req.query.portionId;
        const ownerId = req.body.user.ownerId;

        // Check if buildingId and ownerId are present
        if (!portionId || !ownerId) {
            return res.status(400).json({ message: "Portion ID and Owner ID are required" });
        }

        // Find and delete the building by buildingId
        const portion = await Portion.findOneAndDelete({ _id: portionId },);

        // If building not found, return a 404 error
        if (!portion) {
            return res.status(404).json({ message: "Portion not found" });
        }

        // Send the success response with the deleted building
        const apiResponse = new ApiResponse(204, "Portion deleted successfully", portion);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        // Handle any server error
        return res.status(500).json({ message: "Server error", error: error });
    }
};
export const getPortionsByBuildingId = async (req: Request, res: Response) => {

    try {
        const buildingId = req.query.buildingId
        const portions = await Portion.find({ buildingId: buildingId });
        if(!portions) {
            return res.status(404).json({ message: "Portions not found" });
        }
        const apiResponse = new ApiResponse(200, "Portions retrieved successfully", { count: portions.length, portions });
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error });
    }
}