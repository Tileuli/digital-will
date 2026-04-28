import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import vaultService from '../services/vault';
import type { CheckinLog, CheckinStatus } from '../types';
import {
  Badge,
  Button,
  Card,
  Divider,
  Heading,
  Muted,
  Screen,
  SubHeading,
  colors,
  radius,
  spacing,
} from '../components/ui';

const formatDate = (v?: string | null) => (v ? new Date(v).toLocaleString() : '—');

const CheckinsScreen: React.FC = () => {
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [history, setHistory] = useState<CheckinLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [s, h] = await Promise.all([
        vaultService.getCheckinStatus(),
        vaultService.getCheckinHistory(),
      ]);
      setStatus(s);
      setHistory(((h as any).checkins as CheckinLog[]) || []);
    } catch {
      Alert.alert('Error', 'Failed to load check-in data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCheckIn = async () => {
    try {
      setSubmitting(true);
      await vaultService.checkIn();
      await load();
      Alert.alert('Success', 'Check-in recorded.');
    } catch {
      Alert.alert('Error', 'Check-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const overdue = status?.is_overdue;

  return (
    <Screen>
      <Heading>Check-ins</Heading>
      <Muted>Confirm you are okay to keep the release condition at bay.</Muted>

      <View style={{ height: spacing.md }} />

      <Card style={overdue ? styles.overdueCard : undefined}>
        <View style={styles.sectionHead}>
          <SubHeading style={{ marginBottom: 0 }}>Status</SubHeading>
          <Badge
            label={overdue ? 'Overdue' : 'Up to date'}
            tone={overdue ? 'danger' : 'success'}
          />
        </View>
        <Row label="Last check-in" value={formatDate(status?.last_checkin)} />
        <Divider />
        <Row label="Next due" value={formatDate(status?.next_checkin_due)} />
        <Divider />
        <Row
          label="Interval"
          value={
            status?.checkin_interval_days
              ? `${status.checkin_interval_days} days`
              : '—'
          }
        />
        <Divider />
        <Row
          label="Reminder sent"
          value={status?.reminder_sent_at ? formatDate(status.reminder_sent_at) : 'Not yet'}
        />

        <View style={{ height: spacing.md }} />
        <Button
          title={submitting ? 'Submitting…' : "I'm okay — check in now"}
          onPress={handleCheckIn}
          loading={submitting}
          variant={overdue ? 'danger' : 'primary'}
        />
      </Card>

      <Card>
        <View style={styles.sectionHead}>
          <SubHeading style={{ marginBottom: 0 }}>History</SubHeading>
          {history.length > 0 && (
            <Badge label={`${history.length}`} tone="info" />
          )}
        </View>

        {loading ? (
          <Muted>Loading…</Muted>
        ) : history.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>No check-ins yet</Text>
            <Muted>Tap the button above to record your first check-in.</Muted>
          </View>
        ) : (
          history.map((item, idx) => (
            <View key={item.id}>
              {idx > 0 && <Divider />}
              <View style={styles.item}>
                <View style={styles.dot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemDate}>
                    {formatDate(item.checkin_date)}
                  </Text>
                </View>
                <Badge label={item.method || 'manual'} tone="info" />
              </View>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  overdueCard: { backgroundColor: colors.dangerSoft },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    gap: spacing.md,
  },
  rowLabel: { color: colors.muted, fontSize: 14 },
  rowValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  itemDate: { color: colors.text, fontSize: 14, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 36, marginBottom: spacing.sm },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
});

export default CheckinsScreen;
