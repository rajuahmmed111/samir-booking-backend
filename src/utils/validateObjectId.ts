import { ObjectId } from "mongodb";

export const isValidObjectId = (id: string): boolean => {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
};