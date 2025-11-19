import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { HumanRightService } from "./humanRight.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

// create or update human rights
const createOrUpdateHumanRights = catchAsync(
  async (req: Request, res: Response) => {
    const { description } = req.body;
    const result = await HumanRightService.createOrUpdateHumanRights(
      description
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Human rights created successfully",
      data: result,
    });
  }
);

// get all human rights
const getAllHumanRights = catchAsync(async (req: Request, res: Response) => {
  const result = await HumanRightService.getAllHumanRights();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Human rights retrieved successfully",
    data: result,
  });
});

export const HumanRightController = {
  createOrUpdateHumanRights,
  getAllHumanRights,
};
