/**
 * AuditPdfDocument Component
 * Generates a comprehensive PDF report for the Calendar Audit page
 * Includes detailed recurring meeting series and 1:1 relationship data
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet
} from '@react-pdf/renderer';
import type { RecurringSummary, RecurringSeriesMetrics, RelationshipSnapshot } from '../../types/recurring';

// PDF Styles using @react-pdf/renderer StyleSheet
const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 60,
    fontSize: 9,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  // Header styles
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #4F46E5',
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  date: {
    fontSize: 9,
    color: '#9CA3AF',
  },
  // Section styles
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4,
  },
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  // Metrics grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  metricCard: {
    width: '24%',
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    padding: 10,
    marginRight: '1%',
    marginBottom: 6,
    borderLeft: '3px solid #4F46E5',
  },
  metricCardWide: {
    width: '32%',
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    padding: 10,
    marginRight: '1%',
    marginBottom: 6,
    borderLeft: '3px solid #4F46E5',
  },
  metricLabel: {
    fontSize: 7,
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  metricHelper: {
    fontSize: 7,
    color: '#9CA3AF',
    marginTop: 2,
  },
  // Table styles
  table: {
    width: '100%',
    marginTop: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    padding: 6,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: '1px solid #E5E7EB',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: '1px solid #E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  tableCell: {
    fontSize: 8,
    color: '#374151',
  },
  tableCellBold: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  tableCellSmall: {
    fontSize: 7,
    color: '#6B7280',
  },
  // Status badges
  statusBadge: {
    fontSize: 7,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    textAlign: 'center',
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
  // Flag badges
  flagBadge: {
    fontSize: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    marginRight: 3,
    marginBottom: 2,
  },
  flagHighPeopleHours: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  flagExternalNoEnd: {
    backgroundColor: '#E9D5FF',
    color: '#6B21A8',
  },
  flagStale: {
    backgroundColor: '#F1F5F9',
    color: '#475569',
  },
  // Summary rows
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottom: '1px solid #F3F4F6',
  },
  summaryLabel: {
    fontSize: 9,
    color: '#374151',
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    borderTop: '1px solid #E5E7EB',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#9CA3AF',
  },
  // Page break
  pageBreak: {
    marginTop: 20,
  },
  // No data message
  noData: {
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 10,
    color: '#6B7280',
  },
  // Inline metrics
  inlineMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  inlineMetric: {
    marginRight: 12,
    marginBottom: 2,
  },
  inlineMetricLabel: {
    fontSize: 7,
    color: '#6B7280',
  },
  inlineMetricValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1F2937',
  },
});

interface AuditPdfDocumentProps {
  summary: RecurringSummary;
  series: RecurringSeriesMetrics[];
  relationships: RelationshipSnapshot[];
  generatedAt: Date;
  calendarName: string;
  rangeMode: 'retro' | 'forward';
  windowDays: number;
}

export function AuditPdfDocument({
  summary,
  series,
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

  const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
  const formatHours = (minutes: number) => `${Math.round(minutes / 60 * 10) / 10}h`;

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

  const getFlagStyle = (flag: string) => {
    switch (flag) {
      case 'high-people-hours':
        return styles.flagHighPeopleHours;
      case 'external-no-end':
        return styles.flagExternalNoEnd;
      case 'stale':
        return styles.flagStale;
      default:
        return styles.flagStale;
    }
  };

  const getFlagLabel = (flag: string) => {
    const labels: Record<string, string> = {
      'high-people-hours': 'High People Hours',
      'external-no-end': 'External - No End',
      'stale': 'Stale',
    };
    return labels[flag] || flag;
  };

  // Get relationship counts by status
  const healthyCounts = relationships.filter(r => r.status === 'healthy').length;
  const overdueCounts = relationships.filter(r => r.status === 'overdue').length;
  const criticalCounts = relationships.filter(r => r.status === 'critical').length;
  const recurringCount = relationships.filter(r => r.isRecurring).length;

  // Sort series by monthly load (highest first)
  const sortedSeries = [...series].sort((a, b) => b.monthlyMinutes - a.monthlyMinutes);

  // Sort relationships - critical first, then overdue, then healthy
  const sortedRelationships = [...relationships].sort((a, b) => {
    const order = { critical: 0, overdue: 1, healthy: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <Document>
      {/* Page 1: Executive Summary */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Calendar Audit Report</Text>
          <Text style={styles.subtitle}>{calendarName}</Text>
          <Text style={styles.date}>
            Generated: {formatDate(generatedAt)} | Analysis Period: {rangeMode === 'retro' ? 'Past' : 'Upcoming'} {windowDays} days
          </Text>
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Recurring Series</Text>
              <Text style={styles.metricValue}>{summary.totalSeries}</Text>
              <Text style={styles.metricHelper}>Total meeting series</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Weekly Load</Text>
              <Text style={styles.metricValue}>{Math.round(summary.weeklyHours * 10) / 10}h</Text>
              <Text style={styles.metricHelper}>Hours per week</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Monthly Load</Text>
              <Text style={styles.metricValue}>{Math.round(summary.monthlyHours * 10) / 10}h</Text>
              <Text style={styles.metricHelper}>{Math.round(summary.percentOfWorkWeek)}% of work week</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>People Hours</Text>
              <Text style={styles.metricValue}>{Math.round(summary.peopleHours)}h</Text>
              <Text style={styles.metricHelper}>Monthly attendee time</Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Internal</Text>
              <Text style={styles.metricValue}>{summary.internalSeries}</Text>
              <Text style={styles.metricHelper}>Internal meetings</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>External</Text>
              <Text style={styles.metricValue}>{summary.externalSeries}</Text>
              <Text style={styles.metricHelper}>External meetings</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Flagged</Text>
              <Text style={[styles.metricValue, summary.flaggedSeries > 0 ? { color: '#DC2626' } : {}]}>
                {summary.flaggedSeries}
              </Text>
              <Text style={styles.metricHelper}>Need attention</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>1:1 Relationships</Text>
              <Text style={styles.metricValue}>{relationships.length}</Text>
              <Text style={styles.metricHelper}>Active contacts</Text>
            </View>
          </View>
        </View>

        {/* Flag Analysis */}
        {Object.keys(summary.flagCounts).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>Flag Analysis</Text>
            {Object.entries(summary.flagCounts).map(([flag, count]) => (
              <View key={flag} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {getFlagLabel(flag)}
                </Text>
                <Text style={styles.summaryValue}>{count} series</Text>
              </View>
            ))}
          </View>
        )}

        {/* 1:1 Relationship Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>1:1 Relationship Health</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCardWide}>
              <Text style={styles.metricLabel}>Healthy</Text>
              <Text style={[styles.metricValue, { color: '#065F46' }]}>{healthyCounts}</Text>
              <Text style={styles.metricHelper}>On track relationships</Text>
            </View>
            <View style={styles.metricCardWide}>
              <Text style={styles.metricLabel}>Overdue</Text>
              <Text style={[styles.metricValue, { color: '#92400E' }]}>{overdueCounts}</Text>
              <Text style={styles.metricHelper}>Need scheduling</Text>
            </View>
            <View style={styles.metricCardWide}>
              <Text style={styles.metricLabel}>Critical</Text>
              <Text style={[styles.metricValue, { color: '#DC2626' }]}>{criticalCounts}</Text>
              <Text style={styles.metricHelper}>Urgent attention</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>CalendarZero - Calendar Audit Report</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* Page 2+: Recurring Meetings Detail */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recurring Meeting Series - Full Detail</Text>
          <Text style={{ fontSize: 8, color: '#6B7280', marginBottom: 10 }}>
            Sorted by monthly time commitment (highest first). Showing all {sortedSeries.length} series.
          </Text>

          {sortedSeries.length === 0 ? (
            <View style={styles.noData}>
              <Text style={styles.noDataText}>No recurring meeting series found in this time window.</Text>
            </View>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Meeting Series</Text>
                <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Cadence</Text>
                <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Monthly</Text>
                <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Attendees</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Engagement</Text>
                <Text style={[styles.tableHeaderCell, { width: '26%' }]}>Flags</Text>
              </View>

              {sortedSeries.map((item, index) => (
                <View key={item.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt} wrap={false}>
                  <View style={{ width: '25%' }}>
                    <Text style={styles.tableCellBold}>
                      {item.title}
                    </Text>
                    <Text style={styles.tableCellSmall}>
                      {item.organizerEmail || 'Unknown organizer'}
                    </Text>
                  </View>
                  <View style={{ width: '12%' }}>
                    <Text style={styles.tableCell}>{item.frequencyLabel}</Text>
                    <Text style={styles.tableCellSmall}>
                      {item.averageGapDays ? `~${Math.round(item.averageGapDays)}d gap` : ''}
                    </Text>
                  </View>
                  <View style={{ width: '10%' }}>
                    <Text style={styles.tableCellBold}>{formatHours(item.monthlyMinutes)}</Text>
                    <Text style={styles.tableCellSmall}>
                      {Math.round(item.peopleHoursPerMonth)}h ppl
                    </Text>
                  </View>
                  <View style={{ width: '12%' }}>
                    <Text style={styles.tableCell}>{item.attendeeCount} total</Text>
                    <Text style={styles.tableCellSmall}>
                      {item.internalAttendeeCount}i / {item.externalAttendeeCount}e
                    </Text>
                  </View>
                  <View style={{ width: '15%' }}>
                    <Text style={styles.tableCell}>Accept: {formatPercent(item.acceptanceRate)}</Text>
                    <Text style={styles.tableCellSmall}>Cancel: {formatPercent(item.cancellationRate)}</Text>
                  </View>
                  <View style={{ width: '26%', flexDirection: 'row', flexWrap: 'wrap' }}>
                    {item.flags.length === 0 ? (
                      <Text style={styles.tableCellSmall}>None</Text>
                    ) : (
                      item.flags.map((flag, flagIndex) => (
                        <Text key={flagIndex} style={[styles.flagBadge, getFlagStyle(flag)]}>
                          {getFlagLabel(flag)}
                        </Text>
                      ))
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>CalendarZero - Calendar Audit Report</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* Page 3+: 1:1 Relationships Detail */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1:1 Relationships - Full Detail</Text>
          <Text style={{ fontSize: 8, color: '#6B7280', marginBottom: 10 }}>
            Sorted by status (critical first). Showing all {sortedRelationships.length} relationships.
            {recurringCount} recurring, {relationships.length - recurringCount} one-off.
          </Text>

          {sortedRelationships.length === 0 ? (
            <View style={styles.noData}>
              <Text style={styles.noDataText}>No 1:1 relationships found in this time window.</Text>
            </View>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Person</Text>
                <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Status</Text>
                <Text style={[styles.tableHeaderCell, { width: '14%' }]}>Avg Cadence</Text>
                <Text style={[styles.tableHeaderCell, { width: '14%' }]}>Last Meeting</Text>
                <Text style={[styles.tableHeaderCell, { width: '14%' }]}>Next Meeting</Text>
                <Text style={[styles.tableHeaderCell, { width: '16%' }]}>Type</Text>
              </View>

              {sortedRelationships.map((rel, index) => (
                <View key={rel.personEmail} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt} wrap={false}>
                  <View style={{ width: '30%' }}>
                    <Text style={styles.tableCellBold}>
                      {rel.personName || 'Unknown'}
                    </Text>
                    <Text style={styles.tableCellSmall}>
                      {rel.personEmail}
                    </Text>
                  </View>
                  <View style={{ width: '12%' }}>
                    <Text style={[styles.statusBadge, getStatusStyle(rel.status)]}>
                      {rel.status.charAt(0).toUpperCase() + rel.status.slice(1)}
                    </Text>
                  </View>
                  <View style={{ width: '14%' }}>
                    <Text style={styles.tableCell}>
                      {rel.averageGapDays ? `${Math.round(rel.averageGapDays)} days` : 'N/A'}
                    </Text>
                  </View>
                  <View style={{ width: '14%' }}>
                    <Text style={styles.tableCell}>
                      {rel.daysSinceLast !== null
                        ? `${Math.round(rel.daysSinceLast)} days ago`
                        : 'No recent meeting'}
                    </Text>
                  </View>
                  <View style={{ width: '14%' }}>
                    <Text style={styles.tableCell}>
                      {rel.daysUntilNext !== null
                        ? rel.daysUntilNext >= 0
                          ? `In ${Math.round(rel.daysUntilNext)} days`
                          : `${Math.abs(Math.round(rel.daysUntilNext))} days overdue`
                        : 'Not scheduled'}
                    </Text>
                  </View>
                  <View style={{ width: '16%' }}>
                    <Text style={styles.tableCell}>
                      {rel.isRecurring ? 'Recurring' : 'One-off'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Recommendations Section */}
        <View style={[styles.section, { marginTop: 20 }]}>
          <Text style={styles.sectionSubtitle}>Recommended Actions</Text>
          <View style={{ backgroundColor: '#F0FDF4', padding: 12, borderRadius: 4, borderLeft: '3px solid #22C55E' }}>
            {criticalCounts > 0 && (
              <Text style={{ fontSize: 9, color: '#166534', marginBottom: 6 }}>
                • Schedule catch-ups with {criticalCounts} critical relationship(s) immediately
              </Text>
            )}
            {overdueCounts > 0 && (
              <Text style={{ fontSize: 9, color: '#166534', marginBottom: 6 }}>
                • Review {overdueCounts} overdue relationship(s) and schedule meetings this week
              </Text>
            )}
            {summary.flaggedSeries > 0 && (
              <Text style={{ fontSize: 9, color: '#166534', marginBottom: 6 }}>
                • Audit {summary.flaggedSeries} flagged meeting series for optimization opportunities
              </Text>
            )}
            {summary.percentOfWorkWeek > 50 && (
              <Text style={{ fontSize: 9, color: '#166534', marginBottom: 6 }}>
                • Consider reducing recurring meeting load ({Math.round(summary.percentOfWorkWeek)}% of work week)
              </Text>
            )}
            {criticalCounts === 0 && overdueCounts === 0 && summary.flaggedSeries === 0 && (
              <Text style={{ fontSize: 9, color: '#166534' }}>
                • Calendar is in good health! Continue monitoring with regular audits.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>CalendarZero - Calendar Audit Report</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export default AuditPdfDocument;
