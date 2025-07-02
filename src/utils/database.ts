import { createClient } from '@supabase/supabase-js';
import { User, Dealership, AuthState, LoginCredentials, RegisterDealershipData, RegisterUserData } from '../types/auth';
import { Vehicle } from '../types/vehicle';
import { Location } from '../types/location';
import { Contact } from '../types/contact';
import { Todo } from '../types/todo';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export class DatabaseService {
  // ========================================
  // AUTHENTICATION & USER MANAGEMENT
  // ========================================

  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) return null;

      return {
        id: profile.id,
        email: user.email || '',
        firstName: profile.first_name,
        lastName: profile.last_name,
        initials: profile.initials,
        role: profile.role,
        dealershipId: profile.dealership_id,
        isActive: profile.is_active,
        createdAt: profile.created_at
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  static async getDealership(dealershipId: string): Promise<Dealership | null> {
    try {
      const { data, error } = await supabase
        .from('dealerships')
        .select('*')
        .eq('id', dealershipId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zip_code,
        phone: data.phone,
        email: data.email,
        website: data.website,
        isActive: data.is_active,
        subscriptionPlan: data.subscription_plan,
        status: data.status,
        lastActivity: data.last_activity,
        totalUsers: data.total_users,
        totalVehicles: data.total_vehicles,
        monthlyRevenue: data.monthly_revenue,
        settings: data.settings,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error getting dealership:', error);
      return null;
    }
  }

  static async getAllDealerships(): Promise<Dealership[]> {
    try {
      const { data, error } = await supabase
        .from('dealerships')
        .select('*')
        .order('name');

      if (error || !data) return [];

      return data.map(dealership => ({
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
        subscriptionPlan: dealership.subscription_plan,
        status: dealership.status,
        lastActivity: dealership.last_activity,
        totalUsers: dealership.total_users,
        totalVehicles: dealership.total_vehicles,
        monthlyRevenue: dealership.monthly_revenue,
        settings: dealership.settings,
        createdAt: dealership.created_at
      }));
    } catch (error) {
      console.error('Error getting dealerships:', error);
      return [];
    }
  }

  static async registerDealership(data: RegisterDealershipData): Promise<{ data: { user: any | null }, error: any | null }> {
    // The trigger will handle creating the dealership and profile.
    // We just need to pass all the necessary data in the options.
    return supabase.auth.signUp({
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
  }

  static async createAdminForDealership(data: RegisterDealershipData): Promise<{ data: { user: any | null }, error: any | null }> {
    try {
      // Step 1: Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            role: 'admin'
          }
        }
      });

      if (authError || !authData.user) {
        return { data: { user: null }, error: authError };
      }

      // Step 2: Create the dealership
      const { data: dealershipData, error: dealershipError } = await supabase
        .from('dealerships')
        .insert({
          name: data.dealershipName,
          address: data.address,
          city: data.city,
          state: data.state,
          zip_code: data.zipCode,
          phone: data.phone,
          email: data.dealershipEmail,
          website: data.website
        })
        .select()
        .single();

      if (dealershipError) {
        console.error('Dealership creation error:', dealershipError);
        return { data: { user: null }, error: dealershipError };
      }

      // Step 3: Wait for trigger to create profile, then update it
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          dealership_id: dealershipData.id,
          is_active: true
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        // If update fails, try to insert the profile manually
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            first_name: data.firstName,
            last_name: data.lastName,
            initials: `${data.firstName[0]}${data.lastName[0]}`.toUpperCase(),
            role: 'admin',
            dealership_id: dealershipData.id,
            is_active: true
          });

        if (insertError) {
          console.error('Profile insert error:', insertError);
          return { data: { user: null }, error: insertError };
        }
      }

      return { data: { user: authData.user }, error: null };
    } catch (error) {
      console.error('createAdminForDealership error:', error);
      return { data: { user: null }, error: error };
    }
  }

  // ========================================
  // VEHICLE MANAGEMENT
  // ========================================

  static async getVehicles(dealershipId: string): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          locations(name, type)
        `)
        .eq('dealership_id', dealershipId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map(vehicle => ({
        id: vehicle.id,
        vin: vehicle.vin,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim,
        mileage: vehicle.mileage,
        color: vehicle.color,
        dateAcquired: vehicle.date_acquired,
        targetSaleDate: vehicle.target_sale_date,
        price: vehicle.price,
        location: vehicle.location_name,
        status: vehicle.status,
        notes: vehicle.notes,
        teamNotes: vehicle.team_notes || [],
        isSold: vehicle.is_sold || false,
        isPending: vehicle.is_pending || false,
        soldBy: vehicle.sold_by,
        soldDate: vehicle.sold_date,
        soldPrice: vehicle.sold_price,
        soldNotes: vehicle.sold_notes,
        pendingBy: vehicle.pending_by,
        pendingDate: vehicle.pending_date,
        pendingNotes: vehicle.pending_notes,
        reactivatedBy: vehicle.reactivated_by,
        reactivatedDate: vehicle.reactivated_date,
        reactivatedFrom: vehicle.reactivated_from
      }));
    } catch (error) {
      console.error('Error getting vehicles:', error);
      return [];
    }
  }

  static async createVehicle(vehicleData: Omit<Vehicle, 'id'>): Promise<Vehicle | null> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          vin: vehicleData.vin,
          year: vehicleData.year,
          make: vehicleData.make,
          model: vehicleData.model,
          trim: vehicleData.trim,
          mileage: vehicleData.mileage,
          color: vehicleData.color,
          date_acquired: vehicleData.dateAcquired,
          target_sale_date: vehicleData.targetSaleDate,
          price: vehicleData.price,
          location_name: vehicleData.location,
          status: vehicleData.status,
          notes: vehicleData.notes,
          team_notes: vehicleData.teamNotes || [],
          dealership_id: vehicleData.dealershipId
        })
        .select()
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        vin: data.vin,
        year: data.year,
        make: data.make,
        model: data.model,
        trim: data.trim,
        mileage: data.mileage,
        color: data.color,
        dateAcquired: data.date_acquired,
        targetSaleDate: data.target_sale_date,
        price: data.price,
        location: data.location_name,
        status: data.status,
        notes: data.notes,
        teamNotes: data.team_notes || [],
        isSold: data.is_sold || false,
        isPending: data.is_pending || false
      };
    } catch (error) {
      console.error('Error creating vehicle:', error);
      return null;
    }
  }

  static async updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<Vehicle | null> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.vin) updateData.vin = updates.vin;
      if (updates.year) updateData.year = updates.year;
      if (updates.make) updateData.make = updates.make;
      if (updates.model) updateData.model = updates.model;
      if (updates.trim !== undefined) updateData.trim = updates.trim;
      if (updates.mileage !== undefined) updateData.mileage = updates.mileage;
      if (updates.color) updateData.color = updates.color;
      if (updates.dateAcquired) updateData.date_acquired = updates.dateAcquired;
      if (updates.targetSaleDate !== undefined) updateData.target_sale_date = updates.targetSaleDate;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.location) updateData.location_name = updates.location;
      if (updates.status) updateData.status = updates.status;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.teamNotes) updateData.team_notes = updates.teamNotes;
      if (updates.isSold !== undefined) updateData.is_sold = updates.isSold;
      if (updates.isPending !== undefined) updateData.is_pending = updates.isPending;
      if (updates.soldBy) updateData.sold_by = updates.soldBy;
      if (updates.soldDate) updateData.sold_date = updates.soldDate;
      if (updates.soldPrice !== undefined) updateData.sold_price = updates.soldPrice;
      if (updates.soldNotes) updateData.sold_notes = updates.soldNotes;
      if (updates.pendingBy) updateData.pending_by = updates.pendingBy;
      if (updates.pendingDate) updateData.pending_date = updates.pendingDate;
      if (updates.pendingNotes) updateData.pending_notes = updates.pendingNotes;
      if (updates.reactivatedBy) updateData.reactivated_by = updates.reactivatedBy;
      if (updates.reactivatedDate) updateData.reactivated_date = updates.reactivatedDate;
      if (updates.reactivatedFrom) updateData.reactivated_from = updates.reactivatedFrom;

      const { data, error } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', vehicleId)
        .select()
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        vin: data.vin,
        year: data.year,
        make: data.make,
        model: data.model,
        trim: data.trim,
        mileage: data.mileage,
        color: data.color,
        dateAcquired: data.date_acquired,
        targetSaleDate: data.target_sale_date,
        price: data.price,
        location: data.location_name,
        status: data.status,
        notes: data.notes,
        teamNotes: data.team_notes || [],
        isSold: data.is_sold || false,
        isPending: data.is_pending || false
      };
    } catch (error) {
      console.error('Error updating vehicle:', error);
      return null;
    }
  }
}