import React, { useState, useEffect, useCallback } from 'react';
import { Vehicle, TeamNote, InspectionStatus } from '../types/vehicle';
import { useAuth } from '../contexts/AuthContext';
import { InspectionDataManager } from '../utils/inspectionDataManager';
import { InspectionSettings, InspectionSection } from '../types/inspectionSettings';
import { AnalyticsManager } from '../utils/analytics';
import { supabase } from '../utils/supabaseClient';
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
  FileImage,
  Plus,
  X
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
  
  // Photo modal state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhotoItem, setCurrentPhotoItem] = useState<{sectionKey: string, itemId: string, itemLabel: string} | null>(null);
  const [photos, setPhotos] = useState<{url: string, path: string, name: string}[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
      
      // Ensure data structure is correct - preserve ALL sections dynamically
      const normalizedData = {
        ...data, // Preserve all existing sections (including dynamic ones like "bananas")
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

  // Simple save function
  const saveToDatabase = useCallback(async (dataToSave: any) => {
    if (!user || !vehicleId) return;
    
    setSaveStatus('saving');
    console.log('💾 Saving to database:', dataToSave);
    
    try {
      await InspectionDataManager.saveInspectionData(vehicleId, user.id, dataToSave, user.initials);
      console.log('✅ Successfully saved to database');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('❌ Error saving to database:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [user, vehicleId]);

  // Handle rating changes - COMPLETELY REWRITTEN
  const handleRatingChange = (sectionKey: string, itemId: string, newRating: string, itemLabel: string) => {
    if (!user) return;

    console.log('🎯 BUTTON CLICKED:', { sectionKey, itemId, newRating, itemLabel });
    console.log('🎯 Current inspection data before update:', inspectionData);

    // Create a completely new data object
    const newData = { ...inspectionData };
    
    // Ensure section exists
    if (!newData[sectionKey]) {
      newData[sectionKey] = [];
    }

    // Find existing item or create new one
    const existingIndex = newData[sectionKey].findIndex((item: any) => item.id === itemId);
    
    if (existingIndex >= 0) {
      // Update existing item
      newData[sectionKey][existingIndex] = {
        ...newData[sectionKey][existingIndex],
        rating: newRating,
        updatedBy: user.initials,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Add new item
      newData[sectionKey].push({
        id: itemId,
        label: itemLabel,
        rating: newRating,
        updatedBy: user.initials,
        updatedAt: new Date().toISOString()
      });
    }

    console.log('🎯 NEW inspection data after update:', newData);
    console.log('🎯 Updated section data:', newData[sectionKey]);

    // Force state update
    setInspectionData(newData);

    // Notify parent
    if (onInspectionDataChange) {
      onInspectionDataChange(newData);
    }

    // Save to database
    saveToDatabase(newData);

    // Record analytics
    AnalyticsManager.recordTaskUpdate(
      vehicleId,
      vehicleName,
      sectionKey as any,
      user.initials,
      itemLabel,
      undefined,
      newRating
    );
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

  // Simple function to get current rating for an item
  const getCurrentRating = (sectionKey: string, itemId: string): string => {
    const sectionData = inspectionData[sectionKey] || [];
    const item = sectionData.find((data: any) => data.id === itemId);
    const rating = item?.rating || 'not-checked';
    console.log(`Getting rating for ${sectionKey}/${itemId}:`, rating);
    return rating;
  };

  // Photo modal functions
  const openPhotoModal = async (sectionKey: string, itemId: string, itemLabel: string) => {
    setCurrentPhotoItem({ sectionKey, itemId, itemLabel });
    setPhotoModalOpen(true);
    setHasUnsavedChanges(false);
    
    // Check if storage bucket exists and load existing photos
    await checkStorageBucket();
    await loadExistingPhotos(sectionKey, itemId);
  };

  const checkStorageBucket = async () => {
    try {
      console.log('🔍 Checking storage bucket...');
      
      // Try to list files in the root of the bucket
      const { data, error } = await supabase.storage
        .from('reconpro-vehicles')
        .list('', { limit: 1 });

      if (error) {
        console.error('❌ Storage bucket error:', error);
        if (error.message.includes('does not exist')) {
          console.error('❌ The "reconpro-vehicles" bucket does not exist!');
          console.error('❌ Please check your Supabase storage configuration.');
          setUploadError('Storage bucket "reconpro-vehicles" does not exist. Please check your Supabase configuration.');
        } else {
          console.error('❌ Storage bucket access error:', error.message);
          setUploadError(`Storage access error: ${error.message}`);
        }
      } else {
        console.log('✅ Storage bucket exists and is accessible');
        setUploadError(null);
      }
    } catch (error) {
      console.error('💥 Error checking storage bucket:', error);
      setUploadError('Failed to check storage bucket. Please verify your Supabase configuration.');
    }
  };

  const loadExistingPhotos = async (sectionKey: string, itemId: string) => {
    try {
      console.log('📸 Loading existing photos...');
      
      // Create a unique folder path for this inspection item
      const folderPath = `inspection-photos/${vehicleId}/${sectionKey}/${itemId}`;
      
      console.log('📂 Looking for photos in:', folderPath);
      
      // List files in the folder using standard Supabase storage
      const { data: files, error } = await supabase.storage
        .from('reconpro-vehicles')
        .list(folderPath);

      if (error) {
        console.error('❌ Error loading existing photos:', error);
        return;
      }

      console.log('📁 Files found:', files);

      if (files && files.length > 0) {
        // Get public URLs for all photos
        const photoData = await Promise.all(
          files.map(async (file) => {
            const { data: { publicUrl } } = supabase.storage
              .from('reconpro-vehicles')
              .getPublicUrl(`${folderPath}/${file.name}`);
            
            return {
              url: publicUrl,
              path: `${folderPath}/${file.name}`,
              name: file.name
            };
          })
        );
        
        console.log('🖼️ Photo data loaded:', photoData);
        setPhotos(photoData);
      } else {
        console.log('📭 No existing photos found');
        setPhotos([]);
      }
    } catch (error) {
      console.error('💥 Error loading existing photos:', error);
      setPhotos([]);
    }
  };

  const closePhotoModal = () => {
    if (hasUnsavedChanges) {
      // TODO: Show confirmation dialog before closing
      console.log('Unsaved changes detected');
    }
    setPhotoModalOpen(false);
    setCurrentPhotoItem(null);
    setPhotos([]);
    setViewingPhoto(null);
    setHasUnsavedChanges(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !currentPhotoItem) return;

    console.log('🚀 Starting file upload...', { 
      filesCount: files.length, 
      currentPhotoItem,
      vehicleId,
      user: user?.id 
    });

    // Check if user is authenticated
    if (!user) {
      setUploadError('You must be logged in to upload photos.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    
    try {
      const uploadedPhotos: {url: string, path: string, name: string}[] = [];
      
      for (const file of Array.from(files)) {
        console.log('📁 Processing file:', { 
          name: file.name, 
          size: file.size, 
          type: file.type 
        });

        // Validate file type
        if (!file.type.startsWith('image/')) {
          console.warn('⚠️ Skipping non-image file:', file.name);
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          console.warn('⚠️ File too large, skipping:', file.name);
          continue;
        }

        // Create unique filename
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileName = `${timestamp}_${Math.random().toString(36).substring(2)}.${fileExtension}`;
        
        // Create folder path using standard Supabase storage
        const folderPath = `inspection-photos/${vehicleId}/${currentPhotoItem.sectionKey}/${currentPhotoItem.itemId}`;
        const filePath = `${folderPath}/${fileName}`;
        
        console.log('📂 Upload path:', filePath);
        
        // Upload to Supabase storage using standard methods
        const { data, error: uploadError } = await supabase.storage
          .from('reconpro-vehicles')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('❌ Error uploading file:', uploadError);
          console.error('❌ Upload error details:', {
            message: uploadError.message,
            name: uploadError.name,
            error: uploadError
          });
          
          // Set user-friendly error message based on error type
          if (uploadError.message.includes('does not exist')) {
            setUploadError('Storage bucket not found. Please check your Supabase configuration.');
          } else if (uploadError.message.includes('not found')) {
            setUploadError('Storage bucket not accessible. Check your Supabase configuration.');
          } else if (uploadError.message.includes('400')) {
            setUploadError('Bad request (400). This usually means the storage bucket is missing or misconfigured.');
          } else if (uploadError.message.includes('403')) {
            setUploadError('Access denied (403). Check your storage policies and authentication.');
          } else if (uploadError.message.includes('401')) {
            setUploadError('Unauthorized (401). You must be logged in to upload photos.');
          } else if (uploadError.message.includes('JWT')) {
            setUploadError('Authentication error. Please log in again.');
          } else {
            setUploadError(`Upload failed: ${uploadError.message}`);
          }
          
          continue;
        }

        console.log('✅ File uploaded successfully:', data);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('reconpro-vehicles')
          .getPublicUrl(filePath);

        console.log('🔗 Public URL generated:', publicUrl);

        uploadedPhotos.push({
          url: publicUrl,
          path: filePath,
          name: fileName
        });
      }

      if (uploadedPhotos.length > 0) {
        // Add new photos to the list
        setPhotos(prev => [...prev, ...uploadedPhotos]);
        setHasUnsavedChanges(true);
        
        console.log('🎉 Photos uploaded successfully:', uploadedPhotos);
        setUploadError(null); // Clear any previous errors
      } else {
        console.warn('⚠️ No photos were uploaded successfully');
        if (!uploadError) {
          setUploadError('No photos were uploaded. Please check file types and sizes.');
        }
      }
    } catch (error) {
      console.error('💥 Unexpected error during upload:', error);
      setUploadError('An unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = async (photoIndex: number) => {
    const photoToRemove = photos[photoIndex];
    
    console.log('🗑️ Attempting to delete photo:', photoToRemove);
    
    try {
      // Remove from Supabase storage
      const { error } = await supabase.storage
        .from('reconpro-vehicles')
        .remove([photoToRemove.path]);

      if (error) {
        console.error('❌ Error removing photo from storage:', error);
        setUploadError(`Failed to delete photo: ${error.message}`);
        return;
      }

      // Remove from local state
      setPhotos(prev => prev.filter((_, index) => index !== photoIndex));
      setHasUnsavedChanges(true);
      
      console.log('✅ Photo removed successfully from storage:', photoToRemove.path);
      setUploadError(null); // Clear any previous errors
    } catch (error) {
      console.error('💥 Error removing photo:', error);
      setUploadError('An unexpected error occurred while deleting the photo.');
    }
  };

  const openPhotoViewer = (photoUrl: string) => {
    console.log('🖼️ Opening photo viewer for:', photoUrl);
    setViewingPhoto(photoUrl);
  };

  const closePhotoViewer = () => {
    console.log('🖼️ Closing photo viewer');
    setViewingPhoto(null);
  };

  const savePhotos = async () => {
    if (!currentPhotoItem || !user) return;
    
    setIsUploading(true);
    
    try {
      // Save photo references to database
      const photoData = {
        vehicleId,
        sectionKey: currentPhotoItem.sectionKey,
        itemId: currentPhotoItem.itemId,
        photos: photos.map(photo => ({
          path: photo.path,
          name: photo.name,
          uploadedBy: user.initials,
          uploadedAt: new Date().toISOString()
        })),
        updatedBy: user.initials,
        updatedAt: new Date().toISOString()
      };

      // TODO: Save to your inspection_photos table or similar
      console.log('Saving photo data to database:', photoData);
      
      // For now, just simulate the save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasUnsavedChanges(false);
      console.log('Photos saved successfully to database');
    } catch (error) {
      console.error('Error saving photos to database:', error);
    } finally {
      setIsUploading(false);
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
    <div>
      {/* Header with Save Status */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6 mb-6">
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
            <div key={section.id} className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden mb-6">
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
                          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-4 bg-gray-50/80 rounded-lg border border-gray-200/60 space-y-2 sm:space-y-0">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 text-sm leading-tight">{item.label}</h5>
                              {item.description && (
                                <p className="text-xs text-gray-600 mt-1 hidden sm:block">{item.description}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-0.5">Current: {currentRating}</p>
                            </div>
                            
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              {/* Photo Button */}
                              <button
                                onClick={() => openPhotoModal(section.key, item.id, item.label)}
                                className="px-2 py-2 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border-2 bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200 flex items-center gap-1"
                                title="Manage Photos"
                              >
                                <FileImage className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Photos</span>
                              </button>

                              <div className="grid grid-cols-3 gap-1 sm:flex sm:items-center sm:gap-2">
                                {/* Great Button */}
                                <button
                                  onClick={() => handleRatingChange(section.key, item.id, 'G', item.label)}
                                  className={`px-2 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border-2 flex-1 sm:flex-none ${
                                    currentRating === 'G'
                                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg'
                                      : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                                  }`}
                                >
                                  <span className="hidden sm:inline">Great</span>
                                  <span className="sm:hidden">G</span>
                                </button>

                                {/* Fair Button */}
                                <button
                                  onClick={() => handleRatingChange(section.key, item.id, 'F', item.label)}
                                  className={`px-2 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border-2 flex-1 sm:flex-none ${
                                    currentRating === 'F'
                                      ? 'bg-yellow-600 text-white border-yellow-500 shadow-lg'
                                      : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                                  }`}
                                >
                                  <span className="hidden sm:inline">Fair</span>
                                  <span className="sm:hidden">F</span>
                                </button>

                                {/* Needs Attention Button */}
                                <button
                                  onClick={() => handleRatingChange(section.key, item.id, 'N', item.label)}
                                  className={`px-2 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border-2 flex-1 sm:flex-none ${
                                    currentRating === 'N'
                                      ? 'bg-red-600 text-white border-red-500 shadow-lg'
                                      : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                                  }`}
                                >
                                  <span className="hidden sm:inline">Needs Attention</span>
                                  <span className="sm:hidden">N</span>
                                </button>
                              </div>
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
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-8 text-center mb-6">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Inspection Sections</h3>
          <p className="text-gray-600">No active inspection sections are configured. Contact your administrator to set up inspection sections.</p>
        </div>
      )}
      
      {/* Generate PDF Button */}
      {activeSections.length > 0 && (
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-3 sm:p-6 text-center mb-6">
          <button
            onClick={onGeneratePdf}
            className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg text-sm sm:text-base"
          >
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            Print Customer Inspection PDF
          </button>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
            Generate a professional inspection report for the customer
          </p>
        </div>
      )}

      {/* Photo Modal */}
      {photoModalOpen && currentPhotoItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Photo Gallery</h3>
                <p className="text-sm text-gray-600">{currentPhotoItem.itemLabel}</p>
              </div>
              <button
                onClick={closePhotoModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Upload Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Photos
                </label>
                
                {/* Error Display */}
                {uploadError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">{uploadError}</span>
                    </div>
                    
                    {/* Troubleshooting Steps */}
                    <div className="text-xs text-red-600 space-y-1">
                      <p><strong>Quick Fix:</strong></p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Go to Supabase Dashboard → Storage</li>
                        <li>Verify the bucket <code className="bg-red-100 px-1 rounded">reconpro-vehicles</code> exists</li>
                        <li>Check that it's set to <strong>Public</strong></li>
                        <li>Verify your storage policies allow uploads</li>
                        <li>Try uploading again</li>
                      </ol>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="photo-upload"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="photo-upload"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer ${
                      isUploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isUploading ? 'Uploading...' : 'Choose Photos'}</span>
                  </label>
                  {isUploading && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <span className="text-sm">Uploading...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Photo Gallery */}
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group cursor-pointer">
                      {/* Photo Image */}
                      <img
                        src={photo.url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200 transition-all duration-200"
                        onClick={() => openPhotoViewer(photo.url)}
                        title="Click to view full size"
                      />
                      
                      {/* Delete Button - Red X in top right */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removePhoto(index);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 shadow-lg z-10"
                        title="Delete photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      
                      {/* Hover Overlay with View Text */}
                      <div 
                        className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 rounded-lg flex items-center justify-center"
                        onClick={() => openPhotoViewer(photo.url)}
                      >
                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-white text-center pointer-events-none">
                          <Camera className="w-6 h-6 mx-auto mb-1" />
                          <span className="text-xs font-medium">View Photo</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileImage className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-900 mb-2">No Photos Yet</p>
                  <p className="text-sm text-gray-600">Upload photos to document this inspection item</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <span className="text-sm text-orange-600 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Unsaved changes
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={closePhotoModal}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={savePhotos}
                  disabled={isUploading || !hasUnsavedChanges}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    isUploading || !hasUnsavedChanges
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Photos
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-transparent z-[60] flex items-center justify-center">
          <div className="relative w-full h-full bg-white overflow-hidden">
            <img
              src={viewingPhoto}
              alt="Full size photo"
              className="w-full h-full object-cover"
            />
            <button
              onClick={closePhotoViewer}
              className="absolute top-4 right-4 p-3 bg-gray-500/70 text-white rounded-full hover:bg-gray-600/80 transition-colors shadow-lg"
              title="Close photo viewer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionChecklist;