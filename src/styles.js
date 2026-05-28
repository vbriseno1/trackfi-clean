/**
 * Global CSS injected once at the root. Pure string so it can be tested or replaced without touching JSX.
 * Animations gracefully no-op under `prefers-reduced-motion`.
 */
export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{overflow-x:hidden;-webkit-text-size-adjust:100%;height:100%}
html,body{background:#F4F6F9;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overscroll-behavior:none;width:100%;overflow-x:hidden;height:100%;margin:0}
#root{min-height:100vh;min-height:100dvh;height:100%;width:100%;overflow-x:hidden;display:flex;flex-direction:column}
body.dark-mode{background:#0A1628}
html::-webkit-scrollbar,body::-webkit-scrollbar{width:0;height:0}
#fv-scroll{scrollbar-width:thin;scrollbar-color:rgba(100,116,139,.45) transparent}
#fv-scroll::-webkit-scrollbar{width:8px}
#fv-scroll::-webkit-scrollbar-thumb{background:rgba(100,116,139,.4);border-radius:4px}
#fv-scroll::-webkit-scrollbar-track{background:transparent}
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
input,select,button,textarea{font-family:'Inter',sans-serif}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes pop{0%{transform:scale(.98);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes shimmer{0%{background-position:-200px 0}100%{background-position:calc(200px + 100%) 0}}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
.fu{animation:fadeUp .26s cubic-bezier(.22,1,.36,1) both}
.si{animation:slideIn .22s cubic-bezier(.22,1,.36,1) both}
.pop{animation:pop .28s cubic-bezier(.34,1.56,.64,1) both}
.ba{transition:all .15s cubic-bezier(.22,1,.36,1);cursor:pointer;-webkit-tap-highlight-color:transparent}
.ba:active{transform:scale(.98)!important;opacity:.92}
.hl:hover{box-shadow:0 4px 16px rgba(15,23,42,.08)!important;transform:translateY(-1px)!important}
.db{opacity:0;transition:opacity .15s}.rw:hover .db{opacity:1}
.blurred{filter:blur(8px);user-select:none;transition:filter .25s}
.unblurred{filter:none;transition:filter .25s}
.card{background:#fff;border-radius:12px;border:1px solid #E2E8F0;box-shadow:0 1px 2px rgba(15,23,42,.04),0 1px 8px rgba(15,23,42,.04);transition:box-shadow .2s,border-color .2s}
.card:active{box-shadow:0 1px 2px rgba(15,23,42,.05)!important}
.glass{background:rgba(255,255,255,.8);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)}
.swipe-row{position:relative;overflow:hidden}
.swipe-content{transition:transform .22s cubic-bezier(.22,1,.36,1)}
.swipe-actions{position:absolute;right:0;top:0;bottom:0;display:flex;align-items:center}
textarea:focus,input:focus,select:focus{outline:none}
textarea:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #4F46E5;outline-offset:1px}
button:focus-visible,a:focus-visible,.ba:focus-visible{outline:2px solid #4F46E5;outline-offset:2px}
input,select,textarea{-webkit-appearance:none;max-width:100%}
button{-webkit-tap-highlight-color:transparent}
.fv-rechart-skel{background:linear-gradient(90deg,rgba(148,163,184,.08) 0%,rgba(148,163,184,.14) 50%,rgba(148,163,184,.08) 100%);background-size:200px 100%;animation:shimmer 1.2s ease-in-out infinite;border-radius:8px}
.fv-page-title{font-family:'Manrope',sans-serif;font-size:20px;font-weight:700;color:#0F172A;letter-spacing:-.25px;line-height:1.25}
.fv-page-sub{font-size:13px;color:#64748B;margin-top:4px;font-weight:400;line-height:1.45}
.fv-stat-label{font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.04em}
.fv-hero-panel{background:#0F172A;border-radius:16px;padding:20px;color:#fff;border:1px solid rgba(148,163,184,.12)}
@media (prefers-reduced-motion: reduce){
  .fu,.si,.pop{animation:none!important}
  .ba,.card,.swipe-content,.blurred,.unblurred{transition:none!important}
  .ba:active{transform:none!important;opacity:1!important}
  .card:active{transform:none!important}
  .hl:hover{transform:none!important}
  .fv-rechart-skel{animation:none!important}
}
/* Mobile-first: modals, onboarding, charts */
.modal-field-row{display:flex;flex-wrap:wrap;gap:12;align-items:flex-start;width:100%;min-width:0;box-sizing:border-box}
@media (max-width:440px){
  .modal-field-row .modal-fi-half{flex:1 1 100%!important;max-width:100%!important}
}
.onb-feature-grid{display:grid;grid-template-columns:1fr;gap:10px;width:100%}
@media (min-width:400px){
  .onb-feature-grid{grid-template-columns:1fr 1fr}
}
.onb-prof-pick{display:flex;flex-wrap:wrap;gap:8;margin-bottom:12;max-height:min(42vh,260px);overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px}
.insights-hero-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8}
@media (max-width:400px){
  .insights-hero-grid{grid-template-columns:1fr!important}
}
.debt-pie-row{display:flex;flex-wrap:wrap;align-items:flex-start;gap:12;width:100%;min-width:0;box-sizing:border-box}
@media (max-width:480px){
  .debt-pie-row{flex-direction:column;align-items:stretch}
}
.fv-chart-wrap{width:100%;max-width:100%;min-width:0;box-sizing:border-box;overflow-x:auto;-webkit-overflow-scrolling:touch}
.fv-card{background:#fff;border:1px solid #E2E8F0;border-radius:12px;box-shadow:0 1px 2px rgba(15,23,42,.04),0 1px 8px rgba(15,23,42,.04)}
.fv-section-card{background:#fff;border:1px solid #E2E8F0;border-radius:16px;box-shadow:0 1px 2px rgba(15,23,42,.04),0 1px 8px rgba(15,23,42,.04)}
.fv-icon-tile{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.fv-icon-tile-sm{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.fv-btn-primary{display:flex;align-items:center;gap:12px;width:100%;padding:14px 18px;border-radius:12px;border:none;background:#4F46E5;color:#fff;font-family:'Manrope',sans-serif;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 2px 8px rgba(79,70,229,.25);text-align:left}
.fv-btn-primary:disabled{background:#E2E8F0;color:#94A3B8;cursor:default;box-shadow:none}
.fv-btn-success{background:#047857;box-shadow:0 2px 8px rgba(4,120,87,.22)}
.fv-insight-card{background:#EEF2FF;border:1px solid #C7D2FE;border-radius:12px;padding:12px 14px;cursor:pointer;display:flex;gap:10px;align-items:flex-start}
.fv-auth-shell{min-height:100vh;background:linear-gradient(165deg,#0F172A 0%,#1E293B 58%,#334155 100%);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}
.fv-auth-shell-col{flex-direction:column;position:relative;overflow:hidden}
.fv-auth-logo{width:48px;height:48px;border-radius:14px;background:#4F46E5;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 6px 20px rgba(79,70,229,.35);flex-shrink:0}
.fv-avatar-chip{width:40px;height:40px;border-radius:50%;background:#4F46E5;display:flex;align-items:center;justify-content:center;font-family:'Manrope',sans-serif;font-weight:800;font-size:16px;color:#fff;flex-shrink:0}
.fv-chat-fab{width:36px;height:36px;border-radius:50%;background:#4F46E5;display:flex;align-items:center;justify-content:center;margin-top:-10px;margin-bottom:2px;box-shadow:0 4px 12px rgba(79,70,229,.35)}
.fv-offline-banner{background:#4F46E5;border-radius:16px;padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
/* ── Mobile-friendly layout (onboarding, settings, menus, all sub-pages) ── */
button.ba,.fv-btn-primary,.fv-menu-row,.fv-more-shortcut{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
@media (max-width:480px){
  html,body{font-size:16px}
  #fv-scroll input:not([type=checkbox]):not([type=radio]),#fv-scroll select,#fv-scroll textarea,.fv-auth-shell input,.fv-auth-shell select,.fv-onb-shell input{font-size:16px!important}
  .fv-page-title{font-size:18px}
  .fv-btn-primary{min-height:48px;padding:14px 16px}
}
.fv-view-root{width:100%;min-width:0;box-sizing:border-box}
/* Stat grids (home, trends, debt, paycheck, etc.) */
.fv-grid-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6;width:100%;min-width:0}
.fv-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8;width:100%;min-width:0}
.fv-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8;width:100%;min-width:0}
@media (max-width:520px){
  .fv-grid-4{grid-template-columns:repeat(2,minmax(0,1fr));gap:8}
}
@media (max-width:400px){
  .fv-grid-3,.fv-grid-2{grid-template-columns:1fr}
}
/* More tab: shortcuts + menu list */
.fv-more-shortcuts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8;margin-bottom:20;width:100%}
@media (max-width:380px){
  .fv-more-shortcuts{grid-template-columns:repeat(3,minmax(0,1fr))}
}
.fv-more-shortcut{min-height:72px;padding:12px 6px!important;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;border:none;cursor:pointer}
.fv-section-head{display:flex;align-items:baseline;gap:8;flex-wrap:wrap;margin-bottom:10}
.fv-section-head .fv-section-desc{flex:1 1 100%;font-size:11px;color:#64748B}
@media (min-width:420px){
  .fv-section-head .fv-section-desc{flex:1 1 auto}
}
.fv-menu-row{display:flex;align-items:center;gap:12;padding:14px 14px!important;min-height:52px;width:100%;text-align:left;border-radius:12px;cursor:pointer;box-sizing:border-box}
.fv-menu-row span.fv-menu-label{flex:1;min-width:0;font-size:14px;font-weight:600;overflow-wrap:anywhere}
/* Settings & account balance rows */
.fv-settings-card{background:#fff;border-radius:18px;box-shadow:0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04);padding:18px;margin-bottom:12px;width:100%;min-width:0;box-sizing:border-box}
.fv-settings-split{display:flex;gap:8;margin-bottom:14}
.fv-settings-split > *{flex:1;min-width:0}
@media (max-width:480px){
  .fv-settings-split{flex-direction:column}
}
.fv-field-row{display:flex;align-items:center;gap:10;flex-wrap:wrap;margin-bottom:8;width:100%;min-width:0}
.fv-field-row .fv-field-label{flex:1 1 140px;min-width:0;font-size:13px}
.fv-field-row .fv-num-input{flex:1 1 100px;min-width:0;max-width:100%;width:120px;background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:10px;padding:10px 12px;font-size:16px;font-weight:700;text-align:right;outline:none;box-sizing:border-box}
@media (max-width:480px){
  .fv-field-row{align-items:stretch}
  .fv-field-row .fv-num-input{width:100%;text-align:left}
}
.fv-settings-actions{display:flex;gap:8;flex-wrap:wrap}
.fv-settings-actions > *{flex:1 1 140px;min-height:44px}
@media (max-width:400px){
  .fv-settings-actions{flex-direction:column}
  .fv-settings-actions > *{flex:1 1 100%;width:100%}
}
.fv-toggle-row{display:flex;justify-content:space-between;align-items:center;gap:12;padding:12px 0;border-bottom:1px solid #E2E8F0;min-height:52px}
.fv-toggle-row:last-child{border-bottom:none}
/* Onboarding wizard */
.fv-onb-shell{min-height:100dvh;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.fv-onb-card{background:#fff;border-radius:24px;width:100%;max-width:500;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden;max-height:min(92dvh,calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 16px));display:flex;flex-direction:column}
.fv-onb-scroll{padding:22px clamp(14px,4vw,24px) max(24px,calc(16px + env(safe-area-inset-bottom)));overflow-y:auto;-webkit-overflow-scrolling:touch;flex:1;min-height:0}
.fv-onb-balance-row{display:flex;align-items:center;gap:12;flex-wrap:wrap;padding:11px 14px;width:100%;min-width:0;box-sizing:border-box}
.fv-onb-balance-row input{flex:1 1 96px;min-width:88px;max-width:100%;box-sizing:border-box}
@media (max-width:400px){
  .fv-onb-balance-row input{width:100%;flex:1 1 100%;text-align:left}
}
.fv-onb-chip{min-height:44px;padding:10px 14px!important}
.fv-onb-select-card{min-height:56px}
/* Cash account editor rows */
.fv-cash-row{display:flex;flex-wrap:wrap;gap:8;align-items:center;margin-bottom:8;width:100%;min-width:0}
.fv-cash-row input,.fv-cash-row select{min-height:44px;box-sizing:border-box}
.fv-cash-row input[type=text],.fv-cash-row input:not([type]){flex:1 1 140px;min-width:0}
@media (max-width:480px){
  .fv-cash-row input[type=text],.fv-cash-row input:not([type]),.fv-cash-row select,.fv-cash-row input[type=number]{flex:1 1 100%;width:100%!important}
  .fv-cash-row button{min-height:44px}
}
/* Auth screen */
.fv-auth-inner{width:100%;max-width:400;box-sizing:border-box}
@media (max-width:480px){
  .fv-auth-shell{padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))!important}
  .fv-auth-inner{padding:24px 18px 20px!important;border-radius:20px!important}
}
/* Bottom nav + toast */
.fv-bottom-nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:min(640px,100vw);box-sizing:border-box;z-index:100}
.fv-nav-btn{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;border:none;cursor:pointer;border-radius:12px;padding:6px 4px 8px;min-height:52px}
.fv-nav-label{font-size:10px;font-weight:500;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fv-toast{position:fixed;z-index:200;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));bottom:max(88px,calc(78px + env(safe-area-inset-bottom)));transform:none!important;max-width:none;margin:0 auto}
/* Sheet modals */
.fv-sheet{border-radius:24px 24px 0 0;width:100%;max-height:min(92dvh,calc(100dvh - env(safe-area-inset-top) - 8px));overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:max(28px,env(safe-area-inset-bottom))!important;box-sizing:border-box}
.fv-sheet-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10;width:100%;min-width:0}
@media (max-width:400px){
  .fv-sheet-grid-2{grid-template-columns:1fr}
}
.fv-scroll-x{display:flex;gap:6;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4;scrollbar-width:none;max-width:100%}
.fv-scroll-x::-webkit-scrollbar{display:none}
.fv-hero-stat{min-width:0;padding:9px 8px}
.fv-hero-stat .fv-hero-val{font-size:clamp(11px,3.2vw,13px);overflow-wrap:anywhere;word-break:break-word}
/* Account cards stack inputs on narrow screens */
.fv-acct-card{display:flex;flex-wrap:wrap;align-items:center;gap:12;row-gap:10;min-width:0;box-sizing:border-box;width:100%}
.fv-acct-card input[type=number]{flex:1 1 120px;min-width:0;max-width:100%}
@media (max-width:400px){
  .fv-acct-card input[type=number]{width:100%;flex:1 1 100%;text-align:left;font-size:16px}
}
.fv-member-grid{display:grid;gap:10;margin-bottom:16;width:100%;min-width:0}
@media (max-width:480px){
  .fv-member-grid{grid-template-columns:1fr!important}
}
.fv-chat-panel{flex:1;min-height:0;display:flex;flex-direction:column;height:calc(100dvh - 150px);max-height:calc(100dvh - 150px)}
@media (max-width:480px){
  .fv-chat-panel{height:calc(100dvh - 130px);max-height:calc(100dvh - 130px)}
}
`;
