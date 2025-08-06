import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mockVehicles } from '../data/mockVehicles';
import { Vehicle, TeamNote, InspectionStatus } from '../types/vehicle';
import { AnalyticsManager } from '../utils/analytics';
import StatusBadge from './StatusBadge';
import InspectionChecklist from './InspectionChecklist';
import TeamNotes from './TeamNotes';
import CustomerInspectionPDF from './CustomerInspectionPDF';
import { ProgressCalculator } from '../utils/progressCalculator';
import { supabase } from '../utils/supabaseClient';
import { VehicleManager } from '../utils/vehicleManager';
import { InspectionDataManager } from '../utils/inspectionDataManager';
import { 
  ArrowLeft, 
  Car, 
  Calendar, 
  MapPin, 
  Gauge, 
  DollarSign, 
  Hash, 
  Palette,
  Edit3,
  Save,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Circle,
  FileText,
  Eye,
  MessageSquare,
  ClipboardList,
  Download,
  Printer,
  Archive,
  Trash2
} from 'lucide-react';

const VehicleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [rightPanelView, setRightPanelView] = useState<'inspection' | 'team-notes'>('inspection');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // NEW: Location editing state
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editedLocation, setEditedLocation] = useState('');

  // Vehicle Information editing state
  const [isEditingVehicleInfo, setIsEditingVehicleInfo] = useState(false);
  const [editedVehicleInfo, setEditedVehicleInfo] = useState({
    year: 0,
    make: '',
    model: '',
    trim: '',
    mileage: 0,
    color: '',
    price: 0,
    location: '',
    dateAcquired: ''
  });

  const [inspectionData, setInspectionData] = useState<any>(null);
  const [inspectionLoading, setInspectionLoading] = useState(true);
  const [inspectionSettings, setInspectionSettings] = useState<any>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [customSections, setCustomSections] = useState<any[]>([]);

  // console.log('[VehicleDetail] Render', { vehicle });

  useEffect(() => {
    if (id && user && user.dealershipId) {
      loadVehicle(id, user.dealershipId);
    }
  }, [id, user?.dealershipId]);

  useEffect(() => {
    if (!vehicle || !user) return;
    setInspectionLoading(true);
    InspectionDataManager.loadInspectionData(vehicle.id, user.id)
      .then(data => setInspectionData(data || {}))
      .finally(() => setInspectionLoading(false));
  }, [vehicle?.id, user?.id]);

  // Listen for inspection data changes to update status badges in real-time
  const handleInspectionDataChange = (newData: any) => {
    setInspectionData(newData);
  };
  // Load inspection settings
  useEffect(() => {
    if (!user?.dealershipId) return;
    setSettingsLoaded(false);
    InspectionDataManager.getSettings(user.dealershipId)
      .then(settings => {
        setInspectionSettings(settings);
        setSettingsLoaded(true);
      })
      .catch(error => {
        console.error('Error loading inspection settings:', error);
        setInspectionSettings(null);
        setSettingsLoaded(true);
      });
  }, [user?.dealershipId]);

  // Load custom sections from inspection settings
  useEffect(() => {
    const loadCustomSections = async () => {
      if (!user?.dealershipId) return;
      
      try {
        const settings = await InspectionDataManager.getSettings(user.dealershipId);
        if (settings) {
          const customSectionsList = settings.sections
            .filter((section: any) => section.isActive)
            .sort((a: any, b: any) => a.order - b.order);
          setCustomSections(customSectionsList);
        }
      } catch (error) {
        console.error('Error loading custom sections:', error);
        setCustomSections([]);
      } finally {
        setSettingsLoaded(true);
      }
    };

    loadCustomSections();
  }, [user?.dealershipId]);

  const loadVehicle = async (vehicleId: string, dealershipId: string) => {
    setIsLoading(true);
    const vehicle = await VehicleManager.getVehicleById(dealershipId, vehicleId);
    if (vehicle) {
      setVehicle(vehicle);
      setEditedNotes(vehicle.notes || '');
      setEditedLocation(vehicle.location);
      // Initialize vehicle info editing state
      setEditedVehicleInfo({
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim || '',
        mileage: vehicle.mileage,
        color: vehicle.color,
        price: vehicle.price,
        location: vehicle.location || '',
        dateAcquired: vehicle.dateAcquired
      });
    } else {
      setVehicle(null);
    }
    setIsLoading(false);
  };

  // Handler for team notes tab click - reloads vehicle data to get latest team notes
  const handleTeamNotesClick = async () => {
    setRightPanelView('team-notes');
    if (id && user?.dealershipId) {
      console.log('🔄 Reloading vehicle data for fresh team notes...');
      await loadVehicle(id, user.dealershipId);
      console.log('✅ Vehicle data reloaded with latest team notes');
    }
  };

  // These functions are no longer needed since we're not using vehicle.status object
  // Status is now calculated from inspection data, not stored in vehicle.status
  const handleStatusUpdate = (section: string, status: InspectionStatus) => {
    console.log('[VehicleDetail] handleStatusUpdate - Status updates now handled by inspection data');
    // This function is deprecated - status is now calculated from inspection data
  };

  const handleSectionComplete = (section: string, userInitials: string) => {
    console.log('[VehicleDetail] handleSectionComplete - Status updates now handled by inspection data');
    // This function is deprecated - status is now calculated from inspection data
    // Record analytics
    if (vehicle) {
      const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
      AnalyticsManager.recordCompletion(
        vehicle.id, 
        vehicleName, 
        section as any, 
        userInitials
      );
    }
  };

  const handleAddTeamNote = (note: Omit<TeamNote, 'id' | 'timestamp'>) => {
    console.log('[VehicleDetail] handleAddTeamNote', note);
    if (!vehicle) return;
    const newNote: TeamNote = {
      ...note,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    const updatedVehicle = {
      ...vehicle,
      teamNotes: [newNote, ...(vehicle.teamNotes || [])]
    };
    saveVehicleUpdate(updatedVehicle);
  };

  const handleSaveNotes = async () => {
    console.log('[VehicleDetail] handleSaveNotes');
    if (!vehicle || !user) return;
    
    const newNotes = editedNotes.trim() || '';
    
    if (!user.dealershipId) return;
    setIsLoading(true);
    
    try {
      // Create team note for issue note addition if notes are being added
      const teamNotesToAdd = newNotes ? [{
        id: (Date.now() + Math.random()).toString(),
        text: `Issue Note added By ${user.firstName} ${user.lastName} - ${newNotes}`,
        userInitials: user.initials,
        timestamp: new Date().toISOString(),
        category: 'general'
      }] : [];

      // Update both vehicle notes and team notes in one operation
      const updatedVehicle = await VehicleManager.updateVehicle(user.dealershipId, vehicle.id, {
        ...vehicle,
        notes: newNotes || undefined,
        teamNotes: [...teamNotesToAdd, ...(vehicle.teamNotes || [])]
      });
      
      if (updatedVehicle) {
        // Update local vehicle state with new notes and team notes
        setVehicle(updatedVehicle);
        console.log('Successfully updated vehicle notes and added team note');
      } else {
        console.error('Error updating vehicle notes');
      }
    } catch (error) {
      console.error('Error updating vehicle notes:', error);
    } finally {
      setIsLoading(false);
      setIsEditingNotes(false);
    }
  };

  const handleCancelEditNotes = () => {
    setEditedNotes(vehicle?.notes || '');
    setIsEditingNotes(false);
  };

  // NEW: Location update handlers
  const handleSaveLocation = async () => {
    console.log('[VehicleDetail] handleSaveLocation');
    if (!vehicle || !user) return;
    const oldLocation = vehicle.location;
    const newLocation = editedLocation.trim();
    
    if (oldLocation === newLocation) {
      setIsEditingLocation(false);
      return;
    }

    // Add team note about location change
    const locationNote: TeamNote = {
      id: Date.now().toString(),
      text: `Vehicle location changed from "${oldLocation}" to "${newLocation}".`,
      userInitials: user.initials,
      timestamp: new Date().toISOString(),
      category: 'general'
    };

    // Update location and team notes in database
    if (!user.dealershipId) return;
    setIsLoading(true);
    
    try {
      const updatedVehicle = await VehicleManager.updateVehicle(user.dealershipId, vehicle.id, {
        ...vehicle,
        location: newLocation,
        locationChangedBy: user.initials,
        locationChangedDate: new Date().toISOString(),
        teamNotes: [locationNote, ...(vehicle.teamNotes || [])]
      });
      
      if (updatedVehicle) {
        // Update local vehicle state with new location and team notes
        setVehicle(updatedVehicle);
        console.log('Successfully updated vehicle location and added team note');
      } else {
        console.error('Error updating vehicle location');
      }
    } catch (error) {
      console.error('Error updating vehicle location:', error);
    } finally {
      setIsLoading(false);
      setIsEditingLocation(false);
    }
  };

  const handleCancelEditLocation = () => {
    setEditedLocation(vehicle?.location || '');
    setIsEditingLocation(false);
  };

  // Vehicle Information editing handlers
  const handleEditVehicleInfo = () => {
    if (!vehicle) return;
    setEditedVehicleInfo({
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim || '',
      mileage: vehicle.mileage,
      color: vehicle.color,
      price: vehicle.price,
      location: vehicle.location || '',
      dateAcquired: vehicle.dateAcquired
    });
    setIsEditingVehicleInfo(true);
  };

  const handleSaveVehicleInfo = () => {
    console.log('[VehicleDetail] handleSaveVehicleInfo');
    if (!vehicle || !user) return;

    // Destructure to exclude inspection data from updates
    const { inspection, ...vehicleWithoutInspection } = vehicle;
    
    const updatedVehicle = {
      ...vehicleWithoutInspection,
      year: editedVehicleInfo.year,
      make: editedVehicleInfo.make.trim(),
      model: editedVehicleInfo.model.trim(),
      trim: editedVehicleInfo.trim.trim() || undefined,
      mileage: editedVehicleInfo.mileage,
      color: editedVehicleInfo.color.trim(),
      price: editedVehicleInfo.price,
      location: editedVehicleInfo.location.trim(),
      dateAcquired: editedVehicleInfo.dateAcquired
    };

    // Add team note about vehicle info change
    const infoNote: TeamNote = {
      id: Date.now().toString(),
      text: `Vehicle information updated by ${user.firstName} ${user.lastName}.`,
      userInitials: user.initials,
      timestamp: new Date().toISOString(),
      category: 'general'
    };

    updatedVehicle.teamNotes = [infoNote, ...(vehicle.teamNotes || [])];

    saveVehicleUpdate(updatedVehicle);
    setIsEditingVehicleInfo(false);
  };

  const handleCancelEditVehicleInfo = () => {
    if (!vehicle) return;
    setEditedVehicleInfo({
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim || '',
      mileage: vehicle.mileage,
      color: vehicle.color,
      price: vehicle.price,
      location: vehicle.location || '',
      dateAcquired: vehicle.dateAcquired
    });
    setIsEditingVehicleInfo(false);
  };

  const handleMarkAsSold = async () => {
    if (!vehicle || !user) return;
    
    // Check if already sold - if so, unmark it
    if (vehicle.status === 'sold') {
      const confirmation = confirm('Are you sure you want to unmark this vehicle as sold?');
      if (!confirmation) return;

      const updatedVehicle = {
        ...vehicle,
        status: null // Clear the status
      };

      // Add team note about status change
      const statusNote: TeamNote = {
        id: Date.now().toString(),
        text: `Vehicle unmarked as sold by ${user.firstName} ${user.lastName}.`,
        userInitials: user.initials,
        timestamp: new Date().toISOString(),
        category: 'general'
      };

      updatedVehicle.teamNotes = [statusNote, ...(vehicle.teamNotes || [])];
      await saveVehicleUpdate(updatedVehicle);
    } else {
      // Mark as sold
      const confirmation = confirm('Are you sure you want to mark this vehicle as sold?');
      if (!confirmation) return;

      const updatedVehicle = {
        ...vehicle,
        status: 'sold' as const
      };

      // Add team note about status change
      const statusNote: TeamNote = {
        id: Date.now().toString(),
        text: `Vehicle marked as sold by ${user.firstName} ${user.lastName}.`,
        userInitials: user.initials,
        timestamp: new Date().toISOString(),
        category: 'general'
      };

      updatedVehicle.teamNotes = [statusNote, ...(vehicle.teamNotes || [])];
      await saveVehicleUpdate(updatedVehicle);
    }
  };

  const handleMarkAsPending = async () => {
    if (!vehicle || !user) return;
    
    // Check if already pending - if so, unmark it
    if (vehicle.status === 'pending') {
      const confirmation = confirm('Are you sure you want to unmark this vehicle as pending?');
      if (!confirmation) return;

      const updatedVehicle = {
        ...vehicle,
        status: null // Clear the status
      };

      // Add team note about status change
      const statusNote: TeamNote = {
        id: Date.now().toString(),
        text: `Vehicle unmarked as pending by ${user.firstName} ${user.lastName}.`,
        userInitials: user.initials,
        timestamp: new Date().toISOString(),
        category: 'general'
      };

      updatedVehicle.teamNotes = [statusNote, ...(vehicle.teamNotes || [])];
      await saveVehicleUpdate(updatedVehicle);
    } else {
      // Mark as pending
      const confirmation = confirm('Are you sure you want to mark this vehicle as pending?');
      if (!confirmation) return;

      const updatedVehicle = {
        ...vehicle,
        status: 'pending' as const
      };

      // Add team note about status change
      const statusNote: TeamNote = {
        id: Date.now().toString(),
        text: `Vehicle marked as pending by ${user.firstName} ${user.lastName}.`,
        userInitials: user.initials,
        timestamp: new Date().toISOString(),
        category: 'general'
      };

      updatedVehicle.teamNotes = [statusNote, ...(vehicle.teamNotes || [])];
      await saveVehicleUpdate(updatedVehicle);
    }
  };

  const saveVehicleUpdate = async (updatedVehicle: Vehicle) => {
    console.log('[VehicleDetail] saveVehicleUpdate', updatedVehicle);
    if (!user || !user.dealershipId) return;
    setIsLoading(true);
    const dealershipId = user.dealershipId;
    const vehicleId = updatedVehicle.id;
    const result = await VehicleManager.updateVehicle(dealershipId, vehicleId, updatedVehicle);
    if (result) {
      setVehicle(result);
    } else {
      console.error('Error updating vehicle');
    }
    setIsLoading(false);
  };

  const handleDeleteVehicle = async () => {
    if (!vehicle || !user || !user.dealershipId) return;
    
    console.log('🔍 Delete vehicle request:', { 
      vehicleId: vehicle.id, 
      dealershipId: user.dealershipId,
      userId: user.id,
      userRole: user.role
    });
    
    try {
      const result = await VehicleManager.deleteVehicle(user.dealershipId, vehicle.id);
      console.log('🗑️ Delete result:', result);
      
      if (result) {
        console.log('✅ Successfully deleted vehicle');
        navigate('/');
      } else {
        console.error('❌ Failed to delete vehicle');
        alert('Failed to delete vehicle. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error deleting vehicle:', error);
      alert('Error deleting vehicle. Please try again.');
    }
  };

  // 🎯 NEW: Mobile scroll to section functionality
  const handleMobileSectionClick = (section: string) => {
    // Set the active filter
    setActiveFilter(activeFilter === section ? null : section);
    
    // Switch to inspection view if not already there
    if (rightPanelView !== 'inspection') {
      setRightPanelView('inspection');
    }
    
    // Scroll to the inspection content area on mobile
    setTimeout(() => {
      const inspectionElement = document.getElementById('mobile-inspection-content');
      if (inspectionElement) {
        inspectionElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100); // Small delay to ensure state updates are processed
  };

  const getOverallProgress = () => {
    if (!vehicle) return 0;
    
    // Use the new detailed progress calculator with dynamic sections
    return ProgressCalculator.calculateDetailedProgress(vehicle.id, vehicle, allSections);
  };

  const getStockNumber = (vin: string): string => {
    return vin.slice(-6);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (!dateStr || isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    // Just show the number, no $ sign
    return price.toLocaleString('en-US', { minimumFractionDigits: 0 });
  };

  // Helper function to truncate long section labels
  const truncateLabel = (label: string, maxLength: number = 15) => {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength).trim() + '...';
  };

  const getSummaryNotes = () => {
    if (!vehicle?.teamNotes) return [];
    return vehicle.teamNotes.filter(note => note.category === 'summary');
  };

  // NEW: Get location style for visual indication
  const getLocationStyle = (location: string | undefined | null) => {
    if (!location) {
      return {
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-200'
      };
    }
    const locationLower = location.toLowerCase();
    
    // Check for RED indicators (Transit/Transport)
    if (locationLower.includes('transit') ||
        locationLower.includes('transport')) {
      return {
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-200'
      };
    }
    
    // Check for YELLOW indicators (Off-site)
    if (locationLower.includes('off-site') || 
        locationLower.includes('storage') || 
        locationLower.includes('external')) {
      return {
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200'
      };
    }
    
    // Default to GREEN (On-site)
    return {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-200'
    };
  };

  // Helper for section status using only allowed InspectionStatus values
  const getSectionStatus = (sectionKey: string, inspectionData: any): InspectionStatus => {
    const items = inspectionData?.[sectionKey] || [];
    if (!Array.isArray(items) || items.length === 0) return 'not-started';
    
    // Get all items for this section from inspection settings
    const sectionSettings = allSections.find((s: any) => s.key === sectionKey);
    if (!sectionSettings) return 'not-started';
    
    const allSectionItems = sectionSettings.items || [];
    
    // Check if ALL items have been inspected (no missing items and no 'not-checked' ratings)
    const inspectedItems = items.filter((item: any) => item.rating && item.rating !== 'not-checked');
    
    // If not all items have been inspected, stay gray
    if (inspectedItems.length < allSectionItems.length) return 'not-started';
    
    // If any inspected item is 'not-checked', return 'not-started' (grey)
    if (items.some((item: any) => item.rating === 'not-checked' || !item.rating)) return 'not-started';
    // Priority logic for fully inspected sections:
    
    // Now check the actual ratings since all items are inspected
    if (items.some((item: any) => item.rating === 'N')) return 'needs-attention';
    if (items.some((item: any) => item.rating === 'F')) return 'pending';
    if (items.every((item: any) => item.rating === 'G')) return 'completed';
    return 'not-started';
  };

  // Add a helper to check if user can delete
  const canDeleteVehicle = user && ['manager', 'admin', 'super-admin'].includes(user.role);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Car className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600 font-medium">Loading vehicle details...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8 text-gray-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Vehicle Not Found</h2>
          <p className="text-gray-600 mb-6">The vehicle you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const summaryNotes = getSummaryNotes();
  
  // Get all sections from inspection settings first
  const allSections = inspectionSettings?.sections
    ?.filter((section: any) => section.isActive)
    ?.sort((a: any, b: any) => a.order - b.order) || [];
  
  // Check if vehicle is ready for sale based on inspection data (all ratings are 'G')
  const isReadyForSale = inspectionData && allSections.length > 0 && (() => {
    const sectionKeys = allSections.map((section: any) => section.key);
    
    // Check each section to ensure it's fully inspected and all items are 'G'
    for (const sectionKey of sectionKeys) {
      const section = allSections.find((s: any) => s.key === sectionKey);
      if (!section || !section.items || section.items.length === 0) {
        continue; // Skip sections with no items
      }
      
      const inspectedItems = inspectionData[sectionKey] || [];
      const sectionItems = section.items.filter((item: any) => item.isActive);
      
      // If this section doesn't have data for all its items, not ready
      if (inspectedItems.length < sectionItems.length) {
        return false;
      }
      
      // Check if ALL items in this section are rated 'G'
      for (const inspectedItem of inspectedItems) {
        if (!inspectedItem.rating || inspectedItem.rating !== 'G') {
          return false;
          }
      }
    }
    
    // Only ready for sale if we actually have sections with items to inspect
    const totalActiveItems = allSections.reduce((count: number, section: any) => {
      return count + (section.items?.filter((item: any) => item.isActive)?.length || 0);
    }, 0);
    
    return totalActiveItems > 0; // Only ready if there are items to inspect and all are 'G'
  })();
  
  const locationStyle = getLocationStyle(vehicle.location);

  // Section status and progress logic
  const sectionKeys = allSections.map((section: any) => section.key);
  const allSectionKeys = [...sectionKeys, ...customSections.map(s => s.key)];
  const sectionStatuses = sectionKeys.reduce((acc: Record<string, InspectionStatus>, key: string) => {
    acc[key] = getSectionStatus(key, inspectionData);
    return acc;
  }, {} as Record<string, InspectionStatus>);

  // Add custom section statuses
  const allSectionStatuses = { ...sectionStatuses };
  customSections.forEach(section => {
    allSectionStatuses[section.key] = getSectionStatus(section.key, inspectionData);
  });

  // Count sections that are 'completed', 'pending', or 'needs-attention' as completed for progress
  const completedSections = allSectionKeys.filter(key => {
    const status = allSectionStatuses[key];
    return status === 'completed' || status === 'pending' || status === 'needs-attention';
  }).length;
  const overallProgress = Math.round((completedSections / allSectionKeys.length) * 100);

  // Guard: show loading state until inspectionData is loaded
  if (inspectionLoading || !settingsLoaded) {
    return <div>Loading inspection data...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                  {vehicle.trim && <span className="text-gray-600 font-normal"> {vehicle.trim}</span>}
                </h1>
                <p className="text-sm text-gray-600">Stock #{getStockNumber(vehicle.vin)}</p>
                
                {/* Mobile Status Badges - Below Stock Number */}
                <div className="flex flex-wrap items-center gap-2 mt-1 lg:hidden">
                  {isEditingLocation ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedLocation}
                        onChange={(e) => setEditedLocation(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs min-w-[120px]"
                        placeholder="Enter location"
                        autoFocus
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveLocation();
                          } else if (e.key === 'Escape') {
                            handleCancelEditLocation();
                          }
                        }}
                      />
                      <button
                        onClick={handleSaveLocation}
                        className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Save location"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                      <button
                        onClick={handleCancelEditLocation}
                        className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingLocation(true)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border transition-all duration-200 ${locationStyle.bgColor} ${locationStyle.textColor} ${locationStyle.borderColor}`}
                      title="Click to edit location"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>{vehicle.location || 'N/A'}</span>
                      <Edit3 className="w-2 h-2 opacity-60" />
                    </button>
                  )}
                  
                  {isReadyForSale && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Ready for Sale
                    </div>
                  )}
                  {vehicle.status === 'pending' && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold border border-purple-200">
                      <Clock className="w-3 h-3" />
                      Pending
                    </div>
                  )}
                  {vehicle.status === 'sold' && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold border border-red-200">
                      <Archive className="w-3 h-3" />
                      Sold
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Desktop Status Badges - Right Side */}
            <div className="hidden lg:flex items-center gap-4">
              {/* Editable Location Status */}
              <div className="flex items-center gap-2">
                {isEditingLocation ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editedLocation}
                      onChange={(e) => setEditedLocation(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-[120px]"
                      placeholder="Enter location"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveLocation();
                        } else if (e.key === 'Escape') {
                          handleCancelEditLocation();
                        }
                      }}
                    />
                    <button
                      onClick={handleSaveLocation}
                      className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Save location"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelEditLocation}
                      className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingLocation(true)}
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200 hover:shadow-md ${locationStyle.bgColor} ${locationStyle.textColor} ${locationStyle.borderColor}`}
                    title="Click to edit location"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>{vehicle.location || 'N/A'}</span>
                    <Edit3 className="w-3 h-3 opacity-60" />
                  </button>
                )}
              </div>

              {isReadyForSale && (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                  Ready for Sale
                </div>
              )}
              {vehicle.status === 'pending' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold border border-purple-200">
                  <Clock className="w-4 h-4" />
                  Pending
                </div>
              )}
              {vehicle.status === 'sold' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold border border-red-200">
                  <Archive className="w-4 h-4" />
                  Sold
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mobile Layout */}
        <div className="lg:hidden space-y-6">
          {/* Mobile Reconditioning Progress */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Reconditioning Progress</h2>
              <span className="text-2xl font-bold text-gray-900">{overallProgress}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  overallProgress === 100 
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                }`}
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>

            {/* Status Buttons in Two Columns - Mobile with Scroll */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {allSections.map((section: any, index: number) => {
                const isLastOdd = allSections.length % 2 === 1 && index === allSections.length - 1;
                return (
                  <button
                    key={section.key}
                    onClick={() => handleMobileSectionClick(section.key)}
                    className={`p-3 rounded-lg border transition-all duration-200 ${isLastOdd ? 'col-span-2' : ''} ${
                      activeFilter === section.key
                        ? 'border-blue-300 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <StatusBadge status={sectionStatuses[section.key]} label={truncateLabel(section.label)} section={section.key} size="sm" />
                  </button>
                );
              })}
            </div>

            {/* Sold/Pending Actions - Mobile */}
            <div className="border-t border-gray-200/60 pt-4 mt-4">
              <div className="flex gap-3">
                <button
                  onClick={() => handleMarkAsSold()}
                  className={`flex-1 p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                    vehicle.status === 'sold'
                      ? 'border-red-300 bg-red-50 shadow-md'
                      : 'border-gray-200 hover:border-red-300 hover:bg-red-50 bg-white'
                  }`}
                >
                  <div className={`flex items-center justify-center gap-2 font-medium text-sm ${
                    vehicle.status === 'sold' ? 'text-red-700' : 'text-red-600'
                  }`}>
                    <Archive className="w-4 h-4" />
                    Mark as Sold
                  </div>
                </button>
                <button
                  onClick={() => handleMarkAsPending()}
                  className={`flex-1 p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                    vehicle.status === 'pending'
                      ? 'border-purple-300 bg-purple-50 shadow-md'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50 bg-white'
                  }`}
                >
                  <div className={`flex items-center justify-center gap-2 font-medium text-sm ${
                    vehicle.status === 'pending' ? 'text-purple-700' : 'text-purple-600'
                  }`}>
                    <Clock className="w-4 h-4" />
                    Mark as Pending
                  </div>
                </button>
              </div>
            </div>

            {/* Vehicle Notes Section - SMALLER HEADER */}
            <div className="border-t border-gray-200/60 pt-4 mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-gray-700 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Vehicle Notes
                </h3>
                {!isEditingNotes && (
                  <div className="flex items-center gap-2">
                    {(!vehicle.notes || vehicle.notes.trim() === '') && (
                      <span
                        className="text-xs text-blue-600 font-medium cursor-pointer hover:underline"
                        onClick={() => setIsEditingNotes(true)}
                      >
                        Add Issue Notes
                      </span>
                    )}
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title={(!vehicle.notes || vehicle.notes.trim() === '') ? 'Add Issue Notes' : 'Edit Notes'}
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              {/* Show placeholder if no notes and not editing */}
              {(!vehicle.notes || vehicle.notes.trim() === '') && !isEditingNotes && (
                <div className="p-3 bg-gray-50/80 backdrop-blur-sm rounded-lg border border-gray-200/60 text-center">
                  <p className="text-xs text-gray-600">No notes added yet</p>
                </div>
              )}
              {/* Show textarea if editing */}
              {isEditingNotes && (
                <div className="space-y-3">
                  <textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    placeholder="Add notes about this vehicle's condition, issues, or important information..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveNotes}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEditNotes}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {/* Show notes if present and not editing */}
              {vehicle.notes && vehicle.notes.trim() !== '' && !isEditingNotes && (
                <div className="p-3 bg-amber-50/80 backdrop-blur-sm rounded-lg border border-amber-200/60">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertTriangle className="w-2 h-2 text-amber-600" />
                    </div>
                    <p className="text-xs text-amber-800 font-medium leading-relaxed">{vehicle.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Right Panel Toggle */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setRightPanelView('inspection')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                  rightPanelView === 'inspection'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                Inspection
              </button>
              <button
                onClick={handleTeamNotesClick}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                  rightPanelView === 'team-notes'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Team Notes
              </button>
            </div>
          </div>

          {/* Mobile Content with ID for scrolling */}
          <div id="mobile-inspection-content">
            {rightPanelView === 'inspection' ? (
              vehicle?.id ? (
                <InspectionChecklist
                  vehicleId={vehicle.id}
                  vehicleName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  vehicle={vehicle}
                  onStatusUpdate={handleStatusUpdate}
                  onSectionComplete={handleSectionComplete}
                  onAddTeamNote={handleAddTeamNote}
                  activeFilter={activeFilter}
                  onGeneratePdf={() => setShowPdfModal(true)}
                  onInspectionDataChange={setInspectionData}
                  onTeamNoteAdded={(note: TeamNote) => {
                    if (!vehicle) return;
                    setVehicle(prev => prev ? { ...prev, teamNotes: [note, ...(prev.teamNotes || [])] } : prev);
                  }}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Vehicle ID not available
                </div>
              )
            ) : (
              <TeamNotes
                notes={vehicle.teamNotes || []}
                onAddNote={handleAddTeamNote}
              />
            )}
          </div>

          {/* Mobile Vehicle Information - At Bottom */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Car className="w-6 h-6" />
                Vehicle Information
              </h2>
              
              {/* Edit/Save/Cancel Buttons */}
              <div className="flex gap-2">
                {!isEditingVehicleInfo ? (
                  <button
                    onClick={handleEditVehicleInfo}
                    className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSaveVehicleInfo}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEditVehicleInfo}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                <p className="text-sm font-mono bg-gray-50 p-2 rounded border">{vehicle.vin}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                {isEditingVehicleInfo ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editedVehicleInfo.year.toString()}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                      setEditedVehicleInfo({...editedVehicleInfo, year: value === '' ? 0 : parseInt(value, 10)});
                    }}
                    placeholder="Enter year"
                    maxLength={4}
                    className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{vehicle.year}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                {isEditingVehicleInfo ? (
                  <input
                    type="text"
                    value={editedVehicleInfo.make}
                    onChange={(e) => setEditedVehicleInfo({...editedVehicleInfo, make: e.target.value})}
                    className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{vehicle.make}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                {isEditingVehicleInfo ? (
                  <input
                    type="text"
                    value={editedVehicleInfo.model}
                    onChange={(e) => setEditedVehicleInfo({...editedVehicleInfo, model: e.target.value})}
                    className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{vehicle.model}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trim</label>
                {isEditingVehicleInfo ? (
                  <input
                    type="text"
                    value={editedVehicleInfo.trim}
                    onChange={(e) => setEditedVehicleInfo({...editedVehicleInfo, trim: e.target.value})}
                    placeholder="N/A"
                    className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{vehicle.trim || 'N/A'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mileage</label>
                {isEditingVehicleInfo ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editedVehicleInfo.mileage === 0 ? '' : editedVehicleInfo.mileage.toString()}
                                          onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                        const numValue = value === '' ? 0 : parseInt(value, 10) || 0;
                        setEditedVehicleInfo({...editedVehicleInfo, mileage: numValue});
                      }}
                    placeholder="Enter mileage"
                    className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-gray-500" />
                    <p className="text-sm text-gray-900">{vehicle.mileage.toLocaleString()}</p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                {isEditingVehicleInfo ? (
                  <input
                    type="text"
                    value={editedVehicleInfo.color}
                    onChange={(e) => setEditedVehicleInfo({...editedVehicleInfo, color: e.target.value})}
                    className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-gray-500" />
                    <p className="text-sm text-gray-900">{vehicle.color}</p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                {isEditingVehicleInfo ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editedVehicleInfo.price === 0 ? '' : editedVehicleInfo.price.toString()}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d.]/g, ''); // Allow digits and decimal point
                      setEditedVehicleInfo({...editedVehicleInfo, price: value === '' ? 0 : parseFloat(value) || 0});
                    }}
                    placeholder="Enter price"
                    className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <p className="text-sm text-gray-900">{formatPrice(vehicle.price)}</p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                {isEditingVehicleInfo ? (
                  <input
                    type="text"
                    value={editedVehicleInfo.location}
                    onChange={(e) => setEditedVehicleInfo({...editedVehicleInfo, location: e.target.value})}
                    placeholder="Enter location"
                    className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <p className="text-sm text-gray-900">{vehicle.location || 'N/A'}</p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Acquired</label>
                {isEditingVehicleInfo ? (
                  <input
                    type="date"
                    value={editedVehicleInfo.dateAcquired}
                    onChange={(e) => setEditedVehicleInfo({...editedVehicleInfo, dateAcquired: e.target.value})}
                    className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <p className="text-sm text-gray-900">{formatDate(vehicle.dateAcquired)}</p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Number</label>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-500" />
                  <p className="text-sm text-gray-900">{getStockNumber(vehicle.vin)}</p>
                </div>
              </div>
            </div>
            
            {canDeleteVehicle && (
              <div className="flex justify-end pt-4 border-t border-gray-200/60">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Vehicle
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex gap-8">
          {/* Left Column - 1/3 width */}
          <div className="w-1/3">
            <div className="space-y-6 lg:sticky lg:top-24">
            {/* Desktop Reconditioning Progress */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Reconditioning Progress</h2>
                <span className="text-2xl font-bold text-gray-900">{overallProgress}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${
                    overallProgress === 100 
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600' 
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                  }`}
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>

              {/* Status Buttons in Two Columns */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {allSections.map((section: any, index: number) => {
                  const isLastOdd = allSections.length % 2 === 1 && index === allSections.length - 1;
                  return (
                    <button
                      key={section.key}
                      onClick={() => setActiveFilter(activeFilter === section.key ? null : section.key)}
                      className={`p-3 rounded-lg border transition-all duration-200 ${isLastOdd ? 'col-span-2' : ''} ${
                        activeFilter === section.key
                          ? 'border-blue-300 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <StatusBadge status={sectionStatuses[section.key]} label={truncateLabel(section.label)} section={section.key} size="sm" />
                    </button>
                  );
                })}
              </div>

              {/* Sold/Pending Actions */}
              <div className="border-t border-gray-200/60 pt-4 mt-4">
                <hr className="border-gray-300 dark:border-gray-600 mb-4" />
                <div className="flex gap-3">
                  <button
                    onClick={() => handleMarkAsSold()}
                    className={`flex-1 p-2 rounded-lg border transition-all duration-200 hover:shadow-md ${
                      vehicle.status === 'sold'
                        ? 'border-red-300 bg-red-50 shadow-md'
                        : 'border-gray-200 hover:border-red-300 hover:bg-red-50 bg-white'
                    }`}
                  >
                    <div className={`flex items-center justify-center gap-2 font-medium text-sm ${
                      vehicle.status === 'sold' ? 'text-red-700' : 'text-red-600'
                    }`}>
                      <Archive className="w-3 h-3" />
                      Mark as Sold
                    </div>
                  </button>
                  <button
                    onClick={() => handleMarkAsPending()}
                    className={`flex-1 p-2 rounded-lg border transition-all duration-200 hover:shadow-md ${
                      vehicle.status === 'pending'
                        ? 'border-purple-300 bg-purple-50 shadow-md'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50 bg-white'
                    }`}
                  >
                    <div className={`flex items-center justify-center gap-2 font-medium text-sm ${
                      vehicle.status === 'pending' ? 'text-purple-700' : 'text-purple-600'
                    }`}>
                      <Clock className="w-3 h-3" />
                      Mark as Pending
                    </div>
                  </button>
                </div>
              </div>

              {/* Vehicle Notes Section - SMALLER HEADER */}
              <div className="border-t border-gray-200/60 pt-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Vehicle Notes
                  </h3>
                  {!isEditingNotes && (
                    <div className="flex items-center gap-2">
                      {(!vehicle.notes || vehicle.notes.trim() === '') && (
                        <span
                          className="text-xs text-blue-600 font-medium cursor-pointer hover:underline"
                          onClick={() => setIsEditingNotes(true)}
                        >
                          Add Issue Notes
                        </span>
                      )}
                      <button
                        onClick={() => setIsEditingNotes(true)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={(!vehicle.notes || vehicle.notes.trim() === '') ? 'Add Issue Notes' : 'Edit Notes'}
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                {/* Show placeholder if no notes and not editing */}
                {(!vehicle.notes || vehicle.notes.trim() === '') && !isEditingNotes && (
                  <div className="p-3 bg-gray-50/80 backdrop-blur-sm rounded-lg border border-gray-200/60 text-center">
                    <p className="text-xs text-gray-600">No notes added yet</p>
                  </div>
                )}
                {/* Show textarea if editing */}
                {isEditingNotes && (
                  <div className="space-y-3">
                    <textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      placeholder="Add notes about this vehicle's condition, issues, or important information..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveNotes}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEditNotes}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {/* Show notes if present and not editing */}
                {vehicle.notes && vehicle.notes.trim() !== '' && !isEditingNotes && (
                  <div className="p-3 bg-amber-50/80 backdrop-blur-sm rounded-lg border border-amber-200/60">
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle className="w-2 h-2 text-amber-600" />
                      </div>
                      <p className="text-xs text-amber-800 font-medium leading-relaxed">{vehicle.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Vehicle Information */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 relative">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Car className="w-6 h-6" />
                  Vehicle Information
                </h2>
                
                {/* Edit/Save/Cancel Buttons */}
                <div className="flex gap-2">
                  {!isEditingVehicleInfo ? (
                    <button
                      onClick={handleEditVehicleInfo}
                      className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveVehicleInfo}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEditVehicleInfo}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-4 pb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded border">{vehicle.vin}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    {isEditingVehicleInfo ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={editedVehicleInfo.year.toString()}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                          setEditedVehicleInfo({...editedVehicleInfo, year: value === '' ? 0 : parseInt(value, 10)});
                        }}
                        placeholder="Enter year"
                        maxLength={4}
                        className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{vehicle.year}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                    {isEditingVehicleInfo ? (
                      <input
                        type="text"
                        value={editedVehicleInfo.make}
                        onChange={(e) => setEditedVehicleInfo({...editedVehicleInfo, make: e.target.value})}
                        className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{vehicle.make}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    {isEditingVehicleInfo ? (
                      <input
                        type="text"
                        value={editedVehicleInfo.model}
                        onChange={(e) => setEditedVehicleInfo({...editedVehicleInfo, model: e.target.value})}
                        className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{vehicle.model}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trim</label>
                    {isEditingVehicleInfo ? (
                      <input
                        type="text"
                        value={editedVehicleInfo.trim}
                        onChange={(e) => setEditedVehicleInfo({...editedVehicleInfo, trim: e.target.value})}
                        placeholder="N/A"
                        className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{vehicle.trim || 'N/A'}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mileage</label>
                  {isEditingVehicleInfo ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={editedVehicleInfo.mileage === 0 ? '' : editedVehicleInfo.mileage.toString()}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                        setEditedVehicleInfo({...editedVehicleInfo, mileage: value === '' ? 0 : parseInt(value)});
                      }}
                      placeholder="Enter mileage"
                      className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-gray-500" />
                      <p className="text-sm text-gray-900">{vehicle.mileage.toLocaleString()}</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  {isEditingVehicleInfo ? (
                    <input
                      type="text"
                      value={editedVehicleInfo.color}
                      onChange={(e) => setEditedVehicleInfo({...editedVehicleInfo, color: e.target.value})}
                      className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-gray-500" />
                      <p className="text-sm text-gray-900">{vehicle.color}</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  {isEditingVehicleInfo ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editedVehicleInfo.price === 0 ? '' : editedVehicleInfo.price.toString()}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d.]/g, ''); // Allow digits and decimal point
                        setEditedVehicleInfo({...editedVehicleInfo, price: value === '' ? 0 : parseFloat(value) || 0});
                      }}
                      placeholder="Enter price"
                      className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <p className="text-sm text-gray-900">{formatPrice(vehicle.price)}</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  {isEditingVehicleInfo ? (
                    <input
                      type="text"
                      value={editedVehicleInfo.location}
                      onChange={(e) => setEditedVehicleInfo({...editedVehicleInfo, location: e.target.value})}
                      placeholder="Enter location"
                      className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <p className="text-sm text-gray-900">{vehicle.location || 'N/A'}</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Acquired</label>
                  {isEditingVehicleInfo ? (
                    <input
                      type="date"
                      value={editedVehicleInfo.dateAcquired}
                      onChange={(e) => setEditedVehicleInfo({...editedVehicleInfo, dateAcquired: e.target.value})}
                      className="w-full text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <p className="text-sm text-gray-900">{formatDate(vehicle.dateAcquired)}</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Number</label>
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-gray-500" />
                    <p className="text-sm text-gray-900">{getStockNumber(vehicle.vin)}</p>
                  </div>
                </div>
              </div>
              
              {canDeleteVehicle && (
                <div className="flex justify-end pt-4 border-t border-gray-200/60">
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Vehicle
                  </button>
                </div>
              )}
            </div>
            </div>
          </div>

          {/* Right Column - 2/3 width */}
          <div className="flex-1 space-y-6">
            {/* Desktop Toggle */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setRightPanelView('inspection')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                    rightPanelView === 'inspection'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  Mechanical Inspection
                </button>
                <button
                  onClick={handleTeamNotesClick}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                    rightPanelView === 'team-notes'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Team Notes
                </button>
              </div>
            </div>

            {/* Desktop Content */}
            {rightPanelView === 'inspection' ? (
              vehicle?.id ? (
                <InspectionChecklist
                  vehicleId={vehicle.id}
                  vehicleName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  vehicle={vehicle}
                  onStatusUpdate={handleStatusUpdate}
                  onSectionComplete={handleSectionComplete}
                  onAddTeamNote={handleAddTeamNote}
                  activeFilter={activeFilter}
                  onGeneratePdf={() => setShowPdfModal(true)}
                  onInspectionDataChange={setInspectionData}
                  onTeamNoteAdded={(note: TeamNote) => {
                    if (!vehicle) return;
                    setVehicle(prev => prev ? { ...prev, teamNotes: [note, ...(prev.teamNotes || [])] } : prev);
                  }}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Vehicle ID not available
                </div>
              )
            ) : (
              <TeamNotes
                notes={vehicle.teamNotes || []}
                onAddNote={handleAddTeamNote}
              />
            )}
          </div>
        </div>
      </div>

      {/* Customer Inspection PDF Modal */}
      <CustomerInspectionPDF
        vehicle={vehicle}
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl max-w-md w-full border border-white/20">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delete Vehicle</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Do you really want to delete this vehicle?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    handleDeleteVehicle();
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Confirm Deletion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleDetail;