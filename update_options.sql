UPDATE checklist_fields 
SET options = '["Baixa", "Média", "Alta"]' 
WHERE template_id = 106 AND field_name = 'Prioridade';
