import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { LayoutDashboard, Wallet, CalendarClock, CreditCard, Target, PiggyBank,
  Plus, Trash2, CheckCircle2, Circle, TrendingUp, AlertCircle, X, Scan,
  Calculator, Edit3, Save, MessageCircle, Send, DollarSign,
  Check, Sparkles, Bell, Settings, Activity, ToggleLeft, ToggleRight,
  ChevronRight, BarChart2, Menu, Calendar, Eye, EyeOff, HelpCircle, Search,
  Zap, FileText, Download, Clock, Moon, Sun, Lock,
  Filter, Database, RefreshCw, ChevronDown, Package, Heart, AlertTriangle,
  Lightbulb, Building2, Shield, Landmark, LineChart, Bitcoin, Home, Car, Sprout } from "lucide-react";
import {
  SUPA_URL,
  SUPA_KEY,
  VAPID_PUBLIC_KEY,
  setSessionExpiredHandler,
  triggerSessionExpired,
  supaFetch,
  signUp,
  signIn,
  getScope,
  _getUserId,
  sg,
  ss,
  flushPendingSync,
  cancelPendingDebouncedSync,
  isTrackfiDemoMode,
  clearScopedUserDataCache,
  SCOPED_USER_DATA_KEYS,
  applyPulledUserDataRows,
  clearUserDataRowVersions,
  setUploadConflictHandler,
  setLocalStorageQuotaHandler,
  resetLocalStorageQuotaWarned,
  isSupabaseConfigured,
  setLastSyncUiBumpHandler,
  supaFetchUserDataRows,
  trackfiAuthRefreshFetch,
} from "./lib/supabase.js";
import { launchConfetti } from "./lib/confetti.js";
import { notifSupported, notifPermission } from "./lib/notifications.js";
import { applySpendImpl, applyRefundImpl } from "./lib/accountMutations.js";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { useRechartsLoader } from "./hooks/useRechartsLoader.js";
import { useOnlineStatus } from "./hooks/useOnlineStatus.js";
import { allocateLoanPayment, round2 } from "./lib/loanSplit.js";
import { simulateMultiDebtPayoff, simRowsFromDebts, singleDebtPayoffMonths } from "./lib/debtPayoffSim.js";
import { shiftRecurringBillDueDate } from "./lib/billDueDates.js";
import { isCreditCardDebt, cardDebtsList, legacyCreditCardOwed } from "./lib/creditCardTotals.js";
import { optimizedSettlementPairs } from "./lib/household.js";
import { parseTrackfiBackupJson } from "./lib/dataBackup.js";
import { fmt, fmtK, todayStr } from "./lib/moneyFormat.js";
import { cashAccountsByKind, totalCheckingBalance, totalSavingsBalance } from "./lib/cashAccounts.js";
import {
  C, PIE_COLORS, DEBT_PALETTE, isValidHexColor, debtDisplayColor,
  MF, IF, MOS, FULL_MOS,
} from "./theme.js";
import { CSS } from "./styles.js";
import { PROFESSIONS, getProfession, getProfSub } from "./lib/professions.js";
import { dueIn, daysInMonth, dayOfMonth, fmtDate, advanceDueDate } from "./lib/dateHelpers.js";
import {
  DEF_SETTINGS, DEF_ACCOUNTS, DEF_INCOME, DEF_HOUSEHOLD, DEF_DASHCONFIG, DEF_CATS, DEF_CALCOLORS,
} from "./lib/defaults.js";
import {
  isLoanDebt, loanDebtsList, debtOwedForBreakdown, sumDebtsPrincipalAndAccrued,
  approxMonthlyInterestOnDebts, debtOriginalBaseline, splitLoanPayment, applyLoanPaymentToDebtRow,
} from "./lib/debtLogic.js";
import {
  normalizePaidFrom, PAID_FROM_OPTIONS, PAID_FROM_FS_LABELS,
  sumMtdCheckingSpend, sumMtdByPaidFrom, dayCheckingSpend,
  hasCashSubaccounts, validateCashSpendPrerequisites, canReverseExpenseBalance,
  totalAppAssets, pickDefaultBankAccountId, pickDefaultCreditDebtId,
  resolveBankAccountIdForExpense, resolveBillSpendIds, accountsHasPositiveBalance,
} from "./lib/accountsLogic.js";
import {
  isBillDueDateUnusable, billPaidDateCalendarPrefix, billsDueTotalInMonth,
  billsMarkedPaidTotalInMonth, billHasLoanUndoSnap, clampBillReshowMultiplier,
  nearestBillReshowPreset, recurringReshowUpcomingWithinDays, rewindRecurringDueDate,
  prepareBillPaidTransition, patchBillForMarkingPaid, commitMarkBillPaid, commitMarkBillsPaidList,
} from "./lib/billsLogic.js";
import {
  computeSafeToSpend, advancePaydayIso, getLatestScheduledPaydayOnOrBefore,
  paycheckPeriodNeedsHandling,
} from "./lib/safeToSpend.js";
import { applyUserDataSnapshot, buildAuthoritativeCloudMap } from "./lib/userData.js";
import { parseMsg, chatMatchBill, chatPickExpenseDate, chatIsStatsQuery } from "./lib/parseMsg.js";
import { hashPIN } from "./lib/pinHash.js";
import {
  generateDemoData,
  DEMO_MODEL_VERSION, DEMO_IDCHECK_PRIMARY, DEMO_IDCHECK_JOINT, DEMO_IDSAVINGS, DEMO_CC_DEBT_ID,
} from "./lib/demoData.js";
import {
  buildCashAccountsFromOnboarding,
  householdFromUseCase,
  incomeFromOnboarding,
  settingsPatchFromOnboarding,
} from "./lib/onboardingApply.js";
import {
  iS, FI, FS, Modal, BarProg, SH, Empty, SwipeRow, ConfirmDialog,
} from "./components/ui.jsx";
import { PINLock, PINSetup } from "./components/PinLock.jsx";
import { EmojiPicker } from "./components/EmojiPicker.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import OnboardingWizard from "./components/OnboardingWizard.jsx";
import PaycheckDepositModal from "./modals/PaycheckDepositModal.jsx";
import ExtraPayModal from "./modals/ExtraPayModal.jsx";
import EditModal from "./modals/EditModal.jsx";
import ChatView from "./views/ChatView.jsx";
import BankImportModal from "./modals/BankImportModal.jsx";
import ExportModal from "./modals/ExportModal.jsx";

const TODAY = new Date();

import { TrackfiRechartsProvider, RechartsReady } from "./components/RechartsBridge.jsx";

import CalendarView from "./views/CalendarView.jsx";
import { CashAccountsBlock } from "./components/CashAccountsBlock.jsx";
import CategoriesView from "./views/CategoriesView.jsx";
import CategoryDrillView from "./views/CategoryDrillView.jsx";
import DashSettingsView from "./views/DashSettingsView.jsx";
import DebtView from "./views/DebtView.jsx";
import { ExpenseRow } from "./components/ExpenseRow.jsx";
import FinancialPhysicalView from "./views/FinancialPhysicalView.jsx";
import { GoalRing } from "./components/GoalRing.jsx";
import HealthScoreView from "./views/HealthScoreView.jsx";
import HouseholdView from "./views/HouseholdView.jsx";
import IncomeSpendingView from "./views/IncomeSpendingView.jsx";
import InsightsView from "./views/InsightsView.jsx";
import NetWorthTrendView from "./views/NetWorthTrendView.jsx";
import PaycheckView from "./views/PaycheckView.jsx";
import RecurringView from "./views/RecurringView.jsx";
import SavingsGoalsView from "./views/SavingsGoalsView.jsx";
import SearchView from "./views/SearchView.jsx";
import SettingsView from "./views/SettingsView.jsx";
import ShiftView from "./views/ShiftView.jsx";
import SpendingView from "./views/SpendingView.jsx";
import StatementView from "./views/StatementView.jsx";
import SubsView from "./views/SubsView.jsx";
import TaxView from "./views/TaxView.jsx";
import TradingView from "./views/TradingView.jsx";
import TrendView from "./views/TrendView.jsx";

/** Shared UI for `accounts.cashAccounts` — used on Accounts & Income and Settings → Money Setup */

const QA_ICON = {
  expense: DollarSign,
  receipt: Scan,
  bill: Calendar,
  debt: CreditCard,
  simulator: Calculator,
  budget: Package,
  shift: Activity,
  trade: TrendingUp,
  savings: Target,
  networth: TrendingUp,
  insights: BarChart2,
  paycheck: Wallet,
  health: Heart,
  bills_nav: CalendarClock,
  calendar_nav: Calendar,
  recurring_nav: RefreshCw,
};

const MORE_ICON = {
  health: Heart,
  paycheck: Wallet,
  networthtrend: TrendingUp,
  insights: BarChart2,
  debt: CreditCard,
  savings: Target,
  calendar: Calendar,
  search: Search,
  household: Home,
};

const ACCT_ICON = {
  checking: Building2,
  savings: PiggyBank,
  cushion: Shield,
  k401: Landmark,
  roth_ira: Sprout,
  brokerage: LineChart,
  hsa: Activity,
  crypto: Bitcoin,
  property: Home,
  investments: TrendingUp,
  vehicles: Car,
};

function AppInner(){
  const[tab,setTabRaw]=useState("home");
  const[tabHistory,setTabHistory]=useState([]);
  function navTo(t){if(t===tab)return;setTabHistory(h=>[...h.slice(-19),tab]);setTabRaw(t);requestAnimationFrame(()=>requestAnimationFrame(()=>{const el=document.getElementById("fv-scroll");if(el)el.scrollTop=0;}));}
  const navToRef=useRef(navTo);
  navToRef.current=navTo;
  function goBack(){setTabHistory(h=>{if(!h.length)return h;const p=h[h.length-1];setTabRaw(p);requestAnimationFrame(()=>requestAnimationFrame(()=>{const el=document.getElementById("fv-scroll");if(el)el.scrollTop=0;}));return h.slice(0,-1);});}
  const canGoBack=tabHistory.length>0;
  const {rechartsMod, failed: rechartsLoadFailed} = useRechartsLoader();
  const[darkMode,setDarkMode]=useState(()=>{try{return localStorage.getItem("fv_dark")==="1";}catch{return false;}});
  const _startupParams=useRef((()=>{try{const sp=new URLSearchParams(window.location.search);return{action:sp.get("action"),tab:sp.get("tab")};}catch{return{};}})());
  /** Throttle pulls when app becomes visible (visibility/pageshow can fire in bursts on mobile). */
  const lastVisibilityPullRef=useRef(0);
  const readyRef=useRef(false);
  const[authSession,setAuthSession]=useState(null);
  const[authLoading,setAuthLoading]=useState(true);
  const[pwResetMode,setPwResetMode]=useState(()=>{try{return localStorage.getItem("fv_pw_reset")==="1";}catch{return false;}});
  const[newPw,setNewPw]=useState("");const[pwMsg,setPwMsg]=useState("");const[pwLoading,setPwLoading]=useState(false);
  const[skipAuth,setSkipAuth]=useState(()=>{try{return localStorage.getItem("fv_skip_auth")==="1";}catch{return false;}});
  const[storageQuotaBlocked,setStorageQuotaBlocked]=useState(false);
  const[cloudSyncMetaBump,setCloudSyncMetaBump]=useState(0);
  const[sessionExpired,setSessionExpired]=useState(false);
  useEffect(()=>{
    setSessionExpiredHandler(()=>{
      try{
        const s=JSON.parse(localStorage.getItem("fv_session")||"null");
        if(!s?.access_token)return;
      }catch{return;}
      try{localStorage.removeItem("fv_session");}catch{}
      setAuthSession(null);
      setSessionExpired(true);
    });
    return()=>setSessionExpiredHandler(null);
  },[]);
  const authToken=authSession?.access_token||null;
  const authSessionRef=useRef(authSession);
  useEffect(()=>{authSessionRef.current=authSession;},[authSession]);
  // Background token refresh — Supabase tokens expire after 1hr, refresh every 45min
  useEffect(()=>{
    if(!authSession?.refresh_token)return;
    const doRefresh=async()=>{
      try{
        const s=(()=>{try{return JSON.parse(localStorage.getItem("fv_session")||"null");}catch{return null;}})();
        if(!s?.refresh_token)return;
        const res=await trackfiAuthRefreshFetch(s.refresh_token);
        if(!res)return;
        const r=await res.json().catch(()=>({}));
        if(r.access_token){
          const newSess={...s,...r};
          try{localStorage.setItem("fv_session",JSON.stringify(newSess));}catch{}
          setAuthSession(newSess);
        } else {
          // Refresh token is expired or revoked — session is gone
          triggerSessionExpired();
        }
      }catch{}
    };
    const iv=setInterval(doRefresh,45*60*1000);
    return()=>clearInterval(iv);
  },[authSession?.refresh_token]);

  useEffect(()=>{
    // "Try without account" — don't block on session refresh / network.
    try{
      if(localStorage.getItem("fv_skip_auth")==="1"){
        setAuthLoading(false);
        return undefined;
      }
    }catch{}
    const authMaxMs=isSupabaseConfigured()?12000:5000;
    const authTimeout=setTimeout(()=>setAuthLoading(false),authMaxMs);
    // Handle email confirmation callback — Supabase puts tokens in the URL hash
    const hash = window.location.hash;
    if(hash && hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.replace("#",""));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type"); // "signup" or "recovery"
      if(accessToken) {
        const sess = {access_token: accessToken, refresh_token: refreshToken, token_type:"bearer"};
        supaFetch("/auth/v1/user",{headers:{"Authorization":"Bearer "+accessToken}}).then(u=>{
          const user = u?.data || u;
          if(user?.id) {
            const fullSess = {...sess, user};
            try{localStorage.setItem("fv_session", JSON.stringify(fullSess));}catch{}
            if(type==="recovery") {
              // Password reset flow — sign in but show change-password prompt
              setAuthSession(fullSess);
              try{localStorage.setItem("fv_pw_reset","1");}catch{}
            } else {
              handleAuth(fullSess);
            }
          }
          window.history.replaceState(null,"",window.location.pathname);
          setAuthLoading(false);
        }).catch(()=>{window.history.replaceState(null,"",window.location.pathname);setAuthLoading(false);});
        return()=>clearTimeout(authTimeout);
      }
    }
    // Normal boot: validate + refresh existing session
    const s=(()=>{try{return JSON.parse(localStorage.getItem("fv_session")||"null");}catch{return null;}})();
    if(!s?.access_token){setAuthLoading(false);return()=>clearTimeout(authTimeout);}
    // Try to refresh the token first (handles expired access tokens)
    async function tryRefresh(session){
      if(!session?.refresh_token) return session;
      try{
        const res=await trackfiAuthRefreshFetch(session.refresh_token);
        if(!res)return session;
        const r=await res.json().catch(()=>({}));
        if(r.access_token){
          const newSess={...session,...r};
          try{localStorage.setItem("fv_session",JSON.stringify(newSess));}catch{}
          return newSess;
        }
      }catch{}
      return session;
    }
    tryRefresh(s).then(sess=>{
      return supaFetch("/auth/v1/user",{headers:{"Authorization":"Bearer "+sess.access_token}}).then(u=>{
        if(u?.data?.id||u?.id){
          setAuthSession(sess);
        }else if(u?.error&&u.error.status!==401){
          // Offline / transient auth check failure: keep the local session so the app remains usable.
          setAuthSession(sess);
        }else{
          localStorage.removeItem("fv_session");
        }
        setAuthLoading(false);
      });
    }).catch(()=>setAuthLoading(false));
    return()=>clearTimeout(authTimeout);
  },[]);
  function handleAuth(sess){
    const priorSession=(()=>{try{return JSON.parse(localStorage.getItem("fv_session")||"null");}catch{return null;}})();
    const priorScope=(()=>{try{return getScope();}catch{return "";}})();
    setAuthSession(sess);
    try{localStorage.setItem("fv_session",JSON.stringify(sess));}catch{}
    let migratedLocal=false;
    // Migrate device-scoped "Try without account" data into the signed-in scope.
    try{
      const uid=sess?.user?.id?.slice(0,8);
      if(uid){
        const scope="fv6_"+uid+":";
        const priorWasDevice=!priorSession?.user?.id&&priorScope&&priorScope!==scope;
        const copyKeys=SCOPED_USER_DATA_KEYS;
        if(priorWasDevice){
          copyKeys.forEach(k=>{
            const src=localStorage.getItem(priorScope+k);
            const dst=localStorage.getItem(scope+k);
            if(src!=null&&dst==null){
              localStorage.setItem(scope+k,src);
              migratedLocal=true;
            }
          });
        }
        copyKeys.forEach(k=>{
          const legacy=localStorage.getItem("fv6:"+k);
          const scoped=localStorage.getItem(scope+k);
          if(legacy!=null&&scoped==null){
            localStorage.setItem(scope+k,legacy);
            migratedLocal=true;
          }
        });
        if(migratedLocal){
          copyKeys.forEach(k=>{
            try{
              const raw=localStorage.getItem(scope+k);
              if(raw!=null)ss("fv6:"+k,JSON.parse(raw));
            }catch{}
          });
        }
      }
    }catch{}
    // Authoritative pull after migration: boot may have run with a different scope before session was set.
    setTimeout(()=>loadFromSupabase(sess,{background:true,preserveLocalOnEmpty:migratedLocal}),150);
  }
  async function loadFromSupabase(sess,opts={}){
    const background=opts.background===true;
    if(isTrackfiDemoMode())return;
    const uid=sess?.user?.id;
    if(!uid)return;
    if(background&&backgroundPullInFlightRef.current)return backgroundPullInFlightRef.current;
    const gen=++remotePullGenRef.current;
    const exec=(async()=>{
      try{
        await flushPendingSync();
        if(gen!==remotePullGenRef.current)return;
        await new Promise(r=>setTimeout(r,50));
        if(gen!==remotePullGenRef.current)return;
        if(!background)setSyncing(true);
        const res=await supaFetchUserDataRows(uid);
        if(gen!==remotePullGenRef.current)return;
        if(!res?.data||!Array.isArray(res.data)){
          if(navigator.onLine)setSyncRecoverableError(true);
          if(!background)showToast("Sync failed — check your connection","error");
          return;
        }
        cancelPendingDebouncedSync();
        if(res.data.length===0){
          applyPulledUserDataRows([]);
          if(opts.preserveLocalOnEmpty===true){
            cloudLoadedRef.current=true;
          }else{
            resetUserState({clearOnboarding:true,cloudLoadedRefTarget:true});
          }
          setSyncRecoverableError(false);
          try{localStorage.setItem("fv_last_sync",String(Date.now()));}catch{}
          setCloudSyncMetaBump(b=>b+1);
          return;
        }
        applyPulledUserDataRows(res.data);
        const map={};
        res.data.forEach(row=>{map[row.key]=row.value;});
        const fullMap=buildAuthoritativeCloudMap(map);
        setSyncRecoverableError(false);
        applyUserDataSnapshot(fullMap,{
          setExpenses,setBills,setDebts,setBGoals,setSGoals,setCats,setTrades,
          setBalHist,setShifts,setRecurrings,setNotifs,setSettlements,setHhBudgets,
          setNwGoal,setSubDismissed,setAccounts,setIncome,setSettings,setCalColors,
          setDashConfig,setHousehold,setTradingAccount,setAppName,setGreetName,
          setProfCategory,setProfSub,setAccountRates,setOnboarded,
        },{cloudPull:true});
        const pulledSettings=fullMap.settings;
        if(
          pulledSettings&&
          typeof pulledSettings==="object"&&
          Object.prototype.hasOwnProperty.call(pulledSettings,"darkMode")&&
          typeof pulledSettings.darkMode==="boolean"
        ){
          setDarkMode(pulledSettings.darkMode);
        }
        cloudLoadedRef.current=true;
        const scope="fv6_"+uid.slice(0,8)+":";
        for(const key of SCOPED_USER_DATA_KEYS){
          if(!Object.prototype.hasOwnProperty.call(fullMap,key))continue;
          try{localStorage.setItem(scope+key,JSON.stringify(fullMap[key]));}catch{}
        }
        try{localStorage.setItem("fv_last_sync",String(Date.now()));}catch{}
        setCloudSyncMetaBump(b=>b+1);
      }catch(e){
        console.error("loadFromSupabase error",e);
        if(gen===remotePullGenRef.current&&navigator.onLine)setSyncRecoverableError(true);
        if(!background)showToast("Sync failed — check your connection","error");
      }finally{
        if(!background&&gen===remotePullGenRef.current)setSyncing(false);
        if(gen===remotePullGenRef.current)setTimeout(()=>{void flushPendingSync();},0);
      }
    })();
    if(background){
      backgroundPullInFlightRef.current=exec;
      exec.finally(()=>{
        if(backgroundPullInFlightRef.current===exec)backgroundPullInFlightRef.current=null;
      });
    }
    return exec;
  }
  const loadFromSupabaseRef=useRef(loadFromSupabase);
  loadFromSupabaseRef.current=loadFromSupabase;
  function handleSkip(){try{localStorage.setItem("fv_skip_auth","1");}catch{}setSkipAuth(true);}
  function resetUserState(opts={}){
    const clearOnboarding=opts.clearOnboarding!==false;
    setExpenses([]);setBills([]);setDebts([]);setSGoals([]);setBGoals([]);
    setTrades([]);setShifts([]);setBalHist([]);setNotifs([]);setRecurrings([]);
    setSettlements([]);setHhBudgets([]);setNwGoal(null);setSubDismissed([]);
    setAccounts(DEF_ACCOUNTS);
    setIncome(DEF_INCOME);
    setHousehold(DEF_HOUSEHOLD);
    setGreetName("");setProfCategory("healthcare");setProfSub("nurse_rn");
    setAppName("Trackfi");setCats(DEF_CATS);
    setSettings(DEF_SETTINGS);
    setTradingAccount({deposit:"",balance:""});
    setDashConfig(DEF_DASHCONFIG);
    setCalColors(DEF_CALCOLORS(C));
    setAccountRates({checking:0,savings:0,cushion:0,k401:0,roth_ira:0,brokerage:0,hsa:0,crypto:0});
    setIsDemoMode(false);setDarkMode(false);setHidden(false);
    try{localStorage.removeItem("fv_demo");}catch{}
    try{window._merchantCats={};}catch{}
    try{localStorage.removeItem("fv_account_rates");}catch{}
    try{localStorage.removeItem("fv_last_sync");}catch{}
    try{localStorage.removeItem("fv_bills_reset_month");}catch{}
    clearScopedUserDataCache();
    if(clearOnboarding){
      setOnboarded(false);
      try{localStorage.removeItem("fv_onboarded");}catch{}
    }
    cloudLoadedRef.current=opts.cloudLoadedRefTarget===true;
    clearUserDataRowVersions();
  }
  async function handleSignOut(){
    const syncOut=await flushPendingSync();
    if(authSession?.user?.id&&(syncOut?.error||syncOut?.conflict||syncOut?.skipped)){
      showToast("Sign out paused — export a backup or try again online after sync finishes.","error");
      return false;
    }
    // Unsubscribe push notifications so this device stops receiving alerts after sign-out
    try{
      if("serviceWorker" in navigator){
        navigator.serviceWorker.ready.then(reg=>{
          reg.pushManager.getSubscription().then(sub=>{
            if(sub){
              const uid=_getUserId();
              if(uid)supaFetch(`/rest/v1/push_subscriptions?user_id=eq.${encodeURIComponent(uid)}`,{method:"DELETE"});
              sub.unsubscribe();
            }
          });
        });
      }
    }catch{}
    if(authToken)supaFetch("/auth/v1/logout",{method:"POST"});
    clearUserDataRowVersions();
    resetUserState();
    setAuthSession(null);
    try{localStorage.removeItem("fv_session");}catch{}
    try{localStorage.removeItem("fv_skip_auth");}catch{}
    setSkipAuth(false);
    setSyncRecoverableError(false);
    setStorageQuotaBlocked(false);
    resetLocalStorageQuotaWarned();
    return true;
  }
  const[ready,setReady]=useState(false);
  useEffect(()=>{readyRef.current=ready;},[ready]);
  // True once we've successfully loaded at least one round of cloud data.
  // Prevents empty boot state from overwriting real Supabase data on other devices.
  const cloudLoadedRef=useRef(false);
  /** Prevents the monthly recap modal from opening twice in one session / before localStorage writes. */
  const monthlyRecapShownRef=useRef(null);
  /** Increments on each loadFromSupabase call so stale responses never overwrite newer state. */
  const remotePullGenRef=useRef(0);
  /** One coalesced background pull at a time (focus/visibility/online) to avoid UI thrash. */
  const backgroundPullInFlightRef=useRef(null);
  const[accounts,setAccounts]=useState(DEF_ACCOUNTS);
  const[income,setIncome]=useState(DEF_INCOME);
  const[expenses,setExpenses]=useState([]);
  const[bills,setBills]=useState([]);
  const[debts,setDebts]=useState([]);
  const[budgetGoals,setBGoals]=useState([]);
  const[savingsGoals,setSGoals]=useState([]);
  const[categories,setCats]=useState(DEF_CATS);
  const[accountRates,setAccountRates]=useState(()=>{try{const r=localStorage.getItem("fv_account_rates");return r?JSON.parse(r):{checking:0,savings:0,cushion:0,k401:0,roth_ira:0,brokerage:0,hsa:0,crypto:0};}catch{return{checking:0,savings:0,cushion:0,k401:0,roth_ira:0,brokerage:0,hsa:0,crypto:0};}});
  const[household,setHousehold]=useState(DEF_HOUSEHOLD);
  const[trades,setTrades]=useState([]);
  const[tradingAccount,setTradingAccount]=useState({deposit:"",balance:""});
  const[shifts,setShifts]=useState([]);
  const[balHist,setBalHist]=useState([]);
  const[notifs,setNotifs]=useState([]);
  const[calColors,setCalColors]=useState(()=>DEF_CALCOLORS(C));
  const[settings,setSettings]=useState(DEF_SETTINGS);
  const billsNeedingRecurringReshow=useMemo(()=>{
    if(!bills.length)return false;
    return bills.some(b=>{
      if(!b.paid||!b.recurring||b.recurring==="One-time")return false;
      if(isBillDueDateUnusable(b.dueDate))return true;
      const w=recurringReshowUpcomingWithinDays(b.recurring,settings);
      return dueIn(b.dueDate)<=w;
    });
  },[bills,settings]);
  const[monthlySummary,setMonthlySummary]=useState(null);
  const[dashConfig,setDashConfig]=useState(DEF_DASHCONFIG);
  const[appName,setAppName]=useState("Trackfi");
  const[greetName,setGreetName]=useState("");
  const[profCategory,setProfCategory]=useState("healthcare");
  const[profSub,setProfSub]=useState("nurse_rn");
  const[hidden,setHidden]=useState(false);
  const[heroIdx,setHeroIdx]=useState(0);
  const[pwaPrompt,setPwaPrompt]=useState(null);
  const[pwaInstalled,setPwaInstalled]=useState(()=>{try{return localStorage.getItem("fv_pwa_dismissed")==="1";}catch{return false;}});
  const[pwaUpdateReady,setPwaUpdateReady]=useState(false);
  useEffect(()=>{
    const handler=e=>{e.preventDefault();setPwaPrompt(e);};
    window.addEventListener("beforeinstallprompt",handler);
    window.addEventListener("appinstalled",()=>{setPwaInstalled(true);localStorage.setItem("fv_pwa_dismissed","1");});
    return()=>window.removeEventListener("beforeinstallprompt",handler);
  },[]);
  useEffect(()=>{
    const handler=()=>setPwaUpdateReady(true);
    window.addEventListener("trackfi:pwa-update-ready",handler);
    return()=>window.removeEventListener("trackfi:pwa-update-ready",handler);
  },[]);
  const[isOnline,setIsOnline]=useState(()=>navigator.onLine);
  const[syncRecoverableError,setSyncRecoverableError]=useState(false);
  useEffect(()=>{
    function onLeave(){if(_getUserId())flushPendingSync();}
    window.addEventListener("pagehide",onLeave);
    window.addEventListener("beforeunload",onLeave);
    return()=>{window.removeEventListener("pagehide",onLeave);window.removeEventListener("beforeunload",onLeave);};
  },[]);
  const[pinEnabled,setPinEnabled]=useState(()=>{try{return!!localStorage.getItem("fv_pin_hash");}catch{return false;}});
  const[locked,setLocked]=useState(()=>{try{return!!localStorage.getItem("fv_pin_hash");}catch{return false;}});
  const[onboarded,setOnboarded]=useState(()=>{try{return localStorage.getItem("fv_onboarded")==="1";}catch{return false;}});
  const[recurrings,setRecurrings]=useState(()=>{try{const scoped=localStorage.getItem(getScope()+"recurrings");if(scoped)return JSON.parse(scoped);const legacy=localStorage.getItem("fv_recurring");return legacy?JSON.parse(legacy):[];}catch{return[];}});
  const[settlements,setSettlements]=useState(()=>{try{const s=localStorage.getItem(getScope()+"settlements");if(s!==null)return JSON.parse(s);const l=localStorage.getItem("fv_settlements");return l?JSON.parse(l):[];}catch{return[];}});
  const[hhBudgets,setHhBudgets]=useState(()=>{try{const s=localStorage.getItem(getScope()+"hhBudgets");if(s!==null)return JSON.parse(s);const l=localStorage.getItem("fv_hh_budgets");return l?JSON.parse(l):[];}catch{return[];}});
  const[nwGoal,setNwGoal]=useState(()=>{try{const s=localStorage.getItem(getScope()+"nwGoal");if(s!==null){const p=JSON.parse(s);return p;}const l=localStorage.getItem("fv_nwgoal");return l?JSON.parse(l):null;}catch{return null;}});
  const[subDismissed,setSubDismissed]=useState(()=>{try{const s=localStorage.getItem(getScope()+"subDismissed");if(s!==null)return JSON.parse(s);const l=localStorage.getItem("fv_sub_dismissed");return l?JSON.parse(l):[];}catch{return[];}});
  const[modal,setModal]=useState(null);
  const[formError,setFormError]=useState("");
  const[showExport,setShowExport]=useState(false);
  const[showImport,setShowImport]=useState(false);
  const[paycheckDepCtx,setPaycheckDepCtx]=useState(null);
  const[form,setForm]=useState({});
  const[editItem,setEditItem]=useState(null);
  const[extraPayDebt,setExtraPayDebt]=useState(0);
  const[debtSavePing,setDebtSavePing]=useState(0);
  useEffect(()=>{
    if(!ready)return;
    const t=setTimeout(()=>setDebtSavePing(Date.now()),450);
    return()=>clearTimeout(t);
  },[debts,ready]);
  const[confirm,setConfirm]=useState(null);
  const[syncing,setSyncing]=useState(false);
  const[toast,setToast]=useState(null);
  const showToast=(msg,type='success',action=null)=>{setToast({msg,type,action});const dur=type==='error'?4000:type==='info'?3000:action?4000:2500;setTimeout(()=>setToast(t=>t?.msg===msg?null:t),dur);};
  const showUndoToast=(msg,undoFn)=>showToast(msg,"error",{label:"Undo",fn:undoFn});

  function applyOnboardingComplete(d){
    if(d.name)setGreetName(d.name);
    setAppName("Trackfi");
    if(d.profCategory)setProfCategory(d.profCategory);
    if(d.profSub)setProfSub(d.profSub);
    const income=incomeFromOnboarding(d.income||{});
    setIncome(income);
    const cashAccounts=buildCashAccountsFromOnboarding(d.accounts||{});
    if(d.accounts||cashAccounts.length){
      const acc=d.accounts||{};
      setAccounts(p=>({
        ...p,
        checking:"",
        savings:"",
        cushion:acc.cushion??p.cushion??"",
        investments:acc.investments??p.investments??"",
        cashAccounts:cashAccounts.length?cashAccounts:p.cashAccounts,
      }));
    }
    const checkingAcc=cashAccounts.find(a=>a.kind==="checking");
    const savingsAcc=cashAccounts.find(a=>a.kind==="savings");
    setSettings(s=>({
      ...settingsPatchFromOnboarding(income,s),
      ...(checkingAcc?{defaultCheckingAccountId:String(checkingAcc.id)}:{}),
      ...(savingsAcc?{defaultSavingsAccountId:String(savingsAcc.id)}:{}),
    }));
    setHousehold(householdFromUseCase(d.useCase,d.name));
    try{localStorage.setItem("fv_onboarded","1");localStorage.removeItem("fv_pending_name");}catch{}
    ss("fv6:onboarded",true);
    setOnboarded(true);
  }

  function handleTryDemoFresh(){
    handleSkip();
    loadDemo();
  }
  const showToastRef=useRef(showToast);
  showToastRef.current=showToast;

  useEffect(()=>{
    setLocalStorageQuotaHandler(()=>{
      setStorageQuotaBlocked(true);
      showToastRef.current(
        "Device storage is full — changes may not save. Export a backup from More → Export Data, then free browser storage.",
        "error",
        { label: "Open Export", fn: () => navToRef.current?.("export") }
      );
    });
    return()=>setLocalStorageQuotaHandler(null);
  },[]);

  useEffect(()=>{
    setLastSyncUiBumpHandler(()=>setCloudSyncMetaBump(b=>b+1));
    return()=>setLastSyncUiBumpHandler(null);
  },[]);

  useEffect(()=>{
    setUploadConflictHandler(()=>{
      const s=authSessionRef.current;
      if(s?.user?.id&&!isTrackfiDemoMode())void loadFromSupabaseRef.current?.(s,{background:true});
    });
    return()=>setUploadConflictHandler(null);
  },[]);

  /** Tab focus / visibility — flush local uploads (version-aware), then pull latest for smooth multi-device rotation. */
  useEffect(()=>{
    async function pullIfDue(){
      const sess=authSessionRef.current;
      if(!sess?.user?.id||isTrackfiDemoMode())return;
      if(!readyRef.current)return;
      const now=Date.now();
      if(now-lastVisibilityPullRef.current<4500)return;
      lastVisibilityPullRef.current=now;
      const { conflict }=await flushPendingSync();
      if(conflict)showToastRef.current("Another device had newer data — this tab was synced to match.","info");
      await loadFromSupabaseRef.current?.(sess,{background:true});
    }
    function onFocus(){
      if(!authSessionRef.current?.user?.id)return;
      void pullIfDue();
    }
    let bgTimestamp=0;
    function onVis(){
      if(document.hidden){
        bgTimestamp=Date.now();
      }else{
        void pullIfDue();
        if(bgTimestamp>0&&Date.now()-bgTimestamp>2*60*1000){
          setPinEnabled(pe=>{if(pe){setLocked(true);}return pe;});
        }
        bgTimestamp=0;
      }
    }
    function onPageShow(e){
      if(!authSessionRef.current?.user?.id||!e.persisted)return;
      void pullIfDue();
    }
    window.addEventListener("focus",onFocus);
    document.addEventListener("visibilitychange",onVis);
    window.addEventListener("pageshow",onPageShow);
    return()=>{
      window.removeEventListener("focus",onFocus);
      document.removeEventListener("visibilitychange",onVis);
      window.removeEventListener("pageshow",onPageShow);
    };
  },[]);

  useEffect(()=>{
    const goOnline=async()=>{
      setIsOnline(true);
      setSyncRecoverableError(false);
      showToastRef.current("Back online — syncing...","success");
      const { conflict }=await flushPendingSync();
      if(conflict)showToastRef.current("Another device had newer data — syncing this device to match.","info");
      const s=authSessionRef.current;
      if(s?.user?.id)await loadFromSupabaseRef.current?.(s,{background:true});
    };
    const goOffline=()=>{setIsOnline(false);};
    window.addEventListener("online",goOnline);
    window.addEventListener("offline",goOffline);
    return()=>{window.removeEventListener("online",goOnline);window.removeEventListener("offline",goOffline);};
  },[]);

  const[isDemoMode,setIsDemoMode]=useState(()=>{try{return localStorage.getItem("fv_demo")==="1";}catch{return false;}});
  const[demoBannerVisible,setDemoBannerVisible]=useState(true);
  // Auto-hide demo banner after 6 seconds, but it can be re-shown by scrolling back to top
  useEffect(()=>{if(!isDemoMode)return;const t=setTimeout(()=>setDemoBannerVisible(false),6000);return()=>clearTimeout(t);},[isDemoMode]);

  useEffect(()=>{
    let bootDone=false;
    const bootSafety=setTimeout(()=>{
      if(!bootDone){
        bootDone=true;
        cloudLoadedRef.current=true;
        setReady(true);
      }
    },12000);
    (async()=>{
      try{
        // Bulk fetch all keys in one query when logged in (1 read vs N).
        // Demo mode: never hydrate from cloud (avoids replacing sample data + contaminating pulls).
        const uid_boot=_getUserId();
        const _demoHydrateKeys=["accounts","income","expenses","bills","debts","bgoals","sgoals","cats","trades","taccount","settings","calColors","notifs","balHist","shifts","prof","profSub","dashConfig","appName","greetName","merchantCats","recurrings","settlements","hhBudgets","nwGoal","subDismissed","household","accountRates","onboarded"];
        let _bulkMap={};
        let cloudHydratedFromBulk=false;
        if(isTrackfiDemoMode()){
          const scope=getScope();
          for(const bare of _demoHydrateKeys){
            try{
              const raw=localStorage.getItem(scope+bare);
              if(raw!==null)_bulkMap[bare]=JSON.parse(raw);
            }catch{}
          }
        }else if(uid_boot){
          try{
            const bulk=await supaFetchUserDataRows(uid_boot);
            if(bulk?.error==null && Array.isArray(bulk.data) && bulk.data.length===0){
              applyPulledUserDataRows([]);
              resetUserState({ clearOnboarding: true, cloudLoadedRefTarget: true });
              return;
            }
            if(bulk?.error==null && Array.isArray(bulk.data) && bulk.data.length>0){
              applyPulledUserDataRows(bulk.data);
              const raw={};
              bulk.data.forEach(r=>{raw[r.key]=r.value;});
              const fullMap=buildAuthoritativeCloudMap(raw);
              applyUserDataSnapshot(fullMap,{
                setExpenses,setBills,setDebts,setBGoals,setSGoals,setCats,setTrades,
                setBalHist,setShifts,setRecurrings,setNotifs,setSettlements,setHhBudgets,
                setNwGoal,setSubDismissed,setAccounts,setIncome,setSettings,setCalColors,
                setDashConfig,setHousehold,setTradingAccount,setAppName,setGreetName,
                setProfCategory,setProfSub,setAccountRates,setOnboarded,
              },{cloudPull:true});
              const bootSettings=fullMap.settings;
              if(
                bootSettings&&
                typeof bootSettings==="object"&&
                Object.prototype.hasOwnProperty.call(bootSettings,"darkMode")&&
                typeof bootSettings.darkMode==="boolean"
              )setDarkMode(bootSettings.darkMode);
              const scope="fv6_"+uid_boot.slice(0,8)+":";
              for(const key of SCOPED_USER_DATA_KEYS){
                if(!Object.prototype.hasOwnProperty.call(fullMap,key))continue;
                try{localStorage.setItem(scope+key,JSON.stringify(fullMap[key]));}catch{}
              }
              cloudLoadedRef.current=true;
              cloudHydratedFromBulk=true;
            }
          }catch{}
        }
        if(cloudHydratedFromBulk){
          return;
        }
        async function _sg_boot(bare){
          if(_bulkMap[bare]!==undefined)return _bulkMap[bare];
          return sg("fv6:"+bare);
        }
        const keys=["fv6:accounts","fv6:income","fv6:expenses","fv6:bills","fv6:debts","fv6:bgoals","fv6:sgoals","fv6:cats","fv6:trades","fv6:taccount","fv6:settings","fv6:calColors","fv6:notifs","fv6:balHist","fv6:shifts","fv6:prof","fv6:profSub","fv6:dashConfig","fv6:appName","fv6:greetName","fv6:merchantCats","fv6:recurrings","fv6:settlements","fv6:hhBudgets","fv6:nwGoal","fv6:subDismissed"];
        const vals=await Promise.all(keys.map(k=>_sg_boot(k.replace("fv6:",""))));
        const bareKeys=["accounts","income","expenses","bills","debts","bgoals","sgoals","cats","trades","taccount","settings","calColors","notifs","balHist","shifts","prof","profSub","dashConfig","appName","greetName","merchantCats","recurrings","settlements","hhBudgets","nwGoal","subDismissed"];
        const bootMap={};
        bareKeys.forEach((k,i)=>{
          const v=vals[i];
          if(uid_boot&&(k in _bulkMap))bootMap[k]=_bulkMap[k];
          else{if(v===undefined||v===null)return;bootMap[k]=v;}
        });
        try{
          let hh=_bulkMap["household"];
          if(hh===undefined){const h=await sg("fv6:household");if(h)hh=h;}
          if(hh!=null&&typeof hh==="object")bootMap.household=hh;
        }catch{}
        try{
          const ar=_bulkMap["accountRates"]!==undefined?_bulkMap["accountRates"]:(await sg("fv6:accountRates"));
          if(ar&&typeof ar==="object")bootMap.accountRates=ar;
        }catch{}
        try{
          const ob=_bulkMap["onboarded"]!==undefined?_bulkMap["onboarded"]:(await sg("fv6:onboarded"));
          if(ob)bootMap.onboarded=ob;
        }catch{}
        applyUserDataSnapshot(bootMap,{
          setExpenses,setBills,setDebts,setBGoals,setSGoals,setCats,setTrades,
          setBalHist,setShifts,setRecurrings,setNotifs,setSettlements,setHhBudgets,
          setNwGoal,setSubDismissed,setAccounts,setIncome,setSettings,setCalColors,
          setDashConfig,setHousehold,setTradingAccount,setAppName,setGreetName,
          setProfCategory,setProfSub,setAccountRates,setOnboarded,
        },{bootDefaults:true});
        const bootSettings = bootMap.settings;
        if(
          bootSettings &&
          typeof bootSettings === "object" &&
          Object.prototype.hasOwnProperty.call(bootSettings,"darkMode") &&
          typeof bootSettings.darkMode === "boolean"
        ){
          setDarkMode(bootSettings.darkMode);
        }
        // After boot hydration: allow ss() effects. (Previously this only flipped for demo _bulkMap, which left
        // browser-only and signed-in localStorage paths stuck with cloudLoadedRef=false — nothing persisted.)
        cloudLoadedRef.current=true;
      }catch(e){console.error("Load error",e);}
      finally{
        clearTimeout(bootSafety);
        if(!bootDone){
          bootDone=true;
          setReady(true);
        }
      }
    })();
    return()=>clearTimeout(bootSafety);
  },[]);

  useEffect(()=>{
    if(!ready)return;
    const{action,tab:startTab}=_startupParams.current;
    if(!action&&!startTab)return;
    const validTabs=["home","bills","spend","chat","debt","savings","accounts","insights","health","cashflow","networthtrend","paycheck","household","recurring","calendar","shifts","categories"];
    if(startTab&&validTabs.includes(startTab))navTo(startTab);
    if(action==="expense")om("expense");
    else if(action==="bill")om("bill");
    _startupParams.current={};
    try{window.history.replaceState(null,"",window.location.pathname);}catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ready]);

  useEffect(()=>{if(!ready)return;if(_getUserId()&&!cloudLoadedRef.current&&!accountsHasPositiveBalance(accounts))return;ss("fv6:accounts",accounts);const tod=todayStr();setBalHist(prev=>{const last=prev[prev.length-1];if(last?.date===tod)return prev;const ds=last?Math.floor((new Date(tod)-new Date(last.date+"T00:00:00"))/86400000):999;if(ds<6)return prev;const _bh={date:tod,checking:totalCheckingBalance(accounts),savings:totalSavingsBalance(accounts),cushion:parseFloat(accounts.cushion||0),investments:parseFloat(accounts.investments||0),k401:parseFloat(accounts.k401||0),roth_ira:parseFloat(accounts.roth_ira||0),brokerage:parseFloat(accounts.brokerage||0),crypto:parseFloat(accounts.crypto||0),hsa:parseFloat(accounts.hsa||0),property:parseFloat(accounts.property||0),vehicles:parseFloat(accounts.vehicles||0),trading:parseFloat(tradingAccount?.balance||0)};_bh.total=Object.values(_bh).filter(v=>typeof v==="number").reduce((s,v)=>s+v,0);_bh.totalDebt=sumDebtsPrincipalAndAccrued(debts)+legacyCreditCardOwed(accounts,debts);return[...prev,_bh].slice(-104);});},[accounts,debts,tradingAccount,ready]);
  // Batched persistence — grouped by change frequency to reduce effect overhead
  useEffect(()=>{if(!ready)return;if(!balHist.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:balHist",balHist);},[balHist,ready]);
  useEffect(()=>{if(!ready)return;if(!expenses.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:expenses",expenses);},[expenses,ready]);
  useEffect(()=>{if(!ready)return;if(!bills.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:bills",bills);},[bills,ready]);
  useEffect(()=>{if(!ready)return;if(!debts.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:debts",debts);},[debts,ready]);
  useEffect(()=>{if(!ready)return;if(!trades.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:trades",trades);},[trades,ready]);
  useEffect(()=>{if(!ready)return;if(!notifs.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:notifs",notifs);},[notifs,ready]);
  useEffect(()=>{if(!ready)return;if(!shifts.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:shifts",shifts);},[shifts,ready]);
  useEffect(()=>{if(!ready)return;if(!recurrings.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:recurrings",recurrings);},[recurrings,ready]);
  useEffect(()=>{if(!ready)return;if(!settlements.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:settlements",settlements);},[settlements,ready]);
  useEffect(()=>{if(!ready)return;if(!hhBudgets.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:hhBudgets",hhBudgets);},[hhBudgets,ready]);
  useEffect(()=>{if(!ready)return;if(_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:nwGoal",nwGoal);},[nwGoal,ready]);
  useEffect(()=>{if(!ready)return;if(!subDismissed.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:subDismissed",subDismissed);},[subDismissed,ready]);
  // Settings & config (change infrequently)
  useEffect(()=>{
    if(!ready)return;
    if(_getUserId()&&!cloudLoadedRef.current)return;
    ss("fv6:income",income);ss("fv6:bgoals",budgetGoals);ss("fv6:sgoals",savingsGoals);
    ss("fv6:cats",categories);ss("fv6:settings",settings);
  },[income,budgetGoals,savingsGoals,categories,settings,ready]);
  // Profile & display (change rarely)
  useEffect(()=>{
    if(!ready)return;
    if(_getUserId()&&!cloudLoadedRef.current)return;
    ss("fv6:prof",profCategory);ss("fv6:profSub",profSub);
    ss("fv6:appName",appName);ss("fv6:greetName",greetName);
    ss("fv6:dashConfig",dashConfig);ss("fv6:household",household);
  },[profCategory,profSub,appName,greetName,dashConfig,household,ready]);
  useEffect(()=>{try{localStorage.setItem("fv_account_rates",JSON.stringify(accountRates));}catch{};if(ready)ss("fv6:accountRates",accountRates);},[accountRates,ready]);
  // Recurring bills marked paid stay in history until the next due is within the cadence-specific window — then they return to Upcoming (unpaid for the new cycle).
  // One-time paid bills stay paid until the user manually marks them unpaid, so balances cannot be double-applied by an automatic reset.
  useEffect(()=>{
    if(!ready||!bills.length||!billsNeedingRecurringReshow)return;
    setBills(p=>p.map(b=>{
      if(!b.paid||!b.recurring||b.recurring==="One-time")return b;
      const cleared={...b,paid:false,paidDate:undefined,loanPrincipalApplied:undefined,loanPrevInterestAsOfDate:undefined,loanPrevAccruedInterest:undefined};
      if(isBillDueDateUnusable(b.dueDate))return cleared;
      const w=recurringReshowUpcomingWithinDays(b.recurring,settings);
      if(dueIn(b.dueDate)>w)return b;
      return cleared;
    }));
  },[ready,billsNeedingRecurringReshow,settings]);
  /** Prevents duplicate system notifications: SW showNotification is async, so two effect runs can both schedule OS before the in-app dedupe row exists. */
  const osNotifCooldownRef=useRef(new Map());
  const pushNotif=(id,title,body,type)=>{
    setNotifs(p=>{
      if(p.find(n=>n.id===id))return p;
      const row={id,title,body,type,time:Date.now(),read:false};
      if(notifSupported()&&notifPermission()==="granted"){
        const now=Date.now();
        const last=osNotifCooldownRef.current.get(id);
        const skipOsCooldown=last!=null&&now-last<12000;
        // Don't buzz the device while the user is already looking at the app — bell list still updates.
        const inForeground=typeof document!=="undefined"&&document.visibilityState==="visible";
        const shouldShowOs=!skipOsCooldown&&!inForeground;
        if(shouldShowOs){
          osNotifCooldownRef.current.set(id,now);
          const opts={body,icon:"/icons/icon-192.png",badge:"/icons/icon-192.png",tag:String(id),renotify:false,data:{url:"/"}};
          try{
            if(navigator.serviceWorker?.controller){
              navigator.serviceWorker.ready.then(reg=>reg.showNotification(title,opts)).catch(()=>{
                new window.Notification(title,opts);
              });
            } else {
              new window.Notification(title,opts);
            }
          }catch(e){}
        }
      }
      return[row,...p.slice(0,49)];
    });
  };
  // On load: if permission already granted and user is logged in, ensure subscription is saved
  useEffect(()=>{
    if(!authSession?.access_token||!VAPID_PUBLIC_KEY)return;
    if(notifPermission()!=="granted")return;
    if(!("serviceWorker"in navigator)||!("PushManager"in window))return;
    (async()=>{
      try{
        const reg=await navigator.serviceWorker.ready;
        const b64=VAPID_PUBLIC_KEY.replace(/-/g,"+").replace(/_/g,"/");
        const raw=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
        const existing=await reg.pushManager.getSubscription();
        const sub=existing||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:raw});
        await supaFetch("/rest/v1/push_subscriptions",{
          method:"POST",
          headers:{"Prefer":"resolution=merge-duplicates"},
          body:JSON.stringify({user_id:authSession.user.id,subscription:sub.toJSON()})
        });
      }catch{}
    })();
  },[authSession?.access_token]);
  const requestNotifPermission=async()=>{
    if(!notifSupported())return"unsupported";
    if(notifPermission()==="default"){
      try{await window.Notification.requestPermission();}catch{}
    }
    if(notifPermission()!=="granted")return"denied";
    // Subscribe this device to push and save to Supabase
    try{
      if(VAPID_PUBLIC_KEY&&authSession?.access_token&&"serviceWorker"in navigator&&"PushManager"in window){
        const reg=await navigator.serviceWorker.ready;
        // Convert VAPID public key from base64url to Uint8Array
        const b64=VAPID_PUBLIC_KEY.replace(/-/g,"+").replace(/_/g,"/");
        const raw=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
        const existing=await reg.pushManager.getSubscription();
        const sub=existing||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:raw});
        await supaFetch("/rest/v1/push_subscriptions",{
          method:"POST",
          headers:{"Prefer":"resolution=merge-duplicates"},
          body:JSON.stringify({user_id:authSession.user.id,subscription:sub.toJSON()})
        });
      }
    }catch(e){}
    return"granted";
  };
  // Monthly recap: once per calendar month per user; gate before setState so rapid re-runs / sync flicker can't reopen it
  useEffect(()=>{
    if(!ready)return;
    const now_ms=new Date();
    const curMonth=now_ms.getFullYear()+"-"+String(now_ms.getMonth()+1).padStart(2,"0");
    const uid=_getUserId()||"local";
    const seenKey="fv_monthly_recap_"+uid;
    try{
      if(monthlyRecapShownRef.current===curMonth)return;
      const seen=localStorage.getItem(seenKey);
      if(seen===curMonth)return;
      const lastMs=new Date(now_ms.getFullYear(),now_ms.getMonth()-1,1);
      const lastKey=lastMs.getFullYear()+"-"+String(lastMs.getMonth()+1).padStart(2,"0");
      const lastExp=expenses.filter(e=>e.date?.startsWith(lastKey));
      if(lastExp.length<2)return;
      const lastTotal=lastExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
      const prevMs=new Date(now_ms.getFullYear(),now_ms.getMonth()-2,1);
      const prevKey=prevMs.getFullYear()+"-"+String(prevMs.getMonth()+1).padStart(2,"0");
      const prevTotal=expenses.filter(e=>e.date?.startsWith(prevKey)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
      const catMap=lastExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
      const topCat=Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];
      const pf=income.payFrequency||"Biweekly";
      const pm=pf==="Weekly"?(52/12):pf==="Twice Monthly"?2:pf==="Monthly"?1:(26/12);
      const lastInc=(parseFloat(income.primary||0)*pm)+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
      const savRate=lastInc>0?Math.max(0,(lastInc-lastTotal)/lastInc*100):0;
      monthlyRecapShownRef.current=curMonth;
      try{localStorage.setItem(seenKey,curMonth);}catch{}
      setMonthlySummary({month:FULL_MOS[lastMs.getMonth()],total:lastTotal,prevTotal,topCat:topCat?.[0],topAmt:topCat?.[1],txnCount:lastExp.length,savRate});
    }catch(e){}
  },[ready,expenses,income]);
  useEffect(()=>{if(ready)ss("fv6:calColors",calColors);},[calColors,ready]);
  useEffect(()=>{if(ready)ss("fv6:taccount",tradingAccount);},[tradingAccount,ready]);
  useEffect(()=>{try{localStorage.setItem("fv_dark",darkMode?"1":"0");}catch{};document.body.classList.toggle("dark-mode",!!darkMode);},[darkMode]);

  // paycheckMultiplier converts per-paycheck primary income → monthly
  const paycheckMultiplier=income.payFrequency==="Weekly"?(52/12):income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:(26/12);
  // monthlyIncome = what actually comes in per month (all sources)
  const monthlyIncome=useMemo(()=>(parseFloat(income.primary||0)*paycheckMultiplier)+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0)),[income,paycheckMultiplier]);
  // totalIncome = alias for monthlyIncome (keeps all existing references working)
  const totalIncome=monthlyIncome;
  const totalAssets=useMemo(()=>totalAppAssets(accounts,tradingAccount),[accounts,tradingAccount]);
  const totalExp=useMemo(()=>expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0),[expenses]);
  const totalDebt=useMemo(()=>sumDebtsPrincipalAndAccrued(debts)+legacyCreditCardOwed(accounts,debts),[debts,accounts]);
  const thisMonthExp=useMemo(()=>{const n=new Date();const ms=n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0");return expenses.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);},[expenses]);
  const cashflow=totalIncome-thisMonthExp;
  const netWorth=totalAssets-totalDebt;
  // Net Worth milestone checker — fire when assets cross thresholds
  const NW_MILESTONES=[1000,5000,10000,25000,50000,100000,250000,500000,1000000];
  const prevNWRef=React.useRef(null);
  useEffect(()=>{
    if(!ready)return;
    const nw=totalAssets-totalDebt;
    if(prevNWRef.current===null){prevNWRef.current=nw;return;}
    const prev=prevNWRef.current;
    prevNWRef.current=nw;
    if(nw<=prev)return;// only celebrate growth
    const crossed=NW_MILESTONES.filter(m=>prev<m&&nw>=m);
    if(!crossed.length)return;
    const uid=_getUserId()||"local";
    const key="fv_nw_celebrated_"+uid;
    let celebrated=new Set();
    try{celebrated=new Set(JSON.parse(localStorage.getItem(key)||"[]"));}catch{}
    crossed.forEach(m=>{
      if(celebrated.has(m))return;
      celebrated.add(m);
      const label=m>=1000000?"$1M 🦄":m>=500000?"$500K":"$"+m.toLocaleString();
      if(settings.notifMilestones!==false){pushNotif("nw_"+m,"🎉 Net Worth Milestone!","You crossed "+label+" net worth — incredible!","success");showToast("🎉 "+label+" net worth milestone!","success");launchConfetti();}
      try{localStorage.setItem(key,JSON.stringify([...celebrated]));}catch{}
    });
  },[totalAssets,totalDebt,ready,settings.notifMilestones]);

  const overdue=useMemo(()=>bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0),[bills]);
  const dueSoon=useMemo(()=>bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0&&dueIn(b.dueDate)<=7),[bills]);
  const billsSoonAmt=useMemo(()=>dueSoon.reduce((s,b)=>s+(parseFloat(b.amount)||0),0),[dueSoon]);
  const burnRate=dayOfMonth()>0?thisMonthExp/dayOfMonth():0;
  const projected=burnRate*daysInMonth();
  const stsCalc=useMemo(
    ()=>computeSafeToSpend(accounts,income,bills,expenses,budgetGoals),
    [accounts,income,bills,expenses,budgetGoals]
  );
  const sts=stsCalc.sts;
  const nextPayDate=stsCalc.nextPayDate;
  const nextPayStr=stsCalc.nextPayStr;
  const payFreq=stsCalc.payFreq;
  const payPeriodDays=stsCalc.payPeriodDays;
  const burnRateChecking=stsCalc.burnRateChecking;
  // payPerPeriod = what lands in your account each paycheck (primary only)  
  const payPerPeriod=parseFloat(income.primary||0);
  const liquid=(totalSavingsBalance(accounts))+(parseFloat(accounts.cushion||0));
  const savingsRate=totalIncome>0?Math.min(100,Math.max(0,cashflow/totalIncome*100)):0;
  const spendingStreak=useMemo(()=>{
    if(expenses.length<3)return 0;
    const dailyAvgBase=burnRateChecking||50;
    let streak=0;
    const today2=new Date();
    for(let i=0;i<30;i++){
      const d=new Date(today2);d.setDate(d.getDate()-i);
      const ds=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
      const dayTotal=dayCheckingSpend(expenses,ds);
      if(i===0&&dayTotal===0){continue;}
      if(dayTotal<dailyAvgBase){streak++;}else{break;}
    }
    return streak;
  },[expenses,burnRateChecking]);
  const unreadNotifs=useMemo(()=>notifs.filter(n=>!n.read).length,[notifs]);
  const paycheckNudge=useMemo(()=>paycheckPeriodNeedsHandling(income,settings,todayStr()),[income,settings]);
  const openPaycheckDeposit=useCallback(()=>{
    const anchor=String(income.lastPayDate||"").trim();
    if(!anchor){showToast("Set your pay schedule in Paycheck Planner first.","error");return;}
    const t=todayStr();
    const due=getLatestScheduledPaydayOnOrBefore(anchor,income.payFrequency||"Biweekly",t)||t;
    setPaycheckDepCtx({dueDate:due});
  },[income.lastPayDate,income.payFrequency,showToast]);

  useEffect(()=>{
    if(!ready)return;
    // Clean up stale bill notifications first — remove any notif for a bill
    // that no longer exists or has been marked as paid
    setNotifs(prev=>{
      const billIds=new Set(bills.filter(b=>!b.paid).map(b=>String(b.id)));
      return prev.filter(n=>{
        if(n.id.startsWith('ov_')||n.id.startsWith('due3_')){
          const billId=n.id.replace('ov_','').replace('due3_','');
          return billIds.has(billId);
        }
        return true; // keep all other notification types
      });
    });
    bills.forEach(b=>{
      if(b.paid)return;
      const d=dueIn(b.dueDate);
      if(settings.notifBills!==false){
        if(d<0){
          // Bill is now overdue — remove any stale "due soon" notification for it
          setNotifs(prev=>prev.filter(n=>n.id!=='due3_'+b.id));
          pushNotif('ov_'+b.id,'🚨 Overdue: '+b.name,fmt(b.amount)+' was due '+Math.abs(d)+'d ago','danger');
        } else if(d<=3){
          pushNotif('due3_'+b.id,'⚠️ Due soon: '+b.name,fmt(b.amount)+' due in '+d+' day'+(d!==1?'s':''),'warning');
        }
      }
    });
    const _now=new Date();const _ms=_now.getFullYear()+'-'+String(_now.getMonth()+1).padStart(2,'0');
    if(settings.notifBudget!==false&&Array.isArray(budgetGoals)&&Array.isArray(expenses))budgetGoals.forEach(g=>{if(!g.category||!g.limit)return;const spent=expenses.filter(e=>e.category===g.category&&e.date?.startsWith(_ms)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);const pct=parseFloat(g.limit)>0?(spent/parseFloat(g.limit)*100):0;if(pct>=100)pushNotif('bud_over_'+g.id,'🔴 Over budget: '+g.category,'Spent '+fmt(spent)+' of '+fmt(g.limit),'danger');else if(pct>=80)pushNotif('bud_warn_'+g.id,'🟡 '+Math.round(pct)+'% used: '+g.category,fmt(Math.max(0,parseFloat(g.limit)-spent))+' remaining','warning');});
    if(settings.notifSavings!==false&&Array.isArray(savingsGoals))savingsGoals.forEach(g=>{const pct=parseFloat(g.target||1)>0?(parseFloat(g.saved||0)/parseFloat(g.target))*100:0;if(pct>=100){pushNotif('goal_done_'+g.id,'🎉 Goal complete: '+g.name,'You hit your '+fmt(g.target)+' target!','success');const gCk="fv_goal_confetti_"+(_getUserId()||"local")+"_"+g.id;if(!localStorage.getItem(gCk)){try{localStorage.setItem(gCk,"1");}catch{}launchConfetti();}}else if(pct>=75)pushNotif('goal_75_'+g.id,'🎯 75% reached: '+g.name,fmt(Math.max(0,parseFloat(g.target)-parseFloat(g.saved||0)))+' left to go','info');});
    // Payday reminder: notify when payday is tomorrow or today
    const payReminderKey="payremind_"+nextPayStr;
    const daysUntil=Math.ceil((nextPayDate-new Date())/86400000);
    if(settings.notifPayday!==false&&daysUntil<=1&&daysUntil>=0&&parseFloat(income.primary||0)>0){
      pushNotif(payReminderKey,daysUntil===0?"💰 Payday is Today!":"💰 Payday Tomorrow!",
        fmt(parseFloat(income.primary||0))+" expected · "+nextPayDate.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"}),
        "success");
    }
  },[ready,bills,budgetGoals,expenses,settings,savingsGoals,notifs.length,income,accounts,nextPayStr]);
  const detectedSubs=useMemo(()=>{
    if(expenses.length<2)return[];
    // Only look at expenses from the last 6 months to avoid showing cancelled subs
    const _sixMoAgo=new Date();_sixMoAgo.setMonth(_sixMoAgo.getMonth()-6);
    const _sixMoStr=_sixMoAgo.getFullYear()+"-"+String(_sixMoAgo.getMonth()+1).padStart(2,"0")+"-"+String(_sixMoAgo.getDate()).padStart(2,"0");
    const recentExp=expenses.filter(e=>e.date&&e.date>=_sixMoStr);
    if(recentExp.length<2)return[];
    const nameMap={};
    recentExp.forEach(e=>{const key=e.name?.toLowerCase().trim();if(!key)return;if(!nameMap[key])nameMap[key]=[];nameMap[key].push(e);});
    const subs=[];
    Object.entries(nameMap).forEach(([name,exps])=>{
      if(exps.length<2)return;
      const sorted=[...exps].sort((a,b)=>a.date?.localeCompare(b.date));
      const amounts=exps.map(e=>parseFloat(e.amount)||0);
      const avgAmt=amounts.reduce((s,a)=>s+a,0)/amounts.length;
      if(!amounts.every(a=>Math.abs(a-avgAmt)<avgAmt*0.15))return;
      const gaps=[];
      for(let i=1;i<sorted.length;i++){gaps.push(Math.round((new Date(sorted[i].date+"T00:00:00")-new Date(sorted[i-1].date+"T00:00:00"))/(1000*60*60*24)));}
      const avgGap=gaps.reduce((s,g)=>s+g,0)/gaps.length;
      let interval=null;
      if(avgGap>=25&&avgGap<=35){interval="Monthly";}else if(avgGap>=6&&avgGap<=8){interval="Weekly";}else if(avgGap>=350&&avgGap<=380){interval="Annual";}
      if(!interval)return;
      // Must have a charge within the last 45 days to still be "active"
      const lastDate=sorted[sorted.length-1].date;
      const daysSinceLast=Math.round((new Date()-new Date(lastDate+"T00:00:00"))/(1000*60*60*24));
      if(interval==="Monthly"&&daysSinceLast>45)return;
      if(interval==="Weekly"&&daysSinceLast>14)return;
      subs.push({name:exps[0].name,amount:avgAmt.toFixed(2),interval,occurrences:exps.length,lastDate,category:exps[0].category});
    });
    return subs.sort((a,b)=>parseFloat(b.amount)-parseFloat(a.amount));
  },[expenses]);

  const om=(t,d={})=>{setModal(t);setForm(d);setFormError("");};
  const cl=()=>{setModal(null);setForm({});setFormError("");};
  const ff=(k,v)=>{setFormError("");setForm(p=>({...p,[k]:v}));}
  const applySpend=useCallback((paidFrom,amount,creditDebtId,bankAccountId)=>{
    applySpendImpl(paidFrom,amount,creditDebtId,bankAccountId,accounts,setAccounts,setDebts);
  },[accounts]);
  const applyRefund=useCallback((paidFrom,amount,creditDebtId,bankAccountId)=>{
    applyRefundImpl(paidFrom,amount,creditDebtId,bankAccountId,accounts,setAccounts,setDebts);
  },[accounts]);
  function reversePaidBillForDelete(bill){
    if(!bill?.paid)return{reversed:false};
    const bamt=parseFloat(bill.amount)||0;
    const bpf=normalizePaidFrom(bill.paidFrom);
    const r=resolveBillSpendIds(bill,accounts,debts,settings);
    const canRefund=!!r.ok;
    if(canRefund&&bamt)applyRefund(bpf,bamt,r.cid,r.bid);
    const addBack=parseFloat(bill.loanPrincipalApplied)||0;
    if(bill.linkedDebtId&&(addBack>0||bill.loanPrevInterestAsOfDate||bill.loanPrevAccruedInterest!==undefined))setDebts(p=>p.map(d=>{
      if(String(d.id)!==String(bill.linkedDebtId))return d;
      const o={...d};
      if(addBack>0)o.balance=String(round2(parseFloat(d.balance||0)+addBack));
      if(bill.loanPrevInterestAsOfDate!=null&&bill.loanPrevInterestAsOfDate!=="")o.loanInterestAsOfDate=bill.loanPrevInterestAsOfDate;
      if(bill.loanPrevAccruedInterest!==undefined){
        const vc=parseFloat(bill.loanPrevAccruedInterest)||0;
        if(vc>0.001)o.loanAccruedInterest=String(round2(vc));
        else delete o.loanAccruedInterest;
      }
      return o;
    }));
    return{reversed:canRefund};
  }
  function saveBillEditWithBalanceAdjustment(before,u){
    const ld=u.linkedDebtId&&String(u.linkedDebtId).trim()!==""?String(u.linkedDebtId):undefined;
    const next={...before,...u,linkedDebtId:ld};
    if(!before.paid){
      setBills(p=>p.map(x=>x.id===before.id?next:x));
      showToast("✓ Bill updated");
      setEditItem(null);
      return true;
    }
    const oldPf=normalizePaidFrom(before.paidFrom);
    const newPf=normalizePaidFrom(next.paidFrom);
    const financialChanged=
      round2(parseFloat(before.amount)||0)!==round2(parseFloat(next.amount)||0)||
      oldPf!==newPf||
      String(before.creditDebtId||"")!==String(next.creditDebtId||"")||
      String(before.bankAccountId||"")!==String(next.bankAccountId||"")||
      String(before.linkedDebtId||"")!==String(next.linkedDebtId||"");
    if(before.linkedDebtId&&financialChanged){
      showToast("Mark this loan payment unpaid before changing amount, pay-from, or linked loan.","error");
      return false;
    }
    if(financialChanged){
      const oldR=resolveBillSpendIds(before,accounts,debts,settings);
      if(!oldR.ok){showToast("Can't update paid bill: original pay-from no longer resolves. Mark it unpaid or fix Accounts/Debt first.","error");return false;}
      const newR=resolveBillSpendIds(next,accounts,debts,settings);
      if(!newR.ok){showToast(newR.msg,"error");return false;}
      const oldAmt=parseFloat(before.amount)||0;
      const newAmt=parseFloat(next.amount)||0;
      if(oldAmt)applyRefund(oldPf,oldAmt,oldR.cid,oldR.bid);
      if(newAmt)applySpend(newPf,newAmt,newR.cid,newR.bid);
    }
    setBills(p=>p.map(x=>x.id===before.id?next:x));
    showToast(financialChanged?"✓ Paid bill updated — balances adjusted":"✓ Bill updated");
    setEditItem(null);
    return true;
  }
  function deleteDebtSafely(debt){
    const did=String(debt?.id);
    const cardExpenseRefs=expenses.filter(e=>String(e.creditDebtId||"")===did);
    const cardBillRefs=bills.filter(b=>String(b.creditDebtId||"")===did);
    const paidLinkedBills=bills.filter(b=>String(b.linkedDebtId||"")===did&&b.paid);
    if(cardExpenseRefs.length){
      showToast("Move or delete "+cardExpenseRefs.length+" expense"+(cardExpenseRefs.length!==1?"s":"")+" from this card before deleting it.","error");
      return false;
    }
    if(cardBillRefs.length){
      showToast("Edit or delete "+cardBillRefs.length+" bill"+(cardBillRefs.length!==1?"s":"")+" using this card before deleting it.","error");
      return false;
    }
    if(paidLinkedBills.length){
      showToast("Mark linked paid bill"+(paidLinkedBills.length!==1?"s":"")+" unpaid or delete them before deleting this loan.","error");
      return false;
    }
    setDebts(p=>p.filter(x=>String(x.id)!==did));
    setBills(p=>p.filter(x=>String(x.linkedDebtId)!==did));
    setEditItem(null);
    setConfirm(null);
    return true;
  }

  // ── THE FIX: submit function ──────────────────────────────────────────────
  function submit(){
    if(modal==="expense"){
      if(!form.name){setFormError("Please enter a name.");return;}
      if(!form.amount){setFormError("Please enter an amount.");return;}
      const amt=parseFloat(form.amount)||0;
      if(amt<=0){setFormError("Amount must be greater than $0.");return;}
      const now60=Date.now()-60000;
      const isDupe=expenses.some(e=>e.name?.toLowerCase()===form.name.toLowerCase()&&parseFloat(e.amount)===amt&&e.id>now60);
      if(isDupe&&!form.forceAdd){ff("forceAdd",true);setFormError("Already logged just now — tap Save again to add anyway.");return;}
      const _pf=normalizePaidFrom(form.paidFrom||settings.defaultExpensePaidFrom);
      const _cards=cardDebtsList(debts);
      const _ch=cashAccountsByKind(accounts,"checking");
      const _sv=cashAccountsByKind(accounts,"savings");
      const _bankCh=String(form.bankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"");
      const _bankSv=String(form.bankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"");
      let _cid="";
      if(_pf==="credit"){
        if(!_cards.length){setFormError("Add a credit card under Debt (type: Credit card), then pick which card.");return;}
        _cid=String(form.creditDebtId||"").trim()||pickDefaultCreditDebtId(settings,debts);
        if(!_cid||!_cards.some(c=>String(c.id)===String(_cid))){setFormError("Select which credit card, or set a default under Settings \u2192 Defaults.");return;}
      }
      const _expCashErr=validateCashSpendPrerequisites(_pf,form.bankAccountId,accounts,settings);
      if(_expCashErr){setFormError(_expCashErr);return;}
      let _bid="";
      if(_pf==="checking"){if(_ch.length>=2)_bid=_bankCh;else if(_ch.length===1)_bid=String(_ch[0].id);}
      else if(_pf==="savings"){if(_sv.length>=2)_bid=_bankSv;else if(_sv.length===1)_bid=String(_sv[0].id);}
      setExpenses(p=>[...p,{id:Date.now(),name:form.name,amount:String(amt),category:form.category||"Misc",date:form.date||todayStr(),notes:form.notes||"",tags:[],owner:form.owner||"shared",paidFrom:_pf,...(_cid?{creditDebtId:_cid}:{}),...(_bid?{bankAccountId:_bid}:{})}]);applySpend(_pf,amt,_cid||undefined,_bid||undefined);try{const mc=window._merchantCats||{};mc[form.name.toLowerCase().trim()]=form.category||"Misc";window._merchantCats=mc;ss("fv6:merchantCats",mc);}catch{}
      showToast("✓ "+form.name+" — "+fmt(amt));try{navigator.vibrate&&navigator.vibrate(40);}catch{}
      cl();
    }else if(modal==="bill"){
      if(!form.name){setFormError("Please enter a bill name.");return;}
      if(!form.amount){setFormError("Please enter an amount.");return;}
      const billAmt=parseFloat(form.amount)||0;
      if(billAmt<=0){setFormError("Amount must be greater than $0.");return;}
      const _bpf=normalizePaidFrom(form.paidFrom||settings.defaultBillPaidFrom);
      const _bc=cardDebtsList(debts);
      const _bch=cashAccountsByKind(accounts,"checking");
      const _bsv=cashAccountsByKind(accounts,"savings");
      const _bbankCh=String(form.bankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"");
      const _bbankSv=String(form.bankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"");
      let _bcid="";
      if(_bpf==="credit"){
        if(!_bc.length){setFormError("Add a credit card under Debt (type: Credit card), then pick which card.");return;}
        _bcid=String(form.creditDebtId||"").trim()||pickDefaultCreditDebtId(settings,debts);
        if(!_bcid||!_bc.some(c=>String(c.id)===String(_bcid))){setFormError("Select which credit card pays this bill, or set a default under Settings \u2192 Defaults.");return;}
      }
      const _billCashErr=validateCashSpendPrerequisites(_bpf,form.bankAccountId,accounts,settings);
      if(_billCashErr){setFormError(_billCashErr);return;}
      let _bbid="";
      if(_bpf==="checking"){if(_bch.length>=2)_bbid=_bbankCh;else if(_bch.length===1)_bbid=String(_bch[0].id);}
      else if(_bpf==="savings"){if(_bsv.length>=2)_bbid=_bbankSv;else if(_bsv.length===1)_bbid=String(_bsv[0].id);}
      setBills(p=>[...p,{id:Date.now(),name:form.name,amount:String(billAmt),dueDate:form.dueDate||todayStr(),recurring:form.recurring||"Monthly",paid:false,autoPay:!!form.autoPay,paidBy:form.paidBy||"me",paidFrom:_bpf,...(_bcid?{creditDebtId:_bcid}:{}),...(_bbid?{bankAccountId:_bbid}:{})}]);
      showToast("✓ "+form.name+" bill added");try{navigator.vibrate&&navigator.vibrate(40);}catch{}
      cl();
    }else if(modal==="debt"){
      if(!form.name){setFormError("Please enter a name.");return;}
      if(!form.balance){setFormError("Please enter the current balance.");return;}
      const _dk=form.debtKind==="credit_card"?"credit_card":"loan";
      const _debtId=Date.now();
      const _minP=parseFloat(form.minPayment||0);
      const _addBill=_dk==="loan"&&_minP>0&&form.addLoanBill!==false;
      if(_addBill){
        let _bpf=normalizePaidFrom(form.billPaidFrom||settings.defaultBillPaidFrom||"checking");
        if(_bpf==="credit")_bpf="checking";
        const _bch=cashAccountsByKind(accounts,"checking");
        const _bsv=cashAccountsByKind(accounts,"savings");
        const _bbankCh=String(form.billBankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"");
        const _bbankSv=String(form.billBankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"");
        const _loanModalCash=validateCashSpendPrerequisites(_bpf,form.billBankAccountId,accounts,settings);
        if(_loanModalCash){setFormError(_loanModalCash);return;}
      }
      setDebts(p=>[...p,{id:_debtId,name:form.name,balance:form.balance,original:form.original||form.balance,rate:form.rate||"",minPayment:form.minPayment||"",type:form.type||"",debtKind:_dk,color:(form.color&&isValidHexColor(form.color)?form.color.trim():DEBT_PALETTE[p.length%DEBT_PALETTE.length]),...(_dk!=="credit_card"?{loanInterestAsOfDate:todayStr()}:{})}]);
      if(_addBill){
        let _bpf=normalizePaidFrom(form.billPaidFrom||settings.defaultBillPaidFrom||"checking");
        if(_bpf==="credit")_bpf="checking";
        const _bch=cashAccountsByKind(accounts,"checking");
        const _bsv=cashAccountsByKind(accounts,"savings");
        const _bbankCh=String(form.billBankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"");
        const _bbankSv=String(form.billBankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"");
        let _bbid="";
        if(_bpf==="checking"){if(_bch.length>=2)_bbid=_bbankCh;else if(_bch.length===1)_bbid=String(_bch[0].id);}
        else if(_bpf==="savings"){if(_bsv.length>=2)_bbid=_bbankSv;else if(_bsv.length===1)_bbid=String(_bsv[0].id);}
        const _due=form.loanBillDueDate||todayStr();
        setBills(p=>[...p,{id:_debtId+1,name:(form.name||"Loan")+" payment",amount:String(_minP),dueDate:_due,recurring:"Monthly",paid:false,autoPay:false,paidBy:form.paidBy||"me",paidFrom:_bpf,linkedDebtId:String(_debtId),...(_bbid?{bankAccountId:_bbid}:{})}]);
      }
      showToast("✓ "+form.name+" tracked — "+fmt(form.balance)+(_addBill?" · monthly bill added":""));
      cl();
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const today=todayStr();
  const unread=unreadNotifs;
  const GROUPS=[
    {key:"money",label:"Money",desc:"Accounts, bills & goals",items:[{id:"accounts",icon:Wallet,label:"Accounts & Income"},{id:"debt",icon:CreditCard,label:"Debt Tracker"},{id:"savings",icon:Target,label:"Savings Goals"},{id:"paycheck",icon:DollarSign,label:"Paycheck Planner"},{id:"household",icon:Wallet,label:"Household / Shared"},{id:"recurring",icon:RefreshCw,label:"Recurring"},{id:"calendar",icon:Calendar,label:"Bill Calendar"}]},
    {key:"analytics",label:"Analytics",desc:"Insights & trends",items:[{id:"insights",icon:BarChart2,label:"Spending Insights 📊"},{id:"health",icon:Activity,label:"Health Score"},{id:"cashflow",icon:BarChart2,label:"Income vs Spending"},{id:"networthtrend",icon:TrendingUp,label:"Net Worth Trend"},{id:"trend",icon:TrendingUp,label:"Balance Trend"},{id:"subscriptions",icon:RefreshCw,label:"Subscriptions"}]},
    {key:"work",label:"Work & Reports",desc:"Shifts, trading & docs",items:[{id:"shifts",icon:Clock,label:"Shift Tracker"},...(settings.showTrading?[{id:"trading",icon:TrendingUp,label:"Trading"}]:[]),{id:"statement",icon:FileText,label:"Monthly Statement"},{id:"tax",icon:FileText,label:"Tax Summary"},{id:"physical",icon:Activity,label:"Financial Physical"}]},
    {key:"tools",label:"Tools",desc:"Search & customize",items:[{id:"search",icon:Search,label:"Search"},{id:"notifs",icon:Bell,label:"Notifications"},{id:"categories",icon:Filter,label:"Categories"},{id:"dashsettings",icon:Settings,label:"Dashboard Layout"},{id:"export",icon:Download,label:"Export Data"},{id:"import",icon:FileText,label:"Import Bank CSV"}]},
  ];
  const allTabIds=GROUPS.flatMap(g=>g.items.map(i=>i.id));
  const isMoreTab=allTabIds.includes(tab);
  // Urgent bill badge — red dot if any overdue or due today
  const billUrgent=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<=1&&dueIn(b.dueDate)>=0).length;
  const billOverdue=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0).length;
  const billNavBadge=billOverdue>0?billOverdue:billUrgent>0?billUrgent:null;
  const NAV=[
    {id:"home",icon:LayoutDashboard,label:"Home"},
    {id:"spend",icon:Wallet,label:"Spending"},
    {id:"bills",icon:CalendarClock,label:"Bills",badge:billNavBadge},
    {id:"chat",icon:MessageCircle,label:"Log"},
    {id:"more",icon:Menu,label:"More",badge:unread>0?unread:null},
  ];

  async function loadDemo(){
    const d=generateDemoData();
    const _lpd=new Date();_lpd.setDate(_lpd.getDate()-11);
    const lastPayDate=_lpd.getFullYear()+"-"+String(_lpd.getMonth()+1).padStart(2,"0")+"-"+String(_lpd.getDate()).padStart(2,"0");
    // Legacy checking/savings empty when cashAccounts drive totals (matches real multi-account users)
    setAccounts({checking:"",savings:"",cushion:"1800",credit_card:"0",investments:"8400",
      k401:"28500",roth_ira:"12000",brokerage:"8400",crypto:"1800",hsa:"3200",
      property:"0",vehicles:"12000",
      cashAccounts:[
        {id:DEMO_IDCHECK_PRIMARY,name:"Primary Checking",kind:"checking",balance:"3100"},
        {id:DEMO_IDCHECK_JOINT,name:"Joint Bills",kind:"checking",balance:"1180"},
        {id:DEMO_IDSAVINGS,name:"High-Yield Savings",kind:"savings",balance:"11400"},
      ],
    });
    // Income: biweekly RN paycheck + freelance + lastPayDate for safe-to-spend / payday UI
    setIncome({primary:"4200",other:"300",trading:"",rental:"",dividends:"",freelance:"500",
      payFrequency:"Biweekly",lastPayDate});
    // Core data (+ sync-key-aligned extras: recurrings, settlements, hhBudgets, nwGoal, rates)
    setExpenses(d.expenses);setBills(d.bills);setDebts(d.debts);setSGoals(d.savingsGoals);
    setBGoals(d.budgetGoals);setTrades(d.trades);setShifts(d.shifts);setBalHist(d.balHist);
    setRecurrings(d.recurrings||[]);setSettlements(d.settlements||[]);setHhBudgets(d.hhBudgets||[]);
    setNwGoal(d.nwGoal??null);setAccountRates(d.accountRates||{checking:0,savings:0,cushion:0,k401:0,roth_ira:0,brokerage:0,hsa:0,crypto:0});
    // Profile
    setAppName("Trackfi");setGreetName("Victor");setProfCategory("healthcare");setProfSub("nurse_rn");
    // Trading account
    setTradingAccount({deposit:"5000",balance:"5600"});
    // Merchant category map for AI auto-suggest
    try{window._merchantCats=d.merchantCats;ss("fv6:merchantCats",d.merchantCats);}catch{}
    // Household — demo shows a couple sharing expenses
    setHousehold({enabled:true,name:"Victor & Erin",members:[
      {id:"me",name:"Victor",emoji:"🧑‍💼",color:"#6366F1"},
      {id:"partner",name:"Erin",emoji:"👩",color:"#10B981"}
    ]});
    // Calendar colors
    setCalColors({expense:C.red,bill:C.amber,today:C.accent,dotStyle:"circle"});
    // Dashboard config — show everything
    setDashConfig(DEF_DASHCONFIG);
    // Settings — all product surfaces + default bank picks for multi cashAccounts
    setSettings(p=>({...p,showTrading:true,showHealth:true,showSavings:true,showForecast:true,showCrypto:true,
      defaultExpensePaidFrom:"checking",defaultBillPaidFrom:"checking",
      defaultCheckingAccountId:String(DEMO_IDCHECK_PRIMARY),defaultSavingsAccountId:String(DEMO_IDSAVINGS),
      quickActions:["expense","bill","paycheck","debt","health","budget","savings","insights"]}));
    setSubDismissed([]);
    if(import.meta.env.DEV){
      window.__trackfiDemoInfo={
        modelVersion:d.demoModelVersion,
        backupSchema:"3.1",
        includes:["cashAccounts×3","debtKind+creditDebtId","bankAccountId on spends","bill paidBy+card bills","tags","track-only spends","recurrings","settlements","hhBudgets","nwGoal","accountRates","lastPayDate"],
      };
      console.info("[Trackfi demo] model "+d.demoModelVersion+" — inspect window.__trackfiDemoInfo");
    }
    try{localStorage.setItem("fv_onboarded","1");localStorage.setItem("fv_demo","1");}catch{}
    ss("fv6:onboarded",true);
    setIsDemoMode(true);setOnboarded(true);
    setDemoBannerVisible(true);
    showToast("Sample data loaded — tap Exit demo on Home when you're done","info");
  }
  useEffect(()=>{window._loadDemo=loadDemo;return()=>{delete window._loadDemo;};},[]);
  // Dev-only: stress-test Spending + safe-to-spend with thousands of rows (console: __trackfiStress.add(5000))
  useEffect(()=>{
    if(!import.meta.env.DEV)return;
    const pad=m=>String(m).padStart(2,"0");
    window.__trackfiStress={
      add(n=2000){
        const d=new Date();
        const ms=d.getFullYear()+"-"+pad(d.getMonth()+1);
        const t0=performance.now();
        const batch=[];
        for(let i=0;i<n;i++){
          const day=1+(i%28);
          batch.push({id:"stress_"+t0+"_"+i,name:"Stress "+i,amount:String((i%250)+1),category:i%3===0?"Groceries":i%3===1?"Gas":"Misc",date:ms+"-"+pad(day),notes:"",tags:[],paidFrom:"checking",bankAccountId:String(DEMO_IDCHECK_PRIMARY)});
        }
        const t1=performance.now();
        setExpenses(p=>[...p,...batch]);
        console.info("[Trackfi stress] generated "+n+" rows in "+(t1-t0).toFixed(1)+"ms; appending to state… Open Spending → All Time, use Load more.");
      },
      clear(){setExpenses(p=>p.filter(e=>!String(e.id).startsWith("stress_")));console.info("[Trackfi stress] removed synthetic stress_* expenses");},
    };
    return()=>{try{delete window.__trackfiStress;}catch{}};
  },[]);

  async function exitDemo(){
    const uid=authSession?.user?.id;
    // Signed-in: don't clear onboarding — resetUserState() would drop fv_onboarded and show the wizard again.
    resetUserState({clearOnboarding:!uid});
    setAppName("Trackfi");
    try{delete window.__trackfiDemoInfo;}catch{}
    try{localStorage.removeItem("fv_demo");}catch{}
    if(uid&&authSession){
      await loadFromSupabase(authSession);
    }
    navTo("home");
  }
  /** Opens confirm dialog; safe for users who already have synced expenses (CTA is not limited to empty state). */
  function requestLoadDemo(){
    const hasLocalData=expenses.length>0||bills.length>0||debts.length>0||trades.length>0
      ||savingsGoals.length>0||budgetGoals.length>0
      ||Math.abs(parseFloat(accounts.checking||0))>0.009||Math.abs(parseFloat(accounts.savings||0))>0.009
      ||Math.abs(parseFloat(accounts.cushion||0))>0.009
      ||(accounts.cashAccounts||[]).some(a=>Math.abs(parseFloat(a.balance||0))>0.009);
    const signedIn=!!authSession?.user?.id;
    setConfirm({
      title:"Try sample data?",
      message:!hasLocalData
        ?"Load a full year of sample expenses, bills, and goals so you can tap through every feature. Nothing changes until you confirm."
        :signedIn
          ?"Sample data stays on this device only — it does not sync to your account. When you’re done, tap Exit demo on Home and your cloud data loads again."
          :"Loads sample data locally so you can explore. If you already entered real numbers here, export a backup under Settings → Data first, then import it later if you need to.",
      onConfirm:()=>{loadDemo();setConfirm(null);},
      danger:false
    });
  }

  function backupExport(){
    try{
      const d={
        app:"trackfi",
        exportedAt:new Date().toISOString(),
        version:"3.2",
        ...(typeof window!=="undefined"&&window.__trackfiDemoInfo?.modelVersion?{demoModelVersion:window.__trackfiDemoInfo.modelVersion}:{}),
        appName,greetName,onboarded,accounts,income,expenses,bills,debts,trades,shifts,savingsGoals,budgetGoals,
        categories,settings,calColors,dashConfig,household,recurrings,settlements,hhBudgets,nwGoal,subDismissed,
        profCategory,profSub,tradingAccount,accountRates,balHist,notifs,
        merchantCats:typeof window!=="undefined"?window._merchantCats:void 0
      };
      const b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});
      const u=URL.createObjectURL(b);
      const a=document.createElement("a");
      a.href=u;
      a.download=`${(appName||"finances").replace(/\s+/g,"-")}-backup.json`;
      a.rel="noopener";
      a.style.display="none";
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{try{URL.revokeObjectURL(u);a.remove();}catch{}},4000);
      showToast("✓ Full backup downloaded");
    }catch(e){
      console.error("Backup export failed",e);
      showToast("Backup export failed — try again after refreshing.","error");
    }
  }
  async function backupImport(file){
    try{
      const t=await file.text();
      const parsed=parseTrackfiBackupJson(t);
      if(!parsed.ok){
        showToast&&showToast("Import blocked — "+(parsed.errors?.[0]||"invalid backup file"),"error");
        return false;
      }
      const d=parsed.data;
      if(d.accounts)setAccounts(p=>({...p,...d.accounts}));
      if(d.income)setIncome(p=>({...p,...d.income}));
      if(Array.isArray(d.expenses))setExpenses(d.expenses);
      if(Array.isArray(d.bills))setBills(d.bills);
      if(Array.isArray(d.debts))setDebts(d.debts);
      if(Array.isArray(d.trades))setTrades(d.trades);
      if(Array.isArray(d.shifts))setShifts(d.shifts);
      if(Array.isArray(d.savingsGoals))setSGoals(d.savingsGoals);
      if(Array.isArray(d.budgetGoals))setBGoals(d.budgetGoals);
      if(Array.isArray(d.categories))setCats(d.categories);
      if(d.settings)setSettings(p=>({...p,...d.settings}));
      if(d.calColors)setCalColors(p=>({...p,...d.calColors}));
      if(d.dashConfig)setDashConfig(p=>({...p,...d.dashConfig}));
      if(d.household)setHousehold(p=>({...p,...d.household}));
      if(Array.isArray(d.recurrings))setRecurrings(d.recurrings);
      if(Array.isArray(d.settlements))setSettlements(d.settlements);
      if(Array.isArray(d.hhBudgets))setHhBudgets(d.hhBudgets);
      if(d.nwGoal!==undefined)setNwGoal(d.nwGoal);
      if(Array.isArray(d.subDismissed))setSubDismissed(d.subDismissed);
      if(d.profCategory)setProfCategory(d.profCategory);
      if(d.profSub)setProfSub(d.profSub);
      if(d.tradingAccount)setTradingAccount(p=>({...p,...d.tradingAccount}));
      if(d.accountRates)setAccountRates(p=>({...p,...d.accountRates}));
      if(Array.isArray(d.balHist))setBalHist(d.balHist);
      if(Array.isArray(d.notifs))setNotifs(d.notifs);
      if(d.appName)setAppName(d.appName);
      if(d.greetName!==undefined)setGreetName(d.greetName);
      if(d.onboarded===true){try{localStorage.setItem("fv_onboarded","1");}catch{}setOnboarded(true);ss("fv6:onboarded",true);}
      else if(d.onboarded===false){try{localStorage.removeItem("fv_onboarded");}catch{}setOnboarded(false);ss("fv6:onboarded",false);}
      if(d.merchantCats)try{window._merchantCats=d.merchantCats;ss("fv6:merchantCats",d.merchantCats);}catch{}
      showToast&&showToast(isTrackfiDemoMode()?"✅ Backup imported (on this device — sample mode doesn\u2019t sync to the cloud).":"✅ Backup validated and imported — saving to your account\u2026");
      if(parsed.warnings?.length)console.warn("[Trackfi] Backup import warnings:",parsed.warnings);
      return true;
    }catch(e){showToast&&showToast("Import failed — "+(e?.message||"try another backup file"),"error");return false;}
  }
  async function handleResetAllData(){
    const syncOut=await flushPendingSync();
    if(authSession?.user?.id&&(syncOut?.error||syncOut?.conflict||syncOut?.skipped)){
      showToast("Reset paused — export a backup or try again online after sync finishes.","error");
      return false;
    }
    const uid=_getUserId();
    if(uid){
      const out=await supaFetch(`/rest/v1/user_data?user_id=eq.${encodeURIComponent(uid)}`,{method:"DELETE"});
      if(out?.error){
        showToast("Reset paused — cloud data could not be deleted. Try again while online.","error");
        return false;
      }
    }
    resetUserState();
    setOnboarded(false);
    try{localStorage.removeItem("fv_onboarded");}catch{}
    setSyncRecoverableError(false);
    setStorageQuotaBlocked(false);
    resetLocalStorageQuotaWarned();
    showToast("All data cleared","error");
    return true;
  }

  if(authLoading)return(<div className="fv-auth-shell"><style>{CSS}</style><div style={{textAlign:"center"}}><div style={{fontFamily:MF,fontSize:28,fontWeight:900,color:"#fff",marginBottom:8}}>Trackfi</div><div style={{fontSize:13,color:"rgba(255,255,255,.5)"}}>Loading...</div></div></div>);

  // Password reset flow — show set-new-password screen
  if(pwResetMode&&authSession){return(
    <div className="fv-auth-shell">
      <style>{CSS}</style>
      <div style={{background:"rgba(255,255,255,.97)",borderRadius:24,width:"100%",maxWidth:400,padding:"32px 28px",boxShadow:"0 32px 80px rgba(0,0,0,.3)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{width:56,height:56,borderRadius:14,background:C.accentBg,border:`1px solid ${C.accentMid}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><Lock size={28} color={C.accent} strokeWidth={1.75}/></div>
          <div style={{fontFamily:MF,fontSize:22,fontWeight:900,color:C.navy,marginBottom:4}}>Set New Password</div>
          <div style={{fontSize:13,color:C.textLight}}>Choose something strong</div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>New Password</div>
          <input type="password" value={newPw} onChange={e=>{setNewPw(e.target.value);setPwMsg("");}} placeholder="Min. 6 characters"
            style={{width:"100%",background:"#f8f9fc",border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px 14px",fontSize:15,color:C.text,outline:"none",boxSizing:"border-box"}}/>
        </div>
        {pwMsg&&<div style={{background:pwMsg.includes("✓")?C.greenBg:C.redBg,border:`1px solid ${pwMsg.includes("✓")?C.greenMid:C.redMid}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:pwMsg.includes("✓")?C.green:C.red,marginBottom:14}}>{pwMsg}</div>}
        <button onClick={async()=>{
          if(newPw.length<6){setPwMsg("Password must be at least 6 characters.");return;}
          setPwLoading(true);
          try{
            const r=await supaFetch("/auth/v1/user",{method:"PUT",body:JSON.stringify({password:newPw})});
            if(r.error){setPwMsg("Failed — try again.");setPwLoading(false);return;}
            localStorage.removeItem("fv_pw_reset");
            setPwResetMode(false);
            setPwMsg("✓ Password updated! Signing you in...");
            setTimeout(()=>handleAuth(authSession),1200);
          }catch{setPwMsg("Network error — try again.");setPwLoading(false);}
        }} type="button" className="fv-btn-primary ba" style={{justifyContent:"center",fontFamily:MF}} disabled={pwLoading||newPw.length<6}>
          {pwLoading?"Updating...":"Set new password"}
        </button>
      </div>
    </div>
  );}
  if(sessionExpired&&!authSession&&!skipAuth){
    return(
      <div className="fv-auth-shell">
        <style>{CSS}</style>
        <div style={{background:C.surface,borderRadius:20,padding:28,maxWidth:340,width:"100%",boxShadow:"0 24px 64px rgba(10,22,40,.25)",textAlign:"center"}}>
          <div style={{width:48,height:48,borderRadius:12,background:C.surfaceAlt,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><Lock size={24} color={C.textMid} strokeWidth={1.75}/></div>
          <div style={{fontFamily:MF,fontSize:17,fontWeight:800,color:C.text,marginBottom:8}}>Session expired</div>
          <div style={{fontSize:13,color:C.textMid,marginBottom:22,lineHeight:1.5}}>Sign in again to sync across devices. Your data on this device is still here.</div>
          <button type="button" className="fv-btn-primary ba" onClick={()=>setSessionExpired(false)} style={{justifyContent:"center",marginBottom:10,fontFamily:MF}}>
            Sign in again
          </button>
          <button type="button" onClick={()=>{setSessionExpired(false);handleSkip();}} style={{width:"100%",padding:"10px",borderRadius:12,border:`1px solid ${C.border}`,background:"none",color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer"}}>
            Continue without account
          </button>
        </div>
      </div>
    );
  }
  if(!authSession&&!skipAuth)return <AuthScreen onAuth={handleAuth} onSkip={handleSkip} onTryDemo={handleTryDemoFresh}/>;
  if(!ready)return(<div className="fv-auth-shell"><style>{CSS}</style><div style={{textAlign:"center"}}><div style={{fontFamily:MF,fontSize:28,fontWeight:900,color:"#fff",marginBottom:20}}>Trackfi</div><div style={{width:36,height:36,border:"3px solid rgba(255,255,255,.2)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 14px"}}/><div style={{fontSize:13,color:"rgba(255,255,255,.5)"}}>Loading your data...</div></div></div>);
  if(!onboarded&&ready)return(<><style>{CSS}</style><OnboardingWizard onComplete={applyOnboardingComplete} onTryDemo={()=>{loadDemo();}}/></>);
  if(locked&&pinEnabled)return(<><style>{CSS}</style><PINLock onUnlock={()=>setLocked(false)} appName={appName} darkMode={darkMode}/></>);

  return(
    <TrackfiRechartsProvider mod={rechartsMod} failed={rechartsLoadFailed} dark={darkMode}>
    <div style={{flex:1,minHeight:0,width:"100%",maxWidth:640,margin:"0 auto",background:darkMode?C.navy:C.bg,fontFamily:IF,display:"flex",flexDirection:"column",position:"relative",overflow:"hidden",boxSizing:"border-box",height:"100%",maxHeight:"100dvh"}}>
      <style>{CSS}</style>
      <div id="fv-scroll" style={{flex:1,minHeight:0,minWidth:0,width:"100%",overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch",padding:"max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-left)) max(110px, calc(88px + env(safe-area-inset-bottom))) max(16px, env(safe-area-inset-right))",boxSizing:"border-box"}}>
        {!isOnline&&<div role="status" style={{position:"sticky",top:0,zIndex:35,marginBottom:12,background:"#1e293b",color:"#f1f5f9",fontSize:12,fontWeight:600,textAlign:"center",padding:"10px 12px",borderRadius:10,letterSpacing:.2,lineHeight:1.35}}>{authSession?.user?.id&&isSupabaseConfigured()?"📡 No internet — edits stay on this device and sync when you’re back online.":skipAuth?"📡 No internet — you can keep editing; everything stays in this browser.":"📡 No internet — you can keep editing on this device."}</div>}
        {pwaUpdateReady&&<div role="status" style={{position:"sticky",top:0,zIndex:35,marginBottom:12,background:C.accent,border:`1px solid ${C.accentMid}`,color:"#fff",fontSize:12,fontWeight:600,textAlign:"center",padding:"10px 12px",borderRadius:10,letterSpacing:.2,lineHeight:1.35,display:"flex",alignItems:"center",justifyContent:"center",gap:10,flexWrap:"wrap"}}><span>New version available — reload to get the latest fixes.</span><button type="button" className="ba" onClick={async()=>{try{const reg=await navigator.serviceWorker?.getRegistration?.();if(reg?.waiting){navigator.serviceWorker.addEventListener("controllerchange",()=>window.location.reload(),{once:true});reg.waiting.postMessage({type:"SKIP_WAITING"});setTimeout(()=>window.location.reload(),1500);return;}navigator.serviceWorker?.controller?.postMessage({type:"SKIP_WAITING"});}catch{}window.location.reload();}} style={{background:"rgba(255,255,255,.22)",border:"1px solid rgba(255,255,255,.35)",borderRadius:8,padding:"4px 12px",color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer"}}>Reload</button><button type="button" className="ba" onClick={()=>setPwaUpdateReady(false)} style={{background:"transparent",border:"1px solid rgba(255,255,255,.35)",borderRadius:8,padding:"4px 10px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Later</button></div>}
        {storageQuotaBlocked&&<div role="alert" style={{position:"sticky",top:0,zIndex:35,marginBottom:12,background:C.amber,border:`1px solid ${C.amberMid}`,color:"#78350f",fontSize:12,fontWeight:600,textAlign:"center",padding:"10px 12px",borderRadius:10,letterSpacing:.2,lineHeight:1.35,display:"flex",alignItems:"center",justifyContent:"center",gap:10,flexWrap:"wrap"}}><span>Storage full — this browser can’t save more data. Export a backup, then free space or clear old data.</span><button type="button" className="ba" onClick={()=>navTo("export")} style={{background:"rgba(255,255,255,.35)",border:"1px solid rgba(120,53,15,.25)",borderRadius:8,padding:"4px 12px",color:"#451a03",fontSize:12,fontWeight:700,cursor:"pointer"}}>Export</button><button type="button" className="ba" onClick={()=>{setStorageQuotaBlocked(false);resetLocalStorageQuotaWarned();}} style={{background:"transparent",border:"1px solid rgba(120,53,15,.35)",borderRadius:8,padding:"4px 12px",color:"#451a03",fontSize:12,fontWeight:700,cursor:"pointer"}}>Dismiss</button></div>}
        {syncRecoverableError&&isOnline&&authSession?.user?.id&&isSupabaseConfigured()&&<div role="alert" style={{position:"sticky",top:0,zIndex:35,marginBottom:12,background:C.red,border:`1px solid ${C.redMid}`,color:"#fff",fontSize:12,fontWeight:600,textAlign:"center",padding:"10px 12px",borderRadius:10,letterSpacing:.2,lineHeight:1.35,display:"flex",alignItems:"center",justifyContent:"center",gap:10,flexWrap:"wrap"}}><span>Couldn’t refresh data from the cloud. You’re still using what’s on this device.</span><button type="button" className="ba" onClick={()=>{void loadFromSupabase(authSession);}} style={{background:"rgba(255,255,255,.2)",border:"1px solid rgba(255,255,255,.35)",borderRadius:8,padding:"4px 12px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Try again</button></div>}
        {["spend","home","bills"].includes(tab)&&<button className="ba" type="button" aria-label={tab==="bills"?"Add bill":"Log expense"} onClick={()=>tab==="bills"?om("bill"):om("expense")} style={{position:"fixed",right:"max(16px, env(safe-area-inset-right))",bottom:"max(90px, calc(78px + env(safe-area-inset-bottom)))",width:52,height:52,borderRadius:"50%",background:C.accent,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 14px rgba(79,70,229,.35), 0 2px 6px rgba(15,23,42,.12)",zIndex:50}}><Plus size={22} color="#fff" strokeWidth={2.25}/></button>}
        {canGoBack&&tab!=="home"&&<div style={{marginBottom:12}}><button className="ba" onClick={goBack} style={{display:"flex",alignItems:"center",gap:5,background:"transparent",border:"none",cursor:"pointer",color:C.accent,fontWeight:700,fontSize:16,padding:"4px 0"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>Back</button></div>}

        {tab==="home"&&(
          <div className="fu">

            {/* ── 1. HEADER ─────────────────────────────────────── */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{fontFamily:MF,fontSize:22,fontWeight:800,color:C.text,letterSpacing:-.3}}>
                  {new Date().getHours()<12?"Good morning":new Date().getHours()<17?"Good afternoon":"Good evening"}{greetName?" "+greetName.split(" ")[0]:""}
                </div>
                <div style={{fontSize:12,color:C.textLight,marginTop:2}}>
                  {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
                  {profSub?` · ${getProfSub(profCategory,profSub).label}`:""}
                </div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {(()=>{
                  const sr2=totalIncome>0?Math.max(0,(totalIncome-thisMonthExp)/totalIncome*100):0;
                  const _liq2=totalSavingsBalance(accounts)+parseFloat(accounts.cushion||0);
                  const _ef2=totalIncome>0?_liq2/totalIncome:0;
                  const sc=Math.round(Math.min(10,Math.max(1,((sr2>20?100:sr2>10?75:sr2>5?50:25)*.25+(_ef2>=3?100:_ef2>=1?70:40))*.2+(totalDebt===0?100:Math.max(20,100-Math.round(totalDebt/Math.max(1,totalIncome)*100)))*.2+100*.35)/10));
                  const col=sc>=8?C.green:sc>=6?C.accent:sc>=4?C.amber:C.red;
                  return(<button onClick={()=>navTo("health")} style={{background:col+"18",border:`1px solid ${col}44`,borderRadius:99,padding:"5px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                    <div style={{fontFamily:MF,fontWeight:800,fontSize:12,color:col}}>{sc}/10</div>
                    <div style={{fontSize:10,color:col}}>health</div>
                  </button>);
                })()}
                {syncing&&<div style={{width:7,height:7,borderRadius:"50%",background:C.accent,flexShrink:0,animation:"pulse 1.2s ease-in-out infinite"}} title="Syncing..."/>}
                <button type="button" className="ba" aria-label={darkMode?"Switch to light mode":"Switch to dark mode"} aria-pressed={darkMode} onClick={()=>setDarkMode(d=>{const n=!d;setSettings(s=>({...s,darkMode:n}));return n;})} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"7px 9px",cursor:"pointer",display:"flex",color:C.textMid}}>{darkMode?<Sun size={15}/>:<Moon size={15}/>}</button>
                <button type="button" className="ba" aria-label={hidden?"Show balances":"Hide balances"} aria-pressed={hidden} onClick={()=>setHidden(h=>!h)} style={{background:hidden?C.accentBg:C.bg,border:`1px solid ${hidden?C.accentMid:C.border}`,borderRadius:10,padding:"7px 9px",cursor:"pointer",display:"flex",color:hidden?C.accent:C.textMid}}>{hidden?<EyeOff size={15}/>:<Eye size={15}/>}</button>
              </div>
            </div>

            {isDemoMode&&expenses.length>0&&(
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,width:"fit-content"}}>
                {demoBannerVisible&&(
                  <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(217,119,6,.08)",border:"1px solid rgba(217,119,6,.2)",borderRadius:99,padding:"4px 10px 4px 8px",animation:"fadeIn .3s ease"}}>
                    <Sparkles size={11} color={C.amber} strokeWidth={2.25}/>
                    <span style={{fontSize:9,fontWeight:600,color:C.amber,letterSpacing:.1}}>Demo mode</span>
                    <button onClick={()=>setDemoBannerVisible(false)}
                      style={{background:"none",border:"none",cursor:"pointer",color:C.amber,padding:"0 2px",fontSize:10,lineHeight:1,opacity:.6,marginLeft:2}}>×</button>
                  </div>
                )}
                <button onClick={()=>setConfirm({title:"Exit Demo",message:authSession?.user?.id?"Exit demo and restore your synced data from the cloud.":"Clear all demo data and start fresh.",onConfirm:()=>{exitDemo();setConfirm(null);},danger:false})}
                  style={{background:"rgba(217,119,6,.12)",border:"1px solid rgba(217,119,6,.2)",borderRadius:99,padding:"2px 10px",color:C.amber,fontWeight:700,fontSize:9,cursor:"pointer",lineHeight:1.6}}>
                  Exit Demo
                </button>
              </div>
            )}
            {!isDemoMode&&(
              <div style={{marginBottom:14,textAlign:"center"}}>
                <button type="button" className="ba" onClick={requestLoadDemo}
                  style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:99,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:C.textMid}}>
                  <Sparkles size={14} color={C.accent} strokeWidth={2}/>
                  Try sample data
                </button>
                <div style={{fontSize:10,color:C.textFaint,marginTop:6,lineHeight:1.4}}>Explore the app with a full year of demo transactions</div>
              </div>
            )}

            {overdue.length>0&&<div onClick={()=>navTo("bills")} style={{background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"10px 14px",marginBottom:10,display:"flex",gap:8,alignItems:"center",cursor:"pointer"}}><AlertCircle size={15} color={C.red} style={{flexShrink:0}}/><div style={{flex:1,fontSize:13,color:C.red,fontWeight:600}}>{overdue.length} bill{overdue.length!==1?"s":""} overdue — tap to resolve</div><ChevronRight size={13} color={C.red}/></div>}

            {ready&&paycheckNudge.show&&paycheckNudge.due&&(
              <div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:12,padding:"10px 14px",marginBottom:10,display:"flex",flexWrap:"wrap",gap:10,alignItems:"center"}}>
                <div style={{flex:"1 1 220px",fontSize:13,color:C.text,fontWeight:600,lineHeight:1.45}}>
                  Paycheck for <strong>{fmtDate(paycheckNudge.due)}</strong> — record your deposit so checking and safe-to-spend stay accurate.
                </div>
                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  <button type="button" className="ba" onClick={()=>setPaycheckDepCtx({dueDate:paycheckNudge.due})} style={{background:C.green,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>Record deposit</button>
                  <button type="button" className="ba" onClick={()=>setSettings(s=>({...s,paycheckNudgeLastHandledPeriod:paycheckNudge.due}))} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 12px",color:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer"}}>Not now</button>
                </div>
              </div>
            )}

            {/* ── 2. CAROUSEL — 4 rich cards ─────────────────────── */}
            {(()=>{
              const now_c=new Date();
              const ms_c=now_c.getFullYear()+"-"+String(now_c.getMonth()+1).padStart(2,"0");
              const lastMs_c=new Date(now_c.getFullYear(),now_c.getMonth()-1,1).getFullYear()+"-"+String(new Date(now_c.getFullYear(),now_c.getMonth()-1,1).getMonth()+1).padStart(2,"0");
              const mtdSpend_c=expenses.filter(e=>e.date?.startsWith(ms_c)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const lastSpend_c=expenses.filter(e=>e.date?.startsWith(lastMs_c)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const momDiff_c=lastSpend_c>0?((mtdSpend_c-lastSpend_c)/lastSpend_c*100):null;
              const dom_c=now_c.getDate(),dim_c=new Date(now_c.getFullYear(),now_c.getMonth()+1,0).getDate();
              const forecast_c=dom_c>0?mtdSpend_c+(mtdSpend_c/dom_c)*(dim_c-dom_c):0;
              const cats_c=Object.entries(expenses.filter(e=>e.date?.startsWith(ms_c)).reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{})).sort((a,b)=>b[1]-a[1]);
              const bars_c=Array.from({length:6},(_,i)=>{const d=new Date(now_c.getFullYear(),now_c.getMonth()-5+i,1);const ms2=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");return{m:FULL_MOS[d.getMonth()].slice(0,3),v:expenses.filter(e=>e.date?.startsWith(ms2)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0),cur:i===5};});
              const maxB_c=Math.max(...bars_c.map(b=>b.v),1);
              const overBudget_c=budgetGoals.filter(g=>{const sp=expenses.filter(e=>e.category===g.category&&e.date?.startsWith(ms_c)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);return sp>parseFloat(g.limit||0);});
              const nw_c=totalAssets-totalDebt;
              const prevNW_c=balHist.length>1?(()=>{const p=balHist[balHist.length-2];return(p.checking||0)+(p.savings||0)+(p.cushion||0)+(p.investments||0)-totalDebt;})():null;
              const nwDelta_c=prevNW_c!==null?nw_c-prevNW_c:null;
              const goalsDone_c=savingsGoals.filter(g=>parseFloat(g.saved||0)>=parseFloat(g.target||1)).length;
              const goalsTotal_c=savingsGoals.reduce((s,g)=>s+(parseFloat(g.target||0)),0);
              const goalsSaved_c=savingsGoals.reduce((s,g)=>s+(parseFloat(g.saved||0)),0);
              const goalsPct_c=goalsTotal_c>0?Math.min(100,(goalsSaved_c/goalsTotal_c)*100):0;
              const debtPct_c=debts.length?Math.min(100,(debts.reduce((s,d)=>s+(parseFloat(d.original||d.balance||0)-parseFloat(d.balance||0)),0)/Math.max(1,debts.reduce((s,d)=>s+(parseFloat(d.original||d.balance||0)),0)))*100):0;

              const CARDS=[
                // ── CARD 1: THIS MONTH ──────────────────────────
                {id:"month",render:()=>(
                  <div onClick={()=>navTo("cashflow")} className="fv-hero-panel ba" style={{padding:"20px 18px",cursor:"pointer",marginBottom:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                      <div>
                        <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>THIS MONTH</div>
                        <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontSize:38,fontWeight:900,color:"#fff",lineHeight:1,letterSpacing:-1}}>{fmt(mtdSpend_c)}</div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4,flexWrap:"wrap"}}><span style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>Day {dom_c}/{dim_c} · est {hidden?"***":fmt(forecast_c)}</span>{momDiff_c!==null&&<span style={{fontSize:11,fontWeight:700,color:momDiff_c<=0?C.greenMid:"#fca5a5",background:"rgba(255,255,255,.08)",borderRadius:99,padding:"1px 7px"}}>{momDiff_c>0?"+":""}{momDiff_c.toFixed(0)}% vs last mo</span>}{overBudget_c.length>0&&<span style={{fontSize:11,fontWeight:700,color:"#fca5a5",background:"rgba(239,68,68,.2)",borderRadius:99,padding:"1px 7px"}}>{overBudget_c.length} over budget</span>}</div>
                      </div>
                      <div style={{background:mtdSpend_c<totalIncome*(dom_c/dim_c)*1.05?C.green+"33":"rgba(239,68,68,.25)",borderRadius:99,padding:"4px 10px"}}>
                        <div style={{fontSize:11,fontWeight:700,color:mtdSpend_c<totalIncome*(dom_c/dim_c)*1.05?C.greenMid:"#fca5a5"}}>{mtdSpend_c<totalIncome*(dom_c/dim_c)*1.05?"✓ On track":"⚠ Over pace"}</div>
                      </div>
                    </div>
                    {totalIncome>0&&<><div style={{height:4,background:"rgba(255,255,255,.1)",borderRadius:99,overflow:"hidden",marginBottom:10}}>
                      <div style={{height:"100%",width:Math.min(100,totalIncome>0?(mtdSpend_c/totalIncome)*100:0).toFixed(1)+"%",background:mtdSpend_c>totalIncome*0.9?C.red:mtdSpend_c>totalIncome*0.7?C.amber:C.green,borderRadius:99}}/>
                    </div></>}
                    {bars_c.some(b=>b.v>0)&&<div style={{display:"flex",gap:3,alignItems:"flex-end",height:36,marginBottom:12}}>
                      {bars_c.map((b,i)=>{const h=Math.max(3,Math.round((b.v/maxB_c)*32));return(
                        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                          <div style={{width:"100%",height:h,background:b.cur?"#fff":"rgba(255,255,255,.2)",borderRadius:"2px 2px 0 0"}}/>
                          <div style={{fontSize:8,color:b.cur?"rgba(255,255,255,.9)":"rgba(255,255,255,.3)",fontWeight:b.cur?700:400}}>{b.m}</div>
                        </div>
                      );})}
                    </div>}
                    <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                      {savingsRate>0&&<div style={{background:savingsRate>=20?"rgba(52,211,153,.2)":"rgba(255,255,255,.08)",borderRadius:8,padding:"4px 9px",display:"flex",gap:4,alignItems:"center"}}>
                        <span style={{fontSize:11,color:savingsRate>=20?C.greenMid:"rgba(255,255,255,.5)"}}>💾 {savingsRate.toFixed(0)}% saved</span>
                      </div>}
                      {cats_c.slice(0,2).map(([cat,amt],i)=><div key={cat} style={{background:"rgba(255,255,255,.1)",borderRadius:8,padding:"4px 9px",display:"flex",gap:5,alignItems:"center"}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:PIE_COLORS[i]}}/>
                        <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>{cat}</span>
                        <span className={hidden?"blurred":"unblurred"} style={{fontSize:11,fontFamily:MF,fontWeight:700,color:"#fff"}}>{fmt(amt)}</span>
                      </div>)}
                    </div>
                  </div>
                )},
                // ── CARD 2: NET WORTH ────────────────────────────
                {id:"networth",render:()=>(
                  <div onClick={()=>navTo("networthtrend")} className="fv-hero-panel ba" style={{padding:"20px 18px",cursor:"pointer",marginBottom:0}}>
                    <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>NET WORTH</div>
                    <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontSize:38,fontWeight:900,color:nw_c>=0?C.greenMid:"#fca5a5",lineHeight:1,letterSpacing:-1,marginBottom:4}}>{fmt(nw_c)}</div>
                    {nwDelta_c!==null&&<div style={{fontSize:12,fontWeight:700,color:nwDelta_c>=0?C.greenMid:"#fca5a5",marginBottom:14}}>{nwDelta_c>=0?"▲":"▼"} {hidden?"***":fmt(Math.abs(nwDelta_c))} since last snapshot</div>}
                    {!nwDelta_c&&<div style={{marginBottom:14}}/>}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                      {[["Assets",fmt(totalAssets),C.greenMid],["Debts",fmt(totalDebt),"#fca5a5"],["Liquid",fmt(totalCheckingBalance(accounts)+totalSavingsBalance(accounts)+(parseFloat(accounts.cushion||0))),C.accentMid],["Retirement",fmt((parseFloat(accounts.k401||0))+(parseFloat(accounts.roth_ira||0))+(parseFloat(accounts.hsa||0))),C.teal]].map(([l,v,c])=>(
                        <div key={l} style={{background:"rgba(255,255,255,.07)",borderRadius:10,padding:"8px 10px"}}>
                          <div style={{fontSize:9,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l}</div>
                          <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontWeight:700,fontSize:13,color:c}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {balHist.length>3&&(()=>{const last6=balHist.slice(-6);const maxV=Math.max(...last6.map(h=>(h.checking||0)+(h.savings||0)+(h.cushion||0)+(h.investments||0)+(h.k401||0)+(h.roth_ira||0)+(h.brokerage||0)+(h.crypto||0)),1);return(<div style={{display:"flex",gap:3,alignItems:"flex-end",height:28}}>
                      {last6.map((h,i)=>{const v=(h.checking||0)+(h.savings||0)+(h.cushion||0)+(h.investments||0)+(h.k401||0)+(h.roth_ira||0)+(h.brokerage||0)+(h.crypto||0);const hh=Math.max(3,Math.round((v/maxV)*24));const isLast=i===last6.length-1;return(<div key={i} style={{flex:1,height:hh,background:isLast?"#fff":"rgba(255,255,255,.25)",borderRadius:"2px 2px 0 0"}}/>);})}
                    </div>);})()}
                  </div>
                )},
                // ── CARD 3: MONEY FLOW ───────────────────────────
                {id:"flow",render:()=>(
                  <div onClick={()=>navTo("paycheck")} className="fv-hero-panel ba" style={{padding:"20px 18px",cursor:"pointer",marginBottom:0}}>
                    <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>MONEY FLOW</div>
                    <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontSize:38,fontWeight:900,color:cashflow>=0?C.greenMid:"#fca5a5",lineHeight:1,letterSpacing:-1,marginBottom:4}}>{cashflow>=0?"+":""}{fmt(cashflow)}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginBottom:14}}>{payFreq==="Biweekly"?"biweekly":"per "+payFreq.toLowerCase()} paycheck · {savingsRate.toFixed(1)}% saved</div>
                    {[["Income/pay",fmt(payPerPeriod),C.greenMid,100],["This Month",fmt(thisMonthExp),C.redMid,totalIncome>0?Math.min(100,(thisMonthExp/totalIncome)*100):0],["Bills",fmt(bills.filter(b=>!b.paid).reduce((s,b)=>s+(parseFloat(b.amount)||0),0)),"rgba(255,255,255,.6)",totalIncome>0?Math.min(100,(bills.filter(b=>!b.paid).reduce((s,b)=>s+(parseFloat(b.amount)||0),0)/totalIncome)*100):0],["Debt Min",fmt(debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0)),"rgba(255,255,255,.4)",totalIncome>0?Math.min(100,(debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0)/totalIncome)*100):0]].map(([l,v,c,pct])=>(
                      <div key={l} style={{marginBottom:7}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                          <span style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>{l}</span>
                          <span className={hidden?"blurred":"unblurred"} style={{fontSize:11,fontFamily:MF,fontWeight:700,color:c}}>{v}</span>
                        </div>
                        <div style={{height:3,background:"rgba(255,255,255,.1)",borderRadius:99}}><div style={{height:"100%",width:pct.toFixed(1)+"%",background:c,borderRadius:99}}/></div>
                      </div>
                    ))}
                  </div>
                )},
                // ── CARD 4: GOALS & DEBT ─────────────────────────
                {id:"goals",render:()=>(
                  <div className="fv-hero-panel" style={{padding:"20px 18px",marginBottom:0}}>
                    <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>GOALS & DEBT</div>
                    {savingsGoals.length>0&&<div style={{marginBottom:16}} onClick={()=>navTo("savings")}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                        <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,.8)"}}>Savings Goals</div>
                        <div className={hidden?"blurred":"unblurred"} style={{fontSize:12,color:C.greenMid,fontWeight:700}}>{goalsDone_c}/{savingsGoals.length} done</div>
                      </div>
                      <div style={{height:6,background:"rgba(255,255,255,.1)",borderRadius:99,overflow:"hidden",marginBottom:4}}>
                        <div style={{height:"100%",width:goalsPct_c.toFixed(1)+"%",background:C.positiveMid,borderRadius:99}}/>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <div className={hidden?"blurred":"unblurred"} style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{fmt(goalsSaved_c)} saved</div>
                        <div className={hidden?"blurred":"unblurred"} style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{fmt(goalsTotal_c)} total</div>
                      </div>
                    </div>}
                    {debts.length>0&&<div onClick={()=>navTo("debt")}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                        <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,.8)"}}>Debt Payoff</div>
                        <div className={hidden?"blurred":"unblurred"} style={{fontSize:12,color:"#fca5a5",fontWeight:700}}>{fmt(totalDebt)} left</div>
                      </div>
                      <div style={{height:6,background:"rgba(255,255,255,.1)",borderRadius:99,overflow:"hidden",marginBottom:4}}>
                        <div style={{height:"100%",width:debtPct_c.toFixed(1)+"%",background:C.amberMid,borderRadius:99}}/>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <div className={hidden?"blurred":"unblurred"} style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{debtPct_c.toFixed(0)}% paid off</div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{fmt(debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0))}/mo min</div>
                      </div>
                    </div>}
                    {savingsGoals.length===0&&debts.length===0&&<div style={{textAlign:"center",padding:"20px 0"}}>
                      <div style={{fontSize:13,color:"rgba(255,255,255,.4)",marginBottom:12}}>No goals or debts tracked yet</div>
                      <button onClick={()=>navTo("savings")} style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:10,padding:"8px 16px",color:"rgba(255,255,255,.7)",fontSize:12,fontWeight:600,cursor:"pointer"}}>Add a Goal →</button>
                    </div>}
                  </div>
                )},
              ];

              const goNext=()=>setHeroIdx(i=>(i+1)%CARDS.length);
              const goPrev=()=>setHeroIdx(i=>(i-1+CARDS.length)%CARDS.length);

              return(
                <div style={{marginBottom:14}}>
                  <div style={{position:"relative"}}>
                    <div
                      onTouchStart={e=>{window._hts=e.touches[0].clientX;window._htsy=e.touches[0].clientY;}}
                      onTouchEnd={e=>{const dx=window._hts-(e.changedTouches[0].clientX||0);const dy=Math.abs((window._htsy||0)-e.changedTouches[0].clientY);if(dy>30)return;if(dx>40)goNext();else if(dx<-40)goPrev();}}>
                      {CARDS[heroIdx].render()}
                    </div>
                    <button onClick={e=>{e.stopPropagation();goPrev();}} style={{position:"absolute",left:-8,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",zIndex:10}}>‹</button>
                    <button onClick={e=>{e.stopPropagation();goNext();}} style={{position:"absolute",right:-8,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",zIndex:10}}>›</button>
                  </div>
                  <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:6,marginTop:10}}>
                    {CARDS.map((card,i)=><button key={i} onClick={()=>setHeroIdx(i)} style={{background:"none",border:"none",cursor:"pointer",padding:"2px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                      <div style={{width:i===heroIdx?20:6,height:6,borderRadius:99,background:i===heroIdx?C.accent:C.border,transition:"all .3s"}}/>
                      {i===heroIdx&&<div style={{fontSize:9,color:C.accent,fontWeight:700,letterSpacing:.5,textTransform:"uppercase"}}>{card.id==="month"?"This Month":card.id==="networth"?"Net Worth":card.id==="flow"?"Cash Flow":"Goals"}</div>}
                    </button>)}
                  </div>
                </div>
              );
            })()}

            {/* ── 3. QUICK PULSE — 4 stats at a glance ──────────── */}
            {dashConfig.showMetrics!==false&&(()=>{
              const now_p=new Date();
              const _todayLocal=now_p.getFullYear()+"-"+String(now_p.getMonth()+1).padStart(2,"0")+"-"+String(now_p.getDate()).padStart(2,"0");
              const todayAmt=expenses.filter(e=>e.date===_todayLocal).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const nextBill=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0).sort((a,b2)=>dueIn(a.dueDate)-dueIn(b2.dueDate))[0];
              const subCount=detectedSubs?.filter(s=>s.interval==="Monthly").length||0;
              const subTotal=detectedSubs?.filter(s=>s.interval==="Monthly").reduce((s,x)=>s+(parseFloat(x.amount)||0),0)||0;
              const pulseItems=[
                {label:"Today",val:todayAmt>0?fmt(todayAmt):"—",color:todayAmt>0?C.red:C.textFaint,sub:todayAmt>0?expenses.filter(e=>e.date===_todayLocal).length+" items":"nothing yet",tap:()=>navTo("calendar")},
                {label:"Safe to Spend",val:fmt(sts),color:sts>500?C.green:sts>0?C.amber:C.red,sub:"until next pay",tap:()=>navTo("paycheck")},
                {label:"Next Bill",val:nextBill?fmt(nextBill.amount):"—",color:nextBill&&dueIn(nextBill.dueDate)<=3?C.red:C.amber,sub:nextBill?nextBill.name+" · "+dueIn(nextBill.dueDate)+"d":"all clear",tap:()=>navTo("bills")},
                {label:"Subscriptions",val:subCount>0?fmt(subTotal)+"/mo":"—",color:C.textMid,sub:subCount>0?subCount+" detected":"none found",tap:()=>navTo("subscriptions")},
              ];
              return(<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:14}}>
                {pulseItems.map(p=>(
                  <div key={p.label} onClick={p.tap} className="fv-card ba" style={{padding:"10px 6px",textAlign:"center",cursor:"pointer",marginBottom:0}}>
                    <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontWeight:800,fontSize:13,color:p.color,lineHeight:1.1,marginBottom:3}}>{p.val}</div>
                    <div style={{fontSize:9,color:C.textLight,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:2}}>{p.label}</div>
                    <div style={{fontSize:9,color:C.textFaint,lineHeight:1.3}}>{p.sub}</div>
                  </div>
                ))}
              </div>);
            })()}

            {/* PWA Install Banner */}
            {pwaPrompt&&!pwaInstalled&&(
              <div className="fv-card" style={{padding:"14px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:12,borderColor:C.accentMid}}>
                <Download size={22} color={C.accent} style={{flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:2}}>Add to Home Screen</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>Install Trackfi for offline access & faster loading</div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={async()=>{pwaPrompt.prompt();const r=await pwaPrompt.userChoice;if(r.outcome==="accepted"){setPwaInstalled(true);localStorage.setItem("fv_pwa_dismissed","1");}setPwaPrompt(null);}} style={{background:"rgba(255,255,255,.25)",border:"none",borderRadius:8,padding:"6px 12px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>Install</button>
                  <button onClick={()=>{setPwaPrompt(null);localStorage.setItem("fv_pwa_dismissed","1");setPwaInstalled(true);}} style={{background:"transparent",border:"1px solid rgba(255,255,255,.3)",borderRadius:8,padding:"6px 8px",color:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:11}}>✕</button>
                </div>
              </div>
            )}
            {/* ── 4. INSIGHT TICKER ─────────────────────────────── */}
            {expenses.length>0&&(()=>{
              const now2=new Date();
              const thisMs=now2.getFullYear()+"-"+String(now2.getMonth()+1).padStart(2,"0");
              const lastMs=new Date(now2.getFullYear(),now2.getMonth()-1,1).getFullYear()+"-"+String(new Date(now2.getFullYear(),now2.getMonth()-1,1).getMonth()+1).padStart(2,"0");
              const thisE=expenses.filter(e=>e.date?.startsWith(thisMs)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const lastE=expenses.filter(e=>e.date?.startsWith(lastMs)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const topCat=Object.entries(expenses.filter(e=>e.date?.startsWith(thisMs)).reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{})).sort((a,b)=>b[1]-a[1])[0];
              const nextBill=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0).sort((a,b)=>dueIn(a.dueDate)-dueIn(b.dueDate))[0];
              const diff=lastE>0?((thisE-lastE)/lastE*100):0;
              const insights=[
                thisE>0&&lastE>0&&`Spending ${Math.abs(diff).toFixed(0)}% ${diff>0?"more":"less"} than last month`,
                topCat&&`Biggest category: ${topCat[0]} at ${fmt(topCat[1])}`,
                nextBill&&`Next bill: ${nextBill.name} ${fmt(nextBill.amount)} in ${dueIn(nextBill.dueDate)}d`,
                savingsRate>0&&`Saving ${savingsRate.toFixed(1)}% of income — ${savingsRate>=20?"great":"keep going"}`,
                totalDebt>0&&`~\u2248 ${fmt(approxMonthlyInterestOnDebts(debts))}/mo interest (APR\u00f712 on balances)`,
                overdue.length>0&&`⚠ ${overdue.length} bill${overdue.length!==1?"s":""} overdue — take action now`,
                spendingStreak>2&&`🔥 ${spendingStreak}-day streak — checking spend below your daily average`,
                savingsGoals.length>0&&`${savingsGoals.filter(g=>parseFloat(g.saved||0)>=parseFloat(g.target||1)).length}/${savingsGoals.length} savings goals complete`,
              ].filter(Boolean);
              if(!insights.length)return null;
              const insight=insights[now2.getDate()%insights.length];
              return(<div role="button" tabIndex={0} onClick={()=>navTo("insights")} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")navTo("insights");}} className="fv-insight-card" style={{marginBottom:14}}><div style={{flex:1,minWidth:0}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}><div style={{fontSize:10,fontWeight:700,color:C.accent,textTransform:"uppercase",letterSpacing:.5}}>Spending insight</div><div style={{fontSize:10,fontWeight:700,color:C.accent,background:C.accent+"18",borderRadius:99,padding:"1px 7px"}}>Charts</div></div><div style={{fontSize:13,color:C.text,lineHeight:1.4,fontWeight:500}}>{insight}</div></div></div>);
            })()}

            {/* ── 5. QUICK ACTIONS ──────────────────────────────── */}
            {(()=>{
              const ALL_QA=[
                {id:"expense",l:"Log Expense",a:()=>om("expense"),bg:C.accentBg,c:C.accent},
                {id:"receipt",l:"Add Photo",a:()=>om("receipt"),bg:C.purpleBg,c:C.purple},
                {id:"bill",l:"Add Bill",a:()=>om("bill"),bg:C.amberBg,c:C.amber},
                {id:"debt",l:"Add Debt",a:()=>om("debt",{addLoanBill:true,loanBillDueDate:todayStr()}),bg:C.redBg,c:C.red},
                {id:"simulator",l:"Payoff Sim",a:()=>debts.length?setModal("simulator"):om("debt",{addLoanBill:true,loanBillDueDate:todayStr()}),bg:C.greenBg,c:C.green},
                {id:"budget",l:"Envelopes",a:()=>om("bgoal_home"),bg:C.purpleBg,c:C.purple},
                {id:"shift",l:"Log Shift",a:()=>navTo("shifts"),bg:C.accentBg,c:C.accent},
                {id:"trade",l:"Log Trade",a:()=>navTo("trading"),bg:C.greenBg,c:C.green},
                {id:"savings",l:"Add Goal",a:()=>navTo("savings"),bg:C.amberBg,c:C.amber},
                {id:"insights",l:"Insights",a:()=>navTo("insights"),bg:C.purpleBg,c:C.purple},
                {id:"paycheck",l:"Paycheck",a:()=>navTo("paycheck"),bg:C.greenBg,c:C.green},
                {id:"health",l:"Health",a:()=>navTo("health"),bg:C.redBg,c:C.red},
                {id:"bills_nav",l:"Bills",a:()=>navTo("bills"),bg:C.amberBg,c:C.amber},
                {id:"recurring_nav",l:"Recurring",a:()=>navTo("recurring"),bg:C.accentBg,c:C.accent},
                {id:"networth",l:"Net Worth",a:()=>navTo("networthtrend"),bg:C.greenBg,c:C.green},
                {id:"calendar_nav",l:"Calendar",a:()=>navTo("calendar"),bg:C.amberBg,c:C.amber},
              ];
              const activeIds=settings.quickActions||["expense","bill","paycheck","debt","health","budget","savings","insights"];
              const active=ALL_QA.filter(q=>activeIds.includes(q.id));
              const urgentBillsQA=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<=3&&dueIn(b.dueDate)>=0);
              const overdueQA=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0);
              return(
                <div style={{marginBottom:14}}>
                  {/* Urgency strip */}
                  {(overdueQA.length>0||urgentBillsQA.length>0)&&(
                    <div onClick={()=>navTo("bills")} style={{background:overdueQA.length>0?C.redBg:C.amberBg,border:`1px solid ${overdueQA.length>0?C.redMid:C.amberMid}`,borderRadius:12,padding:"10px 14px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
                      <div style={{fontSize:13,fontWeight:700,color:overdueQA.length>0?C.red:C.amber}}>
                        {overdueQA.length>0?`${overdueQA.length} bill${overdueQA.length>1?"s":""} overdue — tap to pay`:`${urgentBillsQA.length} bill${urgentBillsQA.length>1?"s":""} due in 3 days`}
                      </div>
                      <div style={{fontSize:13,fontWeight:800,color:overdueQA.length>0?C.red:C.amber}}>
                        {fmt(overdueQA.length>0?overdueQA.reduce((s,b)=>s+(parseFloat(b.amount)||0),0):urgentBillsQA.reduce((s,b)=>s+(parseFloat(b.amount)||0),0))} →
                      </div>
                    </div>
                  )}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Quick Actions</div>
                    <button onClick={()=>setModal("quickactions")} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.textLight,fontWeight:600,display:"flex",alignItems:"center",gap:4}}><Settings size={12}/>Edit</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                    {active.slice(0,8).map(q=>{const Ico=QA_ICON[q.id]||Plus;return(<button key={q.id} type="button" className="ba" onClick={q.a} style={{background:q.bg,borderRadius:14,padding:"14px 6px 12px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:7,border:"none",boxShadow:"0 1px 3px rgba(15,23,42,.06)"}}><Ico size={20} color={q.c} strokeWidth={2}/><span style={{fontSize:10,fontWeight:700,color:q.c,lineHeight:1.3,textAlign:"center"}}>{q.l}</span></button>);})}
                  </div>
                </div>
              );
            })()}

            {/* ── 6. UPCOMING BILLS ─────────────────────────────── */}
            {/* ── HOUSEHOLD SPLIT CARD — visible when enabled ─── */}
            {/* Month Forecast */}
            {dashConfig.showForecast!==false&&(()=>{
              const _now=new Date();const _ms=_now.getFullYear()+"-"+String(_now.getMonth()+1).padStart(2,"0");
              const _dom=_now.getDate(),_dim=new Date(_now.getFullYear(),_now.getMonth()+1,0).getDate();
              const _mtd=expenses.filter(e=>e.date?.startsWith(_ms)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const _proj=_dom>2?(_mtd/_dom)*_dim:0;
              if(_mtd===0||_dom<3)return null;
              const _onTrack=totalIncome<=0||_proj<=totalIncome;
              const _pct=totalIncome>0?Math.min(100,(_mtd/totalIncome)*100):0;
              const _projPct=totalIncome>0?Math.min(100,(_proj/totalIncome)*100):0;
              return(
                <div className="fv-card" style={{padding:"14px 16px",marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div>
                      <div className="fv-stat-label" style={{marginBottom:2}}>Month forecast</div>
                      <div style={{fontFamily:MF,fontWeight:800,fontSize:17,color:_onTrack?C.text:C.negative}}>{fmt(_proj)} projected</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:11,fontWeight:700,color:_onTrack?C.positive:C.negative}}>{_onTrack?"On track":"Over budget"}</div>
                      <div style={{fontFamily:MF,fontWeight:700,fontSize:12,color:_onTrack?C.green:C.red,marginTop:1}}>{_onTrack&&totalIncome>0?fmt(totalIncome-_proj)+" left":!_onTrack?"+"+fmt(_proj-totalIncome):" "}</div>
                    </div>
                  </div>
                  <div style={{position:"relative",height:5,background:C.borderLight,borderRadius:99,overflow:"hidden",marginBottom:4}}>
                    <div style={{position:"absolute",left:0,top:0,height:"100%",width:_pct.toFixed(1)+"%",background:_onTrack?C.accent:C.red,borderRadius:99}}/>
                    {_proj>_mtd&&<div style={{position:"absolute",left:_pct.toFixed(1)+"%",top:0,height:"100%",width:Math.min(_projPct-_pct,100-_pct).toFixed(1)+"%",background:_onTrack?"rgba(99,102,241,.2)":"rgba(220,38,38,.2)"}}/>}
                  </div>
                  <div style={{fontSize:10,color:C.textFaint}}>{fmt(_mtd)} spent · day {_dom} of {_dim}{totalIncome>0?" · "+fmt(totalIncome)+" income":""}</div>
                </div>
              );
            })()}
            {household?.enabled&&household?.members?.length>1&&(()=>{
              const ms_hh=new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0");
              const thisM=expenses.filter(e=>e.date?.startsWith(ms_hh));
              const totalShared=thisM.filter(e=>e.owner==="shared").reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const splitEach=household.members.length>0?totalShared/household.members.length:0;
              const memberSpend=household.members.map(m=>({
                ...m,
                paid:thisM.filter(e=>e.owner===m.id||(m.id==="me"&&!e.owner)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0)
              }));
              const totalAll=thisM.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              return(
                <div onClick={()=>navTo("household")} style={{background:C.surface,borderRadius:16,padding:"14px 16px",marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",cursor:"pointer"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>{household.name||"Household"}</div>
                    <div style={{fontSize:11,color:C.accent,fontWeight:600}}>View split →</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {memberSpend.map(m=>{
                      const owes=splitEach-m.paid;
                      return(
                        <div key={m.id} style={{flex:1,background:C.surfaceAlt,borderRadius:10,padding:"9px 10px",textAlign:"center"}}>
                          <div style={{fontSize:16,marginBottom:3}}>{m.emoji}</div>
                          <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:1}}>{m.name}</div>
                          <div style={{fontFamily:MF,fontWeight:800,fontSize:13,color:C.red,marginBottom:2}}>{fmt(m.paid)}</div>
                          {Math.abs(owes)>1&&<div style={{fontSize:10,fontWeight:700,color:owes>0?C.red:C.green,background:owes>0?C.redBg:C.greenBg,borderRadius:99,padding:"2px 6px",display:"inline-block"}}>{owes>0?"owes "+fmt(owes):"+ "+fmt(-owes)}</div>}
                        </div>
                      );
                    })}
                    <div style={{flex:1,background:C.accentBg,borderRadius:10,padding:"9px 10px",textAlign:"center"}}>
                      <div style={{fontSize:16,marginBottom:3}}>📊</div>
                      <div style={{fontSize:11,fontWeight:700,color:C.accent,marginBottom:1}}>Total</div>
                      <div style={{fontFamily:MF,fontWeight:800,fontSize:13,color:C.accent}}>{fmt(totalAll)}</div>
                      {totalShared>0&&<div style={{fontSize:10,color:C.accent,opacity:.7}}>{fmt(splitEach)}/ea shared</div>}
                    </div>
                  </div>
                </div>
              );
            })()}

            {dashConfig.showBills!==false&&bills.filter(b=>!b.paid).length>0&&<div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Upcoming Bills</div>
                <button onClick={()=>navTo("bills")} style={{fontSize:12,color:C.accent,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>See all</button>
              </div>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
                {bills.filter(b=>!b.paid).sort((a,b2)=>new Date(a.dueDate)-new Date(b2.dueDate)).slice(0,6).map(b=>{
                  const d=dueIn(b.dueDate);
                  const col=d<0?C.red:d<=3?C.red:d<=7?C.amber:C.textMid;
                  const bg2=d<0?C.redBg:d<=7?C.amberBg:C.surface;
                  const br=d<0?C.redMid:d<=7?C.amberMid:C.border;
                  return(<div key={b.id} onClick={()=>navTo("bills")} style={{background:bg2,border:`1px solid ${br}`,borderRadius:12,padding:"10px 12px",flexShrink:0,cursor:"pointer",minWidth:100}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:90}}>{b.name}</div>
                    <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontWeight:800,fontSize:14,color:col,marginBottom:2}}>{fmt(b.amount)}</div>
                    <div style={{fontSize:10,color:col,fontWeight:600,marginBottom:3}}>{d<0?Math.abs(d)+"d late":d===0?"Today":d+"d left"}</div>
                    {totalIncome>0&&<div style={{height:2,background:"rgba(0,0,0,.06)",borderRadius:99,width:"100%"}}><div style={{height:"100%",width:Math.min(100,(parseFloat(b.amount)/totalIncome)*100).toFixed(1)+"%",background:col,borderRadius:99,opacity:.6}}/></div>}
                  </div>);
                })}
              </div>
            </div>}

            {/* ── 7. RECENT TRANSACTIONS ────────────────────────── */}
            {dashConfig.showRecent!==false&&expenses.length>0&&<div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Recent</div>
                <button onClick={()=>navTo("spend")} style={{fontSize:12,color:C.accent,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>See all</button>
              </div>
              {(()=>{const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const ds=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");const amt=expenses.filter(e=>e.date===ds).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);return{d:ds,amt,day:["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()]};});const mx=Math.max(...days.map(d=>d.amt))||1;const today3=todayStr();return(<div style={{display:"flex",gap:3,alignItems:"flex-end",height:28,marginBottom:12}}>{days.map(({d,amt,day})=>{const h=Math.max(3,Math.round((amt/mx)*24));const isToday=d===today3;return(<div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><div style={{width:"100%",height:h,background:isToday?C.accent:amt>0?C.accentBg:C.borderLight,borderRadius:"2px 2px 0 0"}}/><div style={{fontSize:8,color:isToday?C.accent:C.textFaint,fontWeight:isToday?700:400}}>{day}</div></div>);})}</div>);})()}
              {[...expenses].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,4).map(e=>{
                const cat=categories.find(c=>c.name===e.category);
                return(<div key={e.id} onClick={()=>setEditItem({type:"expense",data:e})} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}>
                  <div style={{width:34,height:34,borderRadius:9,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{cat?.icon||"💸"}</div>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:C.text}}>{e.name}</div><div style={{fontSize:11,color:C.textLight}}>{e.date} · {e.category}</div></div>
                  <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>-{fmt(e.amount)}</div>
                </div>);
              })}
            </div>}
          </div>
        )}

        {tab==="chat"&&<div style={{height:"calc(100dvh - 150px)",maxHeight:"calc(100dvh - 150px)",display:"flex",flexDirection:"column",minHeight:0,paddingBottom:4}}>
          <div style={{marginBottom:10}}>
            <div className="fv-page-title" style={{fontSize:18}}>AI logger</div>
            <div style={{fontSize:13,color:C.textLight,marginTop:1,marginBottom:10}}>Paid-from aware — "lunch 12", "coffee 6 on card", "split spending", "rent 1200 due 28th"</div>
            {/* Smart prompt chips */}
            <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
              {(()=>{
                const now_c=new Date();
                const urgentPayBills=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<=3&&dueIn(b.dueDate)>=0).slice(0,2);
                const chips=[
                  {l:"💸 Log Expense",a:()=>om("expense")},
                  {l:"📅 Add Bill",a:()=>om("bill")},
                  {l:"💳 Add Debt",a:()=>om("debt",{addLoanBill:true,loanBillDueDate:todayStr()})},
                  {l:"🎯 Add Goal",a:()=>navTo("savings")},
                  {l:"💰 Paycheck Plan",a:()=>navTo("paycheck")},
                  ...urgentPayBills.map(b=>({l:"✓ Pay "+b.name,a:()=>{const res=commitMarkBillPaid(b,{debts,setDebts,setBills,accounts,settings,applySpend,onToast:msg=>showToast&&showToast(msg),skipToast:!showToast,skipVibrate:false});if(!res.ok)showToast&&showToast(res.msg,"error");}})),
                ];
                return chips.map((c,i)=>(
                  <div key={i} onClick={c.a} style={{flexShrink:0,background:C.surface,border:`1px solid ${C.border}`,borderRadius:99,padding:"6px 12px",fontSize:11,fontWeight:600,color:C.textMid,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"0 1px 2px rgba(10,22,40,.06)"}}>
                    {c.l}
                  </div>
                ));
              })()}
            </div>
          </div>
          <div style={{flex:1,minHeight:0}}><ChatView categories={categories} expenses={expenses} bills={bills} debts={debts} accounts={accounts} income={income} savingsGoals={savingsGoals} trades={trades} tradingAccount={tradingAccount} budgetGoals={budgetGoals} setExpenses={setExpenses} setBills={setBills} setDebts={setDebts} setSGoals={setSGoals} setAccounts={setAccounts} setIncome={setIncome} setTrades={setTrades} setBGoals={setBGoals} applySpend={applySpend} applyRefund={applyRefund} defaultExpensePaidFrom={settings.defaultExpensePaidFrom||"checking"} defaultBillPaidFrom={settings.defaultBillPaidFrom||"checking"} settings={settings} showToast={showToast}/></div></div>}
        {tab==="categories"&&<CategoriesView categories={categories} setCategories={setCats} expenses={expenses} setExpenses={setExpenses} showToast={showToast}/>}
        {tab==="spend"&&<SpendingView expenses={expenses} setExpenses={setExpenses} budgetGoals={budgetGoals} setBGoals={setBGoals} categories={categories} setEditItem={setEditItem} onAdd={()=>om("expense")} showToast={showToast} showUndoToast={showUndoToast} household={household} applySpend={applySpend} applyRefund={applyRefund} accounts={accounts} debts={debts} settings={settings}/>}
        {tab==="bills"&&<BillsView bills={bills} setBills={setBills} setDebts={setDebts} setEditItem={setEditItem} onAdd={()=>om("bill")} showToast={showToast} showUndoToast={showUndoToast} household={household} requestNotifPermission={requestNotifPermission} applySpend={applySpend} applyRefund={applyRefund} accounts={accounts} debts={debts} settings={settings}/>}
        {tab==="more"&&!isMoreTab&&(
          <div className="fu">
            {/* Account pill at top of More */}
            {authSession?(
              <div style={{background:C.navy,borderRadius:16,padding:"14px 16px",marginBottom:16,display:"flex",flexWrap:"wrap",alignItems:"flex-start",gap:12,rowGap:10}}>
                <div className="fv-avatar-chip">{(authSession?.user?.email||"?")[0].toUpperCase()}</div>
                <div style={{flex:"1 1 180px",minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:"#fff",overflowWrap:"anywhere",wordBreak:"break-word"}}>{authSession?.user?.email}</div><div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:2}}>{(()=>{const t=parseInt(localStorage.getItem("fv_last_sync")||"0");const ago=t?Math.floor((Date.now()-t)/1000):null;return ago===null?"Signed in":ago<10?"✓ Just synced":ago<60?"✓ Synced "+ago+"s ago":ago<3600?"✓ Synced "+Math.floor(ago/60)+"m ago":"Signed in";})()}</div></div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginLeft:"auto",flex:"0 1 auto",justifyContent:"flex-end"}}>
                  <button onClick={async()=>{if(authSession&&!syncing){await loadFromSupabase(authSession);showToast("✓ Synced");}}} style={{background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.15)",borderRadius:8,padding:"6px 12px",color:"rgba(255,255,255,.8)",fontSize:12,fontWeight:700,cursor:syncing?"default":"pointer",display:"flex",alignItems:"center",gap:5,opacity:syncing?0.6:1,whiteSpace:"nowrap"}}>{syncing?"Syncing...":"↻ Sync now"}</button>
                  <button onClick={()=>setConfirm({title:"Sign Out",message:"You'll stay in offline mode. Your local data is safe.",onConfirm:async()=>{const ok=await handleSignOut();if(ok)setConfirm(null);},danger:false})} style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:8,padding:"6px 12px",color:"rgba(255,255,255,.7)",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>Sign Out</button>
                </div>
              </div>
            ):(
              <div className="fv-offline-banner">
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:2}}>Using offline mode</div><div style={{fontSize:11,color:"rgba(255,255,255,.75)"}}>Sign in to sync across devices</div></div>
                <button onClick={()=>{localStorage.removeItem("fv_skip_auth");setSkipAuth(false);}} style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:8,padding:"8px 14px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Sign In</button>
              </div>
            )}
            <div className="fv-page-title" style={{fontSize:18,marginBottom:2}}>More</div>
            <div className="fv-page-sub" style={{marginBottom:16}}>All your financial tools</div>
            {/* Featured shortcuts grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
              {[
                {id:"health",l:"Health",c:C.red,bg:C.redBg},
                {id:"paycheck",l:"Paycheck",c:C.positive,bg:C.greenBg},
                {id:"networthtrend",l:"Net worth",c:C.accent,bg:C.accentBg},
                {id:"insights",l:"Insights",c:C.purple,bg:C.purpleBg},
                {id:"debt",l:"Debt",c:C.negative,bg:C.redBg},
                {id:"savings",l:"Goals",c:C.teal,bg:"rgba(13,148,136,.1)"},
                {id:"calendar",l:"Calendar",c:C.amber,bg:C.amberBg},
                {id:"search",l:"Search",c:C.textMid,bg:C.surfaceAlt},
                {id:"household",l:"Household",c:C.accent,bg:C.accentBg},
              ].map(({id,l,c,bg})=>{const Ico=MORE_ICON[id]||ChevronRight;return(
                <button key={id} type="button" onClick={()=>navTo(id)} className="ba" style={{background:bg,borderRadius:14,padding:"12px 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:5,border:"none",cursor:"pointer",boxShadow:"0 1px 2px rgba(15,23,42,.05)"}}>
                  <Ico size={20} color={c} strokeWidth={2}/>
                  <span style={{fontSize:10,fontWeight:700,color:c,lineHeight:1.2,textAlign:"center"}}>{l}</span>
                </button>
              );})}
            </div>
            {GROUPS.map(sec=>(
              <div key={sec.key} style={{marginBottom:22}}>
                <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:10}}><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.text}}>{sec.label}</div><div style={{fontSize:11,color:C.textLight}}>{sec.desc}</div></div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {sec.items.map(t=>{const badge=t.id==="notifs"&&unread>0?unread:null;return(
                    <button key={t.id} type="button" className="ba fv-card" onClick={()=>navTo(t.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",borderRadius:12,cursor:"pointer",textAlign:"left",width:"100%",marginBottom:0}}>
                      <div style={{width:36,height:36,background:badge?C.redBg:C.accentBg,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative"}}><t.icon size={17} color={badge?C.red:C.accent}/>{badge&&<div style={{position:"absolute",top:-4,right:-4,width:16,height:16,background:C.red,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff",border:"2px solid #fff"}}>{badge>9?"9+":badge}</div>}</div>
                      <span style={{fontSize:14,fontWeight:600,color:C.text,flex:1}}>{t.label}</span>
                      <ChevronRight size={15} color={C.textLight}/>
                    </button>
                  );})}
                </div>
              </div>
            ))}
            <button className="ba" onClick={()=>navTo("settings")} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:C.accent,borderRadius:12,cursor:"pointer",textAlign:"left",width:"100%",border:"none",marginTop:4}}>
              <div style={{width:36,height:36,background:"rgba(255,255,255,.2)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Settings size={17} color="#fff"/></div>
              <span style={{fontSize:14,fontWeight:700,color:"#fff",flex:1}}>Settings</span>
              <ChevronRight size={15} color="rgba(255,255,255,.7)"/>
            </button>
          </div>
        )}

        {tab==="accounts"&&(
          <div className="fu">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><div><div className="fv-page-title" style={{fontSize:18}}>Accounts & income</div></div><div style={{fontSize:12,color:C.positive,fontWeight:600,display:"flex",alignItems:"center",gap:4}}><div style={{width:7,height:7,borderRadius:"50%",background:C.positive}}/>Auto-saved</div></div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
              {[{k:"checking",l:"Checking",c:C.navy},{k:"savings",l:"Savings",c:C.positive},{k:"cushion",l:"Cushion / Emergency",c:C.accent}].map(a=>{const Ico=ACCT_ICON[a.k]||Wallet;return(
                <div key={a.k} className="fv-section-card" style={{padding:18,display:"flex",flexWrap:"wrap",alignItems:"center",gap:12,rowGap:10,minWidth:0,boxSizing:"border-box",maxWidth:"100%"}}>
                  <div className="fv-icon-tile" style={{background:a.c+"15"}}><Ico size={22} color={a.c} strokeWidth={2}/></div>
                  <div style={{flex:"1 1 120px",minWidth:0,maxWidth:"100%"}}><div style={{fontSize:14,fontWeight:600,color:C.text}}>{a.l}</div></div>
                  <input type="number" min="0" placeholder="0.00" value={accounts[a.k]||""} onChange={e=>{const v=e.target.value;if(v===""||parseFloat(v)>=0)setAccounts(p=>({...p,[a.k]:v}));}} onBlur={e=>{if(e.target.value)showToast("✓ "+a.l+" saved");}} style={{flex:"1 1 120px",width:130,maxWidth:"100%",minWidth:0,background:hidden?C.bg:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:18,fontFamily:MF,fontWeight:800,color:a.c,outline:"none",textAlign:"right",filter:hidden?"blur(8px)":"none",boxSizing:"border-box"}}/>
                </div>
              );})}
            </div>
            <CashAccountsBlock accounts={accounts} setAccounts={setAccounts} showToast={showToast} variant="accounts" onOpenSettings={()=>navTo("settings")}/>
            {/* HYSA opportunity tip */}
            {(()=>{
              const liq=totalCheckingBalance(accounts)+totalSavingsBalance(accounts)+(parseFloat(accounts.cushion||0));
              if(liq<1000)return null;
              const extraPerYr=liq*(4.75-0.5)/100;
              return(
                <div onClick={()=>{}} style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:14,padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.green,marginBottom:2}}>HYSA opportunity</div>
                    <div style={{fontSize:12,color:C.green,opacity:.8}}>Your {fmt(liq)} could earn {fmt(extraPerYr)}/yr more</div>
                  </div>
                  <div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.green}}>{fmt(extraPerYr/12)}/mo</div>
                </div>
              );
            })()}
            {/* Investment & Retirement Accounts */}
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10,marginTop:4}}>Investments & Retirement</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {[
                {k:"k401",l:"401(k)",c:C.accent,desc:"Pre-tax employer retirement"},
                {k:"roth_ira",l:"Roth IRA",c:C.positive,desc:"Post-tax retirement"},
                {k:"brokerage",l:"Brokerage",c:C.teal,desc:"Taxable investment account"},
                {k:"hsa",l:"HSA",c:C.purple,desc:"Health savings account"},
                {k:"crypto",l:"Crypto",c:C.amber,desc:"Cryptocurrency portfolio"},
              ].map(a=>{const Ico=ACCT_ICON[a.k]||LineChart;return(
                <div key={a.k} className="fv-card" style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:14,marginBottom:0}}>
                  <div className="fv-icon-tile" style={{background:a.c+"15"}}><Ico size={20} color={a.c} strokeWidth={2}/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:C.text}}>{a.l}</div>
                    <div style={{fontSize:11,color:C.textLight}}>{a.desc}</div>
                  </div>
                  <input type="number" placeholder="0.00" value={accounts[a.k]||""} onChange={e=>setAccounts(p=>({...p,[a.k]:e.target.value}))} onBlur={e=>{if(e.target.value)showToast(a.l+" saved");}} style={{width:120,background:hidden?C.bg:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:16,fontFamily:MF,fontWeight:700,color:a.c,outline:"none",textAlign:"right",filter:hidden?"blur(8px)":"none"}}/>
                </div>
              );})}
            </div>
            {/* Real Estate & Assets */}
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>Real Estate & Assets</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {[
                {k:"property",l:"Property / Real Estate",c:C.amber,desc:"Home value or equity"},
                {k:"investments",l:"Other Investments",c:C.positive,desc:"Index funds, ETFs, etc."},
                {k:"vehicles",l:"Vehicles",c:C.purple,desc:"Cars, motorcycles, etc."},
              ].map(a=>{const Ico=ACCT_ICON[a.k]||Home;return(
                <div key={a.k} className="fv-card" style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:14,marginBottom:0}}>
                  <div className="fv-icon-tile" style={{background:a.c+"15"}}><Ico size={20} color={a.c} strokeWidth={2}/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:C.text}}>{a.l}</div>
                    <div style={{fontSize:11,color:C.textLight}}>{a.desc}</div>
                  </div>
                  <input type="number" min="0" placeholder="0.00" value={accounts[a.k]||""} onChange={e=>{const v=e.target.value;if(v===""||parseFloat(v)>=0)setAccounts(p=>({...p,[a.k]:v}));}} onBlur={e=>{if(e.target.value)showToast(a.l+" saved");}} style={{width:120,background:hidden?C.bg:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:16,fontFamily:MF,fontWeight:700,color:a.c,outline:"none",textAlign:"right",filter:hidden?"blur(8px)":"none"}}/>
                </div>
              );})}
            </div>
            <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:C.text}}>Income / Paycheck</div>
              <div style={{display:"flex",gap:5}}>
                {["Weekly","Biweekly","Twice Monthly","Monthly"].map(f=>(
                  <button key={f} onClick={()=>setIncome(p=>({...p,payFrequency:f}))}
                    style={{padding:"4px 8px",borderRadius:99,border:`1px solid ${(income.payFrequency||"Biweekly")===f?C.accent:C.border}`,background:(income.payFrequency||"Biweekly")===f?C.accentBg:"transparent",fontSize:10,fontWeight:700,color:(income.payFrequency||"Biweekly")===f?C.accent:C.textLight,cursor:"pointer"}}>
                    {f==="Twice Monthly"?"2x/mo":f}
                  </button>
                ))}
              </div>
            </div>
              {[{k:"primary",l:`${getProfession(profCategory).icon} Primary take-home / paycheck`},{k:"other",l:"Other Income"},{k:"trading",l:"Trading avg"},{k:"rental",l:"Rental Income"},{k:"dividends",l:"Dividends"},{k:"freelance",l:"Freelance"}].map(i=>(
                <div key={i.k} style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:600,color:C.slate,textTransform:"uppercase",letterSpacing:.4,marginBottom:5}}>{i.l}</div><input type="number" placeholder="0.00" value={income[i.k]||""} onChange={e=>setIncome(p=>({...p,[i.k]:e.target.value}))} onBlur={e=>{if(e.target.value)showToast("✓ Income saved");}} style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.text,fontSize:14,outline:"none"}}/></div>
              ))}
              <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"10px 14px",marginTop:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                <span style={{fontSize:12,color:C.accent,fontWeight:600}}>Monthly equivalent</span>
                <span style={{fontFamily:MF,fontSize:16,fontWeight:800,color:C.accent}}>{fmt(totalIncome)}</span>
              </div>
              <div style={{fontSize:11,color:C.accent,opacity:.7}}>({income.payFrequency||"Biweekly"} × {income.payFrequency==="Weekly"?"4.33×":income.payFrequency==="Twice Monthly"?"2×":income.payFrequency==="Monthly"?"1×":"2.17×"} + other sources)</div>
            </div>
            </div>
          </div>
        )}

        {tab==="debt"&&<DebtView debts={debts} setDebts={setDebts} setBills={setBills} setModal={setModal} setEditItem={setEditItem} showToast={showToast} extraPayDebt={extraPayDebt} setExtraPayDebt={setExtraPayDebt} debtSavePing={debtSavePing} onAddDebt={()=>om("debt",{addLoanBill:true,loanBillDueDate:todayStr()})}/>}
        {tab==="savings"&&<SavingsGoalsView goals={savingsGoals} setGoals={setSGoals} income={income} accounts={accounts} accountRates={accountRates} setAccountRates={setAccountRates} showToast={showToast} applySpend={applySpend} settings={settings}/>}
        {tab==="recurring"&&<RecurringView expenses={expenses} setExpenses={setExpenses} categories={categories} showToast={showToast} appReady={ready} recurrings={recurrings} setRecurrings={setRecurrings} applySpend={applySpend} defaultExpensePaidFrom={settings.defaultExpensePaidFrom||"checking"} accounts={accounts} settings={settings} debts={debts}/>}
        {tab==="cashflow"&&<IncomeSpendingView expenses={expenses} income={income} bills={bills} trades={trades}/>}
        {tab==="physical"&&<FinancialPhysicalView income={income} expenses={expenses} debts={debts} accounts={accounts} bills={bills} savingsGoals={savingsGoals}/>}
        {tab==="health"&&<HealthScoreView income={income} expenses={expenses} debts={debts} accounts={accounts} bills={bills} tradingAccount={tradingAccount} onNavigate={navTo}/>}
        {tab==="trading"&&settings.showTrading&&<TradingView trades={trades} setTrades={setTrades} account={tradingAccount} setAccount={setTradingAccount} showToast={showToast}/>}
        {tab==="calendar"&&<CalendarView expenses={expenses} bills={bills} calColors={calColors} setCalColors={setCalColors} setExpenses={setExpenses} onAdd={()=>om("expense")}/>}
        {tab==="shifts"&&<ShiftView shifts={shifts} setShifts={setShifts} income={income} profCategory={profCategory} profSub={profSub} showToast={showToast}/>}
        {tab==="trend"&&<TrendView balHist={balHist} accounts={accounts} expenses={expenses} onNavigate={navTo}/>}
        {tab==="statement"&&<StatementView expenses={expenses} bills={bills} income={income} accounts={accounts} debts={debts} trades={trades} appName={appName} categories={categories} onAdd={()=>om("expense")}/>}
        {tab==="search"&&<SearchView expenses={expenses} bills={bills} debts={debts} trades={trades} categories={categories} setEditItem={setEditItem} onNavigate={navTo}/>}
        {tab==="subscriptions"&&<SubsView detectedSubs={detectedSubs} expenses={expenses} showToast={showToast} dismissed={subDismissed} setDismissed={setSubDismissed}/>}
        {tab==="insights"&&<InsightsView expenses={expenses} income={income} bills={bills} debts={debts} budgetGoals={budgetGoals} savingsGoals={savingsGoals}/>}
        {tab==="paycheck"&&<PaycheckView bills={bills} income={income} setIncome={setIncome} expenses={expenses} accounts={accounts} budgetGoals={budgetGoals} onAdd={()=>om("expense")} onRecordPaycheck={openPaycheckDeposit}/>}
        {tab==="networthtrend"&&<NetWorthTrendView balHist={balHist} debts={debts} accounts={accounts} tradingAccount={tradingAccount} onNavigate={navTo} nwGoal={nwGoal} setNwGoal={setNwGoal}/>}
        {tab==="tax"&&<TaxView expenses={expenses} income={income} trades={trades} shifts={shifts} appName={appName}/>}
        {tab==="dashsettings"&&<DashSettingsView config={dashConfig} setConfig={setDashConfig} showTrading={settings.showTrading}/>}
        {tab==="household"&&<HouseholdView household={household} setHousehold={setHousehold} expenses={expenses} bills={bills} setBills={setBills} showToast={showToast} settlements={settlements} setSettlements={setSettlements} hhBudgets={hhBudgets} setHhBudgets={setHhBudgets}/>}
        {tab==="export"&&<div className="fu"><div className="fv-page-title" style={{marginBottom:4}}>Export Data</div><div className="fv-page-sub" style={{marginBottom:20}}>Download your financial data for spreadsheets, backups, or your accountant.</div><button type="button" className="fv-btn-primary ba" onClick={()=>setShowExport(true)} style={{marginBottom:12}}><Download size={22} color="white" style={{flexShrink:0}}/><div><div style={{fontSize:16,fontWeight:800,color:"#fff"}}>Open Export Center</div><div style={{fontSize:12,color:"rgba(255,255,255,.75)",fontWeight:500}}>5 export formats — expenses, net worth, debts, report</div></div></button></div>}
        {tab==="import"&&<div className="fu"><div className="fv-page-title" style={{marginBottom:4}}>Import Bank CSV</div><div className="fv-page-sub" style={{marginBottom:20}}>Paste or upload a CSV from your bank's website to bulk-import transactions.</div><button type="button" className="fv-btn-primary fv-btn-success ba" onClick={()=>setShowImport(true)} style={{marginBottom:16}}><FileText size={22} color="white" style={{flexShrink:0}}/><div><div style={{fontSize:16,fontWeight:800,color:"#fff"}}>Open Bank Import</div><div style={{fontSize:12,color:"rgba(255,255,255,.75)",fontWeight:500}}>Supports Chase, BofA, Wells Fargo, Capital One, Citi + any CSV</div></div></button><div className="fv-insight-card" style={{fontSize:13,color:C.textMid,lineHeight:1.6,cursor:"default"}}><strong style={{color:C.accent,fontWeight:700}}>Offline.</strong> Your bank data never leaves this device. Export CSV from your bank, paste here — format auto-detect and merchant categorization.</div></div>}
        {tab==="settings"&&<SettingsView settings={settings} setSettings={setSettings} appName={appName} setAppName={setAppName} profCategory={profCategory} setProfCategory={setProfCategory} profSub={profSub} setProfSub={setProfSub} darkMode={darkMode} setDarkMode={setDarkMode} pinEnabled={pinEnabled} setPinEnabled={setPinEnabled} household={household} navTo={navTo} expenses={expenses} bills={bills} debts={debts} trades={trades} accounts={accounts} income={income} shifts={shifts} savingsGoals={savingsGoals} budgetGoals={budgetGoals} setBills={setBills} setDebts={setDebts} setTrades={setTrades} setShifts={setShifts} setSGoals={setSGoals} setBGoals={setBGoals} setAccounts={setAccounts} setIncome={setIncome} setExpenses={setExpenses} categories={categories} setCategories={setCats} greetName={greetName} setGreetName={setGreetName} backupExport={backupExport} backupImport={backupImport} onResetAllData={()=>setConfirm({title:"Reset All Data",message:"This removes expenses, bills, debts, goals, household, recurring, notifications, chart history, categories, and settings from this device, and deletes synced cloud rows for this account. Your session stays signed in; PIN and other browser site data outside cleared keys are unchanged. Export JSON under Data first if you need a backup. This cannot be undone.",onConfirm:async()=>{const ok=await handleResetAllData();if(ok)setConfirm(null);},danger:true})} onResetOnboarding={()=>{try{localStorage.removeItem("fv_onboarded");}catch{}setOnboarded(false);}} onSignOut={authSession?handleSignOut:null} onSignIn={!authSession&&skipAuth?()=>{localStorage.removeItem("fv_skip_auth");setSkipAuth(false);}:null} userEmail={authSession?.user?.email} showToast={showToast} onLoadDemo={isDemoMode?undefined:requestLoadDemo} cloudSyncBump={cloudSyncMetaBump} supabaseConfigured={isSupabaseConfigured()} skipAuthMode={skipAuth} signedInForSync={!!authSession?.user?.id} netOnline={isOnline} syncing={syncing} syncRecoverableError={syncRecoverableError}/>}

        {tab==="notifs"&&(
          <div className="fu">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div><div className="fv-page-title" style={{fontSize:18}}>Notifications</div><div className="fv-page-sub">{notifs.filter(n=>!n.read).length} unread</div></div>
              <div style={{display:"flex",gap:8}}>{notifs.some(n=>!n.read)&&<button className="ba" onClick={()=>setNotifs(p=>p.map(n=>({...n,read:true})))} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:600,color:C.textMid,cursor:"pointer"}}>Mark all read</button>}{notifs.length>0&&<button className="ba" onClick={()=>{setNotifs([]);}} style={{background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:600,color:C.red,cursor:"pointer"}}>Clear</button>}</div>
            </div>
            {/* Push notification permission banner */}
            {(()=>{
              const perm=notifPermission();
              if(perm==="granted")return(
                <div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:16}}>🔔</span>
                  <div style={{flex:1,fontSize:13,color:C.green,fontWeight:500}}>Push notifications <strong>enabled</strong> — you'll get alerts for bills, budgets, and goals</div>
                </div>
              );
              if(perm==="denied")return(
                <div style={{background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:16}}>🔕</span>
                  <div style={{flex:1,fontSize:13,color:C.red}}>Push notifications blocked. Enable them in your browser settings to get bill reminders.</div>
                </div>
              );
              if(!notifSupported())return(
                <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.accent}}>💡 Add Trackfi to your home screen for full push notification support.</div>
              );
              return(
                <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"14px",marginBottom:14}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>Enable push notifications</div>
                  <div style={{fontSize:13,color:C.textLight,marginBottom:12,lineHeight:1.5}}>Get alerts for overdue bills, budget warnings, payday reminders, and goal completions — even when the app is closed.</div>
                  <button type="button" className="fv-btn-primary ba" onClick={async()=>{const r=await requestNotifPermission();if(r==="granted")showToast("Notifications enabled");else showToast("Notifications not enabled","error");}} style={{justifyContent:"center"}}>Enable notifications</button>
                </div>
              );
            })()}
            {/* Notification preferences */}
            <div style={{background:C.surface,borderRadius:16,padding:"4px 14px",marginBottom:14,border:`1px solid ${C.borderLight}`}}>
              <div style={{fontSize:11,fontWeight:700,color:C.textFaint,letterSpacing:.6,textTransform:"uppercase",padding:"10px 0 6px"}}>Alert Preferences</div>
              {[
                {k:"notifBills",    Icon:Calendar, label:"Bill reminders",      desc:"Overdue & due within 3 days"},
                {k:"notifBudget",   Icon:Package, label:"Budget warnings",     desc:"At 80% and over limit"},
                {k:"notifSavings",  Icon:Target, label:"Savings goals",       desc:"75% reached & goal complete"},
                {k:"notifPayday",   Icon:Wallet, label:"Payday reminders",    desc:"Today and tomorrow alerts"},
                {k:"notifMilestones",Icon:TrendingUp,label:"Net worth milestones",desc:"When you hit a new high"},
              ].map(({k,Icon,label,desc})=>(
                <div key={k} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.borderLight}`}}>
                  <div style={{width:32,height:32,borderRadius:8,background:C.surfaceAlt,border:`1px solid ${C.borderLight}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon size={16} color={C.textMid} strokeWidth={2}/></div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.text}}>{label}</div>
                    <div style={{fontSize:11,color:C.textLight}}>{desc}</div>
                  </div>
                  <button onClick={()=>setSettings(p=>({...p,[k]:p[k]===false?true:false}))}
                    style={{background:"none",border:"none",cursor:"pointer",color:settings[k]===false?C.borderLight:C.accent,padding:0,flexShrink:0}}>
                    {settings[k]===false?<ToggleLeft size={26}/>:<ToggleRight size={26}/>}
                  </button>
                </div>
              ))}
              <div style={{height:6}}/>
            </div>
            {notifs.length===0&&<Empty text="All clear — alerts will show here" icon={Bell}/>}
            {notifs.map(n=>{const S={danger:{bg:C.redBg,br:C.redMid,c:C.red,Icon:AlertCircle},warning:{bg:C.amberBg,br:C.amberMid,c:C.amber,Icon:AlertTriangle},success:{bg:C.greenBg,br:C.greenMid,c:C.positive,Icon:CheckCircle2},info:{bg:C.accentBg,br:C.accentMid,c:C.accent,Icon:Lightbulb}}[n.type]||{bg:C.bg,br:C.border,c:C.text,Icon:Bell};const NIcon=S.Icon;const ago=Date.now()-n.time;const ta=ago<60000?"just now":ago<3600000?Math.floor(ago/60000)+"m ago":ago<86400000?Math.floor(ago/3600000)+"h ago":Math.floor(ago/86400000)+"d ago";return(<div key={n.id} className="fv-card" style={{background:n.read?C.surface:S.bg,border:`1.5px solid ${n.read?C.border:S.br}`,padding:"13px 14px",marginBottom:8}}><div style={{display:"flex",gap:10,alignItems:"flex-start"}}><div className="fv-icon-tile-sm" style={{background:S.c+"14"}}><NIcon size={18} color={S.c} strokeWidth={2}/></div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:n.read?C.textMid:S.c}}>{n.title}</div><div style={{fontSize:12,color:C.textLight,marginTop:3,lineHeight:1.4}}>{n.body}</div><div style={{fontSize:11,color:C.textLight,marginTop:4}}>{ta}</div></div>{!n.read&&<div style={{width:8,height:8,borderRadius:"50%",background:S.c,flexShrink:0,marginTop:4}}/>}</div><div style={{display:"flex",gap:7,marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`}}><button className="ba" onClick={()=>setNotifs(p=>p.map(x=>x.id===n.id?{...x,read:true}:x))} style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 0",color:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer"}}>Dismiss</button><button className="ba" onClick={()=>setNotifs(p=>p.filter(x=>x.id!==n.id))} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.textLight,cursor:"pointer",display:"flex",alignItems:"center"}}><X size={13}/></button></div></div>);})}
          </div>
        )}
      </div>

      {monthlySummary&&<div style={{position:"fixed",inset:0,background:"rgba(10,22,40,.7)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setMonthlySummary(null)}>
        <div style={{background:"#fff",borderRadius:24,width:"100%",maxWidth:400,padding:28,boxShadow:"0 32px 80px rgba(0,0,0,.3)"}} onClick={e=>e.stopPropagation()}>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{width:56,height:56,borderRadius:14,background:C.accentBg,border:`1px solid ${C.accentMid}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><BarChart2 size={28} color={C.accent} strokeWidth={2}/></div>
            <div className="fv-page-title" style={{fontSize:22,textAlign:"center"}}>{monthlySummary.month} recap</div>
            <div style={{fontSize:13,color:C.textLight,marginTop:4}}>Here's how last month went</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            {[
              ["Total Spent",fmt(monthlySummary.total),monthlySummary.prevTotal>0&&monthlySummary.total>monthlySummary.prevTotal?C.red:C.green],
              ["Transactions",String(monthlySummary.txnCount),C.accent],
              ["Savings Rate",monthlySummary.savRate.toFixed(0)+"%",monthlySummary.savRate>=20?C.green:monthlySummary.savRate>=10?C.amber:C.red],
              ["Top Category",monthlySummary.topCat||"—",C.purple],
            ].map(([l,v,c])=>(
              <div key={l} style={{background:C.surfaceAlt,borderRadius:14,padding:"12px 14px"}}>
                <div style={{fontSize:10,color:C.textLight,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{l}</div>
                <div style={{fontFamily:MF,fontWeight:800,fontSize:15,color:c||C.text}}>{v}</div>
              </div>
            ))}
          </div>
          {monthlySummary.prevTotal>0&&<div style={{background:monthlySummary.total>monthlySummary.prevTotal?C.redBg:C.greenBg,border:`1px solid ${monthlySummary.total>monthlySummary.prevTotal?C.redMid:C.greenMid}`,borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:13,color:monthlySummary.total>monthlySummary.prevTotal?C.red:C.green,fontWeight:500}}>
            {monthlySummary.total>monthlySummary.prevTotal
              ?"You spent "+fmt(monthlySummary.total-monthlySummary.prevTotal)+" more than the month before"
              :"You spent "+fmt(monthlySummary.prevTotal-monthlySummary.total)+" less than the month before"}
          </div>}
          <button type="button" className="fv-btn-primary ba" onClick={()=>setMonthlySummary(null)} style={{justifyContent:"center",fontFamily:MF}}>Done</button>
        </div>
      </div>}
      {toast&&<div role="status" aria-live={toast.type==="error"?"assertive":"polite"} aria-atomic="true" style={{position:"fixed",bottom:88,left:"50%",transform:"translateX(-50%)",zIndex:200,background:toast.type==="success"?C.green:toast.type==="error"?C.red:C.navy,color:"#fff",borderRadius:14,padding:"12px 18px",fontSize:13,fontWeight:600,boxShadow:"0 8px 32px rgba(10,22,40,.25),0 2px 8px rgba(10,22,40,.15)",display:"flex",alignItems:"center",gap:10,maxWidth:340,animation:"slideUp .22s cubic-bezier(.22,1,.36,1)",backdropFilter:"blur(8px)",letterSpacing:.1,cursor:"pointer"}} onClick={()=>setToast(null)}>
        <span>{toast.type==="success"?"✓":toast.type==="error"?"✗":"·"} {toast.msg}</span>
        {toast.action&&<button onClick={e=>{e.stopPropagation();toast.action.fn();setToast(null);}} style={{background:"rgba(255,255,255,.22)",border:"none",borderRadius:8,padding:"3px 10px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0,marginLeft:4}}>{toast.action.label}</button>}
      </div>}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"min(640px, 100vw)",boxSizing:"border-box",background:"rgba(255,255,255,.88)",backdropFilter:"blur(32px)",WebkitBackdropFilter:"blur(32px)",borderTop:`1px solid rgba(226,229,238,.5)`,display:"flex",padding:"10px max(8px, env(safe-area-inset-left)) max(14px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-right))",zIndex:100,boxShadow:"0 -1px 0 rgba(10,22,40,.04),0 -12px 40px rgba(10,22,40,.07)",overflowX:"hidden"}}>
        {NAV.map(n=>{const active=n.id==="more"?isMoreTab||tab==="more":tab===n.id;return(
          <button key={n.id} className="ba" onClick={()=>navTo(n.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:active?"rgba(99,102,241,.08)":"transparent",border:"none",cursor:"pointer",color:active?C.accent:C.textFaint,position:"relative",borderRadius:12,padding:"4px 12px 6px",transition:"all .18s"}}>
            {n.id==="chat"?(
              <div className="fv-chat-fab">
                <n.icon size={18} color="#fff" strokeWidth={2.2}/>
              </div>
            ):(
              <div style={{position:"relative"}}><n.icon size={21} strokeWidth={active?2.4:1.6}/>{n.badge&&n.badge>0&&<div style={{position:"absolute",top:-4,right:-6,width:16,height:16,background:C.red,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff",border:"2px solid #fff"}}>{n.badge>9?"9+":n.badge}</div>}</div>
            )}
            <span style={{fontSize:10,fontWeight:active?700:500}}>{n.label}</span>
          </button>
        );})}
      </div>

      {modal==="expense"&&<Modal title="Log Expense" icon={Wallet} onClose={cl} onSubmit={submit} submitLabel="Add Expense" error={formError}><FI label="Name" placeholder="Coffee, groceries, gas..." value={form.name||""} onChange={e=>{ff("name",e.target.value);if(!form.category){const t=e.target.value.toLowerCase().trim();const mc=window._merchantCats||{};if(mc[t]){ff("category",mc[t]);}else{const catMap={"Groceries":["grocery","groceries","publix","kroger","walmart","costco","trader joe","aldi","whole foods","market"],"Fast Food":["mcdonald","burger","wendy","chipotle","taco bell","subway","chick","popeyes","kfc","domino","sonic"],"Restaurants":["restaurant","sushi","dinner out","doordash","ubereats","grubhub","dine"],"Coffee":["starbucks","dunkin","coffee","latte","espresso","cafe","cold brew","dutch bros"],"Gas":["gas","shell","bp","chevron","exxon","fuel","wawa","sheetz","quiktrip"],"Rideshare":["uber","lyft","taxi","ride"],"Subscriptions":["netflix","hulu","spotify","apple music","amazon prime","disney","hbo","membership","subscription"],"Health / Medical":["doctor","pharmacy","cvs","walgreens","medicine","dental","therapy","copay","clinic"],"Gym / Fitness":["gym","planet fitness","fitness","yoga","crossfit","peloton","workout"],"Grooming / Haircuts":["haircut","barber","salon","nails","manicure","wax","spa","sephora","ulta"],"Clothing":["clothes","shoes","nike","adidas","h&m","zara","nordstrom","fashion"],"Entertainment":["movie","game","steam","concert","ticket","bowling","bar","club"],"Travel":["hotel","airbnb","flight","airline","vacation","booking"],"Pets":["pet","petco","petsmart","vet","dog food","cat food"],"Shopping":["amazon","target","best buy","home depot","ikea","walmart","tj maxx"]};for(const[cat,kws]of Object.entries(catMap)){if(kws.some(k=>t.includes(k))){ff("category",cat);break;}}}}}}/><div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)} autoFocus={!!form.name}/><FI half label="Date" type="date" value={form.date||todayStr()} onChange={e=>ff("date",e.target.value)}/></div><FS label="Category" options={categories.map(c=>c.name)} value={form.category||""} onChange={e=>ff("category",e.target.value)}/><FS label="Paid from" options={PAID_FROM_OPTIONS.map(k=>({value:k,label:PAID_FROM_FS_LABELS[k]}))} value={normalizePaidFrom(form.paidFrom||settings.defaultExpensePaidFrom)} onChange={e=>{ff("paidFrom",e.target.value);const v=normalizePaidFrom(e.target.value);if(v==="credit")ff("creditDebtId",pickDefaultCreditDebtId(settings,debts)||"");else ff("creditDebtId","");ff("bankAccountId",pickDefaultBankAccountId(v,accounts,settings)||"");}}/>{normalizePaidFrom(form.paidFrom||settings.defaultExpensePaidFrom)==="credit"&&cardDebtsList(debts).length>1&&<FS label="Which card" options={cardDebtsList(debts).map(d=>({value:String(d.id),label:d.name+" — "+fmt(parseFloat(d.balance||0))+" principal"}))} value={String(form.creditDebtId||"")} onChange={e=>ff("creditDebtId",e.target.value)}/>}{normalizePaidFrom(form.paidFrom||settings.defaultExpensePaidFrom)==="credit"&&cardDebtsList(debts).length===0&&<div style={{fontSize:12,color:C.red,marginBottom:12,lineHeight:1.45}}>Add each card under <strong>More → Debt</strong> and set type to <strong>Credit card</strong> before charging here.</div>}{normalizePaidFrom(form.paidFrom||settings.defaultExpensePaidFrom)==="checking"&&cashAccountsByKind(accounts,"checking").length>1&&<FS label="Which checking" options={cashAccountsByKind(accounts,"checking").map(a=>({value:String(a.id),label:(a.name||"Checking")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.bankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"")} onChange={e=>ff("bankAccountId",e.target.value)}/>}{normalizePaidFrom(form.paidFrom||settings.defaultExpensePaidFrom)==="savings"&&cashAccountsByKind(accounts,"savings").length>1&&<FS label="Which savings" options={cashAccountsByKind(accounts,"savings").map(a=>({value:String(a.id),label:(a.name||"Savings")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.bankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"")} onChange={e=>ff("bankAccountId",e.target.value)}/>}<FI label="Notes" placeholder="Optional" value={form.notes||""} onChange={e=>ff("notes",e.target.value)}/>
        {household.enabled&&household.members.length>1&&<div style={{marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Assign to</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[{id:"shared",name:"Shared",emoji:"🏠"},...household.members].map(m=>(
              <button key={m.id} onClick={()=>ff("owner",m.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:99,border:`1.5px solid ${(form.owner||"shared")===m.id?C.accent:C.border}`,background:(form.owner||"shared")===m.id?C.accentBg:"#fff",cursor:"pointer",fontSize:12,fontWeight:(form.owner||"shared")===m.id?700:400,color:(form.owner||"shared")===m.id?C.accent:C.textMid}}>
                <span>{m.emoji}</span><span>{m.name}</span>
              </button>
            ))}
          </div>
        </div>}<div style={{padding:"9px 12px",borderRadius:10,background:C.accentBg,border:`1px solid ${C.accentMid}`,marginTop:10,fontSize:12,color:C.accent,lineHeight:1.5}}>🔄 For auto-logged recurring expenses (Netflix, rent, etc.), use <strong>More → Recurring</strong>.</div></Modal>}
      {modal==="bill"&&<Modal title="Add Bill" icon={CalendarClock} onClose={cl} onSubmit={submit} submitLabel="Add Bill" accent={C.amber} error={formError}><FI label="Bill Name" placeholder="Rent, Electric, Netflix..." value={form.name||""} onChange={e=>ff("name",e.target.value)}/><div className="modal-field-row"><FI half label="Amount ($)" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)}/><FI half label="Due Date" type="date" value={form.dueDate||""} onChange={e=>ff("dueDate",e.target.value)}/></div><FS label="Recurring" options={["Weekly","Bi-weekly","Monthly","Quarterly","Annual","One-time"]} value={form.recurring||""} onChange={e=>ff("recurring",e.target.value)}/><FS label="Pay from (when you mark paid)" options={PAID_FROM_OPTIONS.map(k=>({value:k,label:PAID_FROM_FS_LABELS[k]}))} value={normalizePaidFrom(form.paidFrom||settings.defaultBillPaidFrom)} onChange={e=>{ff("paidFrom",e.target.value);const v=normalizePaidFrom(e.target.value);if(v==="credit")ff("creditDebtId",pickDefaultCreditDebtId(settings,debts)||"");else ff("creditDebtId","");ff("bankAccountId",pickDefaultBankAccountId(v,accounts,settings)||"");}}/>{normalizePaidFrom(form.paidFrom||settings.defaultBillPaidFrom)==="credit"&&cardDebtsList(debts).length>1&&<FS label="Which card pays this bill" options={cardDebtsList(debts).map(d=>({value:String(d.id),label:d.name+" — "+fmt(parseFloat(d.balance||0))+" principal"}))} value={String(form.creditDebtId||"")} onChange={e=>ff("creditDebtId",e.target.value)}/>}{normalizePaidFrom(form.paidFrom||settings.defaultBillPaidFrom)==="credit"&&cardDebtsList(debts).length===0&&<div style={{fontSize:12,color:C.red,marginBottom:12,lineHeight:1.45}}>Add each card under <strong>More → Debt</strong> (type: <strong>Credit card</strong>) first.</div>}{normalizePaidFrom(form.paidFrom||settings.defaultBillPaidFrom)==="checking"&&cashAccountsByKind(accounts,"checking").length>1&&<FS label="Which checking account" options={cashAccountsByKind(accounts,"checking").map(a=>({value:String(a.id),label:(a.name||"Checking")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.bankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"")} onChange={e=>ff("bankAccountId",e.target.value)}/>}{normalizePaidFrom(form.paidFrom||settings.defaultBillPaidFrom)==="savings"&&cashAccountsByKind(accounts,"savings").length>1&&<FS label="Which savings account" options={cashAccountsByKind(accounts,"savings").map(a=>({value:String(a.id),label:(a.name||"Savings")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.bankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"")} onChange={e=>ff("bankAccountId",e.target.value)}/>}{household.enabled&&household.members.length>1&&<div style={{marginBottom:8}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Paid by</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[{id:"shared",name:"Shared",emoji:"🏠"},...household.members].map(m=>(<button key={m.id} onClick={()=>ff("paidBy",m.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:99,border:`1.5px solid ${(form.paidBy||"shared")===m.id?C.amber:C.border}`,background:(form.paidBy||"shared")===m.id?"#FFFBEB":"#fff",cursor:"pointer",fontSize:12,fontWeight:(form.paidBy||"shared")===m.id?700:400,color:(form.paidBy||"shared")===m.id?C.amber:C.textMid}}><span>{m.emoji}</span><span>{m.name}</span></button>))}</div></div>}<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:`1px solid ${C.border}`,marginTop:4}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>Auto-Pay</div><div style={{fontSize:12,color:C.textLight,lineHeight:1.4}}>Badge only — does not mark paid or move money. You still tap paid when it clears.</div></div><button type="button" onClick={()=>ff("autoPay",!form.autoPay)} style={{background:"none",border:"none",cursor:"pointer",color:form.autoPay?C.accent:C.borderLight,padding:0,display:"flex"}}>{form.autoPay?<ToggleRight size={30}/>:<ToggleLeft size={30}/>}</button></div></Modal>}
      {modal==="debt"&&<Modal title="Add Debt" icon={CreditCard} onClose={cl} onSubmit={submit} submitLabel="Track Debt" accent={C.red} wide error={formError}><FI label="Name" placeholder="Car loan, Chase Sapphire, Amex..." value={form.name||""} onChange={e=>ff("name",e.target.value)}/><FS label="Debt type" options={[{value:"loan",label:"Loan / installment / other"},{value:"credit_card",label:"💳 Credit card (charges go here)"}]} value={form.debtKind==="credit_card"?"credit_card":"loan"} onChange={e=>ff("debtKind",e.target.value)}/><div className="modal-field-row"><FI half label="Balance ($)" type="number" value={form.balance||""} onChange={e=>ff("balance",e.target.value)}/><FI half label="Original ($)" type="number" value={form.original||""} onChange={e=>ff("original",e.target.value)}/></div><div className="modal-field-row"><FI half label="Rate %" type="number" value={form.rate||""} onChange={e=>ff("rate",e.target.value)}/><FI half label="Min Payment ($)" type="number" value={form.minPayment||""} onChange={e=>ff("minPayment",e.target.value)}/></div>{form.debtKind!=="credit_card"&&<><div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"10px 14px",marginTop:10,marginBottom:8,fontSize:12,color:C.textMid,lineHeight:1.45}}>Loans with a min. payment can add a matching <strong>monthly bill</strong> automatically. Marking that bill paid updates this loan’s balance (principal portion).</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0"}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>Add monthly bill</div><div style={{fontSize:11,color:C.textLight}}>Same amount as min. payment · Bills tab</div></div><button type="button" className="ba" onClick={()=>ff("addLoanBill",!(form.addLoanBill!==false))} style={{background:"none",border:"none",cursor:"pointer",padding:0,color:form.addLoanBill!==false?C.accent:C.borderLight}}>{form.addLoanBill!==false?<ToggleRight size={30}/>:<ToggleLeft size={30}/>}</button></div>{form.addLoanBill!==false&&parseFloat(form.minPayment||0)>0&&<><FI label="First bill due" type="date" value={form.loanBillDueDate||todayStr()} onChange={e=>ff("loanBillDueDate",e.target.value)}/><FS label="Bill pays from" options={PAID_FROM_OPTIONS.filter(k=>k!=="credit"&&k!=="none").map(k=>({value:k,label:PAID_FROM_FS_LABELS[k]}))} value={normalizePaidFrom(form.billPaidFrom||settings.defaultBillPaidFrom||"checking")} onChange={e=>{ff("billPaidFrom",e.target.value);ff("billBankAccountId",pickDefaultBankAccountId(normalizePaidFrom(e.target.value),accounts,settings)||"");}}/>{normalizePaidFrom(form.billPaidFrom||settings.defaultBillPaidFrom||"checking")==="checking"&&cashAccountsByKind(accounts,"checking").length>1&&<FS label="Which checking" options={cashAccountsByKind(accounts,"checking").map(a=>({value:String(a.id),label:(a.name||"Checking")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.billBankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"")} onChange={e=>ff("billBankAccountId",e.target.value)}/>}{normalizePaidFrom(form.billPaidFrom||settings.defaultBillPaidFrom||"checking")==="savings"&&cashAccountsByKind(accounts,"savings").length>1&&<FS label="Which savings" options={cashAccountsByKind(accounts,"savings").map(a=>({value:String(a.id),label:(a.name||"Savings")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.billBankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"")} onChange={e=>ff("billBankAccountId",e.target.value)}/>}</>}</>}<div style={{marginTop:12}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Chart color</div><div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{DEBT_PALETTE.map(hex=>{const auto=DEBT_PALETTE[debts.length%DEBT_PALETTE.length];const sel=(form.color&&isValidHexColor(form.color)?form.color.trim():auto).toLowerCase();return(<button key={hex} type="button" className="ba" onClick={()=>ff("color",hex)} aria-label={hex} style={{width:28,height:28,borderRadius:8,background:hex,border:`2px solid ${sel===hex.toLowerCase()?C.accent:C.border}`,cursor:"pointer",padding:0}}/>);})}</div><FI label="Custom (#hex)" placeholder="Optional — overrides swatch" value={form.color||""} onChange={e=>ff("color",e.target.value)}/><div style={{fontSize:11,color:C.textLight,marginTop:6,lineHeight:1.4}}>Pie chart & debt list dots. Empty = next color in rotation ({DEBT_PALETTE[debts.length%DEBT_PALETTE.length]}).</div></div></Modal>}
      {modal==="bgoal_home"&&<Modal title="Spending Envelope" icon={Target} onClose={cl} onSubmit={()=>{if(!form.category||!form.limit)return;setBGoals(p=>[...p,{id:Date.now(),...form}]);cl();}} submitLabel="Add Envelope" accent={C.purple}><div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.accent,lineHeight:1.5}}>
        💡 Variable expenses like gas, haircuts, groceries. These reserve money in your safe-to-spend before you log them.
      </div>
      <FS label="Category" options={categories.map(c=>c.name)} value={form.category||""} onChange={e=>ff("category",e.target.value)}/><FI label="Note (optional)" placeholder="e.g. haircuts ~2x/month" value={form.note||""} onChange={e=>ff("note",e.target.value)}/><FI label="Monthly Budget ($)" type="number" placeholder="e.g. 150" value={form.limit||""} onChange={e=>ff("limit",e.target.value)}/></Modal>}
      {modal==="receipt"&&<Modal title="Add from Photo" icon={Scan} onClose={cl} accent={C.purple}><div style={{textAlign:"center",padding:"10px 0 20px"}}><div style={{width:64,height:64,borderRadius:18,background:C.purpleBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><Scan size={30} color={C.purple}/></div><div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:C.text,marginBottom:6}}>Add from Photo</div><div style={{fontSize:12,color:C.textMid,marginBottom:16,lineHeight:1.5}}>Take or choose a photo — you'll fill in the expense details after.</div><label style={{display:"block",background:C.purple,borderRadius:12,padding:"13px 0",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:10}}>📷 Take Photo<input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{const file=e.target.files[0];if(!file)return;cl();om("expense",{name:"Receipt",amount:"",category:"Misc",date:todayStr()});}}/></label><label style={{display:"block",background:C.purpleBg,border:`1px solid ${C.purpleMid}`,borderRadius:12,padding:"13px 0",color:C.purple,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:10}}>🖼 Choose from Library<input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const file=e.target.files[0];if(!file)return;cl();om("expense",{name:"Receipt",amount:"",category:"Misc",date:todayStr()});}}/></label><button className="ba" onClick={cl} style={{background:C.bg,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"12px 0",color:C.textMid,fontWeight:600,fontSize:14,cursor:"pointer",width:"100%"}}>Cancel</button></div></Modal>}
            {modal==="simulator"&&debts.length>0&&(()=>{
        const rows=simRowsFromDebts(debts);
        const tm=rows.filter(r=>r.bal>0.01).reduce((s,r)=>s+r.min,0);
        const ex=Math.max(0,Number(extraPayDebt)||0);
        const sn=simulateMultiDebtPayoff(rows,{strategy:"snowball",extraMonthly:ex,maxMonths:600});
        const av=simulateMultiDebtPayoff(rows,{strategy:"avalanche",extraMonthly:ex,maxMonths:600});
        const minBase=simulateMultiDebtPayoff(rows,{strategy:"avalanche",extraMonthly:0,maxMonths:600});
        const diff=Math.max(0,sn.totalInterest-av.totalInterest);
        const fmtMo=m=>!m||m>=600?"∞":m<12?m+"mo":Math.floor(m/12)+"y "+(m%12)+"mo";
        const avRoad=av;
        return(
          <Modal title="Payoff Simulator" icon={Calculator} onClose={cl} accent={C.green} wide>
            <div style={{fontSize:12,color:C.textLight,lineHeight:1.55,marginBottom:14,padding:"10px 12px",background:C.surfaceAlt,borderRadius:12,border:`1px solid ${C.border}`}}>
              Uses <strong>APR÷12</strong> for this preview. Logged payments still use <strong>actual/365</strong> on loans. Each month: pay every open debt's minimum, then send what's left (including the slider) to the strategy. Paid-off debts drop out of the minimum total.
            </div>
            <div style={{background:C.navy,borderRadius:14,padding:16,marginBottom:14,color:"#fff"}}>
              <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",marginBottom:4}}>TOTAL DEBT</div>
              <div style={{fontFamily:MF,fontSize:26,fontWeight:800,color:C.red}}>{fmt(sumDebtsPrincipalAndAccrued(debts))}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.45)",marginTop:6,lineHeight:1.45}}>
                Active minimums now: <strong>{fmt(tm)}/mo</strong>
                <br/>
                Minimums + high-rate first, no extra: {minBase.debtFree?<><strong>{fmtMo(minBase.months)}</strong> · {fmt(minBase.totalInterest)} est. interest</>:"raise payments on at least one debt"}
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5}}>Extra monthly (after mins)</div>
                <div style={{fontFamily:MF,fontWeight:800,fontSize:18,color:C.accent}}>{ex>0?"+"+fmt(ex):"$0"}</div>
              </div>
              <input type="range" min="0" max="1000" step="25" value={extraPayDebt} onChange={e=>setExtraPayDebt(parseFloat(e.target.value)||0)} style={{width:"100%",accentColor:C.accent,cursor:"pointer",marginBottom:6}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textFaint}}><span>$0</span><span>$500</span><span>$1,000</span></div>
              <div style={{marginTop:8,fontSize:12,color:C.textLight}}>Cash to debt (est.): <span style={{fontWeight:700,color:C.text}}>{fmt(tm+ex)}/mo</span></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,158px),1fr))",gap:10,marginBottom:14,width:"100%",minWidth:0,boxSizing:"border-box"}}>
              {[{label:"🔥 Avalanche",sub:"Highest APR first",r:av,c:C.green},{label:"❄️ Snowball",sub:"Smallest balance first",r:sn,c:C.accent}].map(s=>(
                <div key={s.label} style={{background:C.surface,border:`1.5px solid ${s.c}44`,borderRadius:14,padding:14,borderTop:`3px solid ${s.c}`,minWidth:0,boxSizing:"border-box"}}>
                  <div style={{fontFamily:MF,fontWeight:800,fontSize:13,color:s.c,marginBottom:2}}>{s.label}</div>
                  <div style={{fontSize:11,color:C.textLight,marginBottom:10}}>{s.sub}</div>
                  <div style={{marginBottom:6}}>
                    <div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:2}}>DEBT FREE</div>
                    <div style={{fontFamily:MF,fontWeight:800,fontSize:18,color:C.text}}>{fmtMo(s.r.months)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:2}}>INTEREST (est.)</div>
                    <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.red}}>{s.r.debtFree?fmt(s.r.totalInterest):"—"}</div>
                  </div>
                </div>
              ))}
            </div>
            {diff>0.01&&<div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:12,padding:"11px 14px",fontSize:13,color:C.green,fontWeight:500}}>💡 At +{fmt(ex)}/mo, avalanche saves <strong>{fmt(diff)}</strong> vs snowball</div>}
            {avRoad.milestones.length>0&&ex>0&&(
              <div style={{marginTop:12}}>
                <div style={{fontSize:11,fontWeight:700,color:C.slate,marginBottom:6}}>First payoffs (avalanche + extra)</div>
                <div style={{fontSize:12,color:C.text,lineHeight:1.65}}>
                  {avRoad.milestones.slice(0,5).map((m,i)=>(<div key={String(m.id)+"_"+i}>Month {m.month}: <strong>{m.name}</strong></div>))}
                </div>
              </div>
            )}
          </Modal>
        );
      })()} 

      {showImport&&<BankImportModal categories={categories} expenses={expenses} setExpenses={setExpenses} household={household} showToast={showToast} onClose={()=>setShowImport(false)}/>}
      {showExport&&<ExportModal expenses={expenses} bills={bills} debts={debts} accounts={accounts} income={income} savingsGoals={savingsGoals} budgetGoals={budgetGoals} trades={trades} shifts={shifts} categories={categories} appName={appName} greetName={greetName} tradingAccount={tradingAccount} onClose={()=>setShowExport(false)}/>}
      {paycheckDepCtx&&<PaycheckDepositModal ctx={paycheckDepCtx} onClose={()=>setPaycheckDepCtx(null)} accounts={accounts} income={income} settings={settings} setAccounts={setAccounts} setIncome={setIncome} setSettings={setSettings} showToast={showToast}/>}
      {confirm&&<ConfirmDialog title={confirm.title} message={confirm.message} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)} danger={confirm.danger}/>}
      {editItem&&editItem.type==="expense"&&<EditModal item={editItem} categories={categories} household={household} debts={debts} accounts={accounts} settings={settings} onSave={u=>{const oldA=parseFloat(editItem.data.amount)||0;const newA=parseFloat(u.amount)||0;const oldP=normalizePaidFrom(editItem.data.paidFrom);const newP=normalizePaidFrom(u.paidFrom);const oldC=editItem.data.creditDebtId?String(editItem.data.creditDebtId):"";const newC=newP==="credit"?(String(u.creditDebtId||"").trim()||pickDefaultCreditDebtId(settings,debts)):"";const oldB=resolveBankAccountIdForExpense(oldP,editItem.data.bankAccountId,accounts,settings);const newB=resolveBankAccountIdForExpense(newP,u.bankAccountId,accounts,settings);if(newP==="credit"&&cardDebtsList(debts).length&&!newC){showToast("Select which credit card, or set a default in Settings \u2192 Defaults","error");return false;}if(newP==="credit"&&!cardDebtsList(debts).length){showToast("Add a credit card debt first","error");return false;}if(oldA>0&&oldP!=="none"&&!canReverseExpenseBalance(oldP,oldC,editItem.data.bankAccountId,accounts,debts,settings)){showToast("Can\u2019t save: this expense no longer has valid pay-from targets for balance moves. Delete it or fix Accounts/Debt first.","error");return false;}applyRefund(oldP,oldA,oldC||undefined,oldB||undefined);applySpend(newP,newA,newC||undefined,newB||undefined);setExpenses(p=>p.map(x=>x.id===editItem.data.id?{...x,...u,paidFrom:newP,creditDebtId:newP==="credit"?newC:undefined,bankAccountId:newB||undefined}:x));showToast("✓ Expense updated");setEditItem(null);return true;}} onDelete={()=>setConfirm({title:"Delete Expense",message:`Delete "${editItem.data.name}"?`,onConfirm:()=>{const ob=resolveBankAccountIdForExpense(normalizePaidFrom(editItem.data.paidFrom),editItem.data.bankAccountId,accounts,settings);const oa=parseFloat(editItem.data.amount)||0;const opf=normalizePaidFrom(editItem.data.paidFrom);const ocbd=canReverseExpenseBalance(opf,editItem.data.creditDebtId,editItem.data.bankAccountId,accounts,debts,settings);if(applyRefund&&oa>0&&ocbd)applyRefund(opf,oa,editItem.data.creditDebtId||undefined,ob||undefined);else if(oa>0&&!ocbd)showToast("Deleted — balances unchanged (expense had invalid pay-from).","error");setExpenses(p=>p.filter(x=>x.id!==editItem.data.id));setEditItem(null);setConfirm(null);},danger:true})} onClose={()=>setEditItem(null)}/>}
      {editItem&&editItem.type==="bill"&&<EditModal item={editItem} categories={categories} debts={debts} accounts={accounts} settings={settings} onSave={u=>saveBillEditWithBalanceAdjustment(editItem.data,u)} onDelete={()=>setConfirm({title:"Delete Bill",message:`Delete "${editItem.data.name}"?`,onConfirm:()=>{const rev=reversePaidBillForDelete(editItem.data);setBills(p=>p.filter(x=>x.id!==editItem.data.id));if(editItem.data.paid)showToast(rev.reversed?"Bill removed — payment reversed":"Bill removed — balances unchanged (pay-from no longer resolves)","error");setEditItem(null);setConfirm(null);},danger:true})} onClose={()=>setEditItem(null)}/>}
      {editItem&&editItem.type==="debt"&&<EditModal key={editItem.data.id} item={editItem} categories={categories} household={household} debts={debts} bills={bills} accounts={accounts} settings={settings} onSave={u=>{const {addLoanBill,loanBillDueDate,billPaidFrom,billBankAccountId,...debtRest}=u;const did=editItem.data.id;const dk=u.debtKind==="credit_card"?"credit_card":"loan";const resetIntAcc=dk!=="credit_card"&&(parseFloat(debtRest.balance||0)!==parseFloat(editItem.data.balance||0)||String(debtRest.rate??"")!==String(editItem.data.rate??""));const becameLoan=dk!=="credit_card"&&editItem.data.debtKind==="credit_card";setDebts(p=>p.map(x=>String(x.id)!==String(did)?x:(()=>{const row={...x,...debtRest};if(resetIntAcc||becameLoan){row.loanInterestAsOfDate=todayStr();delete row.loanAccruedInterest;}return row;})()));setBills(p=>{if(dk==="credit_card")return p.filter(b=>String(b.linkedDebtId)!==String(did));const mp=parseFloat(u.minPayment||0);const want=addLoanBill!==false&&mp>0;if(want){let bpf=normalizePaidFrom(billPaidFrom||settings.defaultBillPaidFrom||"checking");if(bpf==="credit")bpf="checking";const bch=cashAccountsByKind(accounts,"checking");const bsv=cashAccountsByKind(accounts,"savings");let bbid="";if(bpf==="checking"){if(bch.length>=2)bbid=String(billBankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"");else if(bch.length===1)bbid=String(bch[0].id);}else if(bpf==="savings"){if(bsv.length>=2)bbid=String(billBankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"");else if(bsv.length===1)bbid=String(bsv[0].id);}const due=loanBillDueDate||todayStr();const payName=(u.name||"Loan")+" payment";const linked=p.filter(b=>String(b.linkedDebtId)===String(did));if(linked.length)return p.map(b=>String(b.linkedDebtId)!==String(did)?b:{...b,name:payName,amount:String(mp),dueDate:due,paidFrom:bpf,...(bbid?{bankAccountId:bbid}:{})});return[...p,{id:Date.now(),name:payName,amount:String(mp),dueDate:due,recurring:"Monthly",paid:false,autoPay:false,paidBy:"me",paidFrom:bpf,linkedDebtId:String(did),...(bbid?{bankAccountId:bbid}:{})}];}return p.filter(b=>String(b.linkedDebtId)!==String(did));});showToast("✓ Debt updated");setEditItem(null);}} onDelete={()=>setConfirm({title:"Delete Debt",message:`Delete "${editItem.data.name}"?`,onConfirm:()=>deleteDebtSafely(editItem.data),danger:true})} onClose={()=>setEditItem(null)}/>}
      {modal==="quickactions"&&(()=>{
        const QA_ALL=[{id:"expense",l:"Log Expense"},{id:"receipt",l:"Add Photo"},{id:"bill",l:"Add Bill"},{id:"debt",l:"Add Debt"},{id:"simulator",l:"Payoff Sim"},{id:"budget",l:"Envelopes"},{id:"shift",l:"Log Shift"},{id:"trade",l:"Log Trade"},{id:"savings",l:"Add Goal"},{id:"networth",l:"Net Worth"},{id:"insights",l:"Insights"},{id:"paycheck",l:"Paycheck"},{id:"health",l:"Health"},{id:"bills_nav",l:"Bills"},{id:"calendar_nav",l:"Calendar"},{id:"recurring_nav",l:"Recurring"}];
        const active=settings.quickActions||["expense","bill","paycheck","debt","health","budget","savings","insights"];
        const toggle=id=>setSettings(p=>{const cur=p.quickActions||["expense","bill","paycheck","debt","health","budget","savings","insights"];const next=cur.includes(id)?cur.filter(x=>x!==id):cur.length<8?[...cur,id]:cur;return{...p,quickActions:next};});
        return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setModal(null)}><div style={{background:C.surface,borderRadius:"24px 24px 0 0",padding:28,width:"100%",maxWidth:480,maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}><div className="fv-page-title" style={{fontSize:18,marginBottom:4}}>Customize quick actions</div><div className="fv-page-sub" style={{marginBottom:18}}>Choose up to 8 actions</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>{QA_ALL.map(q=>{const on=active.includes(q.id);const Ico=QA_ICON[q.id]||Plus;return(<button key={q.id} type="button" className="ba" onClick={()=>toggle(q.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:14,border:`2px solid ${on?C.accent:C.border}`,background:on?C.accentBg:C.surface,cursor:"pointer",textAlign:"left"}}><Ico size={18} color={on?C.accent:C.textMid} strokeWidth={2}/><span style={{fontSize:13,fontWeight:700,color:on?C.accent:C.text}}>{q.l}</span>{on&&<Check size={14} color={C.accent} style={{marginLeft:"auto",flexShrink:0}}/>}</button>);})}</div><button type="button" className="fv-btn-primary ba" onClick={()=>setModal(null)} style={{justifyContent:"center",fontFamily:MF}}>Done</button></div></div>);
      })()}
    </div>
    </TrackfiRechartsProvider>
  );
}

if(typeof window!=="undefined"){
  window.addEventListener("error",function(e){
    console.error("GLOBAL ERROR:",e.message,e.filename,e.lineno,e.colno,e.error?.stack);
  });
}

export default function App(){
  return(
    <ErrorBoundary>
      <div style={{flex:1,minHeight:0,height:"100%",maxHeight:"100dvh",width:"100%",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <AppInner/>
      </div>
    </ErrorBoundary>
  );
}
