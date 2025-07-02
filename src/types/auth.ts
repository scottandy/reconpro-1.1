export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: 'admin' | 'manager' | 'technician' | 'sales' | 'super-admin';
  dealershipId: string | null;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Dealership {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string | null;
  logo?: string | null;
  isActive: boolean;
  subscriptionPlan?: string | null;
  status?: string | null;
  lastActivity?: string | null;
  totalUsers: number;
  totalVehicles: number;
  monthlyRevenue: number;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  dealership: Dealership | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterDealershipData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  dealershipName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  dealershipEmail: string;
  website?: string;
}

export interface RegisterUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'admin' | 'manager' | 'technician' | 'sales';
}