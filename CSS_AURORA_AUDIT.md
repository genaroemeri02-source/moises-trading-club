# CSS Aurora Audit — Fase 2B

**Fecha:** 2026-07-09  
**Archivo:** `src/styles.css`  
**Precondición:** Stability Sprint (contratos mobile ya canónicos al EOF)

---

## 1. Métricas antes → después

| Métrica | Pre-2B | Post-2B |
|---------|-------:|--------:|
| Líneas | 33 864 | **31 379** (−2 485) |
| `!important` | 12 140 | **10 921** (−1 219) |
| Dock (`mobileBottomNav\|mobileNavDock\|mobileNavMore`) | **398** | **55** |
| `mobileNavSheet` | 232 | **38** |
| `--mobile-tabbar-visual-h:78px` | 1 (activo mid-file) | **0** |
| `padding-bottom: 140/144px` | 0 | 0 |
| Guardrails EOF | No | **Sí** |
| Tokens Aurora consolidados | Parcial | **Sí** |
| `yarn build` | — | **OK** |

**DOM dock:** 0 en JSX (sin cambio). Nav = `mobileTopMenu` + `mobileCommand*`.

---

## 2. Bloques legacy — estado post-2B

| Bloque | Acción |
|--------|--------|
| Tokens `:root` + light | **Consolidados** (canvas, surface, text, accents, radius, space, z, shadows, brand-gold) |
| v20–v41 hotfixes | Marcados RETIRED — no extender |
| Dock experiments v27–v36 | **Purgados**; conservado `mobileTopMenu` + topbar compacto |
| Drawer v37/v38 `.mobileNavSheet` | **Stub hide** (0 DOM dual-class) |
| `:root` mid-file tabbar 78px | **Eliminado / locked a 0** |
| Superseded dock geometry | **Reemplazado** por kill switch + FAB safe-area |
| Natural scroll + command sheet EOF | **KEEP** (canónico) |
| MTC CSS GUARDRAILS | **Agregado** (comentarios only) |

---

## 3. Por qué quedan ~55 menciones dock

| Tipo | Motivo |
|------|--------|
| Kill switches | Defensa si markup legacy reaparece |
| `.mobileNav:not(.mobileBottomNav):not(.mobileNavDock)` | Exclusiones del pill legacy (no son reglas de dock activo) |
| Comentarios / contratos | Documentación en CSS |

No hay geometría activa de bottom dock ni `--mobile-tabbar-visual-h:78px`.

---

## 4. Contratos que NO se pueden romper

1. Mobile nav = hamburger + `.mobileCommandSheet` (no bottom dock).
2. Mobile scroll = documento natural; no `visualViewport.scroll`; no `body:fixed` salvo overlay.
3. Light canvas = `#F7F8FB`.
4. Una superficie de menú; overlay = scrim only.
5. No nuevos bloques “FINAL SOURCE OF TRUTH” gigantes al EOF.
6. Dashboard / Analytics / Journal / Risk / Checklist sin cambios funcionales.
7. Dorado = brand/accent (`--aurora-brand-gold`), no acción primaria UI.

---

## 5. Pendiente (post-2B)

- Split `paywall.css` / `analytics.css` / `dashboard.css`
- Reducción continua de `!important`
- Unificar `@media (max-width:860px)` fragmentados
- Migrar `.primary` → botones Aurora scoped en JSX
- Floating pill `.mobileNav` mid-file: candidata a stub en sprint siguiente
