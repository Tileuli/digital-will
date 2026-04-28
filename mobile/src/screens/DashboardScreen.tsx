import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import vaultService from '../services/vault';
import authService from '../services/auth';
import { useLogout } from '../navigation/RootNavigator';
import type { CheckinStatus, Recipient, User, Vault } from '../types';
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

const DashboardScreen: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const logout = useLogout();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [u, v, r, s] = await Promise.all([
        authService.getCurrentUser(),
        vaultService.getVaults(),
        vaultService.getRecipients(),
        vaultService.getCheckinStatus(),
      ]);
      setUser(u);
      setVaults(v.vaults || []);
      setRecipients(r.recipients || []);
      setStatus(s);
    } catch (err) {
      console.warn('Dashboard load failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const releasedVaults = vaults.filter((v) => v.release_triggered).length;
  const activeVaults = vaults.filter((v) => v.is_active).length;
  const acceptedRecipients = recipients.filter(
    (r) => r.invitation_status === 'accepted'
  ).length;

  const greeting = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const initials = (user?.full_name || user?.email || 'U')
    .split(/[\s@]/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Screen>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Hi, {greeting}</Text>
          <Text style={styles.heroSub}>
            {status?.is_overdue
              ? 'Check-in overdue'
              : 'Your digital will is up to date'}
          </Text>
        </View>
        {status?.is_overdue && <Badge label="Overdue" tone="danger" />}
      </View>

      {/* Stats grid */}
      <View style={styles.statsRow}>
        <Stat label="Vaults" value={String(vaults.length)} tone="info" />
        <Stat label="Recipients" value={String(acceptedRecipients)} tone="success" />
        <Stat label="Released" value={String(releasedVaults)} tone="warning" />
      </View>

      {/* Overview */}
      <Card>
        <SubHeading>Overview</SubHeading>
        <Row label="Vault items" value={String(vaults.length)} />
        <Divider />
        <Row label="Active vaults" value={String(activeVaults)} />
        <Divider />
        <Row label="Released vaults" value={String(releasedVaults)} />
        <Divider />
        <Row label="Recipients (total)" value={String(recipients.length)} />
        <Divider />
        <Row label="Recipients (accepted)" value={String(acceptedRecipients)} />
      </Card>

      {/* Check-in */}
      <Card>
        <View style={styles.sectionHead}>
          <SubHeading style={{ marginBottom: 0 }}>Check-in</SubHeading>
          <Badge
            label={status?.is_overdue ? 'Overdue' : 'Up to date'}
            tone={status?.is_overdue ? 'danger' : 'success'}
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
      </Card>

      <Button
        title={loading ? 'Refreshing…' : 'Refresh'}
        onPress={load}
        variant="soft"
        icon="refresh-cw"
      />
      <View style={{ height: spacing.sm }} />
      <Button title="Log out" variant="danger" onPress={logout} icon="log-out" />
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

const Stat: React.FC<{
  label: string;
  value: string;
  tone: 'info' | 'success' | 'warning';
}> = ({ label, value, tone }) => {
  const bg =
    tone === 'info'
      ? colors.infoSoft
      : tone === 'success'
        ? colors.successSoft
        : colors.warningSoft;
  const fg =
    tone === 'info' ? '#1d4ed8' : tone === 'success' ? '#15803d' : '#b45309';
  return (
    <View style={[styles.stat, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color: fg }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: fg }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  heroSub: { fontSize: 13, color: colors.muted, marginTop: 2 },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  statValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },

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
});

export default DashboardScreen;
