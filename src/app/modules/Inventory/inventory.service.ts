import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { IUpdateInventoryItems } from "./inventory.interface";

// update multiple specific inventory items by hotelId
const updateMultipleInventoryItems = async (
  hotelId: string,
  data: IUpdateInventoryItems,
) => {
  // verify hotel exists
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
  });

  if (!hotel) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
  }

  // update each item individually
  const results = await Promise.all(
    data.items.map(async (item) => {
      // verify item exists and belongs to hotel
      const existingItem = await prisma.inventoryItem.findFirst({
        where: { id: item.id, hotelId },
      });

      if (!existingItem) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          `Inventory item with id ${item.id} not found`,
        );
      }

      return prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          name: item.name,
          quantity: item.quantity,
          missingQuantity: item.missingQuantity,
          description: item.description,
        },
      });
    }),
  );

  return results;
};

export const InventoryService = {
  updateMultipleInventoryItems,
};
