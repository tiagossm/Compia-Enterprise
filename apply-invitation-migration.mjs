/**
 * Script para aplicar migration do sistema de convites
 * Uso: node apply-invitation-migration.mjs
 * Adaptado para usar RPC exec_sql (padrão do projeto)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vjlvvmriqerfmztwtewa.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada no .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function applyMigration() {
    console.log('🚀 Aplicando migration do Sistema de Convites (via RPC)...\n');

    try {
        const migrationPath = path.join(__dirname, 'supabase/migrations/20260205140000_organization_invitations.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Lendo migration:', migrationPath);
        console.log('📊 Tamanho:', migrationSQL.length, 'bytes');

        console.log('📤 Enviando para exec_sql...');

        const { data, error } = await supabase.rpc('exec_sql', { sql_query: migrationSQL });

        if (error) {
            console.error('❌ Erro RPC:', error);
            // Fallback erro detalhado
            if (error.message.includes('Function not found')) {
                console.error('\n⚠️  A função RPC exec_sql não existe no banco.');
            }
            process.exit(1);
        }

        console.log('✅ Migration aplicada com sucesso!');
        // Se exec_sql retornar algo, mostramos
        if (data) console.log('📊 Resultado:', data);

    } catch (error) {
        console.error('❌ Erro fatal:', error.message);
        process.exit(1);
    }
}

applyMigration();
