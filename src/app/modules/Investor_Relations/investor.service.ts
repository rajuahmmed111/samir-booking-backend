import prisma from "../../../shared/prisma";

// create investor relations
const createInvestorRelations = async (adminId: string, payload: any) => {
  const advertising = await prisma.investor_Relations.create({
    data: {
      ...payload,
      adminId,
    },
  });
  return advertising;
};

// get all investor relations
const getAllInvestorRelations = async () => {
  const advertising = await prisma.investor_Relations.findMany();
  return advertising;
};

// get single investor relations investorId
const getSingleInvestorRelation = async (investorId: string) => {
  const advertising = await prisma.investor_Relations.findUnique({
    where: { id: investorId },
  });
  return advertising;
};

// delete investor relations by investorId
const deleteInvestorRelation = async (investorId: string) => {
  const advertising = await prisma.investor_Relations.delete({
    where: { id: investorId },
  });
  return advertising;
};

// update investor relations by investorId
const updateInvestorRelation = async (investorId: string, payload: any) => {
  const advertising = await prisma.investor_Relations.update({
    where: { id: investorId },
    data: {
      ...payload,
    },
  });
  return advertising;
};

export const InvestorRelationsServices = {
  createInvestorRelations,
  getAllInvestorRelations,
  getSingleInvestorRelation,
  deleteInvestorRelation,
  updateInvestorRelation,
};
