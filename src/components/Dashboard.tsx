import React, { useState, useEffect } from 'react';
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
  ChevronUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AddVehicleModal from './AddVehicleModal';
import VehicleCard from './VehicleCard';
import InventorySummary from './InventorySummary';
import AnalyticsOverview from './AnalyticsOverview';
import UserManagement from './UserManagement';
import LocationManagement from './LocationManagement';
import ContactManagement from './ContactManagement';
import TodoManagement from './TodoManagement';
import SettingsPanel from './SettingsPanel';
import InspectionSettings from './InspectionSettings';

type DashboardView = 'inventory' | 'analytics' | 'users' | 'locations' | 'contacts' | 'todos' | 'settings' | 'inspection-settings';
type VehicleFilter = 'all' | 'active' | 'completed' | 'pending' | 'needs-attention' | 'sold' | 'vehicle-pending';
type LocationFilter = 'all' | 'on-site' | 'off-site' | 'in-transit';

const Dashboard: React.FC = () => {
  const { user, dealership, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [activeView, setActiveView] = useState<DashboardView>('inventory');
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>('active');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Vehicle state management
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [soldVehicles, setSoldVehicles] = useState<Vehicle[]>([]);
  const [pendingVehicles, setPendingVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all vehicles on component mount
  useEffect(() => {
    if (dealership) {
      loadAllVehicles();
    }
  }, [dealership]);

  const loadAllVehicles = async () => {
    if (!dealership) return;
    
    setIsLoading(true);
    try {
      const allVehicles = await DatabaseService.getVehicles(dealership.id);
      
      // Separate active, sold, and pending vehicles
      const activeVehicles = allVehicles.filter(v => !v.isSold && !v.isPending);
      const soldVehiclesList = allVehicles.filter(v => v.isSold);
      const pendingVehiclesList = allVehicles.filter(v => v.isPending);

      setVehicles(activeVehicles);
      setSoldVehicles(soldVehiclesList);
      setPendingVehicles(pendingVehiclesList);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVehicle = async (vehicleData: Omit<Vehicle, 'id'>) => {
    if (!dealership) return;

    try {
      const newVehicle = await DatabaseService.createVehicle({
        ...vehicleData,
        dealershipId: dealership.id
      });

      if (newVehicle) {
        // Update local state
        setVehicles(prev => [newVehicle, ...prev]);
        setShowAddVehicle(false);
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert('Failed to add vehicle. Please try again.');
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
    
    // Default to On-Site for most locations
    return 'on-site';
  };

  const getFilteredVehicles = () => {
    let vehiclesToFilter: Vehicle[] = [];
    
    switch (vehicleFilter) {
      case 'sold':
        vehiclesToFilter = soldVehicles;
        break;
      case 'vehicle-pending':
        vehiclesToFilter = pendingVehicles;
        break;
      default:
        vehiclesToFilter = vehicles;
        break;
    }

    // Apply status filter for active vehicles
    if (vehicleFilter !== 'sold' && vehicleFilter !== 'vehicle-pending') {
      switch (vehicleFilter) {
        case 'completed':
          vehiclesToFilter = vehiclesToFilter.filter(vehicle => 
            Object.values(vehicle.status).every(status => status === 'completed')
          );
          break;
        case 'pending':
          vehiclesToFilter = vehiclesToFilter.filter(vehicle => 
            Object.values(vehicle.status).some(status => status === 'pending')
          );
          break;
        case 'needs-attention':
          vehiclesToFilter = vehiclesToFilter.filter(vehicle => 
            Object.values(vehicle.status).some(status => status === 'needs-attention')
          );
          break;
        case 'active':
          vehiclesToFilter = vehiclesToFilter.filter(vehicle => 
            !Object.values(vehicle.status).every(status => status === 'completed')
          );
          break;
        case 'all':
        default:
          // Show all active vehicles
          break;
      }
    }

    // NEW: Apply location filter
    if (locationFilter !== 'all') {
      vehiclesToFilter = vehiclesToFilter.filter(vehicle => {
        const vehicleLocationType = getVehicleLocationType(vehicle.location);
        return vehicleLocationType === locationFilter;
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

    return vehiclesToFilter;
  };

  const getFilterCounts = () => {
    return {
      all: vehicles.length,
      active: vehicles.filter(v => !Object.values(v.status).every(status => status === 'completed')).length,
      completed: vehicles.filter(v => Object.values(v.status).every(status => status === 'completed')).length,
      pending: vehicles.filter(v => Object.values(v.status).some(status => status === 'pending')).length,
      'needs-attention': vehicles.filter(v => Object.values(v.status).some(status => status === 'needs-attention')).length,
      sold: soldVehicles.length,
      'vehicle-pending': pendingVehicles.length
    };
  };

  // NEW: Get location filter counts
  const getLocationFilterCounts = () => {
    const allActiveVehicles = vehicles;
    return {
      all: allActiveVehicles.length,
      'on-site': allActiveVehicles.filter(v => getVehicleLocationType(v.location) === 'on-site').length,
      'off-site': allActiveVehicles.filter(v => getVehicleLocationType(v.location) === 'off-site').length,
      'in-transit': allActiveVehicles.filter(v => getVehicleLocationType(v.location) === 'in-transit').length
    };
  };

  const getInventorySummary = () => {
    const counts = getFilterCounts();
    const locationCounts = getLocationFilterCounts();
    
    return {
      totalVehicles: counts.all,
      activeVehicles: counts.active,
      completedVehicles: counts.completed,
      pendingVehicles: counts.pending,
      needsAttention: counts['needs-attention'],
      soldVehicles: counts.sold,
      pendingStatus: counts['vehicle-pending'],
      onSite: locationCounts['on-site'],
      offSite: locationCounts['off-site'],
      inTransit: locationCounts['in-transit']
    };
  };

  const handleInventoryCardClick = (filterType: VehicleFilter) => {
    setVehicleFilter(filterType);
    setActiveView('inventory');
  };

  const handleLocationCardClick = (filterType: LocationFilter) => {
    setLocationFilter(filterType);
    setActiveView('inventory');
  };

  const handleLogout = () => {
    logout();
  };

  const filteredVehicles = getFilteredVehicles();
  const filterCounts = getFilterCounts();
  const locationFilterCounts = getLocationFilterCounts();
  const inventorySummary = getInventorySummary();

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  ReconPro
                </h1>
              </div>
              <div className="ml-4 text-sm text-gray-500 dark:text-gray-400">
                {dealership.name}
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {isDarkMode ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </button>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user.initials}
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user.role}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'inventory', label: 'Inventory', icon: Car },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'locations', label: 'Locations', icon: MapPin },
              { id: 'contacts', label: 'Contacts', icon: Phone },
              { id: 'todos', label: 'Todos', icon: CheckSquare },
              { id: 'settings', label: 'Settings', icon: Settings },
              { id: 'inspection-settings', label: 'Inspection Settings', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveView(id as DashboardView)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeView === id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {activeView === 'inventory' && (
          <div>
            {/* Inventory Summary Cards */}
            <InventorySummary 
              summary={inventorySummary}
              onCardClick={handleInventoryCardClick}
              onLocationCardClick={handleLocationCardClick}
            />

            {/* Filters and Search */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search vehicles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Vehicle Status Filter */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all', label: 'All', count: filterCounts.all },
                      { key: 'active', label: 'Active', count: filterCounts.active },
                      { key: 'completed', label: 'Completed', count: filterCounts.completed },
                      { key: 'pending', label: 'Pending', count: filterCounts.pending },
                      { key: 'needs-attention', label: 'Needs Attention', count: filterCounts['needs-attention'] },
                      { key: 'sold', label: 'Sold', count: filterCounts.sold },
                      { key: 'vehicle-pending', label: 'Vehicle Pending', count: filterCounts['vehicle-pending'] }
                    ].map(({ key, label, count }) => (
                      <button
                        key={key}
                        onClick={() => setVehicleFilter(key as VehicleFilter)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          vehicleFilter === key
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {label} ({count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add Vehicle Button */}
                <button
                  onClick={() => setShowAddVehicle(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Vehicle</span>
                </button>
              </div>

              {/* Location Filter */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Location:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all', label: 'All', count: locationFilterCounts.all },
                      { key: 'on-site', label: 'On-Site', count: locationFilterCounts['on-site'] },
                      { key: 'off-site', label: 'Off-Site', count: locationFilterCounts['off-site'] },
                      { key: 'in-transit', label: 'In-Transit', count: locationFilterCounts['in-transit'] }
                    ].map(({ key, label, count }) => (
                      <button
                        key={key}
                        onClick={() => setLocationFilter(key as LocationFilter)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          locationFilter === key
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {label} ({count})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading vehicles...</span>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="text-center py-12">
                <Car className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No vehicles found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding a vehicle.'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      onClick={() => setShowAddVehicle(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="-ml-1 mr-2 h-5 w-5" />
                      Add Vehicle
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onStatusUpdate={async (updates) => {
                      try {
                        const updatedVehicle = await DatabaseService.updateVehicle(vehicle.id, updates);
                        if (updatedVehicle) {
                          setVehicles(prev => 
                            prev.map(v => v.id === vehicle.id ? updatedVehicle : v)
                          );
                        }
                      } catch (error) {
                        console.error('Error updating vehicle:', error);
                      }
                    }}
                  />
                ))}
              </div>
            )}

            {/* Sold and Pending Vehicles */}
            {(soldVehicles.length > 0 || pendingVehicles.length > 0) && (
              <div className="mt-8 space-y-6">
                {soldVehicles.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Sold Vehicles ({soldVehicles.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {soldVehicles.map((vehicle) => (
                        <VehicleCard
                          key={vehicle.id}
                          vehicle={vehicle}
                          onReactivate={() => handleReactivateVehicle(vehicle.id, 'sold')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {pendingVehicles.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Pending Vehicles ({pendingVehicles.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {pendingVehicles.map((vehicle) => (
                        <VehicleCard
                          key={vehicle.id}
                          vehicle={vehicle}
                          onReactivate={() => handleReactivateVehicle(vehicle.id, 'pending')}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeView === 'analytics' && <AnalyticsOverview dealership={dealership} />}
        {activeView === 'users' && <UserManagement dealership={dealership} />}
        {activeView === 'locations' && <LocationManagement />}
        {activeView === 'contacts' && <ContactManagement />}
        {activeView === 'todos' && <TodoManagement />}
        {activeView === 'settings' && <SettingsPanel />}
        {activeView === 'inspection-settings' && <InspectionSettings />}
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