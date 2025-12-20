import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { paginationHelpers } from "../../../helpars/paginationHelper";
// import channelClients from '../../../server';
import { ObjectId } from "mongodb";
import { IMessageFilterRequest } from "./message.interface";
import { searchableFields } from "./message.constant";

// send message
const sendMessage = async (
  senderId: string,
  receiverId: string,
  message: string,
  imageUrls: string[]
) => {
  const [person1, person2] = [senderId, receiverId].sort();
  const channelName = person1 + person2;

  if (!senderId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "UNAUTHORIZED");
  }

  // use transaction
  const [channel, newMessage] = await prisma.$transaction(
    async (prismaTransaction) => {
      let channel = await prismaTransaction.channel.findFirst({
        where: {
          channelName: channelName,
        },
      });

      if (!channel) {
        channel = await prismaTransaction.channel.create({
          data: {
            channelName,
            person1Id: senderId,
            person2Id: receiverId,
          },
        });
      }

      //  message created
      const newMessage = await prismaTransaction.message.create({
        data: {
          message,
          senderId,
          channelName: channelName,
          files: imageUrls,
        },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
            },
          },
        },
      });

      return [channel, newMessage];
    }
  );

  //  all messages channel for the sender and receiver
  const allMessages = await prisma.channel.findMany({
    where: {
      channelName: channelName,
    },
    include: {
      messages: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // // Broadcast the new message to all WebSocket clients subscribed to the channel
  // const connectedClients = channelClients.get(channel.id) || new Set();
  // const messagePayload = {
  //   type: 'newMessage',
  //   channelId: channel.id,
  //   data: newMessage,
  // };

  // connectedClients.forEach((client: any) => {
  //   if (client.readyState === WebSocket.OPEN) {
  //     client.send(JSON.stringify(messagePayload));
  //   }
  // });

  return allMessages;
};

// get my channel by my id
const getMyChannelByMyId = async (userId: string) => {
  // user active + role USER | BUSINESS_PARTNER
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (
    !user ||
    user.status !== UserStatus.ACTIVE ||
    (user.role !== UserRole.USER && user.role !== UserRole.PROPERTY_OWNER)
  ) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found or invalid role");
  }

  // find channels where person1 or person2
  const channels = await prisma.channel.findMany({
    where: {
      OR: [{ person1Id: userId }, { person2Id: userId }],
    },
    include: {
      person1: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      person2: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  // keep USER or BUSINESS_PARTNER + active
  const result = channels.map((channel) => {
    let receiverUser = null;

    if (channel.person1Id === userId) {
      receiverUser =
        channel.person2 &&
        channel.person2.status === UserStatus.ACTIVE &&
        ([UserRole.USER, UserRole.PROPERTY_OWNER] as UserRole[]).includes(
          channel.person2.role
        )
          ? channel.person2
          : null;
    } else if (channel.person2Id === userId) {
      receiverUser =
        channel.person1 &&
        channel.person1.status === UserStatus.ACTIVE &&
        ([UserRole.USER, UserRole.PROPERTY_OWNER] as UserRole[]).includes(
          channel.person1.role
        )
          ? channel.person1
          : null;
    }

    return {
      id: channel.id,
      channelName: channel.channelName,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
      receiverUser,
    };
  });

  // only return channels receiverUser
  return result.filter((ch) => ch.receiverUser !== null);
};

// get my channel by my id for user support
const getMyChannelByMyIdForUserSupport = async (
  userId: string,
  params: IMessageFilterRequest,
  options: IPaginationOptions
) => {
  if (!ObjectId.isValid(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user id format");
  }

  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);
  const { searchTerm } = params;

  const user = await prisma.user.findUnique({
    where: { id: new ObjectId(userId).toString() },
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found or inactive");
  }

  const channels = await prisma.channel.findMany({
    where: {
      OR: [{ person1Id: userId }, { person2Id: userId }],
    },
    include: {
      person1: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
          role: true,
          status: true,
        },
      },
      person2: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
          role: true,
          status: true,
        },
      },
    },
    skip,
    take: limit,
  });

  // Transform and filter
  let result = channels
    .map((channel) => {
      const p1 = channel.person1;
      const p2 = channel.person2;
      if (!p1 || !p2) return null;

      const bothActive =
        p1.status === UserStatus.ACTIVE && p2.status === UserStatus.ACTIVE;

      const isUserAdminPair =
        bothActive &&
        ((p1.role === UserRole.USER && p2.role === UserRole.ADMIN) ||
          (p1.role === UserRole.ADMIN && p2.role === UserRole.USER));

      if (!isUserAdminPair) return null;

      const receiverUser = channel.person1Id === userId ? p2 : p1;

      return {
        id: channel.id,
        channelName: channel.channelName,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt,
        receiverUser,
      };
    })
    .filter((ch) => ch !== null);

  // search fullName and email
  if (searchTerm) {
    result = result.filter((ch) => {
      const nameMatch = ch!.receiverUser.fullName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      const emailMatch = ch!.receiverUser.email
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      return nameMatch || emailMatch;
    });
  }

  return {
    meta: { page, limit },
    data: result,
  };
};

// get my channel through my id and receiver id
const getMyChannel = async (userId: string, receiverId: string) => {
  // find person1 and person2
  const user1 = await prisma.user.findUnique({ where: { id: userId } });
  const user2 = await prisma.user.findUnique({ where: { id: receiverId } });
  if (!user1 || !user2) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const [person1, person2] = [userId, receiverId].sort();
  const channelName = person1 + person2;
  const channel = await prisma.channel.findFirst({
    where: {
      channelName: channelName,
    },
  });
  return channel;
};

// get all messages
const getMessagesFromDB = async (
  channelName: string,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const message = await prisma.channel.findMany({
    where: {
      channelName: channelName,
    },
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: "desc",
          },
    select: {
      messages: {
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

  const total = await prisma.channel.count();

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: message,
  };
};

// get user channels with search + pagination
const getUserChannels = async (
  userId: string,
  params: IMessageFilterRequest,
  options: IPaginationOptions
) => {
  const { searchTerm } = params;
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  // make sure user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const filters: Prisma.ChannelWhereInput[] = [];

  // search filter on person1 / person2
  if (searchTerm) {
    filters.push({
      OR: [
        {
          person1: {
            OR: [
              { fullName: { contains: searchTerm, mode: "insensitive" } },
              { email: { contains: searchTerm, mode: "insensitive" } },
            ],
          },
        },
        {
          person2: {
            OR: [
              { fullName: { contains: searchTerm, mode: "insensitive" } },
              { email: { contains: searchTerm, mode: "insensitive" } },
            ],
          },
        },
      ],
    });
  }

  const where: Prisma.ChannelWhereInput = {
    AND: [
      {
        OR: [{ person1Id: userId }, { person2Id: userId }],
      },
      ...filters,
    ],
  };

  // fetch channels with pagination
  const channels = await prisma.channel.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },
    include: {
      person1: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
        },
      },
      person2: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
        },
      },
    },
  });

  // total count for pagination
  const total = await prisma.channel.count({ where });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: channels,
  };
};

// get all channels only user and admin
const getUserAdminChannels = async () => {
  // find all channels
  const channels = await prisma.channel.findMany({
    include: {
      person1: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      person2: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  // filter: keep only channels where both persons are active & role in ADMIN | USER
  const result = channels.map((channel) => {
    let receiverUser = null;

    // person1 is valid receiver?
    if (
      channel.person1 &&
      channel.person1.status === UserStatus.ACTIVE &&
      (channel.person1.role === UserRole.USER ||
        channel.person1.role === UserRole.ADMIN)
    ) {
      receiverUser = channel.person1;
    }

    // person2 is valid receiver?
    if (
      channel.person2 &&
      channel.person2.status === UserStatus.ACTIVE &&
      (channel.person2.role === UserRole.USER ||
        channel.person2.role === UserRole.ADMIN)
    ) {
      // decide receiverUser based on some logic, e.g., prefer person2
      // or you can keep both in array if you want
      receiverUser = receiverUser
        ? [receiverUser, channel.person2]
        : channel.person2;
    }

    return {
      id: channel.id,
      channelName: channel.channelName,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
      receiverUser,
    };
  });

  // only return channels where valid receiver exists
  return result.filter((ch) => ch.receiverUser !== null);
};

// get single channel
const getSingleChannel = async (channelId: string) => {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: {
      person1: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
      person2: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
      messages: {
        select: {
          id: true,
          senderId: true,
          message: true,
          createdAt: true,
          sender: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

  if (!channel) {
    throw new ApiError(httpStatus.NOT_FOUND, "Channel not found");
  }

  // receiver user
  let receiverUser = null;

  if (channel.messages.length > 0) {
    const firstMessageSenderId = channel.messages[0].senderId;

    if (firstMessageSenderId === channel.person1Id) {
      receiverUser = channel.person2;
    } else if (firstMessageSenderId === channel.person2Id) {
      receiverUser = channel.person1;
    }
  } else {
    // no messages
    receiverUser = channel.person2;
  }

  return {
    id: channel.id,
    channelName: channel.channelName,
    createdAt: channel.createdAt,
    updatedAt: channel.updatedAt,
    receiverUser,
    messages: channel.messages,
  };
};

export const MessageServices = {
  sendMessage,
  getMyChannel,
  getMyChannelByMyId,
  getMyChannelByMyIdForUserSupport,
  getMessagesFromDB,
  getUserChannels,
  getUserAdminChannels,
  getSingleChannel,
};
