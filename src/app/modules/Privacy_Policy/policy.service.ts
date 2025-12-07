import prisma from "../../../shared/prisma";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import { IPrivacyPolicy } from "./policy.interface";

// create or update privacy policy
const createOrUpdatePolicy = async (
  adminId: string,
  description: string
): Promise<IPrivacyPolicy | void> => {
  // find admin
  const admin = await prisma.user.findUnique({
    where: {
      id: adminId,
    },
  });
  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }

  const existPolicy = await prisma.privacy_Policy.findFirst();
  if (!existPolicy) {
    throw new ApiError(httpStatus.NOT_FOUND, "Privacy Policy not found");
  }

  let result;

  if (existPolicy) {
    // update existing record
    result = await prisma.privacy_Policy.update({
      where: { id: existPolicy.id },
      data: { description },
    });
  } else {
    // create new record
    result = await prisma.privacy_Policy.create({
      data: { description },
    });
  }

  return result;
};

// get all privacy policy
const getAllPolicy = async () => {
  const policy = await prisma.privacy_Policy.findMany();
  if (!policy)
    throw new ApiError(httpStatus.NOT_FOUND, "Privacy Policy not found");
  return policy;
};

export const PrivacyServices = {
  createOrUpdatePolicy,
  getAllPolicy,
};
