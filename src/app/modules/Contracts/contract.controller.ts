import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { ContractService } from "./contract.service";
import { pick } from "../../../shared/pick";
import { filterField } from "./contract.constant";
import { paginationFields } from "../../../constants/pagination";

// get all contracts (bookings)
const getAllContracts = catchAsync(async (req: Request, res: Response) => {
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
  const result = await ContractService.getAllContracts(filter, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contracts fetched successfully",
    data: result,
  });
});

// get single contract
const getSingleContract = catchAsync(async (req: Request, res: Response) => {
  const { id, type } = req.params;
  const result = await ContractService.getSingleContract(id, type);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contract fetched successfully",
    data: result,
  });
});

export const ContractController = {
  getAllContracts,
  getSingleContract,
};
