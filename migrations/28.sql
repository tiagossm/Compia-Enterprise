
-- Criar alguns templates de exemplo para teste
INSERT OR IGNORE INTO checklist_templates (
  id, name, description, category, created_by, created_by_user_id, 
  organization_id, is_public, is_category_folder, created_at, updated_at
) VALUES 
(100, 'Segurança Geral de Máquinas', 'Template para inspeção de segurança em máquinas industriais', 'Equipamentos', 'Sistema', NULL, NULL, 1, 0, datetime('now'), datetime('now')),
(101, 'EPIs e Equipamentos', 'Template para verificação de equipamentos de proteção individual', 'Segurança', 'Sistema', NULL, NULL, 1, 0, datetime('now'), datetime('now')),
(102, 'Instalações Elétricas', 'Template para inspeção de segurança em instalações elétricas', 'Elétrica', 'Sistema', NULL, NULL, 1, 0, datetime('now'), datetime('now'));

-- Criar campos para os templates
INSERT OR IGNORE INTO checklist_fields (
  template_id, field_name, field_type, is_required, options, order_index, created_at, updated_at
) VALUES 
-- Template 100: Segurança Geral de Máquinas
(100, 'Máquina possui proteção adequada?', 'boolean', 1, NULL, 1, datetime('now'), datetime('now')),
(100, 'Estado das proteções', 'select', 1, '["Excelente", "Bom", "Regular", "Ruim"]', 2, datetime('now'), datetime('now')),
(100, 'Observações gerais', 'textarea', 0, NULL, 3, datetime('now'), datetime('now')),

-- Template 101: EPIs e Equipamentos  
(101, 'EPI disponível para todos os funcionários?', 'boolean', 1, NULL, 1, datetime('now'), datetime('now')),
(101, 'Tipos de EPI em uso', 'multiselect', 1, '["Capacete", "Óculos", "Luvas", "Botas", "Protetor Auricular"]', 2, datetime('now'), datetime('now')),
(101, 'Condição dos EPIs', 'rating', 1, NULL, 3, datetime('now'), datetime('now')),

-- Template 102: Instalações Elétricas
(102, 'Instalação elétrica em conformidade?', 'boolean', 1, NULL, 1, datetime('now'), datetime('now')),
(102, 'Tipo de não conformidade encontrada', 'select', 0, '["Fiação exposta", "Quadro sem proteção", "Falta de aterramento", "Sobrecarga"]', 2, datetime('now'), datetime('now')),
(102, 'Nível de risco identificado', 'select', 1, '["Baixo", "Médio", "Alto", "Crítico"]', 3, datetime('now'), datetime('now'));
