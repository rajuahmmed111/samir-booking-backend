import prisma from "../../../shared/prisma";

// create or update cancel reservation
const createOrUpdateCancelReservation = async (description: string) => {
  const existing = await prisma.cancel_Reservation.findFirst();

  let result;

  if (existing) {
    // update existing record
    result = await prisma.cancel_Reservation.update({
      where: { id: existing.id },
      data: { description },
    });
  } else {
    // create new record
    result = await prisma.cancel_Reservation.create({
      data: { description },
    });
  }

  return result;
};

// get all cancel reservation
const getAllCancelReservation = async () => {
  const result = await prisma.cancel_Reservation.findMany();
  return result;
};

export const CancelReservationService = {
  createOrUpdateCancelReservation,
  getAllCancelReservation,
};
