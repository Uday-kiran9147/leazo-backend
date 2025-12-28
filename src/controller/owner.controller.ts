import { Request, Response } from 'express';
import ApiResponse from "../utils/api_response";
import { handleError } from '../utils/api_error';
import { RedisClientManager } from '../cache/RedisClientManager';
import { getStatusEmoji, getStatusMessage } from './admin.Controller';
import { BackgroundService } from '../utils/BackgroundService';
import { addressSchema, contactSchema } from '../utils/validators';
import { Notification } from '../models/notification.model';
import { Owner } from '../models/owner.model';
import { getPlanRules } from '../config/ownerConfig';
import { MongooseOwnerRepository } from '../repositories/OwnerRepository';
import { MongooseUserRepository } from '../repositories/UserRepository';
import { MongooseBuildingRepository } from '../repositories/BuildingRepository';
import { MongoosePortionRepository } from '../repositories/PortionRepository';
import { OwnerService } from '../services/OwnerService';
import { BuildingService } from '../services/BuildingService';
import { PortionService } from '../services/PortionService';
import { Portion } from '../models/portion.model';

// Service Initializations
const userRepository = new MongooseUserRepository();
const ownerRepository = new MongooseOwnerRepository();
const buildingRepository = new MongooseBuildingRepository();
const portionRepository = new MongoosePortionRepository();

export const ownerService = new OwnerService(ownerRepository, userRepository);
export const buildingService = new BuildingService(buildingRepository);
export const portionService = new PortionService(portionRepository, ownerRepository);
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
        if (req.body.user.isOwner) {
            return res.status(400).json(new ApiResponse(400, "Owner already exists", null));
        }
        const owner = await ownerService.createOwner(req.body.user._id, req.body);
        return res.status(201).json(new ApiResponse(201, "Owner created successfully", owner));
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
    const { ownerName, contactNumber } = req.body;
    if (contactNumber.phoneNumber.length != 10) {
        return res.status(400).json({ message: "Invalid contact number" })
    }
    try {
        const validatedContact = contactSchema.parse(contactNumber);
        const ownerId = req.body.user.ownerId;
        const owner = await ownerService.updateOwner(ownerId, { ownerName, contactNumber: validatedContact });
        if (!owner) {
            return res.status(404).json({ message: "Owner not found" });
        }
        return res.status(200).json(new ApiResponse(200, "Owner updated successfully", owner));
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
        const owner = await ownerService.deleteOwner(ownerId, userId);
        if (!owner) {
            return res.status(404).json({ message: "Owner not found" });
        }
        return res.status(200).json(new ApiResponse(200, "Owner deleted successfully", owner));
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
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const owners = await ownerService.listOwners(page, limit);
        return res.status(200).json(new ApiResponse(200, "Owners retrieved successfully", { count: owners.length, owners, page, limit }));
    } catch (error) {
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

export const getOwnerById = async (req: Request, res: Response) => {
    try {
        const ownerId = req.body.user.ownerId;

        // Auto-reconcile usage count to fix any stale values from deletion/admin bugs
        await portionService.reconcileUsage(ownerId);

        const owner = await ownerService.getOwner(ownerId);
        if (!owner) {
            return res.status(404).json({ message: "Owner not found" });
        }
        return res.status(200).json(new ApiResponse(200, "Owner Retrieved Successfully", owner));
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
    try {
        const ownerId = req.body.ownerId;
        const validatedAddress = addressSchema.parse(req.body.address);
        const validatedContact = contactSchema.parse(req.body.contact);

        const buildingData = {
            ...req.body,
            address: validatedAddress,
            contact: validatedContact
        };

        const building = await buildingService.createBuilding(ownerId, buildingData);
        return res.status(201).json(new ApiResponse(201, "Building created successfully", building));
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
    const buildingId = req.params.buildingId || req.body.buildingId || req.query.buildingId;

    if (!buildingId) {
        return res.status(400).json({ message: "Building ID is required" });
    }

    if (!req.body || !req.body.data || typeof req.body.data !== 'object') {
        return res.status(400).json({ message: "Invalid request: 'data' object is required in body." });
    }

    const notAllowedUpdates = ['ownerId'];
    const updates = Object.keys(req.body.data);
    const hasInvalidOperation = updates.some((update) => notAllowedUpdates.includes(update));

    if (hasInvalidOperation) {
        return res.status(400).json({ message: 'Invalid updates: ownerId cannot be updated!' });
    }

    try {
        const building = await buildingService.updateBuilding(buildingId, req.body.data);
        return res.status(200).json(new ApiResponse(200, "Building updated successfully", building));
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
        const buildingId = req.params.buildingId || req.body.buildingId || req.query.buildingId;
        if (!buildingId) {
            return res.status(400).json({ message: "Building ID is required" });
        }
        const building = await buildingService.deleteBuilding(buildingId);
        return res.status(204).json(new ApiResponse(204, "Building deleted successfully", building));
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
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const buildings = await buildingService.getBuildingsByOwner(ownerId, page, limit);
        return res.status(200).json(new ApiResponse(200, "Buildings retrieved successfully", { count: buildings.length,page, limit , buildings, }));
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
        const portion = await portionService.createPortion({ ...req.body, ownerId });

        // Push Notification logic (can be moved to a listener or service eventually)
        const owner = await ownerService.getOwner(ownerId);
        if (owner) {
            const emoji = getStatusEmoji(portion.approvalStatus);
            const message = "Your portion " + portion.title + " has been " + getStatusMessage(portion.approvalStatus);
            
            BackgroundService.sendNotification(req.body.user.deviceToken, portion.approvalStatus + emoji, message);
        }

        return res.status(201).json(new ApiResponse(201, "Portion created successfully", portion));
    } catch (error) {
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
}

export const updatePortion = async (req: Request, res: Response) => {
    const portionId = req.params.portionId || req.body.portionId || req.query.portionId;

    if (!portionId) {
        return res.status(400).json({ message: "Portion ID is required" });
    }
    const notAllowedUpdates = ["ownerId", "buildingId"];
    const updates = Object.keys(req.body.data);
    const hasInvalidOperation = updates.some((update) => notAllowedUpdates.includes(update));

    if (hasInvalidOperation) {
        return res.status(400).json({ message: 'Invalid updates: ownerId and buildingId cannot be updated!' });
    }
    try {
        const portion = await portionService.updatePortion(portionId, req.body.data);
        if (!portion) {
            return res.status(404).json({ message: "Portion not found" });
        }
        return res.status(200).json(new ApiResponse(200, "Portion updated successfully", portion));
    } catch (error) {
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
}

export const deletePortion = async (req: Request, res: Response) => {
    try {
        const portionId = req.params.portionId || req.body.portionId || req.query.portionId;
        if (!portionId) {
            return res.status(400).json({ message: "Portion ID is required" });
        }
        const portion = await portionService.deletePortion(portionId);
        if (!portion) {
            return res.status(404).json({ message: "Portion not found" });
        }
        return res.status(204).json(new ApiResponse(204, "Portion deleted successfully", portion));
    } catch (error) {
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

export const getPortionsByBuildingId = async (req: Request, res: Response) => {
    try {
        const buildingId = req.query.buildingId as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const portions = await portionService.getPortionsByBuilding(buildingId, page, limit);
        return res.status(200).json(new ApiResponse(200, "Portions retrieved successfully", { count: portions.length, portions, page, limit }));
    } catch (error) {
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
}

export const boostPortion = async (req: Request, res: Response) => {
    const { portionId } = req.body;
    const user = req.body.user;

    if (!portionId) {
        return res.status(400).json(new ApiResponse(400, "Portion ID is required", null));
    }

    try {
        const portion = await portionService.boostPortion(portionId, user._id);
        return res.status(200).json(new ApiResponse(200, "Portion boosted successfully for 24 hours", portion));
    } catch (error: any) {
        if (error.message === "Owner profile not found") {
            return res.status(404).json(new ApiResponse(404, error.message, null));
        }
        if (error.message.includes("limit reached") || error.message.includes("Access denied")) {
            return res.status(403).json(new ApiResponse(403, error.message, null));
        }
        let apiResponse: ApiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
}

export const toggleIsActiveAndUpdateOwnerUsage = async (req: Request, res: Response) => {
    const { portionId, isActive } = req.body;

    try {
        const portion = await Portion.findById(portionId);
        if (!portion) {
            return res.status(404).json(new ApiResponse(404, "Portion not found", null));
        }

        if (portion.isActive === isActive) {
            return res.status(400).json(
                new ApiResponse(400, `Portion is already ${isActive ? "active" : "inactive"}`, null)
            );
        }

        const owner = await Owner.findById(req.body.user.ownerId);
        if (!owner) {
            return res.status(404).json(new ApiResponse(404, "Owner not found", null));
        }

        const planRules = getPlanRules(owner.planId);

        if (
            isActive === true &&
            planRules.activeListings !== -1 &&
            owner.usage.activeListings >= planRules.activeListings
        ) {
            return res.status(400).json(
                new ApiResponse(400, `${planRules.activeListings} active listings limit reached, please upgrade your plan`, null)
            );
        }

        portion.isActive = isActive;
        await portion.save();

        if (isActive) {
            owner.usage.activeListings += 1;
        } else {
            owner.usage.activeListings = Math.max(0, owner.usage.activeListings - 1);
        }

        await owner.save();

        return res.status(200).json(
            new ApiResponse(200, "Portion status updated successfully",null)
        );
    } catch (error) {
        const apiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

