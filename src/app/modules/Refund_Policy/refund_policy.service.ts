import prisma from "../../../shared/prisma";

// create or update Refund policy
const createOrUpdateRefundPolicy = async (description: string) => {
  const existing = await prisma.refund_Policy.findFirst();

  let result;

  if (existing) {
    // update existing record
    result = await prisma.refund_Policy.update({
      where: { id: existing.id },
      data: { description },
    });
  } else {
    // create new record
    result = await prisma.refund_Policy.create({
      data: { description },
    });
  }

  return result;
};

// get all Refund policy
const getAllRefundPolicy = async () => {
  const result = await prisma.refund_Policy.findMany();
  return result;
};

export const RefundPolicyService = {
  createOrUpdateRefundPolicy,
  getAllRefundPolicy,
};
