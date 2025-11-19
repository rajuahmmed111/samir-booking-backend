import { Terms_Condition } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { ICreateTermsCondition } from "./terms.interface";

// Create terms & conditions
const createTerms = async (
  adminId: string,
  payload: ICreateTermsCondition
): Promise<Omit<Terms_Condition, "adminId">> => {
  const result = await prisma.$transaction(async (tx) => {
    // delete previous terms by this admin
    await tx.terms_Condition.deleteMany({
      where: {
        adminId,
      },
    });

    // then create new terms and conditions
    const newTerms = await tx.terms_Condition.create({
      data: {
        ...payload,
        adminId, // stored but not exposed
      },
      select: {
        id: true,
        title: true,
        acceptance_terms: true,
        app_purpose: true,
        user_responsibilities: true,
        data_usage: true,
        intellectual_property: true,
        limitation: true,
        updates: true,
        contactUS: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return newTerms;
  });

  return result;
};

// get all terms
const getTerms = async (): Promise<Omit<Terms_Condition, "adminId"> | null> => {
  const result = await prisma.terms_Condition.findFirst({
    select: {
      id: true,
      title: true,
      acceptance_terms: true,
      app_purpose: true,
      user_responsibilities: true,
      data_usage: true,
      intellectual_property: true,
      limitation: true,
      updates: true,
      contactUS: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Terms and Conditions not found");
  }

  return result;
};

// get single terms
const getSingleTerms = async (id: string): Promise<Terms_Condition> => {
  const result = await prisma.terms_Condition.findUnique({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Terms and Conditions not found");
  }
  return result;
};

// update terms
const updateTermsByAdminId = async (
  adminId: string,
  termId: string,
  payload: Partial<Terms_Condition>
): Promise<Omit<Terms_Condition, "adminId">> => {
  const admin = await prisma.user.findUnique({
    where: {
      id: adminId,
    },
  });
  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }

  const result = await prisma.terms_Condition.findUnique({
    where: { id: termId },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Terms and Conditions not found");
  }

  // terms and condition updated
  const updatedTerms = await prisma.terms_Condition.update({
    where: { id: termId },
    data: payload,
    select: {
      id: true,
      title: true,
      acceptance_terms: true,
      app_purpose: true,
      user_responsibilities: true,
      data_usage: true,
      intellectual_property: true,
      limitation: true,
      updates: true,
      contactUS: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedTerms!;
};

export const TermsServices = {
  createTerms,
  getTerms,
  getSingleTerms,
  updateTermsByAdminId,
};
