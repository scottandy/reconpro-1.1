import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { ThemeSettingsManager, ThemeSettings, DEFAULT_THEME_SETTINGS } from '../utils/themeSettingsManager';
import { AuthContext } from './AuthContext';

interface ThemeState {
  isDarkMode: boolean;
  isLoading: boolean;
  settings: ThemeSettings;
}

interface ThemeContextType extends ThemeState {
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
  updateSettings: (updates: Partial<ThemeSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

type ThemeAction =
  | { type: 'SET_DARK_MODE'; payload: boolean }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SETTINGS'; payload: ThemeSettings }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<ThemeSettings> };

const initialState: ThemeState = {
  isDarkMode: false,
  isLoading: true,
  settings: DEFAULT_THEME_SETTINGS
};

function themeReducer(state: ThemeState, action: ThemeAction): ThemeState {
  switch (action.type) {
    case 'SET_DARK_MODE':
      return { 
        ...state, 
        isDarkMode: action.payload, 
        isLoading: false,
        settings: { ...state.settings, isDarkMode: action.payload }
      };
    case 'TOGGLE_DARK_MODE':
      return { 
        ...state, 
        isDarkMode: !state.isDarkMode,
        settings: { ...state.settings, isDarkMode: !state.isDarkMode }
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SETTINGS':
      return { 
        ...state, 
        settings: action.payload,
        isDarkMode: action.payload.isDarkMode,
        isLoading: false
      };
    case 'UPDATE_SETTINGS':
      const updatedSettings = { ...state.settings, ...action.payload };
      return { 
        ...state, 
        settings: updatedSettings,
        isDarkMode: updatedSettings.isDarkMode
      };
    default:
      return state;
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, initialState);
  const authContext = useContext(AuthContext);
  const dealership = authContext?.dealership;

  useEffect(() => {
    const loadThemeSettings = async () => {
      if (!dealership) {
        // Fallback to localStorage for non-authenticated users
        const savedTheme = localStorage.getItem('darkMode');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDarkMode = savedTheme ? JSON.parse(savedTheme) : prefersDark;
        
        dispatch({ type: 'SET_DARK_MODE', payload: isDarkMode });
        return;
      }

      try {
        const settings = await ThemeSettingsManager.getThemeSettings(dealership.id);
        dispatch({ type: 'SET_SETTINGS', payload: settings });
      } catch (error) {
        console.error('Error loading theme settings:', error);
        // Fallback to localStorage
        const savedTheme = localStorage.getItem('darkMode');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDarkMode = savedTheme ? JSON.parse(savedTheme) : prefersDark;
        
        dispatch({ type: 'SET_DARK_MODE', payload: isDarkMode });
      }
    };

    loadThemeSettings();
  }, [dealership]);

  useEffect(() => {
    // Apply theme changes to document
    if (state.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save to localStorage for non-authenticated users
    if (!dealership) {
      localStorage.setItem('darkMode', JSON.stringify(state.isDarkMode));
    }
  }, [state.isDarkMode, dealership]);

  const toggleDarkMode = () => {
    dispatch({ type: 'TOGGLE_DARK_MODE' });
  };

  const setDarkMode = (enabled: boolean) => {
    dispatch({ type: 'SET_DARK_MODE', payload: enabled });
  };

  const updateSettings = async (updates: Partial<ThemeSettings>) => {
    if (!dealership) {
      // For non-authenticated users, just update local state
      dispatch({ type: 'UPDATE_SETTINGS', payload: updates });
      return;
    }

    try {
      await ThemeSettingsManager.updateThemeSettings(dealership.id, updates);
      dispatch({ type: 'UPDATE_SETTINGS', payload: updates });
    } catch (error) {
      console.error('Error updating theme settings:', error);
    }
  };

  const resetToDefaults = async () => {
    if (!dealership) {
      // For non-authenticated users, just reset local state
      dispatch({ type: 'SET_SETTINGS', payload: DEFAULT_THEME_SETTINGS });
      return;
    }

    try {
      await ThemeSettingsManager.resetToDefaults(dealership.id);
      dispatch({ type: 'SET_SETTINGS', payload: DEFAULT_THEME_SETTINGS });
    } catch (error) {
      console.error('Error resetting theme settings:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        ...state,
        toggleDarkMode,
        setDarkMode,
        updateSettings,
        resetToDefaults
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};