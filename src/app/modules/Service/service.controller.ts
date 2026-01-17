import catchAsync from "../../../shared/catchAsync";
import { Request, Response } from "express";
import { ServiceService } from "./service.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { pick } from "../../../shared/pick";
import { filterField } from "./service.constant";
import { paginationFields } from "../../../constants/pagination";

// create service
const createService = catchAsync(async (req: Request, res: Response) => {
  const coverImageFile = req.file;
  const providerId = req.user?.id;
  const result = await ServiceService.createService(
    providerId,
    req.body,
    coverImageFile,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Service created successfully",
    data: result,
  });
});

// update service
const updateService = catchAsync(async (req: Request, res: Response) => {
  const files = req.files;
  const coverImageFile = !Array.isArray(files)
    ? files?.coverImage?.[0]
    : undefined;
  const videoStartingFiles = !Array.isArray(files)
    ? files?.recordProofVideoStarting || []
    : [];
  const videoEndingFiles = !Array.isArray(files)
    ? files?.recordProofVideoEnding || []
    : [];
  const { serviceId } = req.params;
  const result = await ServiceService.updateService(
    serviceId,
    req.body,
    coverImageFile,
    videoStartingFiles,
    videoEndingFiles,
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
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);

  const result = await ServiceService.getAllServices(filter, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Services retrieved successfully",
    data: result,
  });
});

// get all my services
const getMyServices = catchAsync(async (req: Request, res: Response) => {
  const providerId = req.user?.id;
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);

  const result = await ServiceService.getMyServices(
    providerId,
    filter,
    options,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My services retrieved successfully",
    data: result,
  });
});

// delete service
const deleteService = catchAsync(async (req: Request, res: Response) => {
  const { serviceId } = req.params;
  const providerId = req.user?.id;

  const result = await ServiceService.deleteService(serviceId, providerId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service deleted successfully",
    data: result,
  });
});

export const ServiceController = {
  createService,
  updateService,
  getServiceById,
  getAllServices,
  getMyServices,
  deleteService,
};
