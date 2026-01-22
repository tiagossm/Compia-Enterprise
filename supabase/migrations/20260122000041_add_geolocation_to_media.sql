-- Adicionar campos de geolocalização à tabela inspection_media
-- Esta migração adiciona suporte para rastreamento de GPS nas fotos

ALTER TABLE inspection_media 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ DEFAULT NOW();

-- Adicionar índice para buscas por localização
CREATE INDEX IF NOT EXISTS idx_inspection_media_coords 
ON inspection_media (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN inspection_media.latitude IS 'Latitude GPS no momento da captura da foto';
COMMENT ON COLUMN inspection_media.longitude IS 'Longitude GPS no momento da captura da foto';
COMMENT ON COLUMN inspection_media.captured_at IS 'Timestamp do momento exato da captura';
