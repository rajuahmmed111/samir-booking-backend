import { ServiceStatus } from "@prisma/client";
import { type } from "os";

export type IServiceFilterRequest = {
  searchTerm?: string | undefined;
  serviceName?: string | undefined;
  serviceType?: string | undefined;
  serviceStatus?: string | undefined;
};

export interface ServiceSlot {
  id?: string;
  from: string;
  to: string;
}

export interface ServiceAvailability {
  id?: string;
  day: string;
  slots: ServiceSlot[];
}

export interface IServiceCreate {
  serviceName: string;
  serviceType: string;
  description: string;
  price: number;
  coverImage: string;
  serviceStatus: string;
  recordProofVideo?: string;
  addRemark?: string;
  availability: ServiceAvailability[];
}

export interface IServiceUpdate {
  serviceName?: string;
  serviceType?: string;
  description?: string;
  price?: number;
  coverImage?: string;
  serviceStatus?: string;
  recordProofVideo?: string;
  addRemark?: string;
  availability?: ServiceAvailability[];
}
export interface IServiceResponse {
  id: string;
  serviceName: string;
  serviceType: string;
  description: string;
  price: number;
  coverImage: string;
  serviceStatus: string;
  recordProofVideo: string;
  addRemark?: string;
  createdAt: Date;
  updatedAt: Date;
  availability: ServiceAvailability[];
}
