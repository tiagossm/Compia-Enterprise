// ATA (Ata de Inspeção) Service
// Handles continuous audio recording and transcript generation

import { supabase } from '@/react-app/lib/supabase';
import { fetchWithAuth } from '@/react-app/utils/auth';

export interface ATA {
    id: number;
    inspection_id: number;
    organization_id: number;
    created_by: string;
    status: 'recording' | 'processing' | 'draft' | 'validated';
    total_duration_seconds: number;
    transcript: string | null;
    summary: string | null;
    identified_items: Array<{
        item_id: number;
        status: 'C' | 'NC' | 'NA';
        observation: string;
    }>;
    doc_url: string | null;
    created_at: string;
    validated_at: string | null;
    updated_at: string;
}

export interface ATASegment {
    id: number;
    ata_id: number;
    segment_number: number;
    audio_url: string | null;
    duration_seconds: number;
    started_at: string;
    ended_at: string | null;
    uploaded: boolean;
    created_at: string;
}

export interface ATAGenerateResult {
    success: boolean;
    ata_id: number;
    transcript: string;
    summary: string;
    identified_items: Array<{
        item_id: number;
        status: 'C' | 'NC' | 'NA';
        observation: string;
    }>;
    non_conformities: Array<{
        title: string;
        description: string;
        suggested_action: string;
        suggested_deadline: string;
    }>;
}

export const ataService = {
    /**
     * Create a new ATA for an inspection
     */
    async create(inspectionId: number, organizationId: number): Promise<ATA> {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('inspection_atas')
            .insert({
                inspection_id: inspectionId,
                organization_id: organizationId,
                created_by: user?.id,
                status: 'recording'
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create ATA: ${error.message}`);
        return data;
    },

    /**
     * Get ATA by ID
     */
    async get(ataId: number): Promise<ATA | null> {
        const { data, error } = await supabase
            .from('inspection_atas')
            .select('*')
            .eq('id', ataId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw new Error(`Failed to get ATA: ${error.message}`);
        }
        return data;
    },

    /**
     * Get ATA by inspection ID (returns the most recent one)
     */
    async getByInspection(inspectionId: number): Promise<ATA | null> {
        const { data, error } = await supabase
            .from('inspection_atas')
            .select('*')
            .eq('inspection_id', inspectionId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw new Error(`Failed to get ATA: ${error.message}`);
        }
        return data;
    },

    /**
     * Update ATA
     */
    async update(ataId: number, updates: Partial<ATA>): Promise<ATA> {
        const { data, error } = await supabase
            .from('inspection_atas')
            .update(updates)
            .eq('id', ataId)
            .select()
            .single();

        if (error) throw new Error(`Failed to update ATA: ${error.message}`);
        return data;
    },

    /**
     * Upload audio segment to storage
     */
    async uploadSegment(
        ataId: number,
        audioBlob: Blob,
        segmentNumber: number,
        durationSeconds: number,
        startedAt: Date,
        endedAt: Date
    ): Promise<ATASegment> {
        const { data: { user } } = await supabase.auth.getUser();
        const fileName = `${user?.id}/${ataId}/segment_${segmentNumber}.webm`;

        // Upload audio to storage
        const { error: uploadError } = await supabase
            .storage
            .from('ata-audio')
            .upload(fileName, audioBlob, {
                contentType: 'audio/webm',
                upsert: true
            });

        if (uploadError) throw new Error(`Failed to upload audio: ${uploadError.message}`);

        // Get public URL
        const { data: urlData } = supabase
            .storage
            .from('ata-audio')
            .getPublicUrl(fileName);

        // Create or update segment record
        const { data, error } = await supabase
            .from('inspection_ata_segments')
            .upsert({
                ata_id: ataId,
                segment_number: segmentNumber,
                audio_url: urlData.publicUrl,
                duration_seconds: durationSeconds,
                started_at: startedAt.toISOString(),
                ended_at: endedAt.toISOString(),
                uploaded: true
            }, {
                onConflict: 'ata_id,segment_number'
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to save segment: ${error.message}`);

        // Update total duration in ATA
        await this.updateTotalDuration(ataId);

        return data;
    },

    /**
     * Get all segments for an ATA
     */
    async getSegments(ataId: number): Promise<ATASegment[]> {
        const { data, error } = await supabase
            .from('inspection_ata_segments')
            .select('*')
            .eq('ata_id', ataId)
            .order('segment_number', { ascending: true });

        if (error) throw new Error(`Failed to get segments: ${error.message}`);
        return data || [];
    },

    /**
     * Update total duration based on segments
     */
    async updateTotalDuration(ataId: number): Promise<void> {
        const segments = await this.getSegments(ataId);
        const totalDuration = segments.reduce((sum, seg) => sum + (seg.duration_seconds || 0), 0);

        await supabase
            .from('inspection_atas')
            .update({ total_duration_seconds: totalDuration })
            .eq('id', ataId);
    },

    /**
     * Generate transcript and ATA content using AI
     */
    async generateTranscript(
        ataId: number,
        inspectionContext: {
            items: Array<{ id: number; title: string; description?: string }>;
            info: {
                project_name?: string;
                location?: string;
                inspector_name?: string;
                scheduled_date?: string;
            };
        }
    ): Promise<ATAGenerateResult> {
        const ata = await this.get(ataId);
        if (!ata) throw new Error('ATA not found');

        const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || '/functions/v1';

        const response = await fetchWithAuth(`${functionsUrl}/generate-ata`, {
            method: 'POST',
            body: JSON.stringify({
                ata_id: ataId,
                inspection_id: ata.inspection_id,
                inspection_context: inspectionContext
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to generate ATA');
        }

        return await response.json();
    },

    /**
     * Validate ATA (mark as final)
     */
    async validate(ataId: number): Promise<ATA> {
        const { data, error } = await supabase
            .from('inspection_atas')
            .update({
                status: 'validated',
                validated_at: new Date().toISOString()
            })
            .eq('id', ataId)
            .select()
            .single();

        if (error) throw new Error(`Failed to validate ATA: ${error.message}`);
        return data;
    },

    /**
     * Delete ATA and all associated data
     */
    async delete(ataId: number): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();

        // Delete audio files from storage
        const segments = await this.getSegments(ataId);
        for (const segment of segments) {
            if (segment.audio_url) {
                const fileName = `${user?.id}/${ataId}/segment_${segment.segment_number}.webm`;
                await supabase.storage.from('ata-audio').remove([fileName]);
            }
        }

        // Delete ATA (cascade will delete segments)
        const { error } = await supabase
            .from('inspection_atas')
            .delete()
            .eq('id', ataId);

        if (error) throw new Error(`Failed to delete ATA: ${error.message}`);
    },

    /**
     * Save document URL after generation
     */
    async saveDocUrl(ataId: number, docUrl: string): Promise<void> {
        const { error } = await supabase
            .from('inspection_atas')
            .update({ doc_url: docUrl })
            .eq('id', ataId);

        if (error) throw new Error(`Failed to save doc URL: ${error.message}`);
    }
};

export default ataService;
