import { Plus, Search } from 'lucide-react';
import { Card } from '../ui/Card.jsx';

const CHECKLIST_FILTER_OPTIONS = [
  'Todos',
  'Con checklist',
  'Sin checklist',
  'Con luz verde',
  'Sin luz verde',
  'Setups A+',
  'Ejecutados sin checklist completo',
];

export function JournalActions({
  accountSwitcher,
  onNewTrade,
  checklistFilter,
  onChecklistFilterChange,
  search,
  onSearchChange,
}) {
  return (
    <Card title="Acciones rápidas" className="journalOpsCard" sub="Cuenta activa, filtros y búsqueda">
      <div className="row journalQuickActions journalOpsRow">
        {accountSwitcher}
        <button className="primary journalDesktopNewTrade" onClick={onNewTrade}><Plus />Nuevo trade</button>
        <select
          className="input small journalFilterSelect"
          value={checklistFilter}
          onChange={(e) => onChecklistFilterChange(e.target.value)}
        >
          {CHECKLIST_FILTER_OPTIONS.map((x) => <option key={x}>{x}</option>)}
        </select>
        <div className="search journalSearch">
          <Search size={16} />
          <input
            placeholder="Buscar por activo, setup, patrón o nota"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </Card>
  );
}
