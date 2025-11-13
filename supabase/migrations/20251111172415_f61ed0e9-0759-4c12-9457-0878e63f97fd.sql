-- Create storage bucket for podcast files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('podcast-files', 'podcast-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for podcast file uploads
CREATE POLICY "Anyone can upload podcast files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'podcast-files');

CREATE POLICY "Anyone can view podcast files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'podcast-files');

CREATE POLICY "Anyone can update their podcast files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'podcast-files');

CREATE POLICY "Anyone can delete podcast files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'podcast-files');