
-- Add new professional fields to organizations table
ALTER TABLE organizations ADD COLUMN cnpj TEXT;
ALTER TABLE organizations ADD COLUMN razao_social TEXT;
ALTER TABLE organizations ADD COLUMN nome_fantasia TEXT;
ALTER TABLE organizations ADD COLUMN cnae_principal TEXT;
ALTER TABLE organizations ADD COLUMN cnae_descricao TEXT;
ALTER TABLE organizations ADD COLUMN natureza_juridica TEXT;
ALTER TABLE organizations ADD COLUMN data_abertura DATE;
ALTER TABLE organizations ADD COLUMN capital_social REAL;
ALTER TABLE organizations ADD COLUMN porte_empresa TEXT;
ALTER TABLE organizations ADD COLUMN situacao_cadastral TEXT;
ALTER TABLE organizations ADD COLUMN numero_funcionarios INTEGER;
ALTER TABLE organizations ADD COLUMN setor_industria TEXT;
ALTER TABLE organizations ADD COLUMN subsetor_industria TEXT;
ALTER TABLE organizations ADD COLUMN certificacoes_seguranca TEXT;
ALTER TABLE organizations ADD COLUMN data_ultima_auditoria DATE;
ALTER TABLE organizations ADD COLUMN nivel_risco TEXT DEFAULT 'medio';
ALTER TABLE organizations ADD COLUMN contato_seguranca_nome TEXT;
ALTER TABLE organizations ADD COLUMN contato_seguranca_email TEXT;
ALTER TABLE organizations ADD COLUMN contato_seguranca_telefone TEXT;
ALTER TABLE organizations ADD COLUMN historico_incidentes TEXT;
ALTER TABLE organizations ADD COLUMN observacoes_compliance TEXT;
ALTER TABLE organizations ADD COLUMN website TEXT;
ALTER TABLE organizations ADD COLUMN faturamento_anual REAL;
