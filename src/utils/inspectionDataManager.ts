import { supabase } from './supabaseClient';
import { InspectionData } from '../types/inspectionSettings';

export class InspectionDataManager {
  static async saveInspectionData(
    vehicleId: string, 
    inspectorId: string, 
    inspectionData: InspectionData
  ): Promise<boolean> {
    try {
      console.log('Saving inspection data:', { vehicleId, inspectorId });
      console.log('inspectionData to be saved:', JSON.stringify(inspectionData, null, 2));
      
      // First, check if a checklist already exists for this vehicle
      const { data: existingChecklist, error: selectError } = await supabase
        .from('inspection_checklists')
        .select('id, inspector_id')
        .eq('vehicle_id', vehicleId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('Error checking existing checklist:', selectError);
        return false;
      }

      if (existingChecklist) {
        // Update existing checklist
        console.log('Updating existing checklist:', existingChecklist.id);
        const { error: updateError } = await supabase
          .from('inspection_checklists')
          .update({
            inspector_id: inspectorId, // Ensure current inspector is set
            checklist_data: inspectionData,
            status: 'in-progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingChecklist.id);

        if (updateError) {
          console.error('Error updating inspection data:', updateError);
          return false;
        }
      } else {
        // Insert new checklist
        console.log('Creating new checklist');
        const { error: insertError } = await supabase
          .from('inspection_checklists')
          .insert({
            vehicle_id: vehicleId,
            inspector_id: inspectorId,
            checklist_data: inspectionData,
            status: 'in-progress',
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error inserting inspection data:', insertError);
          return false;
        }
      }

      console.log('Inspection data saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving inspection data:', error);
      return false;
    }
  }

  static async loadInspectionData(
    vehicleId: string, 
    inspectorId: string
  ): Promise<InspectionData | null> {
    try {
      // console.log('Loading inspection data:', { vehicleId, inspectorId });
      const { data, error } = await supabase
        .from('inspection_checklists')
        .select('checklist_data')
        .eq('vehicle_id', vehicleId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found, return null
          // console.log('No inspection data found for this vehicle');
          return null;
        }
        console.error('Error loading inspection data:', error);
        return null;
      }
      // console.log('Inspection data loaded successfully');
      return data.checklist_data;
    } catch (error) {
      console.error('Error loading inspection data:', error);
      return null;
    }
  }

  static async updateInspectionStatus(
    vehicleId: string,
    inspectorId: string,
    status: 'in-progress' | 'completed' | 'approved' | 'rejected',
    notes?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      if (notes) {
        updateData.notes = notes;
      }

      const { error } = await supabase
        .from('inspection_checklists')
        .update(updateData)
        .eq('vehicle_id', vehicleId);

      if (error) {
        console.error('Error updating inspection status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating inspection status:', error);
      return false;
    }
  }
} 