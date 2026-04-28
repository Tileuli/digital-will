import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import vaultService from '../services/vault';
import type { Recipient } from '../types';
import {
  Badge,
  Button,
  Card,
  Divider,
  Heading,
  Input,
  Label,
  Muted,
  Screen,
  SubHeading,
  colors,
  radius,
  spacing,
} from '../components/ui';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const RecipientsScreen: React.FC = () => {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await vaultService.getRecipients();
      setRecipients(r.recipients || []);
    } catch {
      Alert.alert('Error', 'Failed to load recipients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Missing fields', 'Name and email are required.');
      return;
    }
    try {
      setSubmitting(true);
      await vaultService.addRecipient({
        name,
        email: email.trim(),
        relationship: relationship || undefined,
      });
      setName('');
      setEmail('');
      setRelationship('');
      await load();
      Alert.alert('Success', 'Invitation sent.');
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || err?.message || 'Failed to add recipient'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (id: string) => {
    try {
      await vaultService.resendInvitation(id);
      Alert.alert('Success', 'Invitation resent.');
    } catch {
      Alert.alert('Error', 'Failed to resend invitation.');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove recipient?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await vaultService.deleteRecipient(id);
            await load();
          } catch {
            Alert.alert('Error', 'Failed to remove recipient.');
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Screen>
        <Heading>Recipients</Heading>
        <Muted>
          Invite trusted people. They set a passphrase on web, generate a keypair,
          and then you can encrypt vaults to them.
        </Muted>

        <View style={{ height: spacing.md }} />

        <Card>
          <SubHeading>Invite someone</SubHeading>
          <Label>Name</Label>
          <Input value={name} onChangeText={setName} placeholder="Full name" />
          <Label>Email</Label>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Label>Relationship</Label>
          <Input
            value={relationship}
            onChangeText={setRelationship}
            placeholder="e.g. spouse, sibling"
          />
          <Button
            title={submitting ? 'Sending…' : 'Send invitation'}
            onPress={handleAdd}
            loading={submitting}
          />
        </Card>

        <Card>
          <View style={styles.sectionHead}>
            <SubHeading style={{ marginBottom: 0 }}>Trusted recipients</SubHeading>
            {recipients.length > 0 && (
              <Badge label={`${recipients.length}`} tone="info" />
            )}
          </View>

          {loading ? (
            <Muted>Loading…</Muted>
          ) : recipients.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No recipients yet</Text>
              <Muted>Invite someone above to get started.</Muted>
            </View>
          ) : (
            recipients.map((r, idx) => {
              const accepted = r.invitation_status === 'accepted';
              return (
                <View key={r.id}>
                  {idx > 0 && <Divider />}
                  <View style={styles.row}>
                    <View style={styles.rAvatar}>
                      <Text style={styles.rAvatarText}>{initials(r.name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{r.name}</Text>
                      <Text style={styles.email}>{r.email}</Text>
                      {r.relationship ? (
                        <Text style={styles.meta}>{r.relationship}</Text>
                      ) : null}
                      <View style={styles.badges}>
                        <Badge
                          label={accepted ? 'Keypair ready' : 'Awaiting setup'}
                          tone={accepted ? 'success' : 'warning'}
                        />
                        <Badge
                          label={r.access_granted ? 'Accessed' : 'Not accessed'}
                          tone={r.access_granted ? 'info' : 'neutral'}
                        />
                      </View>
                    </View>
                    <View style={styles.actions}>
                      {!accepted && (
                        <Button
                          title="Resend"
                          size="sm"
                          variant="soft"
                          icon="mail"
                          onPress={() => handleResend(r.id)}
                        />
                      )}
                      <Button
                        title="Remove"
                        size="sm"
                        variant="dangerSoft"
                        icon="trash-2"
                        onPress={() => handleDelete(r.id)}
                      />
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: spacing.md,
  },
  rAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rAvatarText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.muted, marginTop: 2 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 1 },
  badges: { flexDirection: 'row', gap: 6, marginTop: spacing.sm, flexWrap: 'wrap' },
  actions: { alignItems: 'flex-end', gap: spacing.xs, paddingTop: 2, minWidth: 96 },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIcon: { fontSize: 36, marginBottom: spacing.sm },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
});

export default RecipientsScreen;
