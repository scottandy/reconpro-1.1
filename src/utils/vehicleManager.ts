import { Vehicle, InspectionStatus } from '../types/vehicle';
import { supabase } from './supabaseClient';

export class VehicleManager {
  // Helper function to convert frontend Vehicle to database format
  private static toDatabaseFormat(vehicle: Omit<Vehicle, 'id'>): any {
    // Validate required fields
    if (!vehicle.vin) throw new Error('VIN is required');
    if (!vehicle.year) throw new Error('Year is required');
    if (!vehicle.make) throw new Error('Make is required');
    if (!vehicle.model) throw new Error('Model is required');
    if (!vehicle.color) throw new Error('Color is required');
    if (!vehicle.location) throw new Error('Location is required');
    if (!vehicle.dateAcquired) throw new Error('Date acquired is required');

    return {
      vin: vehicle.vin,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim || null,
      mileage: vehicle.mileage || 0,
      color: vehicle.color,
      date_acquired: vehicle.dateAcquired,
      target_sale_date: vehicle.targetSaleDate || null,
      price: vehicle.price || 0,
      location_name: vehicle.location, // Map location to location_name
      status: vehicle.status,
      notes: vehicle.notes || null,
      team_notes: vehicle.teamNotes || [],
      customer_comments: vehicle.customerComments || null,
      inspection_data: vehicle.inspection || {},
      is_sold: vehicle.isSold || false,
      is_pending: vehicle.isPending || false
    };
  }

  // Helper function to convert database format to frontend Vehicle
  private static fromDatabaseFormat(data: any): Vehicle {
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
      location: data.location_name, // Map location_name to location
      status: data.status,
      notes: data.notes,
      teamNotes: data.team_notes || [],
      customerComments: data.customer_comments,
      inspection: data.inspection_data,
      isSold: data.is_sold || false,
      isPending: data.is_pending || false,
      // These fields don't exist in the database, so set to undefined
      soldBy: undefined,
      soldDate: undefined,
      soldPrice: undefined,
      soldNotes: undefined,
      pendingBy: undefined,
      pendingDate: undefined,
      pendingNotes: undefined,
      reactivatedBy: undefined,
      reactivatedDate: undefined,
      reactivatedFrom: undefined,
      locationChangedBy: undefined,
      locationChangedDate: undefined,
      locationHistory: undefined
    };
  }

  static async getVehicles(dealershipId: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('dealership_id', dealershipId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(this.fromDatabaseFormat);
  }

  static async getActiveVehicles(dealershipId: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('is_sold', false)
      .eq('is_pending', false)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(this.fromDatabaseFormat);
  }

  static async getSoldVehicles(dealershipId: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('is_sold', true)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(this.fromDatabaseFormat);
  }

  static async getPendingVehicles(dealershipId: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('is_pending', true)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(this.fromDatabaseFormat);
  }

  static async addVehicle(dealershipId: string, vehicleData: Omit<Vehicle, 'id'>): Promise<Vehicle | null> {
    try {
      console.log('=== VEHICLE ADDITION DEBUG ===');
      console.log('Input vehicleData:', vehicleData);
      console.log('Dealership ID:', dealershipId);
      
      const dbData = this.toDatabaseFormat(vehicleData);
      dbData.dealership_id = dealershipId;
      
      console.log('Database format data:', dbData);
      console.log('Data types:', {
        vin: typeof dbData.vin,
        year: typeof dbData.year,
        make: typeof dbData.make,
        model: typeof dbData.model,
        mileage: typeof dbData.mileage,
        color: typeof dbData.color,
        date_acquired: typeof dbData.date_acquired,
        location_name: typeof dbData.location_name,
        dealership_id: typeof dbData.dealership_id
      });
      
      const { data, error } = await supabase
        .from('vehicles')
        .insert([dbData])
        .select()
        .single();
      
      if (error) {
        console.error('=== SUPABASE ERROR ===');
        console.error('Error adding vehicle to Supabase:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        console.error('Full error object:', JSON.stringify(error, null, 2));
        return null;
      }
      
      console.log('Successfully added vehicle:', data);
      return this.fromDatabaseFormat(data);
    } catch (validationError) {
      console.error('=== VALIDATION ERROR ===');
      console.error('Validation error:', validationError);
      return null;
    }
  }

  static async updateVehicle(dealershipId: string, vehicleId: string, updates: Partial<Vehicle>): Promise<Vehicle | null> {
    // Build dbUpdates only from provided fields
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.vin !== undefined) dbUpdates.vin = updates.vin;
    if (updates.year !== undefined) dbUpdates.year = updates.year;
    if (updates.make !== undefined) dbUpdates.make = updates.make;
    if (updates.model !== undefined) dbUpdates.model = updates.model;
    if (updates.trim !== undefined) dbUpdates.trim = updates.trim;
    if (updates.mileage !== undefined) dbUpdates.mileage = updates.mileage;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.dateAcquired !== undefined) dbUpdates.date_acquired = updates.dateAcquired;
    if (updates.targetSaleDate !== undefined) dbUpdates.target_sale_date = updates.targetSaleDate;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.location !== undefined) dbUpdates.location_name = updates.location;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.teamNotes !== undefined) dbUpdates.team_notes = updates.teamNotes;
    if (updates.customerComments !== undefined) dbUpdates.customer_comments = updates.customerComments;
    if (updates.inspection !== undefined) dbUpdates.inspection_data = updates.inspection;
    if (updates.isSold !== undefined) dbUpdates.is_sold = updates.isSold;
    if (updates.isPending !== undefined) dbUpdates.is_pending = updates.isPending;
    // Add any other fields as needed
    
    const { data, error } = await supabase
      .from('vehicles')
      .update(dbUpdates)
      .eq('id', vehicleId)
      .eq('dealership_id', dealershipId)
      .select()
      .single();
    if (error) {
      console.error('Error updating vehicle in Supabase:', error);
      if (error.message) console.error('Supabase error message:', error.message);
      if (error.details) console.error('Supabase error details:', error.details);
      if (error.hint) console.error('Supabase error hint:', error.hint);
      // Reminder: Prevent infinite update loops in frontend logic!
      return null;
    }
    return this.fromDatabaseFormat(data);
  }

  static async deleteVehicle(dealershipId: string, vehicleId: string): Promise<boolean> {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)
      .eq('dealership_id', dealershipId);
    if (error) {
      console.error('Error deleting vehicle from Supabase:', error);
      return false;
    }
    return true;
  }

  static async markVehicleAsSold(dealershipId: string, vehicleId: string, soldBy: string, soldDate: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .update({
        is_sold: true,
        updated_at: new Date().toISOString()
        // Note: sold_by and sold_date fields don't exist in the database schema
      })
      .eq('id', vehicleId)
      .eq('dealership_id', dealershipId)
      .select()
      .single();
    if (error) {
      console.error('Error marking vehicle as sold in Supabase:', error);
      return null;
    }
    return this.fromDatabaseFormat(data);
  }

  static async markVehicleAsPending(dealershipId: string, vehicleId: string, pendingBy: string, pendingDate: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .update({
        is_pending: true,
        updated_at: new Date().toISOString()
        // Note: pending_by and pending_date fields don't exist in the database schema
      })
      .eq('id', vehicleId)
      .eq('dealership_id', dealershipId)
      .select()
      .single();
    if (error) {
      console.error('Error marking vehicle as pending in Supabase:', error);
      return null;
    }
    return this.fromDatabaseFormat(data);
  }

  static async reactivateVehicle(dealershipId: string, vehicleId: string, reactivatedBy: string, fromType: 'sold' | 'pending'): Promise<Vehicle | null> {
    const updateData: any = {
      is_sold: false,
      is_pending: false,
      updated_at: new Date().toISOString()
      // Note: reactivated_by, reactivated_date, reactivated_from fields don't exist in the database schema
    };

    const { data, error } = await supabase
      .from('vehicles')
      .update(updateData)
      .eq('id', vehicleId)
      .eq('dealership_id', dealershipId)
      .select()
      .single();
    if (error) {
      console.error('Error reactivating vehicle in Supabase:', error);
      return null;
    }
    return this.fromDatabaseFormat(data);
  }

  static async updateVehicleStatus(dealershipId: string, vehicleId: string, section: string, status: InspectionStatus): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .update({
        [`status->${section}`]: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)
      .eq('dealership_id', dealershipId)
      .select()
      .single();
    if (error) {
      console.error('Error updating vehicle status in Supabase:', error);
      return null;
    }
    return this.fromDatabaseFormat(data);
  }

  static async addTeamNote(dealershipId: string, vehicleId: string, note: {
    id: string;
    text: string;
    userInitials: string;
    timestamp: string;
    category: string;
  }): Promise<Vehicle | null> {
    // First get the current vehicle to append to existing notes
    const currentVehicle = await this.getVehicleById(dealershipId, vehicleId);
    if (!currentVehicle) return null;

    const updatedNotes = [...(currentVehicle.teamNotes || []), note];

    const { data, error } = await supabase
      .from('vehicles')
      .update({
        team_notes: updatedNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)
      .eq('dealership_id', dealershipId)
      .select()
      .single();
    if (error) {
      console.error('Error adding team note in Supabase:', error);
      return null;
    }
    return this.fromDatabaseFormat(data);
  }

  static async getVehicleById(dealershipId: string, vehicleId: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .eq('dealership_id', dealershipId)
      .single();
    if (error) return null;
    return this.fromDatabaseFormat(data);
  }

  static async searchVehicles(dealershipId: string, query: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('dealership_id', dealershipId)
      .or(`make.ilike.%${query}%,model.ilike.%${query}%,vin.ilike.%${query}%,color.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(this.fromDatabaseFormat);
  }

  static async getVehiclesByStatus(dealershipId: string, status: InspectionStatus): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('is_sold', false)
      .eq('is_pending', false)
      .contains('status', { [status]: status })
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(this.fromDatabaseFormat);
  }

  static async getVehiclesByLocation(dealershipId: string, location: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('location_name', location)
      .eq('is_sold', false)
      .eq('is_pending', false)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(this.fromDatabaseFormat);
  }

  static async updateVehicleLocation(dealershipId: string, vehicleId: string, locationUpdate: {
    location: string;
    locationChangedBy?: string;
    locationChangedDate?: string;
  }): Promise<Vehicle | null> {
    const dbUpdates: any = {
      location_name: locationUpdate.location,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('vehicles')
      .update(dbUpdates)
      .eq('id', vehicleId)
      .eq('dealership_id', dealershipId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating vehicle location in Supabase:', error);
      return null;
    }
    
    return this.fromDatabaseFormat(data);
  }

  static async updateVehicleNotes(dealershipId: string, vehicleId: string, notes: string): Promise<Vehicle | null> {
    const dbUpdates: any = {
      notes: notes || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('vehicles')
      .update(dbUpdates)
      .eq('id', vehicleId)
      .eq('dealership_id', dealershipId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating vehicle notes in Supabase:', error);
      return null;
    }
    
    return this.fromDatabaseFormat(data);
  }
}