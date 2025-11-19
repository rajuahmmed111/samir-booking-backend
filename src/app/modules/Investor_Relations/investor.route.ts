import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { uploadFile } from "../../../helpars/fileUploader";
import validateRequest from "../../middlewares/validateRequest";
import { parseBodyData } from "../../middlewares/parseNestedJson";
import { InvestorRelationsController } from "./investor.controller";
import { InvestorRelationsValidation } from "./investor.validation";

const router = express.Router();

// get all investor relations
router.get("/", InvestorRelationsController.getAllInvestorRelations);

// get advertising by investorId
router.get(
  "/:investorId",
  InvestorRelationsController.getSingleInvestorRelation
);

// create investor relations
router.post(
  "/",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  uploadFile.invertorRelationImage,
  parseBodyData,
  validateRequest(InvestorRelationsValidation.createInvestorRelationsSchema),
  InvestorRelationsController.createInvestorRelations
);

// update investor relations by investorId
router.patch(
  "/:investorId",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  uploadFile.invertorRelationImage,
  parseBodyData,
  validateRequest(InvestorRelationsValidation.updateInvestorRelationsSchema),
  InvestorRelationsController.updateInvestorRelation
);

// delete investor relations by investorId
router.delete(
  "/:investorId",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  InvestorRelationsController.deleteInvestorRelation
);

export const investorRelationsRoutes = router;
