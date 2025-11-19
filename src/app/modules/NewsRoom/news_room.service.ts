import { Request } from "express";
import prisma from "../../../shared/prisma";
import { uploadFile } from "../../../helpars/fileUploader";

// create news room
const createNewsRoom = async (req: Request) => {
  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const imageFiles = files?.image || [];

  // upload multiple news room images
  let image: string[] = [];
  if (imageFiles.length > 0) {
    const ImageUploads = await Promise.all(
      imageFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    image = ImageUploads.map((img) => img?.secure_url || "");
  }

  const { tagline, title, summary, category, country, author } = req.body;

  const newsRoom = await prisma.newsroom.create({
    data: {
      tagline,
      title,
      summary,
      category,
      country,
      author,
      image,
    },
  });

  return newsRoom;
};

// get all news rooms
const getAllNewsRooms = async () => {
  const newsRooms = await prisma.newsroom.findMany();
  return newsRooms;
};

// get single
const getSingleNewsRoom = async (newsroomId: string) => {
  const newsRoom = await prisma.newsroom.findUnique({
    where: { id: newsroomId },
  });
  return newsRoom;
};

// update news room
const updateNewsRoom = async (req: Request) => {
  const newsroomId = req.params.newsroomId;

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const imageFiles = files?.image || [];

  // upload multiple news room images
  let image: string[] = [];
  if (imageFiles.length > 0) {
    const ImageUploads = await Promise.all(
      imageFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    image = ImageUploads.map((img) => img?.secure_url || "");
  }

  const { tagline, title, summary, category, country, author } = req.body;
  const newsRoom = await prisma.newsroom.update({
    where: { id: newsroomId },
    data: {
      tagline,
      title,
      summary,
      category,
      country,
      author,
      image,
    },
  });

  return newsRoom;
};

// delete news room
const deleteNewsRoom = async (newsroomId: string) => {
  const newsRoom = await prisma.newsroom.delete({
    where: { id: newsroomId },
  });
  return newsRoom;
};

export const NewsRoomService = {
  createNewsRoom,
  getAllNewsRooms,
  getSingleNewsRoom,
  updateNewsRoom,
  deleteNewsRoom,
};
