# Moisés Trading Club v40.6

Pulido visual/UX mobile, integración del nuevo logo, tooltip premium, Journal con formulario primero y toast flotante.

Build validado con `npm run build`.

# Moisés Trading Club — versión definitiva Netlify + Firebase

App React/Vite/PWA preparada para funcionar como plataforma privada con registro real de alumnos.

Incluye:
- Firebase Authentication con Email/Password.
- Registro real de alumnos.
- Roles: admin, moderador, alumno e invitado.
- Firestore para usuarios, trades, comunidad, ideas, notificaciones y settings.
- Storage para imágenes/archivos.
- PWA instalable.
- Deploy listo para Netlify.
- Reglas de seguridad incluidas.

---

## 1. Instalación local

```bash
npm install
npm run dev
```

Abrir:

```text
http://localhost:5173/
```

---

## 2. Crear proyecto Firebase

En Firebase Console:

1. Crear proyecto nuevo.
2. Agregar una app web.
3. Copiar la configuración de Firebase.
4. Ir a Authentication > Sign-in method.
5. Activar Email/Password.
6. Ir a Firestore Database y crear base de datos.
7. Ir a Storage y crear bucket.

---

## 3. Variables de entorno

Copiar `.env.example` como `.env`.

En Windows podés crear manualmente un archivo llamado `.env` en la raíz del proyecto.

Ejemplo:

```env
VITE_FIREBASE_API_KEY=PEGAR_AQUI
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=PEGAR_AQUI
VITE_FIREBASE_APP_ID=PEGAR_AQUI
VITE_ADMIN_EMAILS=ismaelemeri@gmail.com,mentor@mtc.com
```

Importante:
`VITE_ADMIN_EMAILS` define qué emails entran como admin/mentor al registrarse.

---

## 4. Reglas de seguridad Firestore

Abrir:

```text
docs/firestore.rules
```

Antes de pegarlas en Firebase, revisá esta función:

```js
function isBootstrapAdminEmail() {
  return signedIn() && request.auth.token.email in [
    'ismaelemeri@gmail.com',
    'mentor@mtc.com'
  ];
}
```

Agregá tu email real de admin si no está ahí.

Después pegar todo el archivo en:

```text
Firebase Console > Firestore Database > Rules
```

Publicar reglas.

---

## 5. Reglas de seguridad Storage

Abrir:

```text
docs/storage.rules
```

Pegar en:

```text
Firebase Console > Storage > Rules
```

Publicar reglas.

---

## 6. Crear usuario admin/mentor

1. Ejecutar la app local o en Netlify.
2. Ir a Registro.
3. Registrarse usando un email incluido en:

```env
VITE_ADMIN_EMAILS
```

Ese usuario se crea automáticamente como `admin`, siempre que ese mismo email esté permitido en `docs/firestore.rules`.

Si algo falla, registrate igual, andá a Firestore > users > tu UID y cambiá manualmente:

```text
role: admin
```

---

## 7. Deploy en Netlify

### Opción manual

```bash
npm run build
```

Eso crea una carpeta:

```text
dist
```

En Netlify:

1. Add new site.
2. Deploy manually.
3. Arrastrar la carpeta `dist`.

### Opción profesional con GitHub

1. Subir el proyecto a GitHub.
2. Netlify > Add new site > Import from Git.
3. Elegir repo.
4. Build command:

```bash
npm run build
```

5. Publish directory:

```text
dist
```

---

## 8. Variables en Netlify

En Netlify:

```text
Site configuration > Environment variables
```

Agregar:

```env
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_ADMIN_EMAILS
```

Después hacer:

```text
Deploys > Trigger deploy > Clear cache and deploy site
```

---

## 9. Cómo entran los alumnos

Cuando la app esté publicada en Netlify:

1. Compartís el link de Netlify.
2. El alumno toca Registro.
3. Crea su cuenta con email y contraseña.
4. Entra como alumno.
5. Sus trades se guardan en Firestore asociados a su usuario.
6. El muro, ideas y notificaciones quedan sincronizadas.

---

## 10. Colecciones usadas

- users
- settings
- trades
- posts
- ideas
- notifications
- courses
- lessonProgress

---

## 11. Notas de seguridad

- Cada alumno solo puede crear trades con su propio userId.
- Cada alumno puede leer/editar sus propios trades.
- Admin/moderador puede gestionar usuarios, ideas y contenido.
- Los usuarios no pueden cambiarse a admin desde su perfil.
- Likes/comentarios están permitidos para usuarios autenticados.

---

## 12. Checklist final antes de abrir a alumnos

- Firebase Auth Email/Password activo.
- Firestore creado.
- Storage creado.
- `.env` configurado localmente.
- Variables cargadas en Netlify.
- Firestore rules publicadas.
- Storage rules publicadas.
- Admin creado y funcionando.
- Registro de alumno probado en navegador incógnito.

## Versión 2 incluida

Esta versión agrega:
- Sección **Sistema** con los 7 Mandamientos y Patrones de Moisés.
- Sección **Lectura** para estudio aplicado y mejora del proceso.
- Journal mejorado con selector **Sistema de Moisés / Otro**.
- Selector de patrón específico del sistema.
- Resultado destacado por trade: dinero, porcentaje y R.
- Campo de link de captura opcional para evitar Firebase Storage.
- Barra móvil ampliada con Sistema y Lectura.
- Icono PWA basado en el logo real y nombre de instalación: **Moises Trading Club**.

Para actualizar Netlify:
1. Copiar tu archivo `.env` en esta carpeta.
2. Ejecutar `npm install` si es necesario.
3. Ejecutar `npm run build`.
4. Subir nuevamente la carpeta `dist` al deploy manual de Netlify.
5. En celular, borrar la app instalada anterior y volver a instalar para ver el nuevo icono y navegación.


## v7 Biblioteca
- La sección Libros/Biblioteca ahora muestra los documentos de Firestore `books` en cards visibles.
- Cada libro puede tener `coverUrl` para portada.
- Si el PDF es un link público de Google Drive, la app intenta mostrar una miniatura automática.
- Si no hay portada, genera una portada premium con título/categoría.


## v8 - Login con Google

Activá Google en Firebase Authentication > Sign-in method > Google. En Authorized domains agregá tu dominio de Netlify. La app incluye botón 'Continuar con Google' y botón 'Salir' visible en la barra superior.


## v10 Chatbot WhatsApp

Incluye chatbot flotante con preguntas frecuentes y botón directo a WhatsApp: 543412133662. No requiere reglas nuevas de Firestore.


## v11 - Acceso privado por aprobación manual

Esta versión agrega control de acceso real para academia privada.

- Usuarios nuevos: `status: pending`.
- Admin/moderador: `status: approved` automático si el email está en `VITE_ADMIN_EMAILS`.
- Usuarios pendientes, denegados o suspendidos no ven el contenido.
- Desde Admin se puede aprobar, dejar pendiente, denegar o suspender usuarios.
- Firestore Rules bloquean contenido privado para usuarios no aprobados.

Después de publicar esta versión, copiá `docs/firestore.rules` en Firebase → Firestore Database → Rules → Publish.

## v33 Accounts + Admin + Academy Fix
- Cuentas múltiples con capital por cuenta en Perfil.
- Dashboard/Analytics filtran métricas por cuenta y usan el capital configurado.
- Trades editables desde el detalle.
- Libros editables/borrables por admin.
- Admin ve usuarios online.
- Ideas pueden actualizar estado: Profit / Stop / Invalidada / Breakeven.
- Academia acepta link de video, embed Vimeo/Loom y duración.


## v35 Checklist Logic Fix
- Corrige la lógica del Checklist de Moisés para que la luz verde dependa de contextOk + executionOk + patternOk.
- El score queda como métrica educativa, sin habilitar entrada por sí solo.
- Reemplaza el JSON crudo del historial por ficha profesional con respuestas, revisión y comentario del mentor.
- Refuerza el modo reflexivo por riesgo máximo diario/plan diario bajo jornada operativa NY.

## v44.1 Render Backend Edition

Esta versión incluye un backend Express en `/server` para evitar dependencia de Firebase Functions v2 / Blaze.

Documentación:

```text
docs/render-backend-setup.md
```

Comandos útiles:

```bash
npm install
npm run dev

npm run install:backend
npm run dev:backend
```

Backend local:

```text
http://localhost:8080
```

Frontend local con backend externo:

```env
VITE_API_BASE_URL=http://localhost:8080
```
