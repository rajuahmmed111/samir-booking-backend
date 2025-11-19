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
  await prisma.faq.update({
    where: { id },
    data: {
      question,
      answer,
    },
  });
};

// delete faq
const deleteFaq = async (id: string) => {
  await prisma.faq.delete({ where: { id } });
};

export const FaqService = {
  createFaq,
  getAllFaq,
  getSingleFaq,
  updateFaq,
  deleteFaq,
};
