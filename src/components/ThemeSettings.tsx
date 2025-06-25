import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun, Monitor, Palette, Save, RotateCcw, Type, Zap, Eye } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';

const ThemeSettings: React.FC = () => {
  const { isDarkMode, toggleDarkMode, setDarkMode, settings, updateSettings, resetToDefaults } = useTheme();
  const authContext = React.useContext(AuthContext);
  const dealership = authContext?.dealership;
  // Only initialize from settings once
  const [tempSettings, setTempSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    setTempSettings(prev => {
      const updated = { ...prev, [key]: value };
      console.log('tempSettings after change:', updated);
      return updated;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateSettings(tempSettings);
    setHasChanges(false);
    alert('Theme settings saved successfully!');
  };

  const handleReset = () => {
    setTempSettings(settings);
    setHasChanges(false);
  };

  const handleResetToDefaults = async () => {
    if (window.confirm('Are you sure you want to reset all theme settings to defaults?')) {
      await resetToDefaults();
      setTempSettings(settings);
      setHasChanges(false);
    }
  };

  const handleSystemTheme = () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    handleSettingChange('themePreference', 'system');
    handleSettingChange('isDarkMode', prefersDark);
  };

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <Palette className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Theme Settings</h3>
          <p className="text-gray-600 dark:text-gray-400">Customize your visual experience</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Theme Options */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Appearance</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Light Mode */}
            <button
              onClick={() => {
                handleSettingChange('themePreference', 'light');
                handleSettingChange('isDarkMode', false);
                setDarkMode(false);
              }}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                tempSettings.themePreference === 'light'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  tempSettings.themePreference === 'light' ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-600'
                }`}>
                  <Sun className="w-4 h-4 text-white" />
                </div>
                <span className={`text-sm font-medium ${
                  tempSettings.themePreference === 'light' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  Light
                </span>
              </div>
            </button>

            {/* Dark Mode */}
            <button
              onClick={() => {
                handleSettingChange('themePreference', 'dark');
                handleSettingChange('isDarkMode', true);
                setDarkMode(true);
              }}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                tempSettings.themePreference === 'dark'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  tempSettings.themePreference === 'dark' ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-600'
                }`}>
                  <Moon className="w-4 h-4 text-white" />
                </div>
                <span className={`text-sm font-medium ${
                  tempSettings.themePreference === 'dark' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  Dark
                </span>
              </div>
            </button>

            {/* System Theme */}
            <button
              onClick={() => {
                handleSettingChange('themePreference', 'system');
                setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
              }}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                tempSettings.themePreference === 'system'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  tempSettings.themePreference === 'system' ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-600'
                }`}>
                  <Monitor className="w-4 h-4 text-white" />
                </div>
                <span className={`text-sm font-medium ${
                  tempSettings.themePreference === 'system' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  System
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Additional Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Additional Options</h4>
          
          <div className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-800/80 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Auto-Switch Theme</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Automatically switch based on system preference</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tempSettings.autoSwitchTheme}
                onChange={(e) => handleSettingChange('autoSwitchTheme', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-800/80 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
            <div className="flex items-center gap-3">
              <Type className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Font Size</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Adjust text size for better readability</p>
              </div>
            </div>
            <select
              value={tempSettings.fontSize}
              onChange={(e) => handleSettingChange('fontSize', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-800/80 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Reduced Motion</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Reduce animations for accessibility</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tempSettings.reducedMotion}
                onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Quick Toggle */}
        <div className="pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Quick Toggle</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Switch between light and dark mode</p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                isDarkMode ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isDarkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        {hasChanges && (
          <div className="flex gap-3 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        )}

        {/* Reset to Defaults */}
        <div className="pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
          <button
            onClick={handleResetToDefaults}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;