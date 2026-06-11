# MTC v44.1 — Render Backend Edition

Esta versión evita Firebase Functions v2 y, por lo tanto, no requiere activar Firebase Blaze para el backend.

La arquitectura queda así:

```text
React / Netlify
  -> Firebase Auth + Firestore
  -> /api/* proxy hacia Render
  -> Render Node/Express backend
  -> MetaAPI + PayPal + Firebase Admin SDK
```

## 1. Instalar frontend

Desde la raíz del proyecto:

```bash
npm install
npm run dev
```

## 2. Instalar backend local

```bash
cd server
npm install
copy .env.example .env
npm run dev
```

El backend local corre en:

```text
http://localhost:8080
```

El frontend local debe tener en `.env`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

## 3. Firebase Admin SDK sin Blaze

Para que Render pueda leer tokens de Firebase Auth y escribir en Firestore, necesitás un Service Account.

En Firebase / Google Cloud:

```text
Project Settings -> Service accounts -> Generate new private key
```

Eso descarga un JSON.

Convertir JSON a Base64 en Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\ruta\service-account.json"))
```

Pegar el resultado en Render:

```env
FIREBASE_SERVICE_ACCOUNT_BASE64=PEGAR_BASE64_AQUI
FIREBASE_PROJECT_ID=moises-trading-club
```

No subas ese JSON al repositorio.

## 4. Variables necesarias en Render

En Render -> Environment:

```env
NODE_ENV=production
APP_URL=https://www.moisestradingclub.com
ALLOWED_ORIGINS=https://www.moisestradingclub.com,https://TU-SITIO.netlify.app
FIREBASE_PROJECT_ID=moises-trading-club
FIREBASE_SERVICE_ACCOUNT_BASE64=...

PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...

METAAPI_TOKEN=...
METAAPI_DEFAULT_REGION=new-york
ENCRYPTION_KEY=...

CRON_SECRET=crear_un_secret_largo
```

Generar ENCRYPTION_KEY:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 5. Deploy en Render

Crear un Web Service nuevo.

Configuración:

```text
Root Directory: server
Build Command: npm install
Start Command: npm start
Health Check Path: /health
Node: 20+
```

Cuando Render te dé una URL, por ejemplo:

```text
https://mtc-render-backend.onrender.com
```

probá:

```text
https://mtc-render-backend.onrender.com/health
```

Debe responder:

```json
{ "ok": true, "service": "mtc-render-backend", "version": "44.1" }
```

## 6. Netlify proxy

Editar `netlify.toml`:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://mtc-render-backend.onrender.com/api/:splat"
  status = 200
  force = true
```

Luego deployar Netlify.

En producción, el frontend puede mantener endpoints relativos:

```env
VITE_PAYPAL_CREATE_ORDER_ENDPOINT=/api/createPayPalOrder
VITE_PAYPAL_CAPTURE_ORDER_ENDPOINT=/api/capturePayPalOrder
VITE_CHECKOUT_ENDPOINT=/api/createPayPalOrder
VITE_MEMBERSHIP_SYNC_ENDPOINT=/api/updateMembershipStatus
VITE_API_BASE_URL=
```

## 7. Cron / Auto Sync

Como ya no usamos Firebase Scheduler, el auto-sync queda disponible como endpoint seguro:

```text
POST /api/cron/mtAutoSync
Header: x-cron-secret: TU_CRON_SECRET
```

Podés llamarlo con un cron externo cada hora.

También existe:

```text
POST /api/cron/expireMemberships
Header: x-cron-secret: TU_CRON_SECRET
```

## 8. Endpoints disponibles

```text
POST /api/createPayPalOrder
POST /api/capturePayPalOrder
POST /api/paypalWebhook
POST /api/updateMembershipStatus

POST /api/mtConnect
POST /api/mtConnectionStatus
POST /api/mtSync
POST /api/mtDisconnect

POST /api/cron/mtAutoSync
POST /api/cron/expireMemberships
GET  /health
```

## 9. Seguridad

- El frontend nunca guarda credenciales MT5.
- Login e investor password se cifran en backend con AES-256-GCM.
- `brokerConnections` sigue protegido en Firestore rules.
- Firebase ID Token se valida desde Render con Admin SDK.
- PayPal secrets y MetaAPI token viven solo en Render.

