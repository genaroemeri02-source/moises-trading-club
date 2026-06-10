import './HeroSection.css';

const navLinks = ['Producto', 'Soluciones', 'Pricing', 'Recursos'];

const stats = [
  { value: '30+', label: 'Traders activos' },
  { value: 'The5ers', label: 'Partnership oficial' },
  { value: '3x', label: 'Más rápido detectás tu edge' },
  { value: 'A+', label: 'Score de disciplina' },
];

const heatmapCells = [
  'soft', 'mid', 'soft', 'hot', 'mid', 'soft', 'soft',
  'mid', 'hot', 'hot', 'hot', 'soft', 'mid', 'soft',
  'soft', 'mid', 'hot', 'mid', 'hot', 'hot', 'mid',
  'soft', 'soft', 'mid', 'hot', 'mid', 'soft', 'mid',
];

function HeroSection() {
  return (
    <section className="mtcHero">
      <nav className="mtcHeroNav">
        <a className="mtcHeroBrand" href="/">
          <span className="mtcHeroBrandMark">M</span>
          <span>
            <strong>Moisés Trading Club</strong>
            <small>Private Trading Ecosystem</small>
          </span>
        </a>

        <div className="mtcHeroLinks">
          {navLinks.map((item) => (
            <a href={`#${item.toLowerCase()}`} key={item}>
              {item}
            </a>
          ))}
        </div>

        <div className="mtcHeroActions">
          <a className="mtcHeroLogin" href="/login">
            Iniciar sesión
          </a>
          <a className="mtcHeroCta" href="/register">
            Crear cuenta
          </a>
        </div>
      </nav>

      <div className="mtcHeroGrid">
        <div className="mtcHeroCopy">
          <div className="mtcHeroEyebrow">
            <span />
            Centro operativo para traders disciplinados
          </div>

          <h1>
            Operá con estructura. Corregí con evidencia. Evolucioná con sistema.
          </h1>

          <p>
            Journal profesional, checklist, analytics y comunidad privada para traders
            discrecionales que quieren resultados reales.
          </p>

          <div className="mtcHeroButtons">
            <a className="mtcHeroPrimary" href="/register">
              Crear cuenta
            </a>
            <a className="mtcHeroSecondary" href="/login">
              Iniciar sesión
            </a>
            <a className="mtcHeroGhost" href="#demo">
              Ver demo
            </a>
          </div>

          <small className="mtcHeroMicrocopy">
            Sin tarjeta de crédito. Cancelá cuando quieras.
          </small>

          <div className="mtcHeroProof">
            <span>Journal operativo</span>
            <span>Risk Guard diario</span>
            <span>Analytics accionables</span>
          </div>
        </div>

        <div className="mtcProductVisual" aria-label="MTC product preview">
          <div className="mtcFloatCard mtcFloatCardTop">
            <span>Setup detectado</span>
            <strong>Pullback institucional</strong>
            <small>Score operativo: A+</small>
          </div>

          <div className="mtcFloatCard mtcFloatCardBottom">
            <span>Riesgo validado</span>
            <strong>0.5% permitido</strong>
            <small>Checklist completo</small>
          </div>

          <div className="mtcProductShell">
            <div className="mtcProductTopbar">
              <div>
                <i />
                <i />
                <i />
              </div>
              <span>Dashboard operativo</span>
              <strong>En vivo</strong>
            </div>

            <div className="mtcMetricRow">
              <div>
                <span>Winrate</span>
                <strong>67.4%</strong>
              </div>
              <div>
                <span>Profit Factor</span>
                <strong>2.31</strong>
              </div>
              <div>
                <span>Disciplina</span>
                <strong>A+</strong>
              </div>
            </div>

            <div className="mtcEquityPanel">
              <div className="mtcPanelHead">
                <span>Equity curve</span>
                <strong>Últimos 30 días</strong>
              </div>

              <svg className="mtcEquitySvg" viewBox="0 0 520 210" role="img" aria-label="Equity curve preview">
                <defs>
                  <linearGradient id="mtcHeroLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#C9A84C" />
                    <stop offset="55%" stopColor="#E6C86B" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                  <linearGradient id="mtcHeroArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
                  </linearGradient>
                </defs>

                <path
                  className="mtcEquityArea"
                  d="M18 162 C58 146 82 150 118 128 C154 105 181 118 218 88 C255 58 284 74 318 54 C358 31 394 45 430 29 C466 13 492 21 508 15 L508 196 L18 196 Z"
                />

                <path
                  className="mtcEquityLine"
                  d="M18 162 C58 146 82 150 118 128 C154 105 181 118 218 88 C255 58 284 74 318 54 C358 31 394 45 430 29 C466 13 492 21 508 15"
                />

                <circle className="mtcEquityDot" cx="508" cy="15" r="6" />
              </svg>
            </div>

            <div className="mtcHeatmapPanel">
              <div className="mtcPanelHead">
                <span>Heatmap horario</span>
                <strong>Sesiones más limpias</strong>
              </div>

              <div className="mtcHeatmap">
                {heatmapCells.map((level, index) => (
                  <span className={`mtcHeatCell ${level}`} key={`${level}-${index}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mtcHeroStats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HeroSection;
