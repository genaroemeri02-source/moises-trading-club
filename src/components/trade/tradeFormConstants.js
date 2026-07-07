export const checklistBase = ['Contexto claro', 'Sesión válida', 'Tomó liquidez', 'Confirmación estructural', 'RR válido', 'Sigo el plan', 'Neutralidad emocional', 'Entrada A/A+'];
export const emotionBeforeOptions = ['Calmo', 'Ansioso', 'Apurado', 'Eufórico', 'Frustrado', 'Neutral'];
export const executionBehaviorOptions = ['Seguí el plan', 'Dudé antes de entrar', 'Entré tarde', 'Me anticipé', 'Moví el stop', 'Cerré antes de tiempo', 'Sobreoperé', 'Respeté el riesgo', 'Operé por impulso'];
export const postTradeBehaviorOptions = ['Buena ejecución', 'Ejecución mejorable', 'Rompí reglas', 'Aprendizaje claro'];
export const traderReviewScores = [
  ['calidadTesis', 'Calidad de la tesis', '¿La operación nació de una narrativa clara de mercado?'],
  ['calidadEjecucion', 'Calidad de ejecución', '¿Entré, gestioné y salí según el plan?'],
  ['calidadComportamiento', 'Calidad de comportamiento', '¿Actué como trader profesional o desde impulso/emoción?'],
  ['calidadRevision', 'Calidad de revisión', '¿La operación dejó aprendizaje útil para mejorar?']
];
export const respetoProcesoOptions = ['Completo', 'Parcial', 'No respetado'];
export const estadoMentalOptions = ['Calmo', 'Ansioso', 'Impulsivo', 'Neutral', 'Cansado', 'Enfocado'];
export const motivoOperacionOptions = ['Ventaja clara', 'Duda', 'Impulso', 'FOMO', 'Revancha', 'Aburrimiento'];
export const alineacionContextualOptions = ['A favor', 'En contra', 'Mixto', 'No claro'];
export const siParcialNoOptions = ['Sí', 'Parcial', 'No'];
export const dxyConfirmaOptions = ['Sí', 'Parcial', 'No', 'No aplica'];
export const moisesPatterns = ['Método Estructural: ChoCH en M1', 'Método Volumen × Desplazamiento', 'Envolvente', 'Estrella de la Mañana / Noche', 'Hombro Cabeza Hombro', 'HCH Invertido', 'Secuencia de 3 Velas'];
export const moisesConfluences = ['7 Mandamientos validados', 'Liquidity Sweep', 'ChoCH', 'OB de confirmación', 'FVG institucional / Vacío', 'Vacío + EMA', 'Subasta completada', 'Toma de liquidez interna', 'Sesión válida', 'RR mínimo 1:2', 'Confirmación estructural', 'Volumen institucional', 'Desplazamiento 50%+', 'Retest limpio', 'Distancia M15→M1 válida'];
export const tradeResultOptions = ['Profit', 'Stop', 'BE', 'Invalidada', 'No ejecutada'];
export const tradeSessionOptions = ['Asia', 'Londres', 'NY', 'Post NY', 'Otra'];
export const mentorReviewFocusOptions = ['general', 'entrada', 'timing', 'gestión', 'contexto', 'ejecución', 'psicología'];
export const tradeQualityOptions = ['A+', 'A', 'B', 'C', 'Impulsivo'];
export const quickEmojis = ['🔥', '✅', '📈', '📉', '🧠', '💡', '🎯', '🚀', '🙏', '😅', '😬', '👏', '⚠️', '💪', '👑', '🫡'];

export function mentorStatusLabel(status) {
  return ({ pending: 'Pendiente de revisión', in_review: 'En revisión', reviewed: 'Revisado', approved: 'Aprobado', needs_work: 'Requiere corrección' })[status] || 'Pendiente de revisión';
}
