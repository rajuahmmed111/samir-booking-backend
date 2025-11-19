import prisma from "../../../shared/prisma";

// create advertising
const createAdvertising = async (adminId: string, payload: any) => {
  const advertising = await prisma.advertise.create({
    data: {
      ...payload,
      adminId,
    },
  });
  return advertising;
};

// get all advertising
const getAllAdvertising = async () => {
  const advertising = await prisma.advertise.findMany();
  return advertising;
};

// get single advertising advertisingId
const getSingleAdvertising = async (advertisingId: string) => {
  const advertising = await prisma.advertise.findUnique({
    where: { id: advertisingId },
  });
  return advertising;
};

// delete advertising by advertisingId
const deleteAdvertising = async (advertisingId: string) => {
  const advertising = await prisma.advertise.delete({
    where: { id: advertisingId },
  });
  return advertising;
};

// update advertising by advertisingId
const updateAdvertising = async (
  advertisingId: string,
  payload: any
) => {
  const advertising = await prisma.advertise.update({
    where: { id: advertisingId },
    data: {
      ...payload,
    },
  });
  return advertising;
};

export const AdvertisingServices = {
  createAdvertising,
  getAllAdvertising,
  getSingleAdvertising,
  deleteAdvertising,
  updateAdvertising,
};
