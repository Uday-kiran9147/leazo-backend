import { Request, Response } from 'express';
/**
 * Importing the Owner model from the models directory.
 */
import { Owner } from "../models/owner.model";

/**
 * Importing the ApiResponse utility for standardized API responses.
 */
import ApiResponse from "../utils/api_response";

/**
 * Importing the User model from the models directory.
 */
import { User } from '../models/user.model';

/**
 * Importing the Building model from the models directory.
 */
import { Building } from '../models/building.model';

/**
 * Importing the Portion model from the models directory.
 */
import { Portion } from '../models/portion.model';

/**
 * Importing the handleError utility for standardized error handling.
 */
import { handleError } from '../utils/api_error';

/**
 * Creates a new owner and associates it with a user.
 *
 * This function creates a new owner based on the data provided in the request body. It checks if the user
 * is already an owner and prevents the creation of duplicate owners. If the user is not an owner, the owner
 * is created, saved, and the user's status is updated to reflect ownership.
 *
 * @param req - The request object containing user and owner details in the body.
 * @param res - The response object used to send the appropriate HTTP response.
 * @returns A promise that resolves to the HTTP response indicating the success or failure of the creation operation.
 *
 * @remarks
 * - If the user is already an owner, a 400 status response is returned.
 * - The newly created owner is saved, and the user's status is updated to indicate that they are now an owner.
 * - In case of a server error, the error is handled, and an appropriate response is returned.
 */

export const createOwner = async (req: Request, res: Response) => {
    try {
        const isOwner = req.body.user.isOwner;
        if (isOwner == true) {
            let apiResponse: ApiResponse = new ApiResponse(400, "Owner already exists", null);
            return res.status(apiResponse.status).json(apiResponse);
        }
        const owner = new Owner(req.body);
        await owner.save();
        /**
         * Retrieves a user document from the database based on the provided user ID in the request body.
         * 
         * @param req - The request object containing the user ID in the body.
         * @returns The user document if found, otherwise null.
         */
        var user = await User.findOne({ _id: req.body.user._id });
        if (user != null) {
            user.isOwner = true;
            user.ownerId = owner._id;
            await user.save();
        }
        const apiResponse = new ApiResponse(201, "Owner created successfully", owner);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};


/**
 * Updates an existing owner with the provided data.
 *
 * This function allows updating the details of an owner based on the data provided in the request body.
 * The owner's ID is retrieved from the user's ownerId, and the owner document is updated with the new information.
 *
 * @param req - The request object containing the updated owner data in the body.
 * @param res - The response object used to send the appropriate HTTP response.
 * @returns A promise that resolves to the HTTP response indicating the result of the update operation.
 *
 * @remarks
 * - If the owner is not found, a 404 status response is returned.
 * - The owner data is updated with the provided values and saved.
 * - In case of a server error, the error is handled, and an appropriate response is returned.
 */

export const updateOwner = async (req: Request, res: Response) => {
    console.log(req.originalUrl);
    const { ownerName, contactNumber } = req.body;
    try {
        const ownerId = req.body.user.ownerId;
        const owner = await Owner.findOneAndUpdate(
            { _id: ownerId },
            { $set: req.body },
            { runValidators: true, new: true }
        );
        if (!owner) {
            return res.status(404).json({ message: "Owner not found" });
        }
        const apiResponse = new ApiResponse(200, "Owner updated successfully", owner);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};


/**
 * Deletes an existing owner and updates the associated user.
 *
 * This function deletes an owner by their ID and updates the user's status, marking them as no longer an owner.
 * The owner is deleted, and the user's `isOwner` field is set to false, and their `ownerId` is cleared.
 *
 * @param req - The request object containing the owner ID and user ID in the body.
 * @param res - The response object used to send the appropriate HTTP response.
 * @returns A promise that resolves to the HTTP response indicating the result of the delete operation.
 *
 * @remarks
 * - If the owner or user is not found, a 404 status response is returned.
 * - The owner is deleted, and the user's ownership status is updated.
 * - In case of a server error, the error is handled, and an appropriate response is returned.
 */

export const deleteOwner = async (req: Request, res: Response) => {
    try {
        const ownerId = req.body.user.ownerId;
        const userId = req.body.user._id;
        if (!ownerId || !userId) {
            return res.status(400).json({ message: "Owner ID and User ID are required" });
        }
        const owner = await Owner.findOneAndDelete({ _id: ownerId });
        if (!owner) {
            return res.status(404).json({ message: "Owner not found" });
        }
        const user = await User.findOneAndUpdate(
            { _id: userId },
            {
                $set: {
                    isOwner: false,
                    ownerId: null,
                }
            },
            { runValidators: true, new: true }
        );
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const apiResponse = new ApiResponse(200, "Owner deleted successfully", user);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

/**
 * Retrieves a list of all owners.
 *
 * This function fetches all the owner documents from the database and returns them in the response.
 * The total count of owners and their data are included in the response.
 *
 * @param req - The request object (not used in this function).
 * @param res - The response object used to send the appropriate HTTP response.
 * @returns A promise that resolves to the HTTP response containing the list of owners.
 *
 * @remarks
 * - In case of a server error, the error is handled, and an appropriate response is returned.
 */

export const getOwners = async (req: Request, res: Response) => {
    try {
        const owners = await Owner.find();
        const apiResponse = new ApiResponse(200, "Owners retrieved successfully", { count: owners.length, owners });
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

/**
 * Retrieves a single owner by their ID.
 *
 * This function fetches the owner document associated with the provided `ownerId` from the request body.
 * If the owner is found, it is returned in the response; otherwise, a 404 status is returned.
 *
 * @param req - The request object containing the owner ID in the body.
 * @param res - The response object used to send the appropriate HTTP response.
 * @returns A promise that resolves to the HTTP response containing the owner data or an error message.
 *
 * @remarks
 * - If the owner is not found, a 404 status response is returned.
 * - In case of a server error, the error is handled, and an appropriate response is returned.
 */

export const getOwnerById = async (req: Request, res: Response) => {
    try {
        const ownerId = req.body.user.ownerId;
        const owner = await Owner.findOne({ _id: ownerId });
        if (!owner) {
            return res.status(404).json({ message: "Owner not found" });
        }
        const apiResponse = new ApiResponse(200, "Owner retrieved successfully", owner);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

/**
 * Creates a new building associated with an owner.
 *
 * This function creates a new building based on the data provided in the request body.
 * It checks if the owner exists, and if so, the building is created and saved.
 *
 * @param req - The request object containing the building data in the body.
 * @param res - The response object used to send the appropriate HTTP response.
 * @returns A promise that resolves to the HTTP response indicating the result of the create operation.
 *
 * @remarks
 * - If the owner is not found, a 404 status response is returned.
 * - The newly created building is saved, and a success response is returned.
 * - In case of a server error, the error is handled, and an appropriate response is returned.
 */

export const createBuilding = async (req: Request, res: Response) => {
    console.log(req.originalUrl);
    try {
        const ownerId = req.body.ownerId;
        const owner = await Owner.findOne({ _id: ownerId });
        if (!owner) {
            return res.status(404).json({ message: "Owner not found" });
        }
        const building = new Building(req.body);
        await building.save();
        const apiResponse = new ApiResponse(201, "Building created successfully", building);
        return res.status(apiResponse.status).json(apiResponse);
    }
    catch (error) {
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
        const building = await Building.findOneAndUpdate(
            { _id: buildingId },
            { $set: req.body.data },
            { runValidators: true, new: true }
        );
        if (!building) {
            return res.status(404).json({ message: "Building not found" });
        }
        const apiResponse = new ApiResponse(200, "Building updated successfully", building);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};
/**
 * Deletes a building based on the provided building ID and owner ID.
 * 
 * @param req - The request object containing query parameters and body data.
 * @param res - The response object used to send back the desired HTTP response.
 * 
 * @returns A JSON response indicating the result of the delete operation.
 * 
 * @throws Will return a 400 status if the building ID or owner ID is missing.
 * @throws Will return a 404 status if the building is not found.
 * @throws Will handle and return any other errors encountered during the operation.
 */
export const deleteBuilding = async (req: Request, res: Response) => {
    try {
        const buildingId = req.query.buildingId;
        const ownerId = req.body.user.ownerId;
        if (!buildingId || !ownerId) {
            return res.status(400).json({ message: "Building ID and Owner ID are required" });
        }
        const building = await Building.findOneAndDelete({ _id: buildingId },);
        if (!building) {
            return res.status(404).json({ message: "Building not found" });
        }
        const apiResponse = new ApiResponse(204, "Building deleted successfully", building);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
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
/**
 * Creates a new portion associated with an owner and a building.
 *
 * @param req - The request object containing the owner ID and building ID in the body.
 * @param res - The response object used to send back the appropriate HTTP response.
 * @returns A JSON response with the created portion or an error message.
 *
 * @throws Will return a 404 status if the owner or building is not found.
 * @throws Will handle any other errors and return an appropriate error response.
 */
export const createPortion = async (req: Request, res: Response) => {
    try {
        const ownerId = req.body.user.ownerId;
        const owner = await Owner.findOne({ _id: ownerId });
        if (!owner) {
            return res.status(404).json({ message: "Owner not found" });
        }
        const building = await Building.findOne({ _id: req.body.buildingId });
        if (!building) {
            return res.status(404).json({ message: "Building not found" });
        }
        const portion = new Portion(req.body);
        await portion.save();
        const apiResponse = new ApiResponse(201, "Portion created successfully", portion);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
}
export const updatePortion = async (req: Request, res: Response) => {
    const portionId = req.body.portionId
    /**
     * An array of property names that are not allowed to be updated.
     * 
     * This array is used to specify which fields should be restricted from being modified
     * during update operations. Any attempt to update these fields should be prevented
     * to maintain data integrity and security.
     * 
     * @constant {string[]} notAllowedUpdates
     */
    const notAllowedUpdates = ["ownerId", "buildingId"];
    /**
     * Extracts the keys from the `data` object in the request body.
     * 
     * @constant {string[]} updates - An array of keys from the `data` object in the request body.
     */
    const updates = Object.keys(req.body.data);

    /**
     * Checks if any of the updates contain operations that are not allowed.
     *
     * @constant {boolean} hasInvalidOperation - A boolean indicating whether there are any invalid operations in the updates.
     */
    const hasInvalidOperation = updates.some((update) => notAllowedUpdates.includes(update));

    if (hasInvalidOperation) {
        return res.status(400).json({ message: 'Invalid updates: ownerId and buildingId cannot be updated!' });
    }
    try {
        /**
         * Updates a portion document in the database with the provided data.
         *
         * @param {string} portionId - The ID of the portion to update.
         * @param {Request} req - The request object containing the data to update.
         * @returns {Promise<Portion | null>} - The updated portion document or null if not found.
         */
        const portion = await Portion.findOneAndUpdate(
            { _id: portionId },
            { $set: req.body.data },
            { runValidators: true, new: true }
        );
        if (!portion) {
            return res.status(404).json({ message: "Portion not found" });
        }
        const apiResponse = new ApiResponse(200, "Portion updated successfully", portion);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
}

export const deletePortion = async (req: Request, res: Response) => {
    try {
        const portionId = req.query.portionId;
        const ownerId = req.body.user.ownerId;
        if (!portionId || !ownerId) {
            return res.status(400).json({ message: "Portion ID and Owner ID are required" });
        }
        const portion = await Portion.findOneAndDelete({ _id: portionId },);
        if (!portion) {
            return res.status(404).json({ message: "Portion not found" });
        }
        /**
         * Creates a new ApiResponse indicating that a portion has been successfully deleted.
         *
         * @constant {ApiResponse} apiResponse - The response object containing the status code, message, and the deleted portion.
         * @property {number} statusCode - The HTTP status code (204) indicating successful deletion.
         * @property {string} message - A message indicating that the portion was deleted successfully.
         * @property {any} data - The deleted portion data.
         */
        const apiResponse = new ApiResponse(204, "Portion deleted successfully", portion);
        return res.status(apiResponse.status).json(apiResponse);
    } catch (error) {
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};
export const getPortionsByBuildingId = async (req: Request, res: Response) => {
    try {
        const buildingId = req.query.buildingId
        /**
         * Retrieves portions associated with a specific building.
         *
         * @param buildingId - The ID of the building to find portions for.
         * @returns A promise that resolves to an array of portions associated with the specified building.
         */
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