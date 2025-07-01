import { Vehicle } from '../types/vehicle';

export class ProgressCalculator {
  /**
   * Calculate the overall progress percentage based on individual inspection items
   * rather than just counting completed sections
   */
  static calculateDetailedProgress(vehicleId: string, vehicle: Vehicle): number {
    // Get inspection data from localStorage
    const savedInspections = localStorage.getItem('vehicleInspections');
    if (!savedInspections) return this.calculateSectionProgress(vehicle);
    
    try {
      const inspections = JSON.parse(savedInspections);
      const vehicleInspection = inspections[vehicleId];
      
      if (!vehicleInspection) return this.calculateSectionProgress(vehicle);
      
      // Count all items that have been checked (not just completed sections)
      const sectionKeys = ['emissions', 'cosmetic', 'mechanical', 'cleaning', 'photos'];
      let totalItems = 0;
      let checkedItems = 0;
      
      sectionKeys.forEach(sectionKey => {
        const items = vehicleInspection[sectionKey];
        if (Array.isArray(items) && items.length > 0) {
          totalItems += items.length;
          // Count any item that has been rated (G, F, or N) as "checked"
          checkedItems += items.filter(item => item.rating !== 'not-checked').length;
        }
      });
      
      if (totalItems === 0) return this.calculateSectionProgress(vehicle);
      return Math.round((checkedItems / totalItems) * 100);
    } catch (error) {
      console.error('Error calculating detailed progress:', error);
      return this.calculateSectionProgress(vehicle);
    }
  }
  
  /**
   * Fallback method that calculates progress based on section status
   * Used when detailed inspection data is not available
   */
  static calculateSectionProgress(vehicle: Vehicle): number {
    // Only use the correct keys: emissions, cosmetic, mechanical, cleaned, photos
    const statuses = [
      vehicle.status.emissions,
      vehicle.status.cosmetic,
      vehicle.status.mechanical,
      vehicle.status.cleaned,
      vehicle.status.photos,
    ];
    // Only count as completed if the status is 'completed' (which should only be set if all items are 'G')
    const completed = statuses.filter(status => status === 'completed').length;
    return (completed / statuses.length) * 100;
  }

  /**
   * Get the appropriate color class for progress bar based on completion percentage
   */
  static getProgressColorClass(progress: number): string {
    if (progress >= 100) {
      return 'bg-gradient-to-r from-emerald-500 to-green-600 dark:from-emerald-400 dark:to-green-700';
    } else if (progress >= 75) {
      return 'bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-700';
    } else if (progress >= 50) {
      return 'bg-gradient-to-r from-yellow-500 to-amber-600 dark:from-yellow-400 dark:to-amber-700';
    } else if (progress >= 25) {
      return 'bg-gradient-to-r from-orange-500 to-amber-600 dark:from-orange-400 dark:to-amber-700';
    } else {
      return 'bg-gradient-to-r from-red-500 to-orange-600 dark:from-red-400 dark:to-orange-700';
    }
  }

  /**
   * Get the appropriate text color class based on completion percentage
   */
  static getProgressTextColorClass(progress: number): string {
    if (progress >= 100) {
      return 'text-emerald-600 dark:text-emerald-400';
    } else if (progress >= 75) {
      return 'text-blue-600 dark:text-blue-400';
    } else if (progress >= 50) {
      return 'text-yellow-600 dark:text-yellow-500';
    } else if (progress >= 25) {
      return 'text-orange-600 dark:text-orange-400';
    } else {
      return 'text-red-600 dark:text-red-400';
    }
  }
}