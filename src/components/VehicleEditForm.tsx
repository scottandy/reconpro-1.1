import React, { useState, useEffect } from 'react';
import { Vehicle } from '../types/vehicle';
import { Save, X } from 'lucide-react';

interface VehicleEditFormProps {
  vehicle: Vehicle;
  onSave: (vehicleId: string, updatedVehicle: Partial<Vehicle>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const VehicleEditForm: React.FC<VehicleEditFormProps> = ({ vehicle, onSave, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    vin: vehicle.vin,
    year: vehicle.year.toString(),
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate vehicle ID first
    if (!vehicle.id || vehicle.id.trim() === '') {
      newErrors.general = 'Invalid vehicle ID. Cannot save changes.';
      setErrors(newErrors);
      return false;
    }

    if (!formData.vin.trim()) newErrors.vin = 'VIN is required';
    if (formData.vin.length !== 17) newErrors.vin = 'VIN must be 17 characters';
    if (!formData.year.trim()) newErrors.year = 'Year is required';
    if (!formData.make.trim()) newErrors.make = 'Make is required';
    if (!formData.model.trim()) newErrors.model = 'Model is required';
    if (!formData.color.trim()) newErrors.color = 'Color is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.mileage.trim()) newErrors.mileage = 'Mileage is required';
    if (!formData.price.trim()) newErrors.price = 'Price is required';

    const year = parseInt(formData.year);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      newErrors.year = 'Please enter a valid year';
    }

    const mileage = parseInt(formData.mileage);
    if (isNaN(mileage) || mileage < 0) {
      newErrors.mileage = 'Please enter a valid mileage';
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      newErrors.price = 'Please enter a valid price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const updatedVehicle: Partial<Vehicle> = {
      vin: formData.vin.toUpperCase(),
      year: parseInt(formData.year),
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

    onSave(vehicle.id, updatedVehicle);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* VIN */}
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            VIN *
          </label>
          <input
            type="text"
            value={formData.vin}
            onChange={(e) => handleInputChange('vin', e.target.value.toUpperCase())}
            maxLength={17}
            className={`w-full px-2 sm:px-3 py-1 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono ${
              errors.vin ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Enter 17-character VIN"
          />
          {errors.vin && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.vin}</p>}
        </div>

        {/* General Error Message */}
        {errors.general && (
          <div className="sm:col-span-2 lg:col-span-3">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">{errors.general}</p>
            </div>
          </div>
        )}

        {/* Year */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            Year *
          </label>
          <input
            type="number"
            value={formData.year}
            onChange={(e) => handleInputChange('year', e.target.value)}
            min="1900"
            max={new Date().getFullYear() + 1}
            className={`w-full px-2 sm:px-3 py-1 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.year ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.year && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.year}</p>}
        </div>

        {/* Make */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            Make *
          </label>
          <input
            type="text"
            value={formData.make}
            onChange={(e) => handleInputChange('make', e.target.value)}
            className={`w-full px-2 sm:px-3 py-1 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.make ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="e.g., Honda"
          />
          {errors.make && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.make}</p>}
        </div>

        {/* Model */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            Model *
          </label>
          <input
            type="text"
            value={formData.model}
            onChange={(e) => handleInputChange('model', e.target.value)}
            className={`w-full px-2 sm:px-3 py-1 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.model ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="e.g., Accord"
          />
          {errors.model && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.model}</p>}
        </div>

        {/* Trim */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            Trim
          </label>
          <input
            type="text"
            value={formData.trim}
            onChange={(e) => handleInputChange('trim', e.target.value)}
            className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Sport, LX"
          />
        </div>

        {/* Mileage */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            Mileage *
          </label>
          <input
            type="text"
            value={formData.mileage}
            onChange={(e) => {
              const numericValue = e.target.value.replace(/[^0-9]/g, '');
              handleInputChange('mileage', numericValue);
            }}
            className={`w-full px-2 sm:px-3 py-1 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.mileage ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Enter mileage"
          />
          {errors.mileage && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.mileage}</p>}
        </div>

        {/* Color */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            Color *
          </label>
          <input
            type="text"
            value={formData.color}
            onChange={(e) => handleInputChange('color', e.target.value)}
            className={`w-full px-2 sm:px-3 py-1 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.color ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="e.g., Pearl White"
          />
          {errors.color && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.color}</p>}
        </div>

        {/* Date Acquired */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            Date Acquired *
          </label>
          <input
            type="date"
            value={formData.dateAcquired}
            onChange={(e) => handleInputChange('dateAcquired', e.target.value)}
            className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Target Sale Date */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            Target Sale Date
          </label>
          <input
            type="date"
            value={formData.targetSaleDate}
            onChange={(e) => handleInputChange('targetSaleDate', e.target.value)}
            className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            Price *
          </label>
          <input
            type="text"
            value={formData.price}
            onChange={(e) => {
              const numericValue = e.target.value.replace(/[^0-9.]/g, '');
              handleInputChange('price', numericValue);
            }}
            className={`w-full px-2 sm:px-3 py-1 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.price ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Enter price"
          />
          {errors.price && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.price}</p>}
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            Location *
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            className={`w-full px-2 sm:px-3 py-1 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.location ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="e.g., Lot A-12"
          />
          {errors.location && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.location}</p>}
        </div>

        {/* Notes */}
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Add any notes about the vehicle..."
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </form>
  );
};

export default VehicleEditForm;