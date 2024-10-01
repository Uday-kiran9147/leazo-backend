import { Router } from "express";
import { createOwner, deleteOwner, getOwnerById, getOwners, updateOwner, createBuilding, updateBuilding, getOwnerBuildings, createPortion, getPortionsByBuildingId, updatePortion } from "../controller/owner.controller";
import { auth } from "../middleware/auth.middleware";

const ownerRouter = Router()

ownerRouter.post('/create-owner', auth, createOwner)    // DONE
ownerRouter.patch('/update-owner', auth, updateOwner)   // DONE
ownerRouter.delete('/delete-owner', auth, deleteOwner)
ownerRouter.get('/get-owners', auth, getOwners) // DONE
ownerRouter.get('/me', auth, getOwnerById) // DONE

ownerRouter.post('/create-building', auth, createBuilding) // DONE
ownerRouter.patch('/update-building', auth, updateBuilding) // DONE
ownerRouter.get('/buildings/me', auth, getOwnerBuildings) // DONE
ownerRouter.post('/buildings/create-portion', auth, createPortion) // DONE
ownerRouter.patch('/buildings/update-portion', auth, updatePortion) // DONE
ownerRouter.get('/buildings/get-portions', auth, getPortionsByBuildingId) // DONE

export default ownerRouter;