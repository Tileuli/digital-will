import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import authService from '../services/auth';
import { getErrorMessage } from '../services/api';
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

const PASSWORD_MIN = 8;
const RESEND_COOLDOWN = 30;

type Step = 'email' | 'code' | 'password' | 'codes';

const RegisterScreen: React.FC<{ onAuthed: () => void }> = ({ onAuthed }) => {
  const nav = useAuthStackNav();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [registrationTicket, setRegistrationTicket] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [interval, setIntervalDays] = useState('30');

  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const passwordLongEnough = password.length >= PASSWORD_MIN;
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const stepNumber = useMemo(() => {
    if (step === 'email') return 1;
    if (step === 'code') return 2;
    return 3;
  }, [step]);

  const sendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Please enter your email.');
      return;
    }
    setLoading(true);
    try {
      await authService.registerInit(email.trim());
      setStep('code');
      setResendIn(RESEND_COOLDOWN);
    } catch (err: any) {
      Alert.alert('Could not send code', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0 || loading) return;
    setLoading(true);
    try {
      await authService.registerInit(email.trim());
      setResendIn(RESEND_COOLDOWN);
      Alert.alert('Code sent', 'A new code is on the way.');
    } catch (err: any) {
      Alert.alert('Could not resend', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const res = await authService.registerVerify(email.trim(), code);
      setRegistrationTicket(res.registration_ticket);
      setStep('password');
    } catch (err: any) {
      Alert.alert('Incorrect code', getErrorMessage(err, 'Try again or resend.'));
    } finally {
      setLoading(false);
    }
  };

  const create = async () => {
    if (!passwordLongEnough || !passwordsMatch) return;
    setLoading(true);
    try {
      const result = await authService.registerComplete({
        registration_ticket: registrationTicket,
        password,
        full_name: fullName.trim() || undefined,
        checkin_interval_days: Number(interval) || 30,
      });
      if (result.recoveryCodes && result.recoveryCodes.length > 0) {
        setRecoveryCodes(result.recoveryCodes);
        setStep('codes');
      } else {
        onAuthed();
      }
    } catch (err: any) {
      Alert.alert('Registration failed', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const copyCodes = async () => {
    await Clipboard.setStringAsync(recoveryCodes.join('\n'));
    Alert.alert('Copied', 'Recovery codes copied to clipboard.');
  };

  /* ─── Recovery codes screen ─── */

  if (step === 'codes') {
    return (
      <Screen>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>DW</Text>
          </View>
          <Text style={styles.brandName}>Digital Will</Text>
        </View>

        <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
          <View style={styles.iconCircle}>
            <Feather name="key" size={22} color={colors.warning} />
          </View>
          <Heading style={{ marginTop: spacing.sm, textAlign: 'center' }}>
            Save your recovery codes
          </Heading>
          <Muted style={{ textAlign: 'center', marginTop: 4 }}>
            These 10 codes are the only way to recover your account if you forget
            your password. Each code works once.
          </Muted>
        </View>

        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.codesGrid}>
            {recoveryCodes.map((c, i) => (
              <View key={i} style={styles.codeRow}>
                <Text style={styles.codeIndex}>{i + 1}.</Text>
                <Text style={styles.codeText} selectable>
                  {c}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ height: spacing.md }} />
          <Button
            title="Copy all codes"
            onPress={copyCodes}
            variant="outline"
            icon="copy"
          />

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              <Text style={{ fontWeight: '700' }}>Important: </Text>
              If you lose both your password and these codes, your account cannot
              be recovered. After using a recovery code, vaults already created
              will release to recipients normally, but you will no longer view
              their contents yourself.
            </Text>
          </View>

          <Pressable
            onPress={() => setAcknowledged((v) => !v)}
            style={styles.checkboxRow}
          >
            <View
              style={[
                styles.checkbox,
                acknowledged && styles.checkboxChecked,
              ]}
            >
              {acknowledged && <Feather name="check" size={12} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>
              I have saved my recovery codes in a safe place.
            </Text>
          </Pressable>

          <View style={{ height: spacing.sm }} />
          <Button
            title="Continue to dashboard"
            onPress={onAuthed}
            disabled={!acknowledged}
            icon="arrow-right"
          />
        </Card>
      </Screen>
    );
  }

  /* ─── Wizard steps 1-3 ─── */

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

        {/* Progress dots */}
        <View style={styles.progressRow}>
          {[1, 2, 3].map((n) => (
            <View
              key={n}
              style={[
                styles.progressDot,
                n <= stepNumber && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Heading>
            {step === 'email' && 'Create your account'}
            {step === 'code' && 'Check your email'}
            {step === 'password' && 'Set your password'}
          </Heading>
          <Muted>
            {step === 'email' &&
              'We will send a 6-digit code to confirm your email.'}
            {step === 'code' && (
              <>Enter the code we sent to {email}.</>
            )}
            {step === 'password' &&
              'Your password is your master encryption key — pick something strong.'}
          </Muted>
        </View>

        <Card style={{ marginTop: spacing.lg }}>
          {step === 'email' && (
            <>
              <Label>Email</Label>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoFocus
              />
              <View style={{ height: spacing.xs }} />
              <Button
                title={loading ? 'Sending code…' : 'Send code'}
                onPress={sendCode}
                loading={loading}
                icon="arrow-right"
              />
            </>
          )}

          {step === 'code' && (
            <>
              <Label>Verification code</Label>
              <Input
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                style={styles.codeInput}
              />
              <View style={{ height: spacing.xs }} />
              <Button
                title={loading ? 'Verifying…' : 'Verify'}
                onPress={verifyCode}
                loading={loading}
                disabled={code.length !== 6}
                icon="arrow-right"
              />

              <View style={styles.resendRow}>
                <Muted>Didn't get it? </Muted>
                <Pressable
                  onPress={resend}
                  disabled={resendIn > 0 || loading}
                >
                  <Text
                    style={[
                      styles.resendLink,
                      (resendIn > 0 || loading) && styles.resendLinkDisabled,
                    ]}
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => {
                  setStep('email');
                  setCode('');
                }}
                style={{ marginTop: spacing.sm }}
              >
                <Text style={styles.subtleLink}>← Use a different email</Text>
              </Pressable>
            </>
          )}

          {step === 'password' && (
            <>
              <Label>Full name (optional)</Label>
              <Input
                value={fullName}
                onChangeText={setFullName}
                placeholder="Jane Doe"
                autoCapitalize="words"
              />

              <Label>Password</Label>
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secureTextEntry
                autoFocus
              />
              {password.length > 0 && (
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

              <Label>Confirm password</Label>
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

              <Label>Check-in interval (days)</Label>
              <Input
                value={interval}
                onChangeText={setIntervalDays}
                keyboardType="number-pad"
              />

              <View style={{ height: spacing.xs }} />
              <Button
                title={loading ? 'Generating keys…' : 'Create account'}
                onPress={create}
                loading={loading}
                disabled={!passwordLongEnough || !passwordsMatch}
                icon="arrow-right"
              />
            </>
          )}
        </Card>

        <View style={styles.footer}>
          <Muted>Already have an account?</Muted>
          <Text style={styles.link} onPress={() => nav.navigate('Login')}>
            Sign in
          </Text>
        </View>
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
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.lg,
  },
  progressDot: {
    height: 4,
    width: 32,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.text,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 12,
    fontVariant: ['tabular-nums'],
    paddingVertical: 16,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  resendLink: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  resendLinkDisabled: { color: colors.muted },
  subtleLink: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -2,
    marginBottom: spacing.xs,
  },
  hintText: { fontSize: 12, color: colors.muted },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codesGrid: { gap: 6 },
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
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 14,
    color: colors.text,
    letterSpacing: 1.5,
  },
  warningBox: {
    marginTop: spacing.md,
    padding: 12,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: radius.sm,
  },
  warningText: {
    color: '#78350f',
    fontSize: 12,
    lineHeight: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: spacing.md,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  link: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});

export default RegisterScreen;
