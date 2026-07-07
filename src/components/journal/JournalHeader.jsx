import { Plus, Shield } from 'lucide-react';

export function JournalHeader({ showMobileFab, onNewTrade, guard }) {
  return (
    <>
      {showMobileFab && (
        <button className="mobileNewTradeFab journalPrimaryCta" onClick={onNewTrade}>
          <Plus size={18} />Nuevo trade
        </button>
      )}
      {guard.blocked && (
        <div className="riskAlert">
          <Shield size={20} />
          <div>
            <b>Modo reflexión activo</b>
            <p>{guard.reasons.join(' · ')}. Este bloqueo se calcula por jornada operativa New York y se reinicia al rollover 17:00 NY. Ajustá límites en Riesgo si corresponde.</p>
          </div>
        </div>
      )}
    </>
  );
}
