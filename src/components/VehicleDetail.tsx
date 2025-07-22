import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Vehicle, TeamNote, getStockNumber } from '../types/vehicle';
import { VehicleManager } from '../utils/vehicleManager';
import { InspectionDataManager } from '../utils/inspectionDataManager';
import { InspectionSettings } from '../types/inspectionSettings';
import { PDFGenerator, CustomerComment } from '../utils/pdfGenerator';
import { AnalyticsManager } from '../utils/analytics';
import TeamNotes from './TeamNotes';
import InspectionChecklist from './InspectionChecklist';
import CustomerInspectionPDF from './CustomerInspectionPDF';
import CustomerCommentModal from './CustomerCommentModal';
import { 
  ArrowLeft, 
  Car, 
  MapPin, 
  Calendar, 
  Gauge, 
  DollarSign, 
  Hash, 
  Palette,
  Edit3,
  Save,
  X,
  FileText,
  MessageSquare,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Circle,
  Eye,
  Download,
  Printer,
  Mail,
  Archive,
  RotateCcw,
  Target
} from 'lucide-react';

const VehicleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { dealership, user } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [customerComments, setCustomerComments] = useState<CustomerComment[]>([]);
  const [inspectionSettings, setInspectionSettings] = useState<InspectionSettings | null>(null);
  const [inspectionData, setInspectionData] = useState<any>({});
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedVin, setEditedVin] = useState('');
  const [editedYear, setEditedYear] = useState<number>(new Date().getFullYear());
  const [editedMake, setEditedMake] = useState('');
  const [editedModel, setEditedModel] = useState('');
  const [editedTrim, setEditedTrim] = useState('');
  const [editedMileage, setEditedMileage] = useState<number>(0);
  const [editedColor, setEditedColor] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedPrice, setEditedPrice] = useState<number>(0);
  const [editedNotes, setEditedNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id && dealership) {
      loadVehicle();
      loadInspectionSettings();
      loadCustomerComments();
    }
  }, [id, dealership]);

  const loadVehicle = async () => {
    if (!id || !dealership) return;
    
    try {
      const vehicleData = await VehicleManager.getVehicleById(dealership.id, id);
      if (vehicleData) {
        setVehicle(vehicleData);
        // Initialize edit form with current values
        setEditedVin(vehicleData.vin);
        setEditedYear(vehicleData.year);
        setEditedMake(vehicleData.make);
        setEditedModel(vehicleData.model);
        setEditedTrim(vehicleData.trim || '');
        setEditedMileage(vehicleData.mileage);
        setEditedColor(vehicleData.color);
        setEditedLocation(vehicleData.location);
        setEditedPrice(vehicleData.price || 0);
        setEditedNotes(vehicleData.notes || '');
      } else {
        console.error('Vehicle not found');
        navigate('/');
      }
    } catch (error) {
      console.error('Error loading vehicle:', error);
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const loadInspectionSettings = async () => {
    if (!dealership) return;
    
    try {
      await InspectionDataManager.initializeDefaultSettings(dealership.id);
      const settings = await InspectionDataManager.getSettings(dealership.id);
      setInspectionSettings(settings);
    } catch (error) {
      console.error('Error loading inspection settings:', error);
    }
  };

  const loadCustomerComments = () => {
    if (!id) return;
    
    const savedComments = localStorage.getItem(`vehicle_customer_comments_${id}`);
    if (savedComments) {
      try {
        setCustomerComments(JSON.parse(savedComments));
      } catch (error) {
        console.error('Error loading customer comments:', error);
        setCustomerComments([]);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!vehicle || !dealership) return;
    
    setIsSaving(true);
    try {
      const updates = {
        vin: editedVin,
        year: editedYear,
        make: editedMake,
        model: editedModel,
        trim: editedTrim || undefined,
        mileage: editedMileage,
        color: editedColor,
        location: editedLocation,
        price: editedPrice,
        notes: editedNotes || undefined
      };

      const updatedVehicle = await VehicleManager.updateVehicle(dealership.id, vehicle.id, updates);
      if (updatedVehicle) {
        setVehicle(updatedVehicle);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      alert('Failed to update vehicle. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (!vehicle) return;
    
    // Reset form to original values
    setEditedVin(vehicle.vin);
    setEditedYear(vehicle.year);
    setEditedMake(vehicle.make);
    setEditedModel(vehicle.model);
    setEditedTrim(vehicle.trim || '');
    setEditedMileage(vehicle.mileage);
    setEditedColor(vehicle.color);
    setEditedLocation(vehicle.location);
    setEditedPrice(vehicle.price || 0);
    setEditedNotes(vehicle.notes || '');
    setIsEditing(false);
  };

  const handleAddTeamNote = async (noteData: Omit<TeamNote, 'id' | 'timestamp'>) => {
    if (!vehicle || !dealership) return;

    const newNote: TeamNote = {
      ...noteData,
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    const updatedNotes = [newNote, ...(vehicle.teamNotes || [])];
    
    try {
      const updatedVehicle = await VehicleManager.updateVehicle(dealership.id, vehicle.id, {
        teamNotes: updatedNotes
      });
      
      if (updatedVehicle) {
        setVehicle(updatedVehicle);
      }
    } catch (error) {
      console.error('Error adding team note:', error);
    }
  };

  const handleInspectionDataChange = (data: any) => {
    setInspectionData(data);
  };

  const handleAddCustomerComment = (commentData: Omit<CustomerComment, 'id' | 'timestamp'>) => {
    const newComment: CustomerComment = {
      ...commentData,
      id: `comment-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    
    const updatedComments = [newComment, ...customerComments];
    setCustomerComments(updatedComments);
    
    // Save to localStorage
    if (id) {
      localStorage.setItem(`vehicle_customer_comments_${id}`, JSON.stringify(updatedComments));
    }
  };

  const handleMarkAsSold = async () => {
    if (!vehicle || !dealership || !user) return;
    
    const soldPrice = prompt('Enter the sold price:');
    if (!soldPrice) return;
    
    const price = parseFloat(soldPrice);
    if (isNaN(price)) {
      alert('Please enter a valid price');
      return;
    }

    try {
      const updatedVehicle = await VehicleManager.markVehicleAsSold(
        dealership.id, 
        vehicle.id, 
        user.initials, 
        new Date().toISOString()
      );
      
      if (updatedVehicle) {
        setVehicle(updatedVehicle);
        alert('Vehicle marked as sold!');
      }
    } catch (error) {
      console.error('Error marking vehicle as sold:', error);
      alert('Failed to mark vehicle as sold. Please try again.');
    }
  };

  const handleMarkAsPending = async () => {
    if (!vehicle || !dealership || !user) return;
    
    const reason = prompt('Enter reason for pending status:');
    if (!reason) return;

    try {
      const updatedVehicle = await VehicleManager.markVehicleAsPending(
        dealership.id, 
        vehicle.id, 
        user.initials, 
        new Date().toISOString()
      );
      
      if (updatedVehicle) {
        setVehicle(updatedVehicle);
        alert('Vehicle marked as pending!');
      }
    } catch (error) {
      console.error('Error marking vehicle as pending:', error);
      alert('Failed to mark vehicle as pending. Please try again.');
    }
  };

  const handleReactivateVehicle = async () => {
    if (!vehicle || !dealership || !user) return;
    
    const fromType = vehicle.isSold ? 'sold' : 'pending';
    
    try {
      const updatedVehicle = await VehicleManager.reactivateVehicle(
        dealership.id, 
        vehicle.id, 
        user.initials, 
        fromType
      );
      
      if (updatedVehicle) {
        setVehicle(updatedVehicle);
        alert(`Vehicle reactivated from ${fromType} status!`);
      }
    } catch (error) {
      console.error('Error reactivating vehicle:', error);
      alert('Failed to reactivate vehicle. Please try again.');
    }
  };

  const getDaysInInventory = () => {
    if (!vehicle) return 0;
    const acquiredDate = new Date(vehicle.dateAcquired);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - acquiredDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getVisibleSections = () => {
    if (!inspectionSettings) return [];
    return inspectionSettings.sections
      .filter(section => section.isActive && section.isCustomerVisible)
      .map(section => ({
        key: section.key,
        label: section.label
      }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-800/30 dark:to-gray-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Car className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading vehicle details...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-800/30 dark:to-gray-900/20 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Vehicle Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The requested vehicle could not be found.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const stockNumber = getStockNumber(vehicle.vin);
  const daysInInventory = getDaysInInventory();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-800/30 dark:to-gray-900/20 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-white/20 dark:border-gray-700/20 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 sm:py-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Car className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Stock #{stockNumber} • {daysInInventory} days in inventory
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="space-y-6 sm:space-y-8">
          {/* Vehicle Information */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 transition-colors duration-300">
            <div className="p-4 sm:p-6 border-b border-gray-200/60 dark:border-gray-700/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Vehicle Information</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Basic vehicle details and specifications</p>
                </div>
                {/* Desktop Edit Button */}
                <button
                  onClick={() => setIsEditing(true)}
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Vehicle
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              {isEditing ? (
                /* Edit Form */
                <div className="space-y-4 sm:space-y-6">
                  <div className="mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">Edit Vehicle Information</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Update vehicle details below</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        VIN Number
                      </label>
                      <input
                        type="text"
                        value={editedVin}
                        onChange={(e) => setEditedVin(e.target.value)}
                        className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        maxLength={17}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Year
                      </label>
                      <input
                        type="number"
                        value={editedYear}
                        onChange={(e) => setEditedYear(parseInt(e.target.value))}
                        className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Make
                      </label>
                      <input
                        type="text"
                        value={editedMake}
                        onChange={(e) => setEditedMake(e.target.value)}
                        className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Model
                      </label>
                      <input
                        type="text"
                        value={editedModel}
                        onChange={(e) => setEditedModel(e.target.value)}
                        className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Trim
                      </label>
                      <input
                        type="text"
                        value={editedTrim}
                        onChange={(e) => setEditedTrim(e.target.value)}
                        className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Mileage
                      </label>
                      <input
                        type="number"
                        value={editedMileage}
                        onChange={(e) => setEditedMileage(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Color
                      </label>
                      <input
                        type="text"
                        value={editedColor}
                        onChange={(e) => setEditedColor(e.target.value)}
                        className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={editedLocation}
                        onChange={(e) => setEditedLocation(e.target.value)}
                        className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Price
                      </label>
                      <input
                        type="number"
                        value={editedPrice}
                        onChange={(e) => setEditedPrice(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                        placeholder="Enter any notes about this vehicle..."
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-base"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors font-medium text-base"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 sm:p-4 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">VIN</span>
                      </div>
                      <p className="text-sm sm:text-base font-mono text-gray-900 dark:text-white break-all">{vehicle.vin}</p>
                    </div>

                    <div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 sm:p-4 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Year</span>
                      </div>
                      <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{vehicle.year}</p>
                    </div>

                    <div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 sm:p-4 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                      <div className="flex items-center gap-2 mb-2">
                        <Car className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Make & Model</span>
                      </div>
                      <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                        {vehicle.make} {vehicle.model}
                        {vehicle.trim && <span className="text-gray-600 dark:text-gray-400 ml-1">({vehicle.trim})</span>}
                      </p>
                    </div>

                    <div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 sm:p-4 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                      <div className="flex items-center gap-2 mb-2">
                        <Gauge className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Mileage</span>
                      </div>
                      <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{vehicle.mileage.toLocaleString()} miles</p>
                    </div>

                    <div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 sm:p-4 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                      <div className="flex items-center gap-2 mb-2">
                        <Palette className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Color</span>
                      </div>
                      <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{vehicle.color}</p>
                    </div>

                    <div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 sm:p-4 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Location</span>
                      </div>
                      <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{vehicle.location}</p>
                    </div>

                    <div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 sm:p-4 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Date Acquired</span>
                      </div>
                      <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{formatDate(vehicle.dateAcquired)}</p>
                    </div>

                    {vehicle.price && vehicle.price > 0 && (
                      <div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 sm:p-4 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Price</span>
                        </div>
                        <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">${vehicle.price.toLocaleString()}</p>
                      </div>
                    )}

                    {vehicle.targetSaleDate && (
                      <div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 sm:p-4 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Target Sale Date</span>
                        </div>
                        <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{formatDate(vehicle.targetSaleDate)}</p>
                      </div>
                    )}
                  </div>

                  {/* Vehicle Notes */}
                  {vehicle.notes && (
                    <div className="bg-amber-50/80 dark:bg-amber-900/60 backdrop-blur-sm p-3 sm:p-4 rounded-lg border border-amber-200/60 dark:border-amber-800/60">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                        <span className="text-sm font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wide">Vehicle Notes</span>
                      </div>
                      <p className="text-sm sm:text-base text-amber-700 dark:text-amber-100 leading-relaxed">{vehicle.notes}</p>
                    </div>
                  )}

                  {/* Mobile Edit Button - At bottom of Vehicle Information section */}
                  <div className="sm:hidden pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-base"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Vehicle Information
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Status Actions */}
          {!isEditing && (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 p-4 sm:p-6 transition-colors duration-300">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">Vehicle Actions</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                {vehicle.isSold || vehicle.isPending ? (
                  <button
                    onClick={handleReactivateVehicle}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reactivate Vehicle
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleMarkAsSold}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      <Archive className="w-4 h-4" />
                      Mark as Sold
                    </button>
                    <button
                      onClick={handleMarkAsPending}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                    >
                      <Clock className="w-4 h-4" />
                      Mark as Pending
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowPdfModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <FileText className="w-4 h-4" />
                  Generate PDF
                </button>
                <button
                  onClick={() => setShowCommentModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <MessageSquare className="w-4 h-4" />
                  Add Note
                </button>
              </div>
            </div>
          )}

          {/* Inspection Checklist */}
          {!isEditing && inspectionSettings && (
            <InspectionChecklist
              vehicleId={vehicle.id}
              vehicleName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              vehicle={vehicle}
              onStatusUpdate={() => {}}
              onSectionComplete={() => {}}
              onAddTeamNote={handleAddTeamNote}
              activeFilter={activeFilter}
              onGeneratePdf={() => setShowPdfModal(true)}
              onInspectionDataChange={handleInspectionDataChange}
              onTeamNoteAdded={handleAddTeamNote}
            />
          )}

          {/* Team Notes */}
          {!isEditing && (
            <TeamNotes
              notes={vehicle.teamNotes || []}
              onAddNote={handleAddTeamNote}
            />
          )}
        </div>
      </div>

      {/* Customer PDF Modal */}
      <CustomerInspectionPDF
        vehicle={vehicle}
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
      />

      {/* Customer Comment Modal */}
      <CustomerCommentModal
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        onSave={handleAddCustomerComment}
        sections={getVisibleSections()}
      />
    </div>
  );
};

export default VehicleDetail;