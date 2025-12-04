import express from "express";
import { ServiceController } from "./service.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { parseBodyData } from "../../middlewares/parseNestedJson";
import validateRequest from "../../middlewares/validateRequest";
import { ServiceValidation } from "./service.validation";
import { uploadFile } from "../../../helpars/fileUploader";

const router = express.Router();

// create service
router.post(
  "/",
  auth(UserRole.SERVICE_PROVIDER),
  uploadFile.coverImage,
  parseBodyData,
  validateRequest(ServiceValidation.createServiceSchema),
  ServiceController.createService
);

// update service
router.patch(
  "/:id",
  auth(UserRole.SERVICE_PROVIDER),
  parseBodyData,
  validateRequest(ServiceValidation.updateServiceSchema),
  ServiceController.updateService
);

// get single service
router.get(
  "/:id",
  ServiceController.getServiceById
);

// get all services
router.get(
  "/",
  ServiceController.getAllServices
);

export const serviceRoutes = router;
