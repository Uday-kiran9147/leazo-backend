import { Request, Response } from 'express';
import { Owner } from "../models/owner.model";
import ApiResponse from "../utils/api_response";
import { User } from '../models/user.model';
import { Building } from '../models/building.model';
import { Portion } from '../models/portion.model';
import { handleError } from '../utils/api_error';

// Create a new owner
export const createOwner = async (req: Request, res: Response) => {
    try {
        // Check if the user is already an owner
        const isOwner = req.body.user.isOwner;
        // console.log(isOwner);

        // If the user is already an owner, return an error
        if (isOwner == true) {
            let apiResponse: ApiResponse = new ApiResponse(400, "Owner already exists", null);
            return res.status(apiResponse.status).json(apiResponse);
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
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

// Update an existing owner
export const updateOwner = async (req: Request, res: Response) => {
    console.log(req.originalUrl); // Log the URL
    // console.log(req.body.user.ownerId); // Log the ownerId
    const { ownerName, contactNumber } = req.body;
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
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
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
                $set: {
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
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
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
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
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
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

export const createBuilding = async (req: Request, res: Response) => {
    console.log(req.originalUrl);

    try {
        const ownerId = req.body.ownerId; // Get the ownerId from request body

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

        // const buildingId = building._id.toString();


        // Send the success response with the new building
        const apiResponse = new ApiResponse(201, "Building created successfully", building);

        return res.status(apiResponse.status).json(apiResponse);
    }
    catch (error) {
        // Handle any server error
        // console.log(error);

        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
}



/**
 * Updates a building with the provided data.
 *
 * This function handles the update of a building by its ID, ensuring that certain fields are not allowed to be updated.
 * It validates the update operations and returns appropriate responses based on the success or failure of the update.
 *
 * @param req - The request object containing the building ID in the query and the update data in the body.
 * @param res - The response object used to send back the appropriate HTTP response.
 * @returns A promise that resolves to the HTTP response indicating the result of the update operation.
 *
 * @remarks
 * - The function checks if the updates contain any fields that are not allowed to be updated.
 * - If the updates are valid, it attempts to find and update the building with the provided data.
 * - If the building is not found, it returns a 404 error.
 * - If the update is successful, it returns a 200 response with the updated building data.
 * - If there is a server error, it handles the error and returns an appropriate response.
 */
export const updateBuilding = async (req: Request, res: Response) => {
    console.log(req.originalUrl);

    const buildingId = req.query.buildingId;
    const notAllowedUpdates = ['ownerId'];
    const updates = Object.keys(req.body.data);

    /**
     * Checks if any of the updates are invalid operations.
     *
     * This function iterates over each update and checks if it is included in the list of not allowed updates.
     *
     * @param updates - An array of update strings to be checked.
     * @returns A boolean indicating whether any updates are invalid operations.
     */
    const hasInvalidOperation = updates.some((update) => notAllowedUpdates.includes(update));

    if (hasInvalidOperation) {
        return res.status(400).json({ message: 'Invalid updates: ownerId cannot be updated!' });
    }

    try {
        // Find the building by buildingId and update with the provided data
        const building = await Building.findOneAndUpdate(
            { _id: buildingId },
            { $set: req.body.data }, // Set new data for the building
            { runValidators: true, new: true }  // Return the updated building and validate data
        );

        // If the building is not found, return a 404 error
        if (!building) {
            return res.status(404).json({ message: "Building not found" });
        }

        // Send the success response with the updated building
        const apiResponse = new ApiResponse(200, "Building updated successfully", building);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        // Handle any server error
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
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
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
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
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
}

export const createPortion = async (req: Request, res: Response) => {


    try {
        const ownerId = req.body.user.ownerId; // Get the ownerId from request body

        // Find the owner by ownerId
        const owner = await Owner.findOne({ _id: ownerId });

        // If owner not found, return a 404 error
        if (!owner) {
            return res.status(404).json({ message: "Owner not found" });
        }

        // Create a new building object with the request body

        const building = await Building.findOne({ _id: req.body.buildingId });
        if (!building) {
            return res.status(404).json({ message: "Building not found" });
        }
        const portion = new Portion(req.body);

        // Save the new building to the database

        await portion.save();

        // Send the success response with the new building

        const apiResponse = new ApiResponse(201, "Portion created successfully", portion);

        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        // Handle any server error
        // console.log(error);

        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
}


// update a portion

export const updatePortion = async (req: Request, res: Response) => {
    // console.log(req.originalUrl);
    // console.log(req.body.user.ownerId);

    const portionId = req.body.portionId
    // console.log(req.body.data);
    const notAllowedUpdates = ["ownerId", "buildingId"];
    const updates = Object.keys(req.body.data);

    const hasInvalidOperation = updates.some((update) => notAllowedUpdates.includes(update));

    if (hasInvalidOperation) {
        return res.status(400).json({ message: 'Invalid updates: ownerId and buildingId cannot be updated!' });
    }

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
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
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
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};
export const getPortionsByBuildingId = async (req: Request, res: Response) => {

    try {
        const buildingId = req.query.buildingId
        const portions = await Portion.find({ buildingId: buildingId });
        if (!portions) {
            return res.status(404).json({ message: "Portions not found" });
        }
        const apiResponse = new ApiResponse(200, "Portions retrieved successfully", { count: portions.length, portions });
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
}