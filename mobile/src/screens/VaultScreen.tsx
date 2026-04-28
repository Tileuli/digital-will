import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import vaultService from '../services/vault';
import { hasSessionKeys } from '../services/keySession';
import type { Recipient, Vault, VaultPlaintext } from '../types';
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
  Sheet,
  SubHeading,
  colors,
  radius,
  spacing,
} from '../components/ui';

const VaultScreen: React.FC = () => {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState<VaultPlaintext | null>(null);
  const [viewingMeta, setViewingMeta] = useState<Vault | null>(null);

  const locked = !hasSessionKeys();
  const acceptedRecipients = recipients.filter(
    (r) => r.invitation_status === 'accepted' && r.public_key
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [v, r] = await Promise.all([
        vaultService.getVaults(),
        vaultService.getRecipients(),
      ]);
      setVaults(v.vaults || []);
      setRecipients(r.recipients || []);
    } catch {
      Alert.alert('Error', 'Failed to load vaults');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleRecipient = (id: string) =>
    setSelectedRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleCreate = async () => {
    if (!content.trim()) {
      Alert.alert('Empty content', 'Write something to store in the vault.');
      return;
    }
    if (selectedRecipientIds.length === 0) {
      Alert.alert('No recipients', 'Select at least one recipient.');
      return;
    }
    if (locked) {
      Alert.alert('Locked', 'Session is locked. Please log in again.');
      return;
    }
    try {
      setSubmitting(true);
      await vaultService.createVault(
        { title: title || 'Untitled', description, content, type: 'text' },
        selectedRecipientIds
      );
      setTitle('');
      setDescription('');
      setContent('');
      setSelectedRecipientIds([]);
      await load();
      Alert.alert('Success', 'Vault created.');
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || err?.message || 'Failed to create vault'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = async (id: string) => {
    if (locked) {
      Alert.alert('Locked', 'Session is locked. Please log in again.');
      return;
    }
    try {
      const { plaintext } = await vaultService.getVaultDetailed(id);
      setViewing(plaintext);
      setViewingMeta(vaults.find((v) => v.id === id) || null);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to decrypt vault');
    }
  };

  const closeView = () => {
    setViewing(null);
    setViewingMeta(null);
  };

  const formatFullDate = (s?: string) =>
    s
      ? new Date(s).toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : '—';

  const formatBytes = (n: number) => {
    if (!n) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
    return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`;
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete vault?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await vaultService.deleteVault(id);
            await load();
          } catch {
            Alert.alert('Error', 'Failed to delete vault');
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
        <Heading>My Vault</Heading>
        <Muted>
          Content is encrypted on this device before upload. The server only stores
          ciphertext.
        </Muted>

        {locked && (
          <Card
            style={{
              backgroundColor: colors.warningSoft,
              marginTop: spacing.md,
            }}
          >
            <Text style={{ color: '#92400e', fontWeight: '600' }}>
              Encryption session is locked. Log out and log in again.
            </Text>
          </Card>
        )}

        <View style={{ height: spacing.md }} />

        <Card>
          <SubHeading>New vault item</SubHeading>
          <Label>Title</Label>
          <Input value={title} onChangeText={setTitle} placeholder="e.g. Bank credentials" />
          <Label>Description</Label>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Optional short description"
          />
          <Label>Content</Label>
          <Input
            value={content}
            onChangeText={setContent}
            placeholder="Write your secret instruction…"
            multiline
          />

          <Label>Recipients</Label>
          {acceptedRecipients.length === 0 ? (
            <Muted>
              No accepted recipients yet. Invite someone in the Recipients tab first.
            </Muted>
          ) : (
            <View style={{ marginBottom: spacing.sm }}>
              {acceptedRecipients.map((r, idx) => {
                const checked = selectedRecipientIds.includes(r.id);
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => toggleRecipient(r.id)}
                    style={({ pressed }) => [
                      styles.recipientRow,
                      idx !== 0 && styles.recipientRowBorder,
                      pressed && { backgroundColor: '#f8fafc' },
                    ]}
                  >
                    <View
                      style={[styles.checkbox, checked && styles.checkboxChecked]}
                    >
                      {checked && <Text style={styles.check}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recipientName}>{r.name}</Text>
                      <Text style={styles.recipientEmail}>{r.email}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Button
            title={submitting ? 'Encrypting…' : 'Create vault'}
            onPress={handleCreate}
            loading={submitting}
            disabled={
              locked ||
              acceptedRecipients.length === 0 ||
              selectedRecipientIds.length === 0
            }
          />
        </Card>

        <Card>
          <View style={styles.sectionHead}>
            <SubHeading style={{ marginBottom: 0 }}>Vault items</SubHeading>
            {vaults.length > 0 && (
              <Badge label={`${vaults.length}`} tone="info" />
            )}
          </View>

          {loading ? (
            <Muted>Loading…</Muted>
          ) : vaults.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔒</Text>
              <Text style={styles.emptyTitle}>No vaults yet</Text>
              <Muted>Create your first encrypted item above.</Muted>
            </View>
          ) : (
            vaults.map((v, idx) => (
              <View key={v.id}>
                {idx > 0 && <Divider />}
                <View style={styles.vaultRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vaultTitle}>Encrypted vault</Text>
                    <Text style={styles.vaultDate}>
                      {v.created_at
                        ? new Date(v.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 6,
                        marginTop: spacing.sm,
                      }}
                    >
                      <Badge
                        label={v.is_active ? 'Active' : 'Inactive'}
                        tone={v.is_active ? 'success' : 'neutral'}
                      />
                      <Badge
                        label={v.release_triggered ? 'Released' : 'Locked'}
                        tone={v.release_triggered ? 'warning' : 'neutral'}
                      />
                    </View>
                  </View>
                  <View style={styles.iconActions}>
                    <Pressable
                      onPress={() => handleView(v.id)}
                      hitSlop={10}
                      style={({ pressed }) => [
                        styles.iconBtn,
                        { opacity: pressed ? 0.5 : 1 },
                      ]}
                    >
                      <Feather name="eye" size={20} color={colors.primary} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(v.id)}
                      hitSlop={10}
                      style={({ pressed }) => [
                        styles.iconBtn,
                        { opacity: pressed ? 0.5 : 1 },
                      ]}
                    >
                      <Feather name="trash-2" size={20} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </Card>
      </Screen>

      <Sheet
        visible={!!viewing}
        onClose={closeView}
        title={viewing?.title || 'Vault'}
      >
        <View style={styles.viewMetaRow}>
          <View style={styles.viewMetaItem}>
            <Feather name="calendar" size={13} color={colors.muted} />
            <Text style={styles.viewMetaText}>
              {formatFullDate(viewingMeta?.created_at)}
            </Text>
          </View>
          {viewing?.type && (
            <View style={styles.viewMetaItem}>
              <Feather
                name={
                  viewing.type === 'credentials'
                    ? 'key'
                    : viewing.type === 'file'
                      ? 'paperclip'
                      : 'file-text'
                }
                size={13}
                color={colors.muted}
              />
              <Text style={styles.viewMetaText}>
                {viewing.type[0].toUpperCase() + viewing.type.slice(1)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.viewBadgeRow}>
          <Badge
            label={viewingMeta?.is_active ? 'Active' : 'Inactive'}
            tone={viewingMeta?.is_active ? 'success' : 'neutral'}
          />
          <Badge
            label={viewingMeta?.release_triggered ? 'Released' : 'Locked'}
            tone={viewingMeta?.release_triggered ? 'warning' : 'neutral'}
          />
        </View>

        {viewing?.description ? (
          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.viewSectionLabel}>Description</Text>
            <Text style={styles.viewDescription}>{viewing.description}</Text>
          </Card>
        ) : null}

        <Card style={{ marginTop: spacing.sm }}>
          <Text style={styles.viewSectionLabel}>Content</Text>
          <View style={styles.viewContentBox}>
            <Text
              style={[
                styles.viewContent,
                viewing?.type === 'credentials' && styles.viewContentMono,
              ]}
              selectable
            >
              {viewing?.content || ''}
            </Text>
          </View>
        </Card>

        {viewing?.attachments && viewing.attachments.length > 0 && (
          <Card style={{ marginTop: spacing.sm }}>
            <Text style={styles.viewSectionLabel}>
              Attachments ({viewing.attachments.length})
            </Text>
            {viewing.attachments.map((a, i) => (
              <View
                key={`${a.filename}-${i}`}
                style={[
                  styles.attachmentRow,
                  i > 0 && styles.attachmentRowBorder,
                ]}
              >
                <View style={styles.attachmentIcon}>
                  <Feather name="paperclip" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {a.filename}
                  </Text>
                  <Text style={styles.attachmentMeta}>
                    {formatBytes(a.size)} · {a.mimetype}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </Sheet>
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

  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 12,
    borderRadius: radius.sm,
  },
  recipientRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  check: { color: '#fff', fontSize: 13, fontWeight: '700' },
  recipientName: { fontSize: 15, fontWeight: '600', color: colors.text },
  recipientEmail: { fontSize: 13, color: colors.muted, marginTop: 1 },

  vaultRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  iconActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  vaultDate: { fontSize: 12, color: colors.muted, marginTop: 2 },

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

  viewMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  viewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewMetaText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  viewBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  viewSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  viewDescription: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  viewContentBox: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewContent: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
  },
  viewContentMono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  attachmentRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  attachmentMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
});

export default VaultScreen;
