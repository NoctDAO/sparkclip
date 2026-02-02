-- Add status column to video_series table
ALTER TABLE video_series 
ADD COLUMN status TEXT DEFAULT 'public';

-- Add notifications preference
ALTER TABLE video_series
ADD COLUMN notifications_enabled BOOLEAN DEFAULT true;

-- Create validation trigger for status values
CREATE OR REPLACE FUNCTION validate_series_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('public', 'unlisted', 'draft', 'archived') THEN
    RAISE EXCEPTION 'Invalid status value: %. Must be one of: public, unlisted, draft, archived', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_series_status_trigger
BEFORE INSERT OR UPDATE ON video_series
FOR EACH ROW
EXECUTE FUNCTION validate_series_status();