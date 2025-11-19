import express from "express";
import { HumanRightController } from "./humanRight.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// create or update human rights
router.patch(
  "/",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  HumanRightController.createOrUpdateHumanRights
);

// get all human rights
router.get(
  "/",
//   auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  HumanRightController.getAllHumanRights
);

export const humanRightRoute = router;
