# Integración PayPal Sandbox → Live — Moisés Trading Club

Esta versión ya trae el código preparado para PayPal con Firebase Functions.

## 1. Qué quedó agregado al código

Archivos nuevos:

- `functions/index.js`
- `functions/package.json`
- `functions/.env.example`
- `firebase.json`
- `firestore.rules`
- `.firebaserc.example`
- `docs/paypal-sandbox-live-guia.md`

Funciones backend:

- `createPayPalOrder`
- `capturePayPalOrder`
- `paypalWebhook`
- `updateMembershipStatus`
- `expireMembershipsScheduled`

## 2. Qué datos tenés que copiar de PayPal Sandbox

Entrá a:

`developer.paypal.com → Apps & Credentials → Sandbox → tu App`

Copiá:

- `Client ID`
- `Secret`

Después entrá a:

`Testing Tools → Sandbox Accounts`

Necesitás:

- una cuenta sandbox Business/Merchant, que es la que cobra;
- una cuenta sandbox Personal/Buyer, que es la que paga en la prueba.

## 3. Variables del frontend

En `.env` o en las variables de tu hosting:

```env
VITE_PAYMENTS_ENABLED=true
VITE_PAYMENT_PROVIDER=paypal
VITE_PAYPAL_ENV=sandbox

VITE_PAYPAL_CREATE_ORDER_ENDPOINT=/api/createPayPalOrder
VITE_PAYPAL_CAPTURE_ORDER_ENDPOINT=/api/capturePayPalOrder
VITE_MEMBERSHIP_SYNC_ENDPOINT=/api/updateMembershipStatus

VITE_PAYMENT_SUCCESS_URL=https://www.moisestradingclub.com/payment-success
VITE_PAYMENT_CANCEL_URL=https://www.moisestradingclub.com/payment-cancel
```

Si usás Firebase Hosting con el `firebase.json` incluido, podés dejar `/api/...`.

Si usás Netlify/Vercel/otro hosting, reemplazá `/api/...` por las URLs reales de Cloud Functions, por ejemplo:

```env
VITE_PAYPAL_CREATE_ORDER_ENDPOINT=https://us-central1-TU_PROJECT_ID.cloudfunctions.net/createPayPalOrder
VITE_PAYPAL_CAPTURE_ORDER_ENDPOINT=https://us-central1-TU_PROJECT_ID.cloudfunctions.net/capturePayPalOrder
VITE_MEMBERSHIP_SYNC_ENDPOINT=https://us-central1-TU_PROJECT_ID.cloudfunctions.net/updateMembershipStatus
```

## 4. Variables del backend

Copiá `functions/.env.example` como `functions/.env`.

Sandbox:

```env
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=PEGAR_CLIENT_ID_SANDBOX
PAYPAL_CLIENT_SECRET=PEGAR_SECRET_SANDBOX
PAYPAL_WEBHOOK_ID=PEGAR_WEBHOOK_ID_SANDBOX
APP_URL=https://www.moisestradingclub.com
```

Importante: `PAYPAL_CLIENT_SECRET` nunca va en React/Vite. Solo va en `functions/.env`.

## 5. Instalar Firebase CLI

En tu PC:

```bash
npm install -g firebase-tools
firebase login
```

Después, dentro de la carpeta del proyecto:

```bash
firebase use TU_PROJECT_ID
```

Si no existe `.firebaserc`, copiá `.firebaserc.example` como `.firebaserc` y reemplazá `TU_FIREBASE_PROJECT_ID`.

## 6. Instalar funciones

Dentro del proyecto:

```bash
cd functions
npm install
cd ..
```

## 7. Subir rules y functions

```bash
firebase deploy --only firestore:rules
firebase deploy --only functions
```

Firebase te va a devolver URLs parecidas a:

```text
https://us-central1-TU_PROJECT_ID.cloudfunctions.net/createPayPalOrder
https://us-central1-TU_PROJECT_ID.cloudfunctions.net/capturePayPalOrder
https://us-central1-TU_PROJECT_ID.cloudfunctions.net/paypalWebhook
```

Si usás Firebase Hosting, también hacé:

```bash
npm run build
firebase deploy --only hosting
```

## 8. Crear webhook en PayPal Sandbox

Entrá a:

`developer.paypal.com → Apps & Credentials → Sandbox → tu App → Webhooks → Add Webhook`

URL del webhook:

```text
https://us-central1-TU_PROJECT_ID.cloudfunctions.net/paypalWebhook
```

Eventos recomendados:

- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.REFUNDED`
- `CHECKOUT.ORDER.APPROVED`

Después PayPal te da un `Webhook ID`.

Copialo en `functions/.env`:

```env
PAYPAL_WEBHOOK_ID=TU_WEBHOOK_ID_SANDBOX
```

Volvé a deployar:

```bash
firebase deploy --only functions
```

## 9. Flujo de prueba Sandbox

1. Crear usuario nuevo en la app.
2. Que quede sin acceso activo.
3. Ver paywall.
4. Elegir plan Esencial o Pro.
5. Click “Activar plan”.
6. Se redirige a PayPal Sandbox.
7. Iniciar sesión con cuenta Buyer Sandbox.
8. Pagar.
9. Volver a `/payment-success`.
10. El backend captura el pago.
11. El usuario queda con:
   - `accessStatus: active`
   - `subscriptionStatus: active`
   - `accessSource: payment`
   - `paymentProvider: paypal`
   - `currentPeriodEnd` calculado por ciclo.
12. La app desbloquea el dashboard.

## 10. Pasar a Live

Cuando Sandbox funcione perfecto:

En PayPal:

`developer.paypal.com → Apps & Credentials → Live`

Copiá:

- Live Client ID
- Live Secret

Creá también webhook Live con la misma URL:

```text
https://us-central1-TU_PROJECT_ID.cloudfunctions.net/paypalWebhook
```

Pegá el Live Webhook ID.

Backend `functions/.env`:

```env
PAYPAL_ENV=live
PAYPAL_CLIENT_ID=PEGAR_CLIENT_ID_LIVE
PAYPAL_CLIENT_SECRET=PEGAR_SECRET_LIVE
PAYPAL_WEBHOOK_ID=PEGAR_WEBHOOK_ID_LIVE
APP_URL=https://www.moisestradingclub.com
```

Frontend:

```env
VITE_PAYPAL_ENV=live
```

Deploy final:

```bash
firebase deploy --only functions
npm run build
firebase deploy --only hosting
```

Si tu frontend está en Netlify/Vercel, actualizá esas variables en el panel de hosting y redeploy.

## 11. Prueba Live

Hacé un pago real pequeño con una cuenta tuya externa, verificá:

- PayPal cobró.
- Firestore creó `payments/{paymentId}`.
- `payments/{paymentId}.status` quedó `completed`.
- `users/{uid}.accessStatus` quedó `active`.
- El usuario entra al dashboard.

No pases masivamente a alumnos hasta que esta prueba real funcione.
