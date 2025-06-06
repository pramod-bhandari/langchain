-- Add file_url column to documents table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'file_url'
    ) THEN
        ALTER TABLE documents ADD COLUMN file_url TEXT;
    END IF;
END $$;

-- Update existing documents to have file_url based on the file_path
UPDATE documents
SET file_url = CONCAT(
    current_setting('app.supabase_url', true), 
    '/storage/v1/object/public/documents/', 
    file_path
)
WHERE file_url IS NULL; 