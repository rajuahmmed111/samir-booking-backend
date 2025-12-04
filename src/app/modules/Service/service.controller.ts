import catchAsync from "../../../shared/catchAsync";
import { Request, Response } from "express";
import { ServiceService } from "./service.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

// create service
const createService = catchAsync(async (req: Request, res: Response) => {
  const coverImageFile = req.file;
  const result = await ServiceService.createService(req.body, coverImageFile);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Service created successfully",
    data: result,
  });
});

// update service
const updateService = catchAsync(async (req: Request, res: Response) => {
  const coverImageFile = req.file;
  const { serviceId } = req.params;
  const result = await ServiceService.updateService(
    serviceId,
    req.body,
    coverImageFile
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service updated successfully",
    data: result,
  });
});

// get single service
const getServiceById = catchAsync(async (req: Request, res: Response) => {
  const serviceId = req.params.serviceId;
  const result = await ServiceService.getServiceById(serviceId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service retrieved successfully",
    data: result,
  });
});

// get all services
const getAllServices = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceService.getAllServices();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Services retrieved successfully",
    data: result,
  });
});

export const ServiceController = {
  createService,
  updateService,
  getServiceById,
  getAllServices,
};
