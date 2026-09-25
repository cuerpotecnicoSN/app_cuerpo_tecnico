-- Bucket privado para guardar el PDF original de Panini Digital de cada partido
-- (ruta: matches/<match_id>.pdf). Los datos extraídos siguen en matches.scouting_notes.
INSERT INTO storage.buckets (id, name, public)
VALUES ('panini-reports', 'panini-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Acceso para usuarios autenticados del cuerpo técnico
DROP POLICY IF EXISTS "panini_reports_select" ON storage.objects;
CREATE POLICY "panini_reports_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'panini-reports');

DROP POLICY IF EXISTS "panini_reports_insert" ON storage.objects;
CREATE POLICY "panini_reports_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'panini-reports');

DROP POLICY IF EXISTS "panini_reports_update" ON storage.objects;
CREATE POLICY "panini_reports_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'panini-reports');

DROP POLICY IF EXISTS "panini_reports_delete" ON storage.objects;
CREATE POLICY "panini_reports_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'panini-reports');
