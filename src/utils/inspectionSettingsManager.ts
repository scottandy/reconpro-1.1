import { InspectionSettings, InspectionSection, InspectionItem, RatingLabel, DEFAULT_INSPECTION_SETTINGS } from '../types/inspectionSettings';
import { supabase } from './supabaseClient';

export class InspectionSettingsManager {
  private static readonly STORAGE_KEY = 'dealership_inspection_settings';

  static async initializeDefaultSettings(dealershipId: string): Promise<void> {
    const existingSettings = await this.getSettings(dealershipId);
    if (existingSettings) return;

    const defaultSettings: InspectionSettings = {
      ...DEFAULT_INSPECTION_SETTINGS,
      id: `settings-${Date.now()}`,
      dealershipId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.saveSettings(dealershipId, defaultSettings);
  }

  static async getSettings(dealershipId: string): Promise<InspectionSettings | null> {
    try {
      const { data, error } = await supabase
        .from('inspection_settings')
        .select('settings')
        .eq('dealership_id', dealershipId)
        .maybeSingle();

      // Only log real errors
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching inspection settings from Supabase:', error);
      }

      if (!data) {
        // No row found, use defaults
        return { ...DEFAULT_INSPECTION_SETTINGS };
      }

      const storedSettings = data.settings;
      // Deep merge with default settings to ensure all properties exist
      const mergedSettings: InspectionSettings = {
        ...DEFAULT_INSPECTION_SETTINGS,
        ...storedSettings,
        customerPdfSettings: {
          ...DEFAULT_INSPECTION_SETTINGS.customerPdfSettings,
          ...(storedSettings.customerPdfSettings || {})
        },
        globalSettings: {
          ...DEFAULT_INSPECTION_SETTINGS.globalSettings,
          ...(storedSettings.globalSettings || {})
        },
        ratingLabels: storedSettings.ratingLabels && storedSettings.ratingLabels.length > 0 
          ? storedSettings.ratingLabels 
          : DEFAULT_INSPECTION_SETTINGS.ratingLabels,
        sections: storedSettings.sections || DEFAULT_INSPECTION_SETTINGS.sections
      };
      return mergedSettings;
    } catch (error) {
      // Fallback to defaults
      return { ...DEFAULT_INSPECTION_SETTINGS };
    }
  }

  private static getFromLocalStorage(dealershipId: string): InspectionSettings | null {
    const key = `${this.STORAGE_KEY}_${dealershipId}`;
    const data = localStorage.getItem(key);
    
    if (!data) return null;
    
    try {
      const storedSettings = JSON.parse(data);
      
      // Deep merge with default settings to ensure all properties exist
      const mergedSettings: InspectionSettings = {
        ...DEFAULT_INSPECTION_SETTINGS,
        ...storedSettings,
        // Ensure nested objects are properly merged
        customerPdfSettings: {
          ...DEFAULT_INSPECTION_SETTINGS.customerPdfSettings,
          ...(storedSettings.customerPdfSettings || {})
        },
        globalSettings: {
          ...DEFAULT_INSPECTION_SETTINGS.globalSettings,
          ...(storedSettings.globalSettings || {})
        },
        ratingLabels: storedSettings.ratingLabels && storedSettings.ratingLabels.length > 0 
          ? storedSettings.ratingLabels 
          : DEFAULT_INSPECTION_SETTINGS.ratingLabels,
        sections: storedSettings.sections || DEFAULT_INSPECTION_SETTINGS.sections
      };
      
      return mergedSettings;
    } catch (error) {
      console.error('Error parsing inspection settings from localStorage:', error);
      return null;
    }
  }

  private static saveToLocalStorage(dealershipId: string, settings: InspectionSettings): void {
    const key = `${this.STORAGE_KEY}_${dealershipId}`;
    const updatedSettings = {
      ...settings,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(updatedSettings));
    
    // Trigger storage event for real-time updates
    window.dispatchEvent(new StorageEvent('storage', {
      key,
      newValue: JSON.stringify(updatedSettings)
    }));
  }

  static async saveSettings(dealershipId: string, settings: InspectionSettings): Promise<void> {
    const updatedSettings = {
      ...settings,
      updatedAt: new Date().toISOString()
    };

    // Always save to localStorage first (as default)
    this.saveToLocalStorage(dealershipId, updatedSettings);

    try {
      // Then try to save to Supabase (database priority)
      const { error } = await supabase
        .from('inspection_settings')
        .upsert({
          dealership_id: dealershipId,
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'dealership_id'
        });

      if (error) {
        console.error('Error saving settings to Supabase:', error);
        // Don't throw error, localStorage is the fallback
      }
    } catch (error) {
      console.error('Error saving settings to Supabase:', error);
      // Continue with localStorage as backup
    }
  }

  // Section Management
  static async addSection(dealershipId: string, sectionData: Omit<InspectionSection, 'id' | 'createdAt' | 'updatedAt'>): Promise<InspectionSection> {
    const settings = await this.getSettings(dealershipId);
    if (!settings) throw new Error('Settings not found');

    const newSection: InspectionSection = {
      ...sectionData,
      id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    settings.sections.push(newSection);
    settings.sections.sort((a, b) => a.order - b.order);
    
    await this.saveSettings(dealershipId, settings);
    return newSection;
  }

  static async updateSection(dealershipId: string, sectionId: string, updates: Partial<InspectionSection>): Promise<InspectionSection | null> {
    const settings = await this.getSettings(dealershipId);
    if (!settings) return null;

    const sectionIndex = settings.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return null;

    settings.sections[sectionIndex] = {
      ...settings.sections[sectionIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Re-sort if order changed
    if (updates.order !== undefined) {
      settings.sections.sort((a, b) => a.order - b.order);
    }

    await this.saveSettings(dealershipId, settings);
    return settings.sections[sectionIndex];
  }

  static async deleteSection(dealershipId: string, sectionId: string): Promise<boolean> {
    const settings = await this.getSettings(dealershipId);
    if (!settings) return false;

    const initialLength = settings.sections.length;
    settings.sections = settings.sections.filter(s => s.id !== sectionId);
    
    if (settings.sections.length < initialLength) {
      await this.saveSettings(dealershipId, settings);
      return true;
    }
    return false;
  }

  // Item Management
  static async addItem(dealershipId: string, sectionId: string, itemData: Omit<InspectionItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InspectionItem | null> {
    const settings = await this.getSettings(dealershipId);
    if (!settings) return null;

    const sectionIndex = settings.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return null;

    const newItem: InspectionItem = {
      ...itemData,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    settings.sections[sectionIndex].items.push(newItem);
    settings.sections[sectionIndex].items.sort((a, b) => a.order - b.order);
    
    await this.saveSettings(dealershipId, settings);
    return newItem;
  }

  static async updateItem(dealershipId: string, sectionId: string, itemId: string, updates: Partial<InspectionItem>): Promise<InspectionItem | null> {
    const settings = await this.getSettings(dealershipId);
    if (!settings) return null;

    const sectionIndex = settings.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return null;

    const itemIndex = settings.sections[sectionIndex].items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return null;

    settings.sections[sectionIndex].items[itemIndex] = {
      ...settings.sections[sectionIndex].items[itemIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Re-sort if order changed
    if (updates.order !== undefined) {
      settings.sections[sectionIndex].items.sort((a, b) => a.order - b.order);
    }

    await this.saveSettings(dealershipId, settings);
    return settings.sections[sectionIndex].items[itemIndex];
  }

  static async deleteItem(dealershipId: string, sectionId: string, itemId: string): Promise<boolean> {
    const settings = await this.getSettings(dealershipId);
    if (!settings) return false;

    const sectionIndex = settings.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return false;

    const initialLength = settings.sections[sectionIndex].items.length;
    settings.sections[sectionIndex].items = settings.sections[sectionIndex].items.filter(i => i.id !== itemId);
    
    if (settings.sections[sectionIndex].items.length < initialLength) {
      await this.saveSettings(dealershipId, settings);
      return true;
    }
    return false;
  }

  static async reorderItems(dealershipId: string, sectionId: string, itemIds: string[]): Promise<boolean> {
    const settings = await this.getSettings(dealershipId);
    if (!settings) return false;

    const sectionIndex = settings.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return false;

    // Update order based on the provided array
    itemIds.forEach((itemId, index) => {
      const item = settings.sections[sectionIndex].items.find(i => i.id === itemId);
      if (item) {
        item.order = index + 1;
        item.updatedAt = new Date().toISOString();
      }
    });

    // Re-sort items
    settings.sections[sectionIndex].items.sort((a, b) => a.order - b.order);
    
    await this.saveSettings(dealershipId, settings);
    return true;
  }

  // Rating Labels Management
  static async updateRatingLabel(dealershipId: string, labelKey: 'great' | 'fair' | 'needs-attention' | 'not-checked', updates: Partial<RatingLabel>): Promise<RatingLabel | null> {
    const settings = await this.getSettings(dealershipId);
    if (!settings) return null;

    const labelIndex = settings.ratingLabels.findIndex(l => l.key === labelKey);
    if (labelIndex === -1) return null;

    settings.ratingLabels[labelIndex] = {
      ...settings.ratingLabels[labelIndex],
      ...updates
    };

    await this.saveSettings(dealershipId, settings);
    return settings.ratingLabels[labelIndex];
  }

  // Customer PDF Settings Management
  static async updateCustomerPdfSettings(dealershipId: string, updates: Partial<InspectionSettings['customerPdfSettings']>): Promise<boolean> {
    const settings = await this.getSettings(dealershipId);
    if (!settings) return false;

    settings.customerPdfSettings = {
      ...settings.customerPdfSettings,
      ...updates
    };

    await this.saveSettings(dealershipId, settings);
    return true;
  }

  // Global Settings Management
  static async updateGlobalSettings(dealershipId: string, updates: Partial<InspectionSettings['globalSettings']>): Promise<boolean> {
    const settings = await this.getSettings(dealershipId);
    if (!settings) return false;

    settings.globalSettings = {
      ...settings.globalSettings,
      ...updates
    };

    await this.saveSettings(dealershipId, settings);
    return true;
  }

  // Utility Methods
  static async getActiveSection(dealershipId: string): Promise<InspectionSection[]> {
    const settings = await this.getSettings(dealershipId);
    if (!settings) return [];

    return settings.sections
      .filter(s => s.isActive)
      .sort((a, b) => a.order - b.order);
  }

  static async getActiveSectionItems(dealershipId: string, sectionId: string): Promise<InspectionItem[]> {
    const settings = await this.getSettings(dealershipId);
    if (!settings) return [];

    const section = settings.sections.find(s => s.id === sectionId);
    if (!section) return [];

    return section.items
      .filter(i => i.isActive)
      .sort((a, b) => a.order - b.order);
  }

  static async getRatingLabel(dealershipId: string, labelKey: 'great' | 'fair' | 'needs-attention' | 'not-checked'): Promise<RatingLabel | null> {
    const settings = await this.getSettings(dealershipId);
    if (!settings) return null;

    return settings.ratingLabels.find(l => l.key === labelKey) || null;
  }

  // Reset to Defaults
  static async resetToDefaults(dealershipId: string): Promise<boolean> {
    try {
      const defaultSettings: InspectionSettings = {
        ...DEFAULT_INSPECTION_SETTINGS,
        id: `settings-${Date.now()}`,
        dealershipId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.saveSettings(dealershipId, defaultSettings);
      return true;
    } catch (error) {
      console.error('Error resetting to defaults:', error);
      return false;
    }
  }

  // Export/Import
  static async exportSettings(dealershipId: string): Promise<string | null> {
    const settings = await this.getSettings(dealershipId);
    if (!settings) return null;

    try {
      return JSON.stringify(settings, null, 2);
    } catch (error) {
      console.error('Error exporting settings:', error);
      return null;
    }
  }

  static async importSettings(dealershipId: string, settingsJson: string): Promise<boolean> {
    try {
      const importedSettings = JSON.parse(settingsJson);
      
      // Validate the imported settings structure
      if (!importedSettings.sections || !importedSettings.ratingLabels || !importedSettings.globalSettings || !importedSettings.customerPdfSettings) {
        throw new Error('Invalid settings format');
      }

      // Merge with defaults to ensure all properties exist
      const mergedSettings: InspectionSettings = {
        ...DEFAULT_INSPECTION_SETTINGS,
        ...importedSettings,
        id: `settings-${Date.now()}`,
        dealershipId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Ensure nested objects are properly merged
        customerPdfSettings: {
          ...DEFAULT_INSPECTION_SETTINGS.customerPdfSettings,
          ...(importedSettings.customerPdfSettings || {})
        },
        globalSettings: {
          ...DEFAULT_INSPECTION_SETTINGS.globalSettings,
          ...(importedSettings.globalSettings || {})
        },
        ratingLabels: importedSettings.ratingLabels && importedSettings.ratingLabels.length > 0 
          ? importedSettings.ratingLabels 
          : DEFAULT_INSPECTION_SETTINGS.ratingLabels,
        sections: importedSettings.sections || DEFAULT_INSPECTION_SETTINGS.sections
      };

      await this.saveSettings(dealershipId, mergedSettings);
      return true;
    } catch (error) {
      console.error('Error importing settings:', error);
      return false;
    }
  }
}