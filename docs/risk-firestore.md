# Risk Settings → Firestore (Sprint 11)

## Path

`users/{uid}/riskSettings/{accountId|default}`

## Load order

1. Firestore (si hay `db` + `uid`)
2. localStorage (`mtc-risk-settings` / `mtc-risk-settings:{accountId}`)
3. Defaults (`RISK_SETTINGS_DEFAULTS`)

## Save order

1. localStorage (siempre, cache)
2. Firestore (si hay user)

## Consumers

- Risk Lab — load/save
- Dashboard Cockpit / `buildOperationalState` — read via `useRiskSettings`
- Journal risk guard — read via `useRiskSettings`

Ver sección **Sprint 11** en `ARCHITECTURE.md`.
