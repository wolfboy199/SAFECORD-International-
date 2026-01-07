// SAFECORD — simple static SPA with in-browser mock backend
(function(){
  const ROOT = document.getElementById('root');

  // --- Simple mock DB in localStorage ---
  const DB_KEY = 'safecord:mockdb:v1';
  function loadDB(){
    try{const raw=localStorage.getItem(DB_KEY);if(raw) return JSON.parse(raw)}catch(e){}
    const initial = {
      users: [{username:'admin',passwordHash:null,displayName:'Administrator',role:'admin'}],
      servers: [ {id:'1',name:'General',desc:'Welcome to SAFECORD'} ],
      updates: [],
    };
    saveDB(initial);return initial;
  }
  function saveDB(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }
  const DB = loadDB();

  // Initialize admin password to 'admin' (first-run) if null
  (async ()=>{ if(!DB.users.find(u=>u.username==='admin').passwordHash){ DB.users[0].passwordHash = await hash('admin'); saveDB(DB); } })();

  // --- Utilities ---
  function el(tag,attrs={},...children){ const e=document.createElement(tag); for(const k in attrs){ if(k==='class') e.className=attrs[k]; else if(k.startsWith('on') && typeof attrs[k]==='function') e.addEventListener(k.substring(2),attrs[k]); else e.setAttribute(k,attrs[k]); } children.flat().forEach(c=>{ if(typeof c==='string') e.appendChild(document.createTextNode(c)); else if(c) e.appendChild(c); }); return e }
  function setActiveNav(name){ document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name)); }

  // --- Crypto hash for password storage ---
  async function hash(text){ const enc = new TextEncoder().encode(text); const buf = await crypto.subtle.digest('SHA-256', enc); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''); }

  // --- Auth ---
  function session(){ try{return JSON.parse(localStorage.getItem('safecord:session')||'null')}catch(e){return null} }
  function setSession(obj){ localStorage.setItem('safecord:session', JSON.stringify(obj)); }
  function clearSession(){ localStorage.removeItem('safecord:session'); }

  async function signup(username,password,display){ if(!username||!password) throw 'missing'; if(DB.users.find(u=>u.username===username)) throw 'exists'; const h=await hash(password); DB.users.push({username,passwordHash:h,displayName:display||username,role:'user'}); saveDB(DB); setSession({username}); }
  async function login(username,password){ const user = DB.users.find(u=>u.username===username); if(!user) throw 'no user'; const h = await hash(password); if(h!==user.passwordHash) throw 'bad'; setSession({username}); }

  // --- Render helpers ---
  function header(){ return el('div',{class:'topbar'}, el('div',{class:'logo'}, el('span',{class:'mark'}), el('div',{}, el('div',{class:'title'},'SAFECORD'), el('div',{class:'small'},'Static demo'))), el('div',{}, currentUser() ? el('div',{}, 'Signed in as ', el('strong',{}, currentUser().displayName || currentUser().username)) : el('div',{}, el('span',{class:'muted'},'Not signed in'))) ); }

  function currentUser(){ const s=session(); if(!s) return null; return DB.users.find(u=>u.username===s.username) || null; }

  function sidebar(){ const s = el('aside',{class:'sidebar'}, el('div',{class:'brand'}, el('span',{class:'mark'}), 'SAFECORD'), el('nav',{class:'nav'},
    el('button',{'data-view':'home',onclick:()=>navigate('home')}, 'Home'),
    el('button',{'data-view':'servers',onclick:()=>navigate('servers')}, 'Servers'),
    el('button',{'data-view':'profile',onclick:()=>navigate('profile')}, 'Profile'),
    el('button',{'data-view':'admin',onclick:()=>navigate('admin')}, 'Admin')
  ));
  return s; }

  function mainView(){ const main = el('main',{class:'main'});
  const top = header(); main.appendChild(top);
  const content = el('div',{id:'content'}); main.appendChild(content);
  return main; }

  // --- Pages ---
  function renderLogin(){ const container = el('div',{}, el('div',{class:'card'}, el('h2',{},'Sign in to SAFECORD'), el('form',{}, el('input',{type:'text',placeholder:'username',id:'login-username'}), el('input',{type:'password',placeholder:'password',id:'login-pass'}), el('div',{}, el('button',{class:'cta',type:'button',onclick:async ()=>{ const u=document.getElementById('login-username').value.trim(); const p=document.getElementById('login-pass').value; try{ await login(u,p); renderApp(); }catch(e){ alert('Login failed: '+e) } }},'Sign in'))), el('div',{class:'footer'},'First run default admin: username ',el('strong',{},'admin'),' password ',el('strong',{},'admin')))); return container }

  function renderHome(){ const content = el('div',{}, el('div',{class:'card'}, el('h3',{},'Welcome to SAFECORD (Static)'), el('p',{class:'muted'},'This is a static, single-file JS approximation of the original app. Data is stored locally in your browser for demo purposes.'))), el('div',{class:'card'}, el('h4',{},'Servers'), el('div',{}, DB.servers.map(s=> el('div',{}, el('strong',{},s.name), ' — ', el('span',{class:'muted'}, s.desc) ) ))) ); return content }

  function renderServers(){ return el('div',{}, el('div',{class:'card'}, el('h3',{},'Servers'), el('div',{}, DB.servers.map(s=> el('div',{}, el('strong',{},s.name), ' — ', el('span',{class:'muted'}, s.desc)))) , el('div',{}, el('h4',{},'Create server'), el('form',{}, el('input',{type:'text',id:'srv-name',placeholder:'Server name'}), el('input',{type:'text',id:'srv-desc',placeholder:'Short description'}), el('button',{class:'cta',type:'button',onclick:()=>{ const n=document.getElementById('srv-name').value.trim(); const d=document.getElementById('srv-desc').value.trim(); if(!n) return alert('name required'); DB.servers.push({id:Date.now().toString(),name:n,desc:d}); saveDB(DB); navigate('servers'); }},'Create')))) ); }

  function renderProfile(){ const u=currentUser(); if(!u) return el('div',{}, el('div',{class:'card'},'Not signed in')); return el('div',{}, el('div',{class:'card'}, el('h3',{},'Profile'), el('div',{}, el('strong',{},u.displayName || u.username)), el('div',{}, el('button',{class:'cta',onclick:()=>{ clearSession(); renderApp(); }},'Sign out')))) }

  function renderAdmin(){ const u=currentUser(); if(!u || u.role!=='admin') return el('div',{}, el('div',{class:'card'}, el('h3',{},'Admin'), el('p',{class:'muted'},'Admin access required')));
    return el('div',{}, el('div',{class:'card'}, el('h3',{},'Admin Console'), el('p',{class:'muted'},'Demo admin tools: view users, publish update')), el('div',{class:'card'}, el('h4',{},'Users'), el('div',{class:'users-list'}, DB.users.map(x=> el('div',{class:'user-pill'}, x.username + (x.role? ' • '+x.role : ''))))), el('div',{class:'card'}, el('h4',{},'Publish update (mock)'), el('textarea',{id:'upd-text',placeholder:'Update text'}), el('button',{class:'cta',onclick:()=>{ const t=document.getElementById('upd-text').value.trim(); if(!t) return alert('enter text'); DB.updates.push({id:Date.now().toString(),text:t,date:new Date().toISOString()}); saveDB(DB); alert('Published (mock)'); document.getElementById('upd-text').value=''; }} ,'Publish')) );
  }

  // --- Router ---
  function navigate(view){ setActiveNav(view); const content = document.getElementById('content'); if(!content) return; if(view==='home') content.replaceWith(renderHome()); if(view==='servers') content.replaceWith(renderServers()); if(view==='profile') content.replaceWith(renderProfile()); if(view==='admin') content.replaceWith(renderAdmin()); // ensure new content has id
    const newc = document.getElementById('content') || document.querySelector('.main > #content') ; if(!newc){ const m = document.querySelector('.main'); const c = el('div',{id:'content'}); m.appendChild(c); }
  }

  // --- App bootstrap ---
  function renderApp(){ const s = session(); if(!s){ // show login page only
      ROOT.innerHTML=''; ROOT.appendChild(el('div',{class:'center-box'}, renderLogin())); return; }

    ROOT.innerHTML=''; const app = el('div',{class:'app'}); app.appendChild(sidebar()); app.appendChild(mainView()); ROOT.appendChild(app);
    // default view
    setTimeout(()=>{ setActiveNav('home'); navigate('home'); },30);
  }

  // Initial start
  (function start(){ // if session present load app, else login
    const s = session(); if(s){ renderApp(); } else { // show login
        ROOT.innerHTML=''; ROOT.appendChild(renderLogin()); }
      // Attach handler for static login button (present in index.html) so page is usable before hydration
      const staticBtn = document.getElementById('login-btn');
      if(staticBtn){ staticBtn.addEventListener('click', async ()=>{ const u=document.getElementById('login-username').value.trim(); const p=document.getElementById('login-pass').value; try{ await login(u,p); renderApp(); }catch(e){ alert('Login failed: '+e) } }); }
  })();

})();
