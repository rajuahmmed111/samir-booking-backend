import catchAsync from "../../../shared/catchAsync";
import { Request, Response } from "express";
import { ServiceService } from "./service.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

// create service
const createService = catchAsync(async (req: Request, res: Response) => {
  const serviceProviderId = req.user?.id;
  const result = await ServiceService.createService(
    serviceProviderId,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Service created successfully",
    data: result,
  });
});

export const ServiceController = {
  createService,
};
