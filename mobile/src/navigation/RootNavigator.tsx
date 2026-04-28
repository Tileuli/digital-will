import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import RecoverScreen from '../screens/RecoverScreen';
import DashboardScreen from '../screens/DashboardScreen';
import VaultScreen from '../screens/VaultScreen';
import RecipientsScreen from '../screens/RecipientsScreen';
import CheckinsScreen from '../screens/CheckinsScreen';
import SettingsScreen from '../screens/SettingsScreen';

import authService from '../services/auth';
import { onUnauthorized } from '../services/api';
import { colors } from '../components/ui';
import { hasSessionKeys, setSessionKeys } from '../services/keySession';
import {
  isBiometricEnabled,
  loadMasterKeyWithBiometric,
} from '../services/biometric';
import { unwrapPrivateKeyWithMasterKey } from '../services/crypto';
import type { User } from '../types';
import { storage } from '../services/storage';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Recover: undefined;
  Main: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const tabIcon = (name: FeatherName) =>
  ({ color, focused }: { color: string; focused: boolean }) => (
    <Feather name={name} size={22} color={color} strokeWidth={focused ? 2.25 : 1.75} />
  );

const MainTabs = () => {
  const insets = useSafeAreaInsets();
  const extraBottom = 12;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: 'transparent',
          height: 64 + insets.bottom + extraBottom,
          paddingTop: 10,
          paddingBottom: insets.bottom + extraBottom,
          paddingHorizontal: 8,
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: tabIcon('home') }}
      />
      <Tab.Screen
        name="Vault"
        component={VaultScreen}
        options={{ tabBarIcon: tabIcon('lock') }}
      />
      <Tab.Screen
        name="Recipients"
        component={RecipientsScreen}
        options={{ tabBarIcon: tabIcon('users') }}
      />
      <Tab.Screen
        name="Checkins"
        component={CheckinsScreen}
        options={{ title: 'Check-ins', tabBarIcon: tabIcon('clock') }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: tabIcon('settings') }}
      />
    </Tab.Navigator>
  );
};

const tryBiometricUnlock = async (): Promise<boolean> => {
  if (hasSessionKeys()) return true;
  if (!(await isBiometricEnabled())) return false;
  const user = await storage.getUser<User>();
  if (!user || !user.id || !user.encrypted_private_key) return false;
  const masterKey = await loadMasterKeyWithBiometric(user.id);
  if (!masterKey) return false;
  try {
    const privateKey = await unwrapPrivateKeyWithMasterKey(
      JSON.parse(user.encrypted_private_key),
      masterKey
    );
    setSessionKeys({ masterKey, privateKey });
    return true;
  } catch {
    return false;
  }
};

const RootNavigator: React.FC = () => {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const tokenPresent = await authService.isAuthenticated();
      if (tokenPresent && !hasSessionKeys()) {
        await tryBiometricUnlock();
      }
      setAuthed(tokenPresent);
    })();
    const unsub = onUnauthorized(() => setAuthed(false));
    return unsub;
  }, []);

  if (authed === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {authed ? (
        <RootStack.Screen name="Main">
          {() => <MainTabsWithAuthHook onLogout={() => setAuthed(false)} />}
        </RootStack.Screen>
      ) : (
        <>
          <RootStack.Screen name="Login">
            {() => <LoginScreen onAuthed={() => setAuthed(true)} />}
          </RootStack.Screen>
          <RootStack.Screen name="Register">
            {() => <RegisterScreen onAuthed={() => setAuthed(true)} />}
          </RootStack.Screen>
          <RootStack.Screen name="Recover" component={RecoverScreen} />
        </>
      )}
    </RootStack.Navigator>
  );
};

/**
 * Wraps MainTabs so the Logout button inside DashboardScreen can bubble up
 * via context. Simpler: pass handler through nav params — but here we use a
 * React context to keep screens prop-clean.
 */
export const LogoutContext = React.createContext<() => void>(() => {});

const MainTabsWithAuthHook: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const handler = React.useCallback(async () => {
    await authService.logout();
    onLogout();
  }, [onLogout]);
  return (
    <LogoutContext.Provider value={handler}>
      <MainTabs />
    </LogoutContext.Provider>
  );
};

/** Hook for screens inside MainTabs to trigger logout. */
export const useLogout = () => React.useContext(LogoutContext);

/** Hook for auth screens to navigate to register/login. */
export const useAuthStackNav = () =>
  useNavigation<any>() as {
    navigate: (screen: keyof RootStackParamList) => void;
  };

export default RootNavigator;
