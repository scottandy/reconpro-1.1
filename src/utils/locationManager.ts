import { Location, LocationType, LocationSettings, LocationColorSettings, LOCATION_TYPE_CONFIGS } from '../types/location';
import { supabase } from './supabaseClient';

export class LocationManager {
  // Helper function to convert frontend Location to database format
  private static toDatabaseFormat(location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>): any {
    return {
      name: location.name,
      type: location.type,
      description: location.description || null,
      is_active: location.isActive,
      capacity: location.capacity || null,
      color: location.color || '#3B82F6'
    };
  }

  // Helper function to convert database format to frontend Location
  private static fromDatabaseFormat(data: any): Location {
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
  }

  static async getLocations(dealershipId: string): Promise<Location[]> {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('dealership_id', dealershipId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(this.fromDatabaseFormat);
  }

  static async addLocation(dealershipId: string, locationData: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>): Promise<Location | null> {
    const dbData = this.toDatabaseFormat(locationData);
    dbData.dealership_id = dealershipId;
    
    const { data, error } = await supabase
      .from('locations')
      .insert([dbData])
      .select()
      .single();
    if (error) {
      console.error('Error adding location to Supabase:', error);
      return null;
    }
    return this.fromDatabaseFormat(data);
  }

  static async updateLocation(dealershipId: string, locationId: string, updates: Partial<Location>): Promise<Location | null> {
    const dbUpdates = this.toDatabaseFormat(updates as any);
    dbUpdates.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('locations')
      .update(dbUpdates)
      .eq('id', locationId)
      .eq('dealership_id', dealershipId)
      .select()
      .single();
    if (error) {
      console.error('Error updating location in Supabase:', error);
      return null;
    }
    return this.fromDatabaseFormat(data);
  }

  static async deleteLocation(dealershipId: string, locationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', locationId)
      .eq('dealership_id', dealershipId);
    return !error;
  }

  static async getLocationsByType(dealershipId: string, type: LocationType): Promise<Location[]> {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('type', type)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(this.fromDatabaseFormat);
  }

  static async getActiveLocations(dealershipId: string): Promise<Location[]> {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(this.fromDatabaseFormat);
  }

  static async getLocationStats(dealershipId: string): Promise<{
    total: number;
    active: number;
    byType: Record<LocationType, number>;
  }> {
    const locations = await this.getLocations(dealershipId);
    const active = locations.filter(loc => loc.isActive);
    
    const byType = Object.keys(LOCATION_TYPE_CONFIGS).reduce((acc, type) => {
      acc[type as LocationType] = locations.filter(loc => loc.type === type && loc.isActive).length;
      return acc;
    }, {} as Record<LocationType, number>);

    return {
      total: locations.length,
      active: active.length,
      byType
    };
  }

  // Settings Management - Using Supabase with localStorage fallback
  static async getLocationSettings(dealershipId: string): Promise<LocationSettings> {
    try {
      // First try to get from Supabase
      const { data, error } = await supabase
        .from('location_settings')
        .select('settings')
        .eq('dealership_id', dealershipId)
        .single();

      if (!error && data && data.settings) {
        const storedSettings = data.settings;
        
        // Merge with default settings
        const mergedSettings: LocationSettings = {
          defaultLocationType: 'on-site',
          allowCustomLocations: true,
          requireLocationForVehicles: true,
          autoAssignLocation: false,
          locationCapacityTracking: true,
          ...storedSettings
        };
        
        // Also save to localStorage as backup
        this.saveLocationSettingsToLocalStorage(dealershipId, mergedSettings);
        return mergedSettings;
      }
    } catch (error) {
      console.error('Error fetching location settings from Supabase:', error);
    }

    // Fallback to localStorage
    return this.getLocationSettingsFromLocalStorage(dealershipId);
  }

  private static getLocationSettingsFromLocalStorage(dealershipId: string): LocationSettings {
    const key = `location_settings_${dealershipId}`;
    const data = localStorage.getItem(key);
    
    if (data) {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.error('Error parsing location settings from localStorage:', error);
      }
    }

    // Default settings
    const defaultSettings: LocationSettings = {
      defaultLocationType: 'on-site',
      allowCustomLocations: true,
      requireLocationForVehicles: true,
      autoAssignLocation: false,
      locationCapacityTracking: true
    };

    this.saveLocationSettingsToLocalStorage(dealershipId, defaultSettings);
    return defaultSettings;
  }

  private static saveLocationSettingsToLocalStorage(dealershipId: string, settings: LocationSettings): void {
    const key = `location_settings_${dealershipId}`;
    localStorage.setItem(key, JSON.stringify(settings));
  }

  static async saveLocationSettings(dealershipId: string, settings: LocationSettings): Promise<void> {
    try {
      // Save to Supabase
      const { error } = await supabase
        .from('location_settings')
        .upsert({
          dealership_id: dealershipId,
          settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'dealership_id'
        });

      if (error) {
        console.error('Error saving location settings to Supabase:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error saving location settings to Supabase:', error);
      // Continue to save to localStorage as backup
    }

    // Always save to localStorage as backup
    this.saveLocationSettingsToLocalStorage(dealershipId, settings);
  }

  static getLocationTypeConfig(type: LocationType) {
    return LOCATION_TYPE_CONFIGS[type];
  }

  static async getVehicleCountByLocation(dealershipId: string, locationName: string): Promise<number> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id')
      .eq('dealership_id', dealershipId)
      .eq('location', locationName)
      .eq('isSold', false)
      .eq('isPending', false);
    if (error) return 0;
    return data.length;
  }

  static async getAllVehicleLocationCounts(dealershipId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('location')
      .eq('dealership_id', dealershipId)
      .eq('isSold', false)
      .eq('isPending', false)
      .not('location', 'is', null);
    if (error) return {};

    const locationCounts: Record<string, number> = {};
    data.forEach(vehicle => {
      if (vehicle.location) {
        locationCounts[vehicle.location] = (locationCounts[vehicle.location] || 0) + 1;
      }
    });

    return locationCounts;
  }

  // Location Color Settings Management - Using Supabase with localStorage fallback
  static async getLocationColorSettings(dealershipId: string): Promise<LocationColorSettings> {
    try {
      // First try to get from Supabase
      const { data, error } = await supabase
        .from('location_color_settings')
        .select('settings')
        .eq('dealership_id', dealershipId)
        .single();

      if (!error && data && data.settings) {
        const storedSettings = data.settings;
        
        // Merge with default settings
        const mergedSettings: LocationColorSettings = {
          onSiteKeywords: ['lot', 'indoor', 'showroom', 'service', 'display', 'demo'],
          offSiteKeywords: ['off-site', 'storage', 'external'],
          transitKeywords: ['transit', 'transport'],
          ...storedSettings
        };
        
        // Also save to localStorage as backup
        this.saveLocationColorSettingsToLocalStorage(dealershipId, mergedSettings);
        return mergedSettings;
      }
    } catch (error) {
      console.error('Error fetching location color settings from Supabase:', error);
    }

    // Fallback to localStorage
    return this.getLocationColorSettingsFromLocalStorage(dealershipId);
  }

  private static getLocationColorSettingsFromLocalStorage(dealershipId: string): LocationColorSettings {
    const key = `locationColorSettings_${dealershipId}`;
    const data = localStorage.getItem(key);
    
    if (data) {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.error('Error parsing location color settings from localStorage:', error);
      }
    }

    // Default settings
    const defaultSettings: LocationColorSettings = {
      onSiteKeywords: ['lot', 'indoor', 'showroom', 'service', 'display', 'demo'],
      offSiteKeywords: ['off-site', 'storage', 'external'],
      transitKeywords: ['transit', 'transport']
    };

    this.saveLocationColorSettingsToLocalStorage(dealershipId, defaultSettings);
    return defaultSettings;
  }

  private static saveLocationColorSettingsToLocalStorage(dealershipId: string, settings: LocationColorSettings): void {
    const key = `locationColorSettings_${dealershipId}`;
    localStorage.setItem(key, JSON.stringify(settings));
  }

  static async saveLocationColorSettings(dealershipId: string, settings: LocationColorSettings): Promise<void> {
    try {
      // Save to Supabase
      const { error } = await supabase
        .from('location_color_settings')
        .upsert({
          dealership_id: dealershipId,
          settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'dealership_id'
        });

      if (error) {
        console.error('Error saving location color settings to Supabase:', error);
        throw error;
      }
      // On successful save, remove localStorage fallback for this dealership
      this.removeLocationColorSettingsFromLocalStorage(dealershipId);
    } catch (error) {
      console.error('Error saving location color settings to Supabase:', error);
      // Continue to save to localStorage as backup
      this.saveLocationColorSettingsToLocalStorage(dealershipId, settings);
    }

    // Always save to localStorage as backup (for offline/legacy)
    // this.saveLocationColorSettingsToLocalStorage(dealershipId, settings); // <-- REMOVE this line
  }

  private static removeLocationColorSettingsFromLocalStorage(dealershipId: string): void {
    const key = `locationColorSettings_${dealershipId}`;
    localStorage.removeItem(key);
  }
}