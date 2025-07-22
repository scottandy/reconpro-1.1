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
  const [isAddingNote, setIsAddingNote] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');

  // Load inspection settings and data on mount
  useEffect(() => {
    if (dealership && vehicleId && user) {
      loadData();
    }
  }, [dealership, vehicleId, user]);

  const loadData = async () => {
    if (!dealership || !vehicleId || !user) return;
    
    console.log('🔄 Loading inspection data for vehicle:', vehicleId);
    setIsLoading(true);
    
    try {
      // Load settings
      const settings = await InspectionDataManager.getSettings(dealership.id);
      console.log('📋 Loaded inspection settings:', settings);
      setInspectionSettings(settings);

      // Load inspection data
      const data = await InspectionDataManager.loadInspectionData(vehicleId, user.id);
      console.log('📊 Raw inspection data loaded:', data);
      
      // Ensure data structure is correct
      const normalizedData = {
        emissions: data?.emissions || [],
        cosmetic: data?.cosmetic || [],
        mechanical: data?.mechanical || [],
        cleaning: data?.cleaning || [],
        photos: data?.photos || [],
        customSections: data?.customSections || {},
        sectionNotes: data?.sectionNotes || {}
      };
      
      console.log('📊 Normalized inspection data:', normalizedData);
      setInspectionData(normalizedData);
      
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
    } finally {
      setIsLoading(false);
    }
  };

  // Save function
  const saveToDatabase = useCallback(async (dataToSave: any) => {
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
    }
  }, [user, vehicleId]);

  // 🎯 CRITICAL: Handle rating changes - THIS MUST WORK
  const handleRatingChange = (sectionKey: string, itemId: string, newRating: string, itemLabel: string) => {
    if (!user) return;

    console.log('🎯 INSPECTION BUTTON CLICKED:', { sectionKey, itemId, newRating, itemLabel });
    console.log('🎯 Current data before change:', inspectionData);

    // Get old rating for team note
    const sectionData = inspectionData[sectionKey] || [];
    const existingItem = sectionData.find((item: any) => item.id === itemId);
    const oldRating = existingItem?.rating || 'not-checked';

    // Create completely new data object
    const updatedData = { ...inspectionData };
    
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

    // 🚨 CRITICAL: Update state immediately
    setInspectionData(updatedData);

    // Notify parent
    if (onInspectionDataChange) {
      onInspectionDataChange(updatedData);
    }

    // Save to database
    saveToDatabase(updatedData);

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
  };

  // Handle adding manual team notes
  const handleAddTeamNote = (sectionKey: string, noteText: string) => {
    if (!user || !noteText.trim()) return;

    const teamNote: TeamNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: noteText.trim(),
      userInitials: user.initials,
      timestamp: new Date().toISOString(),
      category: sectionKey
    };

    onAddTeamNote(teamNote);
    setIsAddingNote(null);
    setNewNote('');
  };

  // 🎯 CRITICAL: Get current rating for button colors
  const getCurrentRating = (sectionKey: string, itemId: string): string => {
    const sectionData = inspectionData[sectionKey] || [];
    const item = sectionData.find((data: any) => data.id === itemId);
    const rating = item?.rating || 'not-checked';
    console.log(`🔍 Getting rating for ${sectionKey}/${itemId}:`, rating);
    return rating;
  };

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
    <div className="space-y-6">
      {/* Header with Save Status */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Vehicle Inspection Checklist</h3>
            <p className="text-sm text-gray-600">Click buttons to rate each inspection item</p>
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
              <div className="p-4 sm:p-6 border-b border-gray-200/60">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${section.color}`}>
                    <SectionIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{section.label}</h4>
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
                        const currentRating = getCurrentRating(section.key, item.id);
                        
                        return (
                          <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50/80 rounded-lg border border-gray-200/60">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{item.label}</h5>
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">Current: {currentRating}</p>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              {/* 🎯 GREAT BUTTON - MUST WORK */}
                              <button
                                onClick={() => {
                                  console.log('🟢 GREAT BUTTON CLICKED!');
                                  handleRatingChange(section.key, item.id, 'G', item.label);
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${
                                  currentRating === 'G'
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg ring-2 ring-emerald-300'
                                    : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-emerald-100 hover:border-emerald-300'
                                }`}
                              >
                                Great
                              </button>

                              {/* 🎯 FAIR BUTTON - MUST WORK */}
                              <button
                                onClick={() => {
                                  console.log('🟡 FAIR BUTTON CLICKED!');
                                  handleRatingChange(section.key, item.id, 'F', item.label);
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${
                                  currentRating === 'F'
                                    ? 'bg-yellow-600 text-white border-yellow-500 shadow-lg ring-2 ring-yellow-300'
                                    : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-yellow-100 hover:border-yellow-300'
                                }`}
                              >
                                Fair
                              </button>

                              {/* 🎯 NEEDS ATTENTION BUTTON - MUST WORK */}
                              <button
                                onClick={() => {
                                  console.log('🔴 NEEDS ATTENTION BUTTON CLICKED!');
                                  handleRatingChange(section.key, item.id, 'N', item.label);
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${
                                  currentRating === 'N'
                                    ? 'bg-red-600 text-white border-red-500 shadow-lg ring-2 ring-red-300'
                                    : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-red-100 hover:border-red-300'
                                }`}
                              >
                                Needs Attention
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

                {/* 📝 TEAM NOTES SECTION */}
                <div className="mt-6 pt-6 border-t border-gray-200/60">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium text-gray-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Section Notes
                    </h5>
                    <button
                      onClick={() => setIsAddingNote(section.key)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Plus className="w-3 h-3" />
                      Add Note
                    </button>
                  </div>

                  {/* Add Note Form */}
                  {isAddingNote === section.key && (
                    <div className="mb-4 p-3 bg-blue-50/80 rounded-lg border border-blue-200/60">
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-700 font-bold text-xs">{user?.initials}</span>
                          </div>
                          <span className="text-sm font-medium text-blue-800">
                            Adding note as: {user?.firstName} {user?.lastName}
                          </span>
                        </div>
                      </div>
                      
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder={`Add a note about ${section.label.toLowerCase()}...`}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                      />
                      
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleAddTeamNote(section.key, newNote)}
                          disabled={!newNote.trim()}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          Add Note
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingNote(null);
                            setNewNote('');
                          }}
                          className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Team Notes Display */}
                  <div className="space-y-3">
                    {vehicle.teamNotes
                      ?.filter(note => note.category === section.key)
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((note) => (
                        <div key={note.id} className={`border rounded-lg p-3 transition-colors ${
                          note.isCertified 
                            ? 'border-green-200/60 bg-green-50/50 hover:bg-green-50/80' 
                            : 'border-gray-200/60 hover:bg-gray-50/50'
                        }`}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                note.isCertified ? 'bg-green-100' : 'bg-blue-100'
                              }`}>
                                <User className={`w-3 h-3 ${
                                  note.isCertified ? 'text-green-600' : 'text-blue-600'
                                }`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 text-sm">{note.userInitials}</span>
                                  {note.isCertified && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Certified
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatTimestamp(note.timestamp)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <p className={`text-sm ml-8 ${
                            note.isCertified ? 'text-green-900 font-medium' : 'text-gray-700'
                          }`}>
                            {note.text}
                          </p>
                        </div>
                      ))}
                    
                    {!vehicle.teamNotes?.some(note => note.category === section.key) && (
                      <div className="text-center py-4 text-gray-500">
                        <MessageSquare className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No notes for this section yet</p>
                      </div>
                    )}
                  </div>
                </div>
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