
-- Add hierarchical category support to checklist templates
ALTER TABLE checklist_templates ADD COLUMN parent_category_id INTEGER;
ALTER TABLE checklist_templates ADD COLUMN category_path TEXT;
ALTER TABLE checklist_templates ADD COLUMN is_category_folder BOOLEAN DEFAULT false;
ALTER TABLE checklist_templates ADD COLUMN folder_color TEXT DEFAULT '#3B82F6';
ALTER TABLE checklist_templates ADD COLUMN folder_icon TEXT DEFAULT 'folder';
ALTER TABLE checklist_templates ADD COLUMN display_order INTEGER DEFAULT 0;

-- Create category folders for better organization
INSERT INTO checklist_templates (name, description, category, is_category_folder, folder_color, folder_icon, display_order, created_by, is_public) VALUES
('Segurança do Trabalho', 'Templates relacionados à segurança e saúde ocupacional', 'Segurança do Trabalho', true, '#EF4444', 'shield', 1, 'system', true),
('Normas Regulamentadoras', 'Templates baseados nas NRs do Ministério do Trabalho', 'Normas Regulamentadoras', true, '#F59E0B', 'book-open', 2, 'system', true),
('Equipamentos e Máquinas', 'Templates para inspeção de equipamentos industriais', 'Equipamentos e Máquinas', true, '#8B5CF6', 'settings', 3, 'system', true),
('Meio Ambiente', 'Templates para conformidade ambiental e sustentabilidade', 'Meio Ambiente', true, '#10B981', 'leaf', 4, 'system', true),
('Qualidade', 'Templates para controle de qualidade e processos', 'Qualidade', true, '#3B82F6', 'award', 5, 'system', true);

-- Create subcategories under main folders
INSERT INTO checklist_templates (name, description, category, parent_category_id, is_category_folder, folder_color, folder_icon, display_order, created_by, is_public) VALUES
('NR-12 - Segurança no Trabalho em Máquinas', 'Templates específicos para NR-12', 'NR-12', 1, true, '#DC2626', 'cog', 1, 'system', true),
('NR-18 - Condições de Segurança na Construção', 'Templates específicos para NR-18', 'NR-18', 1, true, '#DC2626', 'hard-hat', 2, 'system', true),
('NR-35 - Trabalho em Altura', 'Templates específicos para NR-35', 'NR-35', 1, true, '#DC2626', 'mountain', 3, 'system', true),
('EPIs - Equipamentos de Proteção Individual', 'Templates para inspeção de EPIs', 'EPIs', 1, true, '#F97316', 'shield-check', 4, 'system', true),
('Ergonomia', 'Templates para avaliação ergonômica', 'Ergonomia', 1, true, '#06B6D4', 'user-check', 5, 'system', true);
