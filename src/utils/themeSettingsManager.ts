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

  static async getThemeSettings(userId: string): Promise<ThemeSettings> {
    try {
      const { data, error } = await supabase
        .from('theme_settings')
        .select('settings')
        .eq('user_id', userId)
        .maybeSingle();

      // Only log real errors
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching theme settings from Supabase:', error);
      }

      if (!data) {
        // No row found, use defaults
        return { ...DEFAULT_THEME_SETTINGS };
      }

      // Merge with defaults
      return { ...DEFAULT_THEME_SETTINGS, ...data.settings };
    } catch (error) {
      // Fallback to defaults
      return { ...DEFAULT_THEME_SETTINGS };
    }
  }

  private static getFromLocalStorage(userId: string): ThemeSettings {
    const key = `${this.STORAGE_KEY}_${userId}`;
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
    this.saveToLocalStorage(userId, DEFAULT_THEME_SETTINGS);
    return DEFAULT_THEME_SETTINGS;
  }

  private static saveToLocalStorage(userId: string, settings: ThemeSettings): void {
    const key = `${this.STORAGE_KEY}_${userId}`;
    localStorage.setItem(key, JSON.stringify(settings));
  }

  static async saveThemeSettings(userId: string, settings: ThemeSettings): Promise<void> {
    // Always save to localStorage first (as default)
    this.saveToLocalStorage(userId, settings);

    try {
      // Then try to save to Supabase (database priority)
      const { error } = await supabase
        .from('theme_settings')
        .upsert({
          user_id: userId,
          settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
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

  static async updateThemeSettings(userId: string, updates: Partial<ThemeSettings>): Promise<boolean> {
    try {
      const currentSettings = await this.getThemeSettings(userId);
      const updatedSettings = { ...currentSettings, ...updates };
      
      await this.saveThemeSettings(userId, updatedSettings);
      return true;
    } catch (error) {
      console.error('Error updating theme settings:', error);
      return false;
    }
  }

  static async resetToDefaults(userId: string): Promise<boolean> {
    try {
      await this.saveThemeSettings(userId, DEFAULT_THEME_SETTINGS);
      return true;
    } catch (error) {
      console.error('Error resetting theme settings to defaults:', error);
      return false;
    }
  }
} 