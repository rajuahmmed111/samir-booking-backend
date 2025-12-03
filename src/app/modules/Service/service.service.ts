import prisma from "../../../shared/prisma";

// create service
const createService = async (serviceProviderId: string, payload: any) => {
  const service = await prisma.service.create({
    data: {
      ...payload,
      serviceProviderId,
    },
  });
  return service;
};

export const ServiceService = {
  createService,
};
