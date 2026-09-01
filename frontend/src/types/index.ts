export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';
export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';
export type MovementType = 'IN' | 'OUT';
export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface UserRef {
  id: string;
  name: string;
}

export interface PortalUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  businessName: string;
  gstNumber: string | null;
  type: CustomerType;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  status: CustomerStatus;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: UserRef;
}

export interface CustomerNote {
  id: string;
  note: string;
  followUpDate: string | null;
  createdAt: string;
  createdBy: UserRef;
}

export interface CustomerChallanSummary {
  id: string;
  challanNumber: string;
  status: ChallanStatus;
  totalQuantity: number;
  createdAt: string;
}

export interface CustomerDetail extends Customer {
  followUps: CustomerNote[];
  challans: CustomerChallanSummary[];
}

export interface FollowUpCustomer {
  id: string;
  name: string;
  businessName: string;
  mobile: string;
  status: CustomerStatus;
  followUpDate: string;
}

export interface FollowUpQueue {
  data: FollowUpCustomer[];
  meta: PageMeta;
  counts: { overdue: number; today: number; upcoming: number };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  location: string;
  isActive: boolean;
  imageUrl: string | null;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  quantity: number;
  type: MovementType;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string };
  createdBy: UserRef;
}

export interface ChallanItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Challan {
  id: string;
  challanNumber: string;
  status: ChallanStatus;
  totalQuantity: number;
  totalAmount: number;
  notes: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    businessName: string;
    mobile: string;
    gstNumber: string | null;
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
  };
  createdBy: UserRef;
  items: ChallanItem[];
}

export interface DashboardSummary {
  totals: {
    totalProducts: number;
    draftChallans: number;
    confirmedChallans: number;
    totalCustomers?: number;
    activeCustomers?: number;
    leads?: number;
    lowStockProducts?: number;
  };
  recentChallans: {
    id: string;
    challanNumber: string;
    status: ChallanStatus;
    totalQuantity: number;
    createdAt: string;
    customer: { businessName: string };
  }[];
  stockAlerts: {
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    minStockAlert: number;
  }[];
  upcomingFollowUps: {
    id: string;
    name: string;
    businessName: string;
    mobile: string;
    followUpDate: string;
  }[];
}
