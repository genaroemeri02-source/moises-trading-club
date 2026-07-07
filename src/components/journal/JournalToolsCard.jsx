import { Download, Share2, Upload } from 'lucide-react';
import { Card } from '../ui/Card.jsx';

export function JournalToolsCard({
  exportDisabled,
  filteredExportDisabled,
  listTrades,
  onExportAll,
  onExportFiltered,
  onShareDay,
  onImportCsv,
}) {
  return (
    <Card title="Herramientas" className="journalToolsCard" sub="Exportar, importar y compartir datos del journal">
      <div className="journalToolsGrid">
        <button className="ghost compact journalToolBtn" disabled={exportDisabled} onClick={() => onExportAll('json')}>
          <Download size={15} /><span className="journalToolLong">Exportar todos JSON</span><span className="journalToolShort">Todos JSON</span>
        </button>
        <button className="ghost compact journalToolBtn" disabled={exportDisabled} onClick={() => onExportAll('csv')}>
          <Download size={15} /><span className="journalToolLong">Exportar todos CSV</span><span className="journalToolShort">Todos CSV</span>
        </button>
        <button className="ghost compact journalToolBtn" disabled={filteredExportDisabled} onClick={() => onExportFiltered('json')}>
          <Download size={15} /><span className="journalToolLong">Exportar filtrados JSON</span><span className="journalToolShort">Filtrados JSON</span>
        </button>
        <button className="ghost compact journalToolBtn" disabled={filteredExportDisabled} onClick={() => onExportFiltered('csv')}>
          <Download size={15} /><span className="journalToolLong">Exportar filtrados CSV</span><span className="journalToolShort">Filtrados CSV</span>
        </button>
        <button className="ghost compact shareReviewButton journalToolBtn journalToolWide" disabled={!listTrades.length} onClick={onShareDay}>
          <Share2 size={15} /><span className="journalToolLong">Compartir resumen del día</span><span className="journalToolShort">Compartir día</span>
        </button>
        <label className="ghost file journalToolBtn journalToolImport">
          <Upload /><span className="journalToolLong">Importar CSV</span><span className="journalToolShort">Importar</span>
          <input type="file" accept=".csv" onChange={onImportCsv} />
        </label>
      </div>
    </Card>
  );
}
