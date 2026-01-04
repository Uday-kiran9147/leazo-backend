export interface User {
  _id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: 'Admin' | 'User' | 'Moderator';
}

export interface Portion {
  _id: string;
  title: string;
  description?: string;
  floor?: string;
  portionNumber?: string;
  ownerId: string;
  buildingId?: string;
  approvalStatus: 'Review' | 'Hold' | 'Approved' | 'Rejected';
  isActive: boolean;
  availabilityStatus: 'available' | 'not available';
  price: number;
  location?: string;
  address?: {
    city?: string;
    state?: string;
    locality?: string;
    pincode?: string;
  };
  contact?: {
    phoneNumber?: string;
    name?: string;
  };
  amenities?: string[];
  images: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStats {
  totalListings: number;
  activeListings: number;
  pendingInquiries: number;
  holdInquiries: number;
  occupiedPortions: number;
  rejectedPortions: number;
  occupancyRate: string;
  totalBuildings: number;
}
