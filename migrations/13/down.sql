
-- Remove the new fields from organizations table
ALTER TABLE organizations DROP COLUMN cnpj;
ALTER TABLE organizations DROP COLUMN razao_social;
ALTER TABLE organizations DROP COLUMN nome_fantasia;
ALTER TABLE organizations DROP COLUMN cnae_principal;
ALTER TABLE organizations DROP COLUMN cnae_descricao;
ALTER TABLE organizations DROP COLUMN natureza_juridica;
ALTER TABLE organizations DROP COLUMN data_abertura;
ALTER TABLE organizations DROP COLUMN capital_social;
ALTER TABLE organizations DROP COLUMN porte_empresa;
ALTER TABLE organizations DROP COLUMN situacao_cadastral;
ALTER TABLE organizations DROP COLUMN numero_funcionarios;
ALTER TABLE organizations DROP COLUMN setor_industria;
ALTER TABLE organizations DROP COLUMN subsetor_industria;
ALTER TABLE organizations DROP COLUMN certificacoes_seguranca;
ALTER TABLE organizations DROP COLUMN data_ultima_auditoria;
ALTER TABLE organizations DROP COLUMN nivel_risco;
ALTER TABLE organizations DROP COLUMN contato_seguranca_nome;
ALTER TABLE organizations DROP COLUMN contato_seguranca_email;
ALTER TABLE organizations DROP COLUMN contato_seguranca_telefone;
ALTER TABLE organizations DROP COLUMN historico_incidentes;
ALTER TABLE organizations DROP COLUMN observacoes_compliance;
ALTER TABLE organizations DROP COLUMN website;
ALTER TABLE organizations DROP COLUMN faturamento_anual;
