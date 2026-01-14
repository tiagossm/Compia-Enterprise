
-- Create some sample checklist templates with actual fields for testing
INSERT INTO checklist_templates (
  id, name, description, category, is_public, is_category_folder, 
  created_by, created_by_user_id, organization_id, 
  created_at, updated_at
) VALUES 
(101, 'Checklist Básico de Segurança', 'Checklist fundamental para inspeções de segurança no trabalho', 'Segurança do Trabalho', 1, 0, 'Sistema', 'system', NULL, datetime('now'), datetime('now')),
(102, 'Inspeção de EPIs', 'Verificação de equipamentos de proteção individual', 'Equipamentos e Máquinas', 1, 0, 'Sistema', 'system', NULL, datetime('now'), datetime('now')),
(103, 'Segurança em Altura - NR-35', 'Checklist para trabalhos em altura conforme NR-35', 'Normas Regulamentadoras', 1, 0, 'Sistema', 'system', NULL, datetime('now'), datetime('now')),
(104, 'Segurança de Máquinas - NR-12', 'Inspeção de segurança em máquinas e equipamentos', 'Normas Regulamentadoras', 1, 0, 'Sistema', 'system', NULL, datetime('now'), datetime('now'));

-- Create fields for the basic safety checklist
INSERT INTO checklist_fields (
  template_id, field_name, field_type, is_required, options, order_index,
  created_at, updated_at
) VALUES 
-- Checklist Básico de Segurança (ID: 101)
(101, 'Área de trabalho está limpa e organizada?', 'boolean', 1, NULL, 0, datetime('now'), datetime('now')),
(101, 'Há placas de sinalização de segurança visíveis?', 'boolean', 1, NULL, 1, datetime('now'), datetime('now')),
(101, 'Saídas de emergência estão desobstruídas?', 'boolean', 1, NULL, 2, datetime('now'), datetime('now')),
(101, 'Extintores de incêndio estão nos locais corretos?', 'boolean', 1, NULL, 3, datetime('now'), datetime('now')),
(101, 'Condição geral da iluminação', 'select', 1, '["Adequada", "Inadequada", "Necessita melhorias"]', 4, datetime('now'), datetime('now')),
(101, 'Observações gerais', 'textarea', 0, NULL, 5, datetime('now'), datetime('now')),

-- Inspeção de EPIs (ID: 102)
(102, 'Capacetes de segurança em bom estado?', 'boolean', 1, NULL, 0, datetime('now'), datetime('now')),
(102, 'Óculos de proteção disponíveis e adequados?', 'boolean', 1, NULL, 1, datetime('now'), datetime('now')),
(102, 'Luvas de proteção adequadas para a atividade?', 'boolean', 1, NULL, 2, datetime('now'), datetime('now')),
(102, 'Calçados de segurança em uso?', 'boolean', 1, NULL, 3, datetime('now'), datetime('now')),
(102, 'Protetor auricular quando necessário?', 'boolean', 1, NULL, 4, datetime('now'), datetime('now')),
(102, 'Estado geral dos EPIs', 'rating', 1, NULL, 5, datetime('now'), datetime('now')),
(102, 'EPIs que necessitam substituição', 'multiselect', 0, '["Capacete", "Óculos", "Luvas", "Calçados", "Protetor auricular", "Outros"]', 6, datetime('now'), datetime('now')),

-- Segurança em Altura - NR-35 (ID: 103)
(103, 'Análise preliminar de risco realizada?', 'boolean', 1, NULL, 0, datetime('now'), datetime('now')),
(103, 'Trabalhadores possuem treinamento NR-35?', 'boolean', 1, NULL, 1, datetime('now'), datetime('now')),
(103, 'Cinturão de segurança tipo paraquedista em uso?', 'boolean', 1, NULL, 2, datetime('now'), datetime('now')),
(103, 'Pontos de ancoragem adequados e resistentes?', 'boolean', 1, NULL, 3, datetime('now'), datetime('now')),
(103, 'Sistema de comunicação entre equipes?', 'boolean', 1, NULL, 4, datetime('now'), datetime('now')),
(103, 'Condições climáticas adequadas?', 'select', 1, '["Favoráveis", "Desfavoráveis", "Aguardando melhoria"]', 5, datetime('now'), datetime('now')),
(103, 'Altura do trabalho (metros)', 'text', 1, NULL, 6, datetime('now'), datetime('now')),

-- Segurança de Máquinas - NR-12 (ID: 104)
(104, 'Proteções fixas instaladas e íntegras?', 'boolean', 1, NULL, 0, datetime('now'), datetime('now')),
(104, 'Dispositivos de parada de emergência funcionando?', 'boolean', 1, NULL, 1, datetime('now'), datetime('now')),
(104, 'Operadores treinados e capacitados?', 'boolean', 1, NULL, 2, datetime('now'), datetime('now')),
(104, 'Manutenção preventiva em dia?', 'boolean', 1, NULL, 3, datetime('now'), datetime('now')),
(104, 'Manual de instruções disponível?', 'boolean', 1, NULL, 4, datetime('now'), datetime('now')),
(104, 'Nível de ruído da máquina', 'select', 1, '["Dentro do limite", "Acima do limite", "Não medido"]', 5, datetime('now'), datetime('now')),
(104, 'Avaliação geral da segurança', 'rating', 1, NULL, 6, datetime('now'), datetime('now'));
