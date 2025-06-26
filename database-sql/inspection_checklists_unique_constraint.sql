-- Add a unique constraint so only one checklist per vehicle is allowed
ALTER TABLE public.inspection_checklists
ADD CONSTRAINT unique_vehicle_checklist UNIQUE (vehicle_id); 