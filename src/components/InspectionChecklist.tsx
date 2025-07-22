import React, { useState, useEffect, useCallback } from 'react';
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
  FileText,
  Plus,
  MessageSquare,
  User
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
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [dataLoaded, setDataLoaded] = useState(false);

  // 🎯 CRITICAL: Load data function
  const loadData = useCallback(async () => {
    if (!dealership || !vehicleId || !user) return;
    
    console.log('🔄 Loading inspection data for vehicle:', vehicleId);
    setIsLoading(true);
    setDataLoaded(false);
    
    try {
      // Load settings
      const settings = await InspectionDataManager.getSettings(dealership.id);
      console.log('📋 Loaded inspection settings:', settings);
      setInspectionSettings(settings);

      // Load inspection data
      const data = await InspectionDataManager.loadInspectionData(vehicleId, user.id);
      console.log('📊 Raw inspection data loaded:', data);
      
      // 🎯 CRITICAL: Ensure data structure is correct and log everything
      const normalizedData = {
        emissions: Array.isArray(data?.emissions) ? data.emissions : [],
        cosmetic: Array.isArray(data?.cosmetic) ? data.cosmetic : [],
        mechanical: Array.isArray(data?.mechanical) ? data.mechanical : [],
        cleaning: Array.isArray(data?.cleaning) ? data.cleaning : [],
        photos: Array.isArray(data?.photos) ? data.photos : [],
        customSections: data?.customSections || {},
        sectionNotes: data?.sectionNotes || {}
      };
      
      console.log('📊 Normalized inspection data:', normalizedData);
      console.log('📊 Emissions data specifically:', normalizedData.emissions);
      console.log('📊 Cosmetic data specifically:', normalizedData.cosmetic);
      console.log('📊 Mechanical data specifically:', normalizedData.mechanical);
      setInspectionData(normalizedData);
      setDataLoaded(true);
      
      // Notify parent immediately
      if (onInspectionDataChange) {
        onInspectionDataChange(normalizedData);
      }
    } catch (error) {
      console.error('❌ Error loading inspection data:', error);
      // Set empty data structure on error
      const emptyData = {
        emissions: [],
        cosmetic: [],
        mechanical: [],
        cleaning: [],
        photos: [],
        customSections: {},
        sectionNotes: {}
      };
      setInspectionData(emptyData);
      setDataLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [dealership, vehicleId, user, onInspectionDataChange]);

  // 🎯 CRITICAL: Load inspection settings and data on mount
  useEffect(() => {
    if (dealership && vehicleId && user) {
      loadData();
    }
  }, [dealership, vehicleId, user, loadData]);

  // 🎯 BULLETPROOF: Save function with proper error handling
  const saveToDatabase = useCallback(async (dataToSave: any): Promise<void> => {
    if (!user || !vehicleId) return;
    
    setSaveStatus('saving');
    console.log('💾 Saving to database:', dataToSave);
    
    try {
      await InspectionDataManager.saveInspectionData(vehicleId, user.id, dataToSave);
      console.log('✅ Successfully saved to database');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('❌ Error saving to database:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      throw error; // Re-throw so the caller knows about the error
    }
  }, [user, vehicleId]);

  // 🎯 BULLETPROOF: Handle rating changes with immediate state update
  const handleRatingChange = useCallback((sectionKey: string, itemId: string, newRating: string, itemLabel: string) => {
    if (!user) return;

    console.log('🎯 INSPECTION BUTTON CLICKED:', { sectionKey, itemId, newRating, itemLabel });
    console.log('🎯 Current data before change:', inspectionData);

    // Get old rating for team note
    const sectionData = inspectionData[sectionKey] || [];
    const existingItem = sectionData.find((item: any) => item.id === itemId);
    const oldRating = existingItem?.rating || 'not-checked';

    // 🚨 CRITICAL: Create completely new data object to force re-render
    const updatedData = JSON.parse(JSON.stringify(inspectionData)); // Deep clone
    
    // Ensure section exists
    if (!updatedData[sectionKey]) {
      updatedData[sectionKey] = [];
    }

    // Find and update or create item
    const existingIndex = updatedData[sectionKey].findIndex((item: any) => item.id === itemId);
    
    if (existingIndex >= 0) {
      // Update existing item
      updatedData[sectionKey][existingIndex] = {
        ...updatedData[sectionKey][existingIndex],
        rating: newRating,
        updatedBy: user.initials,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Add new item
      updatedData[sectionKey].push({
        id: itemId,
        label: itemLabel,
        rating: newRating,
        updatedBy: user.initials,
        updatedAt: new Date().toISOString()
      });
    }

    console.log('🎯 Updated data after change:', updatedData);

    // 🚨 CRITICAL: Update state immediately to trigger re-render
    setInspectionData(updatedData);

    // Notify parent immediately
    if (onInspectionDataChange) {
      onInspectionDataChange(updatedData);
    }

    // 🎯 CURSOR AI FIX: Save to database (no reload needed since we update state immediately)
    saveToDatabase(updatedData).catch((error) => {
      console.error('❌ Failed to save to database:', error);
      // Optionally revert the state change if save fails
    });

    // 📝 Create automatic team note
    const getRatingLabel = (rating: string) => {
      switch (rating) {
        case 'G': return 'Great';
        case 'F': return 'Fair';
        case 'N': return 'Needs Attention';
        case 'not-checked': return 'Not Checked';
        default: return rating;
      }
    };

    const getSectionLabel = (sectionKey: string) => {
      const section = inspectionSettings?.sections.find(s => s.key === sectionKey);
      return section?.label || sectionKey;
    };

    // Generate team note text
    let noteText = '';
    if (oldRating === 'not-checked') {
      noteText = `${getSectionLabel(sectionKey)}: ${itemLabel} marked as "${getRatingLabel(newRating)}"`;
    } else {
      noteText = `${getSectionLabel(sectionKey)}: ${itemLabel} updated from "${getRatingLabel(oldRating)}" to "${getRatingLabel(newRating)}"`;
    }

    // Create automatic team note
    const automaticNote: TeamNote = {
      id: `auto-note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: noteText,
      userInitials: user.initials,
      timestamp: new Date().toISOString(),
      category: sectionKey,
      isCertified: true
    };

    console.log('📝 Creating automatic team note:', automaticNote);
    onAddTeamNote(automaticNote);

    // Record analytics
    AnalyticsManager.recordTaskUpdate(
      vehicleId,
      vehicleName,
      sectionKey as any,
      user.initials,
      itemLabel,
      oldRating,
      newRating
    );
  }, [inspectionData, user, vehicleId, vehicleName, inspectionSettings, onInspectionDataChange, onAddTeamNote, saveToDatabase]);

  // 🎯 BULLETPROOF: Get current rating with proper fallback
  const getCurrentRating = useCallback((sectionKey: string, itemId: string): string => {
    if (!dataLoaded) {
      console.log(`🔍 Data not loaded yet for ${sectionKey}/${itemId}`);
      return 'not-checked';
    }
    
    const sectionData = inspectionData[sectionKey] || [];
    console.log(`🔍 Getting rating for ${sectionKey}/${itemId}:`);
    console.log(`🔍 Section data:`, sectionData);
    
    const item = sectionData.find((data: any) => data.id === itemId);
    console.log(`🔍 Found item:`, item);
    
    const rating = item?.rating || 'not-checked';
    console.log(`🔍 Final rating for ${sectionKey}/${itemId}:`, rating);
    return rating;
  }, [inspectionData]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getSectionIcon = (sectionKey: string) => {
    switch (sectionKey) {
      case 'emissions': return Leaf;
      case 'cosmetic': return Palette;
      case 'mechanical': return Wrench;
      case 'cleaning': return Sparkles;
      case 'photos': return Camera;
      default: return CheckCircle2;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inspection checklist...</p>
        </div>
      </div>
    );
  }

  if (!inspectionSettings) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
        <div className="text-center py-8">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Error loading inspection settings</p>
          <button 
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const activeSections = inspectionSettings.sections
    .filter(section => section.isActive)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Save Status */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Vehicle Inspection Checklist</h3>
            <p className="text-xs sm:text-sm text-gray-600">Click buttons to rate each inspection item</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Save Status Indicator */}
            <div className="flex items-center gap-2">
              {saveStatus === 'saving' && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <span className="text-sm">Saving...</span>
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">Saved</span>
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">Save Error</span>
                </div>
              )}
            </div>

            {/* Debug Info */}
            <div className="text-xs text-gray-500">
              Data loaded: {Object.keys(inspectionData).length > 0 ? 'Yes' : 'No'}
            </div>
          </div>
        </div>
      </div>

      {/* Inspection Sections */}
      {activeSections
        .filter(section => !activeFilter || section.key === activeFilter)
        .map((section) => {
          const SectionIcon = getSectionIcon(section.key);
          
          return (
            <div key={section.id} className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden">
              <div className="p-3 sm:p-6 border-b border-gray-200/60">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${section.color}`}>
                    <SectionIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-gray-900">{section.label}</h4>
                    {section.description && (
                      <p className="text-xs sm:text-sm text-gray-600">{section.description}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-2 sm:p-6">
                {section.items.length > 0 ? (
                  <div className="space-y-2 sm:space-y-4">
                    {section.items
                      .filter(item => item.isActive)
                      .sort((a, b) => a.order - b.order)
                      .map((item) => {
                        const currentRating = getCurrentRating(section.key, item.id);
                        
                        return (
                          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-4 bg-gray-50/80 rounded-lg border border-gray-200/60 gap-2 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-gray-900 text-sm sm:text-base">{item.label}</h5>
                              {item.description && (
                                <p className="text-xs sm:text-sm text-gray-600 mt-1 hidden sm:block">{item.description}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                Current: <strong>{currentRating === 'not-checked' ? 'Not Checked' : 
                                  currentRating === 'G' ? 'Great' : 
                                  currentRating === 'F' ? 'Fair' : 
                                  currentRating === 'N' ? 'Needs Attention' : 
                                  currentRating}</strong>
                                {currentRating !== 'not-checked' && (
                                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                    currentRating === 'G' ? 'bg-green-100 text-green-800' :
                                    currentRating === 'F' ? 'bg-yellow-100 text-yellow-800' :
                                    currentRating === 'N' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {currentRating === 'G' ? 'Great' : 
                                     currentRating === 'F' ? 'Fair' : 
                                     currentRating === 'N' ? 'Needs Attention' : 
                                     'Not Checked'}
                                  </span>
                                )}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                              {/* 🎯 GREAT BUTTON */}
                              <button
                                onClick={() => {
                                  console.log('🟢 GREAT BUTTON CLICKED!');
                                  console.log('🟢 Section:', section.key, 'Item:', item.id, 'Label:', item.label);
                                  console.log('🟢 Current inspection data before click:', inspectionData);
                                  handleRatingChange(section.key, item.id, 'G', item.label);
                                }}
                                className={`px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border-2 ${
                                  currentRating === 'G'
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg ring-2 ring-emerald-300'
                                    : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-emerald-100 hover:border-emerald-300'
                                }`}
                              >
                                <span className="sm:hidden">G</span>
                                <span className="hidden sm:inline">Great</span>
                              </button>

                              {/* 🎯 FAIR BUTTON */}
                              <button
                                onClick={() => {
                                  console.log('🟡 FAIR BUTTON CLICKED!');
                                  console.log('🟡 Section:', section.key, 'Item:', item.id, 'Label:', item.label);
                                  console.log('🟡 Current inspection data before click:', inspectionData);
                                  handleRatingChange(section.key, item.id, 'F', item.label);
                                }}
                                className={`px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border-2 ${
                                  currentRating === 'F'
                                    ? 'bg-yellow-600 text-white border-yellow-500 shadow-lg ring-2 ring-yellow-300'
                                    : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-yellow-100 hover:border-yellow-300'
                                }`}
                              >
                                <span className="sm:hidden">F</span>
                                <span className="hidden sm:inline">Fair</span>
                              </button>

                              {/* 🎯 NEEDS ATTENTION BUTTON */}
                              <button
                                onClick={() => {
                                  console.log('🔴 NEEDS ATTENTION BUTTON CLICKED!');
                                  console.log('🔴 Section:', section.key, 'Item:', item.id, 'Label:', item.label);
                                  console.log('🔴 Current inspection data before click:', inspectionData);
                                  handleRatingChange(section.key, item.id, 'N', item.label);
                                }}
                                className={`px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border-2 ${
                                  currentRating === 'N'
                                    ? 'bg-red-600 text-white border-red-500 shadow-lg ring-2 ring-red-300'
                                    : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-red-100 hover:border-red-300'
                                }`}
                              >
                                <span className="sm:hidden">N</span>
                                <span className="hidden sm:inline">Needs Attention</span>
                              </button>
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
      
      {/* Generate PDF Button */}
      {activeSections.length > 0 && (
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6 text-center">
          <button
            onClick={onGeneratePdf}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg text-sm sm:text-base"
          >
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            Print Customer Inspection PDF
          </button>
          <p className="text-xs sm:text-sm text-gray-600 mt-2">
            Generate a professional inspection report for the customer
          </p>
        </div>
      )}
    </div>
  );
};

export default InspectionChecklist;