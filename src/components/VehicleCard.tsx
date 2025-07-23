import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Vehicle, getStockNumber, InspectionStatus } from '../types/vehicle';
import StatusBadge from './StatusBadge';
import { MapPin, Gauge, Clock, FileText, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { InspectionDataManager } from '../utils/inspectionDataManager';
import { ProgressCalculator } from '../utils/progressCalculator';
import { InspectionSection } from '../types/inspectionSettings';

interface VehicleCardProps {
  vehicle: Vehicle;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle }) => {
  const { dealership, user } = useAuth();
  const [allSections, setAllSections] = useState<InspectionSection[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [inspectionData, setInspectionData] = useState<any>(null);
  const [inspectionLoaded, setInspectionLoaded] = useState(false);
  
  // Load all sections asynchronously
  useEffect(() => {
    const loadAllSections = async () => {
      if (!dealership) {
        setAllSections([]);
        setIsLoadingSettings(false);
        return;
      }

      try {
        const settings = await InspectionDataManager.getSettings(dealership.id);
        if (settings) {
          const sections = settings.sections
            .filter(section => section.isActive)
            .sort((a, b) => a.order - b.order);
          setAllSections(sections);
        } else {
          setAllSections([]);
        }
      } catch (error) {
        console.error('Error loading sections:', error);
        setAllSections([]);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadAllSections();
  }, [dealership]);

  // Load inspection data for this vehicle
  useEffect(() => {
    let cancelled = false;
    if (!vehicle || !user) return;
    setInspectionLoaded(false);
    InspectionDataManager.loadInspectionData(vehicle.id, user.id)
      .then(data => {
        if (!cancelled) {
          setInspectionData(data || {});
          setInspectionLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInspectionData({});
          setInspectionLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, [vehicle?.id, user?.id]);

  // Section status and progress logic - now dynamic based on inspection settings
  const getSectionStatus = (sectionKey: string, inspectionData: any): InspectionStatus => {
    const items = inspectionData?.[sectionKey] || [];
    if (!Array.isArray(items) || items.length === 0) return 'not-started';
    
    // Get all items for this section from inspection settings
    const sectionSettings = allSections.find(s => s.key === sectionKey);
    if (!sectionSettings) return 'not-started';
    
    const allSectionItems = sectionSettings.items || [];
    
    // Check if ALL items have been inspected (no missing items and no 'not-checked' ratings)
    const inspectedItems = items.filter((item: any) => item.rating && item.rating !== 'not-checked');
    
    // If not all items have been inspected, stay gray
    if (inspectedItems.length < allSectionItems.length) return 'not-started';
    
    // If any inspected item is 'not-checked', return 'not-started' (grey)
    if (items.some((item: any) => item.rating === 'not-checked' || !item.rating)) return 'not-started';
    
    // Now check the actual ratings since all items are inspected
    if (items.some((item: any) => item.rating === 'N')) return 'needs-attention';
    if (items.some((item: any) => item.rating === 'F')) return 'pending';
    if (items.every((item: any) => item.rating === 'G')) return 'completed';
    return 'not-started';
  };

  // Use dynamic sections for status calculation (only when sections are loaded)
  const sectionKeys = allSections.map(section => section.key);
  const sectionStatuses: Record<string, InspectionStatus> = sectionKeys.reduce((acc: Record<string, InspectionStatus>, key: string) => {
    acc[key] = getSectionStatus(key, inspectionData);
    return acc;
  }, {} as Record<string, InspectionStatus>);
  
  // Count sections that are 'completed', 'pending', or 'needs-attention' as completed for progress
  const completedSections = sectionKeys.filter(key => {
    const status = sectionStatuses[key];
    return status === 'completed' || status === 'pending' || status === 'needs-attention';
  }).length;
  
  // Only show progress when both inspection data and sections are loaded
  const overallProgress = Math.round(
    (inspectionLoaded && !isLoadingSettings && sectionKeys.length > 0) 
      ? (completedSections / sectionKeys.length) * 100 
      : 0
  );

  const getDaysInInventory = () => {
    const acquiredDate = new Date(vehicle.dateAcquired);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - acquiredDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Enhanced location type detection and color coding
  const getLocationStyle = (location: string) => {
    const locationLower = (location || '').toLowerCase();
    
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
    
    // Check for GREEN indicators (On-site) - DEFAULT
    if (locationLower.includes('lot') || 
        locationLower.includes('indoor') || 
        locationLower.includes('showroom') || 
        locationLower.includes('service') ||
        locationLower.includes('display') ||
        locationLower.includes('demo')) {
      return {
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-200'
      };
    }
    
    // Default to on-site (green) for most locations
    return {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-200'
    };
  };

  // 🎯 NEW: Get truncated notes for display
  const getTruncatedNotes = (text: string, maxLength: number = 60) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Helper function to categorize a vehicle based on inspection status
  const categorizeVehicle = (vehicle: Vehicle) => {
    // First check vehicle.status - if sold or pending, don't categorize by inspection
    if (vehicle.status === 'sold' || vehicle.status === 'pending') {
      console.log(`Vehicle ${vehicle.id} skipped categorization - status is ${vehicle.status}`);
      return null; // Don't count in Ready/Working/Issues
    }

    // Check if any section is incomplete (has gray status) - if so, mark as working
    if (sectionKeys.some(sectionKey => getSectionStatus(sectionKey, inspectionData) === 'not-started')) return 'pending';
    
    // Use the same dynamic sectionKeys as the rest of the component
    const allRatings: string[] = [];
    
    for (const sectionKey of sectionKeys) {
      const items = inspectionData[sectionKey] || [];
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          if (item.rating) {
            allRatings.push(item.rating);
          }
        });
      }
    }
     
    console.log(`Vehicle ${vehicle.id} (${vehicle.year} ${vehicle.make} ${vehicle.model}):`, {
      allRatings,
      inspectionData,
      vehicleStatus: vehicle.status
    });

    // If no ratings at all, it's pending/working (not started)
    if (allRatings.length === 0) {
      console.log(`Vehicle ${vehicle.id} categorized as: pending (no ratings)`);
      return 'pending';
    }
    
    // If ANY rating is 'not-checked', it's pending/working (not fully inspected)
    if (allRatings.some(rating => rating === 'not-checked')) {
      console.log(`Vehicle ${vehicle.id} categorized as: pending (has not-checked items)`);
      return 'pending';
    }
    
    // Priority logic:
    // 1. If ANY rating is 'N' (needs attention), it's needs-attention
    if (allRatings.some(rating => rating === 'N')) {
      console.log(`Vehicle ${vehicle.id} categorized as: needs-attention`);
      return 'needs-attention';
    }
     
    // 2. If ALL ratings are 'G' (great), it's completed
    if (allRatings.every(rating => rating === 'G')) {
      console.log(`Vehicle ${vehicle.id} categorized as: completed`);
      return 'completed';
    }
     
    // 3. If has 'F' ratings, it's pending/working
    if (allRatings.some(rating => rating === 'F')) {
      console.log(`Vehicle ${vehicle.id} categorized as: pending (has F or not-checked)`);
      return 'pending';
    }
     
    // 4. Default to active
    console.log(`Vehicle ${vehicle.id} categorized as: active (default)`);
    return 'active';
  };

  const stockNumber = getStockNumber(vehicle.vin);
  const daysInInventory = getDaysInInventory();
  
  // Check if vehicle is ready for sale based on inspection data (all ratings are 'G')
  const isReadyForSale = inspectionLoaded && inspectionData && allSections.length > 0 && (() => {
    const sectionKeys = allSections.map(section => section.key);
    
    // Check each section to ensure it's fully inspected and all items are 'G'
    for (const sectionKey of sectionKeys) {
      const section = allSections.find(s => s.key === sectionKey);
      if (!section || !section.items || section.items.length === 0) {
        continue; // Skip sections with no items
      }
      
      const inspectedItems = inspectionData[sectionKey] || [];
      const sectionItems = section.items.filter(item => item.isActive);
      
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
    const totalActiveItems = allSections.reduce((count, section) => {
      return count + (section.items?.filter(item => item.isActive)?.length || 0);
    }, 0);
    
    return totalActiveItems > 0; // Only ready if there are items to inspect and all are 'G'
  })();
  
  const locationStyle = getLocationStyle(vehicle.location);
  const truncatedNotes = getTruncatedNotes(vehicle.notes || '');

  return (
    <Link 
      to={`/vehicle/${vehicle.id}`}
      className="block bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/90 dark:hover:bg-gray-900 transition-all duration-300 hover:scale-[1.02] group"
    >
      <div className="p-6">
        {/* Header Section - Vehicle Title */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
          </div>
          
          {/* Subtitle with Trim and Color */}
          <div className="text-base text-gray-600 dark:text-gray-300 font-medium mb-3">
            {vehicle.trim && (
              <span>{vehicle.trim} - </span>
            )}
            <span>{vehicle.color}</span>
          </div>
          
          {/* Clean Info Row: Stock # - Mileage - Days */}
          <div className="flex items-center gap-6 text-sm mb-3">
            <div>
              <span className="font-bold text-black dark:text-gray-200">{stockNumber}</span>
            </div>
            <div className="flex items-center gap-1">
              <Gauge className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">{vehicle.mileage.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">{daysInInventory} day{daysInInventory !== 1 ? 's' : ''}</span>
            </div>
          </div>
          
          {/* Status Badge + Location Row */}
          <div className="flex items-center gap-3">
            {/* Status Badge - LEFT (Priority: Sold > Pending > Ready for Sale) */}
            {vehicle.status === 'sold' ? (
              <div className="flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-full text-sm font-semibold border border-red-200 dark:border-red-800 flex-shrink-0">
                <span className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full"></span>
                Sold
              </div>
            ) : vehicle.status === 'pending' ? (
              <div className="flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 rounded-full text-sm font-semibold border border-purple-200 dark:border-purple-800 flex-shrink-0">
                <span className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full"></span>
                Pending
              </div>
            ) : isReadyForSale ? (
              <div className="flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 rounded-full text-sm font-semibold border border-emerald-200 dark:border-emerald-800 flex-shrink-0">
                <span className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full"></span>
                Ready for Sale
              </div>
            ) : null}
            
            {/* Location Box - RIGHT */}
            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium border ${locationStyle.bgColor} ${locationStyle.textColor} ${locationStyle.borderColor} dark:bg-gray-800/60 dark:text-gray-200 dark:border-gray-700`}> 
              <MapPin className="w-4 h-4" />
              <span>{vehicle.location}</span>
            </div>
          </div>
        </div>

        {/* 🎯 NEW: Vehicle Notes Section - Shows first 60 characters */}
        {truncatedNotes && (
          <div className="mb-5 p-3 bg-amber-50/80 dark:bg-amber-900/60 backdrop-blur-sm rounded-lg border border-amber-200/60 dark:border-amber-800/60">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-300" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-3 h-3 text-amber-600 dark:text-amber-300" />
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wide">Issues</span>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-100 font-medium leading-relaxed">
                  {truncatedNotes}
                  {vehicle.notes && vehicle.notes.length > 60 && (
                    <span className="text-amber-600 dark:text-amber-200 font-semibold ml-1">Click to read more</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Section */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Reconditioning Progress</span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{overallProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4 shadow-inner">
            <div 
              className={`h-3 rounded-full transition-all duration-500 shadow-sm ${
                overallProgress === 100 
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 dark:from-emerald-400 dark:to-green-700' 
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-700'
              }`}
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
          
          {/* Status Badges - Now Dynamic from Inspection Settings */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {/* Show only sections from inspection settings - no hardcoding */}
              {!isLoadingSettings && allSections.map(section => {
                const sectionStatus = getSectionStatus(section.key, inspectionData);
                return (
                  <StatusBadge 
                    key={section.key} 
                    status={sectionStatus} 
                    label={section.label} 
                    section={section.key as any} 
                    size="sm" 
                  />
                );
              })}
              
              {/* Loading placeholder */}
              {isLoadingSettings && (
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-6 w-18 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hover Effect Indicator */}
        <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <p className="text-center text-sm text-blue-600 dark:text-blue-300 font-medium">Click to view details →</p>
        </div>
      </div>
    </Link>
  );
};

export default VehicleCard;