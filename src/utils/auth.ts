import { User, Dealership, AuthState, LoginCredentials, RegisterDealershipData, RegisterUserData } from '../types/auth';
import { supabase } from './supabaseClient';

export class AuthManager {
  static async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    return data as User[];
  }

  static async getDealerships(): Promise<Dealership[]> {
    const { data, error } = await supabase
      .from('dealerships')
      .select('*');
    if (error) {
      console.error('Error fetching dealerships:', error);
      return [];
    }
    return data as Dealership[];
  }

  static async login(credentials: LoginCredentials): Promise<{ user: User | null; dealership: Dealership | null }> {
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
      if (signInError || !signInData.session || !signInData.user) {
        return { user: null, dealership: null };
      }
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', signInData.user.id)
          .single();
        if (profileError || !profile) {
          return { user: null, dealership: null };
        }
        const { data: dealership, error: dealershipError } = await supabase
          .from('dealerships')
          .select('*')
          .eq('id', profile.dealership_id)
          .single();
        if (dealershipError || !dealership) {
          return { user: null, dealership: null };
        }
        return { user: profile as User, dealership: dealership as Dealership };
      } catch (err) {
        return { user: null, dealership: null };
      }
    } catch (err) {
      return { user: null, dealership: null };
    }
  }

  static logout(): void {
    supabase.auth.signOut();
  }

  static getCurrentSession(): { user: User; dealership: Dealership } | null {
    return null;
  }

  static async registerDealership(data: RegisterDealershipData): Promise<{ user: User; dealership: Dealership }> {
    // 1. Create user in Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          dealership_name: data.dealershipName,
          address: data.address,
          city: data.city,
          state: data.state,
          zip_code: data.zipCode,
          phone: data.phone,
          dealership_email: data.dealershipEmail,
          website: data.website,
        }
      }
    });

    if (signUpError) throw signUpError;

    // Wait for trigger to create dealership/profile (or fetch them)
    // For now, just return the user object from signUpData
    return {
      user: signUpData.user as any, // You may want to fetch the full profile
      dealership: {} as any // You may want to fetch the dealership by email
    };
  }

  static async registerUser(data: RegisterUserData, dealershipId: string): Promise<User> {
    try {
      // Since we can't use admin methods from the client, we'll use the regular signup method
      // but with a special approach to handle the dealership assignment
      
      // First, check if user already exists by trying to sign them up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            role: data.role || 'technician', // Default to technician (user role)
            dealership_id: dealershipId,
            is_admin_created: true // Flag to indicate this was created by an admin
          }
        }
      });

      if (signUpError) {
        console.error('Error creating user in Supabase Auth:', signUpError);
        throw new Error(signUpError.message);
      }

      if (!signUpData.user) {
        throw new Error('Failed to create user');
      }

      // The trigger should create the profile automatically, but let's verify
      // and create it manually if needed
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signUpData.user.id)
        .single();

      if (profileError || !profile) {
        // Profile wasn't created by trigger, create it manually
        const profileData = {
          id: signUpData.user.id,
          first_name: data.firstName,
          last_name: data.lastName,
          initials: `${data.firstName.charAt(0)}${data.lastName.charAt(0)}`.toUpperCase(),
          role: data.role || 'technician',
          dealership_id: dealershipId,
          is_active: true
        };

        const { data: newProfile, error: createProfileError } = await supabase
          .from('profiles')
          .insert([profileData])
          .select()
          .single();

        if (createProfileError) {
          console.error('Error creating profile manually:', createProfileError);
          // Clean up the auth user if profile creation fails
          // Note: We can't delete auth users from client, but we can mark them as inactive
          throw new Error(createProfileError.message);
        }

        return {
          id: newProfile.id,
          email: data.email,
          firstName: newProfile.first_name,
          lastName: newProfile.last_name,
          initials: newProfile.initials,
          role: newProfile.role,
          dealershipId: newProfile.dealership_id,
          isActive: newProfile.is_active,
          createdAt: newProfile.created_at,
          updatedAt: newProfile.updated_at
        } as User;
      }

      // Profile was created by trigger, return it
      return {
        id: profile.id,
        email: data.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        initials: profile.initials,
        role: profile.role,
        dealershipId: profile.dealership_id,
        isActive: profile.is_active,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      } as User;
    } catch (error) {
      console.error('Error in registerUser:', error);
      throw error;
    }
  }

  static async getDealershipUsers(dealershipId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching dealership users:', error);
      return [];
    }
    
    // Map database fields to frontend User interface
    return (data || []).map(profile => ({
      id: profile.id,
      email: '', // Email is not stored in profiles table, would need to join with auth.users
      firstName: profile.first_name,
      lastName: profile.last_name,
      initials: profile.initials,
      role: profile.role,
      dealershipId: profile.dealership_id,
      isActive: profile.is_active,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      lastLogin: profile.last_login
    })) as User[];
  }

  static async updateUser(user: User): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: user.firstName,
        last_name: user.lastName,
        initials: user.initials,
        role: user.role,
        is_active: user.isActive,
        last_login: user.lastLogin,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async updateDealership(dealership: Dealership): Promise<void> {
    const { error } = await supabase
      .from('dealerships')
      .update({
        name: dealership.name,
        address: dealership.address,
        city: dealership.city,
        state: dealership.state,
        zip_code: dealership.zipCode,
        phone: dealership.phone,
        email: dealership.email,
        website: dealership.website,
        is_active: dealership.isActive,
        subscription_plan: dealership.subscriptionPlan,
        status: dealership.status,
        last_activity: dealership.lastActivity,
        total_users: dealership.totalUsers,
        total_vehicles: dealership.totalVehicles,
        monthly_revenue: dealership.monthlyRevenue,
        settings: dealership.settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', dealership.id);
    
    if (error) {
      console.error('Error updating dealership:', error);
      throw error;
    }
  }

  static async deactivateUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      // Call the server-side function to delete the user
      const { data, error } = await supabase
        .rpc('delete_user', { user_id: userId });
      
      if (error) {
        console.error('Error deleting user:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('Failed to delete user');
      }
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw error;
    }
  }

  // Super Admin Methods
  static isSuperAdmin(user: User): boolean {
    return user.role === 'super-admin';
  }

  static async getAllDealershipsForSuperAdmin(): Promise<Dealership[]> {
    const { data, error } = await supabase
      .from('dealerships')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching all dealerships:', error);
      return [];
    }
    
    // Map database fields to frontend Dealership interface
    return (data || []).map(dealership => ({
      id: dealership.id,
      name: dealership.name,
      address: dealership.address,
      city: dealership.city,
      state: dealership.state,
      zipCode: dealership.zip_code,
      phone: dealership.phone,
      email: dealership.email,
      website: dealership.website,
      isActive: dealership.is_active,
      subscriptionPlan: dealership.subscription_plan || 'basic',
      status: dealership.status || 'active',
      lastActivity: dealership.last_activity,
      totalUsers: dealership.total_users || 0,
      totalVehicles: dealership.total_vehicles || 0,
      monthlyRevenue: dealership.monthly_revenue || 0,
      settings: dealership.settings || {},
      createdAt: dealership.created_at,
      updatedAt: dealership.updated_at
    })) as Dealership[];
  }

  static async getAllUsersForSuperAdmin(): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
    
    // Map database fields to frontend User interface
    return (data || []).map(profile => ({
      id: profile.id,
      email: '', // Email is not stored in profiles table, would need to join with auth.users
      firstName: profile.first_name,
      lastName: profile.last_name,
      initials: profile.initials,
      role: profile.role,
      dealershipId: profile.dealership_id,
      isActive: profile.is_active,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      lastLogin: profile.last_login
    })) as User[];
  }

  // Vehicle data isolation per dealership
  static getDealershipVehicleStorageKey(dealershipId: string): string {
    return `dealership_vehicles_${dealershipId}`;
  }
}