import React from 'react';
import {
  ActivityIndicator,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export const colors = {
  bg: '#f4f5f7',
  bgAlt: '#ffffff',
  card: '#ffffff',
  border: '#e6e8ec',
  borderStrong: '#d1d5db',
  text: '#0f172a',
  textMuted: '#475569',
  muted: '#6b7280',
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primarySoft: '#dbeafe',
  danger: '#dc2626',
  dangerSoft: '#fee2e2',
  success: '#16a34a',
  successSoft: '#dcfce7',
  warning: '#d97706',
  warningSoft: '#fef3c7',
  info: '#2563eb',
  infoSoft: '#dbeafe',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

const shadow = Platform.select({
  ios: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
  default: {},
}) as ViewStyle;

/* ─────────────── Layout ─────────────── */

type ScreenProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  scroll?: boolean;
};

export const Screen: React.FC<ScreenProps> = ({ children, style, scroll = true }) => {
  const content = (
    <View style={[styles.screenInner, style]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
};

export const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[styles.card, style]}>{children}</View>;

/* ─────────────── Typography ─────────────── */

export const Heading: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => <Text style={[styles.heading, style]}>{children}</Text>;

export const SubHeading: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => <Text style={[styles.subheading, style]}>{children}</Text>;

export const Muted: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => <Text style={[styles.muted, style]}>{children}</Text>;

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.label}>{children}</Text>
);

/* ─────────────── Button ─────────────── */

type ButtonVariant =
  | 'primary'
  | 'danger'
  | 'dangerOutline'
  | 'dangerSoft'
  | 'ghost'
  | 'soft'
  | 'outline';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

type ButtonProps = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  icon?: FeatherIconName;
  style?: ViewStyle;
};

type VariantStyle = {
  bg: string;
  fg: string;
  border?: string;
};

const variantStyles: Record<ButtonVariant, VariantStyle> = {
  primary: { bg: colors.primary, fg: '#fff' },
  soft: { bg: colors.primarySoft, fg: colors.primaryDark },
  danger: { bg: colors.danger, fg: '#fff' },
  dangerOutline: { bg: 'transparent', fg: colors.danger, border: colors.danger },
  dangerSoft: { bg: colors.dangerSoft, fg: '#b91c1c' },
  outline: { bg: '#fff', fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.primary, border: colors.primary },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  size = 'md',
  icon,
  style,
}) => {
  const isDisabled = disabled || loading;
  const v = variantStyles[variant];

  const paddingV = size === 'sm' ? 8 : 12;
  const paddingH = size === 'sm' ? 12 : 18;
  const iconSize = size === 'sm' ? 13 : 15;
  const fontSize = size === 'sm' ? 13 : 14;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: v.bg,
          opacity: isDisabled ? 0.5 : pressed ? 0.82 : 1,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <View style={styles.buttonInner}>
          {icon && (
            <Feather
              name={icon}
              size={iconSize}
              color={v.fg}
              style={{ marginRight: 6 }}
            />
          )}
          <Text style={[styles.buttonText, { color: v.fg, fontSize }]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

/* ─────────────── Input ─────────────── */

export const Input: React.FC<TextInputProps> = (props) => (
  <TextInput
    placeholderTextColor="#9ca3af"
    {...props}
    style={[styles.input, props.multiline && styles.inputMultiline, props.style]}
  />
);

/* ─────────────── Badge ─────────────── */

type Tone = 'neutral' | 'success' | 'warning' | 'info' | 'danger';

const toneBg: Record<Tone, string> = {
  neutral: '#f1f5f9',
  success: colors.successSoft,
  warning: colors.warningSoft,
  info: colors.infoSoft,
  danger: colors.dangerSoft,
};
const toneFg: Record<Tone, string> = {
  neutral: '#475569',
  success: '#15803d',
  warning: '#b45309',
  info: '#1d4ed8',
  danger: '#b91c1c',
};

export const Badge: React.FC<{ label: string; tone?: Tone }> = ({
  label,
  tone = 'neutral',
}) => (
  <View style={[styles.badge, { backgroundColor: toneBg[tone] }]}>
    <Text style={[styles.badgeText, { color: toneFg[tone] }]}>{label}</Text>
  </View>
);

/* ─────────────── Divider ─────────────── */

export const Divider: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.divider, style]} />
);

/* ─────────────── Sheet (modal) ─────────────── */

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export const Sheet: React.FC<SheetProps> = ({ visible, onClose, title, children }) => {
  const insets = useSafeAreaInsets();
  return (
    <RNModal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <View style={styles.sheetTopBar}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [
              styles.closeBtn,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Feather name="x" size={22} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: spacing.xxl + insets.bottom,
          }}
        >
          {title ? <Text style={styles.sheetBodyTitle}>{title}</Text> : null}
          {children}
        </ScrollView>
      </View>
    </RNModal>
  );
};

/* ─────────────── Styles ─────────────── */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  screenInner: { flex: 0 },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow,
  },

  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  subheading: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: -0.2,
  },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  button: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontWeight: '600', letterSpacing: 0.1 },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#fff',
    marginBottom: spacing.sm,
  },
  inputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  sheetTopBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 0,
  },
  closeBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBodyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.4,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});
