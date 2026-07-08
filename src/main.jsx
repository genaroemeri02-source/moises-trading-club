import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, updateProfile, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, onSnapshot, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Home, BookOpen, BarChart3, LineChart, Users, Lightbulb, Trophy, Shield, Bell, Settings, Plus, Trash2, Download, Upload, Search, LogOut, CheckCircle2, Lock, PlayCircle, FileText, Heart, MessageCircle, Bookmark, Menu, X, Megaphone, Edit3, Sparkles, Crown, Newspaper, ExternalLink, Camera, Image as ImageIcon, Copy, ChevronDown, ChevronRight, SlidersHorizontal, CalendarDays, Clock3, Flame, Medal, Activity, TrendingUp, Target, XCircle, AlertTriangle, Info, Rocket } from 'lucide-react';
import './styles.css';
import {
  money,
  formatMoneyCompactCard, formatMoneyClean, formatPercentCard, formatMetricCard, formatR,
  formatCalendarMoney, formatCalendarR, formatCalendarPct, pct,
} from './lib/formatUtils.js';
import {
  today, nyParts, nyISO, tradingDayKey, formatDateLabel,
  normalizeDateKey, getTradeOperationalDateKey, monthKey, daysInMonth,
  resetCountdown, weekStartISO, safeDate
} from './lib/dateUtils.js';
import {
  toNumberSafe, normalizeNumInput, parseLimitMoney,
  safeArray, normalizeTradeArrayFields,
  normalizeImportedTradeRow, parseCsv,
  normalizeTradeSetup, tradeDayKey, isClosedEvaluableTrade, accountName,
  sanitizeFirestoreObject, normalizedAccounts
} from './lib/tradeUtils.js';
import {
  behaviorScoreFromTrade, behaviorScoreLabel,
  calendarDayR, calendarDayPct, calendarToneFromTotal,
  groupTradesByDay, buildTradingCalendarWeeks, calc, insights,
  getTradesForDate
} from './lib/analyticsUtils.js';
import {
  normalizeTradeForExport, flattenTradeForCsv,
  exportToJson, exportToCsv,
  buildTradeExportFilename, buildTradesExportFilename
} from './lib/importExportUtils.js';
import { Card } from './components/ui/Card.jsx';
import { DashboardHero } from './components/dashboard/DashboardHero.jsx';
import { DashboardKpiStrip } from './components/dashboard/DashboardKpiStrip.jsx';
import { CalendarHeatmapPreview, TradingMonthCalendar } from './components/dashboard/TradingCalendarPanel.jsx';
import { DashboardRightRail } from './components/dashboard/DashboardRightRail.jsx';
import { DashboardAdvancedInsights } from './components/dashboard/DashboardAdvancedInsights.jsx';
import { ResetTicker } from './components/dashboard/ResetTicker.jsx';
import { clampScore, buildDailyNetCurve, buildOperationalHeatmap, sessionNameNY, tradeSortTime } from './components/dashboard/dashboardUtils.js';
import { JournalHeader } from './components/journal/JournalHeader.jsx';
import { JournalActions } from './components/journal/JournalActions.jsx';
import { JournalMainGrid } from './components/journal/JournalMainGrid.jsx';
import { JournalToolsCard } from './components/journal/JournalToolsCard.jsx';
import { TradeForm } from './components/trade/TradeForm.jsx';
import { TradeDetailModal } from './components/trade/TradeDetailModal.jsx';
import { TradeShareModal } from './components/share/TradeShareModal.jsx';
import { DailyReviewShareModal } from './components/share/DailyReviewShareModal.jsx';
import { mentorStatusLabel } from './components/trade/tradeFormConstants.js';
import { AnalyticsPage } from './components/analytics/AnalyticsPage.jsx';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const ADMIN_EMAILS = String(import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);

const uid=()=>crypto.randomUUID?.()||String(Date.now()+Math.random());
async function copyText(text,label='Copiado'){try{await navigator.clipboard.writeText(String(text||'')); toast(label);}catch(e){toast('No se pudo copiar');}}
const avatarOptions=[
 {id:'trader-m',gender:'masculino',label:'Trader institucional',emoji:'👨‍💻',bg:'gold'},
 {id:'trader-f',gender:'femenino',label:'Trader institucional',emoji:'👩‍💻',bg:'gold'},
 {id:'chart-m',gender:'masculino',label:'Analista de gráficos',emoji:'📈',bg:'blue'},
 {id:'chart-f',gender:'femenino',label:'Analista de gráficos',emoji:'📊',bg:'violet'},
 {id:'mentor-m',gender:'masculino',label:'Mentor',emoji:'🧔‍♂️',bg:'green'},
 {id:'mentor-f',gender:'femenino',label:'Mentora',emoji:'👩‍🏫',bg:'cyan'},
 {id:'scalper-m',gender:'masculino',label:'Scalper',emoji:'⚡',bg:'blue'},
 {id:'scalper-f',gender:'femenino',label:'Scalper',emoji:'⚡',bg:'violet'},
 {id:'swing-m',gender:'masculino',label:'Swing trader',emoji:'🧠',bg:'green'},
 {id:'swing-f',gender:'femenino',label:'Swing trader',emoji:'💎',bg:'cyan'},
 {id:'queen',gender:'femenino',label:'Queen trader',emoji:'👑',bg:'gold'},
 {id:'psych-f',gender:'femenino',label:'Psicología del trader',emoji:'🪷',bg:'violet'},
 {id:'gold',gender:'neutral',label:'XAUUSD',emoji:'🥇',bg:'gold'},
 {id:'risk',gender:'neutral',label:'Gestión de riesgo',emoji:'🛡️',bg:'blue'},
 {id:'discipline',gender:'neutral',label:'Disciplina',emoji:'♟️',bg:'violet'},
 {id:'focus',gender:'neutral',label:'Focus mode',emoji:'🎯',bg:'green'},
 {id:'community',gender:'neutral',label:'Comunidad',emoji:'🤝',bg:'cyan'},
 {id:'moses-crown',gender:'neutral',label:'Moisés Crown',emoji:'👑📈',bg:'gold'},
 {id:'gold-hunter',gender:'neutral',label:'Gold Hunter',emoji:'🦁🥇',bg:'gold'},
 {id:'risk-master',gender:'neutral',label:'Risk Master',emoji:'🛡️⚔️',bg:'blue'},
 {id:'zen-trader',gender:'neutral',label:'Zen Trader',emoji:'🧘📊',bg:'green'},
 {id:'market-queen',gender:'femenino',label:'Market Queen',emoji:'👸📈',bg:'violet'},
 {id:'chart-goddess',gender:'femenino',label:'Chart Goddess',emoji:'💃📊',bg:'cyan'},
 {id:'institutional-king',gender:'masculino',label:'Institutional King',emoji:'🤴📉',bg:'gold'},
 {id:'sniper',gender:'neutral',label:'Sniper Entry',emoji:'🎯⚡',bg:'blue'}
];
const quickEmojis=['🔥','✅','📈','📉','🧠','💡','🎯','🚀','🙏','😅','😬','👏','⚠️','💪','👑','🫡'];
const mandamientos=[
 'Operar en NY o ASIA.',
 'En M15, el precio debe ir hacia una zona de interés: vacío, PDH/PDL, EMA, OB o GAP.',
 'Alejarse del punto de equilibrio del Volume Profile.',
 'En el camino, el precio debe tomar liquidez interna.',
 'Confirmar ChoCH en M1.',
 'Ejecutar en M1 después del ChoCH: vacío, OB, EMA o descuento válido.',
 'Buscar RR mínimo 1:2 con stop detrás de la vela/estructura que confirma la entrada.'
];
const patronesMoises=[
 {title:'Método Estructural: ChoCH en M1',text:'Dentro del vacío de M15 se busca un Cambio de Carácter en M1. Si la distancia desde la mecha al ChoCH es menor a 8 pips, puede ser entrada directa; si es mayor, se espera descuento.'},
 {title:'Método Volumen × Desplazamiento',text:'La vela de M1 a favor del sesgo debe tener volumen igual o mayor que la vela contraria anterior y al menos 50% de cuerpo en dirección del sesgo.'},
 {title:'Envolvente',text:'La vela que genera el ChoCH cubre completamente el cuerpo de la vela anterior. La entrada se evalúa en la siguiente vela tras confirmar el quiebre estructural.'},
 {title:'Estrella de la Mañana / Noche',text:'Secuencia de tres velas muy común en XAUUSD: vela contra el sesgo, doji de indecisión y tercera vela a favor con mayor volumen.'},
 {title:'Hombro Cabeza Hombro',text:'Aparece cuando el mercado acumula tiempo en una zona. Se opera el quiebre decidido de la línea de cuello; normal para ventas, invertido para compras.'},
 {title:'Secuencia de 3 Velas',text:'Cuando el ChoCH está lejos del precio actual, se buscan tres velas consecutivas a favor del sesgo como señal de continuidad.'}
];
const lecturaSeed=[
 {title:'Trading in the Zone',focus:'Mentalidad probabilística',task:'Leer 10-20 minutos y anotar una regla aplicable al próximo trade.'},
 {title:'Diario de errores',focus:'Corrección operativa',task:'Registrar el error más repetido de la semana y su antídoto específico.'},
 {title:'Playbook Moisés',focus:'Modelos propios',task:'Guardar capturas de trades A/A+ y escribir por qué eran válidos.'},
 {title:'Repaso semanal',focus:'Mejora continua',task:'Revisar métricas, peor error, mejor patrón y una decisión para la semana siguiente.'}
];

const courseSeed=[
 {id:'co1',title:'Canal de Moisés Profesional',level:'Intermedio',description:'Estructura, liquidez, ChoCH y ejecución limpia.',modules:[{title:'Base del sistema',lessons:[{id:'l1',title:'Los 7 mandamientos',type:'video',duration:'28 min',locked:false},{id:'l2',title:'Checklist operativa',type:'pdf',duration:'PDF',locked:false}]},{title:'Ejecución',lessons:[{id:'l3',title:'ChoCH M1 y activador',type:'video',duration:'36 min',locked:false},{id:'l4',title:'Gestión del trade',type:'video',duration:'41 min',locked:true}]}]},
 {id:'co2',title:'Psicología y riesgo',level:'Todos',description:'Control emocional, riesgo y consistencia.',modules:[{title:'Disciplina',lessons:[{id:'l5',title:'Evitar sobreoperar',type:'video',duration:'22 min',locked:false}]}]}
];
const settingsDefault={initialBalance:10000,monthlyGoal:8,mainStrategy:'Canal de Moisés',assets:['XAUUSD','NAS100','EURUSD'],accounts:[{id:'main',name:'Cuenta principal',capital:10000,type:'Personal',currency:'USD'}]};
const riskDefaults={maxDailyLoss:300,maxWeeklyLoss:900,maxTradesDay:3,maxDrawdownPct:5,riskPerTradePct:.5,accountCapital:10000};
const instrumentPresets={
  XAUUSD:{label:'Oro / XAUUSD',type:'CFD / Forex',pipSize:.01,pipValuePerLot:1,notes:'1 lote de oro suele mover aprox. $1 por cada 0.01. Ajusta si tu broker difiere.'},
  US30:{label:'US30 / Dow Jones',type:'Índice CFD',pipSize:1,pipValuePerLot:1,notes:'Referencia CFD: $1 por punto por lote. Ajusta según broker.'},
  NAS100:{label:'NAS100',type:'Índice CFD',pipSize:1,pipValuePerLot:1,notes:'Referencia CFD: $1 por punto por lote.'},
  SPX500:{label:'SPX500',type:'Índice CFD',pipSize:1,pipValuePerLot:1,notes:'Ajustable según broker.'},
  EURUSD:{label:'EUR/USD',type:'Forex',pipSize:.0001,pipValuePerLot:10,notes:'Valor estándar aproximado: $10 por pip en 1 lote.'},
  GBPUSD:{label:'GBP/USD',type:'Forex',pipSize:.0001,pipValuePerLot:10,notes:'Valor estándar aproximado: $10 por pip en 1 lote.'},
  USDJPY:{label:'USD/JPY',type:'Forex',pipSize:.01,pipValuePerLot:9.1,notes:'Valor aproximado. Puede variar por cotización y broker.'},
  AUDUSD:{label:'AUD/USD',type:'Forex',pipSize:.0001,pipValuePerLot:10,notes:'Valor estándar aproximado: $10 por pip en 1 lote.'},
  GBPJPY:{label:'GBP/JPY',type:'Forex',pipSize:.01,pipValuePerLot:9.1,notes:'Valor aproximado. Verifica especificación de tu broker.'}
};
function getRiskSettings(){try{return {...riskDefaults,...JSON.parse(localStorage.getItem('mtc-risk-settings')||'{}')}}catch{return riskDefaults}}
function saveRiskSettings(v){localStorage.setItem('mtc-risk-settings',JSON.stringify(v)); window.dispatchEvent(new Event('mtc-risk-settings-updated'));}

function cleanAccountsForSave(settings={}){
  const list=Array.isArray(settings.accounts)?settings.accounts:[];
  const base=list.length?list:[{id:'main',name:'Cuenta principal',capital:Number(settings.initialBalance||10000),type:'Personal',currency:'USD'}];
  return base.map((a,i)=>{
    const name=String(a.name ?? '').trim() || (i===0?'Cuenta principal':`Cuenta ${i+1}`);
    const capital=Number(a.capital||a.initialBalance||0);
    return {id:a.id||`acc_${i}`,name,capital:Number.isFinite(capital)&&capital>0?capital:10000,type:a.type||'Personal',currency:a.currency||'USD'};
  });
}
function prepareTradingSettingsForSave(settings={}){
  const accounts=cleanAccountsForSave(settings);
  const total=accounts.reduce((sum,a)=>sum+Number(a.capital||0),0);
  return {...settings,accounts,initialBalance:total||Number(settings.initialBalance||10000)};
}
function isPrimaryAccount(a={}){const name=String(a.name||'').trim().toLowerCase(); return a.id==='main'||['cuenta principal','principal','main','default'].includes(name)}
function syncPrimaryAccountCapital(settings={},value){
  const capital=Number(value);
  const accounts=normalizedAccounts(settings);
  let primaryFound=false;
  const nextAccounts=accounts.reduce((list,a)=>{
    if(isPrimaryAccount(a)){
      if(primaryFound)return list;
      primaryFound=true;
      return [...list,{...a,id:a.id||'main',name:String(a.name||'').trim()||'Cuenta principal',capital}];
    }
    return [...list,a];
  },[]);
  if(!primaryFound)nextAccounts.unshift({id:'main',name:'Cuenta principal',capital,type:'Personal',currency:'USD'});
  return {...settings,accounts:nextAccounts,initialBalance:nextAccounts.reduce((sum,a)=>sum+Number(a.capital||0),0)||capital};
}
function accountInitial(settings={},active='__all__'){
  const accs=normalizedAccounts(settings);
  if(active==='__all__') return accs.reduce((sum,a)=>sum+Number(a.capital||0),0) || Number(settings.initialBalance||10000);
  return Number(accs.find(a=>a.name===active)?.capital || settings.initialBalance || 10000);
}
function activeAccountNames(settings={}){
  return normalizedAccounts(settings).map(a=>a.name).filter(Boolean);
}
function defaultActiveAccount(settings={}){
  const names=activeAccountNames(settings);
  return names.length===1?names[0]:'__all__';
}
function filterTradesByActiveAccounts(trades=[],settings={}){
  const names=activeAccountNames(settings);
  if(!names.length)return trades||[];
  const allowed=new Set(names);
  return (trades||[]).filter(t=>allowed.has(accountName(t)));
}
function useAccountFilter(trades=[],settings={}){
  const initial=()=>localStorage.getItem('mtc-active-account')||defaultActiveAccount(settings);
  const [active,setActive]=useState(initial);
  const accountOptions=useMemo(()=>activeAccountNames(settings).sort(), [settings?.accounts,settings?.initialBalance]);
  const accounts=useMemo(()=>accountOptions.length>1?['__all__',...accountOptions]:accountOptions, [accountOptions]);
  const effectiveActive=accounts.includes(active)?active:(accountOptions.length===1?accountOptions[0]:'__all__');
  useEffect(()=>{
    const nextDefault=accountOptions.length===1?accountOptions[0]:'__all__';
    if(!accounts.includes(active)) setActive(nextDefault);
  },[accounts.join('|'),active]);
  useEffect(()=>{localStorage.setItem('mtc-active-account',effectiveActive)},[effectiveActive]);
  const filtered=useMemo(()=>{
    const activeTrades=filterTradesByActiveAccounts(trades,settings);
    return effectiveActive==='__all__'?activeTrades:activeTrades.filter(t=>accountName(t)===effectiveActive);
  },[trades,settings?.accounts,settings?.initialBalance,effectiveActive]);
  return {active:effectiveActive,setActive,accounts,filtered};
}
function AccountSwitcher({active,setActive,accounts=[]}){return <div className="accountSwitcher"><span>Cuenta</span><select className="input small" value={active} onChange={e=>setActive(e.target.value)}>{accounts.map(a=><option key={a} value={a}>{a==='__all__'?'Todas las cuentas':a}</option>)}</select></div>}
function AccountManager({settings,onChange}){
  const accounts=Array.isArray(settings.accounts)&&settings.accounts.length?settings.accounts:normalizedAccounts(settings);
  const totalCapital=list=>list.reduce((sum,a)=>sum+Number(a.capital||0),0)||10000;
  const upd=(i,patch)=>{const next=accounts.map((a,idx)=>idx===i?{...a,...patch}:a); onChange({...settings,accounts:next,initialBalance:totalCapital(next)});};
  const add=()=>{const next=[...accounts,{id:uid(),name:`Cuenta ${accounts.length+1}`,capital:10000,type:'Challenge',currency:'USD'}]; onChange({...settings,accounts:next,initialBalance:totalCapital(next)});};
  const del=i=>{const next=accounts.filter((_,idx)=>idx!==i); onChange({...settings,accounts:next,initialBalance:totalCapital(next)});};
  return <div className="accountManager"><div className="accountManagerHead"><div><b>Cuentas / challenges</b><small>Configura el capital de cada cuenta para que Dashboard y Analytics calculen métricas correctas.</small></div><button type="button" className="primary compact" onClick={add}><Plus size={14}/>Agregar cuenta</button></div>{accounts.map((a,i)=><div className="accountEditRow" key={a.id||i}><input className="input" value={a.name||''} onChange={e=>upd(i,{name:e.target.value})} placeholder="Nombre de cuenta"/><input className="input" type="number" value={a.capital??''} onChange={e=>upd(i,{capital:Number(e.target.value)})} placeholder="Capital"/><select className="input" value={a.type||'Personal'} onChange={e=>upd(i,{type:e.target.value})}><option>Personal</option><option>Challenge</option><option>Fondeada</option><option>Demo</option></select><button type="button" className="ghost danger compact" onClick={()=>del(i)}><Trash2 size={14}/></button></div>)}</div>}
function evaluateRiskGuard(trades=[],settings=getRiskSettings(),initial=10000,dailyPlan=null){
  const todayStr=tradingDayKey(), weekStart=weekStartISO();
  const todayTrades=trades.filter(t=>getTradeOperationalDateKey(t)===todayStr);
  const weekTrades=trades.filter(t=>{const d=getTradeOperationalDateKey(t); return d&&d>=weekStart;});
  const previousPnL=trades.filter(t=>{const d=getTradeOperationalDateKey(t); return d&&d<todayStr;}).reduce((a,t)=>a+toNumberSafe(t.resultMoney),0);
  const dayStartEquity=Number(initial||0)+previousPnL;
  const dailyPnL=todayTrades.reduce((a,t)=>a+toNumberSafe(t.resultMoney),0);
  const weeklyPnL=weekTrades.reduce((a,t)=>a+toNumberSafe(t.resultMoney),0);
  const dayStats=calc(todayTrades,dayStartEquity||initial);
  const reasons=[];
  if(settings.maxTradesDay>0 && todayTrades.length>=settings.maxTradesDay) reasons.push(`Máximo de trades diarios alcanzado: ${todayTrades.length}/${settings.maxTradesDay}`);
  if(settings.maxDailyLoss>0 && dailyPnL<=-Math.abs(settings.maxDailyLoss)) reasons.push(`Hard stop diario alcanzado: ${money(dailyPnL)}`);
  const planRisk=parseLimitMoney(dailyPlan?.maxRisk);
  if(planRisk>0 && dailyPnL<=-planRisk) reasons.push(`Riesgo máximo del plan diario cumplido: ${money(dailyPnL)} / -${money(planRisk)}`);
  if(settings.maxWeeklyLoss>0 && weeklyPnL<=-Math.abs(settings.maxWeeklyLoss)) reasons.push(`Límite semanal alcanzado: ${money(weeklyPnL)}`);
  // El drawdown del modo reflexión se evalúa por jornada operativa NY. Se reinicia en el rollover 17:00 ET.
  if(settings.maxDrawdownPct>0 && dayStats.maxDD>=settings.maxDrawdownPct) reasons.push(`Drawdown diario alcanzado: ${pct(dayStats.maxDD)}`);
  return {blocked:reasons.length>0,reasons,todayTrades,weekTrades,dailyPnL,weeklyPnL,drawdownPct:dayStats.maxDD,settings,todayStr,dayStartEquity};
}


function InsightGrid({items}){return <div className="insightGrid">{items.map((x,i)=><div className={`insightPro ${x.tone||'neutral'}`} key={i}><div><span>{x.label}</span><strong>{x.value}</strong></div><p>{x.text}</p></div>)}</div>}
function TraderStats({s}){const rows=[['Trades',formatMetricCard(s.count)],['Ganados / Perdidos',`${formatMetricCard(s.wins)}W / ${formatMetricCard(s.losses)}L`],['Sesgo más rentable',s.count?`${s.bestBias.name} · ${formatMoneyClean(s.bestBias.value)}`:'—'],['Ganancia bruta',formatMoneyClean(s.grossProfit)],['Pérdida bruta',formatMoneyClean(s.grossLoss)],['Ganancia prom.',formatMoneyClean(s.avgWin)],['Pérdida prom.',formatMoneyClean(s.avgLoss)],['Ratio G/P',s.payoffRatio?s.payoffRatio.toFixed(2):'0.00'],['Factor de recuperación',s.recovery?s.recovery.toFixed(2):'0.00'],['Media R',`${s.meanR.toFixed(2)}R`],['Volatilidad R',`${s.stdR.toFixed(2)}R`]];return <div className="statMatrix">{rows.map(([a,b])=><div key={a}><span>{a}</span><b>{b}</b></div>)}</div>}
function exportSingleTrade(trade,format){
  try{
    if(format==='json')exportToJson({exportMeta:{app:'MTC Analytics',exportedAt:new Date().toISOString(),version:'1.0',scope:'single_trade'},trade:normalizeTradeForExport(trade)},buildTradeExportFilename(trade,'json'));
    else exportToCsv([flattenTradeForCsv(trade)],buildTradeExportFilename(trade,'csv'));
    toast(`Trade exportado en ${format.toUpperCase()}`);
  }catch(e){console.error('trade_export_failed',e?.message||e); toast('No se pudo exportar el trade','error')}
}
function exportTradesCollection(trades,format,scope='all'){
  try{
    const rows=trades||[];
    if(!rows.length){toast('No hay trades para exportar','error'); return;}
    if(format==='json')exportToJson({exportMeta:{app:'MTC Analytics',exportedAt:new Date().toISOString(),version:'1.0',totalTrades:rows.length,scope},trades:rows.map(normalizeTradeForExport)},buildTradesExportFilename('json'));
    else exportToCsv(rows.map(flattenTradeForCsv),buildTradesExportFilename('csv'));
    toast(`${rows.length} trade${rows.length===1?'':'s'} exportado${rows.length===1?'':'s'} en ${format.toUpperCase()}`);
  }catch(e){console.error('trades_export_failed',e?.message||e); toast('No se pudieron exportar los trades','error')}
}

function tradeOwnerId(t={}){return t.userId || t.uid || t.ownerId || t.authorId || '';}
async function unlinkChecklistFromTradeIfNeeded(trade){
  if(!trade?.checklistId) return;
  try{
    const checklistRef=doc(db,'checklists',trade.checklistId);
    const snap=await getDoc(checklistRef);
    if(snap.exists() && (snap.data()?.linkedTradeId === trade.id || !snap.data()?.linkedTradeId)){
      await setDoc(checklistRef,{linkedTradeId:'',tradeDeleted:true,tradeDeletedAt:serverTimestamp()},{merge:true});
    }
  }catch(e){console.warn('deleteTrade:checklistUnlinkSkipped', e?.code || e?.message || e);}
}
async function deleteTradeSafely(trade){
  const t=typeof trade==='string'?{id:trade}:trade;
  if(!t?.id) return toast('No se pudo eliminar el trade: ID inválido.','error');
  if(!confirm('¿Eliminar trade?\n\nEsta acción eliminará el trade de tu Journal. Si estaba vinculado a un Checklist, la validación no se eliminará.')) return;
  console.info('deleteTrade:start', t.id);
  try{
    await deleteDoc(doc(db,'trades',t.id));
    await unlinkChecklistFromTradeIfNeeded(t);
    console.info('deleteTrade:success', t.id);
    toast('Trade eliminado');
  }catch(e){
    console.error('deleteTrade:error', e);
    toast('No se pudo eliminar el trade.','error');
  }
}
function notificationMatchesTarget(n,target){
  const t=String(target||'');
  if(!t) return false;
  const variants={announcements:['announcement','announcements'],ideas:['idea','ideas'],academy:['academy'],community:['community'],chat:['chat'],results:['result','results'],coach:['coach'],notifications:['notification','notifications']};
  const keys=variants[t]||[t];
  return keys.includes(n.target||'') || keys.includes(n.type||'');
}
async function markNotificationAsRead(notificationId){
  if(!notificationId) return;
  console.info('markNotificationRead:start', notificationId);
  try{
    await updateDoc(doc(db,'notifications',notificationId),{read:true,readAt:serverTimestamp()});
    console.info('markNotificationRead:success', notificationId);
  }catch(e){console.error('markNotificationRead:error', e); toast('No se pudo marcar la notificación como leída.','error');}
}
async function markNotificationsForTarget(notifications=[],target){
  const pending=(notifications||[]).filter(n=>!n.read && notificationMatchesTarget(n,target));
  if(!pending.length) return;
  await Promise.allSettled(pending.map(n=>markNotificationAsRead(n.id)));
}

function useLiveData(profile){
  const [data,setData]=useState({
    trades:[],posts:[],ideas:[],books:[],academyLessons:[],dailyPlans:[],emotionalJournals:[],checklists:[],brokerConnections:[],notifications:[],messages:[],resultPosts:[],users:[],courses:courseSeed,settings:settingsDefault,loading:true
  });

  useEffect(()=>{
    if(!profile) return;

    const off=[];
    const userId=profile.uid;
    const isAdmin=['admin','moderador'].includes(profile.role);

    off.push(onSnapshot(
      isAdmin ? collection(db,'trades') : query(collection(db,'trades'),where('userId','==',userId)),
      snap=>setData(d=>({...d,trades:snap.docs.map(x=>({id:x.id,...x.data()}))}))
    ));

    off.push(onSnapshot(
      query(collection(db,'posts'),orderBy('createdAt','desc')),
      snap=>setData(d=>({...d,posts:snap.docs.map(x=>({id:x.id,...x.data()}))}))
    ));

    off.push(onSnapshot(
      query(collection(db,'ideas'),orderBy('createdAt','desc')),
      snap=>setData(d=>({...d,ideas:snap.docs.map(x=>({id:x.id,...x.data()}))}))
    ));

    off.push(onSnapshot(
      collection(db,'books'),
      snap=>setData(d=>({...d,books:snap.docs.map(x=>({id:x.id,...x.data()})).sort((a,b)=>String(b.createdDate||safeDate(b.createdAt)||'').localeCompare(String(a.createdDate||safeDate(a.createdAt)||'')))}))
    ));

    off.push(onSnapshot(
      query(collection(db,'academyLessons'),orderBy('createdAt','desc')),
      snap=>setData(d=>({...d,academyLessons:snap.docs.map(x=>({id:x.id,...x.data()}))}))
    ));

    off.push(onSnapshot(
      query(collection(db,'notifications'),where('userId','==',userId)),
      snap=>setData(d=>({...d,notifications:snap.docs.map(x=>({id:x.id,...x.data()}))}))
    ));

    off.push(onSnapshot(
      query(collection(db,'messages'),where('participants','array-contains',userId)),
      snap=>setData(d=>({...d,messages:snap.docs.map(x=>({id:x.id,...x.data()}))})),
      err=>{console.warn('messages listener blocked',err?.message); setData(d=>({...d,messages:[]}));}
    ));

    off.push(onSnapshot(
      query(collection(db,'resultPosts'),orderBy('createdAt','desc')),
      snap=>setData(d=>({...d,resultPosts:snap.docs.map(x=>({id:x.id,...x.data()}))})),
      err=>{console.warn('resultPosts listener blocked',err?.message); setData(d=>({...d,resultPosts:[]}));}
    ));

    off.push(onSnapshot(
      doc(db,'settings',userId),
      snap=>setData(d=>({...d,settings:snap.exists()?{...settingsDefault,...snap.data()}:settingsDefault}))
    ));

    off.push(onSnapshot(
      query(collection(db,'dailyPlans'),where('userId','==',userId)),
      snap=>setData(d=>({...d,dailyPlans:snap.docs.map(x=>({id:x.id,...x.data()}))})),
      err=>{console.warn('dailyPlans listener blocked',err?.message); setData(d=>({...d,dailyPlans:[]}));}
    ));

    off.push(onSnapshot(
      query(collection(db,'emotionalJournals'),where('userId','==',userId)),
      snap=>setData(d=>({...d,emotionalJournals:snap.docs.map(x=>({id:x.id,...x.data()})).sort((a,b)=>String(b.date||safeDate(b.createdAt)||'').localeCompare(String(a.date||safeDate(a.createdAt)||'')))})),
      err=>{console.warn('emotionalJournals listener blocked',err?.message); setData(d=>({...d,emotionalJournals:[]}));}
    ));


    off.push(onSnapshot(
      query(collection(db,'brokerConnections'),where('userId','==',userId)),
      snap=>setData(d=>({...d,brokerConnections:snap.docs.map(x=>({id:x.id,...x.data()})).sort((a,b)=>String(b.updatedAt?.toDate?.()?.toISOString?.()||b.createdAt?.toDate?.()?.toISOString?.()||'').localeCompare(String(a.updatedAt?.toDate?.()?.toISOString?.()||a.createdAt?.toDate?.()?.toISOString?.()||'')))})),
      err=>{console.warn('brokerConnections listener blocked',err?.message); setData(d=>({...d,brokerConnections:[]}));}
    ));

    off.push(onSnapshot(
      isAdmin ? collection(db,'checklists') : query(collection(db,'checklists'),where('userId','==',userId)),
      snap=>setData(d=>({...d,checklists:snap.docs.map(x=>({id:x.id,...x.data()})).sort((a,b)=>String(b.createdDate||safeDate(b.createdAt)||'').localeCompare(String(a.createdDate||safeDate(a.createdAt)||'')))})),
      err=>{console.warn('checklists listener blocked',err?.message); setData(d=>({...d,checklists:[]}));}
    ));

    if(isAdmin){
      off.push(onSnapshot(
        collection(db,'users'),
        snap=>setData(d=>({...d,users:snap.docs.map(x=>({uid:x.id,...x.data()}))}))
      ));
    } else {
      off.push(onSnapshot(
        query(collection(db,'users'),where('status','==','approved')),
        snap=>setData(d=>({...d,users:snap.docs.map(x=>({uid:x.id,...x.data()}))})),
        err=>{console.warn('users listener blocked',err?.message); setData(d=>({...d,users:[profile]}));}
      ));
    }

    setData(d=>({...d,loading:false}));
    return ()=>off.forEach(f=>f&&f());
  },[profile?.uid,profile?.role]);

  return [data,setData];
}
async function uploadFile(path,file){if(!file)return ''; const r=ref(storage,path); await uploadBytes(r,file); return getDownloadURL(r);}
function isPrivileged(profile){const r=String(profile?.role||'').toLowerCase(); return ['admin','moderador','mentor','owner','fundador'].some(x=>r.includes(x))}
function displayRoleLabel(profile={}){
  const r=String(profile.role||'').toLowerCase();
  if(r.includes('admin'))return 'Admin';
  if(r.includes('moderador'))return 'Moderador';
  if(r.includes('mentor')||r.includes('owner')||r.includes('fundador'))return 'Mentor';
  return profile.type||'Trader';
}

function normalizeIdeaStatus(status){
  const raw=String(status||'').trim().toLowerCase();
  if(['tp','profit','take profit','takeprofit','cumplida'].includes(raw)) return 'tp';
  if(['stop','sl','stop loss','stoploss'].includes(raw)) return 'stop';
  if(['be','breakeven','break even'].includes(raw)) return 'be';
  if(['espera','pendiente','waiting','wait'].includes(raw)) return 'espera';
  if(['activo','activa','active'].includes(raw)) return 'activo';
  return raw||'neutro';
}
function getIdeaStatusClass(status){return `ideaStatus ${normalizeIdeaStatus(status)}`}
function ideaStatusLabel(status){const s=normalizeIdeaStatus(status); return s==='tp'?'TP':s==='stop'?'Stop':s==='be'?'BE':s==='espera'?'Espera':s==='activo'?'Activo':(status||'—')}

function timestampToDate(value){
  if(!value) return null;
  if(value instanceof Date) return value;
  if(typeof value==='string'){const d=new Date(value); return Number.isNaN(d.getTime())?null:d;}
  if(typeof value==='number'){const d=new Date(value); return Number.isNaN(d.getTime())?null:d;}
  if(value?.toDate){const d=value.toDate(); return Number.isNaN(d.getTime())?null:d;}
  if(value?.seconds){const d=new Date(value.seconds*1000); return Number.isNaN(d.getTime())?null:d;}
  return null;
}
function membershipInfo(profile){
  const end=timestampToDate(profile?.currentPeriodEnd);
  const start=timestampToDate(profile?.currentPeriodStart || profile?.startedAt);
  const now=new Date();
  const ms=end?end.getTime()-now.getTime():null;
  const daysRemaining=ms==null?null:Math.max(0,Math.ceil(ms/86400000));
  const expired=!!end && ms<=0 && profile?.accessStatus!=='manual_approved' && profile?.role!=='admin' && profile?.role!=='moderador';
  return {start,end,daysRemaining,expired};
}
function formatMembershipDate(value){
  const d=timestampToDate(value);
  if(!d) return 'Sin fecha';
  return d.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'});
}
function hasActiveAccess(profile){
  if(!profile) return false;
  if(profile.accessStatus==='blocked' || profile.status==='denied' || profile.status==='suspended') return false;
  if(profile.accessStatus==='manual_approved') return true;
  if(membershipInfo(profile).expired && profile.accessSource==='payment') return false;
  if(profile.accessStatus==='active' || profile.subscriptionStatus==='active') return !membershipInfo(profile).expired;
  return (profile.approved===true || profile.status==='approved') && !membershipInfo(profile).expired;
}
function isApproved(profile){return isPrivileged(profile) || hasActiveAccess(profile)}
function effectiveStatus(uOrStatus){
  if(typeof uOrStatus==='string') return uOrStatus;
  if(!uOrStatus) return 'pending';
  if(uOrStatus.accessStatus==='blocked') return 'blocked';
  if(uOrStatus.status==='denied') return 'denied';
  if(uOrStatus.status==='suspended') return 'suspended';
  if(uOrStatus.accessStatus==='manual_approved') return 'approved';
  if(membershipInfo(uOrStatus).expired && uOrStatus.accessSource==='payment') return 'expired';
  if(uOrStatus.subscriptionStatus==='past_due') return 'past_due';
  if(uOrStatus.subscriptionStatus==='canceled') return 'canceled';
  if(uOrStatus.subscriptionStatus==='expired') return 'expired';
  if(uOrStatus.accessStatus==='active' || uOrStatus.subscriptionStatus==='active' || uOrStatus.status==='approved' || uOrStatus.approved===true) return 'approved';
  if(uOrStatus.accessStatus==='pending_payment') return 'pending_payment';
  return 'pending';
}
function accessLabel(status){
  const s=typeof status==='string'?status:effectiveStatus(status);
  const labels={approved:'Acceso activo',pending:'Pendiente',pending_payment:'Activación pendiente',denied:'Acceso denegado',suspended:'Acceso suspendido',blocked:'Acceso bloqueado',past_due:'Pago pendiente',canceled:'Suscripción cancelada',expired:'Membresía vencida'};
  return labels[s] || 'Activación pendiente';
}

const PLAN_PRICING={
  basic:{monthly:14.99,currency:'USD'},
  premium:{monthly:24.99,currency:'USD'}
};
const BILLING_CYCLES={
  monthly:{id:'monthly',label:'Mensual',short:'1 mes',suffix:'/mes',months:1,badge:null,featured:false},
  quarterly:{id:'quarterly',label:'Trimestral',short:'3 meses',suffix:'/trim.',months:3,badge:'Ahorro 20%',featured:false},
  annual:{id:'annual',label:'Anual',short:'12 meses',suffix:'/año',months:12,badge:'Mejor valor',featured:true}
};
const WHATSAPP_MENTORIA=import.meta.env.VITE_WHATSAPP_MENTORIA || '5493412133662';
const API_BASE_URL=String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const apiUrl=(path)=>`${API_BASE_URL}${path.startsWith('/')?path:`/${path}`}`;
const PAYMENT_CONFIG={
  enabled:String(import.meta.env.VITE_PAYMENTS_ENABLED || 'true')==='true',
  provider:import.meta.env.VITE_PAYMENT_PROVIDER || 'paypal',
  checkoutEndpoint:import.meta.env.VITE_CHECKOUT_ENDPOINT || '',
  paypalCreateOrderEndpoint:import.meta.env.VITE_CREATE_PAYPAL_ORDER_URL || apiUrl('/api/createPayPalOrder'),
  paypalCaptureOrderEndpoint:import.meta.env.VITE_PAYPAL_CAPTURE_ORDER_ENDPOINT || '',
  successUrl:import.meta.env.VITE_PAYMENT_SUCCESS_URL || `${window.location.origin}/payment-success`,
  cancelUrl:import.meta.env.VITE_PAYMENT_CANCEL_URL || `${window.location.origin}/payment-cancel`,
  membershipSyncEndpoint:import.meta.env.VITE_MEMBERSHIP_SYNC_ENDPOINT || ''
};
const ACCESS_PLANS=[
  {id:'basic',name:'Club',kicker:'Founding Access',headline:'Base operativa para registrar, validar y revisar sin improvisar.',cta:'Activar Club',tone:'base',valueNote:'Precio preferencial durante etapa de expansi\u00f3n. Ideal para ordenar tu proceso diario con evidencia.',features:['Journal operativo','Checklist','Calendario P/L','Gesti\u00f3n b\u00e1sica de riesgo','Base / comunidad']},
  {id:'premium',name:'Pro',kicker:'M\u00e1s elegido',headline:'Analytics, insights y revisi\u00f3n de conducta para traders activos.',cta:'Activar Pro',recommended:true,tone:'pro',valueNote:'Precio preferencial durante etapa de expansi\u00f3n. La mejor relaci\u00f3n entre datos, riesgo y revisi\u00f3n.',features:['Todo Club','Analytics avanzados','Insights accionables','Reportes de performance','Revisi\u00f3n de conducta','An\u00e1lisis IA operativo','MT5 Sync','Mayor profundidad de m\u00e9tricas']},
  {id:'mentorship',name:'Mentor\u00eda',kicker:'1 a 1',headline:'Acompa\u00f1amiento y feedback personalizado sobre tu proceso.',cta:'Aplicar a mentor\u00eda',tone:'mentor',valueNote:'Cupos limitados para traders que necesitan revisi\u00f3n directa y seguimiento.',features:['Todo Pro','Revisi\u00f3n personalizada','Acompa\u00f1amiento','Feedback sobre proceso','Cupos limitados']}
];
function checkoutPlanId(planId){
  if(planId==='basic') return 'club';
  if(planId==='premium') return 'pro';
  return planId;
}
function calculatePlanPrice(planId,cycleId='monthly'){
  const pricing=PLAN_PRICING[planId];
  if(!pricing) return null;
  const monthly=pricing.monthly;
  if(cycleId==='monthly') return {currency:pricing.currency,monthly,regular:monthly,total:monthly,savePct:0,saveAmount:0,months:1};
  if(cycleId==='quarterly'){
    const regular=monthly*3;
    const total=regular*.8;
    return {currency:pricing.currency,monthly,regular,total,savePct:20,saveAmount:regular-total,months:3};
  }
  const quarterlyTotal=monthly*3*.8;
  const regular=quarterlyTotal*4;
  const total=regular*.9;
  const monthlyEquivalent=monthly*12;
  const effectiveSavePct=Math.round((1-(total/monthlyEquivalent))*100);
  return {currency:pricing.currency,monthly,regular,total,savePct:10,effectiveSavePct,saveAmount:regular-total,months:12};
}
function formatCurrencyValue(value,currency='USD',options={}){
  const amount=Number(value||0);
  const hasDecimals=Math.abs(amount%1)>0.0001;
  const decimals=options.decimals ?? hasDecimals;
  return `${currency} ${amount.toLocaleString('en-US',{minimumFractionDigits:decimals?2:0,maximumFractionDigits:decimals?2:0})}`;
}
function planCycleSummary(planId,cycleId){
  const price=calculatePlanPrice(planId,cycleId);
  if(!price) return null;
  return {price,final:formatCurrencyValue(price.total,price.currency),regular:price.regular>price.total?formatCurrencyValue(price.regular,price.currency):null,perMonth:cycleId==='monthly'?null:`Equiv. ${formatCurrencyValue(price.total/price.months,price.currency)}/mes`};
}
function membershipDurationMonths(cycleId){return cycleId==='annual'?12:cycleId==='quarterly'?3:1}
function membershipDurationDays(cycleId){return cycleId==='annual'?365:cycleId==='quarterly'?90:30}
async function notifyUsers(users,text,type='general',meta={}){const unique=[...new Map((users||[]).filter(u=>u.uid).map(u=>[u.uid,u])).values()]; for(const u of unique){await addDoc(collection(db,'notifications'),{userId:u.uid,text,type,read:false,target:meta.target||type,targetId:meta.targetId||'',createdAt:serverTimestamp(),createdDate:today()});}}
function unreadByType(notifications=[],type){return (notifications||[]).filter(n=>!n.read && ((n.target||n.type)===type || n.type===type)).length}
function unreadChatCount(messages=[],uid){return (messages||[]).filter(m=>(m.to===uid || (m.participants||[]).includes(uid)) && m.senderId!==uid && !(m.readBy||[]).includes(uid)).length}
function activityCount(data,profile,id){
  if(id==='notifications') return (data.notifications||[]).filter(n=>!n.read).length;
  if(id==='chat') return unreadChatCount(data.messages,profile.uid);
  if(id==='announcements') return unreadByType(data.notifications,'announcement')+unreadByType(data.notifications,'announcements');
  if(id==='ideas') return unreadByType(data.notifications,'idea')+unreadByType(data.notifications,'ideas');
  if(id==='academy') return unreadByType(data.notifications,'academy');
  if(id==='community') return unreadByType(data.notifications,'community');
  return 0;
}

function checklistAnswer(c,key){return c?.answers?.[key] || c?.[key] || ''}
function checklistDirectionToSide(direction){const d=String(direction||'').toLowerCase(); if(d.includes('venta')||d.includes('sell')) return 'SELL'; if(d.includes('compra')||d.includes('buy')) return 'BUY'; return 'BUY'}
function checklistToTradePrefill(c){
  const score=Number(c?.score||0);
  const finalGreen=c?.finalGreen===true || c?.green===true;
  return {
    date:tradingDayKey(),tradingDay:tradingDayKey(),account:localStorage.getItem('mtc-last-account')||'Cuenta principal',
    asset:c?.asset||'XAUUSD',session:c?.session||'NY',side:checklistDirectionToSide(c?.direction),
    tradeSystem:'Sistema de Moisés',system:'Sistema de Moisés',setup:'Sistema de Moisés',strategy:'Sistema de Moisés',
    pattern:checklistAnswer(c,'q8')||'Método Estructural: ChoCH en M1',
    confluencesUsed:[checklistAnswer(c,'q4'),checklistAnswer(c,'q5'),checklistAnswer(c,'q3')].filter(Boolean),
    liquidityTaken:checklistAnswer(c,'q4'),priceState:checklistAnswer(c,'q3'),zoneM15:checklistAnswer(c,'q5'),rrPlan:checklistAnswer(c,'q7'),
    riskPct:.5,entry:'',sl:'',tp:'',exit:'',riskMoney:'',result:'',resultMoney:'',resultPct:'',resultR:'',
    quality:finalGreen&&score>=85?'A+':'A',followedPlan:finalGreen,checklist:finalGreen?['Contexto claro','Sesión válida','Tomó liquidez','RR válido','Sigo el plan']:[],
    captureLink:c?.captures||'',captureFileName:'',emotionBefore:'',emotionDuring:'',emotionAfter:'',executionBehaviors:finalGreen?['Seguí el plan']:[],postTradeBehavior:'',privateJournal:'',lesson:c?.comment||'',
    checklistId:c?.id||'',createdFromChecklist:true,quickTradeFromChecklist:true,checklistScore:score,checklistFinalGreen:finalGreen,checklistOperationalState:c?.operationalState||c?.status||'',
    checklistPattern:checklistAnswer(c,'q8'),checklistZoneM15:checklistAnswer(c,'q5'),checklistLiquidity:checklistAnswer(c,'q4'),checklistPriceState:checklistAnswer(c,'q3'),
    executedWithoutFullChecklist:!finalGreen,checklistAPlus:finalGreen&&score>=85
  };
}
function findLinkedTrade(data,c){if(!c?.id)return null; return (data?.trades||[]).find(t=>t.id===c.linkedTradeId || t.checklistId===c.id) || null}
function openTradeFromChecklist(c,existing,profile,data={}){
  if(!c?.id)return;
  const isOwner=c.userId===profile.uid;
  if(!isOwner){toast('Como mentor podés revisar esta validación, pero solo el trader dueño puede crear el trade desde su checklist.','error');return;}
  const dayPlan=(data.dailyPlans||[]).find(p=>(p.dayKey||p.date)===tradingDayKey() && p.userId===profile.uid);
  const guard=evaluateRiskGuard(data.trades||[],getRiskSettings(),data?.settings?.initialBalance||10000,dayPlan);
  if(guard.blocked){toast('Modo reflexión activo. No podés crear trades ejecutados hasta el próximo rollover 17:00 NY o hasta ajustar límites en Riesgo.','error');return;}
  if(existing){localStorage.setItem('mtc-open-trade',existing.id); window.dispatchEvent(new CustomEvent('mtc-tab',{detail:'journal'})); toast('Esta validación ya tiene un trade vinculado'); return;}
  if(c.finalGreen!==true && c.green!==true && !confirm('Esta validación no tiene luz verde. Podés crear el trade, pero quedará marcado como ejecutado sin checklist completo.'))return;
  const prefill={...checklistToTradePrefill(c),duplicateFromChecklist:false};
  localStorage.setItem('mtc-checklist-prefill',JSON.stringify(prefill));
  window.dispatchEvent(new CustomEvent('mtc-tab',{detail:'journal'}));
  toast(c.finalGreen===true||c.green===true?'Luz verde confirmada. Trade precargado desde Checklist':'Checklist sin luz verde. Trade preparado con advertencia','info');
}
function checklistFilterMatch(t,filter){
  if(filter==='Todos')return true;
  if(filter==='Con checklist')return !!t.checklistId;
  if(filter==='Sin checklist')return !t.checklistId;
  if(filter==='Con luz verde')return t.checklistFinalGreen===true;
  if(filter==='Sin luz verde')return !!t.checklistId && t.checklistFinalGreen!==true;
  if(filter==='Setups A+')return t.checklistAPlus===true;
  if(filter==='Ejecutados sin checklist completo')return t.executedWithoutFullChecklist===true;
  return true;
}
function checklistLinkedMetrics(trades=[]){
  const withChecklist=trades.filter(t=>t.checklistId);
  const green=trades.filter(t=>t.checklistFinalGreen===true);
  const withoutFull=trades.filter(t=>t.executedWithoutFullChecklist===true);
  const aplus=trades.filter(t=>t.checklistAPlus===true);
  const wr=arr=>arr.length?arr.filter(t=>Number(t.resultMoney)>0).length/arr.length*100:0;
  const pl=arr=>arr.reduce((a,t)=>a+Number(t.resultMoney||0),0);
  const avgR=arr=>arr.length?arr.reduce((a,t)=>a+Number(t.resultR||0),0)/arr.length:0;
  return {withChecklist,green,withoutFull,aplus,winrateChecklist:wr(withChecklist),winrateGreen:wr(green),winrateAPlus:wr(aplus),plAPlus:pl(aplus),avgRAPlus:avgR(aplus)};
}
function toast(text,type='success'){window.dispatchEvent(new CustomEvent('mtc-toast',{detail:{text,type}}));}
function ToastIcon({type}){
  const props={size:16,strokeWidth:2.6,className:'toastIcon'};
  if(type==='error') return <XCircle {...props}/>;
  if(type==='warning') return <AlertTriangle {...props}/>;
  if(type==='info') return <Info {...props}/>;
  return <CheckCircle2 {...props}/>;
}
function ToastHost(){const [items,setItems]=useState([]); useEffect(()=>{const h=e=>{const id=Date.now()+Math.random(); setItems(v=>[...v,{id,...e.detail}]); setTimeout(()=>setItems(v=>v.filter(x=>x.id!==id)),2600)}; window.addEventListener('mtc-toast',h); return()=>window.removeEventListener('mtc-toast',h);},[]); return <div className="toastHost">{items.map(t=>{const type=t.type||'success'; return <div key={t.id} className={`toast ${type}`}><ToastIcon type={type}/><span>{t.text}</span></div>})}</div>}

function ChartTooltipPremium({active,payload,label}){
  if(!active || !payload?.length) return null;
  const rows=payload.filter(Boolean);
  return <div className="chartTooltipPremium"><span>{label||'Dato'}</span>{rows.map((r,i)=>{const v=Number(r.value||0); const cls=v>0?'pos':v<0?'neg':''; return <b key={i} className={cls}>{r.name||'Valor'}: {String(r.dataKey||'').toLowerCase().includes('equity')?money(v):String(r.dataKey||'').toLowerCase()==='r'?`${v.toFixed(2)}R`:money(v)}</b>})}</div>
}

function isUserOnline(u){
  const d=u?.lastSeen?.toDate?.() || (u?.lastSeen ? new Date(u.lastSeen) : null);
  return !!(u?.online && d && Date.now()-d.getTime()<2*60*1000);
}
function usePresence(profile){
  useEffect(()=>{
    if(!profile?.uid) return;
    const refDoc=doc(db,'users',profile.uid);
    const touch=()=>setDoc(refDoc,{online:true,lastSeen:serverTimestamp()},{merge:true}).catch(()=>{});
    touch();
    const id=setInterval(touch,45000);
    const onVis=()=>{ if(document.visibilityState==='visible') touch(); else setDoc(refDoc,{online:false,lastSeen:serverTimestamp()},{merge:true}).catch(()=>{}); };
    window.addEventListener('visibilitychange',onVis);
    window.addEventListener('focus',touch);
    window.addEventListener('beforeunload',()=>{try{setDoc(refDoc,{online:false,lastSeen:serverTimestamp()},{merge:true})}catch{}});
    return()=>{clearInterval(id); window.removeEventListener('visibilitychange',onVis); window.removeEventListener('focus',touch); setDoc(refDoc,{online:false,lastSeen:serverTimestamp()},{merge:true}).catch(()=>{});};
  },[profile?.uid]);
}


function isMobileOrStandalone(){
  const ua=navigator.userAgent||'';
  const mobile=/Android|iPhone|iPad|iPod/i.test(ua);
  const standalone=window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone===true;
  return mobile || standalone;
}
function authErrorMessage(e){
  const code=e?.code||'';
  if(code.includes('unauthorized-domain')) return 'Este dominio no está autorizado en Firebase Auth. Agregalo en Authentication → Settings → Authorized domains.';
  if(code.includes('popup-blocked')) return 'Popup bloqueado. Probando con redirección de Google.';
  if(code.includes('popup-closed-by-user')) return 'Se cerró la ventana de Google antes de completar el ingreso.';
  if(code.includes('cancelled-popup-request')) return 'Ya hay un inicio con Google en curso. Esperá unos segundos e intentá de nuevo.';
  return e?.message?.replace('Firebase: ','') || 'No se pudo ingresar con Google.';
}
async function ensureGoogleUserProfile(u){
  if(!u?.uid) return;
  const displayName=u.displayName||u.email?.split('@')[0]||'Trader';
  const userRef=doc(db,'users',u.uid);
  const snap=await getDoc(userRef);
  const existing=snap.exists()?snap.data():{};
  const adminEmail=ADMIN_EMAILS.includes(u.email?.toLowerCase());

  if(!snap.exists()){
    const safeCreatePayload={
      uid:u.uid,
      email:u.email,
      name:displayName,
      displayName,
      country:'',
      type:'Day Trader',
      gender:'masculino',
      avatarChoice:'trader-m',
      level:'Inicial',
      avatar:displayName.slice(0,2).toUpperCase(),
      photoURL:u.photoURL||'',
      active:true,
      role:'alumno',
      status:'pending',
      approved:false,
      provider:'google',
      accessStatus:'pending_payment',
      subscriptionStatus:'none',
      accessSource:'self_signup',
      plan:'free',
      createdAt:serverTimestamp(),
      lastLoginAt:serverTimestamp()
    };
    await setDoc(userRef,safeCreatePayload,{merge:true});
    await setDoc(doc(db,'settings',u.uid),settingsDefault,{merge:true});
    return;
  }

  const safeLoginPatch={
    email:u.email,
    name:existing.name||displayName,
    displayName:existing.displayName||displayName,
    country:existing.country||'',
    type:existing.type||'Day Trader',
    gender:existing.gender||'masculino',
    avatarChoice:existing.avatarChoice||'trader-m',
    level:existing.level||'Inicial',
    avatar:existing.avatar||displayName.slice(0,2).toUpperCase(),
    photoURL:existing.photoURL||u.photoURL||'',
    active:existing.active!==false,
    lastLoginAt:serverTimestamp(),
    provider:'google'
  };
  await setDoc(userRef,safeLoginPatch,{merge:true});
  await setDoc(doc(db,'settings',u.uid),settingsDefault,{merge:true});

  // Seguridad: el cliente no se autoasigna admin aunque el email esté en VITE_ADMIN_EMAILS.
  // Si este email debe ser admin, crear/aprobar el documento desde Firebase Console o Admin SDK.
  if(adminEmail && existing.role!=='admin') console.warn('Admin email detectado, pero el rol debe estar aprobado desde backend/Admin SDK.');
}

function goPublic(path){
  window.history.pushState({},'',path);
  window.dispatchEvent(new Event('mtc-public-route'));
}

function AnimatedProductDemo({images,title,className='',variant='hero',videoSrc='',videoSources=[],poster='' }){
  const [videoFailed,setVideoFailed]=useState(false);
  const frames=(Array.isArray(images)?images:[images]).filter(Boolean);
  const sources=videoSources.length?videoSources:(videoSrc?[{src:videoSrc,type:'video/mp4'}]:[]);
  const showVideo=sources.length>0&&!videoFailed;
  return <div className={`animatedProductDemo ${variant} ${className}`} aria-label={title}>
    <div className="animatedProductGlow" aria-hidden="true"></div>
    <div className="animatedProductStage">
      {showVideo?<video poster={poster||frames[0]||''} autoPlay muted loop playsInline preload="metadata" aria-label={title} onError={()=>setVideoFailed(true)}>
        {sources.map(source=><source key={source.src} src={source.src} type={source.type}/>)}
      </video>:frames.map((src,index)=><img key={src} src={src} alt={index===0?title:''} aria-hidden={index===0?undefined:true} style={{'--frame-index':index}}/>)}
    </div>
  </div>
}


function PublicLanding(){
  const [landingVideoFailed,setLandingVideoFailed]=useState(false);
  const landingPlans=[
    {name:'Club',badge:'Founding Access',price:'USD 14.99',copy:'Base operativa para registrar, validar y revisar sin improvisar.',items:['Journal operativo','Checklist','Calendario P/L','Gesti\u00f3n b\u00e1sica de riesgo','Base / comunidad']},
    {name:'Pro',badge:'M\u00e1s elegido',price:'USD 24.99',copy:'Analytics, insights y revisi\u00f3n de conducta para traders activos.',featured:true,items:['Todo Club','Analytics avanzados','Insights accionables','Reportes de performance','Revisi\u00f3n de conducta','An\u00e1lisis IA operativo','MT5 Sync','Mayor profundidad de m\u00e9tricas']},
    {name:'Mentor\u00eda',badge:'1 a 1',price:'USD 250',copy:'Acompa\u00f1amiento y feedback personalizado sobre tu proceso.',items:['Todo Pro','Revisi\u00f3n personalizada','Acompa\u00f1amiento','Feedback sobre proceso','Cupos limitados']}
  ];
  const proofDemos=[
    {title:'Validá antes de operar',benefit:'Checklist, contexto, setup y RR antes de poner capital en riesgo.',src:'/commercial/mtc-demo-checklist-execution.png'},
    {title:'Protegé tu riesgo',benefit:'Límites, drawdown y exposición visibles para sostener disciplina.',src:'/commercial/mtc-demo-risk-limits.png'},
    {title:'Revisá con evidencia',benefit:'Journal, conducta y analytics conectados para detectar patrones reales.',src:'/commercial/mtc-demo-journal-review.png'}
  ];
  const landingDemoFallback='/commercial/mtc-landing-demo-premium.png';
  const renderLandingDemo=(label='MTC Analytics product demo')=>landingVideoFailed
    ? <img className="commercialDemoVideo landingDemoVideo landingDemoFallback" src={landingDemoFallback} alt={label}/>
    : <video className="commercialDemoVideo landingDemoVideo" src="/commercial/mtc-landing-demo-premium.mp4" autoPlay muted loop playsInline preload="auto" poster={landingDemoFallback} aria-label={label} onLoadedData={()=>console.log('MTC video loaded:','/commercial/mtc-landing-demo-premium.mp4')} onError={(e)=>{console.error('MTC video error:',e.currentTarget.error,e.currentTarget.src);setLandingVideoFailed(true)}}></video>;
  return <div className="publicLanding commercialSurface finalCommercialSurface">
    <header className="landingNav">
      <button className="landingNavBrand" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} aria-label="MTC Analytics inicio"><picture><source media="(max-width: 640px)" srcSet="/brand/mtc-analytics-logo-horizontal.png"/><img src="/brand/mtc-analytics-logo-horizontal.png" alt="MTC Analytics"/></picture></button>
      <nav><a href="#plataforma">Plataforma</a><a href="#modulos">Módulos</a><a href="#precios">Precios</a></nav>
      <div className="landingNavActions"><button className="ghost landingCta" onClick={()=>goPublic('/login')}>Iniciar sesión</button><button className="primary landingCta" onClick={()=>goPublic('/register')}>Crear cuenta</button></div>
    </header>
    <section className="landingHero finalLandingHero">
      <div className="landingHeroText finalLandingCopy">
        <span className="landingBadge subtleHero"><Crown size={16}/> Trading performance platform</span>
        <h1>Operá con estructura.<br/>Revisá con evidencia.<br/>Mejorá con sistema.</h1>
        <p>MTC Analytics conecta journal, checklist, riesgo, conducta y analytics para que cada sesión deje evidencia útil sobre tu proceso como trader discrecional.</p>
        <div className="landingActions">
          <button className="primary landingCta" onClick={()=>goPublic('/register')}>Crear cuenta</button>
          <button className="ghost landingCta" onClick={()=>goPublic('/login')}>Iniciar sesión</button>
          <button className="ghost landingCta subtle" onClick={()=>goPublic('/register')}>Activar acceso</button>
        </div>
        <div className="mobileHeroVideoFrame">
          {renderLandingDemo('MTC Analytics product demo mobile')}
        </div>
        <small className="landingMicro">Software para medir, revisar y mejorar tu proceso operativo.</small>
      </div>
      <div className="landingMediaStack finalLandingVisual">
        {renderLandingDemo()}
      </div>
    </section>
    <section className="landingSection journalDifference finalJournalDifference">
      <span className="landingBadge soft">No es solo un journal</span>
      <h2>Un journal registra trades. MTC Analytics conecta tu proceso completo.</h2>
      <p>Entrada, salida y resultado no alcanzan para mejorar. Necesitás ver contexto, riesgo, conducta, ejecución y revisión en un mismo flujo.</p>
      <div className="differenceGrid">
        <div><span>Journal común</span><b>Registro aislado</b><p>Entrada, salida, resultado y notas sueltas. Útil, pero limitado para leer conducta.</p></div>
        <div><span>MTC Analytics</span><b>Sistema operativo</b><p>Contexto → Riesgo → Validación → Ejecución. Todo conectado para revisar con evidencia.</p></div>
      </div>
    </section>
    <section className="landingSection finalConversionSection" id="modulos" aria-label="Sistema comercial MTC Analytics">
      <div className="conversionIntro">
        <span className="landingBadge soft">Sistema operativo</span>
        <h2>La solución a todo lo que afecta tu performance, en un mismo lugar.</h2>
        <p>Checklist, journal, riesgo, conducta y analytics conectados para convertir cada sesión en evidencia accionable.</p>
      </div>
      <div className="outcomePillGrid" aria-label="Resultados operativos de MTC Analytics">
        {['Menos impulso','Más estructura','Riesgo visible','Revisión con evidencia','Decisiones más claras'].map((v,index)=><div className="outcomePill" key={v}><span>{String(index+1).padStart(2,'0')}</span><b>{v}</b></div>)}
      </div>
      <div className="conversionTimeline" aria-label="Antes, durante y después de operar">
        {proofDemos.map((d,index)=><article className="conversionPanel" key={d.title}>
          <div className="conversionPanelCopy">
            <span>{index===0?'Antes de operar':index===1?'Durante la operativa':'Después de operar'}</span>
            <h3>{d.title}</h3>
            <p>{d.benefit}</p>
          </div>
          <div className="conversionPanelVisual">
            <img src={d.src} alt={`${d.title} en MTC Analytics`}/>
          </div>
        </article>)}
      </div>
      <div className="conversionClose">
        <b>Menos ruido. Más criterio. Mejor revisión.</b>
        <p>Una plataforma para ordenar tu proceso, detectar errores repetidos y llegar a Founding Members con una operación más medible.</p>
      </div>
    </section>
    <section className="landingSection landingPricingSection finalPricingSection" id="precios">
      <span className="landingBadge soft">Acceso Founding Members</span>
      <h2>Elegí el nivel de estructura que exige tu operativa.</h2>
      <p>Precio preferencial durante etapa de expansión para traders que quieren convertir actividad en evidencia, criterio y mejora continua.</p>
      <div className="landingPlanGrid">{landingPlans.map(plan=><article className={plan.featured?'landingPlanCard featured':'landingPlanCard'} key={plan.name}>
        <div className="landingPlanTop"><span>{plan.badge}</span><h3>{plan.name}</h3><p>{plan.copy}</p></div>
        <div className="landingPlanPrice"><b>{plan.price}</b><em>/ mes</em></div>
        <ul>{plan.items.map(item=><li key={item}>{item}</li>)}</ul>
        <button className={plan.featured?'primary landingCta':'ghost landingCta'} onClick={()=>goPublic('/register')}>Activar {plan.name}</button>
      </article>)}</div>
    </section>
    <section className="landingFinal" id="plataforma">
      <h2>Activá tu acceso a MTC Analytics.</h2>
      <p>Creá tu cuenta y prepará tu workspace privado. Si ya tenés acceso por mentoría, el administrador podrá habilitarte manualmente.</p>
      <div className="landingActions center"><button className="primary landingCta" onClick={()=>goPublic('/register')}>Crear cuenta</button><button className="ghost landingCta" onClick={()=>goPublic('/login')}>Iniciar sesión</button></div>
    </section>
  </div>
}

function Login({initialMode='login'}){
  const [mode,setMode]=useState(initialMode),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[err,setErr]=useState(''),[ok,setOk]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>setMode(initialMode),[initialMode]);
  async function submit(){
    setErr('');setOk('');setBusy(true);
    try{
      await setPersistence(auth,browserLocalPersistence);
      if(mode==='login'){
        await signInWithEmailAndPassword(auth,email,password);
      }else{
        if(!name||!email||!password)throw new Error('Completa nombre, email y contraseña.');
        const cred=await createUserWithEmailAndPassword(auth,email,password);
        await updateProfile(cred.user,{displayName:name});
        await setDoc(doc(db,'users',cred.user.uid),{
          uid:cred.user.uid,email,name,displayName:name,role:'alumno',country:'',type:'Day Trader',gender:'masculino',avatarChoice:'trader-m',level:'Inicial',avatar:name.slice(0,2).toUpperCase(),photoURL:'',active:true,
          status:'pending',approved:false,
          accessStatus:'pending_payment',subscriptionStatus:'none',accessSource:'self_signup',plan:'free',
          createdAt:serverTimestamp(),updatedAt:serverTimestamp()
        });
        await setDoc(doc(db,'settings',cred.user.uid),settingsDefault);
      }
    }catch(e){setErr(e.message?.replace('Firebase: ','')||'Error de acceso');}
    finally{setBusy(false)}
  }
  async function googleLogin(){
    setErr('');setOk('');setBusy(true);
    try{
      await setPersistence(auth,browserLocalPersistence);
      const provider=new GoogleAuthProvider();
      provider.setCustomParameters({prompt:'select_account'});
      if(isMobileOrStandalone()){
        await signInWithRedirect(auth,provider);
        return;
      }
      try{
        const cred=await signInWithPopup(auth,provider);
        await ensureGoogleUserProfile(cred.user);
      }catch(popupError){
        const code=popupError?.code||'';
        if(code.includes('popup-blocked') || code.includes('popup-closed-by-user') || code.includes('operation-not-supported-in-this-environment')){
          setOk('Popup bloqueado. Redirigiendo a Google...');
          await signInWithRedirect(auth,provider);
          return;
        }
        throw popupError;
      }
    }catch(e){setErr(authErrorMessage(e));}
    finally{setBusy(false)}
  }
  async function resetPassword(){
    setErr('');setOk('');
    if(!email){setErr('Escribí tu email primero.');return;}
    try{await sendPasswordResetEmail(auth,email); setOk('Te enviamos un email para recuperar la contraseña.');}
    catch(e){setErr(e.message?.replace('Firebase: ','')||'No se pudo enviar el email.')}
  }
  return <div className="authPage"><div className="authShell">
    <button className="backLanding" onClick={()=>goPublic('/')} type="button">← Volver</button>
    <div className="loginCard premiumAuth standaloneAuth"><img className="logoImage loginLogo" src="/brand/mtc-analytics-icon.png" alt="MTC Analytics"/><h1>Acceso a MTC Analytics</h1><p>{mode==='login'?'Ingresá a tu workspace de performance.':'Creá tu cuenta para activar o solicitar acceso.'}</p><button className="googleBtn" onClick={googleLogin} disabled={busy}><span>G</span> Continuar con Google</button><div className="orLine"><span>o ingresar con email</span></div><div className="seg"><button className={mode==='login'?'on':''} onClick={()=>{setMode('login');goPublic('/login')}}>Ingresar</button><button className={mode==='register'?'on':''} onClick={()=>{setMode('register');goPublic('/register')}}>Registro</button></div>{mode==='register'&&<input className="input" placeholder="Nombre visible" value={name} onChange={e=>setName(e.target.value)}/>}<input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input className="input" placeholder="Contraseña" type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>{err&&<p className="err">{err}</p>}{ok&&<p className="ok">{ok}</p>}<button className="primary full" onClick={submit} disabled={busy}>{busy?'Procesando...':mode==='login'?'Ingresar':'Crear cuenta'}</button>{mode==='login'&&<button className="linkBtn" onClick={resetPassword}>Recuperar contraseña</button>}<p className="hint">Si tu acceso fue habilitado por el equipo, vas a poder entrar directamente a tu workspace.</p></div>
  </div></div>
}

function Shell({profile,tab,setTab,data,theme,toggleTheme}){const groups=[['OPERATIVA',[['dashboard','Dashboard',Home],['journal','Journal',LineChart],['checklist','Checklist',CheckCircle2],['ideas','Ideas',Lightbulb],['risk','Riesgo',SlidersHorizontal],['analytics','Analytics',BarChart3],['results','Resultados',Trophy],['brokers','Integraciones',Activity],['ecosystem','Guía',Sparkles],['emotional','Emocional',Heart]]],['WORKSPACE',[['academy','Base',BookOpen],['community','Mi espacio',Users],['announcements','Anuncios',Megaphone],['chat','Chat',MessageCircle],['online','Online',Activity]]],['RECURSOS',[['system','Sistema',Shield],['reading','Biblioteca',BookOpen],['news','Noticias',Newspaper]]],['PERFIL',[['notifications','Notificaciones',Bell],['settings','Perfil',Settings]]]]; if(['admin','moderador'].includes(profile.role))groups.push(['ADMIN',[['admin','Admin',Shield]]]); return <aside className="side premiumSide"><div className="brand"><img className="brandLogo" src="/brand/mtc-analytics-icon.png" alt="MTC Analytics"/><div><b>MTC Analytics</b><span>Plataforma de rendimiento operativo</span></div></div><nav>{groups.map(([group,items])=><div className="navGroup" key={group}><small>{group}</small>{items.map(([id,label,Icon])=>{const count=activityCount(data,profile,id); return <button key={id} className={`${tab===id?'active':''} ${count?'hasActivity':''}`} onClick={()=>{markNotificationsForTarget(data.notifications,id); setTab(id);}}><Icon size={16}/><span>{label}</span>{count>0&&<em>{count>9?'9+':count}</em>}</button>})}</div>)}</nav><button
  onClick={toggleTheme}
  className="icon"
  title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
  style={{ margin: '0 16px 8px', width: 'calc(100% - 32px)', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14, justifyContent: 'flex-start', color: 'var(--muted)', fontWeight: 700, fontSize: 14 }}
>
  {theme === 'dark'
    ? <><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>Modo claro</>
    : <><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>Modo oscuro</>
  }
</button><div className="user"><div className="avatar">{profile.avatar||profile.name?.slice(0,2)||'MT'}</div><div><b>{profile.name}</b><span>{displayRoleLabel(profile)}</span></div><button onClick={()=>signOut(auth)} title="Salir"><LogOut size={16}/></button></div></aside>}

function MobileNav({profile,tab,setTab,data}){const items=[['dashboard','Dashboard',Home],['journal','Journal',LineChart],['checklist','Checklist',CheckCircle2],['ideas','Ideas',Lightbulb],['risk','Riesgo',SlidersHorizontal],['analytics','Analytics',BarChart3],['results','Resultados',Trophy],['brokers','Integraciones',Activity],['ecosystem','Guía',Sparkles],['emotional','Emocional',Heart],['system','Sistema',Shield],['reading','Biblioteca',BookOpen],['news','Noticias',Newspaper],['community','Mi espacio',Users],['announcements','Anuncios',Megaphone],['chat','Chat',MessageCircle],['online','Online',Activity],['notifications','Avisos',Bell],['settings','Perfil',Settings]]; if(['admin','moderador'].includes(profile.role))items.push(['admin','Admin',Shield]); return <div className="mobileNav">{items.map(([id,label,Icon])=>{const count=activityCount(data,profile,id); return <button key={id} className={`${tab===id?'active':''} ${count?'hasActivity':''}`} onClick={()=>{markNotificationsForTarget(data.notifications,id); setTab(id);}}><Icon size={18}/><span>{label}</span>{count>0&&<em>{count>9?'9+':count}</em>}</button>})}<button className="mobileLogout" onClick={()=>signOut(auth)}><LogOut size={18}/><span>Salir</span></button></div>}

function Topbar({tab,profile,theme,toggleTheme}){const names={dashboard:'Dashboard principal',journal:'Journal de trading',brokers:'Integraciones',risk:'Riesgo y lotaje',checklist:'Checklist operativo',ecosystem:'Guía de plataforma',emotional:'Journal emocional',system:'Sistema',reading:'Biblioteca',news:'Noticias económicas',analytics:'Analytics',academy:'Base de conocimiento',community:'Mi espacio',announcements:'Anuncios del mentor',chat:'Chat privado',online:'Usuarios online',ideas:'Ideas de trading',results:'Resultados',notifications:'Notificaciones',settings:'Perfil y configuración',admin:'Panel Admin'}; return <header className="top premiumTop"><div><h1>{names[tab]||'MTC Analytics'}</h1><p>{profile.name} · {displayRoleLabel(profile)}</p></div><div className="topActions"><button className="topCta ghost" onClick={()=>window.dispatchEvent(new CustomEvent('mtc-tab',{detail:'checklist'}))}><CheckCircle2 size={15}/> Checklist</button><button
  className="icon"
  onClick={toggleTheme}
  title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
>
  {theme === 'dark'
    ? <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
    : <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  }
</button><button className="topCta primaryMini" onClick={()=>window.dispatchEvent(new CustomEvent('mtc-tab',{detail:'journal'}))}><Plus size={15}/> Registrar trade</button><span className="crownBadge" title="MTC Analytics"><Crown size={18}/></span><span className="cmdHint">Ctrl K</span></div></header>}


function Metric({label,value,sub}){return <div className={`metric ${Number(String(value).replace(/[^0-9.-]/g,''))<0?'red':''}`}><span>{label}</span><b>{value}</b>{sub&&<small>{sub}</small>}</div>}
function SparklineMini({data=[],tone='neutral'}){
  const values=(data&&data.length?data:[0,0,0,0,0,0,0]).slice(-10);
  const max=Math.max(1,...values.map(v=>Math.abs(Number(v)||0)));
  return <div className="sparklineMini" aria-hidden="true">{values.map((v,i)=>{const n=Number(v)||0; const h=14+(Math.abs(n)/max)*26; return <span key={i} className={n>0?'pos':n<0?'neg':tone} style={{height:h}}/>})}</div>
}
function MetricCardPremium({label,value,sub,icon:Icon,state='neutral',sparkData=[],showSpark=true}){
  return <div className={`metricPremium ${state}`}><div className="metricPremiumTop"><span>{label}</span>{Icon&&<Icon size={17}/>}</div><b>{value}</b>{sub&&<small>{sub}</small>}{showSpark&&<SparklineMini data={sparkData} tone={state}/>}</div>
}
function greetingNY(){
  const h=Number(new Intl.DateTimeFormat('en-US',{hour:'numeric',hour12:false,timeZone:'America/New_York'}).format(new Date()));
  if(h>=5 && h<12)return 'Buenos días';
  if(h>=12 && h<20)return 'Buenas tardes';
  return 'Buenas noches';
}
function DashboardControlCenter({profile,s,monthly,setTab,filtered=[]}){
  const dayTrades=filtered.filter(t=>getTradeOperationalDateKey(t)===tradingDayKey());
  const dayPnL=dayTrades.reduce((a,t)=>a+Number(t.resultMoney||0),0);
  const weekTrades=filtered.filter(t=>{const d=getTradeOperationalDateKey(t); return d&&d>=weekStartISO();});
  const weekWins=weekTrades.filter(t=>Number(t.resultMoney)>0).length;
  const weekWr=weekTrades.length?weekWins/weekTrades.length*100:0;
  const discipline=Math.round(Number(s.discipline||0));
  return <section className="controlCenter"><div className="controlLeft"><span className="controlBadge"><Crown size={15}/> Centro de Control Operativo</span><h2>{greetingNY()}, {profile.name||'Trader'}</h2><p>Tu centro de mando para operar con estructura, medir con evidencia y corregir con sistema.</p><div className="sessionRow"><SessionStatusPill label={sessionNameNY()}/><span>Rollover 17:00 NY · <ResetTicker/></span></div><div className="controlActions"><button className="primary" onClick={()=>setTab('checklist')}><CheckCircle2 size={17}/>Abrir checklist</button><button className="ghost" onClick={()=>setTab('journal')}><Plus size={17}/>Registrar trade</button><button className="ghost" onClick={()=>setTab('journal')}><LineChart size={17}/>Ver journal</button><button className="ghost" onClick={()=>setTab('analytics')}><BarChart3 size={17}/>Revisar analytics</button><button className="ghost" onClick={()=>setTab('emotional')}><Heart size={17}/>Cerrar sesión emocional</button></div></div><div className="controlRight"><div className="controlChart"><ResponsiveContainer width="100%" height={120}><AreaChart data={s.curve}><defs><linearGradient id="controlEq" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#d4a843" stopOpacity={0.28}/><stop offset="95%" stopColor="#d4a843" stopOpacity={0}/></linearGradient></defs><Tooltip content={<ChartTooltipPremium/>}/><Area type="monotone" dataKey="equity" stroke="#d4a843" strokeWidth={2} fill="url(#controlEq)"/></AreaChart></ResponsiveContainer></div><div className="controlStats"><div className={dayPnL>=0?'pos':'neg'}><span>P/L día</span><b>{formatMoneyCompactCard(dayPnL)}</b></div><div><span>WR semana</span><b>{formatPercentCard(weekWr)}</b></div><div><span>Disciplina</span><b>{discipline?formatPercentCard(discipline):'—'}</b></div><div><span>Días operados</span><b>{formatMetricCard(monthly.days)}</b></div></div></div></section>
}
function SessionStatusPill({label}){return <span className="sessionStatusPill"><Activity size={13}/>{label}</span>}
function PremiumEmptyState({title,text,cta,onClick,icon:Icon=Sparkles}){
  return <div className="emptyPremium premiumEmptyAction"><span><Icon size={17}/></span><div><b>{title}</b><p>{text}</p>{cta&&<button className="ghost compact" onClick={onClick}>{cta}</button>}</div></div>
}
function ProcessSummaryCard({data,setTab}){
  const rows=[['Trades',data.trades?.length||0,'journal'],['Checklists',data.checklists?.length||0,'checklist'],['Cierres emocionales',data.emotionalJournals?.length||0,'emotional'],['Ideas',data.ideas?.length||0,'ideas'],['Resultados',data.resultPosts?.length||0,'results']];
  return <Card title="Resumen del proceso" sub="Evidencia registrada, sin métricas ficticias." className="processSummaryCard"><div className="processSummaryGrid">{rows.map(([label,value,target])=><button key={label} onClick={()=>setTab(target)}><span>{label}</span><b>{formatMetricCard(value)}</b></button>)}</div></Card>
}
function StructuredOnboardingCard({data,setTab}){
  const settingsReady=Number(data.settings?.initialBalance||0)>0||normalizedAccounts(data.settings).some(a=>Number(a.capital||0)>0);
  const dayKey=tradingDayKey();
  const todayPlan=(data.dailyPlans||[]).find(p=>(p.dayKey||p.date)===dayKey);
  const todayTrades=(data.trades||[]).filter(t=>getTradeOperationalDateKey(t)===dayKey);
  const journeyReady=!!todayPlan||todayTrades.length>0;
  const steps=[
    {label:'Configurar cuenta/base operativa',done:settingsReady,target:'settings',cta:'Configurar',icon:Settings},
    {label:'Crear primera validación de checklist',done:(data.checklists||[]).length>0,target:'checklist',cta:'Abrir checklist',icon:CheckCircle2},
    {label:'Registrar primer trade',done:(data.trades||[]).length>0,target:'journal',cta:'Registrar trade',icon:Plus},
    {label:'Guardar jornada del día',done:journeyReady,target:'journal',cta:todayTrades.length?'Ver operativa':'Guardar jornada',icon:CalendarDays,openDate:dayKey},
    {label:'Completar cierre emocional',done:(data.emotionalJournals||[]).length>0,target:'emotional',cta:'Cerrar sesión',icon:Heart},
    {label:'Revisar analytics/insights',done:(data.trades||[]).length>=5,target:'analytics',cta:'Revisar analytics',icon:BarChart3}
  ];
  const completedCount=steps.filter(s=>s.done).length;
  const nextIndex=steps.findIndex(s=>!s.done);
  const progress=Math.round(completedCount/steps.length*100);
  const openStep=step=>{if(step.openDate)localStorage.setItem('mtc-open-journal-date',step.openDate); setTab(step.target)};
  return <Card title="Prepará tu workspace operativo" sub="Completá estos pasos para convertir cada sesión en información útil." className="structuredOnboardingCard"><div className="onboardingProgress"><div><span>Progreso real</span><b>{completedCount}/{steps.length}</b></div><div className="onboardingProgressTrack"><i style={{width:`${progress}%`}}/></div></div><div className="onboardingSteps">{steps.map((step,i)=>{const Icon=step.icon; const status=step.done?'Completado':i===nextIndex?'Siguiente acción':'Pendiente'; return <button type="button" key={step.label} className={`${step.done?'done':''} ${i===nextIndex?'next':''}`} onClick={()=>openStep(step)}><span>{step.done?<CheckCircle2 size={16}/>:<Icon size={16}/>}</span><div><em>{status}</em><b>{step.label}</b><small>{step.done?'Listo':step.cta}</small></div></button>})}</div></Card>
}
function DashboardEmptyStates({data,setTab,s}){
  const items=[
    [!(data.trades||[]).length,'Todavía no hay trades registrados','Registrá tu primera operación para empezar a construir evidencia sobre tu proceso.','Registrar trade','journal',Plus],
    [!(data.checklists||[]).length,'Todavía no validaste entradas','Usá el checklist operativo antes de ejecutar para separar sistema de impulso.','Abrir checklist','checklist',CheckCircle2],
    [Number(s?.count||0)<5,'Analytics esperando evidencia','Cargá operaciones para que las métricas empiecen a mostrar patrones reales.','Registrar trade','journal',BarChart3],
    [!(data.emotionalJournals||[]).length,'Sin revisión emocional registrada','Cerrá tu sesión para detectar cómo tu estado mental influye en la ejecución.','Cerrar sesión emocional','emotional',Heart],
    [!(data.ideas||[]).length,'Sin ideas de trading cargadas','Guardá tus hipótesis para comparar plan, ejecución y resultado.','Ver ideas','ideas',Lightbulb],
    [Number(s?.count||0)<10,'Performance en construcción','Cuando tengas más registros, vas a poder leer consistencia, drawdown y calidad con más precisión.','Revisar analytics','analytics',Trophy]
  ].filter(([show])=>show);
  if(!items.length)return null;
  return <div className="dashboardEmptyGrid">{items.map(([,title,text,cta,target,Icon])=><PremiumEmptyState key={title} title={title} text={text} cta={cta} icon={Icon} onClick={()=>setTab(target)}/>)}</div>
}
function ChecklistStatusCard({data,setTab}){
  const mine=[...(data.checklists||[])].sort((a,b)=>String(b.createdDate||safeDate(b.createdAt)||'').localeCompare(String(a.createdDate||safeDate(a.createdAt)||'')));
  const last=mine[0];
  const month=monthKey();
  const aplus=mine.filter(c=>String(c.createdDate||'').slice(0,7)===month && c.finalGreen===true && Number(c.score||0)>=85).length;
  const cm=checklistLinkedMetrics(data.trades||[]);
  const state=last?.finalGreen?'green':last?'red':'empty';
  return <Card title="Checklist operativo" sub="Sistema de revisión antes de ejecutar." className={`checklistDashCard ${state}`}>{last?<div className="checklistDash"><div><span>Última validación</span><b>{last.operationalState||last.status||'Sin estado'}</b><small>{last.asset||'—'} · Score {last.score||0}/100</small></div><div className={`lightOrb ${last.finalGreen?'green':'red'}`}>{last.finalGreen?'VERDE':'ROJA'}</div></div>:<PremiumEmptyState title="Todavía no validaste entradas" text="Usá el checklist operativo antes de ejecutar." cta="Abrir checklist" icon={CheckCircle2} onClick={()=>setTab('checklist')}/>}<div className="checklistStats checklistLinkedStats"><span>{formatMetricCard(aplus)} setups A+ este mes</span><span>{formatMetricCard(cm.withChecklist.length)} trades con checklist</span><span>{pct(cm.winrateGreen)} WR luz verde</span><span>{formatMetricCard(cm.aplus.length)} A+ · {cm.plAPlus>=0?'+':''}{money(cm.plAPlus)}</span><button className="primary compact" onClick={()=>setTab('checklist')}>Nueva validación</button></div></Card>
}
function ActivityFeed({data,setTab}){
  const toTime=v=>{
    if(!v) return 0;
    if(typeof v==='string') return new Date(v).getTime()||0;
    if(typeof v?.toDate==='function') return v.toDate().getTime();
    if(typeof v?.seconds==='number') return v.seconds*1000;
    return 0;
  };
  const items=[
    ...(data.trades||[]).map(t=>({type:'Trade',text:`${t.asset||'Trade'} ${Number(t.resultMoney||0)>=0?'+':''}${money(t.resultMoney)}`,meta:t.tradingDay||t.date||safeDate(t.createdAt)||'Sin fecha',target:'journal',time:toTime(t.tradingDay||t.date||t.createdAt)})),
    ...(data.checklists||[]).map(c=>({type:'Checklist',text:`${c.asset||'Validación'} · ${c.operationalState||c.status||'estado'}`,meta:`Score ${c.score||0}/100`,target:'checklist',time:toTime(c.createdDate||c.createdAt)})),
    ...(data.posts||[]).map(p=>({type:p.category||'Comunidad',text:p.body?.slice(0,70)||'Nueva publicación',meta:p.authorName||safeDate(p.createdAt)||'Trader',target:'community',time:toTime(p.createdAt||p.date||p.createdDate)})),
    ...(data.resultPosts||[]).map(r=>({type:'Resultado',text:`${r.account||'Cuenta'} · ${r.resultMoney?money(r.resultMoney):''}`,meta:r.authorName||safeDate(r.createdAt)||'Trader',target:'results',time:toTime(r.createdAt||r.date||r.createdDate)}))
  ].sort((a,b)=>b.time-a.time).slice(0,8);
  return <Card title="Actividad reciente" sub="Últimos movimientos del ecosistema."><div className="activityFeed">{items.map((it,i)=><button key={`${it.type}-${i}`} onClick={()=>setTab(it.target)}><span>{it.type}</span><b>{it.text}</b><small>{it.meta}</small></button>)}{!items.length&&<PremiumEmptyState title="Sin actividad reciente" text="Cuando haya trades, checklists o publicaciones aparecerán acá." cta="Registrar trade" icon={Activity} onClick={()=>setTab('journal')}/>}</div></Card>
}
function Dashboard({data,profile,setTab}){
  const {active,setActive,accounts,filtered}=useAccountFilter(data.trades,data.settings);
  const initial=accountInitial(data.settings,active);
  const scopedData=useMemo(()=>({...data,trades:filtered}),[data,filtered]);
  const s=useMemo(()=>calc(filtered,initial),[filtered,initial]);
  const byDay=groupTradesByDay(filtered);
  const monthly=Object.values(byDay).filter(d=>d.date.slice(0,7)===monthKey()).reduce((a,d)=>({days:a.days+1,total:a.total+d.total,r:a.r+calendarDayR(d),wins:a.wins+(d.total>0?1:0),losses:a.losses+(d.total<0?1:0),be:a.be+(d.total===0?1:0)}),{days:0,total:0,r:0,wins:0,losses:0,be:0});
  const spark=s.curve.slice(-8).map((p,i,arr)=>i?Number(p.equity||0)-Number(arr[i-1].equity||0):0);
  const closedTrades=filtered.filter(isClosedEvaluableTrade).sort((a,b)=>String(tradeDayKey(a)).localeCompare(String(tradeDayKey(b))) || tradeSortTime(a)-tradeSortTime(b));
  const todayKey=tradingDayKey();
  const todayTrades=filtered.filter(t=>getTradeOperationalDateKey(t)===todayKey);
  const dayPnL=todayTrades.reduce((a,t)=>a+Number(t.resultMoney||0),0);
  const weekTrades=filtered.filter(t=>{const d=getTradeOperationalDateKey(t); return d&&d>=weekStartISO();});
  const weekWins=weekTrades.filter(t=>Number(t.resultMoney)>0).length;
  const weekWr=weekTrades.length?weekWins/weekTrades.length*100:0;
  const riskSettings=getRiskSettings();
  const todayPlan=(data.dailyPlans||[]).find(p=>(p.dayKey||p.date)===todayKey);
  const riskGuard=evaluateRiskGuard(filtered,riskSettings,initial,todayPlan);
  const riskLevel=riskGuard.blocked?'Alto':Number(s.maxDD||0)>4?'Moderado':'Bajo';
  const riskTone=riskGuard.blocked?'negative':Number(s.maxDD||0)>4?'neutral':'positive';
  const hasProfitFactorSample=s.count>=10&&Number(s.grossLoss||0)>0;
  const profitFactor=hasProfitFactorSample?Number(s.profitFactor||0).toFixed(2):'Sin muestra';
  const profitFactorSub=hasProfitFactorSample?'Salud del sistema':'Requiere +10 operaciones';
  const hasWinLossSample=Number(s.wins||0)>0&&Number(s.losses||0)>0;
  const avgWinLoss=hasWinLossSample?Number(s.payoffRatio||0).toFixed(2):'Sin muestra';
  const avgWinLossSub=hasWinLossSample?`${formatMoneyCompactCard(s.avgWin)} / ${formatMoneyCompactCard(-Math.abs(Number(s.avgLoss||0)))}`:'Requiere ganancias y pérdidas';
  const expectancyValue=s.count<10?'Sin muestra':formatR(s.meanR);
  const expectancySub=s.count<10?'Requiere +10 operaciones':'Promedio R por operación';
  const streakInfo=(()=>{let sign=0,count=0; for(let i=closedTrades.length-1;i>=0;i--){const v=Number(closedTrades[i].resultMoney||0); const nextSign=v>0?1:v<0?-1:0; if(!nextSign)continue; if(!sign)sign=nextSign; if(nextSign!==sign)break; count++;} return {count,sign};})();
  const streakValue=streakInfo.count?`${streakInfo.count} ${streakInfo.count===1?'operación':'operaciones'}`:'Sin racha';
  const streakSub=streakInfo.count?(streakInfo.sign>0?'Último cierre positivo':'Último cierre negativo'):'Sin muestra reciente';
  const activeLabel=active==='__all__'?'Todas las cuentas':active;
  const disciplineReady=s.count>=5;
  const disciplineScore=disciplineReady?Math.round((Number(s.behaviorAvg||0)*.45)+(Number(s.discipline||0)*.35)+(Math.min(100,Number(s.qualityAvg||0))*.20)):null;
  const qualityLabel=Number(s.qualityAvg||0)>=95?'A+':Number(s.qualityAvg||0)>=80?'A':Number(s.qualityAvg||0)>=60?'B':Number(s.qualityAvg||0)>0?'C':'—';
  const mainSession=[...(s.bySession||[])].sort((a,b)=>b.count-a.count)[0]?.name||'Pendiente';
  const bestDayLabel=s.bestDay?`${String(s.bestDay.date).slice(5)} · ${formatMoneyCompactCard(s.bestDay.total)}`:'—';
  const worstDayLabel=s.worstDay?`${String(s.worstDay.date).slice(5)} · ${formatMoneyCompactCard(s.worstDay.total)}`:'—';
  const mapReady=s.count>=3;
  const dailyCurve=useMemo(()=>buildDailyNetCurve(filtered),[filtered]);
  const heatmapMatrix=useMemo(()=>buildOperationalHeatmap(filtered),[filtered]);
  const winLossTotal=Math.max(1,Number(s.wins||0)+Number(s.losses||0)+Number(s.breakeven||0));
  const payoffWin=Math.max(0,Number(s.avgWin||0));
  const payoffLoss=Math.abs(Number(s.avgLoss||0));
  const payoffTotal=Math.max(1,payoffWin+payoffLoss);
  const profitFactorGauge=hasProfitFactorSample?Math.min(100,Number(s.profitFactor||0)/2*100):0;
  const expectancyGauge=s.count>=10?clampScore((Number(s.meanR||0)+1)*50):Math.min(100,s.count*10);
  return <main className="page dashboardV38 dashboardClean">
    <DashboardHero activeLabel={activeLabel} headerActions={<AccountSwitcher active={active} setActive={setActive} accounts={accounts}/>}/>
    <DashboardKpiStrip s={s} monthly={monthly} dailyCurve={dailyCurve} spark={spark} winLossTotal={winLossTotal} avgWinLoss={avgWinLoss} avgWinLossSub={avgWinLossSub} payoffWin={payoffWin} payoffLoss={payoffLoss} payoffTotal={payoffTotal} profitFactor={profitFactor} profitFactorSub={profitFactorSub} hasProfitFactorSample={hasProfitFactorSample} profitFactorGauge={profitFactorGauge} streakValue={streakValue} streakSub={streakSub} streakInfo={streakInfo} expectancyValue={expectancyValue} expectancySub={expectancySub} expectancyGauge={expectancyGauge}/>
    <div className="dashboardVisualGrid">
      <div className="dashboardCalendarColumn">
        <CalendarHeatmapPreview trades={filtered} setTab={setTab} initial={initial}/>
        <Card title="Resumen estadístico" sub="Lectura compacta de calidad, sesión y días clave." className="dashboardStatsSummary">
          <div className="dashboardStatsGrid">
            <div><span>Calidad promedio</span><b>{mapReady?qualityLabel:'Pendiente'}</b><small>{mapReady?`${Math.round(s.qualityAvg||0)}/100`:'Requiere más operaciones'}</small></div>
            <div><span>Sesión principal</span><b>{mapReady?mainSession:'Pendiente'}</b><small>{mapReady?`${s.count} operaciones evaluadas`:'Sin datos suficientes'}</small></div>
            <div><span>Mejor día</span><b>{mapReady?bestDayLabel:'Pendiente'}</b><small>Resultado neto</small></div>
            <div><span>Peor día</span><b>{mapReady?worstDayLabel:'Pendiente'}</b><small>{s.worstDay?.total<0?'Control de pérdida':'Sin pérdidas registradas'}</small></div>
          </div>
        </Card>
      </div>
      <DashboardRightRail scopedData={scopedData} setTab={setTab} s={s} disciplineReady={disciplineReady} disciplineScore={disciplineScore} qualityLabel={qualityLabel} riskTone={riskTone} riskLevel={riskLevel} riskGuard={riskGuard} riskSettings={riskSettings} todayTrades={todayTrades} dayPnL={dayPnL} weekWr={weekWr} weekTrades={weekTrades} mapReady={mapReady} monthly={monthly} mainSession={mainSession}/>
      <DashboardAdvancedInsights s={s} disciplineScore={disciplineScore} hasProfitFactorSample={hasProfitFactorSample} hasWinLossSample={hasWinLossSample} dailyCurve={dailyCurve} heatmapMatrix={heatmapMatrix}/>
    </div>
  </main>
}
function Journal({data,profile}){
  const [form,setForm]=useState(null),[search,setSearch]=useState(''),[selectedTrade,setSelectedTrade]=useState(null),[checklistFilter,setChecklistFilter]=useState('Todos');
  const [shareTrade,setShareTrade]=useState(null),[shareDay,setShareDay]=useState(false);
  const [selectedDate,setSelectedDate]=useState(tradingDayKey());
  const [riskSettings,setRiskSettings]=useState(getRiskSettings());
  const {active,setActive,accounts,filtered}=useAccountFilter(data.trades,data.settings);
  const scopedData=useMemo(()=>({...data,trades:filtered}),[data,filtered]);
  useEffect(()=>{const h=()=>setRiskSettings(getRiskSettings()); window.addEventListener('mtc-risk-settings-updated',h); return()=>window.removeEventListener('mtc-risk-settings-updated',h)},[]);
  const dayPlan=(data.dailyPlans||[]).find(p=>p.dayKey===selectedDate&&p.userId===profile.uid);
  const guard=evaluateRiskGuard(filtered,riskSettings,accountInitial(data.settings,active),dayPlan);
  const tradeDates=[...new Set((filtered||[]).map(getTradeOperationalDateKey).filter(Boolean))].sort((a,b)=>b.localeCompare(a));
  const visibleDates=tradeDates.includes(selectedDate)?tradeDates:[selectedDate,...tradeDates].filter(Boolean);
  const list=filtered
    .filter(t=>getTradeOperationalDateKey(t)===selectedDate)
    .filter(t=>JSON.stringify(t).toLowerCase().includes(search.toLowerCase()))
    .filter(t=>checklistFilterMatch(t,checklistFilter));
  const tradeTimeValue=(trade,index=0)=>{
    const values=[trade?.updatedAt,trade?.createdAt,trade?.closedAt,trade?.dateTime,trade?.time,trade?.date,trade?.tradingDay];
    for(const value of values){
      if(!value) continue;
      if(typeof value?.toMillis==='function') return value.toMillis();
      if(Number.isFinite(Number(value?.seconds))) return Number(value.seconds)*1000+Number(value.nanoseconds||0)/1000000;
      const parsed=Date.parse(String(value));
      if(Number.isFinite(parsed)) return parsed;
    }
    return index;
  };
  const getLatestTradeForDay=day=>{
    const dayTrades=(filtered||[]).filter(t=>getTradeOperationalDateKey(t)===day);
    if(!dayTrades.length) return null;
    return dayTrades
      .map((trade,index)=>({trade,index,time:tradeTimeValue(trade,index)}))
      .sort((a,b)=>(b.time-a.time)||(b.index-a.index))[0].trade;
  };
  const selectCalendarDay=day=>{
    setSelectedDate(day);
    setSelectedTrade(getLatestTradeForDay(day));
  };
  useEffect(()=>{
    if(!selectedTrade?.id) return;
    if(!(data.trades||[]).some(t=>t.id===selectedTrade.id)) setSelectedTrade(null);
  },[data.trades,selectedTrade?.id]);
  useEffect(()=>{
    if(!shareTrade?.id) return;
    if(!(data.trades||[]).some(t=>t.id===shareTrade.id)) setShareTrade(null);
  },[data.trades,shareTrade?.id]);
  async function del(trade){
    await deleteTradeSafely(trade);
    if(selectedTrade?.id===trade?.id) setSelectedTrade(null);
    if(shareTrade?.id===trade?.id) setShareTrade(null);
  }
  async function importCsv(e){
    const f=e.target.files?.[0];
    if(!f)return;
    try{
      const rows=parseCsv(await f.text(),profile.uid);
      if(!rows.length){toast('El CSV está vacío o no tiene filas válidas.','error'); e.target.value=''; return;}
      const signature=t=>[profile.uid,getTradeOperationalDateKey(t)||'',String(t.asset||'').toUpperCase(),String(t.side||''),toNumberSafe(t.resultMoney),toNumberSafe(t.resultR),normalizeTradeSetup(t)].join('|');
      const existing=new Set((data.trades||[]).map(signature));
      let imported=0,skipped=0;
      for(const r of rows){
        const clean=normalizeImportedTradeRow(r,profile.uid);
        if(!String(clean.asset||'').trim()){skipped++; continue;}
        const sig=signature(clean);
        if(existing.has(sig)){skipped++; continue;}
        existing.add(sig);
        imported++;
        await addDoc(collection(db,'trades'),sanitizeFirestoreObject({...clean,uid:profile.uid,ownerId:profile.uid,createdAt:serverTimestamp()}));
      }
      toast(`${imported} trades importados${skipped?` · ${skipped} omitidos`:''}`);
    }catch(err){
      console.error('importCsv:error',err);
      toast('No se pudo importar el CSV. Revisá el formato del archivo.','error');
    }finally{e.target.value='';}
  }
  const activeNames=activeAccountNames(data.settings);
  const lastAccount=localStorage.getItem('mtc-last-account')||'';
  const defaultTradeAccount=activeNames.includes(lastAccount)?lastAccount:(active!=='__all__'&&activeNames.includes(active)?active:(activeNames[0]||'Cuenta principal'));
  const emptyForm={date:selectedDate||tradingDayKey(),tradingDay:selectedDate||tradingDayKey(),account:defaultTradeAccount,asset:'XAUUSD',session:'NY',side:'BUY',tradeSystem:'Sistema de Moisés',pattern:'Método Estructural: ChoCH en M1',confluencesUsed:[],otherSystem:'',setup:'',riskPct:riskSettings.riskPerTradePct||.5,entry:'',sl:'',tp:'',exit:'',riskMoney:'',result:'',resultMoney:'',resultPct:'',resultR:'',quality:'A',followedPlan:true,checklist:[],captureLink:'',captureFileName:'',emotionBefore:'',emotionDuring:'',emotionAfter:'',executionBehaviors:[],postTradeBehavior:'',calidadTesis:'',calidadEjecucion:'',calidadComportamiento:'',calidadRevision:'',respetoProceso:'',estadoMental:'',motivoOperacion:'',notasComportamiento:'',indiceCalidadContextual:'',alineacionMacro:'',alineacionHTF:'',alineacionIntra:'',liquidezClara:'',dxyConfirma:'',zonaConFuncion:'',notasContexto:'',privateJournal:'',lesson:''};
  const openNewTrade=()=>guard.blocked?toast('Modo reflexión activo hasta el próximo rollover 17:00 NY o ajustá límites en Riesgo'):setForm({...emptyForm,date:selectedDate||tradingDayKey(),tradingDay:selectedDate||tradingDayKey()});
  useEffect(()=>{
    const raw=localStorage.getItem('mtc-checklist-prefill');
    if(!raw)return;
    try{
      const prefill=JSON.parse(raw);
      const d=prefill.tradingDay||prefill.date||tradingDayKey();
      setSelectedDate(d);
      setForm({...emptyForm,...prefill,date:d,tradingDay:d});
      localStorage.removeItem('mtc-checklist-prefill');
    }catch(e){localStorage.removeItem('mtc-checklist-prefill')}
  },[]);
  useEffect(()=>{
    const id=localStorage.getItem('mtc-open-trade');
    if(!id||!(data.trades||[]).length)return;
    const t=(data.trades||[]).find(x=>x.id===id);
    if(t){setSelectedDate(getTradeOperationalDateKey(t)||tradingDayKey()); setSelectedTrade(t); localStorage.removeItem('mtc-open-trade');}
  },[data.trades]);
  useEffect(()=>{
    const d=localStorage.getItem('mtc-open-journal-date');
    if(d){setSelectedDate(d.slice(0,10)); localStorage.removeItem('mtc-open-journal-date');}
  },[]);
  const exportDisabled=!filtered.length;
  const filteredExportDisabled=!list.length;
  return <main className="page journalPage">
    <JournalHeader showMobileFab={!form} onNewTrade={openNewTrade} guard={guard}/>
    {form&&<TradeForm form={form} setForm={setForm} profile={profile} data={data} db={db} uploadFile={uploadFile} uid={uid} toast={toast}/>}
    <JournalActions
      accountSwitcher={<AccountSwitcher active={active} setActive={setActive} accounts={accounts}/>}
      onNewTrade={openNewTrade}
      checklistFilter={checklistFilter}
      onChecklistFilterChange={setChecklistFilter}
      search={search}
      onSearchChange={setSearch}
    />
    <JournalMainGrid
      dailyPlanPanel={<DailyPlanPanel profile={profile} data={scopedData} dayKey={selectedDate}/>}
      trades={list}
      onOpenTrade={setSelectedTrade}
      onDeleteTrade={del}
      onExportTrade={exportSingleTrade}
      onShareTrade={setShareTrade}
      onNewTrade={openNewTrade}
      calendarTrades={filtered}
      selectedDate={selectedDate}
      onSelectCalendarDay={selectCalendarDay}
      dayPlan={dayPlan}
    />
    <JournalToolsCard
      exportDisabled={exportDisabled}
      filteredExportDisabled={filteredExportDisabled}
      listTrades={list}
      onExportAll={(format)=>exportTradesCollection(filtered,format,'all')}
      onExportFiltered={(format)=>exportTradesCollection(list,format,'filtered')}
      onShareDay={()=>setShareDay(true)}
      onImportCsv={importCsv}
    />
    {selectedTrade&&<TradeDetailModal trade={selectedTrade} data={data} onClose={()=>setSelectedTrade(null)} onEdit={()=>{setForm(normalizeTradeArrayFields({...selectedTrade}));setSelectedTrade(null)}} onDelete={async()=>{await deleteTradeSafely(selectedTrade); setSelectedTrade(null);}} onExport={exportSingleTrade} ShareModal={TradeShareModal}/>}
    {shareTrade&&<TradeShareModal trade={shareTrade} onClose={()=>setShareTrade(null)}/>}
    {shareDay&&<DailyReviewShareModal trades={list} date={selectedDate} plan={dayPlan} onClose={()=>setShareDay(false)}/>}
  </main>
}
function DailyPlanPanel({profile,data,dayKey}){
  const existing=(data.dailyPlans||[]).find(p=>p.dayKey===dayKey&&p.userId===profile.uid)||{};
  const [plan,setPlan]=useState(existing);
  useEffect(()=>setPlan(existing),[existing.id,dayKey]);
  const ch=(k,v)=>setPlan(prev=>({...prev,[k]:v}));
  async function save(){const id=`${profile.uid}_${dayKey}`; await setDoc(doc(db,'dailyPlans',id),{...plan,userId:profile.uid,dayKey,updatedAt:serverTimestamp(),createdDate:dayKey},{merge:true}); toast('Jornada guardada')}
  return <Card title={`Jornada ${formatDateLabel(dayKey)}`} sub="Game plan, estado emocional y notas del día. Se guarda por fecha operativa."><div className="gamePlan dailyPlan"><input className="input" placeholder="Sesgo del día: bullish / bearish / neutral" value={plan.bias||''} onChange={e=>ch('bias',e.target.value)}/><input className="input" placeholder="Niveles clave / zonas de interés" value={plan.levels||''} onChange={e=>ch('levels',e.target.value)}/><input className="input" placeholder="Riesgo máximo del día" value={plan.maxRisk||''} onChange={e=>ch('maxRisk',e.target.value)}/><input className="input" placeholder="Estado emocional inicial" value={plan.emotion||''} onChange={e=>ch('emotion',e.target.value)}/><TextareaWithEmoji className="input wide" placeholder="Game plan / notas de la jornada: qué espero ver, qué invalida mi plan, qué aprendí hoy." value={plan.notes||''} onChange={e=>ch('notes',e.target.value)}/></div><button className="primary" onClick={save}>Guardar jornada</button></Card>
}

function Field({label,hint,children}){return <label className="field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>}
function DecimalInput({className='input',value,onChange,placeholder,prefix='',suffix='',live=false}){
  const setVal=(v)=>{const nv=normalizeNumInput(v); if(nv!==null) onChange(nv)};
  const handle=e=>setVal(e.target.value);
  const addDot=()=>{const s=String(value ?? ''); if(!s.includes('.')&&!s.includes(',')) onChange((s||'0')+'.')};
  const toggleMinus=()=>{const s=String(value ?? ''); onChange(s.startsWith('-')?s.slice(1):('-'+(s||'')))};
  const input=<input className={className} type="text" inputMode="decimal" enterKeyHint="done" autoComplete="off" placeholder={placeholder} value={value ?? ''} onChange={handle} onBeforeInput={e=>{const next=String(value??'')+String(e.data??''); if(e.data && normalizeNumInput(next)===null) e.preventDefault();}}/>;
  return <div className={`metricInputWrap signedDecimal ${prefix?'moneyWrap':''}`}>{prefix&&<em>{prefix}</em>}{input}<button type="button" className="numAssist" onClick={toggleMinus}>−</button><button type="button" className="numAssist" onClick={addDot}>.</button>{suffix&&<em>{suffix}</em>}</div>;
}

function SystemPage(){return <main className="page"><section className="heroSystem"><span className="pill gold">Sistema operativo del club</span><h2>Canal de Moisés</h2><p>Una guía rápida para consultar antes, durante y después de operar. El objetivo es evitar improvisación y convertir cada entrada en una decisión medible.</p></section><div className="grid2"><Card title="Los 7 Mandamientos de Moisés" sub="Checklist madre del sistema"><div className="mandamientos">{mandamientos.map((m,i)=><div key={i} className="mandamiento"><b>{i+1}</b><span>{m}</span></div>)}</div></Card><Card title="Regla de ejecución" sub="Filtro para no anticipar"><div className="ruleBox"><h3>Contexto → Liquidez → ChoCH → Trigger → RR</h3><p>No se entra por ansiedad. Se entra cuando el mercado entrega contexto, toma liquidez, confirma cambio de carácter y ofrece ubicación lógica de stop.</p></div><div className="ruleMini"><span>Si la distancia M15 → ChoCH es corta, se puede ejecutar más directo.</span><span>Si la distancia es amplia, esperar descuento o zona refinada.</span><span>Si el trade no llega a 1:2, se descarta o se reduce expectativa.</span></div></Card></div><Card title="Patrones de Moisés" sub="Modelos visuales que debe reconocer el trader"><div className="patternGrid">{patronesMoises.map((p,i)=><article key={i} className="patternCard"><Lightbulb size={18}/><h3>{p.title}</h3><p>{p.text}</p></article>)}</div></Card><Card title="Cómo usar esta sección"><div className="readingProtocol"><div><b>Antes del trade</b><p>Revisar los 7 mandamientos y validar que el setup no sea impulsivo.</p></div><div><b>Después del trade</b><p>Registrar en Journal el patrón usado, el resultado en $, %, R y la lección.</p></div><div><b>Fin de semana</b><p>Buscar el patrón que más dinero generó y el error que más dinero costó.</p></div></div></Card></main>}

const ecosystemStages=[
  {title:'Antes de operar',label:'Preparación',icon:Shield,text:'Antes de buscar una entrada, prepará el contexto. Un proceso profesional no empieza por el gráfico: empieza por el estado, el riesgo y el plan.',points:['Dashboard','Contexto','Checklist','Riesgo del día','Reglas personales']},
  {title:'Durante la sesión',label:'Ejecución',icon:Target,text:'Durante la sesión, el objetivo no es operar más: es operar mejor. Cada decisión debe estar respaldada por contexto, gestión y una razón clara.',points:['Registrar ideas','Validar checklist','Respetar riesgo','Evitar sobreoperar']},
  {title:'Después de operar',label:'Registro',icon:LineChart,text:'Después de operar, la sesión todavía no terminó. El progreso aparece cuando cada ejecución se convierte en información útil.',points:['Cargar trade','Resultado','Captura','Setup','Error','Lección']},
  {title:'Cierre emocional',label:'Criterio',icon:Heart,text:'Cerrá tu jornada con una revisión honesta: qué sentiste, qué pensamiento dominó tu sesión y qué decisión querés mejorar mañana.',points:[]},
  {title:'Revisión semanal',label:'Mejora',icon:BarChart3,text:'Una semana de operaciones sin revisión es solo actividad. Una semana medida se convierte en criterio.',points:['Analytics','Errores repetidos','Mejores setups','Peores horarios','Ajustes al plan']},
  {title:'Mentalidad del ecosistema',label:'Sistema',icon:Sparkles,text:'La plataforma está diseñada para transformar actividad operativa en evidencia, criterio y mejora continua.',points:[]}
];
const ecosystemMetrics=[['15 min/día','Rutina diaria'],['5 etapas','Proceso completo'],['1 proceso','Evolución continua']];
const idealRoutine=['3 min revisar dashboard y contexto','3 min checklist y riesgo','Operar solo si hay setup','5 min registrar trade','4 min revisar lección y estado mental'];
function EcosystemGuidePage(){
  return <main className="page ecosystemGuidePage">
    <section className="heroSystem ecosystemHero">
      <div className="ecosystemHeroCopy">
        <span className="pill gold"><Sparkles size={14}/> Sistema diario</span>
        <h2>Cómo usar el ecosistema</h2>
        <p>Una guía diaria para convertir tu operativa en un proceso medible, repetible y profesional.</p>
        <div className="ecosystemHeroMeta"><span>Plan</span><span>Ejecución</span><span>Registro</span><span>Revisión</span></div>
      </div>
      <aside className="ecosystemHeroPanel" aria-label="Resumen del sistema diario">
        <span>Sistema diario</span>
        <b>Plan → Ejecución → Registro → Revisión</b>
        <div className="ecosystemMetricStrip">{ecosystemMetrics.map(([value,label])=><div key={value}><strong>{value}</strong><small>{label}</small></div>)}</div>
      </aside>
    </section>
    <div className="ecosystemStageGrid">
      {ecosystemStages.map((stage,index)=>{
        const Icon=stage.icon;
        return <article className="ecosystemStageCard" key={stage.title}>
          <div className="ecosystemStageTop"><span>{String(index+1).padStart(2,'0')}</span><em>{stage.label}</em><Icon size={19}/></div>
          <div className="ecosystemStageBody"><h3>{stage.title}</h3>
          <p>{stage.text}</p>
          </div>
          {!!stage.points.length&&<div className="ecosystemPointList">{stage.points.map(point=><span key={point}>{point}</span>)}</div>}
        </article>
      })}
    </div>
    <Card title="Rutina ideal en 15 minutos" sub="Un recorrido simple para sostener criterio todos los días.">
      <div className="idealRoutine">
        {idealRoutine.map((step,index)=><div key={step} className="idealRoutineStep"><b>{index+1}</b><span>{step}</span></div>)}
      </div>
    </Card>
  </main>
}

const emotionalInitial={
  state:'Neutral',
  anxiety:4,
  confidence:6,
  discipline:7,
  followedPlan:'Sí',
  fomo:false,
  recoveryImpulse:false,
  anxiousTrade:false,
  dominantThought:'',
  emotionalWin:'',
  tomorrowCorrection:'',
  lesson:'',
  freeWriting:''
};
const emotionalStates=['Calmo','Neutral','Ansioso','Confiado','Frustrado','Cansado','Enfocado'];
const avgEmotion=(items,key)=>items.length?Number((items.reduce((sum,item)=>sum+Number(item[key]||0),0)/items.length).toFixed(1)):0;
function mostRepeatedMood(items=[]){
  const counts=items.reduce((acc,item)=>{const mood=item.mood||'Neutral'; acc[mood]=(acc[mood]||0)+1; return acc;},{});
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
}
function emotionalEntryFromDoc(docEntry={}){
  return {
    state:docEntry.mood||'Neutral',
    anxiety:Number(docEntry.anxietyLevel||4),
    confidence:Number(docEntry.confidenceLevel||6),
    discipline:Number(docEntry.disciplineLevel||7),
    followedPlan:docEntry.followedPlan||'Sí',
    fomo:docEntry.feltFomo===true,
    recoveryImpulse:docEntry.feltRevengeImpulse===true,
    anxiousTrade:docEntry.tradedFromAnxiety===true,
    dominantThought:docEntry.dominantThought||'',
    emotionalWin:docEntry.didWell||'',
    tomorrowCorrection:docEntry.needsCorrection||'',
    lesson:docEntry.lesson||'',
    freeWriting:docEntry.freeWriting||''
  };
}
function emotionalPayloadFromEntry(entry,profile,date){
  return sanitizeFirestoreObject({
    userId:profile.uid,
    date,
    mood:entry.state,
    anxietyLevel:Number(entry.anxiety||0),
    confidenceLevel:Number(entry.confidence||0),
    disciplineLevel:Number(entry.discipline||0),
    followedPlan:entry.followedPlan,
    feltFomo:entry.fomo===true,
    feltRevengeImpulse:entry.recoveryImpulse===true,
    tradedFromAnxiety:entry.anxiousTrade===true,
    dominantThought:entry.dominantThought,
    didWell:entry.emotionalWin,
    needsCorrection:entry.tomorrowCorrection,
    lesson:entry.lesson,
    freeWriting:entry.freeWriting,
    updatedAt:serverTimestamp()
  });
}
function EmotionalScale({label,value,onChange}){
  return <label className="emotionalScale"><span>{label}</span><div><input type="range" min="1" max="10" value={value} onChange={e=>onChange(Number(e.target.value))}/><b>{value}/10</b></div></label>
}
function EmotionalToggle({label,checked,onChange}){
  return <button type="button" className={`emotionalToggle ${checked?'on':''}`} onClick={()=>onChange(!checked)}><span>{checked?'Sí':'No'}</span>{label}</button>
}
function EmotionalJournalPage({data,profile}){
  const dayKey=today();
  const journals=useMemo(()=>(data.emotionalJournals||[]).filter(x=>x.userId===profile.uid).sort((a,b)=>String(b.date||safeDate(b.createdAt)||'').localeCompare(String(a.date||safeDate(a.createdAt)||''))),[data.emotionalJournals,profile.uid]);
  const weeklySummary=useMemo(()=>{
    const items=journals.slice(0,7);
    const anxiety=avgEmotion(items,'anxietyLevel');
    const confidence=avgEmotion(items,'confidenceLevel');
    const discipline=avgEmotion(items,'disciplineLevel');
    const signals=[];
    if(items.length){
      if(anxiety>=7) signals.push('Alta carga emocional');
      if(discipline>=7) signals.push('Buena adherencia al proceso');
      if(confidence<=4) signals.push('Confianza baja');
      signals.push(items.length>=3?'Patrón inicial detectable':'Necesitás más cierres para detectar patrones');
    }
    return {items,count:items.length,anxiety,confidence,discipline,mood:mostRepeatedMood(items),signals};
  },[journals]);
  const todayEntry=useMemo(()=>journals.find(x=>x.date===dayKey),[journals,dayKey]);
  const [entry,setEntry]=useState(emotionalInitial);
  const [editingDate,setEditingDate]=useState(dayKey);
  const [ready,setReady]=useState(false);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState('');
  const editingDoc=useMemo(()=>journals.find(x=>x.date===editingDate),[journals,editingDate]);
  useEffect(()=>{
    setEntry(todayEntry?emotionalEntryFromDoc(todayEntry):emotionalInitial);
    setEditingDate(dayKey);
    setReady(false);
    setSaveError('');
  },[todayEntry?.id,todayEntry?.updatedAt]);
  const ch=(key,value)=>{setEntry(v=>({...v,[key]:value})); setReady(false);};
  const saveReflection=async()=>{
    setSaving(true);
    setSaveError('');
    try{
      const id=`${profile.uid}_${editingDate}`;
      const payload=emotionalPayloadFromEntry(entry,profile,editingDate);
      await setDoc(doc(db,'emotionalJournals',id),editingDoc?payload:{...payload,createdAt:serverTimestamp()},{merge:true});
      setReady(true);
      toast(editingDoc?'Cierre emocional actualizado.':'Cierre emocional guardado. Tu proceso queda registrado para futuras revisiones.','success');
    }catch(e){
      console.error('save emotional journal',e);
      setSaveError('No pudimos completar la acción. Revisá tu conexión e intentá de nuevo.');
      toast('No pudimos completar la acción. Revisá tu conexión e intentá de nuevo.','error');
    }finally{
      setSaving(false);
    }
  };
  const clearForm=()=>{setEntry(emotionalInitial); setReady(false); setSaveError('');};
  const editJournal=item=>{
    setEditingDate(item.date||safeDate(item.createdAt));
    setEntry(emotionalEntryFromDoc(item));
    setReady(false);
    setSaveError('');
    document.querySelector('.emotionalForm')?.scrollIntoView?.({behavior:'smooth',block:'start'});
  };
  const deleteToday=async()=>{
    if(!todayEntry) return;
    if(!confirm('¿Querés borrar el cierre emocional de hoy?')) return;
    setSaving(true);
    setSaveError('');
    try{
      await deleteDoc(doc(db,'emotionalJournals',`${profile.uid}_${dayKey}`));
      setEntry(emotionalInitial);
      setEditingDate(dayKey);
      setReady(false);
      toast('Cierre emocional eliminado.','success');
    }catch(e){
      console.error('delete emotional journal',e);
      setSaveError('No pudimos completar la acción. Revisá tu conexión e intentá de nuevo.');
      toast('No pudimos completar la acción. Revisá tu conexión e intentá de nuevo.','error');
    }finally{
      setSaving(false);
    }
  };
  const isEditingToday=!!todayEntry && editingDate===dayKey;
  return <main className="page emotionalJournalPage">
    <section className="heroSystem emotionalHero">
      <div className="emotionalHeroCopy">
        <span className="pill gold"><Heart size={14}/> Cierre operativo</span>
        <h2>Journal emocional</h2>
        <p>Cerrá cada sesión con claridad mental, detectá patrones de conducta y convertí tus emociones en información útil.</p>
      </div>
      <aside className="emotionalHeroPanel">
        <span>Cierre operativo</span>
        <div><b>1 entrada diaria</b><small>Un cierre simple para observar tu proceso.</small></div>
        <div><b>Estado mental</b><small>Claridad antes, durante y después de operar.</small></div>
        <div><b>Lección para mañana</b><small>Una decisión concreta para mejorar tu próxima sesión.</small></div>
        <p>La consistencia no se mide solo por el resultado. También se mide por la calidad de tus decisiones.</p>
      </aside>
    </section>

    <section className="emotionalCloseBlock">
      <div><span className="pill gold"><CheckCircle2 size={13}/> Hábito diario</span><h3>Cierre obligatorio de sesión</h3><p>Antes de dar por terminada tu jornada, registrá cómo operaste por dentro. Este cierre te ayuda a separar resultado de proceso y a detectar patrones que se repiten.</p></div>
      <div className="emotionalCloseSteps"><span>Estado</span><span>Conducta</span><span>Lección</span></div>
    </section>

    <div className="emotionalGrid">
      <Card title="Registro del día" sub="Una lectura breve para ordenar tu sesión desde adentro.">
        {isEditingToday&&<div className="emotionalEditNotice"><span>Editando cierre de hoy</span><p>Podés ajustar tu reflexión y volver a guardarla sin duplicar entradas.</p></div>}
        <div className="emotionalForm">
          <div className="emotionalFormSection">
            <h3>Estado mental</h3>
            <div className="emotionalSectionGrid">
              <label className="emotionalField"><span>Estado emocional principal</span><select className="input" value={entry.state} onChange={e=>ch('state',e.target.value)}>{emotionalStates.map(x=><option key={x}>{x}</option>)}</select></label>
              <EmotionalScale label="Ansiedad antes de operar" value={entry.anxiety} onChange={v=>ch('anxiety',v)}/>
              <EmotionalScale label="Confianza" value={entry.confidence} onChange={v=>ch('confidence',v)}/>
              <EmotionalScale label="Disciplina" value={entry.discipline} onChange={v=>ch('discipline',v)}/>
            </div>
          </div>
          <div className="emotionalFormSection">
            <h3>Conducta operativa</h3>
            <div className="emotionalSectionGrid">
              <label className="emotionalField"><span>¿Seguiste tu plan?</span><select className="input" value={entry.followedPlan} onChange={e=>ch('followedPlan',e.target.value)}><option>Sí</option><option>Parcialmente</option><option>No</option></select></label>
              <div className="emotionalToggleGrid">
                <EmotionalToggle label="¿Sentiste FOMO?" checked={entry.fomo} onChange={v=>ch('fomo',v)}/>
                <EmotionalToggle label="¿Sentiste impulso de recuperar?" checked={entry.recoveryImpulse} onChange={v=>ch('recoveryImpulse',v)}/>
                <EmotionalToggle label="¿Operaste por ansiedad o aburrimiento?" checked={entry.anxiousTrade} onChange={v=>ch('anxiousTrade',v)}/>
              </div>
            </div>
          </div>
          <div className="emotionalFormSection">
            <h3>Reflexión</h3>
            <div className="emotionalSectionGrid">
              <label className="emotionalField wide"><span>Pensamiento dominante del día</span><input className="input" value={entry.dominantThought} onChange={e=>ch('dominantThought',e.target.value)} placeholder="Ej: necesitaba recuperar, pude esperar, estaba apurado..."/></label>
              <label className="emotionalField"><span>Qué hiciste bien emocionalmente</span><textarea className="input" value={entry.emotionalWin} onChange={e=>ch('emotionalWin',e.target.value)} placeholder="Reconocí una señal interna y cuidé mi decisión."/></label>
              <label className="emotionalField"><span>Qué querés corregir mañana</span><textarea className="input" value={entry.tomorrowCorrection} onChange={e=>ch('tomorrowCorrection',e.target.value)} placeholder="Una acción simple para mejorar tu próxima sesión."/></label>
              <label className="emotionalField"><span>Lección del día</span><textarea className="input" value={entry.lesson} onChange={e=>ch('lesson',e.target.value)} placeholder="La decisión más importante que te dejó la jornada."/></label>
              <label className="emotionalField"><span>Escritura libre</span><textarea className="input tall" value={entry.freeWriting} onChange={e=>ch('freeWriting',e.target.value)} placeholder="Escribí sin filtro: emoción, pensamiento, decisión, aprendizaje."/></label>
            </div>
          </div>
        </div>
        <div className="emotionalActions"><button className="primary" onClick={saveReflection} disabled={saving}><CheckCircle2 size={16}/>{saving?'Guardando cierre...':editingDoc?'Actualizar cierre':'Guardar reflexión'}</button><button className="ghost" onClick={clearForm} disabled={saving}>Limpiar formulario</button>{isEditingToday&&<button className="ghost danger" onClick={deleteToday} disabled={saving}>Borrar cierre</button>}{ready&&<span className="emotionalReady"><CheckCircle2 size={15}/>{editingDoc?'Cierre emocional actualizado.':'Cierre emocional guardado. Tu proceso queda registrado para futuras revisiones.'}</span>}{saveError&&<span className="emotionalReady error"><AlertTriangle size={15}/>{saveError}</span>}</div>
      </Card>

      <div className="emotionalSideStack">
        <Card title="Resumen emocional semanal" sub="Últimos cierres registrados.">
          {weeklySummary.count?<div className="emotionalWeekly">
            <p>Tu consistencia emocional empieza a verse cuando repetís el hábito. Cada cierre suma evidencia sobre cómo tomás decisiones.</p>
            <div className="emotionalWeeklyMetrics"><div><span>Ansiedad</span><b>{weeklySummary.anxiety}/10</b></div><div><span>Confianza</span><b>{weeklySummary.confidence}/10</b></div><div><span>Disciplina</span><b>{weeklySummary.discipline}/10</b></div><div><span>Estado frecuente</span><b>{weeklySummary.mood}</b></div><div><span>Cierres</span><b>{weeklySummary.count}</b></div></div>
            <div className="emotionalSignalList">{weeklySummary.signals.map(signal=><span key={signal}>{signal}</span>)}</div>
          </div>:<div className="emotionalEmpty"><b>Todavía no hay cierres registrados.</b><p>Completá tu primer cierre para empezar a construir un mapa de tus patrones emocionales y decisiones repetidas.</p></div>}
        </Card>
        <Card title="Lectura del patrón" sub="Calidad emocional de la ejecución.">
          <div className="emotionalPattern"><Heart size={20}/><p>Este módulo está diseñado para ayudarte a observar cómo tu estado interno afecta tu ejecución. Con el tiempo, tus respuestas empiezan a revelar patrones: cuándo respetás tu plan, cuándo te exponés de más y qué emociones aparecen antes de tus peores decisiones.</p></div>
          <div className="emotionalPatternChips"><span>FOMO</span><span>Impulso</span><span>Disciplina</span></div>
        </Card>
        <Card title="Historial" sub="Reflexiones de tus sesiones.">
          {data.loading?<div className="emotionalEmpty"><b>Cargando tus cierres...</b><p>Estamos preparando tu historial de reflexión.</p></div>:journals.length?<div className="emotionalHistoryList">{journals.slice(0,6).map((item,index)=><div className="emotionalHistoryCard" key={item.id}><div className="emotionalHistoryTop"><span>{index===0?'Último cierre':'Cierre'}</span>{index===0&&<button className="ghost compact" onClick={()=>editJournal(item)}>Editar</button>}</div><b>{formatDateLabel(item.date||safeDate(item.createdAt))}</b><p>{item.mood||'Neutral'} · Ansiedad {Number(item.anxietyLevel||0)}/10 · Confianza {Number(item.confidenceLevel||0)}/10 · Disciplina {Number(item.disciplineLevel||0)}/10</p><small>{item.lesson||'Sin lección escrita todavía.'}</small></div>)}</div>:<div className="emotionalEmpty"><b>Todavía no hay cierres registrados.</b><p>Completá tu primer cierre para empezar a construir un mapa de tus patrones emocionales y decisiones repetidas.</p></div>}
        </Card>
      </div>
    </div>
  </main>
}
function driveThumb(url=''){
  const s=String(url||'');
  const m=s.match(/\/d\/([^/]+)/)||s.match(/[?&]id=([^&]+)/);
  return m?.[1] ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000` : '';
}
function BookCover({book,index=0}){
  const src=book.coverUrl || driveThumb(book.pdfLink);
  const initials=String(book.title||'Libro').split(/\s+/).filter(Boolean).slice(0,3).map(w=>w[0]).join('').toUpperCase();
  const palette=['gold','blue','violet','cyan','green'];
  const tone=palette[index%palette.length];
  const [failed,setFailed]=useState(false);
  if(src && !failed){
    return <div className="bookCover image"><img src={src} alt={`Portada de ${book.title}`} onError={()=>setFailed(true)}/><span className="pdfRibbon">PDF</span></div>;
  }
  return <div className={`bookCover generated ${tone}`}><span className="coverBadge">MTC Library</span><b>{initials||'PDF'}</b><small>{book.category||'Lectura'}</small><em>{book.author||'Biblioteca'}</em></div>;
}



function ChecklistPage({data,profile}){
  const base={asset:'XAUUSD',session:'NY',direction:'Compra',comment:'',captures:'',answers:{q1:'',q2:'',q3:'',q4:'',q5:'',q6:'',q7:'',q8:''},result:'No ejecutada',mentorReview:'',mentorComment:''};
  const [form,setForm]=useState(base);
  const [selected,setSelected]=useState(null);
  const [lastSaved,setLastSaved]=useState(null);
  const admin=isPrivileged(profile);
  const validations=data.checklists||[];
  useEffect(()=>{
    const id=localStorage.getItem('mtc-open-checklist');
    if(!id||!validations.length)return;
    const c=validations.find(x=>x.id===id);
    if(c){setSelected(c); localStorage.removeItem('mtc-open-checklist');}
  },[validations]);
  const setA=(k,v)=>setForm(f=>({...f,answers:{...f.answers,[k]:v}}));
  const q=form.answers;
  const ctxQuestions=['q1','q2','q3','q4','q5'];
  const execQuestions=['q6','q7'];
  const reviewOptions=['Aprobada','Mal interpretada','Entrada tarde','Sin liquidez real','Mala zona M15','Buen contexto','Buen patrón','No era A+','Faltó RR','Operó antes del evento','Persiguió precio'];
  const resultOptions=['No ejecutada','Observación','Setup en formación','Ejecutada','Invalidada','Profit','Stop','BE'];
  const patterns=['Método estructural: ChoCH menor a 8 pips','Método estructural: ChoCH mayor a 8 pips','Volumen x desplazamiento','Envolvente + ChoCH','Estrella de la mañana','Estrella de la noche','Hombro cabeza hombro','Hombro cabeza hombro invertido','Secuencia de 3 velas','No confirmó ningún patrón'];
  function evaluate(){
    const blockers=[]; const warns=[]; let score=0;
    const sessionOk=['Sí, Asia','Sí, Londres','Sí, NY','Sí, post evento'].includes(q.q1);
    const eventPending=q.q2==='Sí, evento fuerte pendiente';
    const eventUnchecked=q.q2==='No revisé calendario económico';
    const eventOk=!!q.q2 && !eventPending && !eventUnchecked;
    const priceExecutable=['Saliendo del balance','En desequilibrio bullish','En desequilibrio bearish'].includes(q.q3);
    const inBalance=q.q3==='En balance';
    const tooExtended=q.q3==='Demasiado extendido';
    const unclearPrice=q.q3==='No lo tengo claro';
    const liquidityOk=!!q.q4 && !['No tomó liquidez relevante','No lo tengo claro'].includes(q.q4);
    const noLiquidity=q.q4==='No tomó liquidez relevante';
    const zoneM15Ok=!!q.q5 && q.q5!=='No hay zona clara';
    const contextOk=sessionOk && eventOk && priceExecutable && liquidityOk && zoneM15Ok;
    const priceInZone=['Sí, está dentro de la zona','Sí, tocó zona y confirmó reacción'].includes(q.q6);
    const nearZone=q.q6==='Está muy cerca';
    const rrOk=['Sí, RR 1:2 o más','Sí, RR 1:3 o más'].includes(q.q7);
    const executionOk=contextOk && priceInZone && rrOk;
    const patternOk=(contextOk && executionOk) && !!q.q8 && q.q8!=='No confirmó ningún patrón';
    const finalGreen=contextOk && executionOk && patternOk;

    if(sessionOk)score+=10;
    if(eventOk)score+=10;
    if(priceExecutable)score+=15;
    if(liquidityOk)score+=20;
    if(zoneM15Ok)score+=15;
    if(priceInZone)score+=10; else if(nearZone)score+=4;
    if(rrOk)score+=10;
    if(patternOk)score+=10;
    score=Math.min(100,score);

    function getOperationalState(){
      if(!q.q1&&!q.q2&&!q.q3&&!q.q4&&!q.q5) return 'COMPLETAR CONTEXTO';
      if(!sessionOk) return q.q1==='No, fuera de sesión clara'?'LUZ ROJA — NO DEBÉS EJECUTAR':'COMPLETAR CONTEXTO';
      if(eventPending) return 'ESPERAR POST EVENTO';
      if(eventUnchecked||!q.q2) return 'COMPLETAR CONTEXTO';
      if(inBalance) return 'ESPERAR SALIDA DEL BALANCE';
      if(tooExtended) return 'NO PERSEGUIR PRECIO';
      if(unclearPrice||!priceExecutable) return 'COMPLETAR CONTEXTO';
      if(noLiquidity) return 'SIN LIQUIDEZ IMPORTANTE';
      if(!liquidityOk) return 'COMPLETAR CONTEXTO';
      if(!zoneM15Ok) return q.q5==='No hay zona clara'?'SIN ZONA M15':'COMPLETAR CONTEXTO';
      if(q.q6==='Todavía no llegó') return 'ESPERAR LLEGADA A ZONA';
      if(q.q6==='Ya se pasó') return 'NO PERSEGUIR PRECIO';
      if(q.q6==='No lo tengo claro'||!q.q6) return 'ESPERAR LLEGADA A ZONA';
      if(nearZone) return 'ESPERAR LLEGADA A ZONA';
      if(!rrOk) return q.q7?'RR INVÁLIDO':'RR INVÁLIDO';
      if(q.q8==='No confirmó ningún patrón') return 'ESPERAR CONFIRMACIÓN M1';
      if(!patternOk) return 'ESPERAR CONFIRMACIÓN M1';
      return 'LUZ VERDE — PODÉS EJECUTAR';
    }

    const opState=getOperationalState();
    const reasonMap={
      'COMPLETAR CONTEXTO':'Primero validá sesión, calendario económico, salida del balance/desequilibrio, liquidez importante y zona M15.',
      'ESPERAR POST EVENTO':'Hay evento económico fuerte pendiente. No anticipar la noticia. Esperar reacción post evento.',
      'ESPERAR SALIDA DEL BALANCE':'El precio está en balance. No buscar ejecución hasta que exista salida o desequilibrio direccional.',
      'SIN LIQUIDEZ IMPORTANTE':'Sin liquidez importante, el setup no califica como entrada de alta probabilidad.',
      'SIN ZONA M15':'No debés ejecutar. No hay zona de trabajo M15 válida.',
      'ESPERAR LLEGADA A ZONA':'El precio todavía no está dentro de la zona. Esperá llegada exacta o reacción clara.',
      'NO PERSEGUIR PRECIO':'No perseguir precio. La oportunidad ya se pasó o está demasiado extendida.',
      'RR INVÁLIDO':'No debés ejecutar. El trade no paga el riesgo o el RR no fue calculado.',
      'ESPERAR CONFIRMACIÓN M1':'Falta confirmación M1. Patrón sin contexto no es entrada.',
      'LUZ ROJA — NO DEBÉS EJECUTAR':'Checklist incompleto = no ejecutar.',
      'LUZ VERDE — PODÉS EJECUTAR':'El contexto está validado, el precio está en zona, el RR paga y hay patrón M1 confirmado.'
    };
    if(eventPending) blockers.push(reasonMap['ESPERAR POST EVENTO']);
    if(inBalance) blockers.push(reasonMap['ESPERAR SALIDA DEL BALANCE']);
    if(noLiquidity) blockers.push(reasonMap['SIN LIQUIDEZ IMPORTANTE']);
    if(q.q5==='No hay zona clara') blockers.push(reasonMap['SIN ZONA M15']);
    if(q.q6==='Ya se pasó'||tooExtended) blockers.push(reasonMap['NO PERSEGUIR PRECIO']);
    if(q.q6==='Todavía no llegó') warns.push(reasonMap['ESPERAR LLEGADA A ZONA']);
    if(nearZone) warns.push('Está muy cerca: esperar llegada exacta o confirmación clara antes de ejecutar.');
    if(q.q7==='No, menor a 1:2'||q.q7==='No lo calculé') blockers.push(reasonMap['RR INVÁLIDO']);

    const quality=finalGreen&&score>=85?'Setup A+':score>=70?'Setup en formación':score>=50?'Contexto incompleto':'No operar';
    const blockStatus={
      context:contextOk?'Validado':ctxQuestions.some(k=>q[k])?'En progreso':'Bloqueado',
      execution:!contextOk?'Bloqueado':executionOk?'Validado':execQuestions.some(k=>q[k])?'En progreso':'En progreso',
      pattern:!(contextOk&&executionOk)?'Bloqueado':patternOk?'Validado':q.q8==='No confirmó ningún patrón'?'Rechazado':q.q8?'En progreso':'En progreso'
    };
    return {score,blockers,warns,contextOk,executionOk,patternOk,finalGreen,green:finalGreen,operationalState:opState,reason:reasonMap[opState]||'Checklist incompleto = no ejecutar.',quality,blockStatus,label:finalGreen?'LUZ VERDE — Podés ejecutar':'LUZ ROJA — No debés ejecutar'};
  }
  const ev=evaluate();
  async function save(){
    let finalResult=form.result;
    if(!ev.finalGreen){
      const ok=confirm('Esta validación no está habilitada para ejecutar. Se guardará como observación o setup en formación.');
      if(!ok)return;
      if(finalResult==='Ejecutada'||finalResult==='Profit'||finalResult==='Stop') finalResult='Setup en formación';
    }
    const saved={userId:profile.uid,userName:profile.name,asset:form.asset,session:form.session,direction:form.direction,comment:form.comment,captures:form.captures,answers:form.answers,score:ev.score,status:ev.label,operationalState:ev.operationalState,quality:ev.quality,contextOk:ev.contextOk,executionOk:ev.executionOk,patternOk:ev.patternOk,finalGreen:ev.finalGreen,green:ev.green,result:finalResult,createdAt:serverTimestamp(),createdDate:today(),tradingDay:tradingDayKey()};
    const refChecklist=await addDoc(collection(db,'checklists'),saved);
    const savedWithId={id:refChecklist.id,...saved,createdAt:new Date()};
    setSelected(savedWithId);
    setLastSaved(savedWithId);
    toast('Checklist guardado','success'); setForm(base);
  }
  async function review(v,patch){ await setDoc(doc(db,'checklists',v.id),{...patch,reviewedAt:serverTimestamp(),reviewedBy:profile.uid},{merge:true}); toast('Revisión guardada'); }
  async function removeValidation(v){
    if(!v?.id)return;
    const lt=findLinkedTrade(data,v);
    const msg=lt?'Esta validación tiene un trade vinculado. Se eliminará la validación, pero el trade seguirá existiendo marcado como checklist eliminado.':'Esta acción eliminará la validación del Checklist.';
    if(!confirm(`¿Eliminar validación?

${msg}`))return;
    try{
      if(lt?.id) await setDoc(doc(db,'trades',lt.id),{checklistDeleted:true,checklistDeletedAt:serverTimestamp()},{merge:true});
      await deleteDoc(doc(db,'checklists',v.id));
      if(selected?.id===v.id)setSelected(null);
      toast('Validación eliminada','success');
    }catch(e){console.error(e);toast('No se pudo eliminar la validación','error')}
  }
  const selectedTrade=selected?findLinkedTrade(data,selected):null;
  const lastSavedTrade=lastSaved?findLinkedTrade(data,lastSaved):null;
  const FieldSelect=({id,label,options,locked=false,help})=><Field label={label} hint={help}><select className="input" disabled={locked} value={form.answers[id]||''} onChange={e=>setA(id,e.target.value)}><option value="">Seleccionar...</option>{options.map(x=><option key={x}>{x}</option>)}</select></Field>;
  const BlockHeader=({n,title,status})=><div className={`checkBlockHeader ${String(status).toLowerCase().replaceAll(' ','-')}`}><b>Bloque {n} — {title}</b><span>{status}</span></div>;
  const answerRows=v=>[
    ['Sesión clara',v.answers?.q1],['Evento económico',v.answers?.q2],['Balance / desequilibrio',v.answers?.q3],['Liquidez importante',v.answers?.q4],['Zona M15',v.answers?.q5],['Precio dentro de zona',v.answers?.q6],['RR mínimo',v.answers?.q7],['Patrón M1',v.answers?.q8]
  ];
  return <main className="page checklistPage"><section className={`checkHero ${ev.finalGreen?'ok':'bad'}`}><div><span className="pill gold"><CheckCircle2 size={14}/> Checklist operativo</span><h2>Sistema de revisión</h2><p>Regla madre: checklist incompleto = no ejecutar. El score educa, pero la luz verde solo aparece si contexto, zona, RR y patrón están completos.</p></div><div className="checkScore"><b>{ev.score}</b><small>/100</small><span>{ev.quality}</span></div></section>
  <Card title="Nueva validación" sub="Primero contexto, después zona y riesgo, recién al final patrón M1."><div className="formGrid labeled"><Field label="Activo"><input className="input" value={form.asset} onChange={e=>setForm({...form,asset:e.target.value.toUpperCase()})}/></Field><Field label="Sesión"><select className="input" value={form.session} onChange={e=>setForm({...form,session:e.target.value})}>{['Asia','Londres','NY','Post evento','Fuera de sesión'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Dirección buscada"><select className="input" value={form.direction} onChange={e=>setForm({...form,direction:e.target.value})}>{['Compra','Venta','Solo observación'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Tipo de guardado"><select className="input" value={form.result} onChange={e=>setForm({...form,result:e.target.value})}>{resultOptions.map(x=><option key={x}>{x}</option>)}</select></Field></div>
  <BlockHeader n="1" title="Contexto" status={ev.blockStatus.context}/><div className="checkBlocks"><FieldSelect id="q1" label="1. ¿Estoy en una sesión clara?" options={['Sí, Asia','Sí, Londres','Sí, NY','Sí, post evento','No, fuera de sesión clara']}/><FieldSelect id="q2" label="2. ¿Evento económico fuerte?" options={['Sí, evento fuerte pendiente','Sí, evento fuerte ya ocurrió','No hay evento fuerte relevante','No revisé calendario económico']}/><FieldSelect id="q3" label="3. ¿Balance o desequilibrio?" options={['En balance','Saliendo del balance','En desequilibrio bullish','En desequilibrio bearish','Demasiado extendido','No lo tengo claro']}/><FieldSelect id="q4" label="4. ¿Tomó liquidez importante?" options={['Sí, tomó high interno importante','Sí, tomó low interno importante','Sí, tomó PDH','Sí, tomó PDL','Sí, tomó Asia High','Sí, tomó Asia Low','Sí, tomó London High','Sí, tomó London Low','No tomó liquidez relevante','No lo tengo claro']}/><FieldSelect id="q5" label="5. ¿Zona de trabajo M15 válida?" options={['Vacío / FVG','PDH / PDL','EMA','Order Block','GAP','Confluencia de varias zonas','No hay zona clara']}/></div>
  <div className={`unlockNotice ${ev.contextOk?'ok':'locked'}`}>{ev.contextOk?'Contexto validado. Ahora podés completar zona y RR. La confirmación M1 se habilita recién cuando el trade esté técnicamente ejecutable.':'Primero validá sesión, evento, salida del balance/desequilibrio, liquidez y zona M15. No busques patrón M1 sin contexto.'}</div>
  <BlockHeader n="2" title="Zona y riesgo" status={ev.blockStatus.execution}/><div className="checkBlocks"><FieldSelect id="q6" label="6. ¿Precio dentro de zona?" options={['Sí, está dentro de la zona','Sí, tocó zona y confirmó reacción','Está muy cerca','Todavía no llegó','Ya se pasó','No lo tengo claro']} locked={!ev.contextOk} help={!ev.contextOk?'Primero validá los primeros 5 puntos antes de evaluar zona, RR o entrada.':'Contexto validado. Ahora evaluá llegada a zona.'}/><FieldSelect id="q7" label="7. ¿RR mínimo 1:2?" options={['Sí, RR 1:2 o más','Sí, RR 1:3 o más','No, menor a 1:2','No lo calculé']} locked={!ev.contextOk} help={!ev.contextOk?'Primero validá los primeros 5 puntos antes de evaluar zona, RR o entrada.':'Validá que el trade pague mínimo 1:2 antes de buscar patrón M1.'}/></div>
  <BlockHeader n="3" title="Confirmación M1" status={ev.blockStatus.pattern}/><div className="checkBlocks"><FieldSelect id="q8" label="8. Patrón de Moisés en M1" options={patterns} locked={!(ev.contextOk && ev.executionOk)} help={!(ev.contextOk && ev.executionOk)?'Primero validá contexto, llegada a zona y RR mínimo 1:2. No busques patrón M1 antes de que el trade esté técnicamente ejecutable.':'Contexto, zona y RR validados. Ahora podés buscar confirmación M1.'}/></div>
  <div className={`checkResult ${ev.finalGreen?'ok':'bad'}`}><b>{ev.finalGreen?'LUZ VERDE — Podés ejecutar':'LUZ ROJA — No debés ejecutar'}</b><p>{ev.reason}</p><small>Estado operativo: {ev.operationalState}</small>{ev.warns.map(w=><span key={w}>⚠️ {w}</span>)}</div>{lastSaved&&!lastSavedTrade&&<div className={`postChecklistAction ${lastSaved.finalGreen?'ok':'warn'}`}><button className="postChecklistClose" onClick={()=>setLastSaved(null)}><X size={16}/></button><span>{lastSaved.finalGreen?'Luz verde confirmada':'Checklist guardado sin luz verde'}</span><h3>{lastSaved.finalGreen?'Checklist guardado correctamente':'Validación registrada como observación'}</h3><p>{lastSaved.finalGreen?'Tu validación quedó completa. Ahora podés registrar el trade con los datos del Checklist ya cargados.':'Esta validación quedó registrada como observación o setup en formación. No está habilitada como entrada A+.'}</p><div className="postChecklistActions"><button className="primary" onClick={()=>{openTradeFromChecklist(lastSaved,lastSavedTrade,profile,data);setLastSaved(null)}}>{lastSaved.finalGreen?'Cargar trade desde este Checklist':'Crear trade de todos modos'}</button><button className="ghost" onClick={()=>setSelected(lastSaved)}>Ver validación</button></div>{!lastSaved.finalGreen&&<small>Si cargás un trade, quedará marcado como ejecutado sin checklist completo.</small>}</div>}{lastSaved&&lastSavedTrade&&<div className="postChecklistAction linked"><span>Trade vinculado</span><h3>Trade creado desde Checklist</h3><p>La validación ya tiene un trade asociado.</p><button className="primary" onClick={()=>{localStorage.setItem('mtc-open-trade',lastSavedTrade.id); window.dispatchEvent(new CustomEvent('mtc-tab',{detail:'journal'}));}}>Ver trade</button></div>}<Field label="Comentario del trader"><TextareaWithEmoji className="input" value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})}/></Field><Field label="Capturas / links M15-M1"><input className="input" value={form.captures} onChange={e=>setForm({...form,captures:e.target.value})} placeholder="Links de Drive, TradingView o captura externa"/></Field><button className="primary" onClick={save}>Guardar validación</button></Card>
  <Card title="Historial de validaciones" sub={admin?'Como mentor podés revisar, comentar y marcar interpretaciones.':'Tus validaciones quedan guardadas para medir disciplina.'}><div className="checkHistory">{validations.map(v=>{const lt=findLinkedTrade(data,v); return <article key={v.id} className="checkItem" onClick={()=>setSelected(v)}><div className="checkItemMain"><b>{v.asset} · {v.direction}</b><small>{v.userName||'Trader'} · {v.createdDate||safeDate(v.createdAt)} · {v.session}</small><span className={v.finalGreen?'pos':'neg'}>{v.score}/100 · {v.operationalState||v.status}</span><span className={`linkedMini ${lt?'ok':v.finalGreen&&Number(v.score)>=85?'gold':'muted'}`}>{lt?'Trade vinculado':v.finalGreen&&Number(v.score)>=85?'Setup A+':'Sin trade'}</span></div><div className="checkItemActions">{admin&&<select className="input small" value={v.mentorReview||''} onClick={e=>e.stopPropagation()} onChange={e=>review(v,{mentorReview:e.target.value})}><option value="">Revisión mentor...</option>{reviewOptions.map(x=><option key={x}>{x}</option>)}</select>}<button className="ghost compact danger" title="Borrar validación" onClick={e=>{e.stopPropagation();removeValidation(v)}}><Trash2 size={14}/></button></div></article>})}{!validations.length&&<Empty title="Sin validaciones" text="Creá tu primera validación operativa antes de ejecutar." cta="Completar checklist" icon={CheckCircle2} onClick={()=>document.querySelector('.main')?.scrollTo({top:0,behavior:'smooth'})}/>}</div></Card>
  {selected&&<div className="modal"><div className="modalCard checklistModal"><div className="modalHead"><h3>{selected.asset} · {selected.operationalState||selected.status}</h3><div className="modalActions"><button className="ghost danger compact" onClick={()=>removeValidation(selected)}><Trash2 size={14}/>Borrar</button><button onClick={()=>setSelected(null)}><X/></button></div></div>{selectedTrade?<div className="linkedTradeCard"><div><span>Trade vinculado</span><b>{Number(selectedTrade.resultMoney||0)>0?'Profit':Number(selectedTrade.resultMoney||0)<0?'Stop / pérdida':'Resultado neutro'} · {Number(selectedTrade.resultMoney||0)>0?'+':''}{money(selectedTrade.resultMoney||0)}</b><small>{Number(selectedTrade.resultR||0)>0?'+':''}{Number(selectedTrade.resultR||0).toFixed(2)}R · {selectedTrade.date||selectedTrade.tradingDay||'—'}</small></div><button className="ghost compact" onClick={()=>{localStorage.setItem('mtc-open-trade',selectedTrade.id); window.dispatchEvent(new CustomEvent('mtc-tab',{detail:'journal'}));}}>Ver trade</button></div>:<div className={`linkedTradeCard ${selected.finalGreen?'ok':'warn'}`}><div><span>Trade vinculado</span><b>Sin trade asociado</b><small>{selected.finalGreen?'Validación lista para crear trade.':'Esta validación no tiene luz verde; si creás trade quedará marcado como ejecución sin checklist completo.'}</small></div><button className="primary compact" onClick={()=>openTradeFromChecklist(selected,selectedTrade,profile,data)}>Cargar trade desde este Checklist</button></div>}<div className="detailGrid"><DetailBlock title="Resumen"><p><b>Trader:</b> {selected.userName||'—'}<br/><b>Fecha:</b> {selected.createdDate||safeDate(selected.createdAt)||'—'}<br/><b>Sesión:</b> {selected.session||'—'}<br/><b>Dirección:</b> {selected.direction||'—'}<br/><b>Resultado posterior:</b> {selected.result||'No ejecutada'}</p></DetailBlock><DetailBlock title="Score y estado"><p><b>{selected.score||0}/100</b><br/>{selected.quality||'—'}<br/>{selected.green?'LUZ VERDE — Podés ejecutar':'LUZ ROJA — No debés ejecutar'}</p></DetailBlock><DetailBlock title="Respuestas del checklist"><div className="answerList">{answerRows(selected).map(([k,v])=><div key={k}><b>{k}</b><span>{v||'Sin responder'}</span></div>)}</div></DetailBlock><DetailBlock title="Comentario del trader"><p>{selected.comment||'—'}</p></DetailBlock><DetailBlock title="Capturas / links"><p>{selected.captures?<a href={selected.captures} target="_blank" rel="noreferrer">Abrir recurso</a>:'—'}</p></DetailBlock><DetailBlock title="Revisión del mentor"><select className="input" value={selected.mentorReview||''} onChange={async e=>{const mentorReview=e.target.value; setSelected({...selected,mentorReview}); await review(selected,{mentorReview});}}><option value="">Sin revisión</option>{reviewOptions.map(x=><option key={x}>{x}</option>)}</select><TextareaWithEmoji className="input mentorComment" value={selected.mentorComment||''} onChange={e=>setSelected({...selected,mentorComment:e.target.value})} placeholder="Comentario del mentor"/><button className="primary compact" onClick={()=>review(selected,{mentorComment:selected.mentorComment||''})}>Guardar comentario</button></DetailBlock></div></div></div>}
  </main>
}
function ReadingPage({data,profile}){
  const [book,setBook]=useState(null),[bookSearch,setBookSearch]=useState(''),[bookCat,setBookCat]=useState('Todas');
  const books=useMemo(()=>[...(data.books||[])].sort((a,b)=>String(b.createdDate||safeDate(b.createdAt)||'').localeCompare(String(a.createdDate||safeDate(a.createdAt)||''))),[data.books]);
  const admin=isPrivileged(profile);
  const cats=useMemo(()=>['Todas',...Array.from(new Set(books.map(b=>b.category||'Lectura')))], [books]);
  const visibleBooks=useMemo(()=>books.filter(b=>{
    const q=bookSearch.trim().toLowerCase();
    const okCat=bookCat==='Todas'||(b.category||'Lectura')===bookCat;
    const txt=`${b.title||''} ${b.author||''} ${b.description||''} ${b.category||''}`.toLowerCase();
    return okCat && (!q || txt.includes(q));
  }),[books,bookSearch,bookCat]);
  async function saveBook(){
    if(!book?.title?.trim()) return toast('Completa el título del libro','error');
    const payload={title:book.title,author:book.author||'',category:book.category||'Trading',description:book.description||'',pdfLink:book.pdfLink||'',coverUrl:book.coverUrl||'',fileName:book.fileName||'',uploaderId:book.uploaderId||profile.uid,uploaderName:book.uploaderName||profile.name,authorId:book.authorId||profile.uid,userId:book.userId||profile.uid,updatedAt:serverTimestamp(),createdDate:book.createdDate||today()};
    if(book.id){await setDoc(doc(db,'books',book.id),payload,{merge:true}); toast('Libro actualizado');}
    else {await addDoc(collection(db,'books'),{...payload,createdAt:serverTimestamp()}); toast('Libro publicado en la biblioteca');}
    setBook(null);
  }
  async function removeBook(b){if(!admin||!confirm('¿Borrar este libro?'))return; await deleteDoc(doc(db,'books',b.id)); toast('Libro borrado');}
  function selectPdf(e){const f=e.target.files?.[0]; if(!f)return; setBook({...book,fileName:f.name}); toast('PDF seleccionado. Para subir archivo real se usará Storage cuando esté activo.');}
  return <main className="page"><section className="heroSystem readingHero"><span className="pill gold">Biblioteca privada</span><h2>Biblioteca Moisés</h2><p>Todos los libros, PDFs y recursos quedan visibles en una biblioteca real para los miembros. Podés filtrar, buscar, editar y borrar recursos.</p></section>
  {admin&&<Card title={book?.id?'Editar libro':'Subir libro / PDF'} sub="Guarda el libro en la biblioteca. Por ahora usá links externos de Drive; cuando actives Storage quedará listo para archivos reales."><div className="formGrid labeled"><Field label="Título del libro"><input className="input" value={book?.title||''} onChange={e=>setBook({...book,title:e.target.value})} placeholder="Trading in the Zone"/></Field><Field label="Autor"><input className="input" value={book?.author||''} onChange={e=>setBook({...book,author:e.target.value})} placeholder="Mark Douglas"/></Field><Field label="Categoría"><select className="input" value={book?.category||'Trading'} onChange={e=>setBook({...book,category:e.target.value})}>{['Trading','Psicología','Riesgo','Order Flow','Mentalidad','Negocios','Otro'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Link del PDF o recurso" hint="Usá un link de Drive compartido como: Cualquier persona con el enlace puede ver."><input className="input" value={book?.pdfLink||''} onChange={e=>setBook({...book,pdfLink:e.target.value})} placeholder="https://drive.google.com/..."/></Field><Field label="Imagen de portada" hint="Opcional. Pegá link directo de imagen."><input className="input" value={book?.coverUrl||''} onChange={e=>setBook({...book,coverUrl:e.target.value})} placeholder="https://.../portada.jpg"/></Field><Field label="Archivo PDF futuro" hint="Selecciona el archivo para dejar registro del nombre."><label className="ghost file futureUpload"><Upload size={16}/>Seleccionar PDF<input type="file" accept="application/pdf,.pdf" onChange={selectPdf}/></label>{book?.fileName&&<small className="fileName">Archivo: {book.fileName}</small>}</Field><Field label="Descripción / por qué leerlo"><TextareaWithEmoji className="input" value={book?.description||''} onChange={e=>setBook({...book,description:e.target.value})} placeholder="Describe qué aporta este libro al proceso del trader."/></Field></div>{book?.title&&<div className="bookPreview"><BookCover book={book}/><div><b>Vista previa del libro</b><p>{book.title}</p><span>{book.author||'Autor no especificado'} · {book.category||'Trading'}</span></div></div>}<button className="primary" onClick={saveBook}><Plus/>{book?.id?'Guardar cambios':'Publicar libro'}</button>{book?.id&&<button className="ghost" onClick={()=>setBook(null)}>Cancelar edición</button>}</Card>}
  <Card title="Biblioteca cargada" sub={`${visibleBooks.length} de ${books.length} recursos visibles. Se muestran todos los libros cargados, no solo los primeros dos.`}><div className="libraryToolbar"><div className="search"><Search size={16}/><input placeholder="Buscar libro, autor o descripción" value={bookSearch} onChange={e=>setBookSearch(e.target.value)}/></div><select className="input small" value={bookCat} onChange={e=>setBookCat(e.target.value)}>{cats.map(c=><option key={c}>{c}</option>)}</select></div><div className="libraryShelf realLibrary">{visibleBooks.map((b,i)=><article className="libraryBookPro" key={b.id||i}><BookCover book={b} index={i}/><div className="libraryInfo"><div className="bookMeta"><span className="pill gold">{b.category||'Lectura'}</span>{b.fileName&&<span className="pill">PDF registrado</span>}</div><h3>{b.title}</h3><p>{b.author||'Autor no especificado'}</p><span>{b.description||'Sin descripción cargada.'}</span><small>Subido por {b.uploaderName||'MTC'} {b.createdDate?`· ${b.createdDate}`:''}</small><div className="bookActions">{b.pdfLink&&<a className="primary" href={b.pdfLink} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Abrir PDF</a>}{b.coverUrl&&<a className="ghost" href={b.coverUrl} target="_blank" rel="noreferrer"><ImageIcon size={14}/>Ver portada</a>}{admin&&<button className="ghost" onClick={()=>setBook(b)}><Edit3 size={14}/>Editar</button>}{admin&&<button className="ghost danger" onClick={()=>removeBook(b)}><Trash2 size={14}/>Borrar</button>}</div></div></article>)}{!visibleBooks.length&&lecturaSeed.map((b,i)=><article className="libraryBookPro" key={i}><BookCover book={{title:b.title,category:b.focus,author:'MTC'}} index={i}/><div className="libraryInfo"><div className="bookMeta"><span className="pill gold">Sugerido</span></div><h3>{b.title}</h3><p>{b.focus}</p><span>{b.task}</span></div></article>)}</div></Card>
  <Card title="Protocolo de lectura diaria" sub="10 minutos bien aplicados valen más que una hora dispersa"><div className="mandamientos"><div className="mandamiento"><b>1</b><span>Leer una idea, no un capítulo entero por obligación.</span></div><div className="mandamiento"><b>2</b><span>Escribir qué error corrige esa idea en tu trading.</span></div><div className="mandamiento"><b>3</b><span>Convertirla en una regla observable para el próximo trade.</span></div><div className="mandamiento"><b>4</b><span>Revisar al final del día si la aplicaste o no.</span></div></div></Card></main>}
function NewsPage(){return <main className="page"><div className="heroSystem newsHero"><span className="pill gold"><Newspaper size={14}/> Calendario macro</span><h2>Noticias económicas</h2><p>Revisa eventos de alto impacto antes de operar. Evita operar sin conocer CPI, FOMC, NFP, tasas, PMIs o discursos relevantes.</p><a className="primary external" href="https://www.forexfactory.com/calendar" target="_blank" rel="noreferrer"><ExternalLink size={18}/>Abrir Forex Factory Calendar</a></div><div className="grid2"><Card title="Protocolo antes de operar" sub="Revisión mínima antes de NY."><div className="ruleMini"><span>1. Revisa noticias rojas para USD, oro o tu activo.</span><span>2. Si hay noticia en menos de 15 minutos, evita anticiparte.</span><span>3. Después de la noticia, espera liquidez, reacción y confirmación estructural.</span><span>4. Registra si el trade fue pre-noticia, post-noticia o sin evento relevante.</span></div></Card><Card title="Eventos a vigilar"><div className="patternGrid mini"><div className="patternCard"><h3>CPI / Inflación</h3><p>Puede generar barridos fuertes y expansión violenta.</p></div><div className="patternCard"><h3>FOMC / Tasas</h3><p>Alta volatilidad. Espera confirmaciones claras.</p></div><div className="patternCard"><h3>NFP</h3><p>Evita operar sin estructura post-evento.</p></div></div></Card></div></main>}


function RiskLab({data,profile}){
  const [settings,setSettings]=useState(getRiskSettings());
  const [instrument,setInstrument]=useState('XAUUSD');
  const [capital,setCapital]=useState(settings.accountCapital||data.settings.initialBalance||10000);
  const [riskPct,setRiskPct]=useState(settings.riskPerTradePct||.5);
  const [entry,setEntry]=useState(2350);
  const [stop,setStop]=useState(2347);
  const [mode,setMode]=useState('presets');
  const [tickSize,setTickSize]=useState(.25);
  const [tickValue,setTickValue]=useState(1.25);
  const [hypo,setHypo]=useState(0);
  const {active,setActive,accounts,filtered}=useAccountFilter(data.trades,data.settings);
  const initial=accountInitial(data.settings,active);
  const cfg=instrumentPresets[instrument]||instrumentPresets.XAUUSD;
  const riskMoney=Number(capital||0)*Number(riskPct||0)/100;
  const distance=Math.abs(Number(entry||0)-Number(stop||0));
  const units=mode==='futures'?Math.max(0,distance/Number(tickSize||1)):Math.max(0,distance/Number(cfg.pipSize||1));
  const riskPerContract=mode==='futures'?units*Number(tickValue||0):units*Number(cfg.pipValuePerLot||0);
  const size=riskPerContract>0?riskMoney/riskPerContract:0;
  const s=calc(filtered,initial);
  const guard=evaluateRiskGuard(filtered,settings,initial);
  const ddLimit=Number(settings.maxDrawdownPct||0);
  const ddProgress=ddLimit?Math.min(100,(guard.drawdownPct/ddLimit)*100):0;
  const projectedTotal=s.total+Number(hypo||0);
  const projectedEquity=s.initial+projectedTotal;
  function save(){saveRiskSettings({...settings,accountCapital:Number(capital),riskPerTradePct:Number(riskPct)}); toast('Límites de riesgo guardados')}
  function upd(k,v){const n={...settings,[k]:Number(v)}; setSettings(n); saveRiskSettings(n)}
  return <main className="page riskPage"><section className="riskHero"><div><span><Shield size={15}/> Risk Lab</span><h2>Calculadora, límites y protección operativa</h2><p>Calcula lotaje, define límites y protege tu ejecución antes de tomar riesgo real.</p></div><div className="riskHeroStats"><b>{guard.blocked?'Bloqueado':'Operativo'}</b><small>{guard.blocked?'Modo reflexión activo':'Dentro de límites'}</small></div></section>
  <AccountSwitcher active={active} setActive={setActive} accounts={accounts}/>
  {guard.blocked&&<div className="riskAlert"><Shield size={20}/><div><b>Modo reflexión activo</b><p>{guard.reasons.join(' · ')}</p></div></div>}
  <div className="grid2 riskGrid"><Card title="Calculadora de lotaje" sub="Capital + riesgo + entrada + stop. Usa presets de oro, US30 y pares principales."><div className="formGrid labeled"><Field label="Instrumento"><select className="input" value={instrument} onChange={e=>setInstrument(e.target.value)}>{Object.entries(instrumentPresets).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></Field><Field label="Modo"><select className="input" value={mode} onChange={e=>setMode(e.target.value)}><option value="presets">Forex / CFD preset</option><option value="futures">Futuros por tick</option></select></Field><Field label="Capital"><input className="input" type="number" value={capital} onChange={e=>setCapital(e.target.value)}/></Field><Field label="Riesgo %"><input className="input" type="number" step="0.1" value={riskPct} onChange={e=>setRiskPct(e.target.value)}/></Field><Field label="Entrada"><input className="input" type="number" step="0.01" value={entry} onChange={e=>setEntry(e.target.value)}/></Field><Field label="Stop Loss"><input className="input" type="number" step="0.01" value={stop} onChange={e=>setStop(e.target.value)}/></Field>{mode==='futures'&&<><Field label="Tick size"><input className="input" type="number" step="0.01" value={tickSize} onChange={e=>setTickSize(e.target.value)}/></Field><Field label="Valor tick"><input className="input" type="number" step="0.01" value={tickValue} onChange={e=>setTickValue(e.target.value)}/></Field></>}</div><div className="lotResult"><div><span>Riesgo monetario</span><b>{money(riskMoney)}</b></div><div><span>Distancia al stop</span><b>{distance.toFixed(mode==='futures'?2:5)}</b></div><div><span>{mode==='futures'?'Contratos':'Lotes sugeridos'}</span><b>{size>0?size.toFixed(2):'—'}</b></div></div><p className="microInsight">{cfg.notes} Verifica siempre la especificación exacta de tu broker antes de ejecutar.</p><button className="primary" onClick={save}>Guardar capital/riesgo base</button></Card>
  <Card title="Límites de riesgo" sub="Configura hard stop diario, semanal y máximo de trades para bloquear registros nuevos."><div className="formGrid labeled"><Field label="Pérdida máxima diaria $"><input className="input" type="number" value={settings.maxDailyLoss} onChange={e=>upd('maxDailyLoss',e.target.value)}/></Field><Field label="Pérdida máxima semanal $"><input className="input" type="number" value={settings.maxWeeklyLoss} onChange={e=>upd('maxWeeklyLoss',e.target.value)}/></Field><Field label="Máximo trades por día"><input className="input" type="number" value={settings.maxTradesDay} onChange={e=>upd('maxTradesDay',e.target.value)}/></Field><Field label="Drawdown máximo %"><input className="input" type="number" value={settings.maxDrawdownPct} onChange={e=>upd('maxDrawdownPct',e.target.value)}/></Field></div><div className="limitCards"><div><span>Hoy</span><b className={guard.dailyPnL<0?'neg':'pos'}>{money(guard.dailyPnL)}</b><small>{guard.todayTrades.length}/{settings.maxTradesDay} trades</small></div><div><span>Semana</span><b className={guard.weeklyPnL<0?'neg':'pos'}>{money(guard.weeklyPnL)}</b><small>Límite {money(settings.maxWeeklyLoss)}</small></div></div></Card></div>
  <div className="grid2"><Card title="Tracker de drawdown" sub="Muestra qué tan cerca estás del límite máximo permitido."><div className="ddTracker"><div><b>{pct(guard.drawdownPct)}</b><span>DD actual</span></div><div><b>{pct(settings.maxDrawdownPct)}</b><span>Límite</span></div></div><div className="ddBar"><i style={{width:`${ddProgress}%`}}></i></div><p className="microInsight">Si llega al límite, el journal activa modo reflexión para evitar seguir registrando operaciones impulsivas.</p></Card><Card title="Simulador de escenario" sub="¿Qué pasa si tomo este trade? Evalúa el impacto antes de operar."><div className="formGrid labeled"><Field label="Resultado hipotético $"><input className="input" type="number" value={hypo} onChange={e=>setHypo(e.target.value)}/></Field><Field label="Equity proyectada"><input className="input" readOnly value={money(projectedEquity)}/></Field><Field label="P/L proyectado"><input className="input" readOnly value={`${money(projectedTotal)} · ${pct((projectedTotal/s.initial)*100)}`}/></Field></div><div className="scenarioBox"><b>{Number(hypo)>0?'Escenario positivo':Number(hypo)<0?'Escenario de pérdida':'Sin impacto'}</b><p>{Number(hypo)<0 && Math.abs(Number(hypo))>Number(settings.maxDailyLoss)?'Esta pérdida supera tu hard stop diario. No deberías tomar el trade con ese tamaño.':'El escenario queda dentro de los límites configurados, siempre que el setup esté validado.'}</p></div></Card></div></main>
}

function Academy({data,profile}){
  const admin=isPrivileged(profile);
  const [lesson,setLesson]=useState(null);
  const lessons=data.academyLessons||[];
  async function saveLesson(){
    if(!lesson?.title?.trim()) return toast('Completa el título de la clase','error');
    await addDoc(collection(db,'academyLessons'),{
      title:lesson.title,module:lesson.module||'General',type:lesson.type||'Clase',level:lesson.level||'Todos',description:lesson.description||'',
      videoUrl:lesson.videoUrl||'',embedUrl:lesson.embedUrl||'',resourceUrl:lesson.resourceUrl||'',fileName:lesson.fileName||'',duration:lesson.duration||'',authorId:profile.uid,authorName:profile.name,
      createdAt:serverTimestamp(),createdDate:today()
    });
    toast('Clase publicada en la base');
    setLesson(null);
  }
  function selectClassFile(e){const f=e.target.files?.[0]; if(!f)return; setLesson({...lesson,fileName:f.name}); toast('Archivo seleccionado. Subida real quedará lista para Storage.');}
  return <main className="page">
    {admin&&<Card title="Subir clase a la base" sub="Publica clases, links de video, PDFs o recursos. Preparado para Firestore y Storage futuro."><div className="formGrid labeled"><Field label="Título de la clase"><input className="input" value={lesson?.title||''} onChange={e=>setLesson({...lesson,title:e.target.value})} placeholder="ChoCH M1 y ejecución"/></Field><Field label="Módulo"><input className="input" value={lesson?.module||''} onChange={e=>setLesson({...lesson,module:e.target.value})} placeholder="Canal de Moisés"/></Field><Field label="Tipo"><select className="input" value={lesson?.type||'Video'} onChange={e=>setLesson({...lesson,type:e.target.value})}>{['Video','PDF','Clase en vivo','Checklist','Recurso'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Nivel"><select className="input" value={lesson?.level||'Todos'} onChange={e=>setLesson({...lesson,level:e.target.value})}>{['Inicial','Intermedio','Avanzado','Todos'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Link de video"><input className="input" value={lesson?.videoUrl||''} onChange={e=>setLesson({...lesson,videoUrl:e.target.value})} placeholder="YouTube, Vimeo, Loom, Drive..."/></Field><Field label="Embed Vimeo/Loom" hint="Opcional: link embed para ver la clase dentro de la app."><input className="input" value={lesson?.embedUrl||''} onChange={e=>setLesson({...lesson,embedUrl:e.target.value})} placeholder="https://player.vimeo.com/video/..."/></Field><Field label="Duración"><input className="input" value={lesson?.duration||''} onChange={e=>setLesson({...lesson,duration:e.target.value})} placeholder="28 min"/></Field><Field label="Link de recurso"><input className="input" value={lesson?.resourceUrl||''} onChange={e=>setLesson({...lesson,resourceUrl:e.target.value})} placeholder="PDF, Drive, Notion..."/></Field><Field label="Archivo futuro"><label className="ghost file futureUpload"><Upload size={16}/>Seleccionar archivo<input type="file" onChange={selectClassFile}/></label>{lesson?.fileName&&<small className="fileName">Archivo: {lesson.fileName}</small>}</Field><Field label="Descripción"><TextareaWithEmoji className="input" value={lesson?.description||''} onChange={e=>setLesson({...lesson,description:e.target.value})} placeholder="Qué aprende el trader en esta clase."/></Field></div><button className="primary" onClick={saveLesson}><Plus/>Publicar clase</button></Card>}
    <Card title="Base de conocimiento" sub="Clases y recursos publicados por el mentor."><div className="academyWall">{lessons.map(l=><article className="academyLesson" key={l.id}><div className="lessonBadge">{l.type}</div><h3>{l.title}</h3><p>{l.module} · {l.level}</p><span>{l.description}</span>{l.embedUrl&&<div className="videoFrame"><iframe src={l.embedUrl} title={l.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen></iframe></div>}<small>Publicado por {l.authorName||'MTC'} {l.duration?`· ${l.duration}`:''} {l.fileName?`· ${l.fileName}`:''}</small><div className="actions">{l.videoUrl&&<a className="ghost" href={l.videoUrl} target="_blank" rel="noreferrer"><PlayCircle size={15}/>Ver clase</a>}{l.resourceUrl&&<a className="ghost" href={l.resourceUrl} target="_blank" rel="noreferrer"><FileText size={15}/>Recurso</a>}</div></article>)}{!lessons.length&&data.courses.map(c=><article className="academyLesson" key={c.id}><div className="lessonBadge">Curso base</div><h3>{c.title}</h3><p>{c.level}</p><span>{c.description}</span></article>)}</div></Card>
    <div className="courseGrid">{data.courses.map(c=><Card key={c.id} title={c.title} sub={c.level}><div className="courseHero"><BookOpen size={38}/></div><p className="muted">{c.description}</p>{c.modules.map((m,mi)=><div key={mi} className="module"><b>{m.title}</b>{m.lessons.map(l=><div className="lesson" key={l.id}>{l.locked?<Lock/>:l.type==='pdf'?<FileText/>:<PlayCircle/>}<span>{l.title}</span><small>{l.duration}</small></div>)}</div>)}</Card>)}</div>
  </main>}
function Community({data,profile}){
  const [body,setBody]=useState(''),[cat,setCat]=useState('Resultados'),[editing,setEditing]=useState(null);
  const admin=isPrivileged(profile);
  async function add(){if(!body.trim())return; await addDoc(collection(db,'posts'),{authorId:profile.uid,authorName:profile.name,authorAvatar:profile.avatar,category:cat,body,likes:[],comments:[],pinned:cat==='Anuncio',createdAt:serverTimestamp(),createdDate:today(),updatedAt:null}); toast(cat==='Anuncio'?'Anuncio publicado':'Post publicado'); setBody('')}
  async function like(p){const likes=p.likes||[]; await updateDoc(doc(db,'posts',p.id),{likes:likes.includes(profile.uid)?likes.filter(x=>x!==profile.uid):[...likes,profile.uid]});}
  async function removePost(p){if(!confirm('¿Borrar esta publicación?'))return; await deleteDoc(doc(db,'posts',p.id)); toast('Post borrado');}
  async function saveEdit(){if(!editing?.body?.trim())return; await updateDoc(doc(db,'posts',editing.id),{body:editing.body,category:editing.category,updatedAt:serverTimestamp()}); toast('Cambios guardados'); setEditing(null)}
  async function togglePin(p){if(!admin)return; await updateDoc(doc(db,'posts',p.id),{pinned:!p.pinned}); toast(p.pinned?'Mensaje desfijado':'Mensaje fijado');}
  return <main className="page"><Card title="Workspace privado" sub="Comparte resultados, dudas, aprendizajes y análisis. Todo queda ordenado dentro de la plataforma.">
    <TextareaWithEmoji className="input" value={body} onChange={e=>setBody(e.target.value)} placeholder="Comparte idea, resultado, duda o aprendizaje..."/>
    <div className="row"><select className="input small" value={cat} onChange={e=>setCat(e.target.value)}>{['Ideas de trading','Resultados','Backtesting','Dudas','Psicología','Gestión de riesgo','Base de setups','Workspace','Anuncio'].map(x=><option key={x}>{x}</option>)}</select><button className="primary" onClick={add}><Plus/>Publicar</button></div>
  </Card>
  {editing&&<div className="modal"><div className="modalCard"><div className="modalHead"><h3>Editar publicación</h3><button onClick={()=>setEditing(null)}><X/></button></div><select className="input" value={editing.category} onChange={e=>setEditing({...editing,category:e.target.value})}>{['Ideas de trading','Resultados','Backtesting','Dudas','Psicología','Gestión de riesgo','Base de setups','Workspace','Anuncio'].map(x=><option key={x}>{x}</option>)}</select><TextareaWithEmoji className="input" value={editing.body} onChange={e=>setEditing({...editing,body:e.target.value})}/><button className="primary full" onClick={saveEdit}>Guardar cambios</button></div></div>}
  <div className="feed">{[...data.posts].sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)).map(p=><Post key={p.id} p={p} like={()=>like(p)} liked={(p.likes||[]).includes(profile.uid)} canEdit={admin||p.authorId===profile.uid} canPin={admin} onPin={()=>togglePin(p)} onEdit={()=>setEditing({id:p.id,body:p.body,category:p.category})} onDelete={()=>removePost(p)}/>) }{!data.posts.length&&<Empty title="Sin publicaciones todavía" text="Usá este espacio para dejar una duda, aprendizaje o resultado con contexto." cta="Publicar en mi espacio" icon={Users} onClick={()=>document.querySelector('.feed')?.previousElementSibling?.scrollIntoView({behavior:'smooth',block:'start'})}/>}</div></main>
}
function Post({p,like,liked,canEdit,canPin,onPin,onEdit,onDelete}){return <article className={`post ${p.pinned?'pinned':''}`}><div className="postTop"><div className="avatar">{p.authorAvatar||'MT'}</div><div><b>{p.authorName||'Usuario'}</b><p>{p.category} · {safeDate(p.createdAt)||p.createdDate}{p.updatedAt?' · editado':''}</p></div>{p.pinned&&<span className="pill gold"><Megaphone size={12}/> Anuncio</span>}</div><p>{p.body}</p><div className="actions"><button className={liked?'liked':''} onClick={like}><Heart size={16}/>{(p.likes||[]).length}</button><button><MessageCircle size={16}/>{(p.comments||[]).length}</button><button><Bookmark size={16}/>Guardar</button>{canPin&&<button onClick={onPin}><Bookmark size={16}/>{p.pinned?'Desfijar':'Fijar'}</button>}{canEdit&&<button onClick={onEdit}><Edit3 size={16}/>Editar</button>}{canEdit&&<button className="danger" onClick={onDelete}><Trash2 size={16}/>Borrar</button>}</div></article>}

function Ideas({data,profile}){
  const [draft,setDraft]=useState(null);
  const [likesOpen,setLikesOpen]=useState(null);
  const can=isPrivileged(profile);
  const usersById=useMemo(()=>Object.fromEntries((data.users||[]).map(u=>[u.uid,u])),[data.users]);
  const canManageIdea=i=>can || i.authorId===profile.uid || i.userId===profile.uid || String(i.authorEmail||'').toLowerCase()===String(profile.email||'').toLowerCase();
  const emptyIdeaDraft={title:'',asset:'XAUUSD',side:'BUY',bias:'Alcista',executionType:'Zona de trabajo: esperar patrón de entrada',timeframe:'M15/M1',zone:'',marketCode:'',entryTrigger:'',stopLoss:'',takeProfit:'',invalidation:'',targets:'',risk:'0.5%',status:'Espera',explanation:'',imageUrl:''};
  function editIdea(i){
    setDraft({
      id:i.id,
      title:i.title||'',
      asset:i.asset||'',
      side:i.side || (i.bias==='Bajista'?'SELL':i.bias==='Alcista'?'BUY':'NEUTRAL'),
      bias:i.bias||'Neutral',
      executionType:i.executionType||'Zona de trabajo: esperar patrón de entrada',
      timeframe:i.timeframe||'',
      zone:i.zone||'',
      marketCode:i.marketCode||'',
      entryTrigger:i.entryTrigger||'',
      stopLoss:i.stopLoss||i.invalidation||'',
      takeProfit:i.takeProfit||i.targets||'',
      invalidation:i.invalidation||i.stopLoss||'',
      targets:i.targets||i.takeProfit||'',
      risk:i.risk||'',
      status:i.status||'Espera',
      explanation:i.explanation||i.description||'',
      imageUrl:i.imageUrl||i.captureUrl||''
    });
    setTimeout(()=>document.querySelector('.ideaEditorCard')?.scrollIntoView({behavior:'smooth',block:'start'}),60);
  }
  async function saveIdea(){
    try{
      if(!draft?.asset?.trim()){toast('Falta seleccionar activo.','error');return;}
      const payload=sanitizeFirestoreObject({
        title:draft.title||'',
        description:draft.explanation||'',
        asset:String(draft.asset||'').toUpperCase(),
        side:draft.side,
        bias:draft.side==='BUY'?'Alcista':draft.side==='SELL'?'Bajista':'Neutral',
        executionType:draft.executionType,
        timeframe:draft.timeframe,
        zone:draft.zone,
        marketCode:draft.marketCode,
        entryTrigger:draft.entryTrigger,
        stopLoss:draft.stopLoss||draft.invalidation,
        takeProfit:draft.takeProfit||draft.targets,
        invalidation:draft.stopLoss||draft.invalidation,
        targets:draft.takeProfit||draft.targets,
        risk:draft.risk,
        status:draft.status,
        explanation:draft.explanation,
        imageUrl:draft.imageUrl||'',
        updatedAt:serverTimestamp()
      });
      if(draft.id){
        const original=(data.ideas||[]).find(x=>x.id===draft.id);
        if(!original || !canManageIdea(original)){toast('No tenés permiso para editar esta idea.','error');return;}
        await updateDoc(doc(db,'ideas',draft.id),payload);
        setDraft(null);
        toast('Idea actualizada');
        return;
      }
      await addDoc(collection(db,'ideas'),sanitizeFirestoreObject({...payload,authorId:profile.uid,userId:profile.uid,authorName:profile.name,authorEmail:profile.email||auth.currentUser?.email||'',authorAvatar:profile.avatar,likes:[],comments:[],createdAt:serverTimestamp(),createdDate:today()}));
      await notifyUsers(data.users,`Nueva idea del mentor: ${draft.asset} ${draft.side||draft.bias} · ${draft.executionType}.`,'idea',{target:'ideas'});
      setDraft(null);
      toast('Idea publicada y notificada');
    }catch(e){console.error('saveIdea:error',e); toast(draft?.id?'No se pudo actualizar la idea.':'No se pudo publicar la idea.','error')}
  }
  async function like(i){const likes=i.likes||[]; await updateDoc(doc(db,'ideas',i.id),{likes:likes.includes(profile.uid)?likes.filter(x=>x!==profile.uid):[...likes,profile.uid]});}
  async function removeIdea(i){if(!confirm('¿Eliminar idea?\n\nEsta acción eliminará la idea comercial. No afectará tus trades ni checklists.'))return; console.info('deleteIdea:start', i.id); try{await deleteDoc(doc(db,'ideas',i.id)); console.info('deleteIdea:success', i.id); toast('Idea eliminada')}catch(e){console.error('deleteIdea:error',e); toast('No se pudo eliminar la idea.','error')}}
  const sideLabel=i=>i.side || (i.bias==='Bajista'?'SELL':i.bias==='Alcista'?'BUY':'NEUTRAL');
  const ideaText=i=>[`IDEA MTC`,`${i.title?i.title+' · ':''}${i.asset} · ${sideLabel(i)}`,`Ejecución: ${i.executionType||'Zona de trabajo'}`,`Temporalidad: ${i.timeframe||'N/A'}`,`Zona: ${i.zone||'N/A'}`,`Códigos MT5: ${i.marketCode||'N/A'}`,`Entrada/Gatillo: ${i.entryTrigger||'N/A'}`,`Stop loss: ${i.stopLoss||i.invalidation||'N/A'}`,`Take profit: ${i.takeProfit||i.targets||'N/A'}`,`Riesgo: ${i.risk||'N/A'}`,`Estado: ${ideaStatusLabel(i.status)||'Espera'}`,`Plan: ${i.explanation||i.description||''}`].join('\n');
  const ideaCode=i=>String(i.marketCode||'').trim() || `${i.asset||''} ${sideLabel(i)}`.trim();
  const likedUsers=i=>(i.likes||[]).map(id=>usersById[id]||{uid:id,name:id}).filter(Boolean);
  return <main className="page ideasPage">{(can||draft)&&<Card className="ideaEditorCard" title={draft?.id?'Editar idea publicada':'Publicar idea del mentor'} sub={draft?.id?'Los cambios actualizan el documento existente sin perder likes ni fecha original.':'Separá la idea completa de los códigos de mercado copiables para MT5.'}>{draft?<div className="formGrid"><input className="input" placeholder="Título de la idea" value={draft.title||''} onChange={e=>setDraft({...draft,title:e.target.value})}/><input className="input" placeholder="Activo" value={draft.asset} onChange={e=>setDraft({...draft,asset:e.target.value.toUpperCase()})}/><select className="input" value={draft.side} onChange={e=>setDraft({...draft,side:e.target.value,bias:e.target.value==='BUY'?'Alcista':e.target.value==='SELL'?'Bajista':'Neutral'})}><option>BUY</option><option>SELL</option><option>NEUTRAL</option></select><select className="input" value={draft.executionType} onChange={e=>setDraft({...draft,executionType:e.target.value})}><option>Ahora mismo</option><option>Zona de trabajo: esperar patrón de entrada</option><option>Solo observación</option><option>Idea invalidada</option></select><input className="input" placeholder="Temporalidad" value={draft.timeframe} onChange={e=>setDraft({...draft,timeframe:e.target.value})}/><input className="input" placeholder="Zona de trabajo / nivel clave" value={draft.zone} onChange={e=>setDraft({...draft,zone:e.target.value})}/><textarea className="input wide codeInput" placeholder={'Códigos MT5 separados por línea. Ej:\nXAUUSD BUY 2350 SL 2344 TP 2362\nXAUUSD SELL LIMIT 2368 SL 2374 TP 2352'} value={draft.marketCode||''} onChange={e=>setDraft({...draft,marketCode:e.target.value})}/><input className="input" placeholder="Entrada / gatillo" value={draft.entryTrigger||''} onChange={e=>setDraft({...draft,entryTrigger:e.target.value})}/><input className="input" placeholder="Stop loss / invalidación" value={draft.stopLoss||''} onChange={e=>setDraft({...draft,stopLoss:e.target.value,invalidation:e.target.value})}/><input className="input" placeholder="Take profit / objetivos" value={draft.takeProfit||''} onChange={e=>setDraft({...draft,takeProfit:e.target.value,targets:e.target.value})}/><input className="input" placeholder="Imagen / captura URL" value={draft.imageUrl||''} onChange={e=>setDraft({...draft,imageUrl:e.target.value})}/><input className="input" placeholder="Riesgo" value={draft.risk} onChange={e=>setDraft({...draft,risk:e.target.value})}/><select className="input" value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}><option>Espera</option><option>Activo</option><option>TP</option><option>Stop</option><option>BE</option><option>Invalidada</option></select><TextareaWithEmoji className="input wide" placeholder="Descripción / explicación completa de la idea" value={draft.explanation} onChange={e=>setDraft({...draft,explanation:e.target.value})}/><button className="primary" onClick={saveIdea}><Bell size={16}/>{draft.id?'Guardar cambios':'Guardar y notificar'}</button><button className="ghost" onClick={()=>setDraft(null)}>Cancelar</button></div>:<button className="primary" onClick={()=>setDraft(emptyIdeaDraft)}><Plus/>Nueva idea</button>}</Card>}
  <div className="ideaGrid">{data.ideas.map(i=><article className="idea ideaPremium" key={i.id}><div><span className={sideLabel(i)==='BUY'?'buy':sideLabel(i)==='SELL'?'sell':'pill'}>{sideLabel(i)}</span><span className="pill">{i.executionType||'Zona de trabajo'}</span><span className={getIdeaStatusClass(i.status)}>{ideaStatusLabel(i.status)}</span>{i.updatedAt&&<span className="pill edited">Editado</span>}</div><h3>{i.title||i.asset}</h3>{i.title&&<p className="ideaAssetLine">{i.asset}</p>}<p>{i.timeframe} · {i.zone}</p><p>{i.explanation||i.description}</p>{i.imageUrl&&<img className="ideaImage" src={i.imageUrl} alt="Captura de la idea"/>}<div className="ideaMetaGrid"><span><b>Entrada</b>{i.entryTrigger||'—'}</span><span><b>Stop loss</b>{i.stopLoss||i.invalidation||'—'}</span><span><b>Take profit</b>{i.takeProfit||i.targets||'—'}</span><span><b>Riesgo</b>{i.risk||'—'}</span></div><div className="ideaCopyBox marketCodes"><b>Códigos MT5</b><code>{ideaCode(i)||'Sin códigos cargados'}</code><button className="ghost compact" onClick={()=>copyText(ideaCode(i),'Códigos MT5 copiados')}><Copy size={14}/>Copiar códigos</button></div><div className="actions ideaActions"><button onClick={()=>like(i)} className={(i.likes||[]).includes(profile.uid)?'liked':''}><Heart size={16}/>{(i.likes||[]).length}</button><button onClick={()=>setLikesOpen(likesOpen===i.id?null:i.id)}><Users size={16}/>Ver likes</button><button onClick={()=>copyText(ideaText(i),'Idea completa copiada')}><Copy size={16}/>Copiar idea completa</button>{can&&<select className="input small" value={i.status||'Espera'} onChange={e=>updateDoc(doc(db,'ideas',i.id),{status:e.target.value,updatedAt:serverTimestamp()}).then(()=>toast('Estado de idea actualizado')).catch(()=>toast('No se pudo actualizar la idea.','error'))}>{['Espera','Activo','TP','Stop','BE','Invalidada'].map(x=><option key={x}>{x}</option>)}</select>}{canManageIdea(i)&&<button className="ghost compact" onClick={()=>editIdea(i)}><Edit3 size={16}/>Editar</button>}{canManageIdea(i)&&<button className="danger" onClick={()=>removeIdea(i)}><Trash2 size={16}/>Borrar</button>}</div>{likesOpen===i.id&&<div className="likesPanel"><b>Usuarios que dieron like</b>{likedUsers(i).length?<div>{likedUsers(i).map(u=><span className="likeChip" key={u.uid}><span className="avatar tiny">{u.avatar||String(u.name||u.email||'GE').slice(0,2).toUpperCase()}</span>{u.name||u.email||u.uid}</span>)}</div>:<small>Aún no hay likes</small>}</div>}</article>)}{!data.ideas.length&&<Empty title="Sin ideas publicadas" text="Cuando haya una hipótesis operativa, va a aparecer acá con contexto, niveles y estado." cta={can?'Nueva idea':'Volver al dashboard'} icon={Lightbulb} onClick={()=>can?setDraft(emptyIdeaDraft):window.dispatchEvent(new CustomEvent('mtc-tab',{detail:'dashboard'}))}/>}</div></main>}


async function callBrokerApi(path, payload = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Sesión no disponible. Volvé a iniciar sesión.');
  const token = await user.getIdToken();
  const res = await fetch(apiUrl(`/api/${path}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error en ${path}`);
  return data;
}
async function connectMetaTrader(payload) { return callBrokerApi('mtConnect', payload); }
async function syncMetaTrader(connectionId) { return callBrokerApi('mtSync', { connectionId }); }
async function disconnectMetaTrader(connectionId) { return callBrokerApi('mtDisconnect', { connectionId }); }
async function checkMetaTraderStatus(connectionId) { return callBrokerApi('mtConnectionStatus', { connectionId }); }

function brokerDate(value) {
  const d = timestampToDate(value);
  return d ? d.toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }) : 'Nunca';
}
function BrokerStatusPill({status}) {
  const s=String(status||'pending').toLowerCase();
  const label=s==='connected'?'Conectado':s==='error'?'Error':s==='disconnected'?'Desconectado':'Pendiente';
  return <span className={`brokerStatus brokerStatus${label}`}>{label}</span>;
}
function BrokerSync({data,profile}){
  const [notify,setNotify]=useState(()=>localStorage.getItem('mtc-mt5-notify')==='1');
  const importedTrades=(data.trades||[]).filter(t=>t.brokerSource==='metaapi');
  function activateReminder(){localStorage.setItem('mtc-mt5-notify','1'); setNotify(true); toast('Listo. Te avisaremos cuando las integraciones estén disponibles.','success')}
  return <main className="page brokerSyncPage comingSoonBrokerPage">
    <section className="brokerHero cleanBrokerHero">
      <div>
        <span className="brokerBadge"><Activity size={15}/> Integraciones profesionales</span>
        <h2>Integraciones MT4 / MT5</h2>
        <p>Centralizá tu operativa y mantené tu proceso conectado con las herramientas clave del ecosistema. Las integraciones disponibles dependen de tu membresía y del nivel de acceso activo.</p>
        <div className="brokerHeroStats"><span>Journal profesional</span><span>Membresías privadas</span><span>Ecosistema conectado</span></div>
      </div>
      <div className="brokerHeroPanel"><b>Conexión operativa</b><small>Usá esta sección para centralizar herramientas externas y mantener tu proceso ordenado según tu plan.</small></div>
    </section>

    <div className="brokerGrid">
      <Card title="Herramientas activas del ecosistema" sub="Tu plataforma centraliza operativa, gestión, revisión y evolución como trader.">
        <div className="comingSoonStack">
          <div className="comingSoonItem"><CheckCircle2 size={18}/><div><b>Journal manual disponible</b><p>Los traders ya pueden cargar operaciones, emociones, checklist, capturas, resultado en R y lecciones.</p></div></div>
          <div className="comingSoonItem"><CheckCircle2 size={18}/><div><b>Analytics disponible</b><p>La app ya puede medir rendimiento, comportamiento, sesiones, errores y evolución.</p></div></div>
          <div className="comingSoonItem muted"><Clock3 size={18}/><div><b>Integraciones según membresía</b><p>El acceso a conexiones externas se organiza por plan para mantener una experiencia clara, segura y profesional.</p></div></div>
        </div>
        <div className="brokerActions"><button className="primary" onClick={activateReminder}>{notify?'Aviso activado':'Avisarme cuando esté disponible'}</button></div>
      </Card>
      <Card title="Flujo del ecosistema" sub="Herramientas diseñadas para registrar, validar, medir y mejorar tu operativa diaria.">
        <div className="brokerFlow commercialFlow"><div><b>1</b><span>Membresía</span><p>Acceso privado al ecosistema según tu plan activo.</p></div><div><b>2</b><span>Journal</span><p>Registro profesional de operaciones, emociones y lecciones.</p></div><div><b>3</b><span>Checklist</span><p>Validación operativa antes de ejecutar una idea.</p></div><div><b>4</b><span>Analytics</span><p>Medición objetiva para convertir datos en disciplina.</p></div></div>
      </Card>
    </div>

    <Card title="Registro de integraciones" sub="Cuando conectes una fuente operativa, este espacio te ayudará a revisar actividad y consistencia.">
      <div className="syncHistory">{importedTrades.slice(0,8).map(t=><div key={t.id}><span>{t.tradingDay||t.date}</span><b>{t.asset} · {t.side}</b><strong className={Number(t.resultMoney)>=0?'pos':'neg'}>{Number(t.resultMoney)>=0?'+':''}{money(t.resultMoney)}</strong></div>)}{!importedTrades.length&&<p className="muted">Todavía no hay actividad importada. Mientras tanto, podés mantener tu proceso completo desde Journal, Checklist y Analytics.</p>}</div>
    </Card>
  </main>
}

function OnlinePage({data,profile}){
  const users=(data.users||[]).filter(u=>u.status==='approved'||u.approved||['admin','moderador'].includes(u.role));
  const online=users.filter(isUserOnline).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
  const offline=users.filter(u=>!isUserOnline(u)).sort((a,b)=>((b.lastSeen?.toDate?.()?.getTime?.()||0)-(a.lastSeen?.toDate?.()?.getTime?.()||0)) || String(a.name||'').localeCompare(String(b.name||''))); 
  const row=u=><div className="onlineRow" key={u.uid}><div className="avatar small">{u.avatar||String(u.name||u.email||'MT').slice(0,2).toUpperCase()}</div><div><b>{u.name||u.email}</b><small>{displayRoleLabel(u)} · {isUserOnline(u)?'online ahora':u.lastSeen?.toDate?`última vez ${u.lastSeen.toDate().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}`:'sin actividad reciente'}</small></div><span className={isUserOnline(u)?'onlineDot on':'onlineDot'} /></div>;
  return <main className="page"><section className="arenaHero"><div><span><Activity size={16}/> Presencia en tiempo real</span><h2>Miembros online</h2><p>Visualiza quién está dentro de la app. El estado se actualiza automáticamente mientras el usuario mantiene la app abierta.</p></div><div className="arenaScore"><b>{online.length}</b><small>online</small></div></section><div className="grid2"><Card title="Online ahora" sub="Miembros activos en la plataforma.">{online.length?online.map(row):<Empty title="Sin usuarios online" text="Cuando alguien tenga la app abierta aparecerá acá."/>}</Card><Card title="Miembros recientes/offline" sub="Última actividad detectada.">{offline.length?offline.slice(0,20).map(row):<Empty title="Sin usuarios offline" text="Todavía no hay más usuarios aprobados."/>}</Card></div></main>
}

function Results({data,profile}){
  const admin=isPrivileged(profile);
  const [draft,setDraft]=useState({title:'',amount:'',percent:'',r:'',account:'',note:'',link:'',tradeId:'',reviewRequested:false,reviewQuestion:''});
  const [filter,setFilter]=useState('season');
  const [detail,setDetail]=useState(null);
  const seasonId=quarterId(new Date());
  const myTrades=(data.trades||[]).filter(t=>t.userId===profile.uid).sort((a,b)=>String(b.date||b.createdAt||'').localeCompare(String(a.date||a.createdAt||''))).slice(0,80);
  function quarterId(d){const date=new Date(d); const q=Math.floor(date.getMonth()/3)+1; return `${date.getFullYear()}-Q${q}`}
  function postDate(r){return new Date(r.createdAt?.toDate?.() || r.createdAt || r.date || r.createdDate || Date.now())}
  function isCurrentSeason(r){return (r.seasonId||quarterId(postDate(r)))===seasonId}
  function countsForRanking(r){return isCurrentSeason(r) && r.countsForSeason === true && ['validated','featured'].includes(r.validationStatus)}
  function rankingStateLabel(r){return countsForRanking(r)?'Cuenta para ranking':r.validationStatus==='rejected'?'No cuenta para ranking':r.validationStatus==='needs_more_context'?'No cuenta todavía · falta contexto':'No cuenta todavía'}
  function hasResultEvidence(r,t,c){return !!(r.link || r.tradeId || r.checklistId || t || c || String(r.note||'').trim().length>24)}
  function linkedTrade(r){return (data.trades||[]).find(t=>t.id===r.tradeId || t.id===r.linkedTradeId)}
  function linkedChecklist(r,t){return (data.checklists||[]).find(c=>c.id===r.checklistId || c.id===t?.checklistId)}
  function validationLabel(s){return ({pending_validation:'Pendiente de validación',validated:'Validado por mentor',rejected:'No cuenta para ranking',needs_more_context:'Requiere más contexto',featured:'Destacado'})[s||'pending_validation']||s}
  function validationTone(s){return s==='validated'||s==='featured'?'good':s==='rejected'?'bad':s==='needs_more_context'?'warn':'neutral'}
  function scoreResult(r){
    const t=linkedTrade(r);
    const baseR=Math.max(0,Math.min(30,Number(r.r||0)*6));
    const checklist=t?.checklistId||r.checklistId?Math.min(20,(t?.checklistFinalGreen||r.checklistFinalGreen)?20:10):0;
    const behavior=Math.min(20,Number(t?.behaviorScore||r.behaviorScore||0)/5);
    const risk=Math.max(0,15-Math.max(0,Math.abs(Number(r.percent||0))-5)*1.5);
    const mentor=['validated','featured'].includes(r.validationStatus)?10:r.validationStatus==='needs_more_context'?4:0;
    const participation=Math.min(5,Number(r.note?.length||0)>35?5:2);
    return Math.round(Math.min(100,baseR+checklist+behavior+risk+mentor+participation));
  }
  function classScore(n){return n>=90?'Elite':n>=80?'Muy consistente':n>=70?'En progreso sólido':n>=50?'Necesita ajuste':'Proceso incompleto'}
  const resultPosts=(data.resultPosts||[]).map(r=>({validationStatus:r.validationStatus||r.reviewStatus||'pending_validation',seasonId:r.seasonId||quarterId(postDate(r)),...r}));
  const visible=resultPosts.filter(r=>{
    if(filter==='season')return isCurrentSeason(r);
    if(filter==='month')return postDate(r).toISOString().slice(0,7)===new Date().toISOString().slice(0,7);
    if(filter==='validated')return ['validated','featured'].includes(r.validationStatus);
    if(filter==='pending')return ['pending_validation','pending','in_review','needs_more_context'].includes(r.validationStatus);
    if(filter==='featured')return r.validationStatus==='featured'||r.featured;
    if(filter==='ranking')return countsForRanking(r);
    if(filter==='mine')return r.authorId===profile.uid;
    if(filter==='withChecklist'){const t=linkedTrade(r); return !!(r.checklistId||t?.checklistId)}
    if(filter==='review')return !!(r.reviewRequested||r.mentorReviewRequested);
    return true;
  }).sort((a,b)=>postDate(b)-postDate(a));
  const seasonResults=resultPosts.filter(countsForRanking);
  const ranking=Object.values(seasonResults.reduce((acc,r)=>{
    const id=r.authorId||r.authorName||'anon';
    const t=linkedTrade(r); const valid=['validated','featured'].includes(r.validationStatus);
    acc[id]=acc[id]||{uid:id,name:r.authorName||'Trader',avatar:r.avatar||'',amount:0,r:0,count:0,validated:0,checklist:0,behavior:[],score:0};
    acc[id].amount+=Number(r.amount||0); acc[id].r+=Number(r.r||0); acc[id].count++; acc[id].validated+=valid?1:0;
    if(r.checklistId||t?.checklistId)acc[id].checklist++;
    if(t?.behaviorScore||r.behaviorScore)acc[id].behavior.push(Number(t?.behaviorScore||r.behaviorScore));
    return acc;
  },{})).map(x=>{
    const avgBehavior=x.behavior.length?x.behavior.reduce((a,b)=>a+b,0)/x.behavior.length:0;
    const checklistPct=x.count?x.checklist/x.count*100:0;
    const resultPts=Math.min(30,Math.max(0,x.r*5));
    const checklistPts=Math.min(20,checklistPct*.2);
    const behaviorPts=Math.min(20,avgBehavior*.2);
    const riskPts=Math.min(15,Math.max(6,15-Math.max(0,x.count-18)*.5));
    const mentorPts=Math.min(10,x.validated*4);
    const participationPts=Math.min(5,x.count*1.2);
    return {...x,avgBehavior,checklistPct,score:Math.round(resultPts+checklistPts+behaviorPts+riskPts+mentorPts+participationPts)};
  }).sort((a,b)=>b.score-a.score);
  const podium=ranking.slice(0,3);
  const pending=resultPosts.filter(r=>isCurrentSeason(r) && ['pending_validation','pending','in_review','needs_more_context'].includes(r.validationStatus)).sort((a,b)=>{const pa=a.validationStatus==='needs_more_context'?1:0; const pb=b.validationStatus==='needs_more_context'?1:0; return pb-pa || postDate(b)-postDate(a)});
  const badges=[{label:'10 trades con checklist',icon:'🧩',text:'Proceso validado antes de operar'},{label:'5 resultados validados',icon:'✅',text:'Evidencia revisada por mentor'},{label:'Semana sin romper reglas',icon:'🛡️',text:'Riesgo y conducta bajo control'},{label:'3 trades revisados',icon:'🧠',text:'Feedback aplicado a ejecución'},{label:'Primera entrada A+',icon:'👑',text:'Checklist completo + score alto'},{label:'80+ behavior score',icon:'🎯',text:'Disciplina por encima del resultado'}];
  async function publishResult(){
    if(!draft.title.trim())return toast('Agregá un título al resultado','warning');
    if(!draft.amount && !draft.percent && !draft.r)return toast('Agregá $ / % o R para medir el resultado','warning');
    const t=myTrades.find(x=>x.id===draft.tradeId);
    const payload={title:draft.title.trim(),amount:toNumberSafe(draft.amount),percent:toNumberSafe(draft.percent),r:toNumberSafe(draft.r),note:draft.note||'',account:draft.account||t?.accountName||t?.accountId||'',link:draft.link||t?.captureUrl||t?.captureLink||'',tradeId:draft.tradeId||'',checklistId:t?.checklistId||'',checklistFinalGreen:!!t?.checklistFinalGreen,checklistAPlus:!!t?.checklistAPlus,authorId:profile.uid,authorName:profile.name,avatar:profile.avatar||'',createdAt:serverTimestamp(),createdDate:today(),seasonId,validationStatus:'pending_validation',countsForSeason:false,featured:false,reviewRequested:!!draft.reviewRequested,reviewStatus:draft.reviewRequested?'pending':'none',reviewRequestedAt:draft.reviewRequested?serverTimestamp():null,reviewRequestedBy:draft.reviewRequested?profile.uid:null,reviewQuestion:draft.reviewQuestion||'',likes:[]};
    try{await addDoc(collection(db,'resultPosts'),payload); setDraft({title:'',amount:'',percent:'',r:'',account:'',note:'',link:'',tradeId:'',reviewRequested:false,reviewQuestion:''}); toast(draft.reviewRequested?'Resultado publicado y enviado a revisión':'Resultado publicado','success')}catch(e){console.error(e); toast('No se pudo publicar el resultado','error')}
  }
  async function updateResult(r,patch){if(!admin)return; const t=linkedTrade(r),c=linkedChecklist(r,t); if(['validated','featured'].includes(patch.validationStatus) && !hasResultEvidence(r,t,c) && !confirm('Este resultado no tiene suficiente evidencia. Podés validarlo igual, pero se recomienda pedir más contexto. ¿Continuar?'))return; try{await setDoc(doc(db,'resultPosts',r.id),{...patch,mentorReviewedAt:serverTimestamp(),mentorReviewedBy:profile.uid},{merge:true}); toast('Resultado actualizado','success')}catch(e){console.error(e); toast('No se pudo actualizar el resultado','error')}}
  function ResultCard({r}){const t=linkedTrade(r),c=linkedChecklist(r,t),sc=scoreResult(r),tone=validationTone(r.validationStatus); return <article className={`resultPost arenaResult ${tone}`}><div className="resultPostTop"><span className="avatar small">{r.avatar||String(r.authorName||'MT').slice(0,2)}</span><div><b>{r.authorName||'Trader'}</b><small>{r.createdDate||safeDate(r.createdAt)} · {r.account||t?.accountName||'Cuenta no especificada'}</small></div><span className={`statusBadge ${tone}`}>{validationLabel(r.validationStatus)}</span></div><h3>{r.title}</h3><div className="resultPostKpis"><strong className={Number(r.amount)>=0?'pos':'neg'}>{Number(r.amount)>0?'+':''}{money(r.amount)}</strong><span>{Number(r.percent)>0?'+':''}{pct(r.percent)}</span><span>{Number(r.r)>0?'+':''}{Number(r.r||0).toFixed(2)}R</span><span>{sc}/100 score</span></div><p>{r.note||'Sin contexto cargado.'}</p><div className="resultTags">{t&&<span>Trade vinculado</span>}{c&&<span>Checklist {t?.checklistFinalGreen||r.checklistFinalGreen?'luz verde':'vinculado'}</span>}{r.reviewRequested&&<span>En revisión mentor</span>}{r.validationStatus==='featured'&&<span>Destacado</span>}<span className={countsForRanking(r)?'rankCounts':'rankPending'}>{rankingStateLabel(r)}</span></div>{r.link&&<a href={r.link} target="_blank" rel="noreferrer">Abrir evidencia</a>}<div className="actions compactActions"><button className="ghost compact" onClick={()=>setDetail(r)}>Ver detalle</button>{admin&&<><button className="ghost compact" onClick={()=>updateResult(r,{validationStatus:'validated',countsForSeason:true})}>Validar</button><button className="ghost compact" onClick={()=>updateResult(r,{validationStatus:'needs_more_context',countsForSeason:false})}>Pedir contexto</button><button className="ghost compact" onClick={()=>updateResult(r,{validationStatus:'featured',featured:true,countsForSeason:true})}>Destacar</button><button className="ghost compact danger" onClick={()=>updateResult(r,{validationStatus:'rejected',countsForSeason:false})}>Rechazar</button></>}</div></article>}
  function ResultDetail({r}){const t=linkedTrade(r),c=linkedChecklist(r,t); const [response,setResponse]=useState(r.mentorReviewResponse||''); const [status,setStatus]=useState(r.validationStatus||'pending_validation'); return <div className="modal"><div className="modalCard resultDetailModal"><div className="modalHead"><div><h3>{r.title}</h3><p>{r.authorName} · {validationLabel(status)}</p></div><button className="ghost compact" onClick={()=>setDetail(null)}>Cerrar</button></div><div className="detailKpis"><div><span>P/L</span><b className={Number(r.amount)>=0?'pos':'neg'}>{money(r.amount)}</b></div><div><span>%</span><b>{pct(r.percent)}</b></div><div><span>R</span><b>{Number(r.r||0).toFixed(2)}R</b></div><div><span>Score</span><b>{scoreResult(r)}/100</b></div></div><div className="detailGrid"><div className="detailBlock"><span>Contexto / aprendizaje</span><p>{r.note||'Sin contexto.'}</p></div><div className="detailBlock"><span>Evidencia</span>{r.link?<a href={r.link} target="_blank" rel="noreferrer">Abrir evidencia</a>:<p>Sin evidencia externa.</p>}</div>{t&&<div className="detailBlock"><span>Trade vinculado</span><p>{t.asset} · {t.session} · {normalizeTradeSetup(t)} · {Number(t.resultR||0).toFixed(2)}R · Behavior {t.behaviorScore||behaviorScoreFromTrade(t)}/100</p></div>}{c&&<div className="detailBlock"><span>Checklist vinculado</span><p>{c.asset} · Score {c.score}/100 · {c.finalGreen?'Luz verde':'Luz roja'} · {c.operationalState||''}</p></div>}<div className="detailBlock"><span>Revisión mentor</span><p>{r.mentorReviewResponse||'Sin devolución todavía.'}</p></div></div>{admin&&<div className="reviewBox"><div className="formGrid labeled"><Field label="Estado"><select className="input" value={status} onChange={e=>setStatus(e.target.value)}><option value="pending_validation">Pendiente</option><option value="validated">Validado</option><option value="needs_more_context">Pedir más contexto</option><option value="featured">Destacado</option><option value="rejected">Rechazado</option></select></Field><Field label="Comentario mentor"><TextareaWithEmoji className="input" value={response} onChange={e=>setResponse(e.target.value)} placeholder="Feedback, corrección o motivo de validación."/></Field></div><button className="primary" onClick={()=>{updateResult(r,{validationStatus:status,mentorReviewResponse:response,countsForSeason:['validated','featured'].includes(status),featured:status==='featured'}); setDetail(null)}}>Guardar revisión</button></div>}</div></div>}
  return <main className="page resultsArena resultsPro"><section className="arenaHero upgraded"><div><span><Trophy size={16}/> Arena Moisés</span><h2>Resultados del Club</h2><p>Competí sanamente, compartí tu proceso y medí progreso con evidencia. Los resultados no se publican como casino: se publican con contexto, disciplina y aprendizaje.</p><div className="heroActions"><button className="primary compact" onClick={()=>document.querySelector('.resultComposer')?.scrollIntoView({behavior:'smooth'})}><Plus size={16}/> Subir resultado</button><button className="ghost compact" onClick={()=>{setFilter('season'); setTimeout(()=>document.getElementById('quarter-season')?.scrollIntoView({behavior:'smooth',block:'start'}),60)}}>Ver trimestre</button></div></div><div className="arenaScore"><b>{seasonId}</b><small>temporada activa</small><em>{seasonResults.length} resultados validados</em></div></section>
    <section id="quarter-season" className="competitionPanel quarterSeasonPanel"><div><h3>Competencia trimestral Moisés</h3><p>Los 3 traders con mejor combinación de resultado, disciplina y consistencia podrán ganar cuentas/challenges.</p></div><div className="rulesGrid">{['Se mide en R y %, no solo dólares','Checklist y evidencia suman puntos','No se premia sobreoperar','Riesgo excesivo resta valor','Mentor valida resultados clave','Resultados rechazados no rankean'].map(x=><span key={x}>{x}</span>)}</div></section>
    <div id="quarter-ranking"><Card title="Podio de consistencia" sub="El podio solo considera resultados validados por mentor o destacados. Moisés Score: R, checklist, comportamiento, riesgo y participación."><div className="podiumGrid arenaPodium">{podium.map((r,i)=><div className={`podiumCard p${i+1}`} key={r.uid}><span>{i===0?'🥇':i===1?'🥈':'🥉'}</span><h3>{r.name}</h3><b>{r.score}/100</b><p>{classScore(r.score)} · {r.r.toFixed(2)}R · {Math.round(r.checklistPct)}% checklist · Behavior {Math.round(r.avgBehavior||0)}/100</p><div className="progress"><i style={{width:`${Math.min(100,r.score)}%`}}/></div></div>)}{!podium.length&&<Empty title="Sin ranking" text="Cuando haya resultados del trimestre aparecerá el podio." cta="Subir resultado" icon={Trophy} onClick={()=>document.querySelector('.resultComposer')?.scrollIntoView({behavior:'smooth',block:'start'})}/>}</div></Card></div>
    <div className="grid2"><Card title="Score de consistencia" sub="Cómo se calcula el ranking trimestral."><div className="scoreRules"><div><b>30</b><span>Resultado en R</span></div><div><b>20</b><span>Checklist completo</span></div><div><b>20</b><span>Behavior score</span></div><div><b>15</b><span>Control de riesgo</span></div><div><b>10</b><span>Revisión mentor</span></div><div><b>5</b><span>Participación sana</span></div></div></Card><Card title="Pendientes de validación" sub="Resultados que necesitan revisión o contexto."><div className="miniReviewList">{pending.slice(0,6).map(r=><button key={r.id} onClick={()=>setDetail(r)}><span>{r.authorName}</span><b>{r.title}</b><em>{validationLabel(r.validationStatus)}</em></button>)}{!pending.length&&<Empty title="Sin pendientes" text="No hay resultados esperando revisión."/>}</div></Card></div>
    <Card className="resultComposer" title="Subir resultado" sub="Publicá con evidencia, contexto y aprendizaje. El ranking premia proceso, no show off."><div className="formGrid labeled"><Field label="Título"><input className="input" placeholder="Ej: Semana verde / Payout / +2.7R en NY" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></Field><Field label="Vincular trade del Journal"><select className="input" value={draft.tradeId} onChange={e=>{const t=myTrades.find(x=>x.id===e.target.value); setDraft({...draft,tradeId:e.target.value,account:draft.account||t?.accountName||t?.accountId||'',amount:draft.amount||String(t?.resultMoney||''),percent:draft.percent||String(t?.resultPct||''),r:draft.r||String(t?.resultR||''),link:draft.link||t?.captureUrl||t?.captureLink||''})}}><option value="">Sin trade vinculado</option>{myTrades.map(t=><option key={t.id} value={t.id}>{t.date||t.tradingDay} · {t.asset} · {Number(t.resultR||0).toFixed(2)}R · {money(t.resultMoney)}</option>)}</select></Field><Field label="Cuenta / challenge"><input className="input" placeholder="Ej: 25K / 100K / Personal" value={draft.account} onChange={e=>setDraft({...draft,account:e.target.value})}/></Field><Field label="Resultado $"><DecimalInput value={draft.amount} onChange={v=>setDraft({...draft,amount:v})} placeholder="Ej: 500"/></Field><Field label="Resultado %"><DecimalInput value={draft.percent} onChange={v=>setDraft({...draft,percent:v})} placeholder="Ej: 2.5"/></Field><Field label="Resultado R"><DecimalInput value={draft.r} onChange={v=>setDraft({...draft,r:v})} placeholder="Ej: 3.2"/></Field><Field label="Link/captura externa"><input className="input" placeholder="Drive, Discord, imagen, video..." value={draft.link} onChange={e=>setDraft({...draft,link:e.target.value})}/></Field><Field label="Contexto / aprendizaje"><TextareaWithEmoji className="input" placeholder="Qué hiciste bien, qué aprendiste, qué repetís..." value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/></Field></div><label className="switchLine reviewSwitch"><input type="checkbox" checked={!!draft.reviewRequested} onChange={e=>setDraft({...draft,reviewRequested:e.target.checked})}/><span>Enviar este resultado/trade a revisión del mentor</span></label>{draft.reviewRequested&&<TextareaWithEmoji className="input" value={draft.reviewQuestion} onChange={e=>setDraft({...draft,reviewQuestion:e.target.value})} placeholder="¿Qué querés que revise el mentor? Contexto, entrada, gestión, psicología..."/>}<button className="primary" onClick={publishResult}><Plus/>Publicar resultado</button></Card>
    <Card title="Muro de resultados" sub="Filtrá por trimestre, validados, pendientes, destacados o tus resultados."><div className="filterPills">{[['season','Este trimestre'],['month','Mes actual'],['all','Todos'],['validated','Validados'],['pending','Pendientes'],['featured','Destacados'],['ranking','Cuentan para ranking'],['mine','Mis resultados'],['withChecklist','Con checklist'],['review','En revisión mentor']].map(([id,label])=><button key={id} className={filter===id?'active':''} onClick={()=>setFilter(id)}>{label}</button>)}</div><div className="resultFeed">{visible.map(r=><ResultCard key={r.id} r={r}/>)}{!visible.length&&<Empty title="Sin resultados" text="No hay resultados para este filtro." cta="Cambiar a todos" icon={Trophy} onClick={()=>setFilter('all')}/>}</div></Card>
    <div className="grid2"><Card title="Ranking trimestral" sub="Score equilibrado: no premia riesgo excesivo ni sobreoperar.">{ranking.map((r,i)=><div className="rank premiumRank" key={r.uid}><strong>#{i+1}</strong><span>{r.name}</span><b>{r.score}/100</b><small>{r.count} resultados · {r.validated} validados · {r.r.toFixed(2)}R</small></div>)}{!ranking.length&&<Empty title="Sin ranking" text="Subí resultados validados para activar el ranking." cta="Subir resultado" icon={Trophy} onClick={()=>document.querySelector('.resultComposer')?.scrollIntoView({behavior:'smooth',block:'start'})}/>}</Card><Card title="Insignias del club" sub="Logros que premian hábitos, evidencia y consistencia."><div className="badgeGrid proBadges">{badges.map(b=><div className="achievement" key={b.label}><span>{b.icon}</span><b>{b.label}</b><small>{b.text}</small></div>)}</div></Card></div>{detail&&<ResultDetail r={detail}/>}</main>
}

function Announcements({data,profile}){
  const admin=isPrivileged(profile);
  const announcements=(data.posts||[]).filter(p=>p.category==='Anuncio').sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0));
  async function togglePin(p){if(!admin)return; await updateDoc(doc(db,'posts',p.id),{pinned:!p.pinned}); toast(p.pinned?'Anuncio desfijado':'Anuncio fijado');}
  async function remove(p){if(!admin||!confirm('¿Borrar este anuncio?'))return; await deleteDoc(doc(db,'posts',p.id)); toast('Anuncio borrado');}
  return <main className="page"><section className="arenaHero announcementsHero"><div><span><Megaphone size={16}/> Comunicados oficiales</span><h2>Anuncios del mentor</h2><p>Todo comunicado importante queda guardado acá. Las notificaciones ahora te traen directo a esta sección.</p></div></section><div className="feed">{announcements.map(p=><article className={`post announcementCard ${p.pinned?'pinned':''}`} key={p.id}><div className="postTop"><div className="avatar">MT</div><div><b>{p.authorName||'MTC Analytics'}</b><p>{safeDate(p.createdAt)||p.createdDate}</p></div>{p.pinned&&<span className="pill gold"><Bookmark size={12}/> Fijado</span>}</div><p>{p.body}</p>{admin&&<div className="actions"><button onClick={()=>togglePin(p)}><Bookmark size={16}/>{p.pinned?'Desfijar':'Fijar'}</button><button className="danger" onClick={()=>remove(p)}><Trash2 size={16}/>Borrar</button></div>}</article>)}{!announcements.length&&<Empty title="Sin anuncios" text="Cuando publiques un anuncio desde Admin o Workspace aparecerá acá."/>}</div></main>
}

function ChatPage({data,profile}){
  const members=(data.users||[]).filter(u=>u.uid!==profile.uid && (u.status==='approved'||isPrivileged(profile)));
  const [selected,setSelected]=useState(null);
  const [text,setText]=useState('');
  const conversations=members.map(u=>{
    const cid=[profile.uid,u.uid].sort().join('_');
    const msgs=(data.messages||[]).filter(m=>m.chatId===cid).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    const unread=msgs.filter(m=>m.senderId!==profile.uid && !(m.readBy||[]).includes(profile.uid)).length;
    const last=msgs[0];
    return {user:u,chatId:cid,msgs,last,unread,lastTime:last?.createdAt?.seconds||0};
  }).sort((a,b)=>b.unread-a.unread || b.lastTime-a.lastTime || String(a.user.name||'').localeCompare(String(b.user.name||'')));
  const current=selected ? conversations.find(c=>c.user.uid===selected.uid) : conversations[0];
  const partner=current?.user;
  const chatId=current?.chatId||'';
  const msgs=(current?.msgs||[]).slice().sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0));
  useEffect(()=>{msgs.filter(m=>m.senderId!==profile.uid && !(m.readBy||[]).includes(profile.uid)).forEach(m=>updateDoc(doc(db,'messages',m.id),{readBy:[...(m.readBy||[]),profile.uid]}).catch(()=>{}));},[chatId,msgs.length]);
  async function send(){if(!partner||!text.trim())return; const body=text.trim(); setText(''); await addDoc(collection(db,'messages'),{chatId,participants:[profile.uid,partner.uid].sort(),senderId:profile.uid,fromId:profile.uid,fromName:profile.name,toId:partner.uid,toName:partner.name,body,readBy:[profile.uid],createdAt:serverTimestamp(),createdDate:today()}); await notifyUsers([partner],`Nuevo mensaje privado de ${profile.name}.`,'chat',{target:'chat'}); toast('Mensaje enviado');}
  return <main className="page chatPage"><section className="arenaHero"><div><span><MessageCircle size={16}/> Mensajes privados</span><h2>Chat interno</h2><p>Ordenado por conversaciones con mensajes nuevos primero, para que ningún mensaje recibido se pierda.</p></div><div className="arenaScore"><b>{conversations.reduce((a,c)=>a+c.unread,0)}</b><small>sin leer</small></div></section><div className="chatLayout"><Card title="Conversaciones" sub="Primero aparecen los mensajes recibidos sin leer."><div className="memberList">{conversations.map(c=><button key={c.user.uid} className={`${partner?.uid===c.user.uid?'active':''} ${c.unread?'unread':''}`} onClick={()=>setSelected(c.user)}><span className="avatar small">{c.user.avatar||c.user.name?.slice(0,2)||'MT'}</span><div><b>{c.user.name}</b><small>{c.last?c.last.body:'Sin mensajes todavía'}</small></div>{c.unread>0&&<em>{c.unread}</em>}</button>)}{!conversations.length&&<Empty title="Sin miembros" text="Cuando haya miembros aprobados aparecerán acá."/>}</div></Card><Card title={partner?`Chat con ${partner.name}`:'Chat privado'} sub="Mensajes uno a uno dentro de la plataforma."><div className="messagesBox">{msgs.map(m=><div key={m.id} className={(m.fromId||m.senderId)===profile.uid?'msg me':'msg'}><b>{m.fromName}</b><p>{m.body}</p><small>{safeDate(m.createdAt)||m.createdDate}</small></div>)}{partner&&!msgs.length&&<Empty title="Sin mensajes" text="Iniciá una conversación privada."/>}</div>{partner&&<div className="chatComposer"><InputWithEmoji className="input" value={text} onChange={e=>setText(e.target.value)} placeholder="Escribí un mensaje privado..."/><button className="primary" onClick={send}>Enviar</button></div>}</Card></div></main>
}

const coachKnowledge=[
 {keys:['ansiedad','nervio','acelerado','inquieto'],ans:'Ansiedad = exceso de futuro. Tu tarea no es adivinar el mercado, es esperar tu modelo. Bajá el riesgo o no operes hasta poder aceptar la pérdida antes de entrar.'},
 {keys:['miedo','perder','duda'],ans:'El miedo suele aparecer cuando el riesgo es emocionalmente grande o el setup no está claro. Reducí tamaño, verificá checklist y preguntate: ¿tomaría este trade si la operación anterior hubiera sido ganadora?'},
 {keys:['venganza','recuperar','perdi','perdí','revenge'],ans:'Eso es recuperación, no trading. Regla profesional: después de una pérdida emocional, no se toma el siguiente setup salvo que pasen 15 minutos, checklist completo y riesgo reducido.'},
 {keys:['sobreoper','muchos trades','muchas entradas','no puedo parar'],ans:'Sobreoperar es buscar alivio, no edge. Cerrá la plataforma cuando llegues al límite diario. La consistencia se construye evitando trades medianos, no tomando más trades.'},
 {keys:['confianza','seguro','perfecto','no puede fallar'],ans:'Exceso de confianza. Ningún setup es certeza. Convertí la emoción en protocolo: contexto, liquidez, confirmación, trigger, RR y aceptación de pérdida.'},
 {keys:['disciplina','plan','rompi'],ans:'Disciplina no es motivación; es fricción contra el impulso. Escribí la regla que rompiste, el costo exacto y la acción preventiva para mañana.'},
 {keys:['fomo','se va','me lo pierdo'],ans:'FOMO significa que querés participar, no que haya oportunidad. Si el precio ya se fue, tu trabajo es esperar el próximo ciclo: liquidez, reacción, confirmación y precio de entrada.'},
 {keys:['racha','ganando','perdiendo'],ans:'Las rachas no cambian la probabilidad del siguiente trade. Solo tu ejecución importa. No subas riesgo por racha ganadora ni lo fuerces por racha perdedora.'},
 {keys:['drawdown','dd','bajon','bajón'],ans:'En drawdown, el objetivo no es recuperar: es volver a ejecutar limpio. Reducí riesgo 30-50%, baja frecuencia y operá solo A/A+ hasta estabilizar.'},
 {keys:['fondeo','challenge','prop firm'],ans:'En fondeo se gana sobreviviendo. Prioridad: límite diario, consistencia, no violar reglas y evitar días extremos que destruyan la curva.'},
 {keys:['oro','xau','xauusd'],ans:'En XAUUSD evitá perseguir velas. Esperá liquidez, desplazamiento, reacción clara y stop lógico. Oro premia paciencia y castiga impulsividad.'},
 {keys:['noticias','news','cpi','nfp','fomc'],ans:'En noticias, no necesitás anticipar. Esperá expansión, toma de liquidez y retest/confirmación. Si el spread o la velocidad te supera, no es tu trade.'},
 {keys:['riesgo','lotaje','lote'],ans:'El tamaño correcto es el que te permite perder sin cambiar tu estado mental. Si el lotaje te altera, es demasiado grande aunque técnicamente sea válido.'},
 {keys:['entrada','trigger','gatillo'],ans:'Una entrada profesional no es donde “parece barato”; es donde el mercado ya mostró intención y tu riesgo queda definido.'},
 {keys:['salida','cerrar','tp','take profit'],ans:'Gestioná antes de entrar. Si no sabés dónde tomar ganancias, no tenés trade: tenés deseo de que el precio te pague.'},
 {keys:['stop','sl','stop loss'],ans:'El stop debe invalidar la idea, no proteger tu ego. Si movés el stop, convertís una pérdida acotada en una decisión emocional.'},
 {keys:['paciencia','esperar'],ans:'Esperar también es operar. Tu capital crece por las operaciones que tomás y por las que evitás.'},
 {keys:['consistencia','constante'],ans:'Consistencia = mismo proceso repetido bajo emociones diferentes. Medí calidad, no solo resultado.'},
 {keys:['perfeccionismo','perfecto'],ans:'No busques certeza. Buscá suficientes confluencias + riesgo asimétrico + ejecución repetible.'},
 {keys:['impulsivo','impulso'],ans:'Impulso detectado: pausa física. Levantate, respirá, escribí el motivo del trade. Si no podés escribirlo claro, no se opera.'},
 {keys:['basico','principiante','empezando'],ans:'Base profesional: 1 setup, 1 horario, 1 riesgo fijo, 1 journal honesto. No agregues complejidad antes de tener repetición.'},
 {keys:['avanzado','profesional','pro'],ans:'Nivel profesional: filtrás más de lo que operás. Buscás asimetría, contexto, timing, liquidez y preservación emocional.'}
];
function CoachIA({data,profile}){
  const [q,setQ]=useState(''),[ans,setAns]=useState('');
  const faqs=['Tengo ansiedad antes de operar','Quiero recuperar una pérdida','Estoy sobreoperando','Me da FOMO','Estoy en drawdown','Cómo gestionar riesgo','Cómo operar noticias','Cómo mejorar mi disciplina','Cuándo no operar','Cómo ser más consistente'];
  function analyze(custom=q){const t=String(custom||q).toLowerCase(); let parts=coachKnowledge.filter(k=>k.keys.some(x=>t.includes(x))).map(k=>k.ans); if(!parts.length)parts=[
    'Lectura general: volvé al proceso. No necesitás predecir; necesitás ejecutar solo cuando tu modelo aparece.',
    'Preguntas: ¿hay contexto? ¿hay liquidez tomada? ¿hay confirmación? ¿hay RR? ¿acepto perder el riesgo sin tocar el stop?'
  ];
  parts.push('Regla de cierre: si tu estado emocional busca alivio, validación o recuperación, no estás operando: estás reaccionando. Volvé al checklist.'); setAns(parts.join('\n\n'));}
  const prompt=`Actúa como psicólogo de trading de Moisés Trading Club. Analiza mi situación sin motivación vacía, detecta sesgos emocionales, riesgo de venganza/sobreoperativa y dame una regla concreta. Contexto: ${q}`;
  return <main className="page"><Card title="Coach psicológico de trading" sub="IA-lite con memoria ampliada: psicología, riesgo, noticias, fondeo y ejecución."><div className="coachFaqs">{faqs.map(f=><button key={f} onClick={()=>{setQ(f); analyze(f)}}>{f}</button>)}</div><TextareaWithEmoji className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Escribí cómo te sentís, qué trade querés tomar o qué error repetiste..."/><div className="actions"><button className="primary" onClick={()=>analyze()}><Activity size={16}/>Analizar estado mental</button><button className="ghost" onClick={()=>copyText(prompt,'Prompt para IA copiado')}><Copy size={16}/>Copiar prompt avanzado</button></div>{ans&&<div className="coachAnswer"><h3>Lectura del coach</h3>{ans.split('\n\n').map((p,i)=><p key={i}>{p}</p>)}</div>}</Card><Card title="Coach avanzado" sub="Análisis guiado para mejorar conducta, riesgo y ejecución."><p className="muted">Usá este espacio para ordenar tus pensamientos, detectar patrones repetidos y convertir cada sesión en una decisión más consciente.</p></Card></main>
}

function Notifications({data,profile,setTab}){async function read(n){await markNotificationAsRead(n.id); const target=n.target||n.type; if(target==='announcement'||target==='announcements') setTab('announcements'); else if(target==='idea'||target==='ideas') setTab('ideas'); else if(target==='academy') setTab('academy'); else if(target==='community') setTab('community'); else if(target==='chat') setTab('chat'); else toast('Notificación leída');} const ordered=[...(data.notifications||[])].sort((a,b)=>(a.read===b.read?0:a.read?1:-1)); return <main className="page"><Card title="Centro de notificaciones" sub="Tocá una notificación para ir directo a la sección correspondiente.">{ordered.map(n=><button className="notif clickable" key={n.id} onClick={()=>read(n)}><span className={n.read?'read':''}></span><div><b>{n.text}</b><p>{safeDate(n.createdAt)||n.date} · {n.type||'general'}</p></div><ChevronRight size={16}/></button>)}{!ordered.length&&<Empty title="Sin notificaciones" text="Las alertas aparecerán acá."/>}</Card></main>}
function SettingsPage({data,profile,setProfile}){
  const [u,setU]=useState(profile),[s,setS]=useState(data.settings),[preview,setPreview]=useState(profile.photoURL||profile.photoData||'');
  function loadProfileImage(e){const f=e.target.files?.[0]; if(!f)return; if(f.size>600000){alert('Usa una imagen menor a 600 KB para esta versión. Cuando actives Storage se podrán subir imágenes grandes.');return;} const reader=new FileReader(); reader.onload=()=>{setPreview(reader.result); setU({...u,photoData:reader.result,photoURL:''});}; reader.readAsDataURL(f);}
  function updateInitialBalance(value){setS(syncPrimaryAccountCapital(s,value))}
  async function saveAll(){const cleanSettings=prepareTradingSettingsForSave(s); const capital=Number(cleanSettings.initialBalance||0); if(!Number.isFinite(capital)||capital<=0){toast('Ingresá un capital inicial mayor a 0.','error'); return;} await setDoc(doc(db,'users',profile.uid),{...u},{merge:true}); await setDoc(doc(db,'settings',profile.uid),cleanSettings,{merge:true}); setS(cleanSettings); setProfile(u); toast('Cambios guardados')}
  return <main className="page"><Card title="Perfil" sub="Configura cómo apareces dentro de la comunidad."><div className="profileEditor"><div className="profilePhoto">{preview?<img src={preview} alt="Foto de perfil"/>:<span>{avatarOptions.find(a=>a.id===u.avatarChoice)?.emoji||u.avatar||'MT'}</span>}</div><div><label className="ghost file futureUpload"><Camera size={16}/>Cargar foto de perfil<input type="file" accept="image/*" onChange={loadProfileImage}/></label><p className="muted">También podés elegir una miniatura animada de trading. Más adelante quedará conectado a Storage para fotos grandes.</p></div></div><div className="formGrid labeled"><Field label="Nombre visible"><input className="input" value={u.name||''} onChange={e=>setU({...u,name:e.target.value,avatar:e.target.value.slice(0,2).toUpperCase()})}/></Field><Field label="Género visual"><select className="input" value={u.gender||'masculino'} onChange={e=>setU({...u,gender:e.target.value})}>{['masculino','femenino','neutral'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="País"><input className="input" value={u.country||''} placeholder="Argentina, México..." onChange={e=>setU({...u,country:e.target.value})}/></Field><Field label="Tipo de trader"><select className="input" value={u.type||'Day Trader'} onChange={e=>setU({...u,type:e.target.value})}>{['Day Trader','Scalper','Swing Trader','Position Trader'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Nivel"><select className="input" value={u.level||'Inicial'} onChange={e=>setU({...u,level:e.target.value})}>{['Inicial','Intermedio','Avanzado','Fondeado','Mentor'].map(x=><option key={x}>{x}</option>)}</select></Field></div><div className="avatarPicker"><h3>Elegí sticker/miniatura de trading</h3>{avatarOptions.filter(a=>a.gender==='neutral'||a.gender===(u.gender||'masculino')).map(a=><button key={a.id} type="button" className={u.avatarChoice===a.id?'on':''} onClick={()=>setU({...u,avatarChoice:a.id,avatar:a.emoji})}><span className={`avatarMini ${a.bg}`}>{a.emoji}</span><b>{a.label}</b></button>)}</div></Card><Card title="Configuración de trading"><AccountManager settings={s} onChange={setS}/><div className="formGrid labeled"><Field label="Balance inicial"><input className="input" type="number" min="1" value={s.initialBalance} onChange={e=>updateInitialBalance(e.target.value)}/></Field><Field label="Objetivo mensual %"><input className="input" type="number" value={s.monthlyGoal} onChange={e=>setS({...s,monthlyGoal:Number(e.target.value)})}/></Field><Field label="Estrategia principal"><input className="input" value={s.mainStrategy} onChange={e=>setS({...s,mainStrategy:e.target.value})}/></Field><Field label="Activos favoritos"><input className="input" value={(s.assets||[]).join(',')} onChange={e=>setS({...s,assets:e.target.value.split(',').map(x=>x.trim())})}/></Field></div><button className="primary" onClick={saveAll}>Guardar cambios</button></Card></main>}




function MentorReviewAdminCard({trade,users,onSave}){
  const [response,setResponse]=useState(trade.mentorReviewResponse||'');
  const [status,setStatus]=useState(trade.mentorReviewStatus||'pending');
  const user=users.find(u=>u.uid===trade.userId)||{};
  return <article className={`mentorReviewAdminCard ${status}`}><div className="mentorReviewHead"><div><b>{user.name||trade.userName||trade.userId||'Trader'} · {trade.asset||'Trade'}</b><small>{trade.date||trade.tradingDay||safeDate(trade.createdAt)} · {trade.session||'—'} · {trade.result||'—'} · {money(trade.resultMoney||0)}</small></div><span>{mentorStatusLabel(status)}</span></div><div className="mentorReviewMeta"><span>Sistema: {normalizeTradeSetup(trade)}</span><span>Foco: {trade.mentorReviewFocus||'general'}</span>{trade.createdFromChecklist&&<span>Desde Checklist · Score {trade.checklistScore||0}/100</span>}<span>Behavior: {trade.behaviorScore||behaviorScoreFromTrade(trade)}/100</span></div>{trade.mentorReviewNote&&<p><b>Pregunta del trader:</b> {trade.mentorReviewNote}</p>}<div className="formGrid labeled"><Field label="Estado de revisión"><select className="input" value={status} onChange={e=>setStatus(e.target.value)}><option value="pending">Pendiente</option><option value="in_review">En revisión</option><option value="reviewed">Revisado</option><option value="approved">Aprobado</option><option value="needs_work">Requiere corrección</option></select></Field><Field label="Devolución del mentor"><TextareaWithEmoji className="input" value={response} onChange={e=>setResponse(e.target.value)} placeholder="Observaciones, error principal, puntos fuertes y corrección."/></Field></div><div className="row"><button className="primary compact" onClick={()=>onSave(trade,{mentorReviewStatus:status,mentorReviewResponse:response})}>Guardar revisión</button><button className="ghost compact" onClick={()=>{localStorage.setItem('mtc-open-trade',trade.id); window.dispatchEvent(new CustomEvent('mtc-tab',{detail:'journal'}));}}>Ver trade</button></div></article>
}

function Admin({data}){
  const [announcement,setAnnouncement]=useState('');
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('all');
  const [openGroups,setOpenGroups]=useState({pending:true,approved:true,suspended:false,denied:false});
  async function role(u,r){
    const st=effectiveStatus(u);
    const nextStatus=(r==='admin'||r==='moderador')?'approved':st;
    const privileged=(r==='admin'||r==='moderador');
    await setDoc(doc(db,'users',u.uid),{
      role:r,
      status:nextStatus,
      approved:nextStatus==='approved',
      active:true,
      accessStatus:privileged?'manual_approved':(u.accessStatus||'pending_payment'),
      accessSource:privileged?'admin':(u.accessSource||'manual'),
      updatedAt:serverTimestamp()
    },{merge:true});
    toast('Rol actualizado');
  }
  async function setAccess(u,status){
    const patch={
      status,
      approved:status==='approved',
      active:true,
      approvedAt:status==='approved'?serverTimestamp():(u.approvedAt||null),
      updatedAt:serverTimestamp()
    };
    if(status==='approved') Object.assign(patch,{accessStatus:'manual_approved',subscriptionStatus:u.subscriptionStatus||'none',accessSource:'admin',plan:u.plan&&u.plan!=='free'?u.plan:'founder'});
    if(status==='pending') Object.assign(patch,{accessStatus:'pending_payment',subscriptionStatus:u.subscriptionStatus==='active'?'active':'none',accessSource:u.accessSource||'manual'});
    if(status==='denied'||status==='suspended') Object.assign(patch,{accessStatus:'blocked',subscriptionStatus:u.subscriptionStatus==='active'?'canceled':(u.subscriptionStatus||'none')});
    await setDoc(doc(db,'users',u.uid),patch,{merge:true});
    toast(status==='approved'?'Usuario aprobado manualmente':status==='denied'?'Usuario denegado':status==='suspended'?'Usuario suspendido/bloqueado':'Usuario pendiente de pago');
  }
  async function sendAnnouncement(){if(!announcement.trim())return; await addDoc(collection(db,'posts'),{authorId:'admin',authorName:'Moisés Trading Club',authorAvatar:'MT',category:'Anuncio',body:announcement,likes:[],comments:[],pinned:true,createdAt:serverTimestamp(),createdDate:today()}); await notifyUsers(data.users,`Nuevo anuncio del mentor: ${announcement.slice(0,80)}${announcement.length>80?'...':''}`,'announcement',{target:'announcements'}); setAnnouncement(''); toast('Anuncio publicado y notificado')}
  async function removeTrade(t){if(!confirm(`¿Borrar trade ${t.asset || ''} de ${t.userId || ''}?`))return; await deleteDoc(doc(db,'trades',t.id)); toast('Trade borrado')}
  async function removeIdea(i){if(!confirm(`¿Borrar idea ${i.asset}?`))return; await deleteDoc(doc(db,'ideas',i.id)); toast('Idea borrada');}
  const q=search.toLowerCase().trim();
  const users=(data.users||[]).filter(u=>{
    const status=effectiveStatus(u);
    const matchesFilter=filter==='all'||status===filter||u.role===filter;
    const hay=[u.name,u.email,u.role,status,u.uid].join(' ').toLowerCase();
    return matchesFilter && (!q || hay.includes(q));
  });
  const groups=['pending','approved','suspended','denied'].map(status=>({status,items:users.filter(u=>effectiveStatus(u)===status)})).filter(g=>g.items.length || filter===g.status || filter==='all');
  const counts=(data.users||[]).reduce((a,u)=>{const st=effectiveStatus(u); a[st]=(a[st]||0)+1; return a;},{});
  const reviewTrades=(data.trades||[]).filter(t=>t.mentorReviewRequested).sort((a,b)=>String(b.mentorReviewRequestedAt||b.createdAt||'').localeCompare(String(a.mentorReviewRequestedAt||a.createdAt||'')));
  async function updateReview(t,patch){try{await setDoc(doc(db,'trades',t.id),{...patch,mentorReviewedAt:serverTimestamp(),mentorReviewedBy:'admin'},{merge:true}); toast('Revisión guardada','success')}catch(e){toast('No se pudo guardar la revisión','error')}}
  return <main className="page"><div className="metrics"><Metric label="Usuarios" value={data.users.length} sub="registrados"/><Metric label="Pendientes" value={counts.pending||0} sub="por aprobar"/><Metric label="Revisión mentor" value={reviewTrades.filter(t=>(t.mentorReviewStatus||'pending')==='pending').length} sub="trades pendientes"/><Metric label="Trades" value={data.trades.length} sub="registrados"/></div>
  <Card title="Trades para revisar" sub="Solicitudes enviadas por alumnos para devolución del mentor."><div className="mentorReviewList">{reviewTrades.map(t=><MentorReviewAdminCard key={t.id} trade={t} users={data.users||[]} onSave={updateReview}/>)}</div>{!reviewTrades.length&&<Empty title="Sin trades pendientes" text="Cuando los alumnos pidan revisión aparecerán acá."/>}</Card>
  <Card title="Usuarios online" sub="Control rápido de presencia dentro de la app."><div className="onlineAdminGrid">{(data.users||[]).filter(isUserOnline).map(u=><div className="onlineRow" key={u.uid}><span className="avatar small">{u.avatar||String(u.name||u.email||'MT').slice(0,2)}</span><div><b>{u.name||u.email}</b><small>{u.role||'alumno'} · online ahora</small></div><span className="onlineDot on"/></div>)}{!(data.users||[]).filter(isUserOnline).length&&<Empty title="Nadie online" text="Cuando haya alumnos activos aparecerán acá."/>}</div></Card>
  <Card title="Anuncios globales" sub="Publica un anuncio fijo en comunidad y envía notificación a todos."><TextareaWithEmoji className="input" value={announcement} onChange={e=>setAnnouncement(e.target.value)} placeholder="Escribe un anuncio para toda la comunidad..."/><button className="primary" onClick={sendAnnouncement}><Megaphone size={16}/>Publicar y notificar</button></Card>
  <Card title="Gestión de accesos" sub="Buscá por nombre, email, rol o estado. La lista está agrupada para manejar cientos o miles de alumnos sin volverte loco.">
    <div className="adminFilters"><div className="search"><Search size={16}/><input placeholder="Buscar alumno por nombre o email..." value={search} onChange={e=>setSearch(e.target.value)}/></div><select className="input small" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos</option><option value="pending">Pendientes</option><option value="approved">Aprobados</option><option value="suspended">Suspendidos</option><option value="denied">Denegados</option><option value="admin">Admins</option><option value="moderador">Moderadores</option><option value="alumno">Alumnos</option></select></div>
    <div className="accessSummary"><span>Pendientes: <b>{counts.pending||0}</b></span><span>Aprobados: <b>{counts.approved||0}</b></span><span>Suspendidos: <b>{counts.suspended||0}</b></span><span>Denegados: <b>{counts.denied||0}</b></span></div>
    {groups.map(g=><section className="accessGroup" key={g.status}><button className="accessGroupHead" onClick={()=>setOpenGroups(o=>({...o,[g.status]:!o[g.status]}))}>{openGroups[g.status]?<ChevronDown size={18}/>:<ChevronRight size={18}/>}<span>{accessLabel(g.status)}</span><b>{g.items.length}</b></button>{openGroups[g.status]&&<div>{g.items.map(u=><div className="adminRow accessRow" key={u.uid}><div><b>{u.name||'Sin nombre'}</b><p>{u.email}</p><span className={`statusBadge ${effectiveStatus(u)}`}>{accessLabel(effectiveStatus(u))}</span></div><select className="input small" value={u.role||'alumno'} onChange={e=>role(u,e.target.value)}>{['alumno','moderador','admin','invitado'].map(r=><option key={r}>{r}</option>)}</select><div className="accessActions"><button className="primary" onClick={()=>setAccess(u,'approved')}>Aprobar</button><button className="ghost" onClick={()=>setAccess(u,'pending')}>Pendiente</button><button className="ghost danger" onClick={()=>setAccess(u,'denied')}>Denegar</button><button className="ghost danger" onClick={()=>setAccess(u,'suspended')}>Suspender</button></div></div>)}</div>}</section>)}
    {!users.length&&<Empty title="Sin resultados" text="No encontré usuarios con ese nombre, email o filtro."/>}
  </Card>
  <div className="grid two"><Card title="Ideas publicadas" sub="Como admin podés limpiar ideas antiguas o inválidas.">{data.ideas.map(i=><div className="adminRow" key={i.id}><div><b>{i.asset} · {i.bias}</b><p>{i.status} · {i.timeframe}</p></div><button className="ghost compact" onClick={()=>copyText(`${i.asset} | ${i.bias} | ${i.timeframe} | Zona: ${i.zone} | Riesgo: ${i.risk}`,'Código copiado')}><Copy size={14}/>Copiar</button><button className="ghost danger" onClick={()=>removeIdea(i)}><Trash2 size={16}/>Borrar</button></div>)}{!data.ideas.length&&<Empty title="Sin ideas" text="Todavía no hay ideas publicadas."/>}</Card>
  <Card title="Trades registrados" sub="Vista administrativa. Usar solo para borrar pruebas o errores.">{data.trades.slice(0,30).map(t=><div className="adminRow" key={t.id}><div><b>{t.asset} · {t.side}</b><p>{t.date} · {money(t.resultMoney)} · {t.userId}</p></div><button className="ghost danger" onClick={()=>removeTrade(t)}><Trash2 size={16}/>Borrar</button></div>)}{!data.trades.length&&<Empty title="Sin trades" text="Todavía no hay trades."/>}</Card></div></main>}


function AccessGate({profile}){
  const [cycle,setCycle]=useState('monthly');
  const [selected,setSelected]=useState('premium');
  const [busy,setBusy]=useState(null);
  const [paywallVideoFailed,setPaywallVideoFailed]=useState(false);
  const status=effectiveStatus(profile);
  const isBlocked=status==='denied'||status==='suspended'||status==='blocked';
  const billingOptions=[
    {id:'monthly',label:'Mensual',note:'Flexible'},
    {id:'quarterly',label:'Trimestral',note:'Patrones reales'},
    {id:'annual',label:'Anual',note:'Mejor valor'}
  ];
  const statusCopy={
    past_due:'Tu pago está pendiente. Actualizá tu método de pago para recuperar acceso.',
    canceled:'Tu suscripción está cancelada. Podés reactivar tu acceso.',
    expired:'Tu acceso venció. Reactivá tu membresía para seguir usando MTC Analytics.',
    blocked:'Tu acceso fue bloqueado. Contactá al administrador.',
    denied:'Tu acceso fue denegado. Contactá al administrador.',
    suspended:'Tu acceso está suspendido. Contactá al administrador.'
  };
  const whatsappUrl=`https://wa.me/${WHATSAPP_MENTORIA}?text=${encodeURIComponent('Estoy interesado en Mentoría personalizada de Moisés Trading Club')}`;
  const paywallDemoFallback='/commercial/mtc-paywall-demo-premium.png';
  const paywallDemo=paywallVideoFailed
    ? <img className="commercialDemoVideo paywallDemoVideo paywallDemoFallback" src={paywallDemoFallback} alt="MTC Analytics product preview"/>
    : <video className="commercialDemoVideo paywallDemoVideo" src="/commercial/mtc-paywall-demo-premium.mp4" autoPlay muted loop playsInline preload="auto" poster={paywallDemoFallback} aria-label="MTC Analytics paywall product demo" onLoadedData={()=>console.log('MTC video loaded:','/commercial/mtc-paywall-demo-premium.mp4')} onError={(e)=>{console.error('MTC video error:',e.currentTarget.error,e.currentTarget.src);setPaywallVideoFailed(true)}}></video>;
  async function startCheckout(plan){
    setSelected(plan.id);
    if(plan.id==='mentorship'){
      window.open(whatsappUrl,'_blank','noopener,noreferrer');
      return;
    }
    const quote=calculatePlanPrice(plan.id,cycle);
    const endpoint=PAYMENT_CONFIG.provider==='paypal' ? PAYMENT_CONFIG.paypalCreateOrderEndpoint : PAYMENT_CONFIG.checkoutEndpoint;
    if(!PAYMENT_CONFIG.enabled || !endpoint){
      toast('Los pagos todavía no están activos. Contactá al administrador para activar tu acceso.','info');
      return;
    }
    if(!auth.currentUser){
      console.error('startCheckout:missing_user',{endpoint,planId:plan.id,billingCycle:cycle});
      toast('Iniciá sesión para activar tu acceso.','error');
      return;
    }
    try{
      setBusy(plan.id);
      const token=await auth.currentUser?.getIdToken?.();
      const paypalPlanId=checkoutPlanId(plan.id);
      const checkoutPayload={
        planId:paypalPlanId,
        plan:paypalPlanId,
        billingCycle:cycle,
        provider:PAYMENT_CONFIG.provider,
        amount:quote?.total,
        currency:quote?.currency,
        durationMonths:membershipDurationMonths(cycle),
        successUrl:PAYMENT_CONFIG.successUrl,
        cancelUrl:PAYMENT_CONFIG.cancelUrl,
        uid:profile?.uid,
        userId:profile?.uid,
        email:profile?.email || auth.currentUser?.email || ''
      };
      console.log("checkout payload", { planId:checkoutPayload.planId, plan:checkoutPayload.plan, billingCycle:checkoutPayload.billingCycle });
      console.info('startCheckout:request',{endpoint,payload:checkoutPayload});
      const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({
        ...checkoutPayload
      })});
      const payload=await res.json().catch(()=>({}));
      if(!res.ok){
        const detail={endpoint,status:res.status,payload,requestPayload:checkoutPayload};
        console.error('checkout_error',detail);
        const err=new Error(payload?.message || payload?.error || 'checkout_failed');
        err.details=detail;
        throw err;
      }
      if(payload.approvalUrl) window.location.href=payload.approvalUrl;
      else if(payload.checkoutUrl) window.location.href=payload.checkoutUrl;
      else {console.error('checkout_missing_url',payload); toast('No pudimos abrir el checkout. Intentá nuevamente.','error');}
    }catch(e){
      console.error('startCheckout:error',e?.details || e);
      toast('No se pudo iniciar el pago. Intentá nuevamente o contactá soporte.','error');
    }finally{setBusy(null)}
  }
  return <div className="paywallFunnel finalPaywallSurface">
    <div className="paywallFunnelBg" aria-hidden="true"><span></span><span></span><span></span></div>
    <section className="paywallFunnelShell finalPaywallShell" aria-label="Activación de acceso">
      <header className="paywallFunnelHeader finalPaywallHeader">
        <div className="paywallFunnelBrand"><img src="/brand/mtc-analytics-icon.png" alt="MTC Analytics"/><div><b>MTC Analytics</b><span>Trading performance platform</span></div></div>
        <div className="paywallFunnelActions"><span className={'paywallFunnelStatus '+status}>{accessLabel(status)}</span><button className="paywallLogout" onClick={()=>signOut(auth)}><LogOut size={15}/> Cerrar sesión</button></div>
      </header>
      <div className="paywallFunnelMain finalPaywallMain">
        <div className="paywallFunnelLayout finalPaywallLayout">
          <div className="paywallFunnelHero finalPaywallHero">
            <p>Acceso Founding Members</p>
            <h1>Dejá de operar por sensación. Mejorá con evidencia.</h1>
            <h2>Accedé a una plataforma para medir ejecución, riesgo, conducta y revisión en un solo sistema.</h2>
            <div className="paywallFunnelChips"><span><Target size={14}/> Checklist operativo</span><span><BarChart3 size={14}/> Analytics accionables</span><span><Shield size={14}/> Sistema de revisión</span></div>
          </div>
          <div className="finalPaywallDemoFrame">{paywallDemo}</div>
        </div>
        <div className="paywallFunnelBilling finalPaywallBilling">
          <div><b>Precio preferencial durante etapa de expansión.</b><span>Proceso completo: ejecución, riesgo, conducta, analytics y revisión.</span></div>
          <div>{billingOptions.map(c=><button key={c.id} className={cycle===c.id?'active':''} onClick={()=>setCycle(c.id)}><b>{c.label}</b><small>{c.note}</small></button>)}</div>
        </div>
        {isBlocked||['past_due','canceled','expired'].includes(status)?<div className="paywallFunnelNotice"><AlertTriangle size={17}/>{statusCopy[status]||'Contactá al administrador para revisar tu acceso.'}</div>:null}
        <div className="paywallFunnelPlans finalPaywallPlans">
          {ACCESS_PLANS.map(plan=>{
            const quote=planCycleSummary(plan.id,cycle);
            const active=selected===plan.id;
            return <article key={plan.id} className={'paywallFunnelPlan '+plan.tone+' '+(plan.recommended?'featured':'')+' '+(active?'selected':'')} onClick={()=>setSelected(plan.id)}>
              {plan.recommended&&<div className="paywallFunnelBadge"><Crown size={13}/> Más elegido</div>}
              <div className="paywallFunnelPlanTop"><span>{plan.kicker}</span><h3>{plan.name}</h3><p>{plan.headline}</p></div>
              <div className="paywallFunnelPrice">
                {quote? <>{quote.regular&&<s>{quote.regular}</s>}<b>{quote.final}</b><em>{BILLING_CYCLES[cycle].suffix} / {BILLING_CYCLES[cycle].short}</em>{quote.perMonth&&<small>{quote.perMonth}</small>}</> : <><b>USD 250</b><em>/mes</em><small>Mentoría personalizada 1 a 1</small></>}
              </div>
              <p className="paywallFunnelValue">{plan.valueNote}</p>
              <ul>{plan.features.map(f=><li key={f}><CheckCircle2 size={15}/><span>{f}</span></li>)}</ul>
              <button className={plan.recommended?'primary':'secondary'} disabled={busy===plan.id || isBlocked} onClick={(e)=>{e.stopPropagation();startCheckout(plan)}}>{busy===plan.id?'Preparando checkout...':plan.id==='mentorship'?'Aplicar a mentor\u00eda':plan.cta}</button>
            </article>
          })}
        </div>
        <p className="paywallFunnelDisclaimer">MTC Analytics no promete resultados financieros. Es una plataforma para registrar, analizar y mejorar tu proceso de trading.</p>
      </div>
    </section>
  </div>
}


function routeTo(path){
  window.history.pushState({},'',path);
  window.dispatchEvent(new Event('mtc-public-route'));
}
function PaymentSuccessPage({profile}){
  const [state,setState]=useState('checking');
  const [error,setError]=useState('');
  const [captureResult,setCaptureResult]=useState(null);
  const [queryInfo]=useState(()=>Object.fromEntries(new URLSearchParams(window.location.search).entries()));
  const active=profile && isApproved(profile);
  const provider=queryInfo.provider || queryInfo.payment_provider || PAYMENT_CONFIG.provider || 'pasarela';
  const paypalOrderId=queryInfo.orderId || queryInfo.paypalOrderId || queryInfo.token || '';
  const paymentId=queryInfo.paymentId || queryInfo.payment_id || '';
  async function capturePaypalIfNeeded(){
    if(provider!=='paypal' || (!paypalOrderId && !paymentId) || !PAYMENT_CONFIG.paypalCaptureOrderEndpoint) return null;
    const token=await auth.currentUser?.getIdToken?.();
    const res=await fetch(PAYMENT_CONFIG.paypalCaptureOrderEndpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({provider:'paypal',orderId:paypalOrderId,token:queryInfo.token || '',paymentId})});
    const payload=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(payload?.error || 'paypal_capture_failed');
    setCaptureResult(payload);
    return payload;
  }
  async function verify({capture=true}={}){
    setState('checking');
    setError('');
    try{
      if(!auth.currentUser?.uid){
        setState('error');
        setError('Necesitás iniciar sesión para verificar el acceso de esta cuenta.');
        return;
      }
      let captured=null;
      if(capture) captured=await capturePaypalIfNeeded();
      if(captured?.status==='pending') setState('pending');
      if(captured?.status==='failed' || captured?.status==='denied') setState('error');
      const snap=await getDoc(doc(db,'users',auth.currentUser.uid));
      const fresh=snap.exists()?{uid:auth.currentUser.uid,...snap.data()}:null;
      if(fresh && isApproved(fresh)) setState('active');
      else if(captured?.status==='failed' || captured?.status==='denied'){
        setState('error');
        setError('PayPal no confirmó el pago como COMPLETED.');
      } else setState('pending');
    }catch(e){
      console.warn('payment success verification',e);
      setState('error');
      setError('No pudimos confirmar tu membresía en este momento. Si PayPal debitó el dinero, no vuelvas a pagar todavía.');
    }
  }
  useEffect(()=>{verify({capture:true}); const id=setTimeout(()=>verify({capture:false}),3000); return()=>clearTimeout(id)},[]);
  useEffect(()=>{if(active) setState('active')},[profile?.accessStatus,profile?.subscriptionStatus,profile?.currentPeriodEnd]);
  const icon=state==='active'?<CheckCircle2 size={34}/>:state==='checking'?<Clock3 size={34}/>:state==='error'?<AlertTriangle size={34}/>:<Info size={34}/>;
  const title=state==='active'?'Acceso activado correctamente':state==='checking'?'Verificando tu pago…':state==='error'?'No pudimos confirmar el pago todavía.':'Pago recibido. Estamos terminando de activar tu acceso.';
  const text=state==='active'?'Tu membresía ya está activa. Ya podés entrar al Dashboard de Moisés Trading Club.':state==='checking'?'Estamos confirmando tu acceso. Esto puede tardar unos segundos.':state==='error'?'Si el dinero fue debitado, no intentes pagar nuevamente. Esperá unos minutos o contactá soporte.': 'Si PayPal ya confirmó el pago, tu acceso se habilitará automáticamente en unos segundos.';
  return <div className="paymentResultPage">
    <div className="paymentResultGlow" />
    <section className={`paymentResultCard ${state}`}>
      <img className="paymentResultLogo" src="/moises-logo.jpg" alt="Moisés Trading Club"/>
      <span className="paymentResultEyebrow">Confirmación de pago · {provider}</span>
      <div className="paymentResultIcon">{icon}</div>
      <h1>Tu pago ha sido recibido</h1>
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="paymentResultDetails">
        <div><span>Estado de acceso</span><b>{profile?accessLabel(effectiveStatus(profile)):'Sesión no detectada'}</b></div>
        <div><span>Plan</span><b>{profile?.plan && profile.plan!=='free'?profile.plan:'Sin activar'}</b></div>
        <div><span>Vencimiento</span><b>{profile?.currentPeriodEnd?formatMembershipDate(profile.currentPeriodEnd):'Pendiente'}</b></div>
      </div>
      {error&&<div className="paymentResultNotice"><AlertTriangle size={16}/>{error}</div>}
      <div className="paymentResultActions">
        {state==='active'?<button className="primary" onClick={()=>routeTo('/app')}>Entrar al Dashboard</button>:<button className="primary" onClick={()=>verify({capture:state!=='error'})}>Reintentar verificación</button>}
        <button className="ghost" onClick={()=>routeTo('/app')}>{state==='active'?'Volver a la app':'Volver a planes'}</button>
        {state==='error'&&<a className="ghost center" href={`https://wa.me/${WHATSAPP_MENTORIA}?text=${encodeURIComponent('Hola, necesito soporte con la activación de mi pago en Moisés Trading Club.')}`} target="_blank" rel="noreferrer">Contactar soporte</a>}
      </div>
      <small>La activación puede tardar unos segundos después del pago.</small>
    </section>
  </div>
}
function PaymentCancelPage(){
  return <div className="paymentResultPage">
    <div className="paymentResultGlow" />
    <section className="paymentResultCard cancel">
      <img className="paymentResultLogo" src="/moises-logo.jpg" alt="Moisés Trading Club"/>
      <span className="paymentResultEyebrow">Checkout cancelado</span>
      <div className="paymentResultIcon"><XCircle size={34}/></div>
      <h1>El pago no fue completado</h1>
      <h2>Podés volver a elegir tu plan cuando quieras.</h2>
      <p>No se activó ni modificó tu membresía. Si cancelaste por error, regresá a planes y reiniciá el checkout.</p>
      <div className="paymentResultActions"><button className="primary" onClick={()=>routeTo('/app')}>Volver a planes</button><button className="ghost" onClick={()=>routeTo('/')}>Volver al inicio</button></div>
    </section>
  </div>
}

function Empty({title,text,cta,onClick,icon:Icon=Sparkles}){return <div className="empty"><span className="emptyIcon"><Icon size={18}/></span><h3>{title}</h3><p>{text}</p>{cta&&<button className="ghost compact" onClick={onClick}>{cta}</button>}</div>}
function EmojiMenu({onPick}){const [open,setOpen]=useState(false); return <div className="emojiMenu"><button type="button" className="emojiTrigger" onClick={()=>setOpen(!open)}>😊 Emojis</button>{open&&<div className="emojiDropdown">{quickEmojis.map(em=><button type="button" key={em} className="emojiBtn" onClick={()=>{onPick(em);setOpen(false)}}>{em}</button>)}</div>}</div>}
function TextareaWithEmoji({value,onChange,placeholder,className='input',rows}){const add=em=>onChange({target:{value:`${value||''}${em}`}}); return <div className="emojiField"><textarea className={className} rows={rows} placeholder={placeholder} value={value||''} onChange={onChange}/><EmojiMenu onPick={add}/></div>}
function InputWithEmoji({value,onChange,placeholder,className='input'}){const add=em=>onChange({target:{value:`${value||''}${em}`}}); return <div className="emojiField"><input className={className} placeholder={placeholder} value={value||''} onChange={onChange}/><EmojiMenu onPick={add}/></div>}
function MarketClocks(){
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(id)},[]);
  const time=(tz)=>new Intl.DateTimeFormat('es-AR',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:tz}).format(now);
  const nyHour=Number(new Intl.DateTimeFormat('en-US',{hour:'numeric',hour12:false,timeZone:'America/New_York'}).format(now));
  const status=nyHour<9?'Pre-market':nyHour<16?'Regular hours':'After-hours';
  return <div className="marketClocks proClock"><span><b>NY</b>{time('America/New_York')}</span><span><b>London</b>{time('Europe/London')}</span><span><b>Tokyo</b>{time('Asia/Tokyo')}</span><em>{status}</em><strong><Clock3 size={14}/> Rollover 17:00 NY · <ResetTicker/></strong></div>
}

function TradeStreak({trades=[]}){const last=[...trades].slice(0,10); return <Card title="Racha actual" sub="Últimos 10 trades registrados."><div className="streakDots">{Array.from({length:10}).map((_,i)=>{const t=last[i]; const v=Number(t?.resultMoney||0); return <span key={i} className={!t?'empty':v>0?'win':v<0?'loss':'be'} title={t?`${t.asset||''} ${money(v)}`:'Sin trade'} />})}</div><p className="microInsight">Verde = win · Rojo = loss · Gris = breakeven/sin dato.</p></Card>}
function GamePlanPanel(){
  const [plan,setPlan]=useState(()=>{try{return JSON.parse(localStorage.getItem('mtc-gameplan')||'{}')}catch{return {}}});
  const ch=(k,v)=>{const n={...plan,[k]:v}; setPlan(n); localStorage.setItem('mtc-gameplan',JSON.stringify(n));};
  return <Card title="Game plan del día" sub="Mini plan pre-market para no entrar improvisado."><div className="gamePlan"><input className="input" placeholder="Sesgo del día: bullish / bearish / neutral" value={plan.bias||''} onChange={e=>ch('bias',e.target.value)}/><input className="input" placeholder="Niveles clave / zona de interés" value={plan.levels||''} onChange={e=>ch('levels',e.target.value)}/><input className="input" placeholder="Riesgo máximo del día" value={plan.maxRisk||''} onChange={e=>ch('maxRisk',e.target.value)}/><TextareaWithEmoji className="input wide" placeholder="Plan de ejecución: qué espero ver antes de tomar un trade" value={plan.notes||''} onChange={e=>ch('notes',e.target.value)}/></div></Card>
}
function CommandPalette({open,setOpen,setTab}){
  const [q,setQ]=useState('');
  const actions=[['dashboard','Ir al Dashboard','📊'],['journal','Nuevo trade / Journal','📝'],['emotional','Journal emocional','🤍'],['brokers','Sync Broker','🔄'],['ecosystem','Cómo usar el ecosistema','✨'],['system','Sistema de Moisés','🛡️'],['reading','Biblioteca','📚'],['academy','Base','🎓'],['community','Mi espacio','🤝'],['announcements','Anuncios del mentor','📌'],['chat','Chat privado','💬'],['online','Usuarios online','🟢'],['ideas','Ideas de trading','💡'],['analytics','Analytics','📈'],['risk','Riesgo y lotaje','🛡️'],['settings','Perfil','⚙️']].filter(a=>a[1].toLowerCase().includes(q.toLowerCase()));
  if(!open)return null;
  return <div className="cmdOverlay" onClick={()=>setOpen(false)}><div className="cmdPalette" onClick={e=>e.stopPropagation()}><div className="cmdSearch"><span>⌘K</span><input autoFocus placeholder="Buscar sección o acción rápida..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setOpen(false)}}/></div><div className="cmdList">{actions.map(([id,label,ico])=><button key={id} onClick={()=>{setTab(id); setOpen(false); toast(`Abriendo ${label}`)}}><span>{ico}</span><b>{label}</b></button>)}</div></div></div>
}

function HelpBot(){
  const [open,setOpen]=useState(false);
  const [answer,setAnswer]=useState('Elegí una consulta rápida o escribime por WhatsApp si necesitás ayuda humana.');
  const phone='543412133662';
  const waText=encodeURIComponent('Hola, soy usuario de MTC Analytics y necesito ayuda con la app.');
  const waUrl=`https://wa.me/${phone}?text=${waText}`;
  const faqs=[
    ['📊 ¿Cómo cargo un trade?','Entrá a Journal → Nuevo trade. Cargá activo, sesión, sistema, patrón, profit/loss en $, profit/loss %, resultado en R, notas y journal emocional. Luego tocá Guardar trade.'],
    ['📱 ¿Cómo instalo la app?','En Android: Chrome → menú de tres puntos → Agregar a pantalla principal. En iPhone: Safari → compartir → Agregar a pantalla de inicio.'],
    ['📚 ¿Dónde veo los libros?','Entrá a Biblioteca. Ahí vas a ver links a PDFs, descripciones y material recomendado.'],
    ['🛡️ ¿Dónde está el Sistema de Moisés?','Entrá a Sistema. Ahí tenés los 7 Mandamientos, patrones, reglas de ejecución y estructura para validar entradas.'],
    ['🔐 Mi cuenta está pendiente','Tu cuenta debe ser aprobada por el equipo. Si ya tenés acceso, escribí por WhatsApp para validar tu estado.'],
    ['🧠 ¿Cómo uso el journal emocional?','Usalo para escribir cómo llegaste al trade, qué sentiste durante la operación y qué aprendiste después. Es privado y sirve para detectar patrones emocionales.'],
    ['📰 ¿Dónde veo noticias económicas?','Entrá a Noticias. Tenés acceso rápido al calendario económico para revisar eventos antes de operar.']
  ];
  return <div className="helpBot">
    {open&&<div className="helpPanel">
      <div className="helpHead">
        <div><b>Asistente MTC</b><span>Soporte rápido de la plataforma</span></div>
        <button onClick={()=>setOpen(false)} aria-label="Cerrar ayuda"><X size={17}/></button>
      </div>
      <div className="helpMsg"><MessageCircle size={18}/><p>{answer}</p></div>
      <div className="helpFaqs">{faqs.map(([q,a])=><button key={q} onClick={()=>setAnswer(a)}>{q}</button>)}</div>
      <a className="whatsappBtn" href={waUrl} target="_blank" rel="noreferrer">Hablar por WhatsApp</a>
    </div>}
    <button className="helpBubble" onClick={()=>setOpen(v=>!v)} aria-label="Abrir ayuda"><MessageCircle size={24}/><span>Ayuda</span></button>
  </div>
}



class SectionBoundary extends React.Component {constructor(props){super(props);this.state={error:null};} static getDerivedStateFromError(error){return {error};} componentDidCatch(error,info){console.error('MTC section error',error,info);} render(){if(this.state.error){return <main className="page"><section className="errorSection"><h2>Esta sección tuvo un error</h2><p>La app sigue activa. Copiá este mensaje y enviámelo para corregirlo.</p><code>{String(this.state.error?.message||this.state.error)}</code><button className="primary" onClick={()=>this.setState({error:null})}>Reintentar sección</button></section></main>;} return this.props.children;}}


function desktopMainWheelHandler(e){
  if(window.innerWidth<861) return;
  const main=e.currentTarget;
  if(!main || main.scrollHeight<=main.clientHeight+2) return;
  const target=e.target;
  if(target?.closest?.('input, textarea, select, [contenteditable="true"], .paywallPage, .modal, .modalBox, .drawer, .commandPalette, .helpPanel, .chatBot, .toastHost')) return;
  let el=target instanceof Element ? target : target?.parentElement;
  while(el && el!==main && el!==document.body && el!==document.documentElement){
    const st=getComputedStyle(el);
    if(/(auto|scroll)/.test(st.overflowY) && el.scrollHeight>el.clientHeight+2) return;
    el=el.parentElement;
  }
  main.scrollTop += e.deltaY;
  e.preventDefault();
  e.stopPropagation();
}

function PullToRefresh({children}){
  // v40.3 HOTFIX: disabled custom pull-to-refresh.
  // The previous implementation rendered a large green overlay/toast ("Contenido actualizado")
  // on iOS/Safari/PWA when users naturally scrolled down. That felt broken visually.
  // Refresh remains available through browser/PWA reload; internal pages keep normal vertical scroll.
  return <div className="pullWrap noPullRefresh">{children}</div>
}
function App(){const [fbUser,setFbUser]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true),[tab,setTab]=useState('dashboard'),[cmdOpen,setCmdOpen]=useState(false),[publicPath,setPublicPath]=useState(()=>window.location.pathname); const [theme,setTheme]=useState(()=>localStorage.getItem('mtc-theme')||'dark'); useEffect(()=>{const successRoutes=['/payment-success','/payment/approved','/checkout/success']; const cancelRoutes=['/payment-cancel','/payment-failed','/checkout/cancel']; const isDashboardSurface=!!(fbUser && profile && isApproved(profile) && !loading && !successRoutes.includes(publicPath) && !cancelRoutes.includes(publicPath)); const resolvedTheme=isDashboardSurface?theme:'dark'; document.documentElement.setAttribute('data-theme',resolvedTheme); if(isDashboardSurface)localStorage.setItem('mtc-theme',theme);},[theme,fbUser,profile,loading,publicPath]); const toggleTheme=()=>{const successRoutes=['/payment-success','/payment/approved','/checkout/success']; const cancelRoutes=['/payment-cancel','/payment-failed','/checkout/cancel']; const isDashboardSurface=!!(fbUser && profile && isApproved(profile) && !loading && !successRoutes.includes(publicPath) && !cancelRoutes.includes(publicPath)); if(isDashboardSurface)setTheme(t=>t==='dark'?'light':'dark')}; useEffect(()=>{const h=e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setCmdOpen(v=>!v)}}; window.addEventListener('keydown',h); return()=>window.removeEventListener('keydown',h)},[]); useEffect(()=>{const sync=()=>setPublicPath(window.location.pathname); window.addEventListener('popstate',sync); window.addEventListener('mtc-public-route',sync); return()=>{window.removeEventListener('popstate',sync); window.removeEventListener('mtc-public-route',sync)}},[]); useEffect(()=>{setPersistence(auth,browserLocalPersistence).then(()=>getRedirectResult(auth)).then(res=>{if(res?.user)return ensureGoogleUserProfile(res.user)}).catch(e=>{console.warn('Google redirect result:',e?.code||e?.message||e)});},[]); useEffect(()=>{const h=e=>{if(e?.detail)setTab(e.detail)}; window.addEventListener('mtc-tab',h); return()=>window.removeEventListener('mtc-tab',h)},[]); useEffect(()=>onAuthStateChanged(auth,async u=>{setFbUser(u); if(!u){setProfile(null);setLoading(false);return;} setLoading(true); const unsub=onSnapshot(doc(db,'users',u.uid),async snap=>{if(snap.exists()){const p={uid:u.uid,...snap.data()}; if(p.active===false){await signOut(auth); return;} const adminEmail=ADMIN_EMAILS.includes(u.email?.toLowerCase()); if(adminEmail && p.role!=='admin') console.warn('Admin email detectado, pero el rol debe estar aprobado desde backend/Admin SDK.'); setProfile(p);} else {const displayName=u.displayName||u.email?.split('@')[0]||'Trader'; const p={uid:u.uid,email:u.email,name:displayName,displayName,role:'alumno',avatar:(displayName||'MT').slice(0,2).toUpperCase(),photoURL:u.photoURL||'',type:'Day Trader',gender:'masculino',avatarChoice:'trader-m',level:'Inicial',active:true,status:'pending',approved:false,provider:u.providerData?.[0]?.providerId||'password',accessStatus:'pending_payment',subscriptionStatus:'none',accessSource:'self_signup',plan:'free',createdAt:serverTimestamp(),lastLoginAt:serverTimestamp()}; await setDoc(doc(db,'users',u.uid),p,{merge:true}); await setDoc(doc(db,'settings',u.uid),settingsDefault,{merge:true}); setProfile(p);} setLoading(false);}); return unsub;}),[]); useEffect(()=>{if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{})},[]); useEffect(()=>{
  if(!profile?.uid || isPrivileged(profile) || profile.accessStatus==='manual_approved') return;
  const info=membershipInfo(profile);
  if(!info.expired || profile.subscriptionStatus==='expired' || profile.accessStatus==='inactive') return;
  if(!PAYMENT_CONFIG.membershipSyncEndpoint) return;
  auth.currentUser?.getIdToken?.().then(token=>fetch(PAYMENT_CONFIG.membershipSyncEndpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({reason:'period_expired'})})).catch(e=>console.warn('membership expiration sync',e?.message));
},[profile?.uid,profile?.currentPeriodEnd,profile?.subscriptionStatus,profile?.accessStatus]); const allowed=profile && isApproved(profile); const [data]=useLiveData(allowed?profile:null); usePresence(allowed?profile:null); const successRoutes=['/payment-success','/payment/approved','/checkout/success']; const cancelRoutes=['/payment-cancel','/payment-failed','/checkout/cancel']; const isPaymentSuccess=successRoutes.includes(publicPath); const isPaymentCancel=cancelRoutes.includes(publicPath); if(loading)return <div className="authPage"><div className="loginCard"><img className="logoImage loginLogo" src="/brand/mtc-analytics-icon.png" alt="MTC Analytics"/><h1>Verificando acceso…</h1></div></div>; if(isPaymentCancel) return <><PaymentCancelPage/><ToastHost/></>; if(!fbUser||!profile){ if(isPaymentSuccess) return <><PaymentSuccessPage profile={null}/><ToastHost/></>; if(publicPath==='/login') return <><Login initialMode="login"/><ToastHost/></>; if(publicPath==='/register') return <><Login initialMode="register"/><ToastHost/></>; return <><PublicLanding/><ToastHost/></>;} if(isPaymentSuccess) return <><PaymentSuccessPage profile={profile}/><ToastHost/></>; if(!allowed)return <><AccessGate profile={profile}/><ToastHost/></>; const pages={dashboard:<Dashboard data={data} profile={profile} setTab={setTab}/>,journal:<Journal data={data} profile={profile}/>,brokers:<BrokerSync data={data} profile={profile}/>,risk:<RiskLab data={data} profile={profile}/>,checklist:<ChecklistPage data={data} profile={profile}/>,ecosystem:<EcosystemGuidePage/>,emotional:<EmotionalJournalPage data={data} profile={profile}/>,system:<SystemPage/>,reading:<ReadingPage data={data} profile={profile}/>,news:<NewsPage/>,analytics:<AnalyticsPage data={data}/>,academy:<Academy data={data} profile={profile}/>,community:<Community data={data} profile={profile}/>,ideas:<Ideas data={data} profile={profile}/>,results:<Results data={data} profile={profile}/>,announcements:<Announcements data={data} profile={profile}/>,chat:<ChatPage data={data} profile={profile}/>,online:<OnlinePage data={data} profile={profile}/>,coach:<CoachIA data={data} profile={profile}/>,notifications:<Notifications data={data} profile={profile} setTab={setTab}/>,settings:<SettingsPage data={data} profile={profile} setProfile={setProfile}/>,admin:<Admin data={data}/>}; return <div className="app"><Shell profile={profile} tab={tab} setTab={setTab} data={data} theme={theme} toggleTheme={toggleTheme}/><div className="main" onWheelCapture={desktopMainWheelHandler}><Topbar tab={tab} profile={profile} theme={theme} toggleTheme={toggleTheme}/><PullToRefresh><SectionBoundary key={tab}>{pages[tab]||pages.dashboard}</SectionBoundary></PullToRefresh></div><MobileNav profile={profile} tab={tab} setTab={setTab} data={data}/><CommandPalette open={cmdOpen} setOpen={setCmdOpen} setTab={setTab}/><ToastHost/></div>}

class ErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state={error:null};
  }
  static getDerivedStateFromError(error){
    return {error};
  }
  componentDidCatch(error, info){
    console.error('MTC render error', error, info);
  }
  render(){
    if(this.state.error){
      return <div className="login"><div className="loginCard errorCard"><img className="logoImage loginLogo" src="/brand/mtc-analytics-icon.png" alt="MTC Analytics"/><h1>Error de carga</h1><p>La app detectó un error visual. Recargá la página. Si continúa, enviá la consola al administrador.</p><pre>{String(this.state.error?.message||this.state.error)}</pre><button className="primary full" onClick={()=>window.location.reload()}>Recargar app</button></div></div>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>);
