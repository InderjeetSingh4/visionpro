import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const _snapCanvas = document.createElement("canvas");
const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

const PALETTE = ["#0071e3","#34c759","#ff3b30","#ff9500","#af52de","#5ac8fa","#ff2d55","#a2845e","#30b0c7","#32ade6"];
const clr = (s) => { let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))%PALETTE.length; return PALETTE[h]; };

/* ═══════════════════════════════════════════════════════════════════════════
   SUPABASE  — configured via frontend/.env
═══════════════════════════════════════════════════════════════════════════ */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const getSB = () => Promise.resolve(supabase);

// History stored locally keyed by supabase user ID
const getHistory = (uid) => {
  const byId = JSON.parse(localStorage.getItem(`vp_hist_${uid}`) || "[]");
  return byId;
};
const saveHistory = (uid,h) => localStorage.setItem(`vp_hist_${uid}`, JSON.stringify(h));

/* ═══════════════════════════════════════════════════════════════════════════
   PREMIUM APPLE-STYLE CSS
═══════════════════════════════════════════════════════════════════════════ */
const G = `
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;1,14..32,300&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

/* ── Light mode ── */
:root{
  --page:       #f5f5f7;
  --panel:      #ffffff;
  --white:      #ffffff;
  --border:     #d2d2d7;
  --border2:    #e5e5ea;
  --text:       #1d1d1f;
  --text2:      #3f3f46;
  --muted:      #86868b;
  --muted2:     #a1a1aa;
  --blue:       #0071e3;
  --blue-bg:    #eff6ff;
  --green:      #34c759;
  --green-bg:   #f0fdf4;
  --red:        #ff3b30;
  --red-bg:     #fef2f2;
  --orange:     #ff9500;
  --accent:     #1d1d1f;
  --btn-bg:     #1d1d1f;
  --btn-text:   #ffffff;
  --btn-hover:  #2d2d2d;
  --tab-track:  #e5e5ea;
  --tab-pill:   #ffffff;
  --tab-shadow: 0 2px 8px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.02);
  --border-h:   #86868b;
  --primary:    #1d1d1f;
  --primary-fg: #ffffff;
  --font:       'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  --mono:       'JetBrains Mono',monospace;
  --radius:     12px;
  --radius-lg:  16px;
}

/* ── Dark mode — Apple visionOS depth hierarchy ── */
[data-theme="dark"]{
  --page:       #000000;
  --panel:      #1c1c1e;
  --white:      #1c1c1e;
  --border:     #38383a;
  --border2:    #48484a;
  --border-h:   #636366;
  --text:       #f5f5f7;
  --text2:      #ebebf0cc;
  --muted:      #86868b;
  --muted2:     #636366;
  --blue:       #0a84ff;
  --blue-bg:    rgba(10,132,255,.12);
  --green:      #30d158;
  --green-bg:   rgba(48,209,88,.12);
  --red:        #ff453a;
  --red-bg:     rgba(255,69,58,.12);
  --orange:     #ff9f0a;
  --accent:     #ffffff;
  --btn-bg:     #ffffff;
  --btn-text:   #000000;
  --btn-hover:  #e5e5ea;
  --primary:    #ffffff;
  --primary-fg: #000000;
  --tab-track:  #2c2c2e;
  --tab-pill:   #3a3a3c;
  --tab-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 0 0.5px rgba(255,255,255,0.06);
}

/* ── Smooth global theme transition ── */
html,body,#root,
.ws,.ws-bar,.ws-left,.ws-center,.ws-right,
.ws-log,.ws-chip,.ws-stat,.ws-classes,.ws-detlog,.ws-meta-bar,
.dash,.dash-bar,.dash-kpi,.dash-mode,.dash-item,
.auth-card,.auth-inp,
.l-feat,.l-stats,.l-stat,.l-foot{
  transition: background-color 0.4s ease, border-color 0.4s ease, color 0.4s ease, box-shadow 0.4s ease;
}

html,body,#root{height:100%;background:var(--page);color:var(--text);font-family:var(--font);-webkit-font-smoothing:antialiased;}
button{cursor:pointer;font-family:var(--font);}
input{font-family:var(--font);}
::-webkit-scrollbar{width:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:99px;}

/* ── Theme toggle button ── */
.theme-btn{
  width:32px;height:32px;border-radius:99px;
  background:var(--white);border:1px solid var(--border2);
  display:flex;align-items:center;justify-content:center;
  font-size:.82rem;transition:all .2s ease;
  flex-shrink:0; color: var(--text);
}
.theme-btn:hover{background:var(--tab-track);transform:scale(1.05);}
.theme-btn:active{transform:scale(.92);}

@keyframes fadeUp   {from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn   {from{opacity:0}to{opacity:1}}
@keyframes scaleIn  {from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideL   {from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
@keyframes chipIn   {from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
@keyframes spin     {to{transform:rotate(360deg)}}
@keyframes shimmer  {0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes pulse    {0%,100%{opacity:1}50%{opacity:.3}}
@keyframes float    {0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes liveblink{0%,100%{opacity:1}50%{opacity:.15}}
@keyframes countUp  {from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin360  {from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

@media(max-width:640px){
  .auth-card{padding:28px 22px;}
}
`;

const LC = `
.land{min-height:100vh;background:var(--page); transition: background-color 0.4s ease;}
.l-nav{
  height:56px;display:flex;align-items:center;justify-content:space-between;
  padding:0 32px;background:var(--panel);
  border-bottom:1px solid var(--border);
  position:sticky;top:0;z-index:100;
  transition:background .35s ease,border-color .35s ease;
}
.l-logo{display:flex;align-items:center;gap:9px;font-weight:700;font-size:1rem;color:var(--text);letter-spacing:-.02em;}
.l-logo-box{
  width:30px;height:30px;border-radius:9px;
  background:var(--text);display:flex;align-items:center;justify-content:center;
  font-size:.8rem;color:var(--page);
  transition:transform .3s ease;
}
.l-logo-box:hover{transform:rotate(-10deg) scale(1.12);}
.l-nav-r{display:flex;gap:8px;}
.l-nb{
  padding:7px 18px;border-radius:9px;font-size:.84rem;font-weight:500;
  border:1px solid var(--border2);background:var(--white);color:var(--text2);
  transition:all .18s;
}
.l-nb:hover{background:var(--tab-track);}
.l-nb.fill{background:var(--btn-bg);color:var(--btn-text);border-color:var(--btn-bg);font-weight:600;}
.l-nb.fill:hover{background:var(--btn-hover);}
.l-hero{max-width:960px;margin:0 auto;padding:100px 32px 64px;text-align:center;}
.l-badge{
  display:inline-flex;align-items:center;gap:7px;
  padding:5px 14px;border-radius:99px;
  background:var(--white);border:1px solid var(--border);
  font-size:.7rem;font-weight:600;color:var(--muted);letter-spacing:.04em;text-transform:uppercase;
  margin-bottom:28px;animation:fadeUp .5s ease both;
  box-shadow:0 1px 4px rgba(0,0,0,.04);
}
.l-badge-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 2s infinite;}
.l-hero-h{
  font-size:clamp(2.6rem,6vw,4.8rem);font-weight:700;
  letter-spacing:-.04em;line-height:1.04;color:var(--text);
  margin-bottom:20px;animation:fadeUp .55s .05s ease both;
}
.l-hero-sub{
  font-size:1rem;color:var(--muted);line-height:1.75;
  max-width:480px;margin:0 auto 36px;
  animation:fadeUp .55s .1s ease both;
}
.l-ctas{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;animation:fadeUp .55s .15s ease both;}
.l-cta{
  padding:13px 32px;border-radius:12px;font-size:.92rem;font-weight:600;
  background:var(--btn-bg);color:var(--btn-text);border:none;
  transition:all .26s ease;letter-spacing:-.01em;
  box-shadow:0 1px 3px rgba(0,0,0,.1),0 4px 16px rgba(0,0,0,.15);
}
.l-cta:hover{background:var(--btn-hover);transform:translateY(-2px);box-shadow:0 2px 6px rgba(0,0,0,.12),0 10px 28px rgba(0,0,0,.18);}
.l-cta:active{transform:scale(.97) translateY(0);transition:all .1s;}
.l-cta.sec{background:var(--white);color:var(--text2);border:1px solid var(--border2);box-shadow:none;}
.l-cta.sec:hover{background:var(--tab-track);transform:translateY(-2px);}
.l-stats{
  display:flex;max-width:640px;margin:56px auto 0;
  border-radius:var(--radius-lg);background:var(--white);
  border:1px solid var(--border);
  box-shadow:0 2px 16px rgba(0,0,0,.05);
  animation:fadeUp .6s .22s ease both;overflow:hidden;
}
.l-stat{flex:1;padding:20px 24px;text-align:center;border-right:1px solid var(--border);}
.l-stat:last-child{border-right:none;}
.l-stat:hover{background:var(--tab-track);}
.l-sv{font-size:1.65rem;font-weight:700;letter-spacing:-.04em;color:var(--text);}
.l-sl{font-size:.63rem;color:var(--muted2);margin-top:3px;text-transform:uppercase;letter-spacing:.06em;font-weight:500;}
.l-feats{max-width:960px;margin:80px auto 0;padding:0 32px 88px;}
.l-feats-eyebrow{font-size:.68rem;font-weight:700;color:var(--muted2);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;}
.l-feats-h{font-size:2rem;font-weight:700;letter-spacing:-.04em;margin-bottom:40px;color:var(--text);}
.l-feats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;}
.l-feat{
  padding:24px;border-radius:var(--radius-lg);background:var(--white);
  border:1px solid var(--border);transition:all .25s;
  animation:fadeUp .5s ease both;cursor:default;
}
.l-feat:hover{transform:translateY(-5px);box-shadow:0 12px 32px rgba(0,0,0,.08);border-color:var(--border2);}
.l-feat:hover .l-feat-icon{transform:scale(1.12) rotate(-6deg);}
.l-feat-icon{
  width:40px;height:40px;border-radius:11px;margin-bottom:14px;
  display:flex;align-items:center;justify-content:center;font-size:1.1rem;
  background:var(--page);border:1px solid var(--border);transition:transform .25s;
}
.l-feat-t{font-weight:600;font-size:.9rem;margin-bottom:6px;color:var(--text);letter-spacing:-.01em;}
.l-feat-d{font-size:.79rem;color:var(--muted);line-height:1.7;}
.l-foot{
  padding:28px 32px;border-top:1px solid var(--border);background:var(--panel);
  display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;
}
.l-foot-l{font-weight:700;font-size:.86rem;color:var(--text2);letter-spacing:-.01em;}
.l-foot-r{font-size:.73rem;color:var(--muted2);}

@media(max-width:640px){
  .l-nav{padding:0 16px;}
  .l-hero{padding:60px 20px 40px;}
  .l-hero-h{font-size:2.2rem;}
  .l-stats{flex-wrap:wrap;}
  .l-stat{min-width:45%;}
  .l-feats{padding:0 16px 60px;}
  .l-feats-grid{grid-template-columns:1fr;}
  .l-foot{padding:20px 16px;}
  .l-ctas{flex-direction:column;align-items:center;}
  .l-cta{width:100%;max-width:280px;text-align:center;}
}
`;

const AC = `
.auth-page {
  min-height:100vh; background:var(--page);
  display:flex; align-items:center; justify-content:center;
}
.auth-card {
  width:420px; max-width:calc(100vw - 32px);
  background:var(--white); border:1px solid var(--border); border-radius:14px;
  padding:40px; box-shadow:0 4px 24px rgba(0,0,0,.08);
  animation:scaleIn .35s ease both;
}
.auth-logo { display:flex; align-items:center; gap:8px; margin-bottom:28px; font-weight:700; font-size:.98rem; color:var(--text); }
.auth-logo-box {
  width:30px; height:30px; border-radius:7px; background:var(--text);
  display:flex; align-items:center; justify-content:center; font-size:.78rem; color:var(--page);
}
.auth-h { font-size:1.45rem; font-weight:700; letter-spacing:-.025em; margin-bottom:4px; color:var(--text); }
.auth-sub { font-size:.82rem; color:var(--muted); margin-bottom:22px; }
.auth-err {
  padding:9px 12px; border-radius:8px;
  background:var(--red-bg); border:1px solid rgba(220,38,38,.2); color:var(--red);
  font-size:.79rem; margin-bottom:12px;
}
.auth-lbl { display:block; font-size:.72rem; font-weight:600; color:var(--muted); margin-bottom:4px; letter-spacing:.02em; }
.auth-inp {
  width:100%; padding:10px 12px; border-radius:8px;
  background:var(--page); border:1.5px solid var(--border2);
  color:var(--text); font-size:.86rem; outline:none; margin-bottom:12px;
  transition:all .18s;
}
.auth-inp:focus { border-color:var(--blue); background:var(--white); box-shadow:0 0 0 3px rgba(0,113,227,.1); }
.auth-inp::placeholder { color:var(--muted2); }
.auth-btn {
  width:100%; padding:11px; border-radius:10px;
  font-size:.88rem; font-weight:700;
  background:var(--btn-bg); color:var(--btn-text); border:none;
  transition:all .26s ease; margin-top:4px;
  box-shadow:0 1px 3px rgba(0,0,0,.1),0 3px 10px rgba(0,0,0,.14);
}
.auth-btn:hover:not(:disabled){background:var(--btn-hover);transform:translateY(-1px);box-shadow:0 2px 6px rgba(0,0,0,.12),0 6px 18px rgba(0,0,0,.16);}
.auth-btn:active:not(:disabled){transform:scale(.97);transition:all .1s;}
.auth-btn:disabled { opacity:.38; cursor:not-allowed; }
.auth-div { display:flex; align-items:center; gap:9px; color:var(--muted2); font-size:.73rem; margin:16px 0; }
.auth-div::before,.auth-div::after { content:''; flex:1; height:1px; background:var(--border); }
.auth-sw { text-align:center; font-size:.79rem; color:var(--muted); }
.auth-sw button { background:none; border:none; color:var(--blue); font-weight:600; font-size:.79rem; padding:0; }
.auth-sw button:hover { text-decoration:underline; }
`;

const WC = `
/* ── shell ── */
.ws{display:flex;flex-direction:column;height:100vh;background:var(--page);overflow:hidden;}

/* ── topbar ── */
.ws-bar{
  height:52px;flex-shrink:0;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 20px;
  background:var(--white);
  border-bottom:1px solid var(--border);
  position:relative;z-index:200;
  transition:background .35s ease,border-color .35s ease;
  box-shadow:0 1px 0 var(--border);
}
.ws-bar-l{display:flex;align-items:center;gap:11px;}
.ws-bar-logo{
  width:28px;height:28px;border-radius:8px;
  background:var(--text);
  display:flex;align-items:center;justify-content:center;
  font-size:.72rem;color:var(--page);
  transition:transform .3s ease,background .35s ease;
  flex-shrink:0;cursor:default;
}
.ws-bar-logo:hover{transform:rotate(-12deg) scale(1.15);}
.ws-bar-title{font-size:.92rem;font-weight:600;letter-spacing:-.02em;color:var(--text);}
.ws-bar-r{display:flex;align-items:center;gap:6px;}

/* nav pills */
.ws-pill{
  display:inline-flex;align-items:center;gap:5px;
  padding:5px 13px;border-radius:8px;
  font-size:.74rem;font-weight:500;
  background:transparent;border:1px solid transparent;
  color:var(--muted);
  transition:background .2s ease,color .2s ease,border-color .2s ease;
  white-space:nowrap;cursor:pointer;
}
.ws-pill:hover{background:var(--tab-track);color:var(--text);}
.ws-pill.active{
  background:var(--text);color:var(--page);
  border-color:var(--text);font-weight:600;
}
.ws-pill.active:hover{opacity:.88;}

/* profile dropdown */
.ws-profile-wrap{position:relative;}
.ws-profile-panel{
  position:absolute;top:calc(100% + 10px);right:0;width:288px;
  background:var(--white);border:1px solid var(--border);
  border-radius:var(--radius-lg);
  box-shadow:0 20px 60px rgba(0,0,0,.12),0 4px 16px rgba(0,0,0,.06);
  z-index:300;animation:slideDown .22s ease both;
  overflow:hidden;
}
.ws-profile-header{
  padding:18px 18px 14px;
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;gap:13px;
  background:var(--tab-track);
}
.ws-profile-avatar{
  width:44px;height:44px;border-radius:50%;
  background:var(--text);
  display:flex;align-items:center;justify-content:center;
  font-size:1.05rem;font-weight:700;color:var(--page);flex-shrink:0;
  box-shadow:0 2px 8px rgba(0,0,0,.2);
}
.ws-profile-name{font-weight:600;font-size:.88rem;color:var(--text);margin-bottom:2px;letter-spacing:-.01em;}
.ws-profile-email{font-size:.72rem;color:var(--muted);word-break:break-all;}
.ws-profile-body{padding:12px;}
.ws-profile-row{
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 10px;border-radius:8px;margin-bottom:4px;
  background:var(--tab-track);border:1px solid var(--border);
}
.ws-profile-row-lbl{font-size:.7rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;}
.ws-profile-row-val{font-size:.77rem;color:var(--text2);font-weight:500;display:flex;align-items:center;gap:5px;}
.ws-profile-section-lbl{font-size:.63rem;font-weight:700;color:var(--muted2);letter-spacing:.08em;text-transform:uppercase;margin:10px 0 6px 2px;}
.ws-profile-save{
  width:100%;padding:9px;border-radius:8px;
  font-size:.8rem;font-weight:600;
  background:var(--btn-bg);color:var(--btn-text);border:none;
  transition:all .18s;margin-bottom:5px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:7px;
}
.ws-profile-save:hover:not(:disabled){background:var(--btn-hover);transform:translateY(-1px);}
.ws-profile-save:disabled{opacity:.35;cursor:not-allowed;}
.ws-profile-msg{font-size:.72rem;text-align:center;padding:3px 0;}
.ws-profile-msg.ok{color:var(--green);}
.ws-profile-msg.err{color:var(--red);}
.ws-profile-divider{height:1px;background:var(--border);margin:10px 0;}
.ws-profile-signout{
  width:100%;padding:9px;border-radius:8px;font-size:.8rem;font-weight:600;
  background:var(--red-bg);color:var(--red);border:1px solid rgba(220,38,38,.15);
  transition:all .18s;cursor:pointer;
}
.ws-profile-signout:hover{background:var(--red);color:#fff;transform:translateY(-1px);}
.ws-overlay-backdrop{position:fixed;inset:0;z-index:150;}

/* ── 3-col body ── */
.ws-body{display:flex;flex:1;overflow:hidden;padding:16px;gap:16px;align-items:stretch;min-height:0;}

/* ── LEFT panel ── */
.ws-left{
  width:220px;flex-shrink:0;
  background:var(--white);
  border-radius:var(--radius-lg);
  border:1px solid var(--border);
  box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 12px rgba(0,0,0,.03);
  display:flex;flex-direction:column;overflow:hidden;
}
.ws-left-scroll{flex:1;overflow-y:auto;padding:16px 14px;}
.ws-left-foot{padding:16px 14px;border-top:1px solid var(--border);background:var(--tab-track);}

/* section headings */
.ws-sec{
  display:flex;align-items:center;gap:6px;
  font-size:.65rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  color:var(--muted2);margin-bottom:9px;margin-top:4px;
}
.ws-sec svg{opacity:.5;flex-shrink:0;}

/* mode tabs - sliding pills restored */
.ws-mode-tabs{
  position:relative;display:flex;gap:0;margin-bottom:16px;
  background:var(--tab-track);border-radius:9px;padding:3px;
  z-index:1;
}
.ws-mode-bg{
  position:absolute;top:3px;bottom:3px;width:calc(50% - 3px);
  background:var(--tab-pill);border-radius:7px;
  box-shadow:var(--tab-shadow);
  transition:transform .3s cubic-bezier(.25,.8,.25,1);
  z-index:-1;
}
.ws-mode-tabs[data-idx="1"] .ws-mode-bg { transform:translateX(100%); }

.ws-mode-tab{
  flex:1;padding:6px 4px;border-radius:7px;
  font-size:.73rem;font-weight:600;
  border:none;background:transparent;color:var(--muted);
  transition:color .3s ease;
  text-align:center;cursor:pointer;
}
.ws-mode-tab:hover:not(.active){color:var(--text2);}
.ws-mode-tab.active{color:var(--text);}

/* cam buttons */
.ws-cam-btn{
  width:100%;display:flex;align-items:center;gap:9px;
  padding:9px 11px;border-radius:10px;
  font-size:.77rem;font-weight:500;
  background:var(--white);border:1px solid var(--border);color:var(--text2);
  transition:all .24s ease;margin-bottom:6px;cursor:pointer;
}
.ws-cam-btn:hover{background:var(--tab-track);border-color:var(--text);color:var(--text);transform:translateY(-1px);box-shadow:0 3px 10px rgba(0,0,0,.08);}
.ws-cam-btn:active{transform:scale(.97);transition:all .1s;}
.ws-cam-btn.active{
  background:var(--btn-bg);color:var(--btn-text);border-color:var(--btn-bg);
  box-shadow:0 1px 3px rgba(0,0,0,.12),0 3px 10px rgba(0,0,0,.16);
}

/* execute button */
.ws-exec{
  width:100%;padding:12px;border-radius:10px;
  font-size:.85rem;font-weight:600;letter-spacing:.005em;
  background:var(--tab-track);color:var(--muted2);border:none;
  transition:all .26s ease;
  position:relative;overflow:hidden;cursor:pointer;
}
.ws-exec.ready{
  background:var(--btn-bg);
  color:var(--btn-text);
  box-shadow:0 2px 6px rgba(0,0,0,.1);
}
.ws-exec.ready:hover{
  transform:translateY(-1px);
  box-shadow:0 4px 12px rgba(0,0,0,.15);
}
.ws-exec.ready:active{
  transform:scale(.97);
  box-shadow:0 1px 2px rgba(0,0,0,.1);
  transition:all .1s ease;
}
.ws-exec:disabled{opacity:.32;cursor:not-allowed;}
.ws-exec.danger{background:var(--red-bg);color:var(--red);border:1px solid rgba(220,38,38,.15);}
.ws-exec.danger:hover{background:var(--red);color:#fff;}
.ws-exec.danger:active{transform:scale(.97);}

/* ── CENTER panel ── */
.ws-center{
  flex:1;min-width:0;overflow-y:auto;
  display:flex;flex-direction:column;
  background:var(--white);
  border-radius:var(--radius-lg);
  border:1px solid var(--border);
  padding:20px;gap:20px;
  transition: background-color .4s ease, border-color .4s ease;
}

/* canvas card */
.ws-canvas-card{
  border-radius:14px;background:transparent;border:none;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  position:relative;overflow:hidden;transition:all .3s cubic-bezier(.25,.8,.25,1);
  width:100%;
  min-height:450px;
}
.ws-canvas-card.drop{
  border:2px dashed var(--muted);
  background:var(--page);
  cursor:pointer;
}
.ws-canvas-card.drop:hover{
  transform:translateY(-2px) scale(1.01);
  border-color:var(--text);
  border-style:solid;
  background:var(--panel);
  box-shadow:0 8px 24px rgba(0,0,0,.12);
}
.ws-canvas-card.dragging{
  background:var(--panel);
  border-color:var(--text);
  border-style:solid;
  transform:scale(1.008);
}
.ws-canvas-card.filled{border:none;cursor:default;overflow:visible;justify-content:flex-start;background:transparent;}

/* drop hint */
.ws-drop-hint{display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;}
.ws-drop-ring{
  width:64px;height:64px;border-radius:18px;
  background:var(--tab-track);border:1.5px solid var(--border);
  display:flex;align-items:center;justify-content:center;font-size:1.5rem;
  transition:all .32s ease;
  box-shadow:0 2px 8px rgba(0,0,0,.04);
}
.ws-canvas-card.drop:hover .ws-drop-ring{transform:scale(1.1) translateY(-4px);box-shadow:0 8px 20px rgba(0,0,0,.1);}
.ws-drop-title{font-size:.9rem;font-weight:600;color:var(--text2);letter-spacing:-.01em;}
.ws-drop-sub{font-size:.73rem;color:var(--muted2);}

/* spinner */
.ws-spin-wrap{display:flex;flex-direction:column;align-items:center;gap:12px; z-index:20; position:absolute; padding:24px; background:rgba(var(--panel),0.8); backdrop-filter:blur(8px); border-radius:12px;}
.ws-spinner{
  width:32px;height:32px;
  border:3px solid var(--border);border-top-color:var(--text);
  border-radius:50%;animation:spin .65s linear infinite;
}
.ws-spin-lbl{font-size:.82rem;font-weight:600;color:var(--text2);}

/* media outputs */
.ws-out-img{width:100%;max-height:55vh;object-fit:contain;display:block;border-radius:12px;}
.ws-out-video{width:100%;display:block;background:#000;border-radius:12px;max-width:100%;max-height:55vh;}
.ws-out-canvas{width:100%;height:100%;display:block;border-radius:12px;max-height:65vh;object-fit:contain;background:#000;}

/* live badges */
.ws-live{
  position:absolute;top:12px;left:12px;z-index:10;
  display:flex;align-items:center;gap:5px;
  padding:4px 10px;border-radius:6px;
  background:rgba(220,38,38,.85);color:#fff;
  font-size:.63rem;font-weight:700;letter-spacing:.05em;
  backdrop-filter:blur(8px);
}
.ws-rec{
  position:absolute;top:12px;right:12px;z-index:10;
  display:flex;align-items:center;gap:5px;
  padding:4px 10px;border-radius:6px;
  background:rgba(0,0,0,.5);color:rgba(255,255,255,.95);
  font-family:var(--mono);font-size:.62rem;
  backdrop-filter:blur(8px);
  border:1px solid rgba(255,255,255,.12);
}

/* webcam off */
.ws-cam-off{display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--muted2);text-align:center;pointer-events:none;}
.ws-cam-off .ico{font-size:2.2rem;opacity:.15;animation:float 4s ease infinite;}

/* error */
.ws-err{
  padding:10px 14px;border-radius:10px;
  background:var(--red-bg);border:1px solid rgba(220,38,38,.2);color:var(--red);
  font-size:.78rem;animation:fadeIn .2s ease both;flex-shrink:0;
}

/* meta bar */
.ws-meta-bar{
  display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;
  padding:11px 14px;
  border-radius:10px;background:var(--tab-track);border:1px solid var(--border);
  animation:fadeUp .3s ease both;flex-shrink:0;
}
.ws-meta-txt{font-size:.75rem;color:var(--muted);}
.ws-meta-txt strong{color:var(--text2);font-weight:600;}
.ws-meta-btns{display:flex;gap:6px;align-items:center;}
.ws-dl{
  padding:6px 13px;border-radius:7px;font-size:.73rem;font-weight:600;
  background:var(--white);border:1px solid var(--border2);color:var(--text2);
  transition:all .16s;cursor:pointer;
}
.ws-dl:hover{background:var(--tab-track);transform:translateY(-1px);}
.ws-snap{
  padding:6px 11px;border-radius:7px;font-size:.72rem;font-weight:600;
  background:var(--green-bg);border:1px solid rgba(22,163,74,.18);color:var(--green);
  transition:all .16s;cursor:pointer;
}
.ws-snap:hover{background:#dcfce7;}
.ws-refresh{
  padding:6px 11px;border-radius:7px;font-size:.73rem;font-weight:600;
  background:var(--white);border:1px solid var(--border2);color:var(--muted);
  transition:all .22s;display:inline-flex;align-items:center;gap:5px;cursor:pointer;
}
.ws-refresh:hover{background:var(--tab-track);color:var(--text);transform:translateY(-1px);}

/* stats */
.ws-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;flex-shrink:0;}
.ws-stat{
  padding:14px 10px;text-align:center;border-radius:11px;
  background:var(--white);border:1px solid var(--border);
  animation:countUp .4s ease both;transition:all .18s;
}
.ws-stat:hover{transform:translateY(-3px);box-shadow:0 6px 20px rgba(0,0,0,.07);}
.ws-stat-v{font-size:1.5rem;font-weight:700;letter-spacing:-.04em;color:var(--text);}
.ws-stat-l{font-size:.59rem;font-weight:600;color:var(--muted2);text-transform:uppercase;letter-spacing:.06em;margin-top:3px;}

/* chips */
.ws-classes{padding:13px;border-radius:11px;background:var(--white);border:1px solid var(--border);animation:fadeUp .35s ease both;flex-shrink:0;}
.ws-classes-hd{font-size:.61rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted2);margin-bottom:9px;}
.ws-chips{display:flex;flex-wrap:wrap;gap:6px;}
.ws-chip{
  display:inline-flex;align-items:center;gap:5px;
  padding:5px 10px;border-radius:99px;
  font-size:.73rem;font-weight:600;
  background:var(--tab-track);border:1px solid var(--border);color:var(--text2);
  animation:chipIn .3s ease both;transition:all .18s;
}
.ws-chip:hover{transform:scale(1.06);box-shadow:0 3px 8px rgba(0,0,0,.08);}
.ws-chip-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.ws-chip-n{font-family:var(--mono);font-size:.6rem;color:var(--muted);}

/* detection log */
.ws-detlog{padding:13px;border-radius:11px;background:var(--white);border:1px solid var(--border);animation:fadeUp .4s ease both;flex-shrink:0;}
.ws-detlog-hd{font-size:.61rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted2);margin-bottom:9px;}
.ws-detlog-row{display:flex;align-items:center;gap:9px;padding:5px 0;border-bottom:1px solid var(--border);}
.ws-detlog-row:last-child{border-bottom:none;}
.ws-detlog-lbl{flex:1;font-size:.77rem;font-weight:600;color:var(--text2);}
.ws-detlog-track{flex:2;height:4px;background:var(--tab-track);border-radius:99px;overflow:hidden;}
.ws-detlog-fill{height:100%;border-radius:99px;transition:width .6s ease;}
.ws-detlog-pct{font-family:var(--mono);font-size:.66rem;color:var(--muted);min-width:34px;text-align:right;}

/* ── RIGHT panel ── */
.ws-right{
  width:220px;flex-shrink:0;
  background:var(--white);
  border-radius:var(--radius-lg);
  border:1px solid var(--border);
  box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 12px rgba(0,0,0,.03);
  display:flex;flex-direction:column;overflow:hidden;
}
.ws-right-head{
  display:flex;align-items:center;gap:7px;
  padding:13px 14px;border-bottom:1px solid var(--border);
  font-size:.61rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted2);
  background:var(--tab-track);
}
.ws-right-body{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:7px;}
.ws-log{
  padding:9px 10px;border-radius:9px;
  border:1px solid var(--border);background:var(--tab-track);
  animation:slideL .25s ease both;transition:all .18s;
}
.ws-log:hover{background:var(--white);transform:translateX(-2px);box-shadow:0 2px 8px rgba(0,0,0,.05);}
.ws-log-t{font-family:var(--mono);font-size:.58rem;color:var(--muted2);margin-bottom:3px;font-weight:500;}
.ws-log-m{font-size:.73rem;color:var(--text2);line-height:1.5;}
.ws-log.success{background:var(--green-bg);border-color:rgba(22,163,74,.2);}
.ws-log.info{background:var(--blue-bg);border-color:rgba(37,99,235,.2);}
.ws-log.warn{background:#fffbeb;border-color:rgba(217,119,6,.2);}
.ws-log.error{background:var(--red-bg);border-color:rgba(220,38,38,.2);}

@media(max-width:900px){
  .ws-right{display:none;}
  .ws-left{width:180px;}
}
@media(max-width:640px){
  .ws{overflow:auto;}
  .ws-bar{padding:0 14px;height:48px;}
  .ws-body{flex-direction:column;padding:10px;gap:10px;overflow:visible;}
  .ws-left{width:100%;flex-shrink:0;}
  .ws-center{min-height:300px;}
  .ws-right{display:none;}
}
`;

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD CSS
═══════════════════════════════════════════════════════════════════════════ */
const DC = `
.dash{min-height:100vh;background:var(--page); transition: background-color 0.4s ease;}
.dash-bar{
  height:52px;display:flex;align-items:center;justify-content:space-between;
  padding:0 24px;
  background:var(--panel);
  border-bottom:1px solid var(--border);
  position:sticky;top:0;z-index:50;
}
.dash-title{font-weight:700;font-size:.92rem;letter-spacing:-.02em;display:flex;align-items:center;gap:8px;color:var(--text);}
.dash-btns{display:flex;gap:7px;}
.dash-btn{
  padding:6px 14px;border-radius:9px;font-size:.75rem;font-weight:600;
  background:var(--white);border:1px solid var(--border);color:var(--text2);
  transition:all .24s ease;cursor:pointer;
}
.dash-btn:hover{background:var(--tab-track);border-color:var(--border2);transform:translateY(-1px);}
.dash-btn:active{transform:scale(.97);transition:all .1s;}
.dash-body{padding:24px;max-width:1040px;margin:0 auto;}
.dash-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px;}
.dash-kpi{
  padding:20px;border-radius:var(--radius-lg);background:var(--white);
  border:1px solid var(--border);
  animation:fadeUp .45s ease both;transition:all .22s;
}
.dash-kpi:hover{transform:translateY(-4px);box-shadow:0 8px 28px rgba(0,0,0,.08);}
.dash-kpi-l{font-size:.61rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted2);margin-bottom:8px;}
.dash-kpi-v{font-size:1.9rem;font-weight:700;letter-spacing:-.05em;color:var(--text);}
.dash-kpi-v.b{color:var(--blue);}.dash-kpi-v.g{color:var(--green);}.dash-kpi-v.o{color:var(--orange);}
.dash-modes{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:22px;}
.dash-mode{
  padding:16px;border-radius:var(--radius);background:var(--white);
  border:1px solid var(--border);text-align:center;
  transition:all .18s;animation:fadeUp .45s ease both;cursor:default;
}
.dash-mode:hover{transform:translateY(-3px);box-shadow:0 6px 20px rgba(0,0,0,.07);}
.dash-mode-l{font-size:.72rem;color:var(--muted);margin-bottom:5px;}
.dash-mode-v{font-size:1.55rem;font-weight:700;letter-spacing:-.04em;color:var(--text);}
.dash-sec{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.dash-sec-t{font-size:.9rem;font-weight:700;letter-spacing:-.025em;color:var(--text);}
.dash-clear{
  padding:5px 12px;border-radius:7px;font-size:.71rem;font-weight:600;
  background:var(--red-bg);border:1px solid rgba(220,38,38,.2);color:var(--red);
  transition:all .18s;cursor:pointer;
}
.dash-clear:hover{background:var(--red);color:#fff;}
.dash-list{display:flex;flex-direction:column;gap:8px;}
.dash-item{
  display:flex;align-items:flex-start;gap:13px;padding:14px;
  border-radius:var(--radius-lg);background:var(--white);
  border:1px solid var(--border);
  animation:fadeUp .4s ease both;transition:all .22s;
}
.dash-item:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.08);border-color:var(--text);}
.dash-thumb{
  width:68px;height:52px;border-radius:9px;flex-shrink:0;
  background:var(--tab-track);border:1px solid var(--border);
  display:flex;align-items:center;justify-content:center;font-size:1.2rem;overflow:hidden;
}
.dash-thumb img{width:100%;height:100%;object-fit:cover;}
.dash-info{flex:1;min-width:0;}
.dash-row1{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:6px;}
.dash-tag{
  font-family:var(--mono);font-size:.59rem;text-transform:uppercase;
  padding:3px 8px;border-radius:5px;letter-spacing:.06em;font-weight:600;
}
.dash-tag.image{background:var(--blue-bg);color:var(--blue);border:1px solid rgba(37,99,235,.2);}
.dash-tag.video{background:rgba(255,149,0,0.1);color:var(--orange);border:1px solid rgba(255,149,0,.2);}
.dash-tag.webcam{background:var(--green-bg);color:var(--green);border:1px solid rgba(52,199,89,.2);}
.dash-time{font-size:.69rem;color:var(--muted2);}
.dash-chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:5px;}
.dash-chip{
  padding:3px 9px;border-radius:99px;font-size:.67rem;font-weight:600;
  background:var(--tab-track);border:1px solid var(--border);color:var(--text2);
}
.dash-total{font-size:.69rem;color:var(--muted2);}
.dash-empty{text-align:center;padding:72px 24px;color:var(--muted);}
.dash-empty-i{font-size:2.8rem;opacity:.13;margin-bottom:12px;animation:float 4s ease infinite;}
.dash-empty-t{font-size:.83rem;}
`;

/* ═══════════════════════════════════════════════════════════════════════════
   LANDING
═══════════════════════════════════════════════════════════════════════════ */
function LandingPage({ onOpenWorkspace, onGetStarted, theme, setTheme }) {
  return (
    <div className="land">
      <style>{LC}</style>
      <nav className="l-nav">
        <div className="l-logo"><div className="l-logo-box">👁</div>VisionPro</div>
        <div className="l-nav-r">
          <button className="theme-btn" onClick={()=>setTheme(theme==='light'?'dark':'light')} style={{marginRight: 10}}>{theme === 'dark' ? "☀️" : "🌙"}</button>
          <button className="l-nb fill" onClick={onGetStarted}>Get started</button>
        </div>
      </nav>
      <div className="l-hero">
        <div className="l-badge"><div className="l-badge-dot"/>YOLO11x · Real-time · 80 Classes</div>
        <h1 className="l-hero-h">Object detection,<br/>done right.</h1>
        <p className="l-hero-sub">Real-time AI for images, videos, and live streams. Works on every device.</p>
        <div className="l-ctas">
          <button className="l-cta" onClick={onOpenWorkspace}>Open Workspace →</button>
        </div>
        <div className="l-stats">
          {[["80","Classes"],["YOLO11x","Model"],["4 Modes","I·V·W·M"]].map(([v,l])=>(
            <div className="l-stat" key={l}><div className="l-sv">{v}</div><div className="l-sl">{l}</div></div>
          ))}
        </div>
      </div>
      <div className="l-feats">
        <div className="l-feats-eyebrow">Capabilities</div>
        <h2 className="l-feats-h">Everything you need.</h2>
        <div className="l-feats-grid">
          {[["🖼","Image Detection","Upload any image — bounding boxes, labels, confidence scores."],
            ["🎬","Video Analysis","ByteTrack: each unique object counted once across all frames."],
            ["📷","Live Webcam","Real-time YOLO11x on your webcam. Record with annotations baked in."],
            ["📱","Any Device","QR code pairing. iOS · Android · Windows · Mac."],
            ["📊","Detection History","Every session auto-saved with full class breakdowns."],
          ].map(([ic,t,d],i)=>(
            <div className="l-feat" key={t} style={{animationDelay:`${i*.07}s`}}>
              <div className="l-feat-icon">{ic}</div>
              <div className="l-feat-t">{t}</div>
              <div className="l-feat-d">{d}</div>
            </div>
          ))}
        </div>
      </div>
      <footer className="l-foot">
        <div className="l-foot-l">VisionPro</div>
        <div className="l-foot-r">Built by Inderjeet · YOLO11x · © 2026</div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD - Pulls from Supabase
═══════════════════════════════════════════════════════════════════════════ */
function Dashboard({ user, onBack, theme, setTheme }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const sb = await getSB();
      const { data, error } = await sb.from('history').select('*').eq('user_id', user.id).order('timestamp', { ascending: false });
      if (data) setHistory(data);
      setLoading(false);
    };
    fetchHistory();
  }, [user.id]);

  const handleClear = async () => {
    if(window.confirm("Clear all cloud history?")) {
      const sb = await getSB();
      await sb.from('history').delete().eq('user_id', user.id);
      setHistory([]);
    }
  };

  const total   = history.reduce((a,h)=>a+(h.total||0),0);
  const classes = [...new Set(history.flatMap(h=>Object.keys(h.detections||{})))].length;
  const byMode  = {image:0,video:0,webcam:0};
  history.forEach(h=>{if(byMode[h.mode]!==undefined)byMode[h.mode]++;});
  const fmt = iso=>new Date(iso).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});

  return (
    <div className="dash">
      <style>{DC}</style>
      <div className="dash-bar">
        <div className="dash-title">📊 Dashboard <span style={{fontWeight:400,fontSize:".74rem",color:"var(--muted)"}}>— {user.name}</span></div>
        <div className="dash-btns">
          <button className="theme-btn" onClick={()=>setTheme(theme==='light'?'dark':'light')} title="Toggle Theme">{theme==='dark' ? "☀️" : "🌙"}</button>
          <button className="dash-btn" onClick={onBack}>← Workspace</button>
        </div>
      </div>
      <div className="dash-body">
        <div className="dash-kpis">
          {[["Sessions",history.length,""],["Detected",total,"b"],["Classes",classes,"o"],["Images",byMode.image,"g"]].map(([l,v,c],i)=>(
            <div className="dash-kpi" key={l} style={{animationDelay:`${i*.07}s`}}>
              <div className="dash-kpi-l">{l}</div><div className={`dash-kpi-v ${c}`}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:".85rem",fontWeight:700,letterSpacing:"-.02em",marginBottom:9,color:"var(--text)"}}>Mode breakdown</div>
          <div className="dash-modes">
            {[["🖼 Image",byMode.image],["🎬 Video",byMode.video],["📷 Webcam",byMode.webcam]].map(([l,v])=>(
              <div className="dash-mode" key={l}><div className="dash-mode-l">{l}</div><div className="dash-mode-v">{v}</div></div>
            ))}
          </div>
        </div>
        <div className="dash-sec">
          <div className="dash-sec-t">Detection history</div>
          {history.length>0&&<button className="dash-clear" onClick={handleClear}>Clear all</button>}
        </div>
        {loading ? (
          <div style={{display:"flex",justifyContent:"center",padding:50}}><div className="qr-status-spin"/></div>
        ) : history.length===0
          ?<div className="dash-empty"><div className="dash-empty-i">📭</div><div className="dash-empty-t">No detections yet.</div></div>
          :<div className="dash-list">
            {[...history].map((item,i)=>(
              <div className="dash-item" key={i} style={{animationDelay:`${i*.04}s`}}>
                <div className="dash-thumb">{item.thumbnail?<img src={item.thumbnail} alt=""/>:<span>{item.mode==="image"?"🖼":item.mode==="video"?"🎬":"📷"}</span>}</div>
                <div className="dash-info">
                  <div className="dash-row1">
                    <span className={`dash-tag ${item.mode}`}>{item.mode}</span>
                    <span className="dash-time">{fmt(item.timestamp)}</span>
                  </div>
                  <div className="dash-chips">
                    {Object.entries(item.detections||{}).slice(0,6).map(([cls,n])=>(
                      <span key={cls} className="dash-chip" style={{borderColor:clr(cls)+"55",color:clr(cls)}}>{cls} ×{n}</span>
                    ))}
                    {Object.keys(item.detections||{}).length>6&&<span className="dash-chip">+{Object.keys(item.detections).length-6} more</span>}
                  </div>
                  <div className="dash-total">{item.total||0} objects · {Object.keys(item.detections||{}).length} classes</div>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTH PAGE  — Supabase powered
═══════════════════════════════════════════════════════════════════════════ */
function AuthPage({ onAuth, onBack, initMode="signup" }) {
  const [mode,   setMode]   = useState(initMode);
  const [screen, setScreen] = useState("form");
  const [name,   setName]   = useState("");
  const [email,  setEmail]  = useState("");
  const [pass,   setPass]   = useState("");
  const [newPw,  setNewPw]  = useState("");
  const [err,    setErr]    = useState("");
  const [info,   setInfo]   = useState("");
  const [busy,   setBusy]   = useState(false);

  useEffect(()=>{
    const hash = new URLSearchParams(window.location.hash.replace("#",""));
    const query = new URLSearchParams(window.location.search);
    const type = hash.get("type") || query.get("type");
    if(type==="recovery") {
      setScreen("reset-form");
      window.history.replaceState({},"",window.location.pathname);
    }
    if(type==="signup" || query.get("verified")==="1"){
      setMode("login"); setScreen("form");
      setInfo("✓ Email verified! You can now sign in.");
      window.history.replaceState({},"",window.location.pathname);
    }
  },[]);

  const submit = async () => {
    setErr(""); setInfo(""); setBusy(true);
    try {
      const sb = await getSB();
      if(mode==="signup"){
        if(!name.trim()){setErr("Enter your name.");return;}
        if(!email.includes("@")){setErr("Enter a valid email.");return;}
        if(pass.length<6){setErr("Password min 6 chars.");return;}

        const { data, error } = await sb.auth.signUp({
          email, password: pass,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: window.location.origin + "/?verified=1"
          }
        });
        if(error) { setErr(error.message); return; }

        if(data?.user?.identities?.length === 0){
          setErr("Account already exists. Sign in instead.");
          return;
        }
        if(data?.session){
          const u = { id: data.user.id, name: name.trim(), email: data.user.email, createdAt: data.user.created_at };
          onAuth(u);
        } else {
          setScreen("verify-sent");
        }

      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
        if(error){ setErr(error.message); return; }
        const meta = data.user?.user_metadata || {};
        const u = {
          id: data.user.id,
          name: meta.full_name || meta.name || email.split("@")[0],
          email: data.user.email,
          createdAt: data.user.created_at
        };
        onAuth(u);
      }
    } catch(e) {
      setErr(e.message || "Connection error. Check Supabase config.");
    } finally { setBusy(false); }
  };

  const sendReset = async () => {
    setErr(""); setBusy(true);
    try {
      const sb = await getSB();
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/#type=recovery"
      });
      if(error){ setErr(error.message); return; }
      setScreen("reset-sent");
    } catch(e){ setErr(e.message||"Error"); }
    finally{ setBusy(false); }
  };

  const doReset = async () => {
    setErr(""); setBusy(true);
    if(newPw.length<6){setErr("Password min 6 chars.");setBusy(false);return;}
    try {
      const sb = await getSB();
      const { error } = await sb.auth.updateUser({ password: newPw });
      if(error){ setErr(error.message); return; }
      setScreen("form"); setMode("login");
      setInfo("✓ Password updated! Sign in with your new password.");
    } catch(e){ setErr(e.message||"Error"); }
    finally{ setBusy(false); }
  };

  return (
    <div className="auth-page">
      <style>{AC}</style>
      <div className="auth-card">
        <div className="auth-logo"><div className="auth-logo-box">👁</div>VisionPro</div>

        {screen==="verify-sent" && (
          <>
            <div style={{textAlign:"center",padding:"10px 0 18px"}}>
              <div style={{fontSize:"2.2rem",marginBottom:10}}>📧</div>
              <h2 className="auth-h">Check your email</h2>
              <p className="auth-sub" style={{margin:"8px 0 0"}}>
                Verification link sent to <strong>{email}</strong>.<br/>Click it to activate your account.
              </p>
            </div>
            <div style={{padding:"9px 12px",borderRadius:8,background:"var(--green-bg)",border:"1px solid rgba(52,199,89,.2)",color:"var(--green)",fontSize:".77rem",marginBottom:12}}>
              ✓ Check your spam folder too.
            </div>
            <button className="auth-btn" style={{background:"var(--page)",color:"var(--text)",border:"1px solid var(--border2)"}} onClick={()=>{setScreen("form");setMode("login");}}>← Back to sign in</button>
          </>
        )}
        {screen==="reset-sent" && (
          <>
            <div style={{textAlign:"center",padding:"10px 0 18px"}}>
              <div style={{fontSize:"2.2rem",marginBottom:10}}>🔐</div>
              <h2 className="auth-h">Reset link sent</h2>
              <p className="auth-sub" style={{margin:"8px 0 0"}}>Check <strong>{email}</strong> for a password reset link.</p>
            </div>
            <button className="auth-btn" style={{background:"var(--page)",color:"var(--text)",border:"1px solid var(--border2)"}} onClick={()=>{setScreen("form");setMode("login");}}>← Back to sign in</button>
          </>
        )}
        {screen==="reset-form" && (
          <>
            <h2 className="auth-h">Set new password</h2>
            <p className="auth-sub">Enter your new password below.</p>
            {err&&<div className="auth-err">⚠ {err}</div>}
            <label className="auth-lbl">New password</label>
            <input className="auth-inp" type="password" placeholder="Min. 6 chars" value={newPw} onChange={e=>setNewPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doReset()} style={{marginBottom:0}}/>
            <button className="auth-btn" onClick={doReset} disabled={busy||!newPw}>{busy?"Updating…":"Set new password →"}</button>
          </>
        )}
        {screen==="forgot" && (
          <>
            <h2 className="auth-h">Reset password</h2>
            <p className="auth-sub">We'll send a reset link to your email.</p>
            {err&&<div className="auth-err">⚠ {err}</div>}
            <label className="auth-lbl">Email</label>
            <input className="auth-inp" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendReset()} style={{marginBottom:0}}/>
            <button className="auth-btn" onClick={sendReset} disabled={busy||!email}>{busy?"Sending…":"Send reset link →"}</button>
            <div className="auth-sw" style={{marginTop:12}}><button onClick={()=>{setScreen("form");setErr("");}}>← Back to sign in</button></div>
          </>
        )}
        {screen==="form" && (
          <>
            <h2 className="auth-h">{mode==="signup"?"Create account":"Welcome back"}</h2>
            <p className="auth-sub">{mode==="signup"?"Verification email will be sent.":"Sign in to your workspace."}</p>
            {err&&<div className="auth-err">⚠ {err}</div>}
            {info&&<div style={{padding:"9px 12px",borderRadius:8,background:"var(--green-bg)",border:"1px solid rgba(52,199,89,.2)",color:"var(--green)",fontSize:".79rem",marginBottom:12}}>{info}</div>}
            {mode==="signup"&&<><label className="auth-lbl">Full name</label><input className="auth-inp" placeholder="Inderjeet Singh" value={name} onChange={e=>setName(e.target.value)}/></>}
            <label className="auth-lbl">Email</label>
            <input className="auth-inp" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
            <label className="auth-lbl">Password</label>
            <input className="auth-inp" type="password" placeholder={mode==="signup"?"Min. 6 chars":"••••••••"} value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} style={{marginBottom:0}}/>
            <button className="auth-btn" onClick={submit} disabled={busy}>{busy?"Please wait…":mode==="signup"?"Create account →":"Sign in →"}</button>
            {mode==="login"&&<div className="auth-sw" style={{marginTop:8}}><button onClick={()=>{setScreen("forgot");setErr("");}}>Forgot password?</button></div>}
            <div className="auth-div">or</div>
            <div className="auth-sw">
              {mode==="signup"
                ?<>Have an account? <button onClick={()=>{setMode("login");setErr("");setInfo("");}}>Sign in</button></>
                :<>No account? <button onClick={()=>{setMode("signup");setErr("");setInfo("");}}>Sign up</button></>
              }
            </div>
            <div className="auth-sw" style={{marginTop:10}}>
              <button onClick={onBack} style={{color:"var(--muted)"}}>← Back to home</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE PANEL  — Supabase password reset via email
═══════════════════════════════════════════════════════════════════════════ */
function ProfilePanel({ user, onClose, onLogout }) {
  const [screen,  setScreen]  = useState("main");
  const [email,   setEmail]   = useState("");
  const [msg,     setMsg]     = useState(null);
  const [sending, setSending] = useState(false);

  const sendReset = async () => {
    if(!email.includes("@")){ setMsg({text:"Enter a valid email.",ok:false}); return; }
    setSending(true); setMsg(null);
    try {
      const sb = await getSB();
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/#type=recovery"
      });
      if(error) setMsg({text: error.message, ok:false});
      else       setScreen("sent");
    } catch(e) {
      setMsg({text: e.message||"Error sending email", ok:false});
    }
    setSending(false);
  };

  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})
    : "—";

  return (
    <>
      <div className="ws-overlay-backdrop" onClick={onClose}/>
      <div className="ws-profile-panel">
        <div className="ws-profile-header">
          <div className="ws-profile-avatar">{user.name[0].toUpperCase()}</div>
          <div className="ws-profile-info">
            <div className="ws-profile-name">{user.name}</div>
            <div className="ws-profile-email">{user.email}</div>
          </div>
        </div>

        <div className="ws-profile-body">
          {screen==="main" && <>
            <div className="ws-profile-section-lbl">Account info</div>
            <div className="ws-profile-row">
              <span className="ws-profile-row-lbl">Member since</span>
              <span className="ws-profile-row-val">{joined}</span>
            </div>
            <div className="ws-profile-row" style={{marginBottom:0}}>
              <span className="ws-profile-row-lbl">Account type</span>
              <span className="ws-profile-row-val" style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:"var(--green)",display:"inline-block"}}/>
                Active user
              </span>
            </div>

            <div className="ws-profile-section-lbl">Security</div>
            <button
              className="ws-profile-save"
              onClick={()=>{ setEmail(user.email); setScreen("forgot"); setMsg(null); }}
              style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7,background:"var(--page)",color:"var(--text2)",border:"1px solid var(--border2)"}}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <rect x="3" y="6" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M5 6V4a2 2 0 0 1 4 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Forgot / Reset password
            </button>

            <div className="ws-profile-divider"/>
            <button className="ws-profile-signout" onClick={onLogout}>Sign out</button>
          </>}

          {screen==="forgot" && <>
            <div style={{marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:".86rem",marginBottom:4,color:"var(--text)"}}>Reset your password</div>
              <div style={{fontSize:".75rem",color:"var(--muted)",lineHeight:1.55}}>Enter the email linked to your account and we'll send a reset link.</div>
            </div>
            {msg&&<div className={`ws-profile-msg ${msg.ok?"ok":"err"}`} style={{marginBottom:8,fontSize:".73rem",textAlign:"left"}}>{msg.text}</div>}
            <label style={{fontSize:".7rem",fontWeight:600,color:"var(--muted)",display:"block",marginBottom:4,letterSpacing:".02em"}}>Email address</label>
            <input
              style={{width:"100%",padding:"8px 10px",borderRadius:7,fontSize:".82rem",background:"var(--page)",border:"1.5px solid var(--border2)",color:"var(--text)",outline:"none",marginBottom:8,fontFamily:"var(--font)",transition:"border .16s"}}
              type="email" placeholder="you@example.com"
              value={email} onChange={e=>{ setEmail(e.target.value); setMsg(null); }}
              onKeyDown={e=>e.key==="Enter"&&sendReset()}
              onFocus={e=>e.target.style.borderColor="var(--blue)"}
              onBlur={e=>e.target.style.borderColor="var(--border2)"}
            />
            <button
              className="ws-profile-save"
              onClick={sendReset}
              disabled={sending||!email}
              style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7}}
            >
              {sending
                ? <><div style={{width:13,height:13,border:"2px solid #aaa",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> Sending…</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M1 3.5l6 4 6-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      <rect x="1" y="2" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                    </svg>
                    Send reset link
                  </>
              }
            </button>
            <button onClick={()=>{setScreen("main");setMsg(null);}} style={{width:"100%",marginTop:6,padding:"7px",borderRadius:7,fontSize:".78rem",background:"none",border:"none",color:"var(--muted)",cursor:"pointer"}}>← Back</button>
          </>}

          {screen==="sent" && <>
            <div style={{textAlign:"center",padding:"12px 0 16px"}}>
              <div style={{fontSize:"2rem",marginBottom:10}}>📧</div>
              <div style={{fontWeight:700,fontSize:".9rem",marginBottom:6,color:"var(--text)"}}>Check your email</div>
              <div style={{fontSize:".76rem",color:"var(--muted)",lineHeight:1.6}}>
                Reset link sent to<br/><strong style={{color:"var(--text2)"}}>{email}</strong>.<br/>Click the link to set a new password.
              </div>
            </div>
            <div style={{padding:"9px 11px",borderRadius:8,background:"var(--green-bg)",border:"1px solid rgba(52,199,89,.2)",color:"var(--green)",fontSize:".74rem",marginBottom:10}}>
              ✓ Check your spam folder too if you don't see it.
            </div>
            <button onClick={()=>setScreen("main")} style={{width:"100%",padding:"8px",borderRadius:7,fontSize:".79rem",background:"var(--page)",border:"1px solid var(--border2)",color:"var(--text2)",cursor:"pointer",fontWeight:600}}>← Back to profile</button>
          </>}

        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   QR POPUP MODAL
═══════════════════════════════════════════════════════════════════════════ */
const QRC = `
@keyframes qrIn  { from{opacity:0;transform:scale(.86) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }
@keyframes qrOut { from{opacity:1;transform:scale(1) translateY(0)} to{opacity:0;transform:scale(.92) translateY(6px)} }
.qr-backdrop{
  position:fixed;inset:0;z-index:1000;
  background:rgba(0,0,0,.5);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  display:flex;align-items:center;justify-content:center;padding:20px;
  animation:fadeIn .18s ease both;
}
.qr-modal{
  background:var(--white);border-radius:22px;
  box-shadow:0 32px 96px rgba(0,0,0,.24),0 4px 16px rgba(0,0,0,.1);
  padding:26px 26px 22px;width:100%;max-width:330px;position:relative;
  animation:qrIn .38s cubic-bezier(.34,1.56,.64,1) both;
  border: 1px solid var(--border);
}
.qr-modal.closing{animation:qrOut .18s ease both;}
.qr-close{
  position:absolute;top:13px;right:13px;width:28px;height:28px;border-radius:50%;
  background:var(--page);border:1px solid var(--border);font-size:.8rem;
  display:flex;align-items:center;justify-content:center;
  color:var(--text);transition:all .16s;cursor:pointer;
}
.qr-close:hover{background:var(--border2);transform:rotate(90deg) scale(1.1);}
.qr-title{font-size:1rem;font-weight:800;letter-spacing:-.02em;margin-bottom:3px;color:var(--text);}
.qr-sub{font-size:.73rem;color:var(--muted);margin-bottom:18px;line-height:1.5;}
.qr-canvas-wrap{
  background:#ffffff;border:1px solid var(--border2);border-radius:16px;
  padding:14px;display:flex;align-items:center;justify-content:center;
  margin-bottom:16px;min-height:220px;
}
.qr-status{display:flex;flex-direction:column;align-items:center;gap:9px;color:var(--muted);}
.qr-status-spin{width:22px;height:22px;border:2.5px solid var(--border2);border-top-color:var(--text);border-radius:50%;animation:spin .7s linear infinite;}
.qr-status-txt{font-size:.73rem;}
.qr-url-lbl{font-size:.6rem;font-weight:700;color:var(--muted);letter-spacing:.07em;text-transform:uppercase;margin-bottom:5px;}
.qr-url-row{
  display:flex;align-items:center;gap:8px;
  background:var(--page);border:1.5px solid var(--border);border-radius:10px;
  padding:9px 11px;cursor:pointer;transition:all .16s;margin-bottom:14px;
}
.qr-url-row:hover{background:var(--tab-track);border-color:var(--border2);}
.qr-url-txt{flex:1;font-family:monospace;font-size:.75rem;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.qr-copy{font-size:.64rem;font-weight:700;color:var(--blue);white-space:nowrap;flex-shrink:0;transition:color .16s;}
.qr-copy.ok{color:var(--green);}
.qr-open{
  width:100%;padding:12px;border-radius:11px;font-size:.86rem;font-weight:700;
  background:var(--btn-bg);color:var(--btn-text);border:none;transition:all .2s;
  display:flex;align-items:center;justify-content:center;gap:7px;
}
.qr-open:hover:not(:disabled){background:var(--btn-hover);transform:translateY(-1px);box-shadow:0 5px 18px rgba(0,0,0,.18);}
.qr-open:active{transform:scale(.98);}
.qr-open:disabled{opacity:.35;cursor:not-allowed;}
.qr-badge{
  display:inline-flex;align-items:center;gap:5px;margin-bottom:14px;
  padding:4px 10px;border-radius:99px;font-size:.66rem;font-weight:700;
  background:var(--green-bg);color:var(--green);border:1px solid rgba(52,199,89,.2);
}
.qr-badge-dot{width:5px;height:5px;border-radius:50%;background:var(--green);animation:pulse 2s infinite;}
`;

function useQRCanvas(text, size=220) {
  const canvasRef = useRef();

  useEffect(()=>{
    if(!text || !canvasRef.current) return;
    if(window._QRCode) { renderQR(); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    s.onload = ()=>{ window._QRCode=window.QRCode; renderQR(); };
    s.onerror = ()=>{ renderQRFallback(); };
    document.head.appendChild(s);

    function renderQR(){
      const el = canvasRef.current;
      if(!el) return;
      el.innerHTML="";
      try{
        new window.QRCode(el,{
          text,width:size,height:size,
          colorDark:"#000000",colorLight:"#ffffff",
          correctLevel:window.QRCode.CorrectLevel.M
        });
      }catch(e){ renderQRFallback(); }
    }
    function renderQRFallback(){
      const el = canvasRef.current;
      if(!el) return;
      el.innerHTML=`<img src="https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&margin=6" width="${size}" height="${size}" style="border-radius:8px;display:block"/>`;
    }
  },[text, size]);

  return canvasRef;
}

function QRModal({ onClose, roomId }) {
  const [closing,  setClosing]  = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [phoneUrl, setPhoneUrl] = useState(""); 
  const [status,   setStatus]   = useState("loading"); 

  const qrRef = useQRCanvas(phoneUrl, 200);

  useEffect(()=>{
    let cancelled = false;

    const resolve = async () => {
      // If we are on Vercel (HTTPS), instantly use the secure live URL with the Room ID.
      if (window.location.protocol === "https:") {
        if(!cancelled) { 
          setPhoneUrl(window.location.origin + "/phone?room=" + roomId); 
          setStatus("tunnel"); 
        }
        return;
      }

      let localUrl = "";
      try {
        const r = await fetch(`${API}/api/local-ip`, {signal: AbortSignal.timeout(3000)});
        const d = await r.json();
        if(d.ip && d.ip !== "127.0.0.1" && d.ip !== "localhost") {
          localUrl = `http://${d.ip}:5173/phone?room=${roomId}`;
          if(!cancelled) { setPhoneUrl(localUrl); setStatus("local"); }
        }
      } catch(_) {}

      let attempts = 0;
      const checkTunnel = async () => {
        if(cancelled) return;
        try {
          const r = await fetch(`${API}/api/tunnel-url`, {signal: AbortSignal.timeout(3000)});
          const d = await r.json();
          if(!cancelled && d.url && d.has_tunnel) {
            setPhoneUrl(`${d.url}/phone?room=${roomId}`);
            setStatus("tunnel");
            return; 
          }
        } catch(_) {}
        attempts++;
        if(attempts < 6 && !cancelled) setTimeout(checkTunnel, 5000);
      };
      checkTunnel();

      if(!localUrl && !cancelled) setStatus("error");
    };

    resolve();
    return () => { cancelled = true; };
  }, [roomId]);

  const close = () => { setClosing(true); setTimeout(onClose, 180); };
  const copy  = () => {
    navigator.clipboard?.writeText(phoneUrl).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false), 2000);
  };

  return (
    <>
      <style>{QRC}</style>
      <div className="qr-backdrop" onClick={e=>{if(e.target===e.currentTarget)close();}}>
      <div className={`qr-modal${closing?" closing":""}`}>
        <button className="qr-close" onClick={close}>✕</button>

        <div className="qr-title">📱 Connect Phone</div>
        <div className="qr-sub">Scan with your phone camera to start live AI detection.</div>

        {status==="tunnel" && (
          <div className="qr-badge"><div className="qr-badge-dot"/>Secure Connection Active</div>
        )}
        {status==="local" && (
          <div className="qr-badge" style={{background:"var(--blue-bg)",color:"var(--blue)",borderColor:"rgba(37,99,235,.2)"}}>
            <div className="qr-badge-dot" style={{background:"var(--blue)"}}/>Local network
          </div>
        )}

        <div className="qr-canvas-wrap">
          {status==="loading" && (
            <div className="qr-status">
              <div className="qr-status-spin"/>
              <div className="qr-status-txt">Fetching secure URL…</div>
            </div>
          )}
          {status==="error" && (
            <div className="qr-status">
              <div style={{fontSize:"1.5rem"}}>⚠️</div>
              <div className="qr-status-txt" style={{color:"var(--red)",textAlign:"center",lineHeight:1.5}}>
                Backend not reachable.<br/>Make sure <code style={{fontSize:".7rem"}}>python app.py</code> is running.
              </div>
            </div>
          )}
          {(status==="tunnel"||status==="local") && (
            <div ref={qrRef} style={{lineHeight:0,borderRadius:8,overflow:"hidden"}}/>
          )}
        </div>

        {phoneUrl && (
          <>
            <div className="qr-url-lbl">Or open on your phone</div>
            <div className="qr-url-row" onClick={copy}>
              <span className="qr-url-txt">{phoneUrl}</span>
              <span className={`qr-copy${copied?" ok":""}`}>{copied?"✓ Copied":"Copy"}</span>
            </div>
          </>
        )}

        <button className="qr-open" onClick={()=>phoneUrl&&window.open(phoneUrl,"_blank")} disabled={!phoneUrl}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="3" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 5.5l3-1.5v4L8 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          Open on this device
        </button>
      </div>
    </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WORKSPACE
═══════════════════════════════════════════════════════════════════════════ */
function Workspace({ user, onDashboard, onLogout, onExit, theme, setTheme }) {
  const [tab, setTab]             = useState("engine");
  const [profileOpen, setProfileOpen] = useState(false);
  const [qrOpen, setQrOpen]       = useState(false);
  const [mode, setMode]           = useState("static");
  const [streamSub, setStreamSub] = useState("pc");
  const [staticSub, setStaticSub] = useState("image");
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [conf, setConf]           = useState(0.15);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState("");
  const [drag, setDrag]           = useState(false);
  const [online, setOnline]       = useState("checking");
  const [streaming, setStreaming] = useState(false);
  const [snapMsg, setSnapMsg]     = useState("");
  const [videoBlobUrl, setVBlobUrl]   = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [recordDuration, setRecDur]   = useState(0);
  const [webcamCounts, setWCounts]    = useState({});
  const [macIP, setMacIP]         = useState("");
  const [logs, setLogs]           = useState([{type:"info",text:"System initialized.",time:new Date()}]);
  const [phoneRoomId, setPhoneRoomId] = useState("");

  const fileRef     = useRef();
  const videoRef    = useRef();
  const canvasRef   = useRef();
  const streamRef   = useRef(null);
  const recorderRef = useRef(null);
  const recChunksRef= useRef([]);
  const recTimerRef = useRef(null);

  const addLog = useCallback((text,type="info")=>{
    setLogs(p=>[...p.slice(-49),{type,text,time:new Date()}]);
  },[]);

  const ping = useCallback(async()=>{
    try{
      const r=await fetch(`${API}/health`,{signal:AbortSignal.timeout(5000)});
      if(r.ok){setOnline("on");addLog("Backend connected.","success");}else setOnline("off");
    }catch{setOnline("off");addLog("Backend unreachable.","error");}
  },[addLog]);

  useEffect(()=>{
    ping();
    const fetchIP = async (attempt=0) => {
      try{
        const r=await fetch(`${API}/api/local-ip`,{signal:AbortSignal.timeout(4000)});
        const d=await r.json();
        if(d.ip && d.ip!=="127.0.0.1"){setMacIP(d.ip);}
        else if(attempt<3){setTimeout(()=>fetchIP(attempt+1),2000);}
      }catch(_){
        if(attempt<3)setTimeout(()=>fetchIP(attempt+1),2000);
      }
    };
    fetchIP();
  },[ping]);

  // -- Supabase Realtime Listener (Laptop receives frames from Phone) --
  useEffect(() => {
    let channel;
    if (streamSub === "phone" && phoneRoomId) {
      setStreaming(true);
      addLog("Waiting for phone to connect...", "info");
      
      getSB().then(sb => {
        channel = sb.channel(`room_${phoneRoomId}`);
        channel.on('broadcast', { event: 'frame' }, (payload) => {
          const data = payload.payload;
          if (canvasRef.current && data.image) {
            const img = new Image();
            img.onload = () => {
               canvasRef.current.width = img.width; 
               canvasRef.current.height = img.height;
               canvasRef.current.getContext('2d').drawImage(img, 0, 0);
            };
            img.src = data.image; 
            setWCounts(data.counts || {});
          }
        }).subscribe((status) => { 
          if (status === 'SUBSCRIBED') addLog("Ready to receive phone stream.", "success"); 
        });
      });
    }
    return () => { if (channel) getSB().then(sb => sb.removeChannel(channel)); };
  }, [streamSub, phoneRoomId, addLog]);

  const saveToHistory = useCallback(async (data, modeStr, thumb=null) => {
    const uid = user?.id;
    if (!uid) return;

    const record = {
      user_id: uid,
      mode: modeStr,
      detections: data.detections || {},
      total: data.total || 0,
      thumbnail: thumb,
      latency_ms: data.latency_ms || 0,
      fps: data.fps || 0
    };

    try {
      const sb = await getSB();
      await sb.from('history').insert([record]);
      addLog("Saved to Cloud Database.", "success");
    } catch (e) {
      console.error(e);
    }
  }, [user, addLog]);

  const pickFile=(f)=>{
    if(!f)return;
    setFile(f);setResult(null);setError("");setPreview(URL.createObjectURL(f));
    addLog(`File selected: ${f.name}`);
  };

  const resetCanvas=()=>{
    setFile(null);setPreview(null);setResult(null);setError("");setSnapMsg("");
    if(videoBlobUrl){URL.revokeObjectURL(videoBlobUrl);setVBlobUrl(null);}
    if(recordedUrl){URL.revokeObjectURL(recordedUrl);setRecordedUrl(null);}
    setRecDur(0);setWCounts({});
    if(streaming)stopStream();
  };

  const switchMode=(m)=>{resetCanvas();setMode(m);addLog(`Switched to ${m} mode.`);};
  const switchStaticSub=(s)=>{resetCanvas();setStaticSub(s);addLog(`File type: ${s}`);};

  const openPhonePairing = () => {
    const newRoom = Math.random().toString(36).substring(2, 9);
    setPhoneRoomId(newRoom); 
    setStreamSub("phone"); 
    setQrOpen(true);
    if(streaming) stopStream();
  };

  const detect=async()=>{
    if(!file){setError("Please select a file first.");return;}
    setLoading(true);setError("");setResult(null);
    addLog(`Running YOLO11x on ${file.name}…`);
    const fd=new FormData();fd.append("file",file);fd.append("confidence",conf);
    const ep=staticSub==="image"?"/api/detect/image":"/api/detect/video";
    try{
      const res=await fetch(`${API}${ep}`,{method:"POST",body:fd,signal:AbortSignal.timeout(600_000)});
      if(!res.ok){const j=await res.json().catch(()=>({}));throw new Error(j.error||`Error ${res.status}`);}
      const data=await res.json();
      if(staticSub==="video"){
        if(data.video && data.video.startsWith("/")){
          try{
            const vr=await fetch(`${API}${data.video}`);
            const vblob=await vr.blob();
            setVBlobUrl(URL.createObjectURL(vblob));
          }catch(_){ setVBlobUrl(`${API}${data.video}`); }
        } else if(data.video && data.video.startsWith("data:")){
          const b64=data.video.split(",")[1];
          const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
          setVBlobUrl(URL.createObjectURL(new Blob([bytes],{type:"video/mp4"})));
        } else if(data.video){
          setVBlobUrl(`${API}${data.video}`);
        }
      }
      if(staticSub==="video" && data.video){
        const videoSrc = data.video.startsWith("/") ? `${API}${data.video}` : data.video;
        const thumbVid = document.createElement("video");
        thumbVid.crossOrigin="anonymous";
        thumbVid.src = videoSrc;
        thumbVid.muted=true;
        thumbVid.onloadeddata=()=>{
          thumbVid.currentTime=0.5;
        };
        thumbVid.onseeked=()=>{
          try{
            const tc=document.createElement("canvas");
            tc.width=120;tc.height=Math.round(120*thumbVid.videoHeight/thumbVid.videoWidth);
            tc.getContext("2d").drawImage(thumbVid,0,0,tc.width,tc.height);
            const thumb=tc.toDataURL("image/jpeg",0.7);
            saveToHistory(data,staticSub,thumb);
          }catch(_){ saveToHistory(data,staticSub,null); }
        };
        thumbVid.onerror=()=>saveToHistory(data,staticSub,null);
      } else {
        saveToHistory(data,staticSub,staticSub==="image"?data.image:null);
      }
      setResult({...data,mode:staticSub});
      addLog(`Done — ${data.total||0} objects found.`,"success");
    }catch(e){
      setError(e.name==="TimeoutError"?"Timed out. Try smaller file.":(e.message||"Cannot reach backend."));
      addLog(`Error: ${e.message}`,"error");
    }finally{setLoading(false);}
  };

  const startStream=async()=>{
    setStreaming(true);setError("");setRecordedUrl(null);setRecDur(0);setWCounts({});
    recChunksRef.current=[];addLog("Live stream started.","success");
    try{
      const response=await fetch(`${API}/api/stream/webcam?confidence=${conf}`,{signal:(streamRef.current=new AbortController()).signal});
      if(!response.ok)throw new Error("Stream failed");
      const reader=response.body.getReader(),canvas=canvasRef.current,ctx=canvas?.getContext("2d");
      let buffer=new Uint8Array(0);
      const SOI=[0xFF,0xD8],EOI=[0xFF,0xD9];
      const find=(arr,seq,from=0)=>{for(let i=from;i<=arr.length-seq.length;i++)if(seq.every((b,j)=>arr[i+j]===b))return i;return -1;};
      let recStarted=false,secs=0;
      while(true){
        const{done,value}=await reader.read();if(done)break;
        const m=new Uint8Array(buffer.length+value.length);m.set(buffer);m.set(value,buffer.length);buffer=m;
        let s=find(buffer,SOI);
        while(s!==-1){
          const e=find(buffer,EOI,s+2);if(e===-1)break;
          const jpeg=buffer.slice(s,e+2);buffer=buffer.slice(e+2);
          const blob=new Blob([jpeg],{type:"image/jpeg"}),url=URL.createObjectURL(blob),img=new Image();
          img.onload=()=>{
            if(canvas&&ctx){canvas.width=img.width;canvas.height=img.height;ctx.drawImage(img,0,0);}
            if(!recStarted&&canvas?.width>0){
              recStarted=true;
              try{
                const stream=canvas.captureStream(25);
                const mt=MediaRecorder.isTypeSupported("video/webm;codecs=vp9")?"video/webm;codecs=vp9":"video/webm";
                const recorder=new MediaRecorder(stream,{mimeType:mt,videoBitsPerSecond:2_500_000});
                recorderRef.current=recorder;
                recorder.ondataavailable=e=>{if(e.data?.size>0)recChunksRef.current.push(e.data);};
                recorder.start(500);
                recTimerRef.current=setInterval(()=>{secs++;setRecDur(secs);},1000);
              }catch(e){console.warn(e);}
            }
            URL.revokeObjectURL(url);
          };
          img.src=url;s=find(buffer,SOI);
        }
      }
    }catch(e){if(e.name!=="AbortError"){setError("Stream error: "+e.message);setStreaming(false);addLog("Stream error.","error");}}
  };

  const stopStream=async()=>{
    let webcamThumb = null;
    try{
      const canvas=canvasRef.current;
      if(canvas && canvas.width>0 && canvas.height>0){
        const tc=document.createElement("canvas");
        tc.width=160; tc.height=Math.round(160*canvas.height/canvas.width);
        const ctx2=tc.getContext("2d");
        ctx2.drawImage(canvas,0,0,tc.width,tc.height);
        webcamThumb=tc.toDataURL("image/jpeg",0.85);
      }
    }catch(_){}

    setStreaming(false);
    if(recTimerRef.current){clearInterval(recTimerRef.current);recTimerRef.current=null;}
    if(streamRef.current){streamRef.current.abort();streamRef.current=null;}
    await new Promise(r=>setTimeout(r,300));

    let fc={};
    try{const r=await fetch(`${API}/api/stream/counts`);const d=await r.json();if(d.counts&&Object.keys(d.counts).length>0)fc=d.counts;}catch(_){}
    try{await fetch(`${API}/api/stream/stop`,{method:"POST"});}catch(_){}
    const recorder=recorderRef.current;
    if(recorder&&recorder.state!=="inactive"){
      recorder.onstop=()=>{
        const chunks=recChunksRef.current;
        if(chunks.length>0){const blob=new Blob(chunks,{type:recorder.mimeType||"video/webm"});setRecordedUrl(URL.createObjectURL(blob));}
        recChunksRef.current=[];setWCounts(fc);
        if(Object.keys(fc).length>0){
          saveToHistory({detections:fc,total:Object.values(fc).reduce((a,b)=>a+b,0)},"webcam",webcamThumb);
        }
      };
      recorder.stop();
    }else{
      setWCounts(fc);
      if(Object.keys(fc).length>0){
        saveToHistory({detections:fc,total:Object.values(fc).reduce((a,b)=>a+b,0)},"webcam",webcamThumb);
      }
    }
    recorderRef.current=null;
    const canvas=canvasRef.current;if(canvas)canvas.getContext("2d").clearRect(0,0,canvas.width,canvas.height);
    addLog("Stream stopped.");
  };

  const saveFrame=()=>{
    const vid=videoRef.current;if(!vid)return;
    _snapCanvas.width=vid.videoWidth;_snapCanvas.height=vid.videoHeight;
    _snapCanvas.getContext("2d").drawImage(vid,0,0);
    const ts=new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);
    const a=document.createElement("a");a.href=_snapCanvas.toDataURL("image/jpeg",.95);a.download=`frame_${ts}.jpg`;a.click();
    setSnapMsg("✓ Saved!");setTimeout(()=>setSnapMsg(""),2500);addLog("Frame saved.","success");
  };

  /* ---- FORCED DOWNLOAD FIX ---- */
  const dlResult=async()=>{
    const isImg=result.mode==="image";
    if(isImg){
      const a=document.createElement("a");
      a.href=result.image;
      a.download="visionpro_result.jpg";
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      addLog("Image downloaded.");
    } else {
      try{
        let blobUrl=videoBlobUrl;
        if(!blobUrl||(blobUrl.startsWith("http")&&!blobUrl.startsWith("blob:"))){ 
          const vr=await fetch(blobUrl||`${API}${result.video}`); 
          const vblob=await vr.blob();
          const forcedBlob = new Blob([vblob], { type: 'application/octet-stream' });
          blobUrl=URL.createObjectURL(forcedBlob); 
        } else {
          const vr = await fetch(blobUrl);
          const vblob = await vr.blob();
          const forcedBlob = new Blob([vblob], { type: 'application/octet-stream' });
          blobUrl = URL.createObjectURL(forcedBlob);
        }
        const a=document.createElement("a"); a.href=blobUrl;a.download="visionpro_result.mp4"; document.body.appendChild(a);a.click();document.body.removeChild(a);
        addLog("Video downloaded.");
      }catch(e){addLog("Download failed: "+e.message,"error");}
    }
  };

  const dlRec=async()=>{
    if(!recordedUrl)return;
    try {
      const vr = await fetch(recordedUrl);
      const vblob = await vr.blob();
      const forcedBlob = new Blob([vblob], { type: 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(forcedBlob);
      const ts=new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);
      const a=document.createElement("a"); a.href=blobUrl;a.download=`webcam_${ts}.webm`; document.body.appendChild(a);a.click();document.body.removeChild(a);
      addLog("Recording downloaded.");
    } catch (e) {}
  };

  const fmt=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const fmtT=d=>d.toLocaleTimeString("en",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});

  const isStatic=mode==="static", isStream=mode==="stream";
  const isPC=isStream&&streamSub==="pc", isPhone=isStream&&streamSub==="phone";
  const accept=staticSub==="image"?"image/png,image/jpeg,image/webp":"video/mp4,video/avi,video/quicktime,video/webm";

  const showDrop   = isStatic&&!result&&!loading;
  const showLoad   = loading;
  const showImgR   = !!result&&result.mode==="image";
  const showVidR   = !!result&&result.mode==="video";
  const showLive   = streaming;
  const showCamOff = isPC&&!streaming&&!recordedUrl;
  const showRecorded=isPC&&!streaming&&!!recordedUrl;

  const canvasFilled = showImgR||showVidR||showLive||showRecorded;
  const hasDet = (result&&Object.keys(result.detections||{}).length>0)||(isStream&&Object.keys(webcamCounts).length>0);
  const detObj = result?.detections||webcamCounts;

  return (
    <div className="ws">
      <style>{WC}</style>
      <input ref={fileRef} type="file" accept={accept} style={{display:"none"}} onChange={e=>pickFile(e.target.files[0])}/>

      {/* ── Topbar ── */}
      <header className="ws-bar">
        <div className="ws-bar-l">
          <div className="ws-bar-logo">👁</div>
          <span className="ws-bar-title">Workspace</span>
        </div>
        <div className="ws-bar-r">
          <button className="theme-btn" onClick={()=>setTheme(theme==='light'?'dark':'light')} title="Toggle Theme">
            {theme==='dark' ? "☀️" : "🌙"}
          </button>
          <button className="ws-pill" onClick={onExit}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M4 2H2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2M8 9l3-3-3-3M11 6H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Exit
          </button>
          <button className={`ws-pill ${tab==="engine"?"active":""}`} onClick={()=>setTab("engine")}>Engine</button>
          <button className={`ws-pill ${tab==="datasets"?"active":""}`} onClick={()=>{setTab("datasets");onDashboard();}}>Dashboard</button>

          {/* Profile pill + dropdown */}
          <div className="ws-profile-wrap">
            <button
              className={`ws-pill ${profileOpen?"active":""}`}
              onClick={()=>{setProfileOpen(p=>!p);setTab("profile");}}
            >
              {user.name.split(" ")[0]}
            </button>
            {profileOpen && (
              <ProfilePanel
                user={user}
                onClose={()=>setProfileOpen(false)}
                onLogout={onLogout}
              />
            )}
          </div>
        </div>
      </header>

      {/* ── QR Modal ── */}
      {qrOpen && <QRModal onClose={()=>{setQrOpen(false);setStreamSub("pc");}} roomId={phoneRoomId}/>}

      {/* ── Body ── */}
      <div className="ws-body">

        {/* ── LEFT ── */}
        <aside className="ws-left">
          <div className="ws-left-scroll">

            <div className="ws-sec">
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="7" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="7" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="7" y="7" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>
              Mode
            </div>
            
            <div className="ws-mode-tabs" data-idx={isStream ? "1" : "0"}>
              <div className="ws-mode-bg"/>
              <button className={`ws-mode-tab ${isStatic?"active":""}`} onClick={()=>switchMode("static")}>Static</button>
              <button className={`ws-mode-tab ${isStream?"active":""}`} onClick={()=>switchMode("stream")}>Stream</button>
            </div>

            {isStatic&&(
              <>
                <div className="ws-sec">
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M1 8l3-3 2 2 2-2 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                  File type
                </div>
                <div className="ws-mode-tabs" data-idx={staticSub==="video" ? "1" : "0"}>
                  <div className="ws-mode-bg"/>
                  <button className={`ws-mode-tab ${staticSub==="image"?"active":""}`} onClick={()=>switchStaticSub("image")}>Image</button>
                  <button className={`ws-mode-tab ${staticSub==="video"?"active":""}`} onClick={()=>switchStaticSub("video")}>Video</button>
                </div>
              </>
            )}

            {isStream&&(
              <>
                <div className="ws-sec">
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><rect x="1" y="3" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5.5l3-1.5v4L8 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                  Live cameras
                </div>
                <button className={`ws-cam-btn ${isPC&&streaming?"active":""}`} onClick={()=>{setStreamSub("pc");if(streaming)stopStream();}}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 10l-.5 2m4.5-2l.5 2M3.5 12h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Start PC Cam
                </button>
                <button className={`ws-cam-btn ${isPhone?"active":""}`} onClick={openPhonePairing}>
                  <svg width="10" height="12" viewBox="0 0 10 14" fill="none"><rect x="1" y="1" width="8" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="5" cy="11" r=".7" fill="currentColor"/></svg>
                  Pair Phone
                </button>
              </>
            )}

            {loading&&<div className="ws-prog" style={{marginTop:10}}><div className="ws-prog-fill"/></div>}

          </div>
          <div className="ws-left-foot">
            {isStream&&isPC
              ? streaming
                ? <button className="ws-exec danger" onClick={stopStream}>⏹ Stop Stream</button>
                : <button className="ws-exec ready" onClick={startStream}>▶ Start PC Cam</button>
              : isPhone 
                ? streaming 
                  ? <button className="ws-exec danger" onClick={stopStream}>⏹ Disconnect Phone</button> 
                  : <button className="ws-exec ready" onClick={openPhonePairing}>📱 Connect Phone</button>
              : <button className={`ws-exec ${file&&!loading?"ready":""}`} onClick={detect} disabled={loading||!file}>
                  {loading?"Processing…":"Analysis"}
                </button>
            }
          </div>
        </aside>

        {/* ── CENTER ── */}
        <main className="ws-center">

          {/* Canvas card — always shown */}
          {(
            <div
              className={["ws-canvas-card",canvasFilled?"filled":showDrop?"drop":"",drag?"dragging":""].join(" ")}
              onClick={showDrop?()=>fileRef.current?.click():undefined}
              onDragOver={isStatic&&!result?e=>{e.preventDefault();setDrag(true);}:undefined}
              onDragLeave={isStatic&&!result?()=>setDrag(false):undefined}
              onDrop={isStatic&&!result?e=>{e.preventDefault();setDrag(false);pickFile(e.dataTransfer.files[0]);}:undefined}
            >
              {showDrop&&!preview&&(
                <div className="ws-drop-hint">
                  <div className="ws-drop-ring">{staticSub==="image"?"🖼":"🎬"}</div>
                  <div className="ws-drop-title">Drop {staticSub==="image"?"Image":"Video"} Here</div>
                  <div className="ws-drop-sub">{staticSub==="image"?"PNG · JPG · WEBP — click to browse":"MP4 · AVI · MOV — click to browse"}</div>
                </div>
              )}
              {/* Image preview */}
              {showDrop&&preview&&staticSub==="image"&&(
                <img src={preview} className="ws-out-img" alt="preview" style={{opacity:.88}}/>
              )}
              {/* Video preview */}
              {showDrop&&preview&&staticSub==="video"&&(
                <video
                  src={preview}
                  style={{width:"100%",display:"block",background:"#000",borderRadius:10,opacity:.88}}
                  muted
                  playsInline
                  onMouseOver={e=>e.target.play()}
                  onMouseOut={e=>e.target.pause()}
                />
              )}
              {showLoad&&(
                <div className="ws-spin-wrap">
                  <div className="ws-spinner"/>
                  <div className="ws-spin-lbl">Running YOLO11x…</div>
                  <div className="ws-spin-sub">{file?.name}</div>
                </div>
              )}
              {error&&!showLoad&&<div style={{position:"absolute",top:12,left:12,right:12}}><div className="ws-err">⚠ {error}</div></div>}
              {showImgR&&<img src={result.image} className="ws-out-img" alt="result"/>}
              {showVidR&&(
                <video
                  ref={videoRef}
                  src={videoBlobUrl}
                  controls
                  autoPlay
                  style={{
                    width:"100%",display:"block",background:"#000",
                    borderRadius:10,
                    maxHeight:"55vh",
                  }}
                />
              )}
              
              <canvas ref={canvasRef} className="ws-out-canvas" style={{ display: showLive ? 'block' : 'none' }}/>
              
              {showLive&&(
                <>
                  <div className="ws-live"><div style={{width:5,height:5,borderRadius:"50%",background:"#fff",animation:"liveblink 1s infinite"}}/>{isPhone ? "PHONE STREAM" : "LIVE"}</div>
                  <div className="ws-rec"><div style={{width:6,height:6,borderRadius:"50%",background:"#ff3b30",animation:"liveblink 1s infinite"}}/>REC {fmt(recordDuration)}</div>
                </>
              )}
              {showCamOff&&(
                <div className="ws-cam-off">
                  <div className="ico">📷</div>
                  <div style={{fontSize:".82rem",fontWeight:600,color:"var(--muted)"}}>Press "Start PC Cam" to begin</div>
                  <div style={{fontSize:".71rem",color:"var(--muted2)"}}>Live YOLO11x feed will appear here</div>
                </div>
              )}
              {showRecorded&&<video src={recordedUrl} controls autoPlay loop className="ws-out-video"/>}
            </div>
          )}

          {/* Result content below canvas */}
          {(showImgR||showVidR||showRecorded||hasDet)&&(
            <div style={{padding:"12px 14px 16px",display:"flex",flexDirection:"column",gap:11,flexShrink:0}}>

          {/* ── premium action bar ── */}
          {(showImgR||showVidR||showRecorded)&&(
            <div style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",
              flexWrap:"wrap",gap:8,
              padding:"10px 14px",borderRadius:12,
              background:"var(--white)",border:"1px solid var(--border)",
              animation:"fadeUp .28s cubic-bezier(.16,1,.3,1) both"
            }}>
              {/* left — stats text */}
              <span style={{fontSize:".78rem",color:"var(--muted)",display:"flex",alignItems:"center",gap:6}}>
                {result?.mode==="video" ? <>
                  <span style={{fontFamily:"var(--mono)",fontWeight:700,color:"var(--text)",fontSize:".82rem"}}>{result.unique_tracks||result.total}</span>
                  <span>unique</span>
                  <span style={{color:"var(--border2)"}}>·</span>
                  <span style={{fontFamily:"var(--mono)",fontWeight:700,color:"var(--text)",fontSize:".82rem"}}>{result.total_frames}</span>
                  <span>frames</span>
                  <span style={{color:"var(--border2)"}}>·</span>
                  <span style={{fontFamily:"var(--mono)",fontWeight:600,color:"var(--muted)",fontSize:".76rem"}}>{result.fps} fps</span>
                </> : result?.mode==="image" ? <>
                  <span style={{fontFamily:"var(--mono)",fontWeight:700,color:"var(--text)",fontSize:".82rem"}}>{result.total}</span>
                  <span>objects</span>
                  <span style={{color:"var(--border2)"}}>·</span>
                  <span style={{fontFamily:"var(--mono)",fontWeight:600,color:"var(--muted)",fontSize:".76rem"}}>{result.latency_ms}ms</span>
                </> : <>
                  <span style={{fontFamily:"var(--mono)",fontWeight:700,color:"var(--text)",fontSize:".82rem"}}>{fmt(recordDuration)}</span>
                  <span>recorded</span>
                </>}
              </span>

              {/* right — action buttons */}
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {/* Frame capture — only for video */}
                {(showVidR || showRecorded) && (
                  snapMsg
                    ? <span style={{fontSize:".72rem",color:"var(--green)",fontWeight:700,padding:"6px 12px",borderRadius:8,background:"var(--green-bg)",border:"1px solid rgba(22,163,74,.2)",animation:"fadeIn .2s ease"}}>✓ Saved</span>
                    : <button onClick={saveFrame} style={{
                        display:"flex",alignItems:"center",gap:5,
                        padding:"6px 13px",borderRadius:8,
                        fontSize:".74rem",fontWeight:600,
                        background:"var(--tab-track)",border:"1px solid var(--border)",color:"var(--text2)",
                        transition:"all .22s cubic-bezier(.16,1,.3,1)",cursor:"pointer"
                      }}
                      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 3px 8px rgba(0,0,0,.08)";}}
                      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}
                      onMouseDown={e=>e.currentTarget.style.transform="scale(.97)"}
                      onMouseUp={e=>e.currentTarget.style.transform="translateY(-1px)"}
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="7" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M5 3V2.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V3" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                      Frame
                    </button>
                )}

                {/* Download */}
                <button onClick={showRecorded?dlRec:dlResult} style={{
                  display:"flex",alignItems:"center",gap:5,
                  padding:"6px 14px",borderRadius:8,
                  fontSize:".74rem",fontWeight:600,
                  background:"var(--blue-bg)",border:"1px solid rgba(37,99,235,.2)",color:"var(--blue)",
                  transition:"all .22s cubic-bezier(.16,1,.3,1)",cursor:"pointer"
                }}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 3px 10px rgba(37,99,235,.15)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}
                onMouseDown={e=>e.currentTarget.style.transform="scale(.97)"}
                onMouseUp={e=>e.currentTarget.style.transform="translateY(-1px)"}
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1 10v1.5A1.5 1.5 0 0 0 2.5 13h9a1.5 1.5 0 0 0 1.5-1.5V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Download
                </button>

                {/* New file */}
                <button onClick={()=>{resetCanvas();fileRef.current?.click();}} style={{
                  display:"flex",alignItems:"center",gap:5,
                  padding:"6px 13px",borderRadius:8,
                  fontSize:".74rem",fontWeight:600,
                  background:"var(--btn-bg)",border:"none",color:"var(--btn-text)",
                  transition:"all .22s cubic-bezier(.16,1,.3,1)",cursor:"pointer",
                  boxShadow:"0 1px 3px rgba(0,0,0,.12)"
                }}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,.18)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.12)";}}
                onMouseDown={e=>e.currentTarget.style.transform="scale(.97)"}
                onMouseUp={e=>e.currentTarget.style.transform="translateY(-1px)"}
                >
                  <svg style={{transition:"transform .5s cubic-bezier(.34,1.56,.64,1)"}}
                    className="ws-refresh-icon" width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M12.5 2v3.5H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12.35 8.5A5.5 5.5 0 1 1 11 3.65L12.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  New file
                </button>
              </div>
            </div>
          )}

          {/* stats */}
          {(showImgR||showVidR||(isStream&&Object.keys(webcamCounts).length>0))&&(
            <div className="ws-stats">
              {showImgR&&<>
                <div className="ws-stat" style={{animationDelay:"0s"}}><div className="ws-stat-v">{result.total}</div><div className="ws-stat-l">Objects</div></div>
                <div className="ws-stat" style={{animationDelay:".05s"}}><div className="ws-stat-v">{Object.keys(result.detections||{}).length}</div><div className="ws-stat-l">Classes</div></div>
                <div className="ws-stat" style={{animationDelay:".1s"}}><div className="ws-stat-v">{result.latency_ms}</div><div className="ws-stat-l">ms</div></div>
              </>}
              {showVidR&&<>
                <div className="ws-stat" style={{animationDelay:"0s"}}><div className="ws-stat-v">{result.unique_tracks||result.total}</div><div className="ws-stat-l">Unique</div></div>
                <div className="ws-stat" style={{animationDelay:".05s"}}><div className="ws-stat-v">{Object.keys(result.detections||{}).length}</div><div className="ws-stat-l">Classes</div></div>
                <div className="ws-stat" style={{animationDelay:".1s"}}><div className="ws-stat-v">{result.fps}</div><div className="ws-stat-l">FPS</div></div>
              </>}
              {isStream&&Object.keys(webcamCounts).length>0&&<>
                <div className="ws-stat" style={{animationDelay:"0s"}}><div className="ws-stat-v">{Object.values(webcamCounts).reduce((a,b)=>a+b,0)}</div><div className="ws-stat-l">Objects</div></div>
                <div className="ws-stat" style={{animationDelay:".05s"}}><div className="ws-stat-v">{Object.keys(webcamCounts).length}</div><div className="ws-stat-l">Classes</div></div>
                <div className="ws-stat" style={{animationDelay:".1s"}}><div className="ws-stat-v">{isPhone ? "Live" : recordDuration + "s"}</div><div className="ws-stat-l">Duration</div></div>
              </>}
            </div>
          )}

          {hasDet&&(
            <div className="ws-classes">
              <div className="ws-classes-hd">Detected classes</div>
              <div className="ws-chips">
                {Object.entries(detObj).map(([cls,n],i)=>(
                  <div key={cls} className="ws-chip" style={{animationDelay:`${i*.04}s`}}>
                    <div className="ws-chip-dot" style={{background:clr(cls)}}/>
                    {cls}<span className="ws-chip-n">×{n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showVidR&&(()=>{
            const dets = result.detections || {};
            const total = result.unique_tracks || result.total || 0;
            const fps   = result.fps || 0;
            const frames = result.total_frames || 0;
            const duration = frames > 0 && fps > 0 ? (frames/fps).toFixed(1) : "—";

            // Scene analysis
            const people   = dets["Person"] || dets["person"] || 0;
            const vehicles = (dets["Car"]||0)+(dets["Truck"]||0)+(dets["Bus"]||0)+(dets["Motorcycle"]||0)+(dets["car"]||0)+(dets["truck"]||0)+(dets["bus"]||0)+(dets["motorcycle"]||0);
            const bags     = (dets["Backpack"]||0)+(dets["Handbag"]||0)+(dets["Suitcase"]||0)+(dets["backpack"]||0)+(dets["handbag"]||0)+(dets["suitcase"]||0);
            const density  = people > 20 ? "High crowd" : people > 8 ? "Moderate crowd" : people > 2 ? "Small group" : people > 0 ? "Few people" : "No people";
            const densityColor = people > 20 ? "var(--red)" : people > 8 ? "var(--orange)" : "var(--green)";
            const densityBg = people > 20 ? "var(--red-bg)" : people > 8 ? "#fffbeb" : "var(--green-bg)";
            const densityBorder = people > 20 ? "rgba(220,38,38,.15)" : people > 8 ? "rgba(217,119,6,.18)" : "rgba(22,163,74,.18)";

            return (
              <div style={{borderRadius:11,background:"var(--white)",border:"1px solid var(--border)",padding:13,animation:"fadeUp .4s ease both"}}>
                <div style={{fontSize:".61rem",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"var(--muted2)",marginBottom:11}}>Scene Analysis</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  {/* Duration */}
                  <div style={{padding:"10px 12px",borderRadius:9,background:"var(--page)",border:"1px solid var(--border)"}}>
                    <div style={{fontSize:".61rem",fontWeight:600,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:3}}>Duration</div>
                    <div style={{fontSize:"1.1rem",fontWeight:700,color:"var(--text)",letterSpacing:"-.03em"}}>{duration}s</div>
                    <div style={{fontSize:".65rem",color:"var(--muted2)",marginTop:1}}>{frames} frames · {fps} fps</div>
                  </div>
                  {/* Crowd density */}
                  <div style={{padding:"10px 12px",borderRadius:9,background:densityBg,border:`1px solid ${densityBorder}`}}>
                    <div style={{fontSize:".61rem",fontWeight:600,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:3}}>Crowd density</div>
                    <div style={{fontSize:".88rem",fontWeight:700,color:densityColor,letterSpacing:"-.01em"}}>{density}</div>
                    <div style={{fontSize:".65rem",color:"var(--muted2)",marginTop:1}}>{people} {people===1?"person":"people"} detected</div>
                  </div>
                  {/* Vehicles */}
                  {vehicles > 0 && (
                    <div style={{padding:"10px 12px",borderRadius:9,background:"var(--page)",border:"1px solid var(--border)"}}>
                      <div style={{fontSize:".61rem",fontWeight:600,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:3}}>Vehicles</div>
                      <div style={{fontSize:"1.1rem",fontWeight:700,color:"var(--text)",letterSpacing:"-.03em"}}>{vehicles}</div>
                      <div style={{fontSize:".65rem",color:"var(--muted2)",marginTop:1}}>cars · trucks · buses</div>
                    </div>
                  )}
                  {/* Carried items */}
                  {bags > 0 && (
                    <div style={{padding:"10px 12px",borderRadius:9,background:"var(--page)",border:"1px solid var(--border)"}}>
                      <div style={{fontSize:".61rem",fontWeight:600,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:3}}>Carried items</div>
                      <div style={{fontSize:"1.1rem",fontWeight:700,color:"var(--text)",letterSpacing:"-.03em"}}>{bags}</div>
                      <div style={{fontSize:".65rem",color:"var(--muted2)",marginTop:1}}>bags · backpacks</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {showImgR&&result.detections_list?.length>0&&(()=>{
            const list = result.detections_list;
            const high   = list.filter(d=>d.confidence>=0.85).length;
            const medium = list.filter(d=>d.confidence>=0.60&&d.confidence<0.85).length;
            const low    = list.filter(d=>d.confidence<0.60).length;
            const total  = list.length;
            // top class by count
            const classCounts = {};
            list.forEach(d=>{ classCounts[d.label]=(classCounts[d.label]||0)+1; });
            const topClass = Object.entries(classCounts).sort((a,b)=>b[1]-a[1])[0];
            // avg confidence
            const avgConf = (list.reduce((s,d)=>s+d.confidence,0)/total*100).toFixed(1);
            // highest confidence detection
            const bestDet = list.reduce((a,b)=>a.confidence>b.confidence?a:b);

            return (
              <div className="ws-detlog">
                <div className="ws-detlog-hd">Detection Insights</div>

                {/* Confidence breakdown */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:".68rem",fontWeight:600,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Confidence breakdown</div>
                  <div style={{display:"flex",gap:8}}>
                    {[
                      {label:"High",count:high,color:"var(--green)",bg:"var(--green-bg)",border:"rgba(22,163,74,.18)",desc:"≥85%"},
                      {label:"Medium",count:medium,color:"var(--orange)",bg:"#fffbeb",border:"rgba(217,119,6,.18)",desc:"60–85%"},
                      {label:"Low",count:low,color:"var(--red)",bg:"var(--red-bg)",border:"rgba(220,38,38,.15)",desc:"<60%"},
                    ].map(({label,count,color,bg,border,desc})=>(
                      <div key={label} style={{
                        flex:1,padding:"10px 8px",borderRadius:10,
                        background:bg,border:`1px solid ${border}`,
                        textAlign:"center"
                      }}>
                        <div style={{fontSize:"1.4rem",fontWeight:700,color,letterSpacing:"-.04em",lineHeight:1}}>{count}</div>
                        <div style={{fontSize:".68rem",fontWeight:600,color,marginTop:3}}>{label}</div>
                        <div style={{fontSize:".6rem",color:"var(--muted2)",marginTop:1}}>{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key insights row */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{padding:"10px 12px",borderRadius:10,background:"var(--page)",border:"1px solid var(--border)"}}>
                    <div style={{fontSize:".62rem",fontWeight:600,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>Top detected</div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:clr(topClass[0]),flexShrink:0}}/>
                      <span style={{fontSize:".82rem",fontWeight:700,color:"var(--text)",letterSpacing:"-.01em"}}>{topClass[0]}</span>
                      <span style={{marginLeft:"auto",fontSize:".72rem",fontFamily:"var(--mono)",color:"var(--muted)",fontWeight:600}}>×{topClass[1]}</span>
                    </div>
                  </div>
                  <div style={{padding:"10px 12px",borderRadius:10,background:"var(--page)",border:"1px solid var(--border)"}}>
                    <div style={{fontSize:".62rem",fontWeight:600,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>Avg confidence</div>
                    <div style={{fontSize:".82rem",fontWeight:700,color:"var(--text)",letterSpacing:"-.01em"}}>{avgConf}%</div>
                  </div>
                  <div style={{padding:"10px 12px",borderRadius:10,background:"var(--page)",border:"1px solid var(--border)",gridColumn:"1/-1"}}>
                    <div style={{fontSize:".62rem",fontWeight:600,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:5}}>Best detection</div>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:clr(bestDet.label),flexShrink:0}}/>
                      <span style={{fontSize:".8rem",fontWeight:600,color:"var(--text2)"}}>{bestDet.label}</span>
                      <span style={{
                        marginLeft:"auto",fontFamily:"var(--mono)",fontSize:".72rem",fontWeight:700,
                        padding:"2px 8px",borderRadius:5,
                        background:"var(--green-bg)",color:"var(--green)",
                        border:"1px solid rgba(22,163,74,.18)"
                      }}>{(bestDet.confidence*100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

            </div>
          )}
        </main>

        {/* ── RIGHT: Activity Logs ── */}
        <aside className="ws-right">
          <div className="ws-right-head">
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M3 4h6M3 6h4M3 8h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Activity Logs
          </div>
          <div className="ws-right-body">
            {[...logs].reverse().map((log,i)=>(
              <div key={i} className={`ws-log ${log.type}`} style={{animationDelay:`${i*.03}s`}}>
                <div className="ws-log-t">{fmtT(log.time)}</div>
                <div className="ws-log-m">{log.text}</div>
              </div>
            ))}
          </div>
        </aside>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PHONE CAMERA PAGE 
═══════════════════════════════════════════════════════════════════════════ */
const PCC = `
.pc-page{
  position:fixed;inset:0;background:#000;
  display:flex;flex-direction:column;overflow:hidden;
  font-family:'Inter',-apple-system,sans-serif;
}
.pc-video{
  position:absolute;inset:0;width:100%;height:100%;
  object-fit:cover;
}
.pc-canvas{
  position:absolute;inset:0;width:100%;height:100%;
}
.pc-overlay{
  position:absolute;inset:0;
  display:flex;flex-direction:column;pointer-events:none;
}
.pc-topbar{
  padding:env(safe-area-inset-top,16px) 16px 12px;
  background:linear-gradient(to bottom,rgba(0,0,0,.65),transparent);
  display:flex;align-items:center;justify-content:space-between;
}
.pc-title{color:#fff;font-weight:700;font-size:.95rem;letter-spacing:-.01em;display:flex;align-items:center;gap:7px;}
.pc-live-dot{width:7px;height:7px;border-radius:50%;background:#ff3b30;animation:liveblink 1s infinite;}
.pc-fps{color:rgba(255,255,255,.6);font-size:.72rem;font-family:monospace;}
.pc-bottom{
  margin-top:auto;padding:12px 16px env(safe-area-inset-bottom,20px);
  background:linear-gradient(to top,rgba(0,0,0,.65),transparent);
}
.pc-chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;}
.pc-chip{
  padding:3px 10px;border-radius:99px;font-size:.72rem;font-weight:700;
  background:rgba(0,0,0,.55);color:#fff;border:1px solid rgba(255,255,255,.25);
  backdrop-filter:blur(6px);
}
.pc-hint{color:rgba(255,255,255,.45);font-size:.68rem;text-align:center;}
.pc-btn{
  width:100%;padding:13px;border-radius:12px;font-size:.9rem;font-weight:700;
  background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.25);
  backdrop-filter:blur(10px);margin-bottom:8px;pointer-events:all;
  transition:all .18s;
}
.pc-btn:active{transform:scale(.97);background:rgba(255,255,255,.25);}
.pc-btn.red{background:rgba(217,48,37,.7);border-color:rgba(217,48,37,.4);}
.pc-err{
  position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,.85);color:#fff;padding:24px;text-align:center;
}
.pc-err-t{font-size:1rem;font-weight:700;margin-bottom:8px;}
.pc-err-s{font-size:.8rem;color:rgba(255,255,255,.6);line-height:1.6;}
`;

function PhoneCameraPage() {
  const videoRef   = useRef();
  const loopRef    = useRef(null);
  const [running,  setRunning]  = useState(false);
  const [err,      setErr]      = useState("");
  const [camFace,  setCamFace]  = useState("environment");
  const streamRef2 = useRef(null);
  const channelRef = useRef(null);

  const API_URL = API;

  // -- Supabase Realtime Sender (Phone broadcasts frames to Laptop) --
  useEffect(() => {
    const room = new URLSearchParams(window.location.search).get("room");
    if (room) {
      getSB().then(sb => {
        const ch = sb.channel(`room_${room}`);
        ch.subscribe();
        channelRef.current = ch;
      });
    }
    return () => { if (channelRef.current) getSB().then(sb => sb.removeChannel(channelRef.current)); };
  }, []);

  const startCam = async (facingMode="environment") => {
    setErr("");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Mobile browsers block cameras on local HTTP networks. Please open your live Vercel link (https://...) to use the phone camera.");
      }

      if(streamRef2.current) streamRef2.current.getTracks().forEach(t=>t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video:{ facingMode, width:{ideal:1280}, height:{ideal:720} },
        audio:false
      });
      streamRef2.current = stream;
      if(videoRef.current){ videoRef.current.srcObject=stream; videoRef.current.play(); }
      setRunning(true);
      setCamFace(facingMode);
    } catch(e){
      setErr(e.message || "Camera access denied. Please allow camera in your browser settings.");
    }
  };

  const stopCam = () => {
    if(loopRef.current){ clearInterval(loopRef.current); loopRef.current=null; }
    if(streamRef2.current){ streamRef2.current.getTracks().forEach(t=>t.stop()); streamRef2.current=null; }
    if(videoRef.current){ videoRef.current.srcObject=null; }
    setRunning(false);
  };

  useEffect(()=>{
    if(!running) return;
    const offscreen = document.createElement("canvas");

    loopRef.current = setInterval(async()=>{
      const vid = videoRef.current;
      if(!vid||!vid.videoWidth) return;

      offscreen.width  = 640;
      offscreen.height = Math.round(640 * vid.videoHeight / vid.videoWidth);
      const ctx2 = offscreen.getContext("2d");
      ctx2.drawImage(vid, 0, 0, offscreen.width, offscreen.height);

      offscreen.toBlob(async blob=>{
        if(!blob) return;
        const fd = new FormData();
        fd.append("file", blob, "frame.jpg");
        fd.append("confidence", "0.20"); // Streamlined confidence filter
        try{
          const res = await fetch(`${API_URL}/api/detect/image`,{method:"POST",body:fd,signal:AbortSignal.timeout(4000)});
          if(!res.ok) return;
          const data = await res.json();
          
          // Broadcast to laptop!
          if (channelRef.current && data.image) {
             channelRef.current.send({ 
               type: 'broadcast', 
               event: 'frame', 
               payload: { image: data.image, counts: data.detections } 
             }).catch(()=>{});
          }
        }catch(_){}
      },"image/jpeg",0.65);
    }, 200); // 5 FPS transmission for smooth wireless streaming

    return ()=>{ if(loopRef.current){clearInterval(loopRef.current);loopRef.current=null;} };
  },[running, API_URL]);

  useEffect(()=>{ startCam(); return()=>stopCam(); },[]);

  if(err) return (
    <div className="pc-page">
      <style>{PCC}</style>
      <div className="pc-err">
        <div>
          <div className="pc-err-t">📷 Camera Error</div>
          <div className="pc-err-s">{err}</div>
          <button className="pc-btn" style={{marginTop:20,pointerEvents:"all"}} onClick={()=>startCam()}>Try Again</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pc-page">
      <style>{PCC}</style>
      <video ref={videoRef} className="pc-video" autoPlay playsInline muted/>
      <div className="pc-overlay">
        <div className="pc-topbar">
          <div className="pc-title">
            {running&&<div className="pc-live-dot"/>}
            VisionPro Viewfinder
          </div>
        </div>
        <div className="pc-bottom">
          <div className="pc-hint" style={{marginBottom: 20, fontSize: "1rem", color: "white", fontWeight: "bold"}}>
            Streaming wirelessly to Workspace...
          </div>
          {running ? (
            <>
              <button className="pc-btn" onClick={()=>startCam(camFace==="environment"?"user":"environment")}>
                🔄 Flip Camera
              </button>
              <button className="pc-btn red" onClick={stopCam}>⏹ Stop Streaming</button>
            </>
          ) : (
            <button className="pc-btn" onClick={()=>startCam()}>▶ Start Camera</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page,    setPage]    = useState("landing");
  const [authMode,setAuthMode]= useState("signup");
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const [theme, setTheme] = useState(localStorage.getItem('vp_theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vp_theme', theme);
  }, [theme]);

  const isPhonePage = window.location.pathname==="/phone";

  useEffect(()=>{
    if(isPhonePage){setLoading(false);return;}
    getSB().then(sb=>{
      sb.auth.getSession().then(async ({data:{session}})=>{
        if(session?.user){
          const { data:{ user: verifiedUser }, error } = await sb.auth.getUser();
          if(error || !verifiedUser){
            await sb.auth.signOut();
            setLoading(false);
            return;
          }
          const meta = verifiedUser.user_metadata || {};
          setUser({
            id: verifiedUser.id,
            name: meta.full_name || meta.name || verifiedUser.email.split("@")[0],
            email: verifiedUser.email,
            createdAt: verifiedUser.created_at
          });
          setPage("workspace");
        }
        setLoading(false);
      });
      sb.auth.onAuthStateChange((_event, session)=>{
        if(session?.user){
          const meta = session.user.user_metadata || {};
          const u = {
            id: session.user.id,
            name: meta.full_name || meta.name || session.user.email.split("@")[0],
            email: session.user.email,
            createdAt: session.user.created_at
          };
          setUser(u);
          if(_event==="SIGNED_IN") setPage("workspace");
          if(_event==="PASSWORD_RECOVERY") setPage("auth");
        } else {
          setUser(null);
          setPage("landing");
        }
      });
    });
  },[]);

  const goAuth   = (m)=>{setAuthMode(m);setPage("auth");};
  const onAuth   = (u)=>{setUser(u);setPage("workspace");};
  const onExit   = ()=>{ setPage("landing"); };
  const onLogout = async ()=>{
    const sb = await getSB();
    await sb.auth.signOut();
    setUser(null); setPage("landing");
  };

  const onOpenWorkspace = ()=>{
    if(user) setPage("workspace");
    else     goAuth("login");
  };

  const onGetStarted = ()=>{ goAuth("signup"); };

  if(isPhonePage) return <><style>{G}</style><PhoneCameraPage/></>;
  if(loading) return (
    <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--page)"}}>
      <div style={{width:28,height:28,border:"3px solid var(--border)",borderTopColor:"var(--text)",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
    </div>
  );

  return (
    <>
      <style>{G}</style>
      {page==="landing"   &&<LandingPage onOpenWorkspace={onOpenWorkspace} onGetStarted={onGetStarted} theme={theme} setTheme={setTheme}/>}
      {page==="auth"      &&<AuthPage    initMode={authMode} onAuth={onAuth} onBack={()=>setPage("landing")}/>}
      {page==="workspace" &&user&&<Workspace user={user} onDashboard={()=>setPage("dashboard")} onLogout={onLogout} onExit={onExit} theme={theme} setTheme={setTheme}/>}
      {page==="dashboard" &&user&&<Dashboard user={user} onBack={()=>setPage("workspace")} theme={theme} setTheme={setTheme}/>}
    </>
  );
}