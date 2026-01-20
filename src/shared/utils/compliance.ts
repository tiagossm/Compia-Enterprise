
export interface ComplianceStats {
    totalItems: number;
    compliantItems: number;
    nonCompliantItems: number;
    notApplicableItems: number;
    unansweredItems: number;
    conformanceRate: number;
}

export const normalizeComplianceStatus = (status: string | null | undefined): string => {
    if (!status) return 'unanswered';
    const s = status.toLowerCase().replace(/_/g, ' ').trim();
    if (s === 'conforme' || s === 'compliant') return 'compliant';
    if (s === 'nao conforme' || s === 'não conforme' || s === 'non compliant' || s === 'non_compliant' || s === 'nao_conforme') return 'non_compliant';
    if (s === 'nao aplicavel' || s === 'não aplicável' || s === 'not applicable' || s === 'not_applicable' || s === 'nao_aplicavel' || s === 'n/a') return 'not_applicable';
    if (s === 'parcialmente conforme' || s === 'parcialmente_conforme' || s === 'partial') return 'partial';
    return 'unanswered';
};

export const inferComplianceFromText = (text: string | null | undefined): string | null => {
    if (!text) return null;
    const t = text.toString().toLowerCase().trim();

    // Explicit compliance patterns
    if (t === 'conforme' || t === 'adequado' || t === 'adequada' || t === 'bom' || t === 'boa' || t === 'sim' || t === 'yes') return 'compliant';
    if (t === 'não conforme' || t === 'nao conforme' || t === 'inadequado' || t === 'inadequada' || t === 'inadequadas' ||
        t === 'ruim' || t === 'crítico' || t === 'critico' || t === 'não' || t === 'nao' || t === 'no') return 'non_compliant';
    if (t === 'não aplicável' || t === 'nao aplicavel' || t === 'n/a') return 'not_applicable';

    // Pattern matching for partial text
    if (t.includes('não conforme') || t.includes('nao conforme')) return 'non_compliant';
    if (t.includes('conforme') && !t.includes('não')) return 'compliant';
    if (t.includes('inadequad') || t.includes('ruim') || t.includes('ruín') || t.includes('crítico') || t.includes('critico')) return 'non_compliant';

    return null; // Cannot infer
};

export const calculateInspectionStats = (items: any[], templateItems: any[], responses: Record<number, any>): ComplianceStats => {
    const stats: ComplianceStats = {
        totalItems: 0,
        compliantItems: 0,
        nonCompliantItems: 0,
        notApplicableItems: 0,
        unansweredItems: 0,
        conformanceRate: 0
    };

    const countCompliance = (status: string) => {
        switch (status) {
            case 'compliant':
                stats.compliantItems++;
                break;
            case 'non_compliant':
            case 'partial':
                stats.nonCompliantItems++;
                break;
            case 'not_applicable':
                stats.notApplicableItems++;
                break;
            default:
                stats.unansweredItems++;
        }
    };

    // Count manual items
    items.forEach(item => {
        stats.totalItems++;
        if (item.compliance_status) {
            countCompliance(normalizeComplianceStatus(item.compliance_status));
        } else {
            if (item.is_compliant === true) {
                stats.compliantItems++;
            } else if (item.is_compliant === false) {
                stats.nonCompliantItems++;
            } else {
                stats.unansweredItems++;
            }
        }
    });

    // Count template items
    templateItems.forEach((item) => {
        stats.totalItems++;
        try {
            const fieldData = JSON.parse(item.field_responses);

            // Priority 1: Check item-level compliance_status
            if (item.compliance_status) {
                countCompliance(normalizeComplianceStatus(item.compliance_status));
                return;
            }

            // Priority 2: Check field_responses.compliance_status
            if (fieldData.compliance_status) {
                countCompliance(normalizeComplianceStatus(fieldData.compliance_status));
                return;
            }

            // Priority 3: Use responses
            const response = responses[item.id];

            // Priority 4: Auto-detect
            if (fieldData.field_type === 'boolean') {
                if (response === true || response === 'true' || response === 1) {
                    stats.compliantItems++;
                } else if (response === false || response === 'false' || response === 0) {
                    stats.nonCompliantItems++;
                } else {
                    stats.unansweredItems++;
                }
            } else if (fieldData.field_type === 'rating') {
                if (response !== null && response !== undefined && response !== '') {
                    const rating = parseInt(response);
                    if (!isNaN(rating)) {
                        if (rating >= 4) stats.compliantItems++;
                        else stats.nonCompliantItems++;
                    } else stats.unansweredItems++;
                } else stats.unansweredItems++;
            } else if (fieldData.field_type === 'select' || fieldData.field_type === 'text') {
                const responseValue = response || fieldData.response_value;
                if (responseValue) {
                    const inferred = inferComplianceFromText(responseValue);
                    if (inferred) countCompliance(inferred);
                    else stats.unansweredItems++;
                } else stats.unansweredItems++;
            } else {
                // Date, time, etc
                if (response !== null && response !== undefined && response !== '') {
                    stats.notApplicableItems++;
                } else {
                    stats.unansweredItems++;
                }
            }
        } catch (error) {
            console.error('Error processing template item stats:', error);
            stats.unansweredItems++;
        }
    });

    const evaluatedItems = stats.compliantItems + stats.nonCompliantItems;
    stats.conformanceRate = evaluatedItems > 0 ? Math.round((stats.compliantItems / evaluatedItems) * 100) : 0;

    return stats;
};
