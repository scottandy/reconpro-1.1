@@ .. @@
 -- Users can view inspection checklists they created
 CREATE POLICY "Users can view their own inspection checklists" ON public.inspection_checklists
   FOR SELECT USING (inspector_id = auth.uid());
 
--- Users can update inspection checklists they created
-CREATE POLICY "Users can update their own inspection checklists" ON public.inspection_checklists
-  FOR UPDATE USING (inspector_id = auth.uid());
+-- Users can update inspection checklists for vehicles in their dealership
+CREATE POLICY "Users can update inspection checklists in their dealership" ON public.inspection_checklists
+  FOR UPDATE USING (
+    EXISTS (
+      SELECT 1 FROM public.vehicles v
+      JOIN public.profiles p ON p.dealership_id = v.dealership_id
+      WHERE p.id = auth.uid() 
+      AND v.id = inspection_checklists.vehicle_id
+    )
+  );
 
 -- Users can insert inspection checklists for any vehicle in their dealership