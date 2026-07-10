# Moisés Trading Club v45 — Commercial Ready

## Objetivo
Versión preparada para empezar a vender membresías: PayPal, roles, accesos, paywall, administración y núcleo operativo activo.

## Cambios principales

### 1. MT4/MT5 pausado para próxima versión
- La sección Sync MT5 ya no intenta conectar cuentas MetaAPI.
- El módulo queda visible como “Próxima versión”.
- Se evita vender una función incompleta o dependiente de MetaAPI billing.
- Se eliminan explicaciones técnicas tipo MetaAPI/provisioning/AES del flujo visible del usuario.

### 2. PayPal + membresías
Backend ya incluye endpoints:
- `POST /api/createPayPalOrder`
- `POST /api/capturePayPalOrder`
- `POST /api/paypalWebhook`
- `POST /api/paypal/webhook`
- `POST /api/syncMembership`
- `GET /api/plans`

Planes actuales en backend / UI (Sprint 09 Commercial Truth):
- `basic` / Club: USD **14.99** mensual
- `premium` / Pro: USD **24.99** mensual
- Mentoría: USD **250** mensual (WhatsApp; sin PayPal)

> Nota: RELEASE histórico citaba 29/49. La fuente de verdad es `src/lib/commercialConfig.js` + `server/index.js` PLAN_PRICING (14.99/24.99).

Ciclos:
- mensual
- trimestral con descuento
- anual

### 3. Roles y accesos
La app ya usa Firestore para controlar acceso:
- `admin`
- `moderador`
- `alumno`
- `invitado`

Estados:
- activo
- pendiente de pago
- bloqueado
- vencido
- suspendido

### 4. Limpieza comercial
- Se quitó el HelpBot de la app principal.
- Se redujeron mensajes técnicos visibles para el alumno.
- Se mejoró el texto de pago para usuario final.
- Se dejó el producto enfocado en Journal, Checklist, Analytics, Comunidad, Academia, Resultados y Membresía.

### 5. Rendimiento
- Build de producción probado.
- Backend validado con `node --check`.
- Se recomienda no subir `node_modules`, `dist` ni `.env` a GitHub.

## Variables frontend necesarias
Copiar `.env.example` a `.env` y completar Firebase.
Para pagos locales con Render:

```env
VITE_API_BASE_URL=https://mtc-backend-v2.onrender.com
VITE_PAYMENTS_ENABLED=true
VITE_PAYMENT_PROVIDER=paypal
VITE_PAYPAL_CREATE_ORDER_ENDPOINT=https://mtc-backend-v2.onrender.com/api/createPayPalOrder
VITE_PAYPAL_CAPTURE_ORDER_ENDPOINT=https://mtc-backend-v2.onrender.com/api/capturePayPalOrder
VITE_MEMBERSHIP_SYNC_ENDPOINT=https://mtc-backend-v2.onrender.com/api/syncMembership
VITE_PAYMENT_SUCCESS_URL=http://localhost:5173/payment-success
VITE_PAYMENT_CANCEL_URL=http://localhost:5173/payment-cancel
```

Cuando publiques dominio final, cambiar success/cancel a:

```env
VITE_PAYMENT_SUCCESS_URL=https://www.moisestradingclub.com/payment-success
VITE_PAYMENT_CANCEL_URL=https://www.moisestradingclub.com/payment-cancel
```

## Variables Render backend
En Render, Environment:

```env
NODE_ENV=production
APP_URL=https://www.moisestradingclub.com
ALLOWED_ORIGINS=http://localhost:5173,https://www.moisestradingclub.com,https://moisestradingclub.com
FIREBASE_PROJECT_ID=moises-trading-club
FIREBASE_SERVICE_ACCOUNT_BASE64=...
ENCRYPTION_KEY=...
CRON_SECRET=...
METAAPI_TOKEN=
METAAPI_DEFAULT_REGION=london
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
```

No crear variable `PORT` en Render.

## Render settings
- Root Directory: `server`
- Build Command: `npm ci --omit=dev --no-audit --no-fund`
- Start Command: `node index.js`

## PayPal Webhook URL
Sandbox o Live:

```text
https://mtc-backend-v2.onrender.com/api/paypal/webhook
```

Eventos recomendados:
- `CHECKOUT.ORDER.APPROVED`
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.REFUNDED`

## Flujo comercial recomendado
1. Configurar PayPal sandbox.
2. Probar compra con cuenta sandbox.
3. Confirmar que el usuario pasa a `accessStatus=active` y `subscriptionStatus=active`.
4. Probar vencimiento/renovación manual desde Admin.
5. Pasar PayPal a Live.
6. Publicar dominio.
7. Vender plan Club/Pro.
