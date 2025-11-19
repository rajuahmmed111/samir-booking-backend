import prisma from "../../../shared/prisma";

// create or update human rights
const createOrUpdateHumanRights = async (description: string) => {
  const existing = await prisma.human_Rights.findFirst();

  let result;

  if (existing) {
    // Update existing record
    result = await prisma.human_Rights.update({
      where: { id: existing.id },
      data: { description },
    });
  } else {
    // Create new record
    result = await prisma.human_Rights.create({
      data: { description },
    });
  }

  return result;
};

// get all human rights
const getAllHumanRights = async () => {
  const result = await prisma.human_Rights.findMany();
  return result;
};

export const HumanRightService = {
  createOrUpdateHumanRights,
  getAllHumanRights,
};
