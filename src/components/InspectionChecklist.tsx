import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Vehicle, InspectionStatus, TeamNote } from '../types/vehicle';
import { useAuth } from '../contexts/AuthContext';
import { AnalyticsManager } from '../utils/analytics';
import { InspectionSettingsManager } from '../utils/inspectionSettingsManager';
import { InspectionSettings, InspectionSection } from '../types/inspectionSettings';
import { CheckCircle2, Circle, Save, Star, AlertTriangle, CheckCircle, Clock, Filter, X, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { InspectionDataManager } from '../utils/inspectionDataManager';

console.log('[InspectionChecklist] File loaded');

interface InspectionChecklistProps {
  vehicle: Vehicle;
  onStatusUpdate: (section: keyof Vehicle['status'], status: InspectionStatus) => void;
  onSectionComplete: (section: keyof Vehicle['status'], userInitials: string) => void;
  onAddTeamNote: (note: Omit<TeamNote, 'id' | 'timestamp'>) => void;
  activeFilter?: string | null;
  onGeneratePdf?: () => void;
}

type ItemRating = 'G' | 'F' | 'N' | 'not-checked';

interface ChecklistItem {
  key: string;
  label: string;
  rating: ItemRating;
  notes?: string;
}

interface InspectionData {
  [key: string]: ChecklistItem[] | Record<string, string> | string | undefined;
  emissions: ChecklistItem[];
  cosmetic: ChecklistItem[];
  mechanical: ChecklistItem[];
  cleaning: ChecklistItem[];
  photos: ChecklistItem[];
  sectionNotes: Record<string, string>;
  overallNotes: string;
  lastSaved?: string;
}

// Default inspection data structure - will be overridden by settings
const DEFAULT_INSPECTION_DATA: InspectionData = {
  emissions: [
    { key: 'emissionsTest', label: 'Pass Emissions Test', rating: 'not-checked' },
    { key: 'obd2Scan', label: 'OBD2 Diagnostic Scan', rating: 'not-checked' },
    { key: 'catalyticConverter', label: 'Catalytic Converter Check', rating: 'not-checked' }
  ],
  cosmetic: [
    { key: 'exteriorPaint', label: 'Exterior Paint Condition', rating: 'not-checked' },
    { key: 'bumperCondition', label: 'Bumper Condition', rating: 'not-checked' },
    { key: 'windowsGlass', label: 'Windows & Glass', rating: 'not-checked' },
    { key: 'lightsFunction', label: 'All Lights Functioning', rating: 'not-checked' },
    { key: 'tiresCondition', label: 'Tire Condition & Tread', rating: 'not-checked' },
    { key: 'interiorCleanliness', label: 'Interior Cleanliness', rating: 'not-checked' }
  ],
  mechanical: [
    { key: 'engineOperation', label: 'Engine Operation', rating: 'not-checked' },
    { key: 'transmissionFunction', label: 'Transmission Function', rating: 'not-checked' },
    { key: 'brakesCondition', label: 'Brakes Condition', rating: 'not-checked' },
    { key: 'suspensionCheck', label: 'Suspension Check', rating: 'not-checked' },
    { key: 'steeringAlignment', label: 'Steering & Alignment', rating: 'not-checked' },
    { key: 'fluidsLevels', label: 'Fluid Levels Check', rating: 'not-checked' }
  ],
  cleaning: [
    { key: 'exteriorWash', label: 'Exterior Wash & Wax', rating: 'not-checked' },
    { key: 'interiorVacuum', label: 'Interior Vacuum', rating: 'not-checked' },
    { key: 'windowsCleaned', label: 'Windows Cleaned', rating: 'not-checked' },
    { key: 'detailComplete', label: 'Detail Complete', rating: 'not-checked' }
  ],
  photos: [
    { key: 'exteriorPhotos', label: 'Exterior Photos (All Angles)', rating: 'not-checked' },
    { key: 'interiorPhotos', label: 'Interior Photos', rating: 'not-checked' },
    { key: 'engineBayPhotos', label: 'Engine Bay Photos', rating: 'not-checked' },
    { key: 'damagePhotos', label: 'Any Damage Photos', rating: 'not-checked' }
  ],
  sectionNotes: {
    emissions: '',
    cosmetic: '',
    mechanical: '',
    cleaning: '',
    photos: ''
  },
  overallNotes: ''
};

// CRITICAL: Section key mapping to vehicle status
const SECTION_TO_STATUS_MAP: Record<string, keyof Vehicle['status']> = {
  'emissions': 'emissions',
  'cosmetic': 'cosmetic', 
  'mechanical': 'mechanical',
  'cleaning': 'cleaned',  // 🎯 FIXED: cleaning maps to 'cleaned'
  'photos': 'photos'
  // Custom sections will be handled dynamically
};

// Helper function to get the status key for any section
const getStatusKeyForSection = (sectionKey: string): keyof Vehicle['status'] => {
  // Handle the cleaning -> cleaned mapping
  if (sectionKey === 'cleaning') return 'cleaned';
  
  // Check if it's a standard section
  const standardSections = ['emissions', 'cosmetic', 'mechanical', 'photos'];
  if (standardSections.includes(sectionKey)) {
    return sectionKey as keyof Vehicle['status'];
  }
  
  // For custom sections, return the key as-is
  return sectionKey as keyof Vehicle['status'];
};

const ItemRatingButton: React.FC<{
  rating: ItemRating;
  onClick: () => void;
  isSelected: boolean;
  compact?: boolean;
}> = ({ rating, onClick, isSelected, compact = false }) => {
  const getRatingConfig = (rating: ItemRating) => {
    switch (rating) {
      case 'G':
        return {
          icon: Star,
          label: 'Great',
          shortLabel: 'G',
          selectedColor: 'bg-emerald-600 text-white ring-2 ring-emerald-300',
          unselectedColor: 'bg-gray-100 text-emerald-600 border border-emerald-200 hover:bg-emerald-50'
        };
      case 'F':
        return {
          icon: CheckCircle,
          label: 'Fair',
          shortLabel: 'F',
          selectedColor: 'bg-yellow-600 text-white ring-2 ring-yellow-300',
          unselectedColor: 'bg-gray-100 text-yellow-600 border border-yellow-200 hover:bg-yellow-50'
        };
      case 'N':
        return {
          icon: AlertTriangle,
          label: 'Needs Attention',
          shortLabel: 'N',
          selectedColor: 'bg-red-600 text-white ring-2 ring-red-300',
          unselectedColor: 'bg-gray-100 text-red-600 border border-red-200 hover:bg-red-50'
        };
      default:
        return {
          icon: Circle,
          label: 'Not Checked',
          shortLabel: '?',
          selectedColor: 'bg-gray-500 text-white',
          unselectedColor: 'bg-gray-100 text-gray-500 border border-gray-200'
        };
    }
  };

  const config = getRatingConfig(rating);
  const Icon = config.icon;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`
          flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold transition-all duration-200
          ${isSelected ? config.selectedColor : config.unselectedColor}
          ${isSelected ? 'shadow-md' : 'shadow-sm'}
        `}
        title={config.label}
      >
        {config.shortLabel}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200
        ${isSelected ? config.selectedColor : config.unselectedColor}
        ${isSelected ? 'shadow-md' : 'shadow-sm'}
      `}
    >
      <Icon className="w-3 h-3" />
      <span className="hidden sm:inline">{config.label}</span>
    </button>
  );
};

const CompactInspectionItem: React.FC<{
  item: ChecklistItem;
  onRatingChange: (rating: ItemRating) => void;
}> = ({ item, onRatingChange }) => {
  const ratings: ItemRating[] = ['G', 'F', 'N'];

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-white/50 rounded-lg border border-gray-200">
      <div className="flex-1 min-w-0 mr-3">
        <h4 className="font-medium text-gray-900 text-sm truncate">{item.label}</h4>
        {item.rating !== 'not-checked' && (
          <div className="mt-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              item.rating === 'G' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
              item.rating === 'F' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
              'bg-red-100 text-red-700 border border-red-200'
            }`}>
              {item.rating === 'G' ? 'Great' : item.rating === 'F' ? 'Fair' : 'Needs Attention'}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex gap-1">
        {ratings.map((rating) => (
          <ItemRatingButton
            key={rating}
            rating={rating}
            isSelected={item.rating === rating}
            onClick={() => onRatingChange(rating)}
            compact={true}
          />
        ))}
      </div>
    </div>
  );
};

const ChecklistSection: React.FC<{
  title: string;
  sectionKey: string;
  items: ChecklistItem[];
  notes: string;
  onItemChange: (key: string, rating: ItemRating) => void;
  onNotesChange: (notes: string) => void;
  onStatusUpdate: (sectionKey: string, status: InspectionStatus) => void;
  isFiltered?: boolean;
}> = ({ title, sectionKey, items, notes, onItemChange, onNotesChange, onStatusUpdate, isFiltered = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const calculateSectionStatus = (): InspectionStatus => {
    if (items.length === 0) return 'not-started';
    
    const checkedItems = items.filter(item => item.rating !== 'not-checked');
    if (checkedItems.length === 0) return 'not-started';
    
    const needsAttentionItems = checkedItems.filter(item => item.rating === 'N');
    if (needsAttentionItems.length > 0) return 'needs-attention';
    
    const allGreat = checkedItems.every(item => item.rating === 'G');
    if (allGreat) return 'completed';
    
    return 'pending';
  };

  // Handle item change and update status
  const handleItemChange = (key: string, rating: ItemRating) => {
    onItemChange(key, rating);
    // After updating the item, calculate and send new status
    const newStatus = calculateSectionStatus();
    onStatusUpdate(sectionKey, newStatus);
  };

  // Auto-expand if filtered
  useEffect(() => {
    if (isFiltered) {
      setIsExpanded(true);
    }
  }, [isFiltered]);

  const currentStatus = calculateSectionStatus();
  const checkedItems = items.filter(item => item.rating !== 'not-checked').length;
  const totalItems = items.length;
  const progress = (checkedItems / totalItems) * 100;

  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border transition-all duration-300 ${
      isFiltered 
        ? 'border-blue-300 ring-2 ring-blue-100 shadow-xl' 
        : 'border-white/30 hover:shadow-xl hover:border-white/50'
    } overflow-hidden`}>
      {/* 🎯 FIXED: Compact Header - Prevents overlapping on mobile */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 sm:p-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 truncate">{title}</h3>
              {isFiltered && (
                <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-200 flex-shrink-0">
                  <Filter className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">Focused</span>
                </div>
              )}
            </div>
            
            {/* 🎯 FIXED: Compact Status Info - Better mobile spacing */}
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-shrink-0">
              <span className="text-gray-600 hidden sm:inline">{checkedItems}/{totalItems}</span>
              <div className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                currentStatus === 'completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                currentStatus === 'needs-attention' ? 'bg-red-100 text-red-800 border border-red-200' :
                currentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                {currentStatus === 'completed' && <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                {currentStatus === 'needs-attention' && <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                {currentStatus === 'pending' && <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                {currentStatus === 'not-started' && <Circle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                <span className="hidden sm:inline">
                  {currentStatus === 'completed' ? 'Done' :
                   currentStatus === 'needs-attention' ? 'Issues' :
                   currentStatus === 'pending' ? 'Working' : 'Start'}
                </span>
              </div>
            </div>
          </div>
          
          {/* 🎯 FIXED: Progress Section - Compact mobile layout */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
            {/* 🎯 FIXED: Percentage Display - Smaller on mobile, positioned correctly */}
            <div className="text-right">
              <div className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900">{Math.round(progress)}%</div>
              <div className="text-xs text-gray-500 hidden sm:block">complete</div>
            </div>
            
            {/* 🎯 FIXED: Progress Circle - Smaller on mobile */}
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${progress * 1.005} 100.5`}
                  className={
                    currentStatus === 'completed' ? 'text-emerald-500' :
                    currentStatus === 'needs-attention' ? 'text-red-500' :
                    currentStatus === 'pending' ? 'text-yellow-500' : 'text-gray-400'
                  }
                  strokeLinecap="round"
                />
              </svg>
              {/* Status Icon in Center of Circle - Smaller on mobile */}
              <div className="absolute inset-0 flex items-center justify-center">
                {currentStatus === 'completed' && <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-emerald-600" />}
                {currentStatus === 'needs-attention' && <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-red-600" />}
                {currentStatus === 'pending' && <Clock className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-yellow-600" />}
                {currentStatus === 'not-started' && <Circle className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400" />}
              </div>
            </div>
            
            {/* Expand/Collapse Icon */}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            )}
          </div>
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 sm:space-y-4">
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
            <div 
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                currentStatus === 'completed' ? 'bg-emerald-600' :
                currentStatus === 'needs-attention' ? 'bg-red-500' :
                currentStatus === 'pending' ? 'bg-yellow-500' : 'bg-gray-400'
              }`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Status Message */}
          <div className={`p-3 rounded-lg border text-sm ${
            currentStatus === 'completed' ? 'bg-emerald-50/80 border-emerald-200/60 text-emerald-700' :
            currentStatus === 'needs-attention' ? 'bg-red-50/80 border-red-200/60 text-red-700' :
            currentStatus === 'pending' ? 'bg-yellow-50/80 border-yellow-200/60 text-yellow-700' :
            'bg-blue-50/80 border-blue-200/60 text-blue-700'
          }`}>
            <strong>Status:</strong> {
              currentStatus === 'completed' ? '✅ Section completed! All items rated as Great.' :
              currentStatus === 'needs-attention' ? '⚠️ Some items need attention - address issues to proceed.' :
              currentStatus === 'pending' ? '🔄 Section in progress - continue rating items.' :
              '📝 Rate all items to proceed.'
            }
          </div>

          {/* Compact Inspection Items */}
          <div className="space-y-2">
            {items.map((item) => (
              <CompactInspectionItem
                key={item.key}
                item={item}
                onRatingChange={(rating) => handleItemChange(item.key, rating)}
              />
            ))}
          </div>

          {/* Section Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section Notes</label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add any overall observations or notes for this section..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const InspectionChecklist: React.FC<InspectionChecklistProps> = ({ 
  vehicle, 
  onStatusUpdate, 
  onSectionComplete, 
  onAddTeamNote, 
  activeFilter,
  onGeneratePdf 
}) => {
  const instanceId = React.useRef(Math.random().toString(36).substr(2, 5)).current;
  console.log(`[InspectionChecklist] Instance ${instanceId} Render`, { vehicle, activeFilter });
  const { user, dealership } = useAuth();
  const [inspectionData, setInspectionData] = useState<InspectionData>(DEFAULT_INSPECTION_DATA);
  const [isLoaded, setIsLoaded] = useState(false);
  const [inspectionSettings, setInspectionSettings] = useState<InspectionSettings | null>(null);

  // Load inspection settings when component mounts
  useEffect(() => {
    console.log('[InspectionChecklist] useEffect: Load inspection settings', { dealership });
    if (!dealership) return;
    (async () => {
      await InspectionSettingsManager.initializeDefaultSettings(dealership.id);
      const settings = await InspectionSettingsManager.getSettings(dealership.id);
      setInspectionSettings(settings);
      console.log('[InspectionChecklist] Inspection settings loaded', settings);
    })();

    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === `dealership_inspection_settings_${dealership.id}`) {
        const updated = await InspectionSettingsManager.getSettings(dealership.id);
        setInspectionSettings(updated);
        console.log('[InspectionChecklist] Inspection settings updated from storage event', updated);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [dealership]);

  // Load inspection data only once per vehicle/user
  useEffect(() => {
    console.log(`[InspectionChecklist] Instance ${instanceId} useEffect: Load inspection data`, { vehicle, user });
    if (!vehicle || !user) return;
    let cancelled = false;
    (async () => {
      console.log('🔄 Loading inspection data for vehicle:', vehicle.id);
      try {
        const savedData = await InspectionDataManager.loadInspectionData(vehicle.id, user.id);
        if (!cancelled && savedData) {
          setInspectionData(savedData);
          setIsLoaded(true);
          console.log('✅ Loaded inspection data from database', savedData);
        } else if (!cancelled) {
          setInspectionData(DEFAULT_INSPECTION_DATA);
          setIsLoaded(true);
          console.log('ℹ️ No inspection data found in DB, using default state');
        }
      } catch (error) {
        if (!cancelled) {
          setInspectionData(DEFAULT_INSPECTION_DATA);
          setIsLoaded(true);
          console.error('❌ Error loading inspection data:', error);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [vehicle?.id, user?.id]);

  // Update inspection item and trigger save
  const updateInspectionItem = (section: keyof InspectionData, key: string, rating: ItemRating) => {
    console.log(`[InspectionChecklist] updateInspectionItem: User clicked ${rating} for ${section}.${key}`);
    setInspectionData(prev => {
      const arr = (prev[section] as ChecklistItem[]) || [];
      const updatedArr = arr.map(item => item.key === key ? { ...item, rating } : item);
      const newData = { ...prev, [section]: updatedArr } as InspectionData;
      console.log('[InspectionChecklist] setInspectionData (from updateInspectionItem)', newData);
      return newData;
    });
  };

  // Update section notes and trigger save
  const updateSectionNotes = (section: keyof InspectionData['sectionNotes'], notes: string) => {
    console.log(`[InspectionChecklist] updateSectionNotes: User updated notes for ${section}`);
    setInspectionData(prev => {
      const newData = {
        ...prev,
        sectionNotes: { ...prev.sectionNotes, [section]: notes }
      } as InspectionData;
      console.log('[InspectionChecklist] setInspectionData (from updateSectionNotes)', newData);
      return newData;
    });
  };

  // Bulletproof status update with correct mapping
  const handleSectionStatusUpdate = (sectionKey: string, status: InspectionStatus) => {
    console.log('[InspectionChecklist] handleSectionStatusUpdate', { sectionKey, status });
    // Only update the parent if the section is completed
    if (status === 'completed') {
      const vehicleStatusKey = getStatusKeyForSection(sectionKey);
      onStatusUpdate(vehicleStatusKey, status);
    }
  };

  // Save inspection data to database (manual only)
  const saveInspectionData = async (): Promise<boolean> => {
    console.log('[InspectionChecklist] saveInspectionData called');
    if (!vehicle || !user) return false;
    try {
      await InspectionDataManager.saveInspectionData(vehicle.id, user.id, inspectionData);
      console.log('[InspectionChecklist] saveInspectionData: Data saved');
      return true;
    } catch (e) {
      console.error('[InspectionChecklist] saveInspectionData: Error', e);
      return false;
    }
  };

  const handleSave = async () => {
    console.log('[InspectionChecklist] handleSave called');
    const ok = await saveInspectionData();
    if (ok) alert('✅ Inspection data saved successfully!');
  };

  // Convert inspection settings to inspection data format
  const getInspectionDataFromSettings = (settings: InspectionSettings): InspectionData => {
    console.log('[InspectionChecklist] getInspectionDataFromSettings', settings);
    // If settings is null/undefined or doesn't have sections, return default data
    if (!settings || !settings.sections || !Array.isArray(settings.sections)) {
      return DEFAULT_INSPECTION_DATA;
    }

    const data: InspectionData = {
      emissions: [],
      cosmetic: [],
      mechanical: [],
      cleaning: [],
      photos: [],
      sectionNotes: {
        emissions: '',
        cosmetic: '',
        mechanical: '',
        cleaning: '',
        photos: ''
      },
      overallNotes: ''
    };
    
    // Map active sections and their items to the inspection data
    settings.sections.filter(section => section.isActive).forEach(section => {
      const sectionKey = section.key as keyof InspectionData;
      
      // Only process if it's one of our known section keys
      if (sectionKey in data) {
        // Map active items to inspection items
        data[sectionKey] = section.items
          .filter(item => item.isActive)
          .map(item => ({
            key: item.id,
            label: item.label,
            rating: 'not-checked' as ItemRating
          }));
      }
    });
    
    console.log('[InspectionChecklist] getInspectionDataFromSettings result', data);
    return data;
  };

  // Helper to calculate section progress from inspectionData
  const getSectionProgress = (sectionKey: keyof InspectionData): number => {
    const items = (inspectionData[sectionKey] as ChecklistItem[]) || [];
    if (items.length === 0) return 0;
    const checkedItems = items.filter(item => item.rating !== 'not-checked').length;
    return Math.round((checkedItems / items.length) * 100);
  };

  // Helper to calculate overall progress from inspectionData
  const getOverallProgress = (): number => {
    const sectionKeys: (keyof InspectionData)[] = ['emissions', 'cosmetic', 'mechanical', 'cleaning', 'photos'];
    let totalItems = 0;
    let checkedItems = 0;
    sectionKeys.forEach(key => {
      const items = (inspectionData[key] as ChecklistItem[]) || [];
      totalItems += items.length;
      checkedItems += items.filter(item => item.rating !== 'not-checked').length;
    });
    if (totalItems === 0) return 0;
    return Math.round((checkedItems / totalItems) * 100);
  };

  // Show loading state until data is loaded
  if (!isLoaded) {
    console.log('[InspectionChecklist] Not loaded yet, showing loading UI');
    return (
      <div className="space-y-4">
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 text-center">
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-blue-200 rounded-full mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
          <p className="text-sm text-gray-600 mt-4">Loading inspection data...</p>
        </div>
      </div>
    );
  }

  // Get sections from settings if available, otherwise use default
  const getSections = () => {
    console.log('[InspectionChecklist] getSections called', { inspectionSettings, inspectionData });
    if (inspectionSettings && inspectionSettings.sections && Array.isArray(inspectionSettings.sections)) {
      // Get all active sections from settings
      return inspectionSettings.sections
        .filter(section => section.isActive)
        .sort((a, b) => a.order - b.order)
        .map(section => {
          const sectionKey = section.key;
          const sectionItems = (inspectionData[sectionKey] as ChecklistItem[]) || [];
          
          // Return the section with existing data or empty array
          return {
            key: section.key,
            title: section.label,
            data: sectionItems,
            notes: inspectionData.sectionNotes[sectionKey] || ''
          };
        });
    }
    
    // Fallback to default sections if no settings
    return [
      {
        key: 'emissions',
        title: 'Emissions',
        data: inspectionData.emissions || [],
        notes: inspectionData.sectionNotes.emissions || ''
      },
      {
        key: 'cosmetic',
        title: 'Cosmetic',
        data: inspectionData.cosmetic || [],
        notes: inspectionData.sectionNotes.cosmetic || ''
      },
      {
        key: 'mechanical',
        title: 'Mechanical',
        data: inspectionData.mechanical || [],
        notes: inspectionData.sectionNotes.mechanical || ''
      },
      {
        key: 'cleaning',
        title: 'Cleaning',
        data: inspectionData.cleaning || [],
        notes: inspectionData.sectionNotes.cleaning || ''
      },
      {
        key: 'photos',
        title: 'Photos',
        data: inspectionData.photos || [],
        notes: inspectionData.sectionNotes.photos || ''
      }
    ];
  };

  // Get sections and filter based on activeFilter
  const sections = getSections();
  const filteredSections = activeFilter 
    ? sections.filter(section => {
        // Map the filter to section key
        const filterMap: Record<string, string> = {
          'emissions': 'emissions',
          'cosmetic': 'cosmetic',
          'mechanical': 'mechanical',
          'cleaned': 'cleaning', // Note: cleaned maps to cleaning section
          'photos': 'photos'
        };
        return section.key === filterMap[activeFilter];
      })
    : sections;

  console.log('[InspectionChecklist] Rendered sections', filteredSections);

  return (
    <div className="space-y-4">
      {/* Filter Indicator */}
      {activeFilter && (
        <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                <Filter className="w-3 h-3 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-blue-800">Focused Inspection Mode</h4>
                <p className="text-xs text-blue-700">
                  Showing only {activeFilter === 'cleaned' ? 'cleaning' : activeFilter} section for faster completion
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Info Display */}
      {user && (
        <div className="bg-green-50/80 backdrop-blur-sm border border-green-200 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-700 font-bold text-sm">{user.initials}</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-green-800">Working as: {user.firstName} {user.lastName}</h4>
              <p className="text-xs text-green-700">
                All task updates will be automatically recorded with your initials
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overall Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-700">Reconditioning Progress</span>
          <span className="font-bold text-gray-900">{getOverallProgress()}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${getOverallProgress()}%` }}
          ></div>
        </div>
      </div>

      {/* Compact Inspection Section Cards */}
      <div className="space-y-3">
        {filteredSections.map((section) => (
          <ChecklistSection
            key={section.key}
            title={section.title}
            sectionKey={section.key}
            items={section.data}
            notes={section.notes}
            onItemChange={(key, rating) => updateInspectionItem(section.key as keyof InspectionData, key, rating)}
            onNotesChange={(notes) => updateSectionNotes(section.key as keyof InspectionData['sectionNotes'], notes)}
            onStatusUpdate={handleSectionStatusUpdate}
            isFiltered={!!activeFilter}
          />
        ))}
      </div>

      {/* Overall Notes */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 p-4">
        <h3 className="text-base font-bold text-gray-900 mb-3">Overall Inspection Notes</h3>
        <textarea
          value={inspectionData.overallNotes}
          onChange={(e) => setInspectionData(prev => ({ ...prev, overallNotes: e.target.value }))}
          placeholder="Add any overall observations or notes about the vehicle inspection..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
          rows={3}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {/* Generate PDF Button - Now positioned to the left of Save */}
        {onGeneratePdf && (
          <button
            onClick={onGeneratePdf}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <FileText className="w-4 h-4" />
            Generate Customer PDF
          </button>
        )}
        
        {/* Save Button */}
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Save className="w-4 h-4" />
          Save Inspection
        </button>
      </div>
    </div>
  );
};

export default InspectionChecklist;