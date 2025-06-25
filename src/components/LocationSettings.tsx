import React, { useState, useEffect, useContext } from 'react';
import { LocationManager } from '../utils/locationManager';
import { LocationSettings as LocationSettingsType, LocationType, LOCATION_TYPE_CONFIGS } from '../types/location';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';

const LocationSettings: React.FC = () => {
  const authContext = useContext(AuthContext);
  const dealership = authContext?.dealership;
  const [settings, setSettings] = useState<LocationSettingsType>({
    defaultLocationType: 'on-site',
    allowCustomLocations: true,
    requireLocationForVehicles: true,
    autoAssignLocation: false,
    locationCapacityTracking: true
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load settings on mount and when dealership changes
  useEffect(() => {
    const loadSettings = async () => {
      if (dealership) {
        console.log('Loading location settings for dealership:', dealership.id);
        const currentSettings = await LocationManager.getLocationSettings(dealership.id);
        setSettings(currentSettings);
        setHasChanges(false);
        setLoading(false);
      }
    };
    loadSettings();
  }, [dealership]);

  const handleSettingChange = (key: keyof LocationSettingsType, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (dealership) {
      console.log('Saving location settings for dealership:', dealership.id, settings);
      await LocationManager.saveLocationSettings(dealership.id, settings);
      // Reload to ensure we have the latest from DB/localStorage
      const updatedSettings = await LocationManager.getLocationSettings(dealership.id);
      setSettings(updatedSettings);
      setHasChanges(false);
      alert('Location settings saved successfully!');
    }
  };

  const handleReset = async () => {
    if (dealership) {
      const currentSettings = await LocationManager.getLocationSettings(dealership.id);
      setSettings(currentSettings);
      setHasChanges(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading location settings...</div>;
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Location Settings</h3>
          <p className="text-gray-600">Configure location management preferences</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Default Location Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Default Location Type
          </label>
          <select
            value={settings.defaultLocationType}
            onChange={(e) => handleSettingChange('defaultLocationType', e.target.value as LocationType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Object.entries(LOCATION_TYPE_CONFIGS).map(([type, config]) => (
              <option key={type} value={type}>
                {config.icon} {config.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Default type when creating new locations
          </p>
        </div>

        {/* Settings Toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-lg border border-gray-200/60">
            <div>
              <h4 className="font-medium text-gray-900">Allow Custom Locations</h4>
              <p className="text-sm text-gray-600">Users can create custom location types</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowCustomLocations}
                onChange={(e) => handleSettingChange('allowCustomLocations', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-lg border border-gray-200/60">
            <div>
              <h4 className="font-medium text-gray-900">Require Location for Vehicles</h4>
              <p className="text-sm text-gray-600">All vehicles must have an assigned location</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireLocationForVehicles}
                onChange={(e) => handleSettingChange('requireLocationForVehicles', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-lg border border-gray-200/60">
            <div>
              <h4 className="font-medium text-gray-900">Auto-Assign Location</h4>
              <p className="text-sm text-gray-600">Automatically assign default location to new vehicles</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoAssignLocation}
                onChange={(e) => handleSettingChange('autoAssignLocation', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-lg border border-gray-200/60">
            <div>
              <h4 className="font-medium text-gray-900">Location Capacity Tracking</h4>
              <p className="text-sm text-gray-600">Track and warn when locations reach capacity</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.locationCapacityTracking}
                onChange={(e) => handleSettingChange('locationCapacityTracking', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        {hasChanges && (
          <div className="flex gap-3 pt-4 border-t border-gray-200/60">
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
      </div>
    </div>
  );
};

export default LocationSettings;