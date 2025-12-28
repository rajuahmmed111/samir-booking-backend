import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

// create or update terms & conditions
const createOrUpdateTerms = async (adminId: string, description: string) => {
  // find admin
  const admin = await prisma.user.findUnique({
    where: {
      id: adminId,
    },
  });
  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }

  // find terms & conditions
  const existTerms = await prisma.terms_Condition.findFirst();

  let result;

  if (existTerms) {
    // update existing record
    result = await prisma.terms_Condition.update({
      where: { id: existTerms.id },
      data: { description },
    });
  } else {
    // create new record
    result = await prisma.terms_Condition.create({
      data: {
        description,
      },
    });
  }
};

// get all terms
const getTerms = async () => {
  const result = await prisma.terms_Condition.findMany();

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Terms and Conditions not found");
  }

  return result;
};

export const TermsServices = {
  createOrUpdateTerms,
  getTerms,
};
