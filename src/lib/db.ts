import Dexie, { Table } from 'dexie';

// --- Interfaces for Local Data ---

export interface OfflineStartInspection {
    id?: number; // Auto-increment for local drafts
    template_id: number;
    organization_id: number;
    user_id: string; // UUID
    status: 'draft' | 'pending_sync';
    started_at: string;
    template_snapshot: any; // Store the full template structure offline
    offline_created_at: number; // timestamp
}

export interface OfflineInspection {
    id: number; // Real backend ID
    template_id: number;
    organization_id: number;
    user_id: string;
    status: string;
    started_at: string;
    completed_at?: string;
    score?: number;
    answers_json?: any; // Full JSON of answers
    synced_at: number; // Last time we fetched this from server
}

export interface SyncMutation {
    id?: number;
    url: string;
    method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body: any;
    timestamp: number;
    retryCount: number;
    status: 'pending' | 'processing' | 'failed';
    error?: string;
    tempId?: number; // For ID resolution (e.g. negative numbers)
}

export interface LocalMedia {
    id: string; // UUID generated locally
    blob: Blob;
    inspection_id: number; // Can be a local ID or real ID
    item_id: number;
    media_type: 'image' | 'audio' | 'video';
    file_name: string;
    status: 'pending' | 'uploading' | 'synced';
    created_at: number;
}

// --- Database Class ---

export interface OfflineTemplate {
    id: number;
    title: string;
    description?: string;
    pages_json: any; // Full structure
    organization_id: number;
}

export class CompiaDB extends Dexie {
    // Tables
    inspections!: Table<OfflineInspection, number>;
    pending_inspections!: Table<OfflineStartInspection, number>;
    mutation_queue!: Table<SyncMutation, number>;
    media_queue!: Table<LocalMedia, string>;
    templates!: Table<OfflineTemplate, number>;

    constructor() {
        super('CompiaDB');

        // Schema Definition
        // ++id means auto-increment primary key
        // [cols] means compound index for querying
        this.version(1).stores({
            inspections: 'id, organization_id, user_id, status',
            pending_inspections: '++id, user_id, status',
            mutation_queue: '++id, status, timestamp',
            media_queue: 'id, inspection_id, status',
            templates: 'id, organization_id'
        });
    }
}

export const db = new CompiaDB();
