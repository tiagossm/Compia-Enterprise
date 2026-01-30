-- ============================================================================
-- Migration: Fix system_settings RLS
-- Date: 2026-01-29
-- Purpose: Add RLS to system_settings table (CRITICAL SECURITY FIX)
-- ============================================================================

-- Habilitar RLS na tabela system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Apenas System Admin pode ler configurações do sistema
CREATE POLICY "system_settings_select" ON public.system_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

-- Apenas System Admin pode modificar configurações
CREATE POLICY "system_settings_update" ON public.system_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

-- Apenas System Admin pode criar novas configurações
CREATE POLICY "system_settings_insert" ON public.system_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

-- Apenas System Admin pode deletar configurações
CREATE POLICY "system_settings_delete" ON public.system_settings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );
