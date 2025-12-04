export interface ServiceSlot {
  from: string;
  to: string;
}

export interface ServiceAvailability {
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