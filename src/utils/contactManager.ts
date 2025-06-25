import { Contact, ContactCategory, ContactSettings, CONTACT_CATEGORY_CONFIGS } from '../types/contact';
import { supabase } from './supabaseClient';

export class ContactManager {
  private static readonly STORAGE_KEYS = {
    CONTACTS: 'dealership_contacts',
    CONTACT_SETTINGS: 'dealership_contact_settings',
    CALL_LOG: 'contact_call_log'
  };

  // Helper function to convert frontend Contact to database format
  private static toDatabaseFormat(contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): any {
    return {
      name: contact.name,
      company: contact.company || null,
      title: contact.title || null,
      phone: contact.phone,
      email: contact.email || null,
      address: contact.address || null,
      city: contact.city || null,
      state: contact.state || null,
      zip_code: contact.zipCode || null,
      category: contact.category,
      specialties: contact.specialties || [],
      notes: contact.notes || null,
      is_favorite: contact.isFavorite || false,
      is_active: contact.isActive,
      last_contacted: contact.lastContacted || null
    };
  }

  // Helper function to convert database format to frontend Contact
  private static fromDatabaseFormat(data: any): Contact {
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
      isFavorite: data.is_favorite || false,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastContacted: data.last_contacted
    };
  }

  static initializeDefaultContacts(dealershipId: string): void {
    const existingContacts = this.getContacts(dealershipId);
    if (existingContacts.length > 0) return;

    const defaultContacts: Omit<Contact, 'id'>[] = [
      {
        name: 'Mike\'s Auto Body',
        company: 'Mike\'s Auto Body Shop',
        title: 'Owner',
        phone: '(555) 123-4567',
        email: 'mike@mikesautobody.com',
        address: '123 Main Street',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701',
        category: 'body-shop',
        specialties: ['Paint Work', 'Collision Repair', 'Dent Removal'],
        notes: 'Excellent paint matching. Quick turnaround on minor repairs.',
        isFavorite: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        name: 'Sarah Johnson',
        company: 'Elite Detailing Services',
        title: 'Manager',
        phone: '(555) 987-6543',
        email: 'sarah@elitedetailing.com',
        category: 'detailing',
        specialties: ['Interior Cleaning', 'Paint Correction', 'Ceramic Coating'],
        notes: 'Premium detailing services. Great for high-end vehicles.',
        isFavorite: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        name: 'Tom\'s Transmission',
        company: 'Tom\'s Transmission & Auto Repair',
        title: 'Lead Mechanic',
        phone: '(555) 456-7890',
        email: 'info@tomstransmission.com',
        category: 'mechanic',
        specialties: ['Transmission Repair', 'Engine Diagnostics', 'Brake Service'],
        notes: 'Reliable for complex mechanical issues. Fair pricing.',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        name: 'AutoParts Plus',
        company: 'AutoParts Plus Distribution',
        title: 'Sales Representative',
        phone: '(555) 321-0987',
        email: 'orders@autopartsplus.com',
        category: 'parts-supplier',
        specialties: ['OEM Parts', 'Aftermarket Parts', 'Fast Delivery'],
        notes: 'Good inventory and competitive prices. Next-day delivery available.',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        name: 'Quick Tow Services',
        company: 'Quick Tow & Recovery',
        title: 'Dispatcher',
        phone: '(555) 911-TOWS',
        email: 'dispatch@quicktow.com',
        category: 'towing',
        specialties: ['24/7 Service', 'Flatbed Towing', 'Vehicle Recovery'],
        notes: '24/7 availability. Reliable for emergency situations.',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const contacts = defaultContacts.map(contact => ({
      ...contact,
      id: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));

    this.saveContacts(dealershipId, contacts);
  }

  static async getContacts(dealershipId: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('dealership_id', dealershipId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(this.fromDatabaseFormat);
  }

  static async saveContacts(dealershipId: string, contacts: Contact[]): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('dealership_id', dealershipId);
    if (error) throw error;

    const { data, error: insertError } = await supabase
      .from('contacts')
      .insert(contacts.map(contact => ({ ...this.toDatabaseFormat(contact), dealership_id: dealershipId })))
      .select();
    if (insertError) throw insertError;
  }

  static async addContact(dealershipId: string, contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact | null> {
    const dbData = this.toDatabaseFormat(contactData);
    dbData.dealership_id = dealershipId;
    
    const { data, error } = await supabase
      .from('contacts')
      .insert([dbData])
      .select()
      .single();
    if (error) {
      console.error('Error adding contact to Supabase:', error);
      return null;
    }
    return this.fromDatabaseFormat(data);
  }

  static async updateContact(dealershipId: string, contactId: string, updates: Partial<Contact>): Promise<Contact | null> {
    const dbUpdates = this.toDatabaseFormat(updates as any);
    dbUpdates.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('contacts')
      .update(dbUpdates)
      .eq('id', contactId)
      .eq('dealership_id', dealershipId)
      .select()
      .single();
    if (error) {
      console.error('Error updating contact in Supabase:', error);
      return null;
    }
    return this.fromDatabaseFormat(data);
  }

  static async deleteContact(dealershipId: string, contactId: string): Promise<boolean> {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId)
      .eq('dealership_id', dealershipId);
    return !error;
  }

  static async toggleFavorite(dealershipId: string, contactId: string): Promise<boolean> {
    const contacts = await this.getContacts(dealershipId);
    const contact = contacts.find(c => c.id === contactId);
    
    if (!contact) return false;

    const newFavoriteStatus = !contact.isFavorite;
    
    const result = await this.updateContact(dealershipId, contactId, {
      isFavorite: newFavoriteStatus
    });
    
    return result ? newFavoriteStatus : contact.isFavorite;
  }

  static async logCall(dealershipId: string, contactId: string): Promise<void> {
    const contacts = await this.getContacts(dealershipId);
    const contact = contacts.find(c => c.id === contactId);
    
    if (contact) {
      await this.updateContact(dealershipId, contactId, {
        lastContacted: new Date().toISOString()
      });
    }

    // Log the call (keeping localStorage for call log as it's not in Supabase yet)
    const callLog = this.getCallLog(dealershipId);
    callLog.unshift({
      id: `call-${Date.now()}`,
      contactId,
      timestamp: new Date().toISOString(),
      contactName: contact?.name || 'Unknown'
    });

    // Keep only last 100 calls
    if (callLog.length > 100) {
      callLog.splice(100);
    }

    const key = `${this.STORAGE_KEYS.CALL_LOG}_${dealershipId}`;
    localStorage.setItem(key, JSON.stringify(callLog));
  }

  static getCallLog(dealershipId: string): Array<{id: string, contactId: string, timestamp: string, contactName: string}> {
    const key = `${this.STORAGE_KEYS.CALL_LOG}_${dealershipId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  static async getContactsByCategory(dealershipId: string, category: ContactCategory): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('category', category)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(this.fromDatabaseFormat);
  }

  static async getFavoriteContacts(dealershipId: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('is_favorite', true)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(this.fromDatabaseFormat);
  }

  static async searchContacts(dealershipId: string, query: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('dealership_id', dealershipId)
      .or(`name.ilike.%${query}%,company.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(this.fromDatabaseFormat);
  }

  static async getContactStats(dealershipId: string): Promise<{
    total: number;
    active: number;
    favorites: number;
    byCategory: Record<ContactCategory, number>;
  }> {
    const contacts = await this.getContacts(dealershipId);
    
    const stats = {
      total: contacts.length,
      active: contacts.filter(c => c.isActive).length,
      favorites: contacts.filter(c => c.isFavorite).length,
      byCategory: {} as Record<ContactCategory, number>
    };

    // Initialize category counts
    Object.keys(CONTACT_CATEGORY_CONFIGS).forEach(category => {
      stats.byCategory[category as ContactCategory] = 0;
    });

    // Count by category
    contacts.forEach(contact => {
      if (stats.byCategory[contact.category] !== undefined) {
        stats.byCategory[contact.category]++;
      }
    });

    return stats;
  }

  static async getContactSettings(dealershipId: string): Promise<ContactSettings> {
    try {
      // First try to get from Supabase
      const { data, error } = await supabase
        .from('contact_settings')
        .select('settings')
        .eq('dealership_id', dealershipId)
        .single();

      if (!error && data && data.settings) {
        const storedSettings = data.settings;
        
        // Merge with default settings
        const mergedSettings: ContactSettings = {
          defaultCategory: 'other',
          autoSaveContacts: true,
          showFavoritesFirst: true,
          enableCallLogging: true,
          ...storedSettings
        };
        
        // Also save to localStorage as backup
        this.saveContactSettingsToLocalStorage(dealershipId, mergedSettings);
        return mergedSettings;
      }
    } catch (error) {
      console.error('Error fetching contact settings from Supabase:', error);
    }

    // Fallback to localStorage
    return this.getContactSettingsFromLocalStorage(dealershipId);
  }

  private static getContactSettingsFromLocalStorage(dealershipId: string): ContactSettings {
    const key = `${this.STORAGE_KEYS.CONTACT_SETTINGS}_${dealershipId}`;
    const data = localStorage.getItem(key);
    
    if (data) {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.error('Error parsing contact settings from localStorage:', error);
      }
    }

    // Default settings
    const defaultSettings: ContactSettings = {
      defaultCategory: 'other',
      autoSaveContacts: true,
      showFavoritesFirst: true,
      enableCallLogging: true
    };

    this.saveContactSettingsToLocalStorage(dealershipId, defaultSettings);
    return defaultSettings;
  }

  private static saveContactSettingsToLocalStorage(dealershipId: string, settings: ContactSettings): void {
    const key = `${this.STORAGE_KEYS.CONTACT_SETTINGS}_${dealershipId}`;
    localStorage.setItem(key, JSON.stringify(settings));
  }

  static async saveContactSettings(dealershipId: string, settings: ContactSettings): Promise<void> {
    try {
      // Save to Supabase
      const { error } = await supabase
        .from('contact_settings')
        .upsert({
          dealership_id: dealershipId,
          settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'dealership_id'
        });

      if (error) {
        console.error('Error saving contact settings to Supabase:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error saving contact settings to Supabase:', error);
      // Continue to save to localStorage as backup
    }

    // Always save to localStorage as backup
    this.saveContactSettingsToLocalStorage(dealershipId, settings);
  }

  static getCategoryConfig(category: ContactCategory) {
    return CONTACT_CATEGORY_CONFIGS[category];
  }

  static formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    return phone; // Return original if not 10 digits
  }

  static makePhoneCall(phone: string): void {
    // Create tel: link for mobile devices
    const cleanPhone = phone.replace(/\D/g, '');
    window.location.href = `tel:${cleanPhone}`;
  }
}