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

  // ========================================
  // LOCATION MANAGEMENT
  // ========================================

  static async getLocations(dealershipId: string): Promise<Location[]> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('dealership_id', dealershipId)
        .order('name');

      if (error || !data) return [];

      return data.map(location => ({
        id: location.id,
        name: location.name,
        type: location.type,
        description: location.description,
        isActive: location.is_active,
        capacity: location.capacity,
        color: location.color,
        createdAt: location.created_at,
        updatedAt: location.updated_at
      }));
    } catch (error) {
      console.error('Error getting locations:', error);
      return [];
    }
  }

  static async createLocation(locationData: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>): Promise<Location | null> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .insert({
          name: locationData.name,
          type: locationData.type,
          description: locationData.description,
          is_active: locationData.isActive,
          capacity: locationData.capacity,
          color: locationData.color,
          dealership_id: locationData.dealershipId
        })
        .select()
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name,
        type: data.type,
        description: data.description,
        isActive: data.is_active,
        capacity: data.capacity,
        color: data.color,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error creating location:', error);
      return null;
    }
  }

  static async updateLocation(locationId: string, updates: Partial<Location>): Promise<Location | null> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.name) updateData.name = updates.name;
      if (updates.type) updateData.type = updates.type;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.capacity !== undefined) updateData.capacity = updates.capacity;
      if (updates.color) updateData.color = updates.color;

      const { data, error } = await supabase
        .from('locations')
        .update(updateData)
        .eq('id', locationId)
        .select()
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name,
        type: data.type,
        description: data.description,
        isActive: data.is_active,
        capacity: data.capacity,
        color: data.color,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error updating location:', error);
      return null;
    }
  }

  // ========================================
  // CONTACT MANAGEMENT
  // ========================================

  static async getContacts(dealershipId: string): Promise<Contact[]> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('dealership_id', dealershipId)
        .order('name');

      if (error || !data) return [];

      return data.map(contact => ({
        id: contact.id,
        name: contact.name,
        company: contact.company,
        title: contact.title,
        phone: contact.phone,
        email: contact.email,
        address: contact.address,
        city: contact.city,
        state: contact.state,
        zipCode: contact.zip_code,
        category: contact.category,
        specialties: contact.specialties || [],
        notes: contact.notes,
        isFavorite: contact.is_favorite,
        isActive: contact.is_active,
        lastContacted: contact.last_contacted,
        createdAt: contact.created_at,
        updatedAt: contact.updated_at
      }));
    } catch (error) {
      console.error('Error getting contacts:', error);
      return [];
    }
  }

  static async createContact(contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact | null> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          name: contactData.name,
          company: contactData.company,
          title: contactData.title,
          phone: contactData.phone,
          email: contactData.email,
          address: contactData.address,
          city: contactData.city,
          state: contactData.state,
          zip_code: contactData.zipCode,
          category: contactData.category,
          specialties: contactData.specialties || [],
          notes: contactData.notes,
          is_favorite: contactData.isFavorite,
          is_active: contactData.isActive,
          last_contacted: contactData.lastContacted,
          dealership_id: contactData.dealershipId
        })
        .select()
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name,
        company: data.company,
        title: data.title,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zip_code,
        category: data.category,
        specialties: data.specialties || [],
        notes: data.notes,
        isFavorite: data.is_favorite,
        isActive: data.is_active,
        lastContacted: data.last_contacted,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error creating contact:', error);
      return null;
    }
  }

  // ========================================
  // TODO MANAGEMENT
  // ========================================

  static async getTodos(dealershipId: string): Promise<Todo[]> {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('dealership_id', dealershipId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map(todo => ({
        id: todo.id,
        title: todo.title,
        description: todo.description,
        priority: todo.priority,
        status: todo.status,
        category: todo.category,
        assignedTo: todo.assigned_to,
        assignedBy: todo.assigned_by,
        dueDate: todo.due_date,
        dueTime: todo.due_time,
        vehicleId: todo.vehicle_id,
        vehicleName: todo.vehicle_name,
        tags: todo.tags || [],
        notes: todo.notes,
        completedAt: todo.completed_at,
        completedBy: todo.completed_by,
        createdAt: todo.created_at,
        updatedAt: todo.updated_at
      }));
    } catch (error) {
      console.error('Error getting todos:', error);
      return [];
    }
  }

  static async createTodo(todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Todo | null> {
    try {
      const { data, error } = await supabase
        .from('todos')
        .insert({
          title: todoData.title,
          description: todoData.description,
          priority: todoData.priority,
          status: todoData.status,
          category: todoData.category,
          assigned_to: todoData.assignedTo,
          assigned_by: todoData.assignedBy,
          due_date: todoData.dueDate,
          due_time: todoData.dueTime,
          vehicle_id: todoData.vehicleId,
          vehicle_name: todoData.vehicleName,
          tags: todoData.tags || [],
          notes: todoData.notes,
          completed_at: todoData.completedAt,
          completed_by: todoData.completedBy,
          dealership_id: todoData.dealershipId
        })
        .select()
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        category: data.category,
        assignedTo: data.assigned_to,
        assignedBy: data.assigned_by,
        dueDate: data.due_date,
        dueTime: data.due_time,
        vehicleId: data.vehicle_id,
        vehicleName: data.vehicle_name,
        tags: data.tags || [],
        notes: data.notes,
        completedAt: data.completed_at,
        completedBy: data.completed_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error creating todo:', error);
      return null;
    }
  }

  // ========================================
  // SETTINGS MANAGEMENT
  // ========================================

  static async getLocationSettings(dealershipId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('location_settings')
        .select('settings')
        .eq('dealership_id', dealershipId)
        .single();

      if (error || !data) {
        // Return default settings if none exist
        return {
          defaultLocationType: 'on-site',
          allowCustomLocations: true,
          requireLocationForVehicles: true,
          autoAssignLocation: false,
          locationCapacityTracking: true
        };
      }

      return data.settings;
    } catch (error) {
      console.error('Error getting location settings:', error);
      return null;
    }
  }

  static async getContactSettings(dealershipId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('contact_settings')
        .select('settings')
        .eq('dealership_id', dealershipId)
        .single();

      if (error || !data) {
        return {
          defaultCategory: 'other',
          autoSaveContacts: true,
          showFavoritesFirst: true,
          enableCallLogging: true
        };
      }

      return data.settings;
    } catch (error) {
      console.error('Error getting contact settings:', error);
      return null;
    }
  }

  static async getTodoSettings(dealershipId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('todo_settings')
        .select('settings')
        .eq('dealership_id', dealershipId)
        .single();

      if (error || !data) {
        return {
          defaultPriority: 'medium',
          defaultCategory: 'general',
          autoAssignToSelf: true,
          enableNotifications: true,
          showCompletedTasks: false,
          defaultView: 'list',
          reminderMinutes: 15
        };
      }

      return data.settings;
    } catch (error) {
      console.error('Error getting todo settings:', error);
      return null;
    }
  }

  static async getInspectionSettings(dealershipId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('inspection_settings')
        .select('settings')
        .eq('dealership_id', dealershipId)
        .single();

      if (error || !data) {
        return {
          sections: ['emissions', 'cosmetic', 'mechanical', 'cleaned', 'photos'],
          requirePhotos: true,
          autoSave: true,
          defaultRating: 'good'
        };
      }

      return data.settings;
    } catch (error) {
      console.error('Error getting inspection settings:', error);
      return null;
    }
  }

  // ========================================
  // ANALYTICS
  // ========================================

  static async getAnalytics(dealershipId: string, dataType: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('analytics')
        .select('*')
        .eq('dealership_id', dealershipId)
        .eq('data_type', dataType)
        .order('recorded_at', { ascending: false });

      if (error || !data) return [];

      return data.map(analytics => ({
        id: analytics.id,
        dataType: analytics.data_type,
        data: analytics.data,
        recordedAt: analytics.recorded_at
      }));
    } catch (error) {
      console.error('Error getting analytics:', error);
      return [];
    }
  }

  static async saveAnalytics(dealershipId: string, dataType: string, data: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('analytics')
        .insert({
          dealership_id: dealershipId,
          data_type: dataType,
          data: data
        });

      if (error) {
        console.error('Error saving analytics:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving analytics:', error);
      return false;
    }
  }
} 