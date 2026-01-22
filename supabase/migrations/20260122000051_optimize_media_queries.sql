-- Migration: Optimize Media Queries
-- Date: 2026-01-08
-- Description: Adds index on inspection_id to speed up media fetching during inspection loading.

CREATE INDEX IF NOT EXISTS idx_inspection_media_inspection_id 
ON inspection_media (inspection_id);

COMMENT ON INDEX idx_inspection_media_inspection_id IS 'Performance index for fetching media by inspection';
