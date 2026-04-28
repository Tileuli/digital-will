import React, { useState } from 'react';
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
import type forge from 'node-forge';
import {
  Button,
  Card,
  Heading,
  Input,
  Label,
  Muted,
  Screen,
  colors,
  radius,
  spacing,
} from '../components/ui';
import { useAuthStackNav } from '../navigation/RootNavigator';
import {
  beginRecovery,
  completeRecovery,
  unlockWithRecoveryCode,
} from '../services/recovery';
import { getErrorMessage } from '../services/api';

const PASSWORD_MIN = 8;

type Step = 'identify' | 'reset' | 'done';

const RecoverScreen: React.FC = () => {
  const nav = useAuthStackNav();

  const [step, setStep] = useState<Step>('identify');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [unlockedKey, setUnlockedKey] = useState<forge.pki.rsa.PrivateKey | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const passwordLongEnough = newPassword.length >= PASSWORD_MIN;
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  const identify = async () => {
    if (!email.trim() || !code.trim()) {
      Alert.alert('Missing fields', 'Email and recovery code are required.');
      return;
    }
    setLoading(true);
    try {
      const { recovery } = await beginRecovery(email, code);
      const privateKey = await unlockWithRecoveryCode(
        code,
        recovery.kdf_salt,
        recovery.encrypted_private_key,
        recovery.kdf_algorithm
      );
      setUnlockedKey(privateKey);
      setStep('reset');
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Recovery code is invalid.');
      Alert.alert(
        'Could not verify',
        /decrypt|operation|invalid/i.test(msg)
          ? 'That code did not unlock the account. Double-check it and try again.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (!unlockedKey || !passwordLongEnough || !passwordsMatch) return;
    setLoading(true);
    try {
      await completeRecovery({
        email,
        rawCode: code,
        newPassword,
        privateKey: unlockedKey,
      });
      setStep('done');
    } catch (err: any) {
      Alert.alert('Reset failed', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Screen>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>DW</Text>
          </View>
          <Text style={styles.brandName}>Digital Will</Text>
        </View>

        <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
          <View style={styles.iconCircle}>
            <Feather
              name={step === 'done' ? 'check' : 'key'}
              size={20}
              color={step === 'done' ? colors.success : colors.warning}
            />
          </View>
          <Heading style={{ marginTop: spacing.sm, textAlign: 'center' }}>
            {step === 'identify' && 'Account recovery'}
            {step === 'reset' && 'Set a new password'}
            {step === 'done' && 'Password reset'}
          </Heading>
          <Muted style={{ textAlign: 'center', marginTop: 4 }}>
            {step === 'identify' &&
              'Enter your email and one of the recovery codes you saved.'}
            {step === 'reset' && 'Recovery code accepted. Choose a new password.'}
            {step === 'done' && 'You can now sign in with your new password.'}
          </Muted>
        </View>

        <Card style={{ marginTop: spacing.lg }}>
          {step === 'identify' && (
            <>
              <Label>Email</Label>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <Label>Recovery code</Label>
              <Input
                value={code}
                onChangeText={setCode}
                placeholder="xxxx-xxxx-xxxx-xxxx"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.codeInput}
              />
              <Muted style={{ fontSize: 12, marginTop: -spacing.xs }}>
                Each code works once. Dashes are optional.
              </Muted>

              <View style={styles.warningBox}>
                <Feather
                  name="alert-triangle"
                  size={14}
                  color={colors.warning}
                />
                <Text style={styles.warningText}>
                  Vaults you created before recovery will still release to
                  recipients on schedule, but you will not be able to view
                  their contents yourself afterwards.
                </Text>
              </View>

              <View style={{ height: spacing.xs }} />
              <Button
                title={loading ? 'Verifying…' : 'Continue'}
                onPress={identify}
                loading={loading}
                icon="arrow-right"
              />
            </>
          )}

          {step === 'reset' && (
            <>
              <Label>New password</Label>
              <Input
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 8 characters"
                secureTextEntry
                autoFocus
              />
              {newPassword.length > 0 && (
                <View style={styles.hintRow}>
                  <Feather
                    name={passwordLongEnough ? 'check' : 'x'}
                    size={12}
                    color={passwordLongEnough ? colors.success : colors.muted}
                  />
                  <Text
                    style={[
                      styles.hintText,
                      passwordLongEnough && { color: colors.success },
                    ]}
                  >
                    At least {PASSWORD_MIN} characters
                  </Text>
                </View>
              )}

              <Label>Confirm new password</Label>
              <Input
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat password"
                secureTextEntry
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <View style={styles.hintRow}>
                  <Feather name="x" size={12} color={colors.danger} />
                  <Text style={[styles.hintText, { color: colors.danger }]}>
                    Passwords do not match
                  </Text>
                </View>
              )}

              <View style={{ height: spacing.xs }} />
              <Button
                title={loading ? 'Resetting…' : 'Reset password'}
                onPress={reset}
                loading={loading}
                disabled={!passwordLongEnough || !passwordsMatch}
                icon="arrow-right"
              />
            </>
          )}

          {step === 'done' && (
            <>
              <Muted style={{ textAlign: 'center' }}>
                Your password has been updated. All previously issued recovery
                codes have been invalidated. You can generate new codes from
                Settings after signing in.
              </Muted>
              <View style={{ height: spacing.md }} />
              <Button
                title="Go to sign in"
                onPress={() => nav.navigate('Login')}
                icon="arrow-right"
              />
            </>
          )}
        </Card>

        {step !== 'done' && (
          <Pressable
            onPress={() => nav.navigate('Login')}
            style={{ marginTop: spacing.md, alignItems: 'center' }}
          >
            <Text style={styles.subtleLink}>← Back to sign in</Text>
          </Pressable>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: -0.5,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeInput: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    letterSpacing: 1.5,
  },
  warningBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
    padding: 12,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: radius.sm,
  },
  warningText: {
    flex: 1,
    color: '#78350f',
    fontSize: 12,
    lineHeight: 18,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -2,
    marginBottom: spacing.xs,
  },
  hintText: { fontSize: 12, color: colors.muted },
  subtleLink: { color: colors.muted, fontSize: 12 },
});

export default RecoverScreen;
