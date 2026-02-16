import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";

// create faq
const createFaq = async (payload: any) => {
  const faq = await prisma.faq.create({ data: payload });
  return faq;
};

// get all faq
const getAllFaq = async () => {
  const faq = await prisma.faq.findMany({ orderBy: { createdAt: "desc" } });
  return faq;
};

// get single faq
const getSingleFaq = async (id: string) => {
  const faq = await prisma.faq.findUnique({
    where: { id },
  });
  return faq;
};

// update faq
const updateFaq = async (id: string, payload: any) => {
  const { question, answer } = payload;

  // find faq
  const faq = await prisma.faq.findUnique({
    where: { id },
  });
  if (!faq) {
    throw new ApiError(httpStatus.NOT_FOUND, "Faq not found");
  }

  return await prisma.faq.update({
    where: { id },
    data: {
      question,
      answer,
    },
  });
};

// delete faq
const deleteFaq = async (id: string) => {
  // find faq
  const faq = await prisma.faq.findUnique({
    where: { id },
  });
  if (!faq) {
    throw new ApiError(httpStatus.NOT_FOUND, "Faq not found");
  }

  await prisma.faq.delete({ where: { id } });
};

export const FaqService = {
  createFaq,
  getAllFaq,
  getSingleFaq,
  updateFaq,
  deleteFaq,
};
