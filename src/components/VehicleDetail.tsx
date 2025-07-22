import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Vehicle, TeamNote, getStockNumber } from '../types/vehicle';
import { VehicleManager } from '../utils/vehicleManager';
import { InspectionDataManager } from '../utils/inspectionDataManager';
import { InspectionSettings } from '../types/inspectionSettings';
import { PDFGenerator, CustomerComment } from '../utils/pdfGenerator';
import { 
  ArrowLeft, 
  Edit3, 
  Save, 
  X, 
  Car, 
  Calendar, 
  MapPin, 
  Gauge, 
  DollarSign, 
  Hash, 
  Palette,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Circle,
  MessageSquare,
  Download,
  Eye,
  Printer
} from 'lucide-react';
import TeamNotes from './TeamNotes';
import InspectionChecklist from './InspectionChecklist';
import CustomerInspectionPDF from './CustomerInspectionPDF';

const VehicleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { dealership, user } = useAuth();
  
  // Vehicle state
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedVehicle, setEditedVehicle] = useState<Partial<Vehicle>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Inspection state
  const [inspectionData, setInspectionData] = useState<any>({});
  const [inspectionSettings, setInspectionSettings] = useState<InspectionSettings | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  // PDF state
  const [showPdfModal, setShowPdfModal] = useState(false);
  
  // Notes editing
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');

  useEffect(() => {
    if (id && dealership) {
      loadVehicle();
      loadInspectionSettings();
    }
  }, [id, dealership]);

  const loadVehicle = async () => {
    if (!id || !dealership) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const vehicleData = await VehicleManager.getVehicleById(dealership.id, id);
      if (vehicleData) {
        setVehicle(vehicleData);
        setEditedNotes(vehicleData.notes || '');
      } else {
        setError('Vehicle not found');
      }
    } catch (err) {
      console.error('Error loading vehicle:', err);
      setError('Failed to load vehicle');
    } finally {
      setIsLoading(false);
    }
  };

  const loadInspectionSettings = async () => {
    if (!dealership) return;
    
    try {
      const settings = await InspectionDataManager.getSettings(dealership.id);
      setInspectionSettings(settings);
    } catch (error) {
      console.error('Error loading inspection settings:', error);
    }
  };

  const handleEdit = () => {
    if (vehicle) {
      setEditedVehicle({
        vin: vehicle.vin,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim,
        mileage: vehicle.mileage,
        color: vehicle.color,
        location: vehicle.location,
        price: vehicle.price,
        dateAcquired: vehicle.dateAcquired,
        targetSaleDate: vehicle.targetSaleDate
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!vehicle || !dealership) return;
    
    setIsSaving(true);
    try {
      const updatedVehicle = await VehicleManager.updateVehicle(
        dealership.id,
        vehicle.id,
        editedVehicle
      );
      
      if (updatedVehicle) {
        setVehicle(updatedVehicle);
        setIsEditing(false);
        setEditedVehicle({});
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      alert('Failed to update vehicle. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedVehicle({});
  };

  const handleNotesEdit = () => {
    setIsEditingNotes(true);
  };

  const handleNotesSave = async () => {
    if (!vehicle || !dealership) return;
    
    try {
      const updatedVehicle = await VehicleManager.updateVehicle(
        dealership.id,
        vehicle.id,
        { notes: editedNotes.trim() || undefined }
      );
      
      if (updatedVehicle) {
        setVehicle(updatedVehicle);
        setIsEditingNotes(false);
      }
    } catch (error) {
      console.error('Error updating notes:', error);
      alert('Failed to update notes. Please try again.');
    }
  };

  const handleNotesCancel = () => {
    setEditedNotes(vehicle?.notes || '');
    setIsEditingNotes(false);
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
      const updatedVehicle = await VehicleManager.updateVehicle(
        dealership.id,
        vehicle.id,
        { teamNotes: updatedNotes }
      );
      
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

  const handleTeamNoteAdded = (note: TeamNote) => {
    if (vehicle) {
      const updatedVehicle = {
        ...vehicle,
        teamNotes: [note, ...(vehicle.teamNotes || [])]
      };
      setVehicle(updatedVehicle);
    }
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

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-800/30 dark:to-gray-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Vehicle Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'The requested vehicle could not be found.'}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const stockNumber = getStockNumber(vehicle.vin);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-800/30 dark:to-gray-900/20">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-white/20 dark:border-gray-700/20 sticky top-0 z-10">
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
                  Stock #{stockNumber} • {vehicle.color}
                </p>
              </div>
            </div>
            
            {/* Desktop Edit Button */}
            <div className="hidden sm:flex items-center gap-3">
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Vehicle
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Vehicle Information */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Vehicle Information</h2>
            </div>

            {isEditing ? (
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">VIN</label>
                    <input
                      type="text"
                      value={editedVehicle.vin || ''}
                      onChange={(e) => setEditedVehicle(prev => ({ ...prev, vin: e.target.value }))}
                      className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Year</label>
                    <input
                      type="number"
                      value={editedVehicle.year || ''}
                      onChange={(e) => setEditedVehicle(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                      className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Make</label>
                    <input
                      type="text"
                      value={editedVehicle.make || ''}
                      onChange={(e) => setEditedVehicle(prev => ({ ...prev, make: e.target.value }))}
                      className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Model</label>
                    <input
                      type="text"
                      value={editedVehicle.model || ''}
                      onChange={(e) => setEditedVehicle(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Trim</label>
                    <input
                      type="text"
                      value={editedVehicle.trim || ''}
                      onChange={(e) => setEditedVehicle(prev => ({ ...prev, trim: e.target.value }))}
                      className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mileage</label>
                    <input
                      type="number"
                      value={editedVehicle.mileage || ''}
                      onChange={(e) => setEditedVehicle(prev => ({ ...prev, mileage: parseInt(e.target.value) }))}
                      className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
                    <input
                      type="text"
                      value={editedVehicle.color || ''}
                      onChange={(e) => setEditedVehicle(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                    <input
                      type="text"
                      value={editedVehicle.location || ''}
                      onChange={(e) => setEditedVehicle(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Price</label>
                    <input
                      type="number"
                      value={editedVehicle.price || ''}
                      onChange={(e) => setEditedVehicle(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Mobile Save/Cancel Buttons */}
                <div className="flex flex-col sm:hidden gap-3 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 text-base"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium text-base"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="flex items-center gap-3">
                    <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">VIN</p>
                      <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white font-mono">{vehicle.vin}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Year</p>
                      <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{vehicle.year}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Car className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Make & Model</p>
                      <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{vehicle.make} {vehicle.model}</p>
                    </div>
                  </div>
                  
                  {vehicle.trim && (
                    <div className="flex items-center gap-3">
                      <Car className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500" />
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Trim</p>
                        <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{vehicle.trim}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Mileage</p>
                      <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{vehicle.mileage.toLocaleString()} miles</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Color</p>
                      <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{vehicle.color}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Location</p>
                      <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{vehicle.location}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Price</p>
                      <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">${vehicle.price?.toLocaleString() || 'Not set'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Date Acquired</p>
                      <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                        {new Date(vehicle.dateAcquired).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mobile Edit Button - At bottom of Vehicle Information */}
                <div className="flex sm:hidden justify-center pt-4 border-t border-gray-200/60 dark:border-gray-700/60 mt-6">
                  <button
                    onClick={handleEdit}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-base"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Vehicle Information
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Vehicle Notes */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Vehicle Notes
              </h3>
              {!isEditingNotes && (
                <button
                  onClick={handleNotesEdit}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit Notes</span>
                  <span className="sm:hidden">Edit</span>
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-4">
                <textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  placeholder="Add notes about this vehicle's condition, issues, or important information..."
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleNotesSave}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <Save className="w-4 h-4" />
                    Save Notes
                  </button>
                  <button
                    onClick={handleNotesCancel}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {vehicle.notes ? (
                  <div className="p-4 bg-amber-50/80 dark:bg-amber-900/60 backdrop-blur-sm rounded-lg border border-amber-200/60 dark:border-amber-800/60">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                          <span className="text-sm font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wide">Important Notes</span>
                        </div>
                        <p className="text-sm sm:text-base text-amber-700 dark:text-amber-100 font-medium leading-relaxed whitespace-pre-wrap">
                          {vehicle.notes}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                    <p className="text-sm sm:text-base">No notes added yet. Click "Edit Notes" to add important information about this vehicle.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Inspection Checklist */}
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
            onTeamNoteAdded={handleTeamNoteAdded}
          />

          {/* Team Notes */}
          <TeamNotes
            notes={vehicle.teamNotes || []}
            onAddNote={handleAddTeamNote}
          />
        </div>
      </div>

      {/* Customer PDF Modal */}
      <CustomerInspectionPDF
        vehicle={vehicle}
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
      />
    </div>
  );
};

export default VehicleDetail;