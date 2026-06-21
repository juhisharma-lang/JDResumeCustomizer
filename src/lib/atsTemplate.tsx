import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import type { ResumeSection, ResumeHeaderData } from '@/types';

// Single-column ATS-safe template. No tables, no text boxes, no graphics.
// All fonts are PDF built-ins so no network fetch is needed at render time.

// Vertical-rhythm tokens — one place to tune all spacing.
// Tightened vs the prior version to offset the two added rules (header + per-section).
const sp = {
  afterName: 2,         // name → title
  afterTitle: 2,        // title → contact line
  afterContact: 3,      // contact line → header rule
  afterHeaderRule: 5,   // header rule → first section
  afterSection: 8,      // bottom gap between sections (was 10)
  headingToRule: 2,     // section heading text → its rule
  afterSectionRule: 4,  // section rule → first content line
  lineGap: 1.5,         // between bullet/plain lines (unchanged)
  spacer: 3,            // blank-line spacer height (was 4)
};

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 54,  // ~0.75 inch
    paddingVertical: 54,
    fontFamily: 'Times-Roman',
    fontSize: 10,
    lineHeight: 1.35,
    color: '#1a1a1a',
  },
  name: {
    fontSize: 18,
    fontFamily: 'Times-Bold',
    textAlign: 'center',
    marginBottom: sp.afterName,
  },
  professionalTitle: {
    fontSize: 11,
    textAlign: 'center',
    color: '#333333',
    marginBottom: sp.afterTitle,
  },
  contactLine: {
    fontSize: 9,
    textAlign: 'center',
    color: '#444444',
    marginBottom: sp.afterContact,
  },
  headerRule: {
    borderBottomWidth: 0.75,
    borderBottomColor: '#1a1a1a',
    marginBottom: sp.afterHeaderRule,
  },
  sectionContainer: {
    marginBottom: sp.afterSection,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Times-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: sp.headingToRule,
  },
  sectionRule: {
    borderBottomWidth: 0.75,
    borderBottomColor: '#1a1a1a',
    marginBottom: sp.afterSectionRule,
  },
  line: {
    fontSize: 10,
    marginBottom: sp.lineGap,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: sp.lineGap,
    paddingLeft: 4,
  },
  bulletMark: {
    fontSize: 10,
    width: 10,
    flexShrink: 0,
  },
  bulletBody: {
    fontSize: 10,
    flex: 1,
  },
  spacer: {
    height: sp.spacer,
  },
  tabbedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: sp.lineGap,
  },
  tabbedLeft: {
    fontSize: 10,
    flex: 1,
  },
  tabbedRight: {
    fontSize: 10,
    flexShrink: 0,
    textAlign: 'right',
  },
});

// Renders the contact line as inline text with clickable Link nodes for URLs.
// Shows only the link label (e.g. "LinkedIn"), never the raw URL, to avoid
// auto-hyphenation of long URLs and keep the line clean.
function ContactLine({ data }: { data: ResumeHeaderData }) {
  type Part = { kind: 'text'; value: string } | { kind: 'link'; label: string; url: string };
  const parts: Part[] = [];
  if (data.phone) parts.push({ kind: 'text', value: data.phone });
  if (data.email) parts.push({ kind: 'text', value: data.email });
  if (data.location) parts.push({ kind: 'text', value: data.location });
  for (const link of data.links) {
    if (link.url) parts.push({ kind: 'link', label: link.label, url: link.url });
    else parts.push({ kind: 'text', value: link.label });
  }

  return (
    <Text style={styles.contactLine}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 ? ' • ' : ''}
          {part.kind === 'link' ? (
            <Link src={part.url} style={{ color: '#444444', textDecoration: 'none' }}>
              {part.label}
            </Link>
          ) : (
            part.value
          )}
        </React.Fragment>
      ))}
    </Text>
  );
}

function SectionContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <View>
      {lines.map((line, i) => {
        if (!line.trim()) return <View key={i} style={styles.spacer} />;
        const isBullet = /^\s*[-•]\s+/.test(line);
        if (isBullet) {
          return (
            <View key={i} style={styles.bulletRow} wrap={false}>
              <Text style={styles.bulletMark}>•</Text>
              <Text style={styles.bulletBody}>{line.replace(/^\s*[-•]\s+/, '')}</Text>
            </View>
          );
        }
        const tabIdx = line.indexOf('\t');
        if (tabIdx !== -1) {
          const left = line.slice(0, tabIdx).trimEnd();
          const right = line.slice(tabIdx + 1).trimStart();
          return (
            <View key={i} style={styles.tabbedRow} wrap={false}>
              <Text style={styles.tabbedLeft}>{left}</Text>
              <Text style={styles.tabbedRight}>{right}</Text>
            </View>
          );
        }
        return <Text key={i} style={styles.line}>{line}</Text>;
      })}
    </View>
  );
}

export function ATSTemplate({ sections }: { sections: ResumeSection[] }) {
  const header = sections.find((s): s is { title: 'Header'; data: ResumeHeaderData } => 'data' in s);
  const body = sections.filter((s): s is { title: string; content: string } => !('data' in s));

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {header && (
          <View>
            <Text style={styles.name}>{header.data.name}</Text>
            {header.data.title && <Text style={styles.professionalTitle}>{header.data.title}</Text>}
            <ContactLine data={header.data} />
            <View style={styles.headerRule} />
          </View>
        )}

        {body.map((section, i) => (
          <View key={i} style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionRule} />
            <SectionContent content={section.content} />
          </View>
        ))}
      </Page>
    </Document>
  );
}
