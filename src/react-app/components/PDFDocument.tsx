import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register Inter font for premium feel
Font.register({
    family: 'Inter',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff' }, // Regular
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff', fontWeight: 600 }, // SemiBold
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyDAZ9hjp-Ek-_EeA.woff', fontWeight: 700 }, // Bold
    ]
});

// Stitch Design System Colors
const colors = {
    primary: '#2563eb', // Blue 600
    background: '#f8fafc', // Slate 50
    text: '#1e293b', // Slate 800
    textSecondary: '#64748b', // Slate 500
    border: '#e2e8f0', // Slate 200
    success: '#16a34a', // Green 600
    successBg: '#f0fdf4', // Green 50
    danger: '#dc2626', // Red 600
    dangerBg: '#fef2f2', // Red 50
    warning: '#d97706', // Amber 600
    warningBg: '#fffbeb', // Amber 50
};

const styles = StyleSheet.create({
    page: {
        padding: 30,
        backgroundColor: colors.background,
        fontFamily: 'Inter',
        fontSize: 10,
        color: colors.text,
    },
    header: {
        marginBottom: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    logoArea: {
        width: 150,
    },
    logoImage: {
        height: 40,
        objectFit: 'contain',
        alignSelf: 'flex-start'
    },
    headerMeta: {
        flex: 1,
        marginLeft: 20,
        alignItems: 'flex-end',
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#eff6ff', // Blue 50
    },
    statusText: {
        color: colors.primary,
        fontWeight: 700,
        fontSize: 9,
        textTransform: 'uppercase',
    },
    reportId: {
        fontSize: 9,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    reportTitle: {
        fontSize: 18,
        fontWeight: 700,
        color: '#1e3a8a', // Blue 900
        textAlign: 'right',
        marginTop: 4,
    },
    reportDate: {
        fontSize: 9,
        color: colors.textSecondary,
        marginTop: 4,
    },

    // Sections
    section: {
        marginBottom: 15,
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 15,
        borderWidth: 1,
        borderColor: colors.border,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', // Wait, PDF doesn't support shadow well, but border helps
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 8,
    },
    sectionIcon: {
        fontSize: 14,
        marginRight: 6,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 700,
        color: '#0f172a',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Checklist Item
    itemRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
        paddingVertical: 8,
        wrap: false, // Prevent breaking item inside
    },
    itemStatus: {
        width: 20,
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 2,
    },
    itemContent: {
        flex: 1,
    },
    itemQuestion: {
        fontSize: 10,
        fontWeight: 600,
        marginBottom: 4,
    },
    itemAnswer: {
        fontSize: 10,
        color: colors.textSecondary,
        marginBottom: 4,
    },

    // Badges
    badge: {
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 4,
        alignSelf: 'flex-start',
        fontSize: 8,
        fontWeight: 600,
    },
    badgeSuccess: { backgroundColor: colors.successBg, color: colors.success },
    badgeDanger: { backgroundColor: colors.dangerBg, color: colors.danger },
    badgeWarning: { backgroundColor: colors.warningBg, color: colors.warning },

    // AI Box
    aiBox: {
        backgroundColor: '#f8fafc',
        borderLeftWidth: 3,
        borderLeftColor: '#7c3aed', // Purple
        padding: 8,
        marginTop: 6,
        borderRadius: 0,
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
    },
    aiLabel: {
        fontSize: 8,
        fontWeight: 700,
        color: '#7c3aed',
        marginBottom: 2,
    },
    aiText: {
        fontSize: 9,
        fontStyle: 'italic',
        color: '#475569',
    },

    // Action Plan Card
    actionCard: {
        marginBottom: 10,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 10,
        position: 'relative',
        overflow: 'hidden',
        wrap: false,
    },
    actionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    priorityBadge: {
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 10,
        fontSize: 8,
        fontWeight: 700,
        textTransform: 'uppercase',
    },
    priorityHigh: { backgroundColor: '#fee2e2', color: '#991b1b' },
    priorityMedium: { backgroundColor: '#fef3c7', color: '#92400e' },
    priorityLow: { backgroundColor: '#dcfce7', color: '#166534' },

    actionTitle: {
        fontSize: 11,
        fontWeight: 700,
        marginBottom: 4,
    },
    actionDesc: {
        fontSize: 10,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    actionFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    avatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    avatarText: {
        fontSize: 8,
        fontWeight: 700,
        color: '#64748b',
    },
    responsibleText: {
        fontSize: 9,
        color: colors.textSecondary,
    },

    // Media
    mediaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    mediaItem: {
        width: 150,
        height: 120,
        borderRadius: 4,
        backgroundColor: '#f1f5f9',
        overflow: 'hidden',
        border: '1px solid #cbd5e1',
    },
    mediaImage: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 10,
    },
    footerText: {
        fontSize: 8,
        color: '#94a3b8',
    },
    pageNumber: {
        fontSize: 8,
        color: '#94a3b8',
    },

    // Signatures
    sigGrid: {
        flexDirection: 'row',
        gap: 20,
        marginTop: 10,
    },
    sigCard: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 10,
        backgroundColor: '#fff',
    },
    sigLine: {
        height: 1,
        backgroundColor: '#cbd5e1',
        marginVertical: 10,
    },
    sigImg: {
        height: 40,
        objectFit: 'contain',
        alignSelf: 'center',
        marginBottom: 5,
    },
    signatureName: {
        fontSize: 9,
        fontWeight: 700,
        color: '#1e293b'
    },
    signatureRole: {
        fontSize: 8,
        color: '#64748b'
    }
});

const StatusIcon = ({ status }: { status: boolean | null | undefined }) => {
    if (status === true) return <Text style={{ color: colors.success }}>✓</Text>;
    if (status === false) return <Text style={{ color: colors.danger }}>✗</Text>;
    return <Text style={{ color: colors.warning }}>!</Text>;
};

export const PDFDocument = ({ inspection, items, media, actionItems, signatures, organizationLogo }: any) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Header */}
                <View style={styles.header} fixed>
                    <View style={styles.logoArea}>
                        {organizationLogo ? (
                            <Image src={organizationLogo} style={styles.logoImage} />
                        ) : (
                            <Text style={{ fontSize: 16, fontWeight: 700, color: colors.primary }}>Compia</Text>
                        )}
                    </View>
                    <View style={styles.headerMeta}>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>{inspection.status === 'concluida' ? 'FINALIZADO' : 'EM ANDAMENTO'}</Text>
                        </View>
                        <Text style={styles.reportTitle}>{inspection.title}</Text>
                        <Text style={styles.reportId}>ID #{String(inspection.id || '').substring(0, 8)}</Text>
                        <Text style={styles.reportDate}>{new Date().toLocaleDateString('pt-BR')} • {inspection.inspector_name}</Text>
                    </View>
                </View>

                {/* Stats Section */}
                <View style={[styles.section, { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20 }]}>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 24, fontWeight: 700, color: colors.primary }}>{items.length}</Text>
                        <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase' }}>Itens</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.border }} />
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 24, fontWeight: 700, color: colors.success }}>
                            {Math.round((items.filter((i: any) => i.is_compliant === true).length / items.length || 1) * 100)}%
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase' }}>Conformidade</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.border }} />
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 24, fontWeight: 700, color: colors.danger }}>{actionItems.length}</Text>
                        <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase' }}>Ações</Text>
                    </View>
                </View>

                {/* Checklist */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>📝</Text>
                        <Text style={styles.sectionTitle}>Questionário Detalhado</Text>
                    </View>

                    {items.map((item: any, index: number) => {
                        const itemMedia = media.filter((m: any) => m.inspection_item_id === item.id);
                        return (
                            <View key={index} style={styles.itemRow} wrap={false}>
                                <View style={styles.itemStatus}>
                                    <StatusIcon status={item.is_compliant} />
                                </View>
                                <View style={styles.itemContent}>
                                    <Text style={styles.itemQuestion}>{item.item_description}</Text>
                                    <Text style={styles.itemAnswer}>
                                        Status: {item.is_compliant === true ? 'Conforme' : item.is_compliant === false ? 'Não Conforme' : 'N/A'}
                                    </Text>

                                    {item.observations && <Text style={[styles.itemAnswer, { fontStyle: 'italic' }]}>Obs: {item.observations}</Text>}

                                    {item.ai_pre_analysis && (
                                        <View style={styles.aiBox}>
                                            <Text style={styles.aiLabel}>ROBÔ IA</Text>
                                            <Text style={styles.aiText}>{item.ai_pre_analysis}</Text>
                                        </View>
                                    )}

                                    {itemMedia.length > 0 && (
                                        <View style={styles.mediaGrid}>
                                            {itemMedia.map((m: any, i: number) => (
                                                (m.media_type === 'image' || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(m.file_name || '')) ? (
                                                    <View key={i} style={styles.mediaItem}>
                                                        <Image src={m.file_url} style={styles.mediaImage} />
                                                    </View>
                                                ) : null
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Action Plans */}
                {actionItems.length > 0 && (
                    <View style={[styles.section, { borderLeftWidth: 4, borderLeftColor: colors.warning }]} break>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionIcon}>⚡</Text>
                            <Text style={styles.sectionTitle}>Planos de Ação</Text>
                        </View>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                            {actionItems.map((action: any, index: number) => (
                                <View key={index} style={[styles.actionCard, { width: '48%' }]}>
                                    <View style={styles.actionHeader}>
                                        <View style={[styles.priorityBadge,
                                        action.priority === 'alta' ? styles.priorityHigh :
                                            action.priority === 'baixa' ? styles.priorityLow : styles.priorityMedium
                                        ]}>
                                            <Text style={{ fontSize: 8, fontWeight: 700, color: 'inherit' }}>{action.priority || 'MÉDIA'}</Text>
                                        </View>
                                        <Text style={{ fontSize: 9, color: colors.textSecondary }}>
                                            {action.when_deadline ? new Date(action.when_deadline).toLocaleDateString('pt-BR') : ''}
                                        </Text>
                                    </View>

                                    <Text style={styles.actionTitle}>{action.title}</Text>
                                    <Text style={styles.actionDesc}>{action.what_description}</Text>

                                    <View style={styles.actionFooter}>
                                        <View style={styles.avatar}>
                                            <Text style={styles.avatarText}>{(action.who_responsible || 'R')[0].toUpperCase()}</Text>
                                        </View>
                                        <Text style={styles.responsibleText}>{action.who_responsible || 'Não atribuído'}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Signatures */}
                {(signatures.inspector || signatures.responsible) && (
                    <View style={styles.section} wrap={false}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionIcon}>✍️</Text>
                            <Text style={styles.sectionTitle}>Assinaturas</Text>
                        </View>
                        <View style={styles.sigGrid}>
                            <View style={styles.sigCard}>
                                {signatures.inspector ? <Image src={signatures.inspector} style={styles.sigImg} /> : <View style={{ height: 40 }} />}
                                <View style={styles.sigLine} />
                                <Text style={styles.signatureName}>{inspection.inspector_name}</Text>
                                <Text style={styles.signatureRole}>Inspetor Responsável</Text>
                                {inspection.completed_date && (
                                    <Text style={[styles.signatureRole, { fontSize: 8, marginTop: 2 }]}>
                                        {new Date(inspection.completed_date).toLocaleString('pt-BR')}
                                    </Text>
                                )}
                            </View>

                            <View style={styles.sigCard}>
                                {signatures?.responsible ? (
                                    <Image src={signatures.responsible} style={styles.sigImg} />
                                ) : (
                                    <Text style={{ textAlign: 'center', color: colors.textSecondary, paddingVertical: 10 }}>Pendente</Text>
                                )}
                                <View style={styles.sigLine} />
                                <Text style={styles.signatureName}>{inspection.responsible_name || 'Não atribuído'}</Text>
                                <Text style={styles.signatureRole}>{inspection.responsible_role || 'Responsável'}</Text>
                                {inspection.completed_date && signatures?.responsible && (
                                    <Text style={[styles.signatureRole, { fontSize: 8, marginTop: 2 }]}>
                                        {new Date(inspection.completed_date).toLocaleString('pt-BR')}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>Sistema Compia • Relatório de Inspeção Digital</Text>
                    <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
                        `${pageNumber} / ${totalPages}`
                    )} fixed />
                </View>

            </Page>
        </Document>
    );
};
