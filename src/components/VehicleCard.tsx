import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Vehicle, getStockNumber, InspectionStatus } from '../types/vehicle';
import StatusBadge from './StatusBadge';
import { MapPin, Gauge, Clock, FileText, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { InspectionSettingsManager } from '../utils/inspectionSettingsManager';
import { ProgressCalculator } from '../utils/progressCalculator';
import { InspectionSection } from '../types/inspectionSettings';
import { InspectionDataManager } from '../utils/inspectionDataManager';

interface VehicleCardProps {
  vehicle: Vehicle;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle }) => {
  const { dealership, user } = useAuth();
  const [customSections, setCustomSections] = useState<InspectionSection[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [inspectionData, setInspectionData] = useState<any>(null);
  const [inspectionLoaded, setInspectionLoaded] = useState(false);
  
  // Load custom sections asynchronously
  useEffect(() => {
    const loadCustomSections = async () => {
      if (!dealership) {
        setCustomSections([]);
        setIsLoadingSettings(false);
        return;
      }

      try {
        const settings = await InspectionSettingsManager.getSettings(dealership.id);
        if (settings) {
          const sections = settings.sections
            .filter(section => section.isActive && section.key !== 'emissions' && section.key !== 'cosmetic' && 
                    section.key !== 'mechanical' && section.key !== 'cleaning' && section.key !== 'photos')
            .sort((a, b) => a.order - b.order);
          setCustomSections(sections);
        } else {
          setCustomSections([]);
        }
      } catch (error) {
        console.error('Error loading custom sections:', error);
        setCustomSections([]);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadCustomSections();
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

  // Section status and progress logic (copied from VehicleDetail)
  const sectionKeys = ['emissions', 'cosmetic', 'mechanical', 'cleaning', 'photos'];
  const getSectionStatus = (sectionKey: string, inspectionData: any): InspectionStatus => {
    const items = inspectionData?.[sectionKey] || [];
    if (!Array.isArray(items) || items.length === 0) return 'not-started';
    // If any item is 'not-checked', return 'not-started' (grey)
    if (items.some((item: any) => item.rating === 'not-checked')) return 'not-started';
    if (items.some((item: any) => item.rating === 'N')) return 'needs-attention';
    if (items.some((item: any) => item.rating === 'F')) return 'pending';
    if (items.every((item: any) => item.rating === 'G')) return 'completed';
    return 'not-started';
  };
  const sectionStatuses: Record<string, InspectionStatus> = sectionKeys.reduce((acc, key) => {
    acc[key] = getSectionStatus(key, inspectionData);
    return acc;
  }, {} as Record<string, InspectionStatus>);
  // Count sections that are 'completed', 'pending', or 'needs-attention' as completed for progress
  const completedSections = sectionKeys.filter(key => {
    const status = sectionStatuses[key];
    return status === 'completed' || status === 'pending' || status === 'needs-attention';
  }).length;
  const overallProgress = Math.round((completedSections / sectionKeys.length) * 100);

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

  const stockNumber = getStockNumber(vehicle.vin);
  const daysInInventory = getDaysInInventory();
  
  // Check if vehicle is ready for sale based on inspection data (all ratings are 'G')
  const isReadyForSale = inspectionLoaded && inspectionData && (() => {
    const sectionKeys = ['emissions', 'cosmetic', 'mechanical', 'cleaning', 'photos'];
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
    
    // Ready for sale: ALL ratings are 'G' and we have at least some ratings
    return allRatings.length > 0 && allRatings.every(rating => rating === 'G');
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
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{inspectionLoaded ? overallProgress : 0}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4 shadow-inner">
            <div 
              className={`h-3 rounded-full transition-all duration-500 shadow-sm ${
                inspectionLoaded && overallProgress === 100 
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 dark:from-emerald-400 dark:to-green-700' 
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-700'
              }`}
              style={{ width: `${inspectionLoaded ? overallProgress : 0}%` }}
            ></div>
          </div>
          
          {/* Status Badges - Now Read-Only */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={sectionStatuses['emissions']} label="Emissions" section="emissions" size="sm" />
              <StatusBadge status={sectionStatuses['cosmetic']} label="Cosmetic" section="cosmetic" size="sm" />
              <StatusBadge status={sectionStatuses['mechanical']} label="Mechanical" section="mechanical" size="sm" />
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={sectionStatuses['cleaning']} label="Cleaning" section="cleaning" size="sm" />
              <StatusBadge status={sectionStatuses['photos']} label="Photos" section="photos" size="sm" />
              
              {/* Custom sections from settings - using inspection data */}
              {customSections.map(section => {
                // Get status from inspection data for custom sections
                const customSectionStatus = getSectionStatus(section.key, inspectionData);
                return (
                  <StatusBadge 
                    key={section.key} 
                    status={customSectionStatus} 
                    label={section.label} 
                    section={section.key as any} 
                    size="sm" 
                  />
                );
              })}
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