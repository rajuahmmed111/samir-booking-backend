import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { InventoryService } from "./inventory.service";
import { Request, Response } from "express";

// update many inventory items by hotelId
const updateInventoryItem = catchAsync(async (req: Request, res: Response) => {
  const hotelId = req.params.hotelId;
  const result = await InventoryService.updateInventoryItem(hotelId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Inventory item updated successfully",
    data: result,
  });
});

// update multiple specific inventory items by hotelId
const updateMultipleInventoryItems = catchAsync(
  async (req: Request, res: Response) => {
    const hotelId = req.params.hotelId;
    const result = await InventoryService.updateMultipleInventoryItems(
      hotelId,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Multiple inventory items updated successfully",
      data: result,
    });
  },
);

export const InventoryController = {
  updateInventoryItem,
  updateMultipleInventoryItems,
};
