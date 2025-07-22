import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Vehicle, TeamNote, getStockNumber } from '../types/vehicle';
import { VehicleManager } from '../utils/vehicleManager';
import { InspectionDataManager } from '../utils/inspectionDataManager';
import { InspectionSettings } from '../types/inspectionSettings';
import { AnalyticsManager } from '../utils/analytics';
import { 
  ArrowLeft, 
  Car, 
  Calendar, 
  MapPin, 
  Gauge, 
  Palette, 
  DollarSign, 
  Hash, 
  FileText, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Circle,
  Filter,
  X,
  Eye,
  Edit3,
  Save
} from 'lucide-react';
import InspectionChecklist from './InspectionChecklist';
import TeamNotes from './TeamNotes';
import CustomerInspectionPDF from './CustomerInspectionPDF';

interface VehicleEditModalProps {
  vehicle: Vehicle;
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicleData: Partial<Vehicle>) => void;
}

const VehicleEditModal: React.FC<VehicleEditModalProps> = ({ vehicle, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    vin: vehicle.vin,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim || '',
    mileage: vehicle.mileage.toString(),
    color: vehicle.color,
    dateAcquired: vehicle.dateAcquired,
    targetSaleDate: vehicle.targetSaleDate || '',
    price: vehicle.price.toString(),
    location: vehicle.location,
    notes: vehicle.notes || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.vin.trim()) newErrors.vin = 'VIN is required';
    if (formData.vin.length !== 17) newErrors.vin = 'VIN must be 17 characters';
    if (!formData.make.trim()) newErrors.make = 'Make is required';
    if (!formData.model.trim()) newErrors.model = 'Model is required';
    if (!formData.color.trim()) newErrors.color = 'Color is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (formData.year < 1900 || formData.year > new Date().getFullYear() + 1) {
      newErrors.year = 'Please enter a valid year';
    }
    
    const mileageNum = parseInt(formData.mileage);
    if (!formData.mileage.trim()) {
      newErrors.mileage = 'Mileage is required';
    } else if (isNaN(mileageNum) || mileageNum < 0) {
      newErrors.mileage = 'Please enter a valid mileage';
    }

    const priceNum = parseFloat(formData.price);
    if (!formData.price.trim()) {
      newErrors.price = 'Price is required';
    } else if (isNaN(priceNum) || priceNum < 0) {
      newErrors.price = 'Please enter a valid price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const updatedVehicleData: Partial<Vehicle> = {
        vin: formData.vin.toUpperCase(),
        year: formData.year,
        make: formData.make.trim(),
        model: formData.model.trim(),
        trim: formData.trim.trim() || undefined,
        mileage: parseInt(formData.mileage),
        color: formData.color.trim(),
        dateAcquired: formData.dateAcquired,
        targetSaleDate: formData.targetSaleDate || undefined,
        price: parseFloat(formData.price),
        location: formData.location.trim(),
        notes: formData.notes.trim() || undefined
      };

      onSave(updatedVehicleData);
    } catch (error) {
      console.error('Error in form submission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const popularMakes = [
    'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 'Dodge',
    'Ford', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jeep', 'Kia', 'Lexus',
    'Lincoln', 'Mazda', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Ram', 'Subaru',
    'Tesla', 'Toyota', 'Volkswagen', 'Volvo'
  ];

  const popularColors = [
    'Black', 'White', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Brown',
    'Gold', 'Orange', 'Yellow', 'Purple', 'Pearl White', 'Metallic Silver',
    'Midnight Black', 'Deep Blue', 'Forest Green', 'Burgundy'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/20 dark:border-gray-700/20">
        <div className="sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-b border-gray-200/60 dark:border-gray-700/60 px-4 sm:px-6 py-4 rounded-t-xl sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Edit Vehicle Information</h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Update vehicle details and information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Vehicle Identification */}
          <div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
              <Car className="w-4 h-4 sm:w-5 sm:h-5" />
              Vehicle Identification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  VIN Number *
                </label>
                <input
                  type="text"
                  value={formData.vin}
                  onChange={(e) => handleInputChange('vin', e.target.value.toUpperCase())}
                  placeholder="Enter 17-character VIN"
                  maxLength={17}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.vin ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.vin && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.vin}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Year *
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.year ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.year && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.year}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Make *
                </label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => handleInputChange('make', e.target.value)}
                  placeholder="e.g., Honda"
                  list="makes"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.make ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                <datalist id="makes">
                  {popularMakes.map(make => (
                    <option key={make} value={make} />
                  ))}
                </datalist>
                {errors.make && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.make}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model *
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  placeholder="e.g., Accord"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.model ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.model && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.model}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Trim Level
                </label>
                <input
                  type="text"
                  value={formData.trim}
                  onChange={(e) => handleInputChange('trim', e.target.value)}
                  placeholder="e.g., Sport, LX, EX"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          <div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5" />
              Vehicle Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mileage *
                </label>
                <input
                  type="text"
                  value={formData.mileage}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                    handleInputChange('mileage', numericValue);
                  }}
                  placeholder="Enter mileage"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.mileage ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.mileage && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.mileage}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Palette className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  Color *
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="e.g., Pearl White"
                  list="colors"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.color ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                <datalist id="colors">
                  {popularColors.map(color => (
                    <option key={color} value={color} />
                  ))}
                </datalist>
                {errors.color && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.color}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="e.g., Lot A-12, Indoor-05"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.location ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.location && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.location}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  Price *
                </label>
                <input
                  type="text"
                  value={formData.price}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9.]/g, '');
                    handleInputChange('price', numericValue);
                  }}
                  placeholder="Enter price"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.price ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.price && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.price}</p>}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              Important Dates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Acquired *
                </label>
                <input
                  type="date"
                  value={formData.dateAcquired}
                  onChange={(e) => handleInputChange('dateAcquired', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Sale Date
                </label>
                <input
                  type="date"
                  value={formData.targetSaleDate}
                  onChange={(e) => handleInputChange('targetSaleDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Vehicle Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Add any notes about this vehicle..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 sm:px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 font-semibold text-sm sm:text-base disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const VehicleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { dealership, user } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inspectionSettings, setInspectionSettings] = useState<InspectionSettings | null>(null);
  const [showCustomerPdf, setShowCustomerPdf] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [inspectionData, setInspectionData] = useState<any>({});
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);

  useEffect(() => {
    if (dealership && id) {
      loadVehicle();
      loadInspectionSettings();
    }
  }, [dealership, id]);

  const loadVehicle = async () => {
    if (!dealership || !id) return;
    
    try {
      const vehicleData = await VehicleManager.getVehicleById(dealership.id, id);
      if (vehicleData) {
        setVehicle(vehicleData);
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

  const handleStatusUpdate = async (section: string, status: any) => {
    if (!dealership || !vehicle) return;

    try {
      const updatedVehicle = await VehicleManager.updateVehicleStatus(dealership.id, vehicle.id, section, status);
      if (updatedVehicle) {
        setVehicle(updatedVehicle);
      }
    } catch (error) {
      console.error('Error updating vehicle status:', error);
    }
  };

  const handleSectionComplete = async (section: string, userInitials: string) => {
    if (!vehicle) return;

    // Record analytics for section completion
    AnalyticsManager.recordCompletion(
      vehicle.id,
      `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      section as any,
      userInitials
    );
  };

  const handleAddTeamNote = async (noteData: Omit<TeamNote, 'id' | 'timestamp'>) => {
    if (!dealership || !vehicle) return;

    const newNote: TeamNote = {
      ...noteData,
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    try {
      const updatedVehicle = await VehicleManager.addTeamNote(dealership.id, vehicle.id, newNote);
      if (updatedVehicle) {
        setVehicle(updatedVehicle);
      }
    } catch (error) {
      console.error('Error adding team note:', error);
    }
  };

  const handleVehicleUpdate = async (updatedVehicleData: Partial<Vehicle>) => {
    if (!dealership) return;

    try {
      const updatedVehicle = await VehicleManager.updateVehicle(dealership.id, vehicle.id, updatedVehicleData);
      if (updatedVehicle) {
        setVehicle(updatedVehicle);
        setIsEditingVehicle(false);
        alert('Vehicle information updated successfully!');
      } else {
        alert('Failed to update vehicle information. Please try again.');
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      alert('Error updating vehicle information. Please try again.');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysInInventory = () => {
    if (!vehicle) return 0;
    const acquiredDate = new Date(vehicle.dateAcquired);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - acquiredDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getActiveSections = () => {
    if (!inspectionSettings) return [];
    return inspectionSettings.sections
      .filter(section => section.isActive)
      .sort((a, b) => a.order - b.order);
  };

  const filteredSections = activeFilter 
    ? getActiveSections().filter(section => section.key === activeFilter)
    : getActiveSections();

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
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Stock #{stockNumber}</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowCustomerPdf(true)}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Customer PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Vehicle Info & Notes */}
          <div className="lg:col-span-1 space-y-6">
            {/* Vehicle Information */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 p-4 sm:p-6 transition-colors duration-300">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">Vehicle Information</h2>
              
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                      <Hash className="w-3 h-3 inline mr-1" />
                      Stock Number
                    </label>
                    <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{stockNumber}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Days in Inventory
                    </label>
                    <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{daysInInventory} days</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                    VIN
                  </label>
                  <p className="text-sm sm:text-base font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-white">{vehicle.vin}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                      <Gauge className="w-3 h-3 inline mr-1" />
                      Mileage
                    </label>
                    <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{vehicle.mileage.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                      <Palette className="w-3 h-3 inline mr-1" />
                      Color
                    </label>
                    <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{vehicle.color}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    Location
                  </label>
                  <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{vehicle.location}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Date Acquired
                    </label>
                    <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{formatDate(vehicle.dateAcquired)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                      <DollarSign className="w-3 h-3 inline mr-1" />
                      Price
                    </label>
                    <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">${vehicle.price.toLocaleString()}</p>
                  </div>
                </div>

                {vehicle.targetSaleDate && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Target Sale Date
                    </label>
                    <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{formatDate(vehicle.targetSaleDate)}</p>
                  </div>
                )}
              </div>

              {/* Edit Button */}
              <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
                <button
                  onClick={() => setIsEditingVehicle(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Vehicle Information
                </button>
              </div>
            </div>

            {/* Vehicle Edit Modal */}
            {isEditingVehicle && (
              <VehicleEditModal
                vehicle={vehicle}
                isOpen={isEditingVehicle}
                onClose={() => setIsEditingVehicle(false)}
                onSave={handleVehicleUpdate}
              />
            )}

            {/* Vehicle Notes Section */}
            {vehicle.notes && (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 p-4 sm:p-6 transition-colors duration-300">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Vehicle Notes
                </h3>
                <div className="p-3 sm:p-4 bg-amber-50/80 dark:bg-amber-900/60 backdrop-blur-sm rounded-lg border border-amber-200/60 dark:border-amber-800/60">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-300" />
                    </div>
                    <p className="text-sm sm:text-base text-amber-700 dark:text-amber-100 font-medium leading-relaxed">
                      {vehicle.notes}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Team Notes */}
            <TeamNotes 
              notes={vehicle.teamNotes || []} 
              onAddNote={handleAddTeamNote}
            />
          </div>

          {/* Right Column - Inspection */}
          <div className="lg:col-span-2">
            {/* Section Filter */}
            {inspectionSettings && (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 mb-6 transition-colors duration-300">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter sections:</span>
                  <button
                    onClick={() => setActiveFilter(null)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      activeFilter === null
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    All Sections
                  </button>
                  {getActiveSections().map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveFilter(activeFilter === section.key ? null : section.key)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        activeFilter === section.key
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {section.icon} {section.label}
                    </button>
                  ))}
                  {activeFilter && (
                    <button
                      onClick={() => setActiveFilter(null)}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                      title="Clear filter"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Inspection Checklist */}
            <InspectionChecklist
              vehicleId={vehicle.id}
              vehicleName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              vehicle={vehicle}
              onStatusUpdate={handleStatusUpdate}
              onSectionComplete={handleSectionComplete}
              onAddTeamNote={handleAddTeamNote}
              activeFilter={activeFilter}
              onGeneratePdf={() => setShowCustomerPdf(true)}
              onInspectionDataChange={setInspectionData}
              onTeamNoteAdded={(note) => {
                setVehicle(prev => prev ? {
                  ...prev,
                  teamNotes: [note, ...(prev.teamNotes || [])]
                } : null);
              }}
            />
          </div>
        </div>
      </div>

      {/* Customer PDF Modal */}
      <CustomerInspectionPDF
        vehicle={vehicle}
        isOpen={showCustomerPdf}
        onClose={() => setShowCustomerPdf(false)}
      />
    </div>
  );
};

export default VehicleDetail;