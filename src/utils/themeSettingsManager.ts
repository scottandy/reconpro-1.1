import { supabase } from './supabaseClient';

export interface ThemeSettings {
  isDarkMode: boolean;
  themePreference: 'light' | 'dark' | 'system';
  autoSwitchTheme: boolean;
  customAccentColor?: string;
  fontSize: 'small' | 'medium' | 'large';
  reducedMotion: boolean;
}

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  isDarkMode: false,
  themePreference: 'system',
  autoSwitchTheme: true,
  fontSize: 'medium',
  reducedMotion: false
};

export class ThemeSettingsManager {
  private static readonly STORAGE_KEY = 'theme_settings';

  static async getThemeSettings(dealershipId: string): Promise<ThemeSettings> {
    try {
      // First try to get from Supabase (database priority)
      const { data, error } = await supabase
        .from('theme_settings')
        .select('settings')
        .eq('dealership_id', dealershipId)
        .single();

      if (!error && data && data.settings) {
        const storedSettings = data.settings;
        
        // Deep merge with default settings
        const mergedSettings: ThemeSettings = {
          ...DEFAULT_THEME_SETTINGS,
          ...storedSettings
        };
        
        // Also save to localStorage as backup
        this.saveToLocalStorage(dealershipId, mergedSettings);
        return mergedSettings;
      }
    } catch (error) {
      console.error('Error fetching theme settings from Supabase:', error);
    }

    // Fallback to localStorage
    return this.getFromLocalStorage(dealershipId);
  }

  private static getFromLocalStorage(dealershipId: string): ThemeSettings {
    const key = `${this.STORAGE_KEY}_${dealershipId}`;
    const data = localStorage.getItem(key);
    
    if (data) {
      try {
        const storedSettings = JSON.parse(data);
        return {
          ...DEFAULT_THEME_SETTINGS,
          ...storedSettings
        };
      } catch (error) {
        console.error('Error parsing theme settings from localStorage:', error);
      }
    }

    // Return default settings and save to localStorage
    this.saveToLocalStorage(dealershipId, DEFAULT_THEME_SETTINGS);
    return DEFAULT_THEME_SETTINGS;
  }

  private static saveToLocalStorage(dealershipId: string, settings: ThemeSettings): void {
    const key = `${this.STORAGE_KEY}_${dealershipId}`;
    localStorage.setItem(key, JSON.stringify(settings));
  }

  static async saveThemeSettings(dealershipId: string, settings: ThemeSettings): Promise<void> {
    // Always save to localStorage first (as default)
    this.saveToLocalStorage(dealershipId, settings);

    try {
      // Then try to save to Supabase (database priority)
      const { error } = await supabase
        .from('theme_settings')
        .upsert({
          dealership_id: dealershipId,
          settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'dealership_id'
        });

      if (error) {
        console.error('Error saving theme settings to Supabase:', error);
        // Don't throw error, localStorage is the fallback
      }
    } catch (error) {
      console.error('Error saving theme settings to Supabase:', error);
      // Continue with localStorage as backup
    }
  }

  static async updateThemeSettings(dealershipId: string, updates: Partial<ThemeSettings>): Promise<boolean> {
    try {
      const currentSettings = await this.getThemeSettings(dealershipId);
      const updatedSettings = { ...currentSettings, ...updates };
      
      await this.saveThemeSettings(dealershipId, updatedSettings);
      return true;
    } catch (error) {
      console.error('Error updating theme settings:', error);
      return false;
    }
  }

  static async resetToDefaults(dealershipId: string): Promise<boolean> {
    try {
      await this.saveThemeSettings(dealershipId, DEFAULT_THEME_SETTINGS);
      return true;
    } catch (error) {
      console.error('Error resetting theme settings to defaults:', error);
      return false;
    }
  }
} 