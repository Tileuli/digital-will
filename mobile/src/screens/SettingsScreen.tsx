import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import {
  Badge,
  Button,
  Card,
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
import {
  beginTotpSetup,
  disableTotp,
  getTotpStatus,
  verifyTotpEnable,
  type TotpSetupResponse,
} from '../services/twoFactor';
import {
  generateAndWrapRecoveryCodes,
  getRecoveryStatus,
  uploadRecoveryCodes,
} from '../services/recovery';
import {
  addConfirmer,
  listConfirmers,
  removeConfirmer,
  setConfirmationThreshold,
  type Confirmer,
} from '../services/confirmers';
import { getSessionKeys } from '../services/keySession';
import authService from '../services/auth';
import { upgradeKdf } from '../services/kdfMigration';
import { getErrorMessage } from '../services/api';
import {
  clearBiometricKey,
  getSupportedBiometricLabel,
  isBiometricAvailable,
  isBiometricEnabled,
  promptBiometric,
  storeMasterKeyForBiometric,
} from '../services/biometric';

const SettingsScreen: React.FC = () => {
  const [statusLoading, setStatusLoading] = useState(true);
  const [totpEnabled, setTotpEnabled] = useState(false);

  const [recoveryStatus, setRecoveryStatus] = useState<{
    total: number;
    unused: number;
  } | null>(null);

  const [setupData, setSetupData] = useState<TotpSetupResponse | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [busy, setBusy] = useState(false);

  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  const [regenConfirm, setRegenConfirm] = useState(false);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [newCodesAck, setNewCodesAck] = useState(false);

  const [currentKdf, setCurrentKdf] = useState<'pbkdf2' | 'argon2id'>('pbkdf2');
  const [kdfMigrateOpen, setKdfMigrateOpen] = useState(false);
  const [kdfPassword, setKdfPassword] = useState('');

  const [confirmers, setConfirmers] = useState<Confirmer[]>([]);
  const [requiredConfirmations, setRequiredConfirmations] = useState(0);
  const [thresholdDraft, setThresholdDraft] = useState('0');
  const [thresholdBusy, setThresholdBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addRelationship, setAddRelationship] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  const refreshStatus = async () => {
    try {
      const [
        totp,
        recovery,
        user,
        confirmerList,
        bioAvail,
        bioLabel,
        bioOn,
      ] = await Promise.all([
        getTotpStatus(),
        getRecoveryStatus().catch(() => null),
        authService.getCurrentUser(),
        listConfirmers().catch(() => null),
        isBiometricAvailable(),
        getSupportedBiometricLabel(),
        isBiometricEnabled(),
      ]);
      setTotpEnabled(totp.totp_enabled);
      setRecoveryStatus(recovery);
      setCurrentKdf(((user?.kdf_algorithm as 'pbkdf2' | 'argon2id') || 'pbkdf2'));
      if (confirmerList) {
        setConfirmers(confirmerList.confirmers);
        setRequiredConfirmations(confirmerList.required_confirmations);
        setThresholdDraft(String(confirmerList.required_confirmations));
      }
      setBiometricAvailable(bioAvail);
      setBiometricLabel(bioLabel);
      setBiometricEnabled(bioOn);
    } catch (err) {
      console.warn(err);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const startSetup = async () => {
    setBusy(true);
    try {
      const data = await beginTotpSetup();
      setSetupData(data);
      setSetupCode('');
    } catch (err: any) {
      Alert.alert('2FA setup failed', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmEnable = async () => {
    if (setupCode.length < 6) return;
    setBusy(true);
    try {
      await verifyTotpEnable(setupCode);
      Alert.alert(
        'Two-factor enabled',
        'You will be asked for a code on next sign in.'
      );
      setSetupData(null);
      setSetupCode('');
      await refreshStatus();
    } catch (err: any) {
      Alert.alert(
        'Invalid code',
        getErrorMessage(err, 'Try the next code from your app.')
      );
    } finally {
      setBusy(false);
    }
  };

  const cancelSetup = () => {
    setSetupData(null);
    setSetupCode('');
  };

  const copySecret = async () => {
    if (!setupData) return;
    await Clipboard.setStringAsync(setupData.secret);
    Alert.alert('Copied', 'Secret copied to clipboard.');
  };

  const confirmDisable = async () => {
    if (!disablePassword) return;
    setBusy(true);
    try {
      await disableTotp(disablePassword);
      Alert.alert('Disabled', 'Two-factor authentication is now off.');
      setDisableOpen(false);
      setDisablePassword('');
      await refreshStatus();
    } catch (err: any) {
      Alert.alert('Could not disable', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const regenerateCodes = async () => {
    const session = getSessionKeys();
    if (!session) {
      Alert.alert(
        'Session expired',
        'Please sign out and sign back in, then try again.'
      );
      return;
    }
    setBusy(true);
    try {
      const generated = await generateAndWrapRecoveryCodes(
        session.privateKey,
        10,
        currentKdf
      );
      await uploadRecoveryCodes(generated.payload);
      setNewCodes(generated.rawCodes);
      setNewCodesAck(false);
      setRegenConfirm(false);
      await refreshStatus();
    } catch (err: any) {
      Alert.alert('Could not regenerate', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const copyNewCodes = async () => {
    if (!newCodes) return;
    await Clipboard.setStringAsync(newCodes.join('\n'));
    Alert.alert('Copied', 'Recovery codes copied to clipboard.');
  };

  const runKdfMigration = async () => {
    if (!kdfPassword) return;
    setBusy(true);
    try {
      const result = await upgradeKdf({
        password: kdfPassword,
        newAlgorithm: 'argon2id',
      });
      setCurrentKdf('argon2id');
      setKdfMigrateOpen(false);
      setKdfPassword('');
      if (result.recoveryCodes.length > 0) {
        setNewCodes(result.recoveryCodes);
        setNewCodesAck(false);
        Alert.alert(
          'Upgraded to Argon2id',
          'New recovery codes have been issued — please save them.'
        );
      } else {
        Alert.alert('Upgraded', 'Your account now uses Argon2id.');
      }
      await refreshStatus();
    } catch (err: any) {
      Alert.alert('Upgrade failed', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleAddConfirmer = async () => {
    if (!addEmail.trim() || !addName.trim()) return;
    setAddBusy(true);
    try {
      await addConfirmer({
        email: addEmail.trim(),
        name: addName.trim(),
        relationship: addRelationship.trim() || undefined,
      });
      setAddEmail('');
      setAddName('');
      setAddRelationship('');
      setAddOpen(false);
      await refreshStatus();
      Alert.alert('Invitation sent', 'They will receive an email shortly.');
    } catch (err: any) {
      Alert.alert('Could not add', getErrorMessage(err));
    } finally {
      setAddBusy(false);
    }
  };

  const handleRemoveConfirmer = (id: string, name: string) => {
    Alert.alert(
      'Remove trusted contact',
      `Remove ${name}? They will no longer be asked to vote on releasing your vault.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(id);
            try {
              await removeConfirmer(id);
              await refreshStatus();
            } catch (err: any) {
              Alert.alert('Could not remove', getErrorMessage(err));
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const handleSaveThreshold = async () => {
    const n = Math.max(
      0,
      Math.min(confirmers.length, parseInt(thresholdDraft, 10) || 0)
    );
    if (n === requiredConfirmations) return;
    setThresholdBusy(true);
    try {
      const res = await setConfirmationThreshold(n);
      setRequiredConfirmations(res.required_confirmations);
      setThresholdDraft(String(res.required_confirmations));
      Alert.alert('Saved', 'Threshold updated.');
    } catch (err: any) {
      Alert.alert('Could not save', getErrorMessage(err));
    } finally {
      setThresholdBusy(false);
    }
  };

  const enableBiometric = async () => {
    const session = getSessionKeys();
    if (!session) {
      Alert.alert(
        'Session expired',
        'Please sign out and sign back in, then enable biometric unlock.'
      );
      return;
    }
    const user = await authService.getCurrentUser();
    if (!user) return;
    setBiometricBusy(true);
    try {
      const auth = await promptBiometric(`Enable ${biometricLabel} unlock`);
      if (!auth.ok) {
        if (auth.error === 'user_cancel' || auth.error === 'system_cancel') {
          // user backed out — silent
          return;
        }
        if (auth.error === 'not_enrolled') {
          Alert.alert(
            `${biometricLabel} not set up`,
            `Open iOS Settings → Face ID & Passcode (or Android settings → Biometrics) to enrol ${biometricLabel}, then try again.`
          );
          return;
        }
        if (auth.error === 'lockout' || auth.error === 'lockout_permanent') {
          Alert.alert(
            'Locked out',
            `Too many failed ${biometricLabel} attempts. Unlock the device with the passcode and try again.`
          );
          return;
        }
        Alert.alert(
          `Could not use ${biometricLabel}`,
          `Reason: ${auth.error || 'unknown'}.`
        );
        return;
      }
      await storeMasterKeyForBiometric(user.id, session.masterKey);
      setBiometricEnabled(true);
      Alert.alert(
        `${biometricLabel} unlock enabled`,
        `You can use ${biometricLabel} to unlock Digital Will on this device.`
      );
    } catch (err: any) {
      Alert.alert('Could not enable', getErrorMessage(err));
    } finally {
      setBiometricBusy(false);
    }
  };

  const disableBiometric = async () => {
    const user = await authService.getCurrentUser();
    setBiometricBusy(true);
    try {
      await clearBiometricKey(user?.id);
      setBiometricEnabled(false);
    } catch (err: any) {
      Alert.alert('Could not disable', getErrorMessage(err));
    } finally {
      setBiometricBusy(false);
    }
  };

  if (statusLoading) {
    return (
      <Screen>
        <View style={styles.loadingBox}>
          <ActivityIndicator />
          <Muted style={{ marginTop: spacing.sm }}>Loading settings…</Muted>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ marginTop: spacing.lg }}>
        <Heading>Settings</Heading>
        <Muted>Account security and recovery options.</Muted>
      </View>

      {/* 2FA section */}
      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.row}>
          <View
            style={[
              styles.sectionIcon,
              {
                backgroundColor: totpEnabled
                  ? colors.successSoft
                  : '#f1f5f9',
              },
            ]}
          >
            <Feather
              name={totpEnabled ? 'shield' : 'shield-off'}
              size={18}
              color={totpEnabled ? colors.success : colors.muted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SubHeading style={{ marginBottom: 2 }}>
              Two-factor authentication
            </SubHeading>
            <Muted style={{ fontSize: 13 }}>
              {totpEnabled
                ? 'A 6-digit code is required when you sign in.'
                : 'Add a second factor with an authenticator app.'}
            </Muted>
          </View>
          <Badge label={totpEnabled ? 'On' : 'Off'} tone={totpEnabled ? 'success' : 'neutral'} />
        </View>

        <View style={{ height: spacing.md }} />

        {!totpEnabled && !setupData && (
          <Button
            title="Enable 2FA"
            icon="smartphone"
            onPress={startSetup}
            loading={busy}
          />
        )}

        {setupData && (
          <View>
            <Muted style={{ fontSize: 13 }}>
              1. Open your authenticator app (Google Authenticator, Authy, 1Password)
              and scan this QR code.
            </Muted>
            <View style={styles.qrBox}>
              <Image
                source={{ uri: setupData.qr }}
                style={{ width: 192, height: 192 }}
                resizeMode="contain"
              />
            </View>

            <Muted style={{ fontSize: 12, marginTop: spacing.sm }}>
              Or paste this secret manually:
            </Muted>
            <View style={styles.secretRow}>
              <Text style={styles.secretText} selectable>
                {setupData.secret}
              </Text>
              <Pressable onPress={copySecret} style={styles.iconButton}>
                <Feather name="copy" size={16} color={colors.text} />
              </Pressable>
            </View>

            <Label>Code from app</Label>
            <Input
              value={setupCode}
              onChangeText={(v) => setSetupCode(v.replace(/\D/g, ''))}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              style={styles.codeInput}
            />

            <View style={styles.buttonRow}>
              <View style={{ flex: 1 }}>
                <Button
                  title={busy ? 'Verifying…' : 'Verify and enable'}
                  onPress={confirmEnable}
                  loading={busy}
                  disabled={setupCode.length < 6}
                  icon="check"
                />
              </View>
              <View style={{ width: 100 }}>
                <Button title="Cancel" variant="outline" onPress={cancelSetup} />
              </View>
            </View>
          </View>
        )}

        {totpEnabled && !disableOpen && (
          <Button
            title="Disable 2FA"
            variant="dangerOutline"
            icon="shield-off"
            onPress={() => setDisableOpen(true)}
          />
        )}

        {totpEnabled && disableOpen && (
          <View>
            <View style={styles.warningBox}>
              <Feather
                name="alert-triangle"
                size={14}
                color={colors.warning}
              />
              <Text style={styles.warningText}>
                Disabling 2FA reduces your account security. Confirm your
                password to proceed.
              </Text>
            </View>
            <Label>Current password</Label>
            <Input
              value={disablePassword}
              onChangeText={setDisablePassword}
              placeholder="Your password"
              secureTextEntry
            />
            <View style={styles.buttonRow}>
              <View style={{ flex: 1 }}>
                <Button
                  title={busy ? 'Disabling…' : 'Confirm disable'}
                  variant="danger"
                  onPress={confirmDisable}
                  loading={busy}
                  disabled={!disablePassword}
                />
              </View>
              <View style={{ width: 100 }}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setDisableOpen(false);
                    setDisablePassword('');
                  }}
                />
              </View>
            </View>
          </View>
        )}
      </Card>

      {/* Biometric unlock */}
      {biometricAvailable && (
        <Card>
          <View style={styles.row}>
            <View
              style={[styles.sectionIcon, { backgroundColor: '#dcfce7' }]}
            >
              <Feather name="unlock" size={18} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <SubHeading style={{ marginBottom: 2 }}>
                {biometricLabel} unlock
              </SubHeading>
              <Muted style={{ fontSize: 13 }}>
                Use {biometricLabel} to unlock your vault without re-entering
                your password on this device.
              </Muted>
            </View>
            <Badge
              label={biometricEnabled ? 'On' : 'Off'}
              tone={biometricEnabled ? 'success' : 'neutral'}
            />
          </View>

          <View style={{ height: spacing.md }} />

          {!biometricEnabled ? (
            <Button
              title={`Enable ${biometricLabel} unlock`}
              icon="unlock"
              onPress={enableBiometric}
              loading={biometricBusy}
            />
          ) : (
            <Button
              title={`Disable ${biometricLabel} unlock`}
              icon="lock"
              variant="outline"
              onPress={disableBiometric}
              loading={biometricBusy}
            />
          )}
        </Card>
      )}

      {/* KDF algorithm */}
      <Card>
        <View style={styles.row}>
          <View
            style={[styles.sectionIcon, { backgroundColor: '#ede9fe' }]}
          >
            <Feather name="cpu" size={18} color="#7c3aed" />
          </View>
          <View style={{ flex: 1 }}>
            <SubHeading style={{ marginBottom: 2 }}>
              Key derivation function
            </SubHeading>
            <Muted style={{ fontSize: 13 }}>
              Algorithm used to derive your master key from your password.
            </Muted>
          </View>
          <Badge
            label={currentKdf === 'argon2id' ? 'Argon2id' : 'PBKDF2'}
            tone={currentKdf === 'argon2id' ? 'success' : 'warning'}
          />
        </View>

        <View style={{ height: spacing.sm }} />

        {currentKdf === 'pbkdf2' ? (
          !kdfMigrateOpen ? (
            <Button
              title="Upgrade to Argon2id"
              icon="cpu"
              onPress={() => setKdfMigrateOpen(true)}
            />
          ) : (
            <View>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Argon2id is more resistant to GPU password attacks than
                  PBKDF2. We will re-derive your master key and re-issue your
                  recovery codes. Your password itself does not change.
                </Text>
              </View>
              <Label>Current password</Label>
              <Input
                value={kdfPassword}
                onChangeText={setKdfPassword}
                placeholder="Your password"
                secureTextEntry
              />
              <View style={styles.buttonRow}>
                <View style={{ flex: 1 }}>
                  <Button
                    title={busy ? 'Upgrading…' : 'Confirm and upgrade'}
                    onPress={runKdfMigration}
                    loading={busy}
                    disabled={!kdfPassword}
                  />
                </View>
                <View style={{ width: 100 }}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => {
                      setKdfMigrateOpen(false);
                      setKdfPassword('');
                    }}
                  />
                </View>
              </View>
            </View>
          )
        ) : (
          <Muted style={{ fontSize: 12 }}>
            Your account uses Argon2id with OWASP-recommended parameters
            (m=19 MiB, t=2, p=1).
          </Muted>
        )}
      </Card>

      {/* Trusted contacts (M-of-N) */}
      <Card>
        <View style={styles.row}>
          <View
            style={[styles.sectionIcon, { backgroundColor: '#dbeafe' }]}
          >
            <Feather name="users" size={18} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <SubHeading style={{ marginBottom: 2 }}>
              Trusted contacts
            </SubHeading>
            <Muted style={{ fontSize: 13 }}>
              People we email if you miss check-ins. They vote on whether to
              release your vault.
            </Muted>
          </View>
          <Badge label={`${confirmers.length} added`} tone="neutral" />
        </View>

        <View style={{ height: spacing.md }} />

        {confirmers.length > 0 && (
          <View style={{ gap: 6, marginBottom: spacing.md }}>
            {confirmers.map((c) => {
              const accepted = !!c.accepted_at;
              return (
                <View key={c.id} style={styles.contactRow}>
                  <View
                    style={[
                      styles.contactIcon,
                      {
                        backgroundColor: accepted
                          ? colors.successSoft
                          : colors.warningSoft,
                      },
                    ]}
                  >
                    <Feather
                      name={accepted ? 'check-circle' : 'circle'}
                      size={14}
                      color={accepted ? colors.success : colors.warning}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.contactName} numberOfLines={1}>
                      {c.name}
                      {c.relationship ? (
                        <Text style={styles.contactRel}> · {c.relationship}</Text>
                      ) : null}
                    </Text>
                    <Text style={styles.contactEmail} numberOfLines={1}>
                      {c.email}
                    </Text>
                  </View>
                  <Badge
                    label={accepted ? 'Accepted' : 'Pending'}
                    tone={accepted ? 'success' : 'warning'}
                  />
                  <Pressable
                    onPress={() => handleRemoveConfirmer(c.id, c.name)}
                    disabled={removingId === c.id}
                    style={styles.iconButton}
                  >
                    {removingId === c.id ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Feather name="trash-2" size={14} color={colors.danger} />
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {!addOpen ? (
          <Button
            title="Add trusted contact"
            icon="plus"
            variant="outline"
            onPress={() => setAddOpen(true)}
          />
        ) : (
          <View>
            <Label>Full name</Label>
            <Input
              value={addName}
              onChangeText={setAddName}
              placeholder="e.g. Jane Doe"
            />
            <Label>Email</Label>
            <Input
              value={addEmail}
              onChangeText={setAddEmail}
              placeholder="jane@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Label>Relationship (optional)</Label>
            <Input
              value={addRelationship}
              onChangeText={setAddRelationship}
              placeholder="spouse, sibling, lawyer…"
            />
            <View style={styles.buttonRow}>
              <View style={{ flex: 1 }}>
                <Button
                  title={addBusy ? 'Sending…' : 'Send invitation'}
                  onPress={handleAddConfirmer}
                  loading={addBusy}
                  disabled={!addEmail.trim() || !addName.trim()}
                />
              </View>
              <View style={{ width: 100 }}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setAddOpen(false);
                    setAddEmail('');
                    setAddName('');
                    setAddRelationship('');
                  }}
                />
              </View>
            </View>
          </View>
        )}

        {confirmers.length > 0 && (
          <View style={styles.thresholdBox}>
            <Text style={styles.thresholdTitle}>
              Required confirmations to release
            </Text>
            <Text style={styles.thresholdHelp}>
              How many trusted contacts must vote &quot;yes&quot; before your vault
              is released. Set to 0 to release automatically when the inactivity
              threshold expires.
            </Text>
            <View style={styles.thresholdRow}>
              <Input
                value={thresholdDraft}
                onChangeText={(v) => setThresholdDraft(v.replace(/\D/g, ''))}
                keyboardType="number-pad"
                style={styles.thresholdInput}
              />
              <Text style={styles.thresholdOf}>of {confirmers.length}</Text>
              <View style={{ flex: 1 }} />
              <View style={{ width: 100 }}>
                <Button
                  title={thresholdBusy ? 'Saving…' : 'Save'}
                  onPress={handleSaveThreshold}
                  loading={thresholdBusy}
                  disabled={
                    parseInt(thresholdDraft, 10) === requiredConfirmations
                  }
                />
              </View>
            </View>
          </View>
        )}
      </Card>

      {/* Recovery codes status */}
      <Card>
        <View style={styles.row}>
          <View
            style={[styles.sectionIcon, { backgroundColor: colors.warningSoft }]}
          >
            <Feather name="key" size={18} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <SubHeading style={{ marginBottom: 2 }}>Recovery codes</SubHeading>
            <Muted style={{ fontSize: 13 }}>
              Used to regain account access if you forget your password.
            </Muted>
          </View>
        </View>

        <View style={{ height: spacing.sm }} />

        {recoveryStatus ? (
          <View style={[styles.statusBox, { marginBottom: spacing.md }]}>
            <Text style={styles.statusText}>
              <Text style={{ fontWeight: '700' }}>
                {recoveryStatus.unused}
              </Text>{' '}
              of {recoveryStatus.total} codes remaining
            </Text>
            {recoveryStatus.unused === 0 && (
              <Text style={styles.statusDanger}>No codes left</Text>
            )}
          </View>
        ) : (
          <Muted style={{ fontSize: 13, marginBottom: spacing.md }}>
            Recovery code status unavailable.
          </Muted>
        )}

        {newCodes ? (
          <View>
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                <Text style={{ fontWeight: '700' }}>New codes generated. </Text>
                Old codes are now invalid. Save these somewhere safe.
              </Text>
            </View>

            <View style={{ gap: 6, marginTop: spacing.sm }}>
              {newCodes.map((c, i) => (
                <View key={i} style={styles.codeRow}>
                  <Text style={styles.codeIndex}>{i + 1}.</Text>
                  <Text style={styles.codeText} selectable>
                    {c}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ height: spacing.sm }} />
            <Button
              title="Copy all codes"
              icon="copy"
              variant="outline"
              onPress={copyNewCodes}
            />

            <Pressable
              onPress={() => setNewCodesAck((v) => !v)}
              style={styles.checkboxRow}
            >
              <View
                style={[
                  styles.checkbox,
                  newCodesAck && styles.checkboxChecked,
                ]}
              >
                {newCodesAck && (
                  <Feather name="check" size={12} color="#fff" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                I have saved my new recovery codes in a safe place.
              </Text>
            </Pressable>

            <Button
              title="Done"
              onPress={() => setNewCodes(null)}
              disabled={!newCodesAck}
            />
          </View>
        ) : !regenConfirm ? (
          <Button
            title="Generate new codes"
            icon="refresh-cw"
            variant="outline"
            onPress={() => setRegenConfirm(true)}
          />
        ) : (
          <View>
            <View style={styles.warningBox}>
              <Feather
                name="alert-triangle"
                size={14}
                color={colors.warning}
              />
              <Text style={styles.warningText}>
                Generating new codes will invalidate all current codes. Make
                sure no one is mid-recovery.
              </Text>
            </View>
            <View style={styles.buttonRow}>
              <View style={{ flex: 1 }}>
                <Button
                  title={busy ? 'Generating…' : 'Confirm and generate'}
                  icon="refresh-cw"
                  onPress={regenerateCodes}
                  loading={busy}
                />
              </View>
              <View style={{ width: 100 }}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setRegenConfirm(false)}
                />
              </View>
            </View>
          </View>
        )}
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  secretRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  secretText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    fontFamily: 'monospace',
  },
  iconButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeInput: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 10,
    fontVariant: ['tabular-nums'],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  warningBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  warningText: {
    flex: 1,
    color: '#78350f',
    fontSize: 12,
    lineHeight: 18,
  },
  infoBox: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  statusText: { color: colors.text, fontSize: 14 },
  statusDanger: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  successBox: {
    padding: 12,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: radius.sm,
  },
  successText: { color: '#14532d', fontSize: 12, lineHeight: 18 },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  codeIndex: {
    color: colors.muted,
    fontSize: 11,
    width: 22,
    textAlign: 'right',
  },
  codeText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    letterSpacing: 1.5,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: spacing.md,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  checkboxLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  contactIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  contactRel: {
    color: colors.muted,
    fontWeight: '400',
    fontSize: 12,
  },
  contactEmail: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 1,
  },
  thresholdBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  thresholdTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  thresholdHelp: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thresholdInput: {
    width: 70,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    fontSize: 16,
    fontWeight: '600',
  },
  thresholdOf: {
    color: colors.muted,
    fontSize: 13,
  },
});

export default SettingsScreen;
