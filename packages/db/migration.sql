ALTER TABLE gps_pings ADD COLUMN IF NOT EXISTS school_id TEXT;
CREATE INDEX IF NOT EXISTS idx_gps_pings_school ON gps_pings(school_id, timestamp);
