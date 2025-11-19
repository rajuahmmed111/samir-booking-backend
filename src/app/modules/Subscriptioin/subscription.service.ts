import { Currency, Subscription, ValidityType } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { ICreateSubscription } from "./subscription.interface";

const createSubscription = async (
  data: ICreateSubscription,
  userId?: string
): Promise<Subscription> => {
  if (userId) {
    const findUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!findUser) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }
  }

  const newSubscription = await prisma.subscription.create({
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
const getAllSubscriptions = async (
  searchQuery?: string,
  skip: number = 0,
  limit: number = 10
): Promise<Subscription[]> => {
  const where: any = {};
  if (searchQuery) {
    where.OR = [
      { name: { $contains: searchQuery } },
      { features: { hasSome: [searchQuery] } },
    ];
  }

  return await prisma.subscription.findMany({
    where,
    skip,
    take: limit,
  });
};

// get specific subscription
const getSpecificSubscription = async (
  id: string
): Promise<Subscription | null> => {
  return await prisma.subscription.findUnique({
    where: { id },
  });
};

// update specific subscription
const updateSpecificSubscription = async (
  id: string,
  data: Partial<ICreateSubscription>
): Promise<Subscription> => {
  return await prisma.subscription.update({
    where: { id },
    data,
  });
};

// delete specific subscription
const deleteSpecificSubscription = async (
  id: string
): Promise<Subscription> => {
  return await prisma.subscription.delete({
    where: { id },
  });
};

export const SubscriptionService = {
  createSubscription,
  getAllSubscriptions,
  getSpecificSubscription,
  updateSpecificSubscription,
  deleteSpecificSubscription,
};
