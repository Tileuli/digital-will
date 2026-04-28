# Digital Will — Mobile

React Native (Expo) app that mirrors the web frontend and talks to the same
backend (`../backend`).

## Quick start

```bash
cd mobile
npm install
npm run start
```

Scan the QR with Expo Go (Android) or with the iOS Camera, or press `a` / `i`
to open an emulator/simulator.

## Backend URL

The mobile device cannot reach `localhost:5001` — that resolves to the phone
itself. You must point the app at your dev machine's LAN IP.

Set one of these (in order of precedence):

1. Env var when starting Expo:
   ```bash
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:5001/api npm run start
   ```
2. Edit `app.json` → `expo.extra.apiBaseUrl` and restart Expo.
3. Edit the fallback in `src/config.ts`.

Make sure the backend binds to `0.0.0.0` (not just `localhost`) so LAN clients
can reach it, and that your OS firewall allows incoming connections on the
backend port.

## Crypto parity with web

The encryption primitives in `src/services/crypto.ts` are designed so that
ciphertext is interchangeable with the web frontend:

| Concept                           | Web (WebCrypto)             | Mobile                         |
|-----------------------------------|------------------------------|--------------------------------|
| KDF                               | PBKDF2-SHA256, 200k iter    | `@noble/hashes` PBKDF2         |
| Symmetric (vault) key             | AES-GCM 256                 | `@noble/ciphers` AES-GCM       |
| IV                                | 12 bytes                    | 12 bytes                       |
| Asymmetric wrap for recipient     | RSA-OAEP-SHA256, 2048       | `node-forge` RSA-OAEP-SHA256   |
| Public key format                 | SPKI DER, base64            | Stripped PEM (SPKI) = same     |
| Private key format (wrapped)      | PKCS8 DER, AES-GCM          | PKCS8 DER, AES-GCM             |

A vault created on web decrypts on mobile and vice versa.

## What is NOT in mobile (yet)

- **Attachments in vaults** — text-only for now. Add via web.
- **Recipient-facing flows** (`/recipient/setup`, `/recipient/claim`) — those
  are opened from the invitation/release email on web. Mobile deep linking is
  a future step.
- **File download** from released vaults.

## Project layout

```
mobile/
├── App.tsx                    # root component (navigation + safe area)
├── index.ts                   # polyfills + root registration
├── app.json                   # Expo config
├── src/
│   ├── config.ts              # API base URL resolver
│   ├── types/index.ts         # mirror of frontend/src/types
│   ├── services/
│   │   ├── api.ts             # axios + token + 401 handler
│   │   ├── auth.ts            # register/login with crypto
│   │   ├── crypto.ts          # RN-compatible E2E primitives
│   │   ├── keySession.ts      # in-memory key holder
│   │   ├── storage.ts         # AsyncStorage wrappers
│   │   └── vault.ts           # vaults + recipients + checkins
│   ├── navigation/
│   │   └── RootNavigator.tsx  # auth stack + tabs
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── VaultScreen.tsx
│   │   ├── RecipientsScreen.tsx
│   │   └── CheckinsScreen.tsx
│   └── components/ui.tsx      # Screen/Card/Input/Button/Badge primitives
```

## Notes on performance

- `forge.pki.rsa.generateKeyPair(2048)` on a phone in pure JS takes 5–30
  seconds. Only happens at registration. The UI shows "Generating keys…".
- PBKDF2 with 200k iterations takes 500ms–2s on mobile. Happens on register
  and login.
- Vault encryption/decryption (AES-GCM) is sub-millisecond for typical text.
