# Moisés Trading Club v43.2 — PayPal Checkout Sandbox

Esta versión integra PayPal como primera pasarela real de pago, usando Orders API como pago único por período.

## Flujo implementado

1. Usuario registrado sin acceso entra al paywall.
2. Elige Esencial o Pro y ciclo mensual/trimestral/anual.
3. El frontend llama al backend `createPayPalOrder`.
4. El backend valida usuario, plan y ciclo, recalcula precio, crea la orden en PayPal y guarda `payments/{paymentId}` con `status: created`.
5. El usuario es redirigido a PayPal mediante `approvalUrl`.
6. Si aprueba, PayPal vuelve a `/payment-success`.
7. La página lee `provider=paypal` y `token/orderId`.
8. La página llama al backend `capturePayPalOrder`.
9. Si PayPal devuelve `COMPLETED`, el backend activa la membresía en `users/{uid}`.
10. Si el usuario cancela, vuelve a `/payment-cancel` y no se modifica el acceso.

La página de success no activa acceso por sí sola. Solo muestra estado y dispara la captura segura contra backend.

## Variables de entorno frontend

```env
VITE_PAYMENTS_ENABLED=true
VITE_PAYMENT_PROVIDER=paypal
VITE_PAYPAL_ENV=sandbox
VITE_PAYPAL_CLIENT_ID=TU_CLIENT_ID_SANDBOX
VITE_PAYPAL_CREATE_ORDER_ENDPOINT=https://TU_REGION-TU_PROJECT.cloudfunctions.net/createPayPalOrder
VITE_PAYPAL_CAPTURE_ORDER_ENDPOINT=https://TU_REGION-TU_PROJECT.cloudfunctions.net/capturePayPalOrder
VITE_PAYMENT_SUCCESS_URL=https://www.moisestradingclub.com/payment-success
VITE_PAYMENT_CANCEL_URL=https://www.moisestradingclub.com/payment-cancel
```

## Variables de entorno backend

```env
PAYPAL_CLIENT_ID=TU_CLIENT_ID_SANDBOX
PAYPAL_CLIENT_SECRET=TU_CLIENT_SECRET_SANDBOX
PAYPAL_ENV=sandbox
PAYPAL_WEBHOOK_ID=TU_WEBHOOK_ID_SANDBOX
APP_URL=https://www.moisestradingclub.com
```

Nunca poner `PAYPAL_CLIENT_SECRET` en React, Vite, Netlify frontend ni variables `VITE_`.

## Eventos webhook recomendados

- `CHECKOUT.ORDER.APPROVED`
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.PENDING`

PayPal documenta el uso de Orders API v2 para crear/capturar órdenes y el uso de webhooks para eventos de pagos. Ver documentación oficial de PayPal Orders API v2 y Webhooks.

## Duración de membresía

- `monthly`: +1 mes
- `quarterly`: +3 meses
- `yearly`: +12 meses

El backend calcula `currentPeriodEnd` con meses reales, no con días fijos.

## Expiración

`expireMembershipsScheduled` corre periódicamente y cambia usuarios vencidos a:

```js
subscriptionStatus: "expired"
accessStatus: "inactive"
expiredAt: serverTimestamp()
```

Usuarios `admin`, `moderador` y `manual_approved` no se expiran por esta función.

## Prueba sandbox

1. Crear app REST en PayPal Developer.
2. Copiar sandbox client ID y secret.
3. Crear comprador sandbox.
4. Configurar webhook con URL de `paypalWebhook`.
5. Activar eventos listados arriba.
6. Cargar env vars en backend y frontend.
7. Deploy Cloud Functions.
8. Deploy frontend.
9. Crear usuario normal sin acceso.
10. Pagar Esencial o Pro.
11. Confirmar que `payments/{paymentId}.status` pasa a `completed`.
12. Confirmar que `users/{uid}` queda con:

```js
accessStatus: "active"
subscriptionStatus: "active"
paymentProvider: "paypal"
plan: "basic" | "premium"
billingCycle: "monthly" | "quarterly" | "yearly"
currentPeriodEnd: Timestamp futuro
```
