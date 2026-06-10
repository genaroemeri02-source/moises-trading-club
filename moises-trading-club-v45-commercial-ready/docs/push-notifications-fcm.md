# Push notifications reales en segundo plano

La v27 deja la app preparada a nivel de flujo: anuncios, ideas, academia y chat generan registros en `notifications` y esos avisos son navegables dentro de la app.

Para notificaciones push reales con la app cerrada se requiere configurar Firebase Cloud Messaging (FCM):

1. Firebase Console → Project settings → Cloud Messaging.
2. Crear Web Push certificate / VAPID key.
3. Agregar `firebase/messaging` en el frontend.
4. Guardar tokens por usuario en Firestore.
5. Enviar pushes desde backend seguro / Cloud Functions.

No se debe enviar push real desde frontend, porque expondría credenciales.
