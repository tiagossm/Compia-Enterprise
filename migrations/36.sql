-- Migration: Adicionar fluxo de aprovação de usuários
-- Adiciona campos para controlar se o usuário foi aprovado pelo admin

-- Adicionar colunas de controle de aprovação
-- approval_status: 'pending', 'approved', 'rejected'
-- Para retrocompatibilidade, usuários existentes começam como 'approved'
ALTER TABLE users ADD COLUMN approval_status TEXT DEFAULT 'approved';
ALTER TABLE users ADD COLUMN approved_by TEXT;
ALTER TABLE users ADD COLUMN approved_at TEXT;
ALTER TABLE users ADD COLUMN rejection_reason TEXT;

-- Criar índice para facilitar busca de pendentes
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);

-- Garantir que novos inserts que não especifiquem approval_status peguem 'approved' ou logica será no código?
-- Vamos definir DEFAULT 'approved' para não quebrar inserts antigos, mas na aplicação força 'pending'
-- Ou melhor: Remover DEFAULT no futuro, mas agora DEFAULT 'approved' é safer para código legado.
