import { Request, Response, NextFunction } from "express";
import ApiResponse from "../utils/api_response";

export const underMaintenance = (req: Request, res: Response, next: NextFunction) => {
    const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true";
  
    if (MAINTENANCE_MODE) {
        var apiResponse = new ApiResponse(503, "Server is under maintenance. Please try again later.", { name: "MaintenanceError" });
      return res.status(503).json(apiResponse);
    }
  
    next();
  };
  
  