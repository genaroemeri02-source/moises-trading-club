# MTC Analytics — App Stability Audit

**Fecha:** 2026-07-09  
**Alcance:** Solidificación global (shell, CSS, themes, navegación, scroll, modales, responsive, legacy, QA)  
**Restricción:** Sin features nuevas, sin rediseño, sin lógica de negocio/Firebase/métricas.

---

## 1. Resumen ejecutivo

La app ya tenía el **contrato correcto documentado al EOF** (scroll natural + command sheet + dock retirado), pero **3–4 bloques “SOURCE OF TRUTH” anteriores** seguían vivos en cascada y el JSX del menú cargaba **clases duales** (`mobileNavSheet` + `mobileCommandSheet`). Eso producía:

| Síntoma | Causa raíz |
|---------|------------|
| Franja negra en light | Shell EOF usaba `background: var(--aurora-bg, #f7f8fb)` pero `--aurora-bg` en light seguía siendo `#07050D` (token dark). Fallback nunca se aplicaba. Bloques supersedidos también pintaban `#07050D` con height locks a `--app-height`. |
| Doble caja en menú | Mismo nodo con `.mobileNavSheet` (legacy fixed + bg + border) y `.mobileCommandSheet` (EOF surface). Dos skins sobre una superficie. |
| Scroll bounce / snap | Bloques ABSOLUTE FINAL / VIEWPORT SHELL: `body { position:fixed }`, `overflow:hidden`, `height: var(--app-height)` mientras `mobileViewport.js` reescribe `--app-height` en resize iOS. |
| Padding fantasma | Reservas `--mobile-tabbar-visual-h` / dock gap en reglas mid-file aunque el dock ya no existe en DOM. |

**Dock:** 0 usos en JSX. ~549 menciones CSS residuales. Neutralizadas + kill switch EOF.

---

## 2. Mapa de deuda (Fase 1)

### A) Bloques CSS versionados / “FINAL”

| Línea aprox. | Bloque | Estado |
|--------------|--------|--------|
| L3–28 | Architecture index | Actualizado a contratos post-dock |
| L231–252 | LEGACY floating pill `.mobileNav` | Aislar — no extender |
| L359–1380 | v20–v41 hotfixes | Legacy incremental — no tocar sin QA |
| L1383–6381 | Paywall/Landing v42–v47 | Aislado por prefijo — OK |
| L6382–18110 | Light + dashboard + share | Fragmentado — refactor posterior |
| L18111–26200 | Analytics cockpit | Candidato extract posterior |
| L29189–33165 | Aurora mobile dock experiments | **LEGACY — dock retired** |
| ~~L33166–33632~~ | VIEWPORT SHELL | **NEUTRALIZADO** (height-lock) |
| ~~L33634–34057~~ | APP SHELL ABSOLUTE FINAL | **NEUTRALIZADO** (`body:fixed`) |
| ~~L34059–34402~~ | NO BOTTOM DOCK (dup) | **NEUTRALIZADO** (duplicado) |
| L34404–34888 | NATURAL DOCUMENT SCROLL + COMMAND SHEET + HARDENING | **CANÓNICO (KEEP)** |

### B) Selectores globales peligrosos

| Selector | Riesgo | Acción |
|----------|--------|--------|
| `.main` / `.main.appMain` | Scroll owner wars | Contrato: mobile = overflow visible; desktop = shell actual |
| `.page` | padding-bottom chains | Mantener; no sumar dock pad |
| `.card` / `.primary` | Skins múltiples | Refactor posterior (no este sprint) |
| `.modal` | Overlays | Body lock solo mientras abierto |
| `.mobileNav` | Era pill + dock + overlay | Solo `mobileCommandOverlay` en vivo |
| `.mobileBottomNav` / `.mobileNavDock` | Dead CSS | Kill switch + retired section |
| `.mobileNavSheet` | Doble caja con command | **Quitado del JSX**; CSS legacy aislado |
| `.mobileCommandSheet` | Canónico | KEEP |
| `.tradeDetailModal` | OK | Body class `trade-detail-modal-open` |
| `.dashboardPage` / `.analyticsPage` / `.journalPage` | OK | Sin height lock mobile |

### C) Reglas peligrosas (conteos aprox.)

| Patrón | ~Count | Notas |
|--------|-------:|-------|
| `!important` | ~10.8k | Deuda estructural; no agregar más al EOF |
| `position: fixed` | ~67 | Overlays OK; shell mobile NO |
| `height: var(--app-height` | ~38 | Solo auxiliares / sheet max-height |
| `padding-bottom: 140/144px` literal | 0 | OK |
| `safe-area-inset-bottom` | ~93 | OK si no reserva dock |
| `z-index: -1` | ~4 | Decorativos / retired dock |
| `#07050D` / dark rgba | muchos | Dark OK; light debe usar `#F7F8FB` |

### D) JS peligroso

| Archivo | Hallazgo | Veredicto |
|---------|----------|-----------|
| `mobileViewport.js` | Sin `visualViewport.scroll`; gesture lock; dock gap=0 | **OK / minimal** |
| `scrollDebug.js` | Gate `?debugScroll=1`; monkey-patch solo con query | **OK** |
| `main.jsx` `desktopMainWheelHandler` | Solo `innerWidth >= 861` | **OK desktop** |
| `main.jsx` `scrollIntoView` | CTAs in-page | Bajo riesgo |
| `MobileNav` body classes | `menu-open` + `mobile-command-open` con cleanup | **OK** |

### E) DOM dock

**Cero** usos de `mobileBottomNav` / `mobileNavDock` / `mobileNavMore` en `src/**/*.{js,jsx}`.

---

## 3. Qué se elimina / aísla / deja para después

### Eliminado o neutralizado (este sprint)

- Tres bloques shell supersedidos (VIEWPORT / ABSOLUTE FINAL / NO BOTTOM DOCK dup) → stub retired.
- Clases duales `mobileNavSheet*` en JSX del command sheet.
- Dependencia de `--aurora-bg` dark en superficies light del shell mobile.
- Documentación que aún trataba el dock como fuente de verdad.

### Aislado (retired / no usar)

```css
/* RETIRED MOBILE DOCK — DO NOT USE */
.mobileBottomNav, .mobileNavDock, .mobileNavMore { display: none; }
```

- Reglas mid-file de dock (~L29189+) quedan en archivo pero **sin efecto** (sin DOM + kill switch EOF). Purga masiva línea-a-línea = refactor posterior seguro.

### Refactor posterior (no este sprint)

- Split `paywall.css` / `analytics.css`
- Reducir `!important` global
- Consolidar 75 `@media 860px`
- Purga física de ~549 selectores dock
- Unificar light patches v43/v47

---

## 4. Contratos finales (Fase 2)

### CONTRATO 1 — Scroll

- **Mobile:** scroll natural del documento (`body` / document).
- **Desktop:** shell actual; `desktopMainWheelHandler` solo ≥861px.
- **No** `body { position: fixed }` salvo overlays activos.
- **No** scroller interno mobile salvo command sheet / modals.
- `mobileViewport.js` **no** escucha `visualViewport.scroll`.
- `--app-height` **no** controla height/max-height de shell/main mobile.
- Overlays: body lock solo mientras abiertos; cleanup al cerrar.

### CONTRATO 2 — Mobile navigation

- No bottom dock. No `.mobileBottomNav` / `.mobileNavDock`.
- Nav = topbar hamburger + **MobileCommandSheet** (`mobileCommandOverlay` + `mobileCommandSheet`).
- No padding reservado para dock.
- Secciones: Principal / Operativa / Workspace / Comunidad / Sistema (+ Salir).

### CONTRATO 3 — Theme

- Dark: Aurora `#07050D`.
- Light: canvas `#F7F8FB`; en light `--aurora-bg` debe resolverse a superficie clara.
- Ningún fondo negro en light fuera de texto/icono.
- Dorado = marca; acciones = cyan / violet / magenta.

### CONTRATO 4 — Modals / Sheets

- Overlay = una capa. Sheet = una superficie. Sin doble caja.
- No mezclar skins `.mobileNavSheet` legacy con command sheet en el mismo nodo.
- Body lock solo mientras abierto (`mobile-command-open`, `trade-detail-modal-open`, `share-modal-open`).

### CONTRATO 5 — CSS

- No nuevos bloques “FINAL” gigantes al EOF.
- Secciones lógicas: Tokens → Base → Shell → Nav → … → Mobile → Legacy retired.
- Legacy sin uso: eliminar o retired stub.
- Legacy dudoso: comentar / aislar.

---

## 5. QA matrix (Fase 8) — resultados

### `yarn build`
**OK** (vite 8.1.3, exit 0). Warning de chunk size preexistente (no bloqueante).

### Greps obligatorios

| Búsqueda | Resultado | Contrato |
|----------|-----------|----------|
| `mobileBottomNav\|mobileNavDock\|mobileNavMore` en `main.jsx` | **0** | OK — sin DOM |
| Mismo en `styles.css` | **~288** menciones residuales mid-file | Muertas + kill switch EOF; purga física = hygiene posterior |
| `visualViewport.scroll` listener | **0** | OK |
| `window.scrollTo` / `scrollIntoView` | Landing + CTAs in-page + `scrollDebug` gated | No rompen shell |
| `body.style.position` | **0** | OK |
| `padding-bottom: 140px\|144px` | **0** | OK |
| `height: var(--app-height` activo | Mid-file ~L30185 (v29 dock era) + comentarios | **Anulado por EOF hardening** (`height:auto; max-height:none` en shell/main) |
| `#07050D` / `#05040A` / `rgba(7,5,13` | **~76** | Dark skin + tokens; light shell usa `#F7F8FB` explícito |

### Checklist visual (manual / device)

| Caso | Esperado |
|------|----------|
| Mobile 390 dark/light Dashboard | Canvas correcto; sin dock |
| Scroll hasta abajo + PWA reopen | Sin snap; sin franja negra light |
| Menú dark/light | Una superficie; cierra limpia body classes |
| Analytics / Journal / Trade detail / Emotional / Risk / Checklist | Sin padding fantasma dock |
| Desktop sidebar + light/dark | Sin regresión |

---

## 6. Archivos tocados (este sprint)

| Archivo | Cambio |
|---------|--------|
| `APP_STABILITY_AUDIT.md` | Nuevo — auditoría + contratos |
| `ARCHITECTURE.md` | Contratos post-dock; deprecar dock contract |
| `src/styles.css` | Tokens light; −40KB shell wars neutralizados; retired dock; EOF light canvas; sheet isolation |
| `src/main.jsx` | Command sheet sin clases duales `mobileNavSheet*` |
| `src/lib/mobileViewport.js` | Contrato documentado (sin vv.scroll; `--app-height` auxiliar) |
| `src/lib/scrollDebug.js` | Ya gated `?debugScroll=1` — sin cambio funcional |

---

## 7. Riesgos restantes

1. ~288 selectores dock mid-file siguen en el archivo (muertos) → ruido en grep / peso CSS.
2. Height locks mid-file (~L30185) aún existen en texto; EOF los gana — no reintroducir bloques posteriores al EOF.
3. Light mode de Analytics/Journal aún tiene patches fragmentados v47 — posibles contrastes locales.
4. `!important` densísimo: cualquier hotfix mid-file puede reabrir wars.
5. Purga física de bloques dock L29189–33165 requiere QA visual dedicado (siguiente sprint CSS hygiene).

---

## 8. Follow-up 2026-07-09 — Command sheet + light canvas (structural)

### Causa raíz — doble caja
El overlay montaba `className="mobileNav mobileCommandOverlay"`. Las reglas legacy de `.mobileNav:not(.mobileBottomNav)` (pill flotante: fondo, borde, `border-radius`, sombra, padding) seguían pintando **una caja externa**, mientras `.mobileCommandSheet` pintaba la interna → “cuadro dentro de cuadro”.

### Causa raíz — white mode roto
Bloques v40.x hardcodean `html,body,#root,.app,.main { background:#07090D !important }`. El token light `--aurora-bg:#F7F8FB` existía, pero esas reglas mid-file ganaban en cascada sobre partes del shell.

### Qué se hizo
| Cambio | Detalle |
|--------|---------|
| JSX | Overlay = solo `.mobileCommandOverlay` (sin `.mobileNav`). Handle real en DOM. Cards sin clases duales `isPrimary`/`mobileNavSheet*`. |
| CSS EOF | Bloque canónico: overlay = scrim; **única superficie** = `.mobileCommandSheet`. |
| Light EOF | Canvas `#F7F8FB` en `html/body/#root/.appShell/.main/.page/.pullWrap` con especificidad que gana a v40.x. |
| Legacy | Dual-class `mobileCommand*+mobileNavSheet*` neutralizado (transparent / no paint). |

### Dueña de superficie
**`.mobileCommandSheet`** — única clase autorizada a pintar fondo/borde/sombra del menú mobile.

### Follow-up hotfix (misma fecha) — producción + ellipsis
Evidencia en `moisestradingclub.com`: Network 404 de `index-*.css` (SW cacheaba `index.html` viejo apuntando a hash CSS borrado) + sheet con padding lateral (caja flotante).

| Fix | Detalle |
|-----|---------|
| `public/sw.js` | Cache `v3`; HTML + `/assets/*` network-first; no precache de `/` |
| Sheet | Edge-to-edge bottom sheet (`border-radius` solo arriba, padding overlay 0) |
| Labels | Guard nuclear EOF sobre `button.mobileCommandCard span` |

**Deploy required** + hard refresh / unregister SW en dispositivos que ya tenían `mtc-cache-v2-*`.

### Native polish (fotos WhatsApp)
- Icon chip interno del command sheet eliminado (icono bare, sin border/bg).
- Cards del menú sin borde externo agresivo; active = tint, no marco.
- Close circular sin borde.
- Mobile page: menos sombra en cards top-level; nested cards sin box-shadow doble.
