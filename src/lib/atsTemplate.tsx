import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import type { ResumeSection, ResumeHeaderData } from '@/types';

// Single-column ATS-safe template. No tables, no text boxes, no graphics.
// All fonts are PDF built-ins so no network fetch is needed at render time.
const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 54, // ~0.75 inch
    paddingVertical: 54,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.35,
    color: '#1a1a1a',
  },
  name: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  professionalTitle: {
    fontSize: 11,
    marginBottom: 4,
    color: '#333333',
  },
  contactLine: {
    fontSize: 9,
    color: '#444444',
    marginBottom: 16,
  },
  sectionContainer: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 0.75,
    borderBottomColor: '#1a1a1a',
    paddingBottom: 2,
    marginBottom: 5,
  },
  line: {
    fontSize: 10,
    marginBottom: 1.5,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 1.5,
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
    height: 4,
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
          {i > 0 ? '   |   ' : ''}
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
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletMark}>•</Text>
              <Text style={styles.bulletBody}>{line.replace(/^\s*[-•]\s+/, '')}</Text>
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
          </View>
        )}

        {body.map((section, i) => (
          <View key={i} style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <SectionContent content={section.content} />
          </View>
        ))}
      </Page>
    </Document>
  );
}
