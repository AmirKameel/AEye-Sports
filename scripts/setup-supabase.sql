-- Enable the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the video_analysis table
CREATE TABLE IF NOT EXISTS video_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  sport_type TEXT NOT NULL,
  analysis_status TEXT NOT NULL,
  analysis_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_video_analysis_user_id ON video_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_video_analysis_sport_type ON video_analysis(sport_type);
CREATE INDEX IF NOT EXISTS idx_video_analysis_status ON video_analysis(analysis_status);

-- IMPORTANT: Storage bucket setup must be done through the Supabase dashboard
-- The following SQL commands won't work directly. Instead, follow these steps:

-- 1. Go to Storage in the Supabase dashboard
-- 2. Create a new bucket named 'videos' if it doesn't exist
-- 3. Go to the Policies tab
-- 4. Add the following policies:

--    For anonymous read access:
--    - Policy name: "Public Read Access"
--    - Allowed operations: SELECT
--    - Policy definition: true

--    For file uploads (in production, restrict to authenticated users):
--    - Policy name: "Public Upload Access"
--    - Allowed operations: INSERT
--    - Policy definition: true

-- Note: For development purposes, the application uses simulated file uploads
-- to avoid storage permission issues. When deploying to production,
-- uncomment the actual Supabase upload code in components/VideoUploader.tsx 