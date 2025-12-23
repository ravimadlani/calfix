# Rename Recurring to Audit with PDF Export

## Overview

Rename the "Recurring" page to "Audit", simplify the tab structure by removing the "Audit Report" tab (keeping only "Health Check" and "1:1s"), and add a PDF export feature for executives to generate printable reports.

## Problem Statement / Motivation

1. **Naming Clarity**: "Recurring" doesn't accurately describe the page's purpose. "Audit" better reflects the value proposition of analyzing calendar health and meeting patterns.

2. **Tab Simplification**: Three tabs are unnecessary. The "Audit Report" tab content can be consolidated or exported, leaving cleaner navigation with just "Health Check" and "1:1s".

3. **Executive Reporting**: Executives need a way to generate professional PDF reports to share calendar insights with stakeholders, print for meetings, or archive for records.

---

## Technical Approach

### Part 1: Rename Recurring to Audit

**Files to Modify:**

| File | Changes |
|------|---------|
| `src/components/RecurringPage.tsx` | Rename to `AuditPage.tsx`, update title to "Calendar Audit" |
| `src/App.tsx` | Update import and route from `/recurring` to `/audit` |
| `src/components/Layout.tsx` | Update nav link text and path (lines 64-73, 289-293) |
| `src/components/onboarding/WelcomeStep.tsx` | Update feature reference (line 70) |
| `src/components/onboarding/CompleteStep.tsx` | Update page reference (line 51) |

**Route Redirect:** Add redirect from `/recurring` to `/audit` for existing bookmarks/links.

### Part 2: Remove Audit Report Tab

**Current tabs** (`RecurringPage.tsx:22-32`):
```tsx
{ key: 'health', label: 'Health Check' }
{ key: 'relationships', label: '1:1s' }
{ key: 'audit', label: 'Audit Report' }  // REMOVE
```

**After change:** Only two tabs remain: Health Check and 1:1s.

### Part 3: PDF Export Feature

**Library:** `@react-pdf/renderer` (recommended for React + Vite + TypeScript)

**Why this library:**
- Native React component model (JSX-based)
- Client-side generation (no server needed)
- Strong TypeScript support
- Flexbox-like styling system
- Good bundle size (~300KB gzipped)
- Active maintenance

**Export Button Location:** Top-right of page header, next to any existing actions.

**PDF Content:** Summary of both tabs:
- Calendar health metrics (score, findings, recommendations)
- 1:1 relationship status (meeting patterns, frequency, quality)
- Generated date/time
- User and calendar context

---

## Implementation Phases

### Phase 1: Rename Recurring to Audit

**Step 1.1: Rename component file**
```bash
git mv src/components/RecurringPage.tsx src/components/AuditPage.tsx
```

**Step 1.2: Update component internal references** (`src/components/AuditPage.tsx`)
- Change export name from `RecurringPage` to `AuditPage`
- Update PageHeader title from "Recurring Meetings" to "Calendar Audit"
- Update description to match new naming

**Step 1.3: Update route and import** (`src/App.tsx`)
```tsx
// Before
import RecurringPage from './components/RecurringPage';
<Route path="/recurring" element={<RecurringPage />} />

// After
import AuditPage from './components/AuditPage';
<Route path="/audit" element={<AuditPage />} />
<Route path="/recurring" element={<Navigate to="/audit" replace />} />
```

**Step 1.4: Update navigation** (`src/components/Layout.tsx`)
- Header nav: Change "Recurring" link to "Audit" with path `/audit`
- Footer nav: Same change

**Step 1.5: Update onboarding references**
- `WelcomeStep.tsx`: Update feature description
- `CompleteStep.tsx`: Update page reference

### Phase 2: Remove Audit Report Tab

**Step 2.1: Remove tab from array** (`src/components/AuditPage.tsx`)
```tsx
// Before
const tabs = [
  { key: 'health', label: 'Health Check' },
  { key: 'relationships', label: '1:1s' },
  { key: 'audit', label: 'Audit Report' },  // Delete this line
];

// After
const tabs = [
  { key: 'health', label: 'Health Check' },
  { key: 'relationships', label: '1:1s' },
];
```

**Step 2.2: Remove tab content rendering**
- Delete the conditional render block for `activeTab === 'audit'`
- Remove any audit-specific state or data fetching

**Step 2.3: Clean up unused code**
- Remove imports only used by Audit Report tab
- Remove helper functions only used by Audit Report tab

### Phase 3: Add PDF Export

**Step 3.1: Install dependency**
```bash
npm install @react-pdf/renderer
```

**Step 3.2: Create PDF document component** (`src/components/audit/AuditPdfDocument.tsx`)
```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

interface AuditPdfProps {
  healthData: HealthCheckData;
  relationshipsData: RelationshipsData;
  generatedAt: Date;
  calendarName: string;
}

export function AuditPdfDocument({
  healthData,
  relationshipsData,
  generatedAt,
  calendarName
}: AuditPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Calendar Audit Report</Text>
          <Text style={styles.subtitle}>{calendarName}</Text>
          <Text style={styles.date}>
            Generated: {generatedAt.toLocaleDateString()}
          </Text>
        </View>

        {/* Health Check Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Check</Text>
          {/* Health metrics content */}
        </View>

        {/* 1:1s Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1:1 Relationships</Text>
          {/* Relationships content */}
        </View>
      </Page>
    </Document>
  );
}
```

**Step 3.3: Add export button to page header** (`src/components/AuditPage.tsx`)
```tsx
import { pdf } from '@react-pdf/renderer';
import { AuditPdfDocument } from './audit/AuditPdfDocument';

// In component:
const handleExportPdf = async () => {
  setExporting(true);
  try {
    const blob = await pdf(
      <AuditPdfDocument
        healthData={healthData}
        relationshipsData={relationshipsData}
        generatedAt={new Date()}
        calendarName={selectedCalendar?.summary || 'Calendar'}
      />
    ).toBlob();

    // Download the PDF
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calendar-audit-${new Date().toISOString().split('T')[0]}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('PDF export failed:', error);
    setError('Failed to generate PDF. Please try again.');
  } finally {
    setExporting(false);
  }
};

// In JSX:
<PageHeader
  title="Calendar Audit"
  description="..."
  variant="sticky"
  action={
    <button
      onClick={handleExportPdf}
      disabled={exporting || !hasData}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      {exporting ? 'Generating...' : 'Export PDF'}
    </button>
  }
/>
```

**Step 3.4: Style the PDF**
- Use CalendarZero brand colors
- Professional layout with clear sections
- Include CalendarZero logo (optional)
- Proper typography hierarchy

---

## Acceptance Criteria

### Functional Requirements

- [ ] Navigation shows "Audit" instead of "Recurring"
- [ ] Route `/audit` loads the Audit page correctly
- [ ] Route `/recurring` redirects to `/audit`
- [ ] Only two tabs visible: "Health Check" and "1:1s"
- [ ] "Export PDF" button visible in page header
- [ ] Clicking export generates and downloads a PDF file
- [ ] PDF contains health check and 1:1 data

### Quality Gates

- [ ] All existing tests pass
- [ ] No TypeScript errors
- [ ] No console errors or warnings
- [ ] PDF renders correctly (no blank pages, proper formatting)
- [ ] Export works on desktop browsers (Chrome, Firefox, Safari)
- [ ] Button shows loading state during generation

---

## Data Requirements for PDF

The PDF export needs access to the same data currently displayed in the tabs:

**Health Check Data:**
- Overall health score (0-100)
- Individual metric scores
- Findings and recommendations
- Meeting counts and statistics

**1:1s Data:**
- List of 1:1 relationships
- Meeting frequency for each
- Quality indicators
- Last meeting dates

**Metadata:**
- Calendar name
- Date range analyzed
- Generation timestamp
- User context (optional)

---

## Error Handling

1. **No data available**: Disable export button with tooltip "Load data first"
2. **Generation failure**: Show toast/alert with retry option
3. **Large data sets**: Show progress indicator (if generation takes >2s)

---

## File Structure (New)

```
src/
├── components/
│   ├── AuditPage.tsx           # Renamed from RecurringPage.tsx
│   └── audit/
│       ├── AuditPdfDocument.tsx    # PDF document component
│       └── pdfStyles.ts            # Shared PDF styles
```

---

## References

### Internal References
- Current page: `src/components/RecurringPage.tsx`
- Routes: `src/App.tsx:78-87`
- Navigation: `src/components/Layout.tsx:64-73`
- PageHeader: `src/components/shared/PageHeader.tsx`

### External References
- [@react-pdf/renderer docs](https://react-pdf.org/)
- [React PDF examples](https://react-pdf.org/repl)

---

## MVP Scope

**Include in MVP:**
- Rename Recurring → Audit (all files)
- Remove Audit Report tab
- Basic PDF export with health check and 1:1 summaries
- Simple professional styling

**Defer to future:**
- Charts/graphs in PDF
- Custom branding options
- Email PDF directly
- Scheduled report generation
