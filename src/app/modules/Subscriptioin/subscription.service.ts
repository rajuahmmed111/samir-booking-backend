import { SubscriptionPlan } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { ICreateSubscriptionPlan } from "./subscription.interface";

// ----------------------------subscription plan--------------------------------

// create subscription plan
const createSubscriptionPlan = async (
  data: ICreateSubscriptionPlan,
  userId?: string
): Promise<SubscriptionPlan> => {
  if (userId) {
    const findUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!findUser) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }
  }

  const newSubscription = await prisma.subscriptionPlan.create({
    data: {
      name: data.name,
      price: {
        currency: data.price.currency,
        amount: data.price.amount,
      },
      validity: {
        type: data.validity.type,
        value: data.validity.value,
      },
      features: data.features,
      user: userId ? { connect: { id: userId } } : undefined,
    },
  });

  return newSubscription;
};

// get all subscriptions
const getAllSubscriptionsPlan = async (
  searchQuery?: string,
  skip: number = 0,
  limit: number = 10
): Promise<SubscriptionPlan[]> => {
  const where: any = {};
  if (searchQuery) {
    where.OR = [
      { name: { $contains: searchQuery } },
      { features: { hasSome: [searchQuery] } },
    ];
  }

  return await prisma.subscriptionPlan.findMany({
    where,
    skip,
    take: limit,
  });
};

// get specific subscriptionPlan
const getSpecificSubscriptionPlan = async (
  id: string
): Promise<SubscriptionPlan | null> => {
  return await prisma.subscriptionPlan.findUnique({
    where: { id },
  });
};

// update specific subscriptionPlan
const updateSpecificSubscriptionPlan = async (
  id: string,
  data: Partial<ICreateSubscriptionPlan>
): Promise<SubscriptionPlan> => {
  return await prisma.subscriptionPlan.update({
    where: { id },
    data,
  });
};

// delete specific subscriptionPlan
const deleteSpecificSubscriptionPlan = async (
  id: string
): Promise<SubscriptionPlan> => {
  return await prisma.subscriptionPlan.delete({
    where: { id },
  });
};

// ----------------------------subscription--------------------------------

export const SubscriptionService = {
  createSubscriptionPlan,
  getAllSubscriptionsPlan,
  getSpecificSubscriptionPlan,
  updateSpecificSubscriptionPlan,
  deleteSpecificSubscriptionPlan,
};
