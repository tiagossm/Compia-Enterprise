/**
 * Utilities for calculating and managing compliance status
 */

import { ComplianceStatus } from './checklist-types';

/**
 * Calculates the compliance status based on field type and value
 * Used when complianceMode is 'auto' (default)
 */
export function calculateAutoCompliance(
    value: any,
    fieldType: string,
    expectedValue?: any
): ComplianceStatus {
    // If no value, it's unanswered
    if (value === undefined || value === null || value === '') {
        return 'unanswered';
    }

    // Boolean/Checkbox logic
    if (fieldType === 'boolean' || fieldType === 'checkbox') {
        const boolValue = value === true || value === 'true' || value === 'on';
        // Compliant if true (checked) OR if it matches expected value if provided
        if (expectedValue !== undefined) {
            return boolValue === expectedValue ? 'compliant' : 'non_compliant';
        }
        return boolValue ? 'compliant' : 'non_compliant';
    }

    // Select/Radio logic - usually handled by specific expected values meta-data, 
    // but here we assume if selected it's compliant unless configured otherwise
    // Real implementation would check against 'correct_answer' or 'non_compliant_options'
    if (['select', 'radio'].includes(fieldType)) {
        // This is a simplified check. In a real app, you'd pass the 'item' object 
        // to check its specific compliance rules logic.
        return 'compliant';
    }

    // Text/Textarea/File - Usually manual, but if 'auto', any content is compliant
    if (['text', 'textarea', 'file', 'photo'].includes(fieldType)) {
        return value ? 'compliant' : 'unanswered';
    }

    // Date/Time - Always compliant if filled
    if (['date', 'time', 'datetime'].includes(fieldType)) {
        return 'compliant';
    }

    return 'compliant';
}

/**
 * Returns the human readable label for a compliance status
 */
export function getComplianceLabel(status: ComplianceStatus): string {
    switch (status) {
        case 'compliant': return 'Conforme';
        case 'non_compliant': return 'Não Conforme';
        case 'not_applicable': return 'N/A';
        case 'unanswered': return 'Pendente';
        default: return '-';
    }
}

/**
 * Returns the color class for a compliance status
 */
export function getComplianceColor(status: ComplianceStatus): string {
    switch (status) {
        case 'compliant': return 'text-green-600 bg-green-50 border-green-200';
        case 'non_compliant': return 'text-red-600 bg-red-50 border-red-200';
        case 'not_applicable': return 'text-slate-500 bg-slate-100 border-slate-200';
        case 'unanswered': return 'text-slate-400 bg-white border-slate-200';
        default: return 'text-slate-400';
    }
}

/**
 * Calculates the overall compliance percentage for an inspection
 */
export function calculateCompliancePercentage(items: any[]): number {
    if (!items || items.length === 0) return 0;

    let applicableCount = 0;
    let compliantCount = 0;

    items.forEach(item => {
        // Skip informational items or separators if any

        const status = item.compliance_status || 'unanswered';

        // Not applicable items don't count towards total
        if (status === 'not_applicable') return;

        // Unanswered items count as applicable but not compliant
        applicableCount++;

        if (status === 'compliant') {
            compliantCount++;
        }
    });

    if (applicableCount === 0) return 0;

    return Math.round((compliantCount / applicableCount) * 100);
}
