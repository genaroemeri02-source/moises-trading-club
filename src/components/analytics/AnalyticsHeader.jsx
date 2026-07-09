import { BarChart3 } from 'lucide-react';
import {
  getTopBarSampleState,
  formatAnalyticsAccountLabel,
  formatAnalyticsDateRange
} from '../../lib/analyticsUtils.js';

export function AnalyticsHeader({
  tradeCount = 0,
  activeAccount = '__all__',
  dateFrom = '',
  dateTo = ''
}) {
  const sample = getTopBarSampleState(tradeCount);
  const accountLabel = formatAnalyticsAccountLabel(activeAccount);
  const rangeLabel = formatAnalyticsDateRange(dateFrom, dateTo);

  return (
    <header className="analyticsPageHead">
      <div className="analyticsTopBar">
        <div className="analyticsTopBarMain">
          <span className="analyticsTopBarBrand">
            <BarChart3 size={14} />
            Analytics
          </span>
          <span className="analyticsTopBarDivider" aria-hidden="true" />
          <span className="analyticsTopBarCount">
            {tradeCount} trade{tradeCount === 1 ? '' : 's'} evaluable{tradeCount === 1 ? '' : 's'}
          </span>
        </div>
        <div className="analyticsTopBarMeta analyticsTopBarMetaRail">
          <span className="analyticsTopBarChip">
            <em>Cuenta</em>
            <b>{accountLabel}</b>
          </span>
          {rangeLabel && (
            <span className="analyticsTopBarChip">
              <em>Rango</em>
              <b>{rangeLabel}</b>
            </span>
          )}
          <span className="analyticsTopBarChip">
            <em>Muestra</em>
            <b>{tradeCount} trade{tradeCount === 1 ? '' : 's'}</b>
          </span>
          <span className={`analyticsTopBarChip analyticsTopBarReliability ${sample.tone}`}>
            <em>Confiabilidad</em>
            <b>{sample.label}</b>
          </span>
        </div>
      </div>
    </header>
  );
}
