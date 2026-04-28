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

const LoginScreen: React.FC<{ onAuthed: () => void }> = ({ onAuthed }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [totpChallenge, setTotpChallenge] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');

  const nav = useAuthStackNav();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }
    try {
      setLoading(true);
      const result = await authService.login({
        email: email.trim(),
        password,
      });
      if (result.totp_required && result.totp_challenge) {
        setTotpChallenge(result.totp_challenge);
        setTotpCode('');
        return;
      }
      onAuthed();
    } catch (err: any) {
      Alert.alert('Login failed', getErrorMessage(err, 'Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleTotpVerify = async () => {
    if (!totpChallenge || totpCode.length < 6) return;
    try {
      setLoading(true);
      await authService.verifyLoginTotp({
        totp_challenge: totpChallenge,
        code: totpCode,
        password,
      });
      onAuthed();
    } catch (err: any) {
      Alert.alert(
        'Verification failed',
        getErrorMessage(err, 'Invalid verification code.')
      );
    } finally {
      setLoading(false);
    }
  };

  const cancelTotp = () => {
    setTotpChallenge(null);
    setTotpCode('');
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

        <View style={{ marginTop: spacing.xl }}>
          <Heading>{totpChallenge ? 'Two-factor verification' : 'Welcome back'}</Heading>
          <Muted>
            {totpChallenge
              ? 'Enter the 6-digit code from your authenticator app.'
              : 'Sign in to unlock your encrypted vaults.'}
          </Muted>
        </View>

        <Card style={{ marginTop: spacing.lg }}>
          {totpChallenge ? (
            <>
              <View style={styles.totpIconRow}>
                <View style={styles.totpIconCircle}>
                  <Feather name="key" size={20} color={colors.primary} />
                </View>
              </View>
              <Label>Verification code</Label>
              <Input
                value={totpCode}
                onChangeText={(v) => setTotpCode(v.replace(/\D/g, ''))}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                style={styles.totpInput}
              />
              <View style={{ height: spacing.xs }} />
              <Button
                title={loading ? 'Verifying…' : 'Verify'}
                onPress={handleTotpVerify}
                loading={loading}
                disabled={totpCode.length !== 6}
                icon="arrow-right"
              />
              <Pressable onPress={cancelTotp} style={{ marginTop: spacing.sm }}>
                <Text style={styles.subtleLink}>← Use a different account</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Label>Email</Label>
              <Input
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <Label>Password</Label>
              <Input
                placeholder="Your passphrase"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <View style={{ height: spacing.xs }} />
              <Button title="Sign in" onPress={handleLogin} loading={loading} />

              <Pressable
                onPress={() => nav.navigate('Recover')}
                style={{ marginTop: spacing.md, alignItems: 'center' }}
              >
                <Text style={styles.subtleLink}>
                  Forgot password? Use a recovery code →
                </Text>
              </Pressable>
            </>
          )}
        </Card>

        {!totpChallenge && (
          <View style={styles.footer}>
            <Muted>Don't have an account?</Muted>
            <Text style={styles.link} onPress={() => nav.navigate('Register')}>
              Create one
            </Text>
          </View>
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
  totpIconRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  totpIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totpInput: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 12,
    fontVariant: ['tabular-nums'],
    paddingVertical: 16,
  },
  subtleLink: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
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

export default LoginScreen;
