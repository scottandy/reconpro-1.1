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
   * Fallback method that calculates progress based on section status
   * Used when detailed inspection data is not available
   */
  static calculateSectionProgress(vehicle: Vehicle): number {
    // Only use the correct keys: emissions, cosmetic, mechanical, cleaning, photos
    const statuses = [
      vehicle.status.emissions,
      vehicle.status.cosmetic,
      vehicle.status.mechanical,
      vehicle.status.cleaning,
      vehicle.status.photos,
    ];
    // Only count as completed if the status is 'completed' (which should only be set if all items are 'G')
    const completed = statuses.filter(status => status === 'completed').length;
    return (completed / statuses.length) * 100;
  }
}