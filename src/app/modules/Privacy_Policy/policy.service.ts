import prisma from "../../../shared/prisma";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import { IPrivacyPolicy } from "./policy.interface";
import { Privacy_Policy } from "@prisma/client";

// create privacy policy
const createPolicy = async (
  adminId: string,
  payload: IPrivacyPolicy
): Promise<Omit<Privacy_Policy, "adminId"> | null> => {
  const result = await prisma.$transaction(async (tx) => {
    await tx.privacy_Policy.deleteMany({ where: { adminId } });

    const newPolicy = await tx.privacy_Policy.create({
      data: { ...payload, adminId },
      select: {
        id: true,
        title: true,
        introduction: true,
        information_collect: true,
        how_useYour_data: true,
        data_security: true,
        third_party_services: true,
        user_control: true,
        children_privacy: true,
        changes_to_policy: true,
        contact_info: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return newPolicy;
  });

  return result;
};

// get all privacy policy
const getAllPolicy = async (): Promise<Omit<
  Privacy_Policy,
  "adminId"
> | null> => {
  const policy = await prisma.privacy_Policy.findFirst({
    select: {
      id: true,
      title: true,
      introduction: true,
      information_collect: true,
      how_useYour_data: true,
      data_security: true,
      third_party_services: true,
      user_control: true,
      children_privacy: true,
      changes_to_policy: true,
      contact_info: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!policy)
    throw new ApiError(httpStatus.NOT_FOUND, "Privacy Policy not found");
  return policy;
};

// get privacy policy by id
const getSinglePolicy = async (id: string): Promise<Privacy_Policy> => {
  const policy = await prisma.privacy_Policy.findUnique({ where: { id } });
  if (!policy)
    throw new ApiError(httpStatus.NOT_FOUND, "Privacy Policy not found");
  return policy;
};

// update privacy policy
const updatePolicyByAdminId = async (
  adminId: string,
  policyId: string,
  payload: Partial<Privacy_Policy>
): Promise<Omit<Privacy_Policy, "adminId">> => {
  const admin = await prisma.user.findUnique({
    where: {
      id: adminId,
    },
  });
  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }

  const policy = await prisma.privacy_Policy.findUnique({
    where: {
      id: policyId,
    },
  });
  if (!policy) {
    throw new ApiError(httpStatus.NOT_FOUND, "Privacy Policy not found");
  }

  const updated = await prisma.privacy_Policy.update({
    where: { id: policy.id },
    data: payload,
    select: {
      id: true,
      title: true,
      introduction: true,
      information_collect: true,
      how_useYour_data: true,
      data_security: true,
      third_party_services: true,
      user_control: true,
      children_privacy: true,
      changes_to_policy: true,
      contact_info: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updated!;
};

export const PrivacyServices = {
  createPolicy,
  getAllPolicy,
  getSinglePolicy,
  updatePolicyByAdminId,
};
