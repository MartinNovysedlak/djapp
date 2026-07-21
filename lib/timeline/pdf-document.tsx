import React from "react";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  ROBOTO_BOLD_BASE64,
  ROBOTO_REGULAR_BASE64,
} from "@/lib/contracts/fonts-data";
import type { TimelineEnergy, TimelineItemType } from "@/lib/timeline/types";

Font.register({
  family: "Roboto",
  fonts: [
    {
      src: `data:font/ttf;base64,${ROBOTO_REGULAR_BASE64}`,
      fontWeight: 400,
    },
    {
      src: `data:font/ttf;base64,${ROBOTO_BOLD_BASE64}`,
      fontWeight: 700,
    },
  ],
});

export type TimelinePdfItem = {
  timeLabel: string;
  typeLabel: string;
  title: string;
  notes: string | null;
  songLabel: string | null;
  techNotes: string | null;
  energyLabel: string | null;
  startLabel: string | null;
  startDetail: string | null;
  durationLabel: string | null;
  isCritical: boolean;
  itemType: TimelineItemType;
};

export type TimelinePdfData = {
  clientName: string;
  eventType: string;
  eventDateLabel: string;
  eventLocation: string | null;
  items: TimelinePdfItem[];
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    backgroundColor: "#0A0A0A",
    color: "#F5F5F5",
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 36,
  },
  header: {
    marginBottom: 22,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: "#FFFFFF",
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "#A3A3A3",
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  meta: {
    fontSize: 10,
    color: "#D4D4D4",
    marginRight: 14,
    marginBottom: 3,
  },
  metaStrong: {
    fontSize: 10,
    fontWeight: 700,
    color: "#FFFFFF",
    marginRight: 14,
    marginBottom: 3,
  },
  legend: {
    fontSize: 8,
    color: "#737373",
    marginTop: 6,
  },
  empty: {
    marginTop: 40,
    fontSize: 13,
    color: "#A3A3A3",
    textAlign: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#262626",
  },
  itemCritical: {
    backgroundColor: "#1A0A0C",
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#FB7185",
  },
  timeCol: {
    width: 78,
    paddingRight: 10,
  },
  time: {
    fontSize: 14,
    fontWeight: 700,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  untimed: {
    fontSize: 9,
    fontWeight: 700,
    color: "#FBBF24",
    textTransform: "uppercase",
  },
  contentCol: {
    flex: 1,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 3,
  },
  badge: {
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#A3A3A3",
    marginRight: 8,
    marginBottom: 2,
  },
  badgeCritical: {
    color: "#FB7185",
  },
  activity: {
    fontSize: 12,
    fontWeight: 700,
    color: "#FAFAFA",
    marginBottom: 2,
  },
  song: {
    fontSize: 10,
    fontWeight: 700,
    color: "#F0ABFC",
    marginBottom: 2,
  },
  start: {
    fontSize: 9,
    fontWeight: 700,
    color: "#6EE7B7",
    marginBottom: 2,
  },
  notes: {
    fontSize: 9,
    color: "#A3A3A3",
    lineHeight: 1.4,
    marginBottom: 2,
  },
  tech: {
    fontSize: 9,
    color: "#FCD34D",
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: "#737373",
  },
});

export function TimelinePdfDocument({ data }: { data: TimelinePdfData }) {
  return (
    <Document
      title={`Program – ${data.clientName}`}
      author="BookTheVibe"
      subject="Harmonogram akcie"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Program akcie · Harmonogram</Text>
          <Text style={styles.title}>{data.clientName || "Klient"}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaStrong}>{data.eventDateLabel}</Text>
            <Text style={styles.meta}>{data.eventType}</Text>
            {data.eventLocation ? (
              <Text style={styles.meta}>{data.eventLocation}</Text>
            ) : null}
          </View>
          <Text style={styles.legend}>
            Čas · typ · spustenie · skladba · technika · kritické momenty
          </Text>
        </View>

        {data.items.length === 0 ? (
          <Text style={styles.empty}>Harmonogram je zatiaľ prázdny.</Text>
        ) : (
          data.items.map((item, index) => (
            <View
              key={`${item.title}-${index}`}
              style={
                item.isCritical
                  ? [styles.item, styles.itemCritical]
                  : styles.item
              }
              wrap={false}
            >
              <View style={styles.timeCol}>
                {item.timeLabel ? (
                  <Text style={styles.time}>{item.timeLabel}</Text>
                ) : (
                  <Text style={styles.untimed}>bez času</Text>
                )}
                {item.durationLabel ? (
                  <Text style={styles.notes}>{item.durationLabel}</Text>
                ) : null}
              </View>
              <View style={styles.contentCol}>
                <View style={styles.badges}>
                  <Text style={styles.badge}>{item.typeLabel}</Text>
                  {item.isCritical ? (
                    <Text style={[styles.badge, styles.badgeCritical]}>
                      Kritické
                    </Text>
                  ) : null}
                  {item.startLabel ? (
                    <Text style={styles.badge}>{item.startLabel}</Text>
                  ) : null}
                  {item.energyLabel ? (
                    <Text style={styles.badge}>{item.energyLabel}</Text>
                  ) : null}
                </View>
                <Text style={styles.activity}>{item.title}</Text>
                {item.startDetail ? (
                  <Text style={styles.start}>{item.startDetail}</Text>
                ) : null}
                {item.songLabel ? (
                  <Text style={styles.song}>♪ {item.songLabel}</Text>
                ) : null}
                {item.notes ? (
                  <Text style={styles.notes}>{item.notes}</Text>
                ) : null}
                {item.techNotes ? (
                  <Text style={styles.tech}>
                    Technika: {item.techNotes}
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Program pre kapelu / hudobný sprievod · čitateľné v tme
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
