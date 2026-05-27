import { Router } from "express";
import { createOwner, deleteOwner, getOwnerById, deletePortion, getOwners, updateOwner, deleteBuilding, createBuilding, updateBuilding, getOwnerBuildings, createPortion, getPortionsByBuildingId, updatePortion, boostPortion, toggleIsActiveAndUpdateOwnerUsage } from "../controller/owner.controller";
import { auth } from "../middleware/auth.middleware";
import { checkPlanLimit } from "../middleware/plan_limit.middleware";
import { checkOwnerPlanExpiry } from "../middleware/plan_expiry.middleware";

const ownerRouter = Router()

ownerRouter.post('/create-owner', auth, createOwner)    // DONE
ownerRouter.patch('/update-owner', auth, updateOwner)   // DONE
ownerRouter.delete('/delete-owner', auth, deleteOwner)
ownerRouter.get('/get-owners', auth, getOwners) // DONE
ownerRouter.get('/me', auth, getOwnerById) // DONE

// Buildings
ownerRouter.post('/create-building', auth, createBuilding) // DONE
ownerRouter.patch('/update-building', auth, updateBuilding) // DONE
ownerRouter.delete('/delete-building', auth, deleteBuilding) // DONE
ownerRouter.get('/buildings/me', auth, getOwnerBuildings) // DONE

// Portions
ownerRouter.post('/buildings/create-portion', auth, checkOwnerPlanExpiry, checkPlanLimit, createPortion) // DONE
ownerRouter.patch('/buildings/update-portion', auth, checkOwnerPlanExpiry, checkPlanLimit, updatePortion) // DONE
ownerRouter.delete('/buildings/delete-portion', auth, deletePortion) 
ownerRouter.post('/buildings/boost-portion', auth, checkOwnerPlanExpiry, boostPortion)
ownerRouter.patch('/buildings/toggle-portion-status', auth, checkOwnerPlanExpiry, toggleIsActiveAndUpdateOwnerUsage)
ownerRouter.get('/buildings/get-portions', auth, getPortionsByBuildingId) // DONE

export default ownerRouter;