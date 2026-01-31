import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Configuration (Reused from existing setup)
const SUPABASE_URL = 'https://vjlvvmriqerfmztwtewa.supabase.co';
// Note: This matches the service key from the previous file viewed
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbHZ2bXJpcWVyZm16dHd0ZXdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA4MjYzMCwiZXhwIjoyMDgwNjU4NjMwfQ.ekNa9E9I42taMqG6EFjAJlhdtWaSmBYU6o-KTzIW4RM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function applyMigration() {
    try {
        console.log('🔧 Reading migration file...');
        const sql = readFileSync('./supabase/migrations/20260130000000_create_rate_limits.sql', 'utf8');

        console.log('📤 Applying Rate Limit migration to Supabase...');

        // Attempt to run via RPC 'exec_sql' if available
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('❌ Error applying migration via RPC:', error.message);
            console.log('\n⚠️  Could not apply migration automatically.');
            console.log('📋 Use the Supabase Dashboard SQL Editor to run the contents of: supabase/migrations/20260130000000_create_rate_limits.sql');
            process.exit(1);
        }

        console.log('✅ Migration applied successfully!');
        console.log('📊 Result:', data);

    } catch (err) {
        console.error('💥 Unexpected error:', err);
        process.exit(1);
    }
}

applyMigration();
