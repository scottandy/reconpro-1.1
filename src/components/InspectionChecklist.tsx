import React, { useState, useEffect } from 'react';
import { Vehicle, TeamNote, InspectionStatus } from '../types/vehicle';
import { useAuth } from '../contexts/AuthContext';
import { InspectionDataManager } from '../utils/inspectionDataManager';
import { InspectionSettings, InspectionSection } from '../types/inspectionSettings';
import { AnalyticsManager } from '../utils/analytics';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Circle, 
  Save, 
  RotateCcw,
  Leaf,
  Palette,
  Wrench,
  Sparkles,
  Camera,
  FileText
} from 'lucide-react';

interface InspectionChecklistProps {
  vehicleId: string;
  vehicleName: string;
  onDataChange?: (data: any) => void;
  vehicle: Vehicle;
  onStatusUpdate: (section: string, status: InspectionStatus) => void;
  onSectionComplete: (section: string, userInitials: string) => void;
  onAddTeamNote: (note: Omit<TeamNote, 'id' | 'timestamp'>) => void;
  activeFilter: string | null;
  onGeneratePdf: () => void;
  onInspectionDataChange: (data: any) => void;
  onTeamNoteAdded: (note: TeamNote) => void;
}

const InspectionChecklist: React.FC<InspectionChecklistProps> = ({ 
  vehicleId,
  vehicleName,
  onDataChange,
  vehicle,
  onStatusUpdate,
  onSectionComplete,
  onAddTeamNote,
  activeFilter,
  onGeneratePdf,
  onInspectionDataChange,
  onTeamNoteAdded
}) => {
  const { dealership, user } = useAuth();
  const [inspectionSettings, setInspectionSettings] = useState<InspectionSettings | null>(null);
  const [inspectionData, setInspectionData] = useState<any>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (dealership) {
      loadInspectionSettings();
      loadInspectionData();
    }
  }, [dealership, vehicleId]);

  const loadInspectionSettings = async () => {
    if (!dealership) return;
    
    try {
      const settings = await InspectionDataManager.getSettings(dealership.id);
      setInspectionSettings(settings);
    } catch (error) {
      console.error('Error loading inspection settings:', error);
    }
  };

  const loadInspectionData = async () => {
    if (!user) return;
    
    try {
      const data = await InspectionDataManager.loadInspectionData(vehicleId, user.id);
      setInspectionData(data || {});
    } catch (error) {
      console.error('Error loading inspection data:', error);
      setInspectionData({});
    }
  };

  const handleRatingChange = async (sectionKey: string, itemId: string, rating: string, itemLabel: string) => {
    if (!user) return;

    const updatedData = { ...inspectionData };
    
    // Initialize section if it doesn't exist
    if (!updatedData[sectionKey]) {
      updatedData[sectionKey] = [];
    }

    // Find existing item or create new one
    const existingItemIndex = updatedData[sectionKey].findIndex((item: any) => item.id === itemId);
    
    if (existingItemIndex >= 0) {
      const oldRating = updatedData[sectionKey][existingItemIndex].rating;
      updatedData[sectionKey][existingItemIndex] = {
        ...updatedData[sectionKey][existingItemIndex],
        rating,
        updatedBy: user.initials,
        updatedAt: new Date().toISOString()
      };
      
      // Record analytics for the change
      AnalyticsManager.recordTaskUpdate(
        vehicleId,
        vehicleName,
        sectionKey as any,
        user.initials,
        itemLabel,
        oldRating,
        rating
      );
    } else {
      // Create new item
      const newItem = {
        id: itemId,
        label: itemLabel,
        rating,
        updatedBy: user.initials,
        updatedAt: new Date().toISOString()
      };
      updatedData[sectionKey].push(newItem);
      
      // Record analytics for the new item
      AnalyticsManager.recordTaskUpdate(
        vehicleId,
        vehicleName,
        sectionKey as any,
        user.initials,
        itemLabel,
        undefined,
        rating
      );
    }

    setInspectionData(updatedData);
    setHasChanges(true);
    
    // Auto-save if enabled
    if (inspectionSettings?.globalSettings?.autoSaveProgress) {
      await saveInspectionData(updatedData);
    }
    
    // Notify parent component of changes
    if (onInspectionDataChange) {
      onInspectionDataChange(updatedData);
    }
  };

  const saveInspectionData = async (dataToSave?: any) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const success = await InspectionDataManager.saveInspectionData(
        vehicleId, 
        user.id, 
        dataToSave || inspectionData
      );
      
      if (success) {
        setHasChanges(false);
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Error saving inspection data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetInspectionData = () => {
    if (window.confirm('Are you sure you want to reset all inspection data? This action cannot be undone.')) {
      setInspectionData({});
      setHasChanges(true);
    }
  };

  const getSectionIcon = (sectionKey: string) => {
    switch (sectionKey) {
      case 'emissions':
        return Leaf;
      case 'cosmetic':
        return Palette;
      case 'mechanical':
        return Wrench;
      case 'cleaning':
        return Sparkles;
      case 'photos':
        return Camera;
      default:
        return CheckCircle2;
    }
  };

  const getRatingConfig = (rating: string) => {
    switch (rating) {
      case 'G':
      case 'great':
        return {
          label: 'Great',
          color: 'bg-emerald-600 text-white ring-2 ring-emerald-300',
          icon: '⭐'
        };
      case 'F':
      case 'fair':
        return {
          label: 'Fair',
          color: 'bg-yellow-600 text-white ring-2 ring-yellow-300',
          icon: '✓'
        };
      case 'N':
      case 'needs-attention':
        return {
          label: 'Needs Attention',
          color: 'bg-red-600 text-white ring-2 ring-red-300',
          icon: '⚠️'
        };
      case 'not-checked':
      default:
        return {
          label: 'Not Checked',
          color: 'bg-gray-500 text-white',
          icon: '?'
        };
    }
  };

  if (!inspectionSettings) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inspection settings...</p>
        </div>
      </div>
    );
  }

  const activeSections = inspectionSettings.sections
    .filter(section => section.isActive)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Vehicle Inspection Checklist</h3>
            <p className="text-sm text-gray-600">Complete the inspection for each section</p>
          </div>
          
          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-xs text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            
            <button
              onClick={() => saveInspectionData()}
              disabled={!hasChanges || isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            
            <button
              onClick={resetInspectionData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Inspection Sections */}
      {activeSections.map((section) => {
        const SectionIcon = getSectionIcon(section.key);
        const sectionData = inspectionData[section.key] || [];
        
        return (
          <div key={section.id} className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200/60">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${section.color}`}>
                  <SectionIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{section.label}</h4>
                
                <button
                  onClick={onGeneratePdf}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <FileText className="w-4 h-4" />
                  Generate PDF
                </button>
                  {section.description && (
                    <p className="text-sm text-gray-600">{section.description}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              {section.items.length > 0 ? (
                <div className="space-y-4">
                  {section.items
                    .filter(item => item.isActive)
                    .sort((a, b) => a.order - b.order)
                    .map((item) => {
                      const existingData = sectionData.find((data: any) => data.id === item.id);
                      const currentRating = existingData?.rating || 'not-checked';
                      
                      return (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50/80 rounded-lg border border-gray-200/60">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{item.label}</h5>
                            {item.description && (
                              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {['great', 'fair', 'needs-attention', 'not-checked'].map((rating) => {
                              const config = getRatingConfig(rating);
                              const isSelected = currentRating === rating || 
                                               (currentRating === 'G' && rating === 'great') ||
                                               (currentRating === 'F' && rating === 'fair') ||
                                               (currentRating === 'N' && rating === 'needs-attention');
                              
                              return (
                                <button
                                  key={rating}
                                  onClick={() => handleRatingChange(section.key, item.id, rating === 'great' ? 'G' : rating === 'fair' ? 'F' : rating === 'needs-attention' ? 'N' : 'not-checked', item.label)}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    isSelected 
                                      ? config.color 
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                  title={config.label}
                                >
                                  <span className="hidden sm:inline">{config.label}</span>
                                  <span className="sm:hidden">{config.icon}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Circle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No inspection items configured for this section</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
      
      {activeSections.length === 0 && (
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Inspection Sections</h3>
          <p className="text-gray-600">No active inspection sections are configured. Contact your administrator to set up inspection sections.</p>
        </div>
      )}
    </div>
  );
};

export default InspectionChecklist;