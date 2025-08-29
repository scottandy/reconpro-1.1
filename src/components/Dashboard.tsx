import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Vehicle } from '../types/vehicle';
import { DatabaseService } from '../utils/database';
import { 
  Car,
  Users,
  MapPin,
  Phone,
  CheckSquare, 
  Settings, 
  BarChart3, 
  Plus,
  Search,
  Filter,
  LogOut,
  Menu,
  X,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Circle,
  DollarSign,
  Hash,
  Calendar,
  Gauge,
  Palette,
  Building2,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Archive,
  RotateCcw,
  Target,
  Activity,
  ClipboardList
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { VehicleManager } from '../utils/vehicleManager';
import { InspectionDataManager } from '../utils/inspectionDataManager';
import VehicleCard from './VehicleCard';
import AddVehicleModal from './AddVehicleModal';
import Analytics from './Analytics';
import UserManagement from './UserManagement';
import LocationManagement from './LocationManagement';
import LocationSettings from './LocationSettings';
import ThemeSettings from './ThemeSettings';
import ContactManagement from './ContactManagement';
import TodoCalendar from './TodoCalendar';
import InspectionSettings from './InspectionSettings';
import { ProgressCalculator } from '../utils/progressCalculator';
import { InspectionSection } from '../types/inspectionSettings';
import { Menu as HeadlessMenu } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

type DashboardView = 'inventory' | 'analytics' | 'users' | 'locations' | 'contacts' | 'todos' | 'settings' | 'inspection-settings';
type VehicleFilter = 'all' | 'active' | 'completed' | 'pending' | 'needs-attention' | 'sold' | 'vehicle-pending';
type LocationFilter = 'all' | 'on-site' | 'off-site' | 'in-transit' | string; // string allows for specific location names

const Dashboard: React.FC = () => {
  const { user, dealership, logout } = useAuth();
  // Theme context available if needed
  useTheme();
  const [activeView, setActiveView] = useState<DashboardView>('inventory');
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter[]>(['active', 'needs-attention']);
  const [locationFilter, setLocationFilter] = useState<LocationFilter[]>(['all']);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Vehicle state management
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [soldVehicles, setSoldVehicles] = useState<Vehicle[]>([]);
  const [pendingVehicles, setPendingVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vehicleInspectionData, setVehicleInspectionData] = useState<Record<string, any>>({});
  const [inspectionDataLoaded, setInspectionDataLoaded] = useState(false);

  // NEW: Dynamic sections state
  const [allSections, setAllSections] = useState<InspectionSection[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // NEW: Locations state
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);

  // NEW: Selected section for progress overview
  const [selectedSection, setSelectedSection] = useState<string | undefined>(undefined);

  // NEW: Portal dropdown state
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);

  // NEW: Section-based filter state
  const [sectionFilter, setSectionFilter] = useState<{section: string | null, status: string | null}>({
    section: null,
    status: null
  });

  // Calculate dropdown position when opening
  const handleDropdownToggle = () => {
    if (!showSectionDropdown && dropdownButtonRef.current) {
      const rect = dropdownButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 2, // Add small gap
        left: rect.left,
        width: rect.width
      });
    }
    setShowSectionDropdown(!showSectionDropdown);
  };

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
          
          // Initialize selectedSection with the first available section
          if (sections.length > 0) {
            // Check if "emissions" exists, if so use it as default, otherwise use first section
            const emissionsSection = sections.find(section => section.key === 'emissions');
            setSelectedSection(emissionsSection ? 'emissions' : sections[0].key);
          }
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

  // NEW: Load locations from the locations table
  useEffect(() => {
    const loadLocations = async () => {
      if (!dealership) {
        setLocations([]);
        setIsLoadingLocations(false);
        return;
      }

      try {
        // Get formal locations from database
        const { data: formalLocations, error } = await supabase
          .from('locations')
          .select('*')
          .eq('dealership_id', dealership.id)
          .order('name', { ascending: true });

        if (error) {
          console.error('Error loading formal locations:', error);
          setLocations([]);
        } else {
          // Create virtual locations based on actual vehicle locations
          const vehicleLocationNames = new Set<string>();
          
          // Get unique location names from all vehicles (active, sold, pending)
          [...vehicles, ...soldVehicles, ...pendingVehicles].forEach(vehicle => {
            if (vehicle.location && vehicle.location.trim()) {
              vehicleLocationNames.add(vehicle.location.trim());
            }
          });

          // Create virtual locations for vehicle locations that don't exist in formal locations
          const virtualLocations = Array.from(vehicleLocationNames)
            .filter(locationName => !formalLocations.some((loc: any) => loc.name === locationName))
            .map(locationName => {
              // Determine the proper type for virtual locations
              let locationType = 'on-site'; // Default type
              
              const locationLower = locationName.toLowerCase();
              if (locationLower.includes('transit') || locationLower.includes('transport')) {
                locationType = 'in-transit';
              } else if (locationLower.includes('off-site') || 
                         locationLower.includes('storage') || 
                         locationLower.includes('external')) {
                locationType = 'off-site';
              }
              
              return {
                id: `virtual-${locationName}`,
                name: locationName,
                type: locationType,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
            });

          // Combine formal and virtual locations
          const allLocations = [...(formalLocations || []), ...virtualLocations];
          setLocations(allLocations);
        }
      } catch (error) {
        console.error('Error loading locations:', error);
        setLocations([]);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    // Only load locations after vehicles are loaded
    if (vehicles.length > 0 || soldVehicles.length > 0 || pendingVehicles.length > 0) {
      loadLocations();
    }
  }, [dealership, vehicles, soldVehicles, pendingVehicles]);

  // Load all vehicles on component mount
  useEffect(() => {
    if (dealership) {
      loadAllVehicles();
    }
  }, [dealership]);

  // Load inspection data for all vehicles
  useEffect(() => {
    if (vehicles.length > 0 && user) {
      loadInspectionDataForVehicles();
    }
  }, [vehicles, user]);

  const loadInspectionDataForVehicles = async () => {
    if (!user) return;
    
    setInspectionDataLoaded(false);
    const inspectionDataMap: Record<string, any> = {};
    
    // Load inspection data for each vehicle
    for (const vehicle of vehicles) {
      try {
        const data = await InspectionDataManager.loadInspectionData(vehicle.id, user.id);
        inspectionDataMap[vehicle.id] = data || {};
        console.log(`Inspection data for vehicle ${vehicle.id}:`, data);
      } catch (error) {
        console.error(`Error loading inspection data for vehicle ${vehicle.id}:`, error);
        inspectionDataMap[vehicle.id] = {};
      }
    }
    
    setVehicleInspectionData(inspectionDataMap);
    setInspectionDataLoaded(true);
  };

  const loadAllVehicles = async () => {
    if (!dealership) return;
    
    try {
      // Load all vehicles using VehicleManager
      const allVehicles = await VehicleManager.getVehicles(dealership.id);
      
      // Separate active, sold, and pending vehicles using vehicle.status
      const activeVehicles = allVehicles.filter((v: Vehicle) => v.status !== 'sold' && v.status !== 'pending');
      const soldVehiclesList = allVehicles.filter((v: Vehicle) => v.status === 'sold');
      const pendingVehiclesList = allVehicles.filter((v: Vehicle) => v.status === 'pending');
      
      setVehicles(activeVehicles);
      setSoldVehicles(soldVehiclesList);
      setPendingVehicles(pendingVehiclesList);
    } catch (error) {
      console.error('Error loading vehicles from Supabase:', error);
      setVehicles([]);
      setSoldVehicles([]);
      setPendingVehicles([]);
    }
    
    setIsLoading(false);
  };

  const handleAddVehicle = async (vehicleData: Omit<Vehicle, 'id'>) => {
    if (!dealership || !user) return;

    console.log('Dashboard received vehicle data:', vehicleData);
    console.log('Dealership ID:', dealership.id);

    try {
      const newVehicle = await VehicleManager.addVehicle(dealership.id, vehicleData);
      if (newVehicle) {
        console.log('Successfully added vehicle:', newVehicle);
        
        // Add team note for vehicle creation
        const creationNote = {
          id: (Date.now() + Math.random()).toString(),
          text: `Vehicle Created By ${user.firstName} ${user.lastName} - ${new Date().toLocaleDateString()}`,
          userInitials: user.initials,
          timestamp: new Date().toISOString(),
          category: 'general'
        };

        // Add the team note to the vehicle
        const updatedVehicle = await VehicleManager.updateVehicle(dealership.id, newVehicle.id, {
          ...newVehicle,
          teamNotes: [creationNote, ...(newVehicle.teamNotes || [])]
        });

        if (updatedVehicle) {
          console.log('Successfully added team note for vehicle creation');
        }
        
        // Reload all vehicles to get the updated list
        await loadAllVehicles();
        setShowAddVehicle(false);
      } else {
        console.error('Failed to add vehicle to database - VehicleManager returned null');
        alert('Failed to add vehicle. Please try again.');
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert('Error adding vehicle. Please try again.');
    }
  };

  const handleReactivateVehicle = async (vehicleId: string, fromType: 'sold' | 'pending') => {
    const userInitials = prompt('Enter your initials to reactivate this vehicle:');
    if (!userInitials?.trim()) return;

    let vehicleToReactivate: Vehicle | undefined;
    
    if (fromType === 'sold') {
      vehicleToReactivate = soldVehicles.find(v => v.id === vehicleId);
    } else {
      vehicleToReactivate = pendingVehicles.find(v => v.id === vehicleId);
    }

    if (!vehicleToReactivate) return;

    try {
      const updatedVehicle = await DatabaseService.updateVehicle(vehicleId, {
        isSold: false,
        isPending: false,
        reactivatedBy: userInitials.trim().toUpperCase(),
        reactivatedDate: new Date().toISOString(),
        reactivatedFrom: fromType,
        teamNotes: [
          ...(vehicleToReactivate.teamNotes || []),
          {
            id: (Date.now() + Math.random()).toString(),
            text: `Vehicle reactivated from ${fromType} status and returned to active inventory.`,
            userInitials: userInitials.trim().toUpperCase(),
            timestamp: new Date().toISOString(),
            category: 'general'
          }
        ]
      });

      if (updatedVehicle) {
        // Remove from sold/pending and add to active
        if (fromType === 'sold') {
          setSoldVehicles(prev => prev.filter(v => v.id !== vehicleId));
        } else {
          setPendingVehicles(prev => prev.filter(v => v.id !== vehicleId));
        }

        // Add to active vehicles
        setVehicles(prev => [updatedVehicle, ...prev]);
        alert(`Vehicle successfully reactivated from ${fromType} status!`);
      }
    } catch (error) {
      console.error('Error reactivating vehicle:', error);
      alert('Failed to reactivate vehicle. Please try again.');
    }
  };

  // NEW: Location type detection function
  const getVehicleLocationType = (location: string): LocationFilter => {
    if (!location) return 'on-site';
    
    const locationLower = location.toLowerCase();
    
    // Check for In-Transit indicators
    if (locationLower.includes('transit') || locationLower.includes('transport')) {
      return 'in-transit';
    }
    
    // Check for Off-Site indicators
    if (locationLower.includes('off-site') || 
        locationLower.includes('storage') || 
        locationLower.includes('external')) {
      return 'off-site';
    }
    
    // Check if this matches a specific location name from the locations table
    const specificLocation = locations.find(loc => 
      loc.name.toLowerCase() === locationLower
    );
    
    if (specificLocation) {
      return specificLocation.name; // Return the specific location name
    }
    
    // Default to On-Site for most locations
    return 'on-site';
  };

  const getFilteredVehicles = () => {
    let vehiclesToFilter: Vehicle[] = [];
    
    // Handle multiple vehicle filters
    if (vehicleFilter.includes('sold')) {
      vehiclesToFilter = [...vehiclesToFilter, ...soldVehicles];
    }
    if (vehicleFilter.includes('vehicle-pending')) {
      vehiclesToFilter = [...vehiclesToFilter, ...pendingVehicles];
    }
    if (vehicleFilter.includes('all') || vehicleFilter.includes('active') || vehicleFilter.includes('completed') || vehicleFilter.includes('needs-attention')) {
      vehiclesToFilter = [...vehiclesToFilter, ...vehicles];
    }

    // If no specific filters are selected, show all active vehicles
    if (vehiclesToFilter.length === 0) {
        vehiclesToFilter = vehicles;
    }

    // Apply status filter for active vehicles ONLY if inspection-based filters are selected
    // AND we're not showing sold/pending vehicles
    const hasInspectionFilters = vehicleFilter.includes('completed') || vehicleFilter.includes('needs-attention') || vehicleFilter.includes('active');
    const hasSoldPendingFilters = vehicleFilter.includes('sold') || vehicleFilter.includes('vehicle-pending');
    
    if (hasInspectionFilters && inspectionDataLoaded && !isLoadingSettings && allSections.length > 0) {
      const sectionKeys = allSections.map(section => section.key);
      
      // Filter by inspection status for active vehicles only
      const activeVehicles = vehiclesToFilter.filter(vehicle => {
        // Skip sold/pending vehicles for inspection-based filtering
        if (vehicle.status === 'sold' || vehicle.status === 'pending') {
          return false;
        }

        const inspectionData = vehicleInspectionData[vehicle.id] || {};
        
        // Calculate section statuses for this vehicle (SAME logic as getFilterCounts)
        const sectionStatuses: string[] = [];
        
        for (const sectionKey of sectionKeys) {
          const sectionItems = inspectionData[sectionKey] || [];
          const sectionSettings = allSections.find(s => s.key === sectionKey);
          
          if (!sectionSettings) {
            sectionStatuses.push('not-started');
            continue;
          }
          
          const allSectionItems = sectionSettings.items || [];
          
          if (sectionItems.length === 0) {
            sectionStatuses.push('not-started');
            continue;
          }

          // Use the SAME logic as VehicleCard for section status
          const inspectedItems = sectionItems.filter((item: any) => item.rating && item.rating !== 'not-checked');
          
          // If not all items have been inspected, stay gray
          if (inspectedItems.length < allSectionItems.length) {
            sectionStatuses.push('not-started');
            continue;
          }
          
          // If any inspected item is 'not-checked', return 'not-started' (grey)
          if (sectionItems.some((item: any) => item.rating === 'not-checked' || !item.rating)) {
            sectionStatuses.push('not-started');
            continue;
          }
          
          // Now check the actual ratings since all items are inspected
          if (sectionItems.some((item: any) => item.rating === 'N')) {
            sectionStatuses.push('needs-attention');
          } else if (sectionItems.some((item: any) => item.rating === 'F')) {
            sectionStatuses.push('pending');
          } else if (sectionItems.every((item: any) => item.rating === 'G')) {
            sectionStatuses.push('completed');
          } else {
            sectionStatuses.push('not-started');
          }
        }
        
        // Check if this vehicle matches any of the selected inspection filters
        if (vehicleFilter.includes('completed')) {
          // Completed: ALL sections are 'completed' (green)
          return sectionStatuses.length > 0 && sectionStatuses.every(status => status === 'completed');
        }
        
        if (vehicleFilter.includes('needs-attention')) {
          // Issues: ANY section has 'needs-attention' (red)
          return sectionStatuses.some(status => status === 'needs-attention');
        }
        
        if (vehicleFilter.includes('active')) {
          // Working: Everything else (not all green, and not any red)
          const hasRed = sectionStatuses.some(status => status === 'needs-attention');
          const allGreen = sectionStatuses.length > 0 && sectionStatuses.every(status => status === 'completed');
          return !hasRed && !allGreen;
        }
        
        return false;
      });

      // Combine sold/pending vehicles with filtered active vehicles
      if (hasSoldPendingFilters) {
        // If we have both sold/pending AND inspection filters, combine them
        const soldPendingVehicles = vehiclesToFilter.filter(vehicle => 
          vehicle.status === 'sold' || vehicle.status === 'pending'
        );
        vehiclesToFilter = [...soldPendingVehicles, ...activeVehicles];
      } else {
        // Only inspection filters, use the filtered active vehicles
        vehiclesToFilter = activeVehicles;
      }
    }

    // Apply location filter
    if (!locationFilter.includes('all')) {
      vehiclesToFilter = vehiclesToFilter.filter(vehicle => {
        if (!vehicle.location) return false;
        
        // Check if the vehicle's location matches any of the selected location filters
        return locationFilter.some(filter => {
          if (filter === 'on-site' || filter === 'off-site' || filter === 'in-transit') {
            // Find the location in our locations array to get its type
            const location = locations.find(loc => 
              loc.name.toLowerCase() === vehicle.location?.toLowerCase()
            );
            
            if (location) {
              // Use the actual location type from the locations table
              return location.type === filter;
            } else {
              // Fallback logic for locations not in the table
              const locationLower = vehicle.location.toLowerCase();
              
              if (filter === 'on-site') {
                return !locationLower.includes('transit') && 
                       !locationLower.includes('transport') &&
                       !locationLower.includes('off-site') && 
                       !locationLower.includes('storage') && 
                       !locationLower.includes('external');
              } else if (filter === 'off-site') {
                return locationLower.includes('off-site') || 
                       locationLower.includes('storage') || 
                       locationLower.includes('external');
              } else if (filter === 'in-transit') {
                // Include both "in-transit" and "in transit" (without dash) in the general category
                return locationLower.includes('transit') || locationLower.includes('transport');
              }
            }
          } else {
            // Specific location name filter
            return vehicle.location.toLowerCase() === filter.toLowerCase();
          }
          
          return false;
        });
      });
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      vehiclesToFilter = vehiclesToFilter.filter(vehicle =>
        vehicle.make.toLowerCase().includes(search) ||
        vehicle.model.toLowerCase().includes(search) ||
        vehicle.year.toString().includes(search) ||
        vehicle.vin.toLowerCase().includes(search) ||
        vehicle.color.toLowerCase().includes(search) ||
        vehicle.location.toLowerCase().includes(search)
      );
    }

    // Apply section-based filter if active
    if (sectionFilter.section && sectionFilter.status && inspectionDataLoaded && !isLoadingSettings) {
      vehiclesToFilter = vehiclesToFilter.filter(vehicle => {
        const inspectionData = vehicleInspectionData[vehicle.id] || {};
        const sectionItems = inspectionData[sectionFilter.section!] || [];
        
        // DEBUG: Log the section data for each vehicle
        console.log(`\n=== VEHICLE ${vehicle.year} ${vehicle.make} ${vehicle.model} ===`);
        console.log(`Section: ${sectionFilter.section}, Filter: ${sectionFilter.status}`);
        console.log(`Section items:`, sectionItems);
        
        // Get the section settings to know how many items should exist (SAME as VehicleCard)
        const sectionSettings = allSections.find(s => s.key === sectionFilter.section);
        if (!sectionSettings) {
          console.log(`No section settings found - categorized as unchecked`);
          return sectionFilter.status === 'unchecked';
        }
        
        const allSectionItems = sectionSettings.items || [];
        console.log(`Section has ${allSectionItems.length} total items, ${sectionItems.length} saved items`);
        
        // Use the EXACT same logic as VehicleCard and getSectionProgressCounts
        if (sectionItems.length === 0) {
          console.log(`No items in section - categorized as unchecked`);
          return sectionFilter.status === 'unchecked';
        }

        // Check if ALL items have been inspected (no missing items and no 'not-checked' ratings)
        const inspectedItems = sectionItems.filter((item: any) => item.rating && item.rating !== 'not-checked');
        
        // If not all items have been inspected, it's unchecked (gray)
        if (inspectedItems.length < allSectionItems.length) {
          console.log(`Not all items inspected (${inspectedItems.length}/${allSectionItems.length}) - categorized as unchecked`);
          return sectionFilter.status === 'unchecked';
        }
        
        // If any inspected item is 'not-checked', it's unchecked (gray) 
        if (sectionItems.some((item: any) => item.rating === 'not-checked' || !item.rating)) {
          console.log(`Some items are not-checked - categorized as unchecked`);
          return sectionFilter.status === 'unchecked';
        }

        // Check for issues (any 'N' rating) - same as getSectionProgressCounts
        const hasIssues = sectionItems.some((item: any) => item.rating === 'N');
        if (hasIssues) {
          console.log(`Has N ratings - categorized as issues`);
          return sectionFilter.status === 'issues';
        }

        // Check if all items are 'G' (ready) - same as getSectionProgressCounts
        const allGood = sectionItems.every((item: any) => item.rating === 'G');
        if (allGood) {
          console.log(`All items are G - categorized as ready`);
          return sectionFilter.status === 'ready';
        }

        // Everything else is working - same as getSectionProgressCounts
        console.log(`Mixed ratings - categorized as working`);
        return sectionFilter.status === 'working';
      });
    }

    return vehiclesToFilter;
  };

  const getFilterCounts = () => {
    // Don't categorize until inspection data and settings are loaded
    if (!inspectionDataLoaded || isLoadingSettings || allSections.length === 0) {
      return {
        all: vehicles.length,
        active: 0,
        completed: 0,
        pending: 0,
        'needs-attention': 0,
        sold: soldVehicles.length,
        'vehicle-pending': pendingVehicles.length
      };
    }

    // Helper function to categorize a vehicle based on SECTION STATUSES (not individual ratings)
    const categorizeVehicle = (vehicle: Vehicle) => {
      // First check vehicle.status - if sold or pending, don't categorize by inspection
      if (vehicle.status === 'sold' || vehicle.status === 'pending') {
        console.log(`Vehicle ${vehicle.id} skipped categorization - status is ${vehicle.status}`);
        return null; // Don't count in Ready/Working/Issues
      }

      // Don't categorize until settings are loaded
      if (isLoadingSettings || allSections.length === 0) {
        console.log(`Vehicle ${vehicle.id} skipped categorization - settings not loaded`);
        return 'pending';
      }

      const inspectionData = vehicleInspectionData[vehicle.id] || {};
      const sectionKeys = allSections.map(section => section.key);
      
      // Calculate section statuses for this vehicle (same logic as VehicleCard)
      const sectionStatuses: string[] = [];
      
      for (const sectionKey of sectionKeys) {
        const sectionItems = inspectionData[sectionKey] || [];
        const sectionSettings = allSections.find(s => s.key === sectionKey);
        
        if (!sectionSettings) {
          sectionStatuses.push('not-started');
          continue;
        }
        
        const allSectionItems = sectionSettings.items || [];
        
        if (sectionItems.length === 0) {
          sectionStatuses.push('not-started');
          continue;
        }

        // Use the SAME logic as VehicleCard for section status
        const inspectedItems = sectionItems.filter((item: any) => item.rating && item.rating !== 'not-checked');
        
        // If not all items have been inspected, stay gray
        if (inspectedItems.length < allSectionItems.length) {
          sectionStatuses.push('not-started');
          continue;
        }
        
        // If any inspected item is 'not-checked', return 'not-started' (grey)
        if (sectionItems.some((item: any) => item.rating === 'not-checked' || !item.rating)) {
          sectionStatuses.push('not-started');
          continue;
        }
        
        // Now check the actual ratings since all items are inspected
        if (sectionItems.some((item: any) => item.rating === 'N')) {
          sectionStatuses.push('needs-attention');
        } else if (sectionItems.some((item: any) => item.rating === 'F')) {
          sectionStatuses.push('pending');
        } else if (sectionItems.every((item: any) => item.rating === 'G')) {
          sectionStatuses.push('completed');
        } else {
          sectionStatuses.push('not-started');
        }
      }
      
      console.log(`Vehicle ${vehicle.id} (${vehicle.year} ${vehicle.make} ${vehicle.model}):`, {
        sectionStatuses,
        vehicleStatus: vehicle.status,
        sectionKeys
      });

      // NEW LOGIC: Base overall status on section statuses
      // 1. If ANY section has 'needs-attention' (red), vehicle is 'needs-attention'
      if (sectionStatuses.some(status => status === 'needs-attention')) {
        console.log(`Vehicle ${vehicle.id} categorized as: needs-attention (has red sections)`);
        return 'needs-attention';
      }
      
      // 2. If ALL sections are 'completed' (green), vehicle is 'completed'
      if (sectionStatuses.length > 0 && sectionStatuses.every(status => status === 'completed')) {
        console.log(`Vehicle ${vehicle.id} categorized as: completed (all sections green)`);
        return 'completed';
      }
      
      // 3. Everything else is 'pending' (working):
      // - All sections unchecked
      // - Some sections working + some unchecked
      // - Some sections green + some unchecked
      // - Some sections green + some working
      // - etc.
      console.log(`Vehicle ${vehicle.id} categorized as: pending (working - mixed statuses)`);
      return 'pending';
    };
    
    const categorizedVehicles = vehicles.map(categorizeVehicle);
    console.log('Categorized vehicles:', categorizedVehicles);
    
    // Filter out null values (sold/pending vehicles) when counting inspection-based categories
    const inspectionBasedCategories = categorizedVehicles.filter(category => category !== null);
    
    return {
      all: vehicles.length,
      active: inspectionBasedCategories.filter(category => category === 'active').length,
      completed: inspectionBasedCategories.filter(category => category === 'completed').length,
      pending: inspectionBasedCategories.filter(category => category === 'pending').length,
      'needs-attention': inspectionBasedCategories.filter(category => category === 'needs-attention').length,
      sold: soldVehicles.length,
      'vehicle-pending': pendingVehicles.length
    };
  };

  // NEW: Get location filter counts
  const getLocationFilterCounts = () => {
    const allActiveVehicles = vehicles;
    const counts: Record<string, number> = {
      all: allActiveVehicles.length,
      'on-site': 0,
      'off-site': 0,
      'in-transit': 0
    };
    
    // Count vehicles by location
    allActiveVehicles.forEach(vehicle => {
      if (!vehicle.location) {
        counts['on-site']++; // Default to on-site if no location
        return;
      }
      
      // Find the location in our locations array to get its type
      const location = locations.find(loc => 
        loc.name.toLowerCase() === vehicle.location?.toLowerCase()
      );
      
      if (location) {
        // Use the actual location type from the locations table
        if (location.type === 'off-site') {
          counts['off-site']++;
        } else if (location.type === 'in-transit') {
          counts['in-transit']++;
        } else {
          // Default to on-site for most locations
          counts['on-site']++;
        }
        
        // Also count for specific location name (but exclude "in transit" to avoid duplication)
        const locationNameLower = location.name.toLowerCase();
        if (locationNameLower !== 'in transit' && locationNameLower !== 'in-transit') {
          if (!counts[location.name]) {
            counts[location.name] = 0;
          }
          counts[location.name]++;
        }
      } else {
        // If location not found in locations table, use fallback logic
        const locationLower = vehicle.location.toLowerCase();
        
        // Check for In-Transit indicators (including "in transit" without dash)
        if (locationLower.includes('transit') || locationLower.includes('transport')) {
          counts['in-transit']++;
        }
        // Check for Off-Site indicators
        else if (locationLower.includes('off-site') || 
                 locationLower.includes('storage') || 
                 locationLower.includes('external')) {
          counts['off-site']++;
        }
        // Default to On-Site for most locations
        else {
          counts['on-site']++;
        }
      }
    });
    
    return counts;
  };

  // NEW: Get section progress counts for a specific section
  const getSectionProgressCounts = (sectionKey: string | undefined) => {
    if (!sectionKey || !inspectionDataLoaded || isLoadingSettings || allSections.length === 0) {
      return { ready: 0, working: 0, issues: 0, unchecked: 0 };
    }

    let ready = 0;
    let working = 0;
    let issues = 0;
    let unchecked = 0;

    vehicles.forEach(vehicle => {
      const inspectionData = vehicleInspectionData[vehicle.id] || {};
      const sectionItems = inspectionData[sectionKey] || [];
      
      // Get the section settings to know how many items should exist
      const sectionSettings = allSections.find(s => s.key === sectionKey);
      if (!sectionSettings) {
        unchecked++;
        return;
      }
      
      const allSectionItems = sectionSettings.items || [];
      
      if (sectionItems.length === 0) {
        unchecked++;
        return;
      }

      // Use the SAME logic as VehicleCard/VehicleDetail for consistency
      const inspectedItems = sectionItems.filter((item: any) => item.rating && item.rating !== 'not-checked');
      
      // If not all items have been inspected, it's unchecked (gray)
      if (inspectedItems.length < allSectionItems.length) {
        unchecked++;
        return;
      }
      
      // If any inspected item is 'not-checked', it's unchecked (gray) 
      if (sectionItems.some((item: any) => item.rating === 'not-checked' || !item.rating)) {
        unchecked++;
        return;
      }

      // Check for issues (any 'N' rating)
      const hasIssues = sectionItems.some((item: any) => item.rating === 'N');
      if (hasIssues) {
        issues++;
        return;
      }

      // Check if all items are 'G' (ready)
      const allGood = sectionItems.every((item: any) => item.rating === 'G');
      if (allGood) {
        ready++;
        return;
      }

      // Everything else is working
      working++;
    });

    return { ready, working, issues, unchecked };
  };

  const getInventorySummary = () => {
    const counts = getFilterCounts();
    const locationCounts = getLocationFilterCounts();
    
    return {
      totalVehicles: vehicles.length, // Only active vehicles (exclude sold/pending)
      activeVehicles: counts.pending + counts.active, // Working: pending (F/not-checked) + active (mixed states)
      completedVehicles: counts.completed,
      pendingVehicles: counts.pending,
      needsAttention: counts['needs-attention'], // Issues: only vehicles with N ratings
      soldVehicles: counts.sold,
      pendingStatus: counts['vehicle-pending'],
      onSite: locationCounts['on-site'],
      offSite: locationCounts['off-site'],
      inTransit: locationCounts['in-transit']
    };
  };

  const handleInventoryCardClick = (filterType: VehicleFilter) => {
    if (filterType === 'all') {
      setVehicleFilter(['all']);
    } else {
      setVehicleFilter([filterType]);
    }
    setActiveView('inventory');
  };

  const handleLocationCardClick = (filterType: LocationFilter) => {
    if (filterType === 'all') {
      setLocationFilter(['all']);
    } else {
      setLocationFilter([filterType]);
    }
    setActiveView('inventory');
  };

  // Helper functions for multi-select filters
  const handleVehicleFilterChange = (filterType: VehicleFilter) => {
    if (filterType === 'all') {
      // If "All" is selected, deselect everything else
      setVehicleFilter(['all']);
    } else {
      // Remove 'all' if it was selected
      const newFilters = vehicleFilter.filter(f => f !== 'all');
      
      if (vehicleFilter.includes(filterType)) {
        // Remove the filter if it was already selected
        const updatedFilters = newFilters.filter(f => f !== filterType);
        // If no filters left, default to 'all'
        setVehicleFilter(updatedFilters.length > 0 ? updatedFilters : ['all']);
      } else {
        // Add the new filter
        setVehicleFilter([...newFilters, filterType]);
      }
    }
  };

  const handleLocationFilterChange = (filterType: LocationFilter) => {
    if (filterType === 'all') {
      // If "All" is selected, deselect everything else
      setLocationFilter(['all']);
    } else {
      // Remove 'all' if it was selected
      const newFilters = locationFilter.filter(f => f !== 'all');
      
      if (locationFilter.includes(filterType)) {
        // Remove the filter if it was already selected
        const updatedFilters = newFilters.filter(f => f !== filterType);
        // If no filters left, default to 'all'
        setLocationFilter(updatedFilters.length > 0 ? updatedFilters : ['all']);
      } else {
        // Add the new filter
        setLocationFilter([...newFilters, filterType]);
      }
    }
  };

  const handleLogout = () => {
    logout();
  };

  const filteredVehicles = getFilteredVehicles();
  const filterCounts = getFilterCounts();
  const locationFilterCounts = getLocationFilterCounts();
  const inventorySummary = getInventorySummary();

  const sidebarItems = [
    { id: 'inventory', label: 'Inventory', icon: Car, count: vehicles.length },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'todos', label: 'Todo & Calendar', icon: Calendar },
    { id: 'contacts', label: 'Contacts', icon: Phone },
    { id: 'locations', label: 'Locations', icon: MapPin },
    ...(user?.role === 'admin' ? [
      { id: 'users', label: 'Users', icon: Users },
      { id: 'inspection-settings', label: 'Inspection Settings', icon: ClipboardList }
    ] : []),
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const filterOptions = [
    { id: 'all', label: 'All Vehicles', icon: Car, count: vehicles.length },
    { id: 'active', label: 'Working', icon: Activity, count: filterCounts.pending + filterCounts.active },
    { id: 'completed', label: 'Ready', icon: CheckCircle2, count: filterCounts.completed },
    { id: 'needs-attention', label: 'Issues', icon: AlertTriangle, count: filterCounts['needs-attention'] },
    { id: 'sold', label: 'Sold Vehicles', icon: Archive, count: filterCounts.sold },
    { id: 'vehicle-pending', label: 'Pending Vehicles', icon: Clock, count: filterCounts['vehicle-pending'] }
  ];

  // NEW: Location filter options
  const locationFilterOptions = [
    { id: 'all', label: 'All Locations', icon: MapPin, count: locationFilterCounts.all },
    { id: 'on-site', label: 'On-Site', icon: MapPin, count: locationFilterCounts['on-site'], color: 'text-green-600' },
    { id: 'off-site', label: 'Off-Site', icon: MapPin, count: locationFilterCounts['off-site'], color: 'text-yellow-600' },
    { id: 'in-transit', label: 'In-Transit', icon: MapPin, count: locationFilterCounts['in-transit'], color: 'text-red-600' },
    // Add specific locations from the locations table, ordered alphabetically, but only if they have vehicles
    ...locations
      .filter(location => {
        // Only include locations that have vehicles AND exclude "in transit" to prevent duplication
        const vehicleCount = locationFilterCounts[location.name] || 0;
        const locationNameLower = location.name.toLowerCase();
        return vehicleCount > 0 && 
               locationNameLower !== 'in transit' && 
               locationNameLower !== 'in-transit';
      })
      .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
      .map(location => ({
        id: location.name,
        label: location.name,
        icon: MapPin,
        count: locationFilterCounts[location.name] || 0,
        color: location.type === 'off-site' ? 'text-yellow-600' : 'text-green-600'
      }))
  ];

  // NEW: Handle section progress box clicks to filter vehicles by section status
  const handleSectionProgressFilter = (filterType: 'ready' | 'working' | 'issues' | 'unchecked') => {
    if (!selectedSection) return;
    
    // Clear existing filters when applying section filter
    setVehicleFilter(['all']);
    setLocationFilter(['all']);
    
    // Set section-based filter
    setSectionFilter({
      section: selectedSection,
      status: filterType
    });
  };

  if (!user || !dealership) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-800/30 dark:to-gray-900/20 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-white/20 dark:border-gray-700/20 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Car className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{dealership?.name}</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden sm:block">Reconditioning Management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">{user?.role}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">{user?.initials}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Sidebar */}
          <div className={`lg:w-64 ${isMobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 p-4 sm:p-6 transition-colors duration-300">
              <nav className="space-y-2">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id as DashboardView);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 sm:py-3 rounded-lg transition-all duration-200 text-left ${
                      activeView === item.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="font-medium text-sm sm:text-base">{item.label}</span>
                    </div>
                    {'count' in item && item.count !== undefined && (
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        activeView === item.id
                          ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeView === 'inventory' && (
              <div className="space-y-6">
                {/* Inventory Summary Dashboard - ENHANCED MOBILE STYLING */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 p-3 sm:p-6 transition-colors duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div>
                      <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">Inventory Overview</h2>
                      <p className="text-xs sm:text-base text-gray-600 dark:text-gray-400">Real-time summary - click any metric to filter</p>
                    </div>
                    <button
                      onClick={() => setShowAddVehicle(true)}
                      className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Add Vehicle</span>
                      <span className="sm:hidden">Add</span>
                    </button>
                  </div>

                  {/* Enhanced Mobile Key Indicators */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6">
                    <button
                      onClick={() => handleInventoryCardClick('all')}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-3 sm:p-6 rounded-xl border border-blue-200/60 dark:border-blue-700/60 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] text-left group"
                    >
                      <div className="flex items-center justify-between mb-2 sm:mb-4">
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Total</p>
                          <p className="text-xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100 group-hover:text-blue-700 dark:group-hover:text-blue-200 transition-colors">{inventorySummary.totalVehicles}</p>
                        </div>
                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-blue-700 transition-colors flex-shrink-0">
                          <Car className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                        Click to view all vehicles →
                      </div>
                    </button>

                    <button
                      onClick={() => handleInventoryCardClick('completed')}
                      className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-3 sm:p-6 rounded-xl border border-emerald-200/60 dark:border-emerald-700/60 hover:from-emerald-100 hover:to-green-100 dark:hover:from-emerald-900/30 dark:hover:to-green-900/30 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] text-left group"
                    >
                      <div className="flex items-center justify-between mb-2 sm:mb-4">
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Ready</p>
                          <p className="text-xl sm:text-3xl font-bold text-emerald-900 dark:text-emerald-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-200 transition-colors">{inventorySummary.completedVehicles}</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 hidden sm:block">
                            {inventorySummary.totalVehicles > 0 ? Math.round((inventorySummary.completedVehicles / inventorySummary.totalVehicles) * 100) : 0}% of total
                          </p>
                        </div>
                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-emerald-700 transition-colors flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                        </div>
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                        Click to view completed vehicles →
                      </div>
                    </button>

                    <button
                      onClick={() => handleInventoryCardClick('active')}
                      className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-3 sm:p-6 rounded-xl border border-amber-200/60 dark:border-amber-700/60 hover:from-amber-100 hover:to-yellow-100 dark:hover:from-amber-900/30 dark:hover:to-yellow-900/30 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] text-left group"
                    >
                      <div className="flex items-center justify-between mb-2 sm:mb-4">
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Working</p>
                          <p className="text-xl sm:text-3xl font-bold text-amber-900 dark:text-amber-100 group-hover:text-amber-700 dark:group-hover:text-amber-200 transition-colors">{inventorySummary.activeVehicles}</p>
                          <p className="text-xs text-amber-600 dark:text-amber-400 hidden sm:block">
                            {inventorySummary.totalVehicles > 0 ? Math.round((inventorySummary.activeVehicles / inventorySummary.totalVehicles) * 100) : 0}% of total
                          </p>
                        </div>
                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-amber-600 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-amber-700 transition-colors flex-shrink-0">
                          <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                        </div>
                      </div>
                      <div className="text-xs text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                        Click to view in-progress vehicles →
                      </div>
                    </button>

                    <button
                      onClick={() => handleInventoryCardClick('needs-attention')}
                      className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 p-3 sm:p-6 rounded-xl border border-red-200/60 dark:border-red-700/60 hover:from-red-100 hover:to-rose-100 dark:hover:from-red-900/30 dark:hover:to-rose-900/30 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] text-left group"
                    >
                      <div className="flex items-center justify-between mb-2 sm:mb-4">
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">Issues</p>
                          <p className="text-xl sm:text-3xl font-bold text-red-900 dark:text-red-100 group-hover:text-red-700 dark:group-hover:text-red-200 transition-colors">{inventorySummary.needsAttention}</p>
                          <p className="text-xs text-red-600 dark:text-red-400 hidden sm:block">
                            {inventorySummary.totalVehicles > 0 ? Math.round((inventorySummary.needsAttention / inventorySummary.totalVehicles) * 100) : 0}% of total
                          </p>
                        </div>
                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-red-600 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-red-700 transition-colors flex-shrink-0">
                          <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                        </div>
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                        Click to view vehicles needing attention →
                      </div>
                    </button>
                  </div>

                  {/* NEW: Section Progress Overview */}
                  {allSections.length > 0 && (
                    <div className="mt-3 sm:mt-6" style={{ isolation: 'isolate', zIndex: 9999, position: 'relative' }}>
                      <div className="grid grid-cols-5 gap-2 sm:gap-3">
                        {/* First column: Title and Dropdown */}
                        <div className="flex flex-col gap-2">
                          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Section Progress</h3>
                          <div className="relative">
                            <button 
                              ref={dropdownButtonRef}
                              className="appearance-none w-full text-xs px-3 py-1.5 pr-8 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer text-left"
                              onClick={handleDropdownToggle}
                            >
                              <span className="block truncate">{selectedSection || 'Select Section'}</span>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </button>
                            
                            {showSectionDropdown && createPortal(
                              <div 
                                className="fixed inset-0 z-[99999]"
                                onClick={() => setShowSectionDropdown(false)}
                              >
                                <div 
                                  className="absolute bg-white dark:bg-gray-700 rounded-md shadow-2xl ring-1 ring-black ring-opacity-5 py-1 text-xs max-h-60 overflow-auto"
                                  style={{
                                    top: dropdownPosition.top,
                                    left: dropdownPosition.left,
                                    width: dropdownPosition.width,
                                    zIndex: 99999
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {allSections.map((section) => (
                                    <button
                                      key={section.key}
                                      onClick={() => {
                                        setSelectedSection(section.key);
                                        setShowSectionDropdown(false);
                                      }}
                                      className="block w-full text-left px-3 py-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-900 dark:text-gray-100 hover:text-blue-900 dark:hover:text-blue-100"
                                    >
                                      {section.key}
                                    </button>
                                  ))}
                                </div>
                              </div>,
                              document.body
                            )}
                          </div>
                        </div>
                        
                        {/* Second column: Ready */}
                        <button 
                          onClick={() => handleSectionProgressFilter('ready')}
                          className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-2 rounded-lg border border-emerald-200/60 dark:border-emerald-700/60 hover:from-emerald-100 hover:to-green-100 dark:hover:from-emerald-900/30 dark:hover:to-green-900/30 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Ready</span>
                              </div>
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                {inventorySummary.totalVehicles > 0 ? Math.round((getSectionProgressCounts(selectedSection).ready / inventorySummary.totalVehicles) * 100) : 0}%
                              </p>
                            </div>
                            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                              {getSectionProgressCounts(selectedSection).ready}
                            </p>
                          </div>
                        </button>
                        
                        {/* Third column: Working */}
                        <button 
                          onClick={() => handleSectionProgressFilter('working')}
                          className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-2 rounded-lg border border-amber-200/60 dark:border-amber-700/60 hover:from-amber-100 hover:to-yellow-100 dark:hover:from-amber-900/30 dark:hover:to-yellow-900/30 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Working</span>
                              </div>
                              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                {inventorySummary.totalVehicles > 0 ? Math.round((getSectionProgressCounts(selectedSection).working / inventorySummary.totalVehicles) * 100) : 0}%
                              </p>
                            </div>
                            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                              {getSectionProgressCounts(selectedSection).working}
                            </p>
                          </div>
                        </button>
                        
                        {/* Fourth column: Issues */}
                        <button 
                          onClick={() => handleSectionProgressFilter('issues')}
                          className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 p-2 rounded-lg border border-red-200/60 dark:border-red-700/60 hover:from-red-100 hover:to-rose-100 dark:hover:from-red-900/30 dark:hover:to-rose-900/30 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Issues</span>
                              </div>
                              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                {inventorySummary.totalVehicles > 0 ? Math.round((getSectionProgressCounts(selectedSection).issues / inventorySummary.totalVehicles) * 100) : 0}%
                              </p>
                            </div>
                            <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                              {getSectionProgressCounts(selectedSection).issues}
                            </p>
                          </div>
                        </button>
                        
                        {/* Fifth column: Unchecked */}
                        <button 
                          onClick={() => handleSectionProgressFilter('unchecked')}
                          className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 p-2 rounded-lg border border-gray-200/60 dark:border-gray-700/60 hover:from-gray-100 hover:to-slate-100 dark:hover:from-gray-900/30 dark:hover:to-slate-900/30 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Circle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Unchecked</span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                {inventorySummary.totalVehicles > 0 ? Math.round((getSectionProgressCounts(selectedSection).unchecked / inventorySummary.totalVehicles) * 100) : 0}%
                              </p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                              {getSectionProgressCounts(selectedSection).unchecked}
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Progress Overview - COMPACT ON MOBILE */}
                  {inventorySummary.totalVehicles > 0 && (
                    <div className="mt-3 sm:mt-6 p-3 sm:p-4 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Overall Completion Rate</h3>
                        <span className="text-sm sm:text-sm font-bold text-gray-900 dark:text-white">
                          {Math.round((inventorySummary.completedVehicles / inventorySummary.totalVehicles) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 sm:h-3">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-green-600 h-2 sm:h-3 rounded-full transition-all duration-500 shadow-sm"
                          style={{ width: `${(inventorySummary.completedVehicles / inventorySummary.totalVehicles) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
                        <span>{inventorySummary.completedVehicles} completed</span>
                        <span>{inventorySummary.totalVehicles - inventorySummary.completedVehicles} remaining</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* MOBILE OPTIMIZED: Compact search and filters - SAME AS TODO/CALENDAR */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 transition-colors duration-300 relative z-0">
                  {/* Search and Filter Toggle Row */}
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search vehicles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      />
                    </div>
                    
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-1 ${
                        showFilters 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      <span className="hidden sm:inline">Filters</span>
                      {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Collapsible Filters */}
                  {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
                      {/* Status Filter - Multi-select */}
                      <div className="relative z-10">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                        <HeadlessMenu as="div" className="relative inline-block w-full">
                          <HeadlessMenu.Button className="inline-flex w-full justify-between items-center gap-x-1.5 rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-900 dark:text-white shadow-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <span className="truncate">
                              {vehicleFilter.includes('all') 
                                ? 'All Vehicles' 
                                : vehicleFilter.length === 1 
                                  ? filterOptions.find(opt => opt.id === vehicleFilter[0])?.label
                                  : `${vehicleFilter.length} selected`
                              }
                            </span>
                            <ChevronDownIcon className="-mr-1 h-4 w-4 text-gray-400" aria-hidden="true" />
                          </HeadlessMenu.Button>

                          <HeadlessMenu.Items className="absolute right-0 z-40 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-gray-700 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <div className="py-1">
                              {filterOptions.map((option) => (
                                <HeadlessMenu.Item key={option.id}>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleVehicleFilterChange(option.id as VehicleFilter)}
                                      className={`${
                                        active ? 'bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                                      } flex w-full items-center px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600`}
                                    >
                                      <div className="flex items-center w-full">
                                        <div className={`w-4 h-4 border-2 rounded mr-3 flex items-center justify-center ${
                                          vehicleFilter.includes(option.id as VehicleFilter)
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'border-gray-300 dark:border-gray-500'
                                        }`}>
                                          {vehicleFilter.includes(option.id as VehicleFilter) && (
                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                          )}
                                        </div>
                                        <span className="flex-1 text-left">{option.label}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">({option.count})</span>
                                      </div>
                                    </button>
                                  )}
                                </HeadlessMenu.Item>
                              ))}
                            </div>
                          </HeadlessMenu.Items>
                        </HeadlessMenu>
                      </div>

                      {/* Location Filter - Multi-select */}
                      <div className="relative z-10">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                        <HeadlessMenu as="div" className="relative inline-block w-full">
                          <HeadlessMenu.Button className="inline-flex w-full justify-between items-center gap-x-1.5 rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-900 dark:text-white shadow-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <span className="truncate">
                              {locationFilter.includes('all') 
                                ? 'All Locations' 
                                : locationFilter.length === 1 
                                  ? locationFilterOptions.find(opt => opt.id === locationFilter[0])?.label
                                  : `${locationFilter.length} selected`
                              }
                            </span>
                            <ChevronDownIcon className="-mr-1 h-4 w-4 text-gray-400" aria-hidden="true" />
                          </HeadlessMenu.Button>

                          <HeadlessMenu.Items className="absolute right-0 z-40 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-gray-700 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <div className="py-1">
                              {locationFilterOptions.map((option) => (
                                <HeadlessMenu.Item key={option.id}>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleLocationFilterChange(option.id as LocationFilter)}
                                      className={`${
                                        active ? 'bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                                      } flex w-full items-center px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600`}
                                    >
                                      <div className="flex items-center w-full">
                                        <div className={`w-4 h-4 border-2 rounded mr-3 flex items-center justify-center ${
                                          locationFilter.includes(option.id as LocationFilter)
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'border-gray-300 dark:border-gray-500'
                                        }`}>
                                          {locationFilter.includes(option.id as LocationFilter) && (
                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                          )}
                                        </div>
                                        <span className="flex-1 text-left">{option.label}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">({option.count})</span>
                                      </div>
                                    </button>
                                  )}
                                </HeadlessMenu.Item>
                              ))}
                            </div>
                          </HeadlessMenu.Items>
                        </HeadlessMenu>
                      </div>
                    </div>
                  )}

                  {/* Active Filter Indicators */}
                  {(vehicleFilter.length > 0 && !vehicleFilter.includes('all')) || (locationFilter.length > 0 && !locationFilter.includes('all')) || (sectionFilter.section && sectionFilter.status) ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Active filters:</span>
                      {vehicleFilter.length > 0 && !vehicleFilter.includes('all') && vehicleFilter.map(filter => (
                        <span key={filter} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                          {filterOptions.find(opt => opt.id === filter)?.label}
                          <button
                            onClick={() => handleVehicleFilterChange(filter)}
                            className="ml-1 p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {locationFilter.length > 0 && !locationFilter.includes('all') && locationFilter.map(filter => (
                        <span key={filter} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                          {locationFilterOptions.find(opt => opt.id === filter)?.label}
                          <button
                            onClick={() => handleLocationFilterChange(filter)}
                            className="ml-1 p-0.5 hover:bg-green-200 dark:hover:bg-green-800 rounded-full transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {sectionFilter.section && sectionFilter.status && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-medium">
                          {sectionFilter.section}: {sectionFilter.status}
                          <button
                            onClick={() => setSectionFilter({ section: null, status: null })}
                            className="ml-1 p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setVehicleFilter(['all']);
                          setLocationFilter(['all']);
                          setSectionFilter({ section: null, status: null });
                        }}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
                      >
                        Clear all
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Vehicle Grid */}
                <div id="vehicle-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {filteredVehicles.length > 0 ? (
                    filteredVehicles.map((vehicle) => (
                      <div key={vehicle.id} className="relative">
                        <VehicleCard vehicle={vehicle} />
                        {(vehicleFilter.includes('sold') || vehicleFilter.includes('vehicle-pending')) && (
                          <div className="absolute top-2 right-2">
                            <button
                              onClick={() => handleReactivateVehicle(vehicle.id, vehicleFilter.includes('sold') ? 'sold' : 'pending')}
                              className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-lg"
                              title={`Reactivate from ${vehicleFilter.includes('sold') ? 'sold' : 'pending'} status`}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full">
                      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 p-8 sm:p-12 text-center transition-colors duration-300">
                        <Car className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          {searchTerm || (vehicleFilter.length > 0 && !vehicleFilter.includes('all')) || (locationFilter.length > 0 && !locationFilter.includes('all')) ? 'No vehicles found' : 'No vehicles in this category'}
                        </h3>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
                          {searchTerm || (vehicleFilter.length > 0 && !vehicleFilter.includes('all')) || (locationFilter.length > 0 && !locationFilter.includes('all'))
                            ? 'Try adjusting your search terms or filters.'
                            : vehicleFilter.includes('all') 
                              ? 'Add your first vehicle to get started.'
                              : vehicleFilter.includes('sold')
                                ? 'No vehicles have been sold yet.'
                                : vehicleFilter.includes('vehicle-pending')
                                  ? 'No vehicles are currently pending.'
                                  : vehicleFilter.includes('needs-attention')
                                    ? 'Great! No vehicles currently need attention.'
                                    : vehicleFilter.includes('completed')
                                      ? 'No vehicles are ready for sale yet.'
                                      : 'No vehicles found in this category.'
                          }
                        </p>
                        {!searchTerm && vehicleFilter.includes('all') && locationFilter.includes('all') && (
                          <button
                            onClick={() => setShowAddVehicle(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold"
                          >
                            <Plus className="w-4 h-4" />
                            Add Vehicle
                          </button>
                        )}
                        {((vehicleFilter.length > 0 && !vehicleFilter.includes('all')) || (locationFilter.length > 0 && !locationFilter.includes('all'))) && (
                          <button
                            onClick={() => {
                              setVehicleFilter(['all']);
                              setLocationFilter(['all']);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-semibold"
                          >
                            <Car className="w-4 h-4" />
                            View All Vehicles
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'analytics' && <Analytics />}
            {activeView === 'todos' && <TodoCalendar />}
            {activeView === 'contacts' && <ContactManagement />}
            {activeView === 'locations' && <LocationManagement />}
            {activeView === 'users' && <UserManagement />}
            {activeView === 'inspection-settings' && <InspectionSettings />}
            {activeView === 'settings' && (
              <div className="space-y-6">
                <ThemeSettings />
                <LocationSettings />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        isOpen={showAddVehicle}
        onClose={() => setShowAddVehicle(false)}
        onAddVehicle={handleAddVehicle}
      />
    </div>
  );
};

export default Dashboard;