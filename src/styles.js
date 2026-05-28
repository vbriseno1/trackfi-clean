/**
 * Global CSS injected once at the root. Pure string so it can be tested or replaced without touching JSX.
 * Animations gracefully no-op under `prefers-reduced-motion`.
 */
export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{overflow-x:hidden;-webkit-text-size-adjust:100%;height:100%}
html,body{background:#F0F2F8;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overscroll-behavior:none;width:100%;overflow-x:hidden;height:100%;margin:0}
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
@keyframes pop{0%{transform:scale(.9);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
@keyframes shimmer{0%{background-position:-200px 0}100%{background-position:calc(200px + 100%) 0}}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
.fu{animation:fadeUp .26s cubic-bezier(.22,1,.36,1) both}
.si{animation:slideIn .22s cubic-bezier(.22,1,.36,1) both}
.pop{animation:pop .28s cubic-bezier(.34,1.56,.64,1) both}
.ba{transition:all .15s cubic-bezier(.22,1,.36,1);cursor:pointer;-webkit-tap-highlight-color:transparent}
.ba:active{transform:scale(.96)!important;opacity:.8}
.hl:hover{box-shadow:0 8px 24px rgba(99,102,241,.14)!important;transform:translateY(-2px)!important}
.db{opacity:0;transition:opacity .15s}.rw:hover .db{opacity:1}
.blurred{filter:blur(8px);user-select:none;transition:filter .25s}
.unblurred{filter:none;transition:filter .25s}
.card{background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(10,22,40,.05),0 4px 12px rgba(10,22,40,.04);transition:box-shadow .2s,transform .15s}
.card:active{box-shadow:0 1px 2px rgba(10,22,40,.06)!important;transform:scale(.99)!important}
.glass{background:rgba(255,255,255,.8);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)}
.swipe-row{position:relative;overflow:hidden}
.swipe-content{transition:transform .22s cubic-bezier(.22,1,.36,1)}
.swipe-actions{position:absolute;right:0;top:0;bottom:0;display:flex;align-items:center}
textarea:focus,input:focus,select:focus{outline:none}
textarea:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #6366F1;outline-offset:1px}
button:focus-visible,a:focus-visible,.ba:focus-visible{outline:2px solid #6366F1;outline-offset:2px}
input,select,textarea{-webkit-appearance:none;max-width:100%}
button{-webkit-tap-highlight-color:transparent}
.fv-rechart-skel{background:rgba(100,116,139,.1);animation:pulse 1.4s ease-in-out infinite}
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
`;
