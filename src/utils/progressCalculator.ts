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
      
      // Only count a section as complete if ALL items are 'G'
      const sectionKeys = ['emissions', 'cosmetic', 'mechanical', 'cleaning', 'photos'];
      let completedSections = 0;
      sectionKeys.forEach(sectionKey => {
        const items = vehicleInspection[sectionKey];
        if (Array.isArray(items) && items.length > 0) {
          const allGreen = items.every(item => item.rating === 'G');
          if (allGreen) completedSections++;
        }
      });
      return (completedSections / sectionKeys.length) * 100;
    } catch (error) {
      console.error('Error calculating detailed progress:', error);
      return this.calculateSectionProgress(vehicle);
    }
  }
  
  /**
   * Fallback method that calculates progress based on overall vehicle status
   * Used when detailed inspection data is not available
   */
  static calculateSectionProgress(vehicle: Vehicle): number {
    // Since vehicle.status is now a simple string, return progress based on that
    switch (vehicle.status) {
      case 'ready':
        return 100;
      case 'issues':
        return 75;
      case 'working':
        return 50;
      case 'pending':
        return 25;
      case 'sold':
        return 100; // Sold vehicles are considered complete
      default:
        return 0;
    }
  }
}