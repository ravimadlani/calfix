/**
 * AuditPdfDocument Component
 * Generates a PDF report for the Calendar Audit page
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet
} from '@react-pdf/renderer';
import type { RecurringSummary, RelationshipSnapshot } from '../../types/recurring';

// PDF Styles using @react-pdf/renderer StyleSheet
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2px solid #4F46E5',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  date: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: 6,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 9,
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  metricHelper: {
    fontSize: 8,
    color: '#9CA3AF',
    marginTop: 4,
  },
  table: {
    width: '100%',
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderBottom: '1px solid #E5E7EB',
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1px solid #F3F4F6',
  },
  tableCell: {
    fontSize: 9,
    color: '#374151',
  },
  statusBadge: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusHealthy: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  statusOverdue: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  statusCritical: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1px solid #E5E7EB',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#9CA3AF',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottom: '1px solid #F3F4F6',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#374151',
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1F2937',
  },
});

interface AuditPdfDocumentProps {
  summary: RecurringSummary;
  relationships: RelationshipSnapshot[];
  generatedAt: Date;
  calendarName: string;
  rangeMode: 'retro' | 'forward';
  windowDays: number;
}

export function AuditPdfDocument({
  summary,
  relationships,
  generatedAt,
  calendarName,
  rangeMode,
  windowDays,
}: AuditPdfDocumentProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'healthy':
        return styles.statusHealthy;
      case 'overdue':
        return styles.statusOverdue;
      case 'critical':
        return styles.statusCritical;
      default:
        return {};
    }
  };

  // Get relationship counts by status
  const healthyCounts = relationships.filter(r => r.status === 'healthy').length;
  const overdueCounts = relationships.filter(r => r.status === 'overdue').length;
  const criticalCounts = relationships.filter(r => r.status === 'critical').length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Calendar Audit Report</Text>
          <Text style={styles.subtitle}>{calendarName}</Text>
          <Text style={styles.date}>
            Generated: {formatDate(generatedAt)} | {rangeMode === 'retro' ? 'Past' : 'Upcoming'} {windowDays} days
          </Text>
        </View>

        {/* Health Check Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Check Summary</Text>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Recurring Series</Text>
              <Text style={styles.metricValue}>{summary.totalSeries}</Text>
              <Text style={styles.metricHelper}>Distinct recurring meeting series</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Monthly Load</Text>
              <Text style={styles.metricValue}>{Math.round(summary.monthlyHours * 10) / 10}h</Text>
              <Text style={styles.metricHelper}>{Math.round(summary.percentOfWorkWeek)}% of a 40h work week</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>People Hours (Monthly)</Text>
              <Text style={styles.metricValue}>{Math.round(summary.peopleHours)}h</Text>
              <Text style={styles.metricHelper}>Attendee time invested</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Flagged Series</Text>
              <Text style={styles.metricValue}>{summary.flaggedSeries}</Text>
              <Text style={styles.metricHelper}>Series requiring attention</Text>
            </View>
          </View>
        </View>

        {/* Meeting Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meeting Breakdown</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Internal Series</Text>
            <Text style={styles.summaryValue}>{summary.internalSeries}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>External Series</Text>
            <Text style={styles.summaryValue}>{summary.externalSeries}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Placeholder Series</Text>
            <Text style={styles.summaryValue}>{summary.placeholderSeries}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Weekly Hours Committed</Text>
            <Text style={styles.summaryValue}>{Math.round(summary.weeklyHours * 10) / 10}h</Text>
          </View>
        </View>

        {/* Flag Summary */}
        {Object.keys(summary.flagCounts).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Flag Analysis</Text>

            {Object.entries(summary.flagCounts).map(([flag, count]) => (
              <View key={flag} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {flag.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </Text>
                <Text style={styles.summaryValue}>{count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 1:1 Relationships Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1:1 Relationships Overview</Text>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Relationships</Text>
              <Text style={styles.metricValue}>{relationships.length}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Healthy</Text>
              <Text style={[styles.metricValue, { color: '#065F46' }]}>{healthyCounts}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Overdue</Text>
              <Text style={[styles.metricValue, { color: '#92400E' }]}>{overdueCounts}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Critical</Text>
              <Text style={[styles.metricValue, { color: '#991B1B' }]}>{criticalCounts}</Text>
            </View>
          </View>
        </View>

        {/* Top 10 Relationships Table */}
        {relationships.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Top Relationships ({Math.min(10, relationships.length)} of {relationships.length})
            </Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Person</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Status</Text>
                <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Avg. Cadence</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Last Met</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Type</Text>
              </View>

              {relationships.slice(0, 10).map((rel, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '35%' }]}>
                    {rel.personName || rel.personEmail}
                  </Text>
                  <View style={{ width: '15%' }}>
                    <Text style={[styles.statusBadge, getStatusStyle(rel.status)]}>
                      {rel.status.charAt(0).toUpperCase() + rel.status.slice(1)}
                    </Text>
                  </View>
                  <Text style={[styles.tableCell, { width: '20%' }]}>
                    {rel.averageGapDays ? `${Math.round(rel.averageGapDays)} days` : 'N/A'}
                  </Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>
                    {rel.daysSinceLast !== null ? `${Math.round(rel.daysSinceLast)}d ago` : 'N/A'}
                  </Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>
                    {rel.isRecurring ? 'Recurring' : 'One-off'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>CalendarZero - Calendar Audit Report</Text>
          <Text style={styles.footerText}>Page 1</Text>
        </View>
      </Page>
    </Document>
  );
}

export default AuditPdfDocument;
