(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`platform.ledger.v1`,t=6e4,n=e=>typeof e==`string`&&/^https:\/\/[A-Za-z0-9.-]+(:\d+)?(\/[^\s"'<>]*)?$/.test(e)?e:``,r=(e,t)=>typeof e==`string`?e.slice(0,t):``,i=e=>typeof e==`string`&&/^[a-z0-9][a-z0-9-]{0,40}$/.test(e);function a(e){let t=e??{};return{ratings:(Array.isArray(t.ratings)?t.ratings:[]).flatMap(e=>{let t=e,n=Number(t.stars);return!i(t.game)||typeof t.user!=`string`||!Number.isInteger(n)||n<1||n>5?[]:[{game:t.game,user:r(t.user,39),stars:n,comment:r(t.comment,600),date:r(t.date,40),issue:Number(t.issue)||void 0}]}),games:(Array.isArray(t.games)?t.games:[]).flatMap(e=>{let t=e,a=t.developer??{},o=n(t.url);return!i(t.slug)||!o||typeof t.title!=`string`||typeof a.github!=`string`?[]:[{slug:t.slug,title:r(t.title,60),url:o,type:r(t.type,30)||`Andet`,developer:{name:r(a.name,60)||a.github,github:r(a.github,39)},tagline:r(t.tagline,140),description:r(t.description,2e3),cover:n(t.cover)||void 0,date:r(t.date,40),issue:Number(t.issue)||void 0}]})}}async function o(n){if(!n)return{ratings:[],games:[]};try{let r=JSON.parse(sessionStorage.getItem(e)??`null`);if(r&&r.repo===n&&Date.now()-r.at<t)return a(r.data)}catch{}try{let r=await fetch(`https://raw.githubusercontent.com/${n}/data/ledger.json?t=${Math.floor(Date.now()/t)}`,{cache:`no-cache`});if(!r.ok)throw Error(`GitHub svarede ${r.status}`);let i=await r.json();try{sessionStorage.setItem(e,JSON.stringify({repo:n,at:Date.now(),data:i}))}catch{}return a(i)}catch(e){return{ratings:[],games:[],error:e.message}}}var s=(e,t,n)=>`https://github.com/${e}/issues/new?template=bedoem.yml&spil=${encodeURIComponent(t)}&title=${encodeURIComponent(`Bedømmelse: ${n}`)}`,c=e=>`https://github.com/${e}/issues/new?template=nyt-spil.yml`,l=(e,t)=>`https://github.com/${e}/issues/${t}`,u=document.getElementById(`app`),d=`platform.channel`,f={updated:null,games:[]},p={ratings:[],games:[]},m=[],h=e=>({slug:e.slug,title:e.title,tagline:e.tagline,description:e.description,cover:e.cover,tags:[],type:e.type,developer:e.developer,channels:{prod:`live`,dev:`live`},versions:[],url:e.url,issue:e.issue,date:e.date}),g=e=>(e?.github||e?.name||`ukendt`).toLowerCase(),_=e=>e?.name||e?.github||`Ukendt`,v=new Map;function y(){let e=new Map(m.map(e=>[e.slug,(e.developer?.github??``).toLowerCase()])),t=new Map;for(let n of[...p.ratings].sort((e,t)=>e.date.localeCompare(t.date)))e.has(n.game)&&e.get(n.game)!==n.user.toLowerCase()&&t.set(`${n.game}|${n.user.toLowerCase()}`,n);v=new Map;for(let e of t.values()){let t=v.get(e.game)??{votes:[],sum:0,avg:0};t.votes.push(e),t.sum+=e.stars,t.avg=t.sum/t.votes.length,v.set(e.game,t)}}var b=e=>v.get(e)??{votes:[],sum:0,avg:0},x=3;function S(e,t,n=!1){if(!t)return`<span class="stars none${n?` small`:``}">Ingen bedømmelser endnu</span>`;let r=Math.round(e);return`<span class="stars${n?` small`:``}" title="${e.toFixed(1)} af 5 – ${t} ${t===1?`bedømmelse`:`bedømmelser`}">${`★`.repeat(r)}<i>${`★`.repeat(5-r)}</i> <b>${e.toFixed(1)}</b> <span class="muted">(${t})</span></span>`}var C=e=>e.replace(/[&<>"']/g,e=>`&#${e.charCodeAt(0)};`),w=e=>new Date(e).toLocaleDateString(`da-DK`,{day:`numeric`,month:`long`,year:`numeric`}),T=`platform.devmode`,E=(()=>{let e=new URLSearchParams(location.search).get(`dev`);try{return e!==null&&localStorage.setItem(T,e===`0`?`0`:`1`),localStorage.getItem(T)===`1`}catch{return e!==null&&e!==`0`}})();function D(){if(!E)return`prod`;try{return localStorage.getItem(d)===`dev`?`dev`:`prod`}catch{return`prod`}}function O(e){try{localStorage.setItem(d,e)}catch{}document.body.classList.toggle(`dev`,e===`dev`),document.querySelectorAll(`[data-channel]`).forEach(t=>t.classList.toggle(`active`,t.dataset.channel===e)),H()}var k={prod:`Live`,dev:`Dev`};function A(e){return E?`<span class="badge ${e}">${k[e]}</span>`:``}var j={type:``,dev:``,sort:`best`};function M(){let e=D(),t=[...new Set(m.map(e=>e.type||`Andet`))].sort(),n=[...new Map(m.map(e=>[g(e.developer),_(e.developer)])).entries()].sort((e,t)=>e[1].localeCompare(t[1])),r=m.filter(e=>(!j.type||(e.type||`Andet`)===j.type)&&(!j.dev||g(e.developer)===j.dev)).sort((e,t)=>{let n=b(e.slug),r=b(t.slug);return j.sort===`az`?e.title.localeCompare(t.title,`da`):j.sort===`votes`?r.votes.length-n.votes.length||r.avg-n.avg:j.sort===`new`?N(t).localeCompare(N(e)):r.avg-n.avg||r.votes.length-n.votes.length}).map(t=>{let n=t.url?`live`:t.channels[e],r=b(t.slug);return`<a class="card ${n?``:`soon`}" href="#/spil/${t.slug}">
      <div class="cover">${t.cover?`<img src="${C(t.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:`<span class="nocover">${C(t.title.slice(0,1))}</span>`}</div>
      <div class="card-body">
        <h3>${C(t.title)}</h3>
        <p class="by">af ${C(_(t.developer))}</p>
        <p>${C(t.tagline)}</p>
        ${S(r.avg,r.votes.length,!0)}
        <div class="meta"><span class="tag type">${C(t.type||`Andet`)}</span>${t.tags.filter(e=>e!==t.type).map(e=>`<span class="tag">${C(e)}</span>`).join(``)}
          <span class="ver">${t.url?`Kollega`:n?`v${C(n)}`:`Kommer snart`}</span></div>
      </div>
    </a>`}),i=f.platform?.repo;u.innerHTML=`
    <section class="hero">
      <h1>${C(f.platform?.tagline??`Bibliotek`)}</h1>
      <p>${m.length} spil fra ${n.length} ${n.length===1?`udvikler`:`udviklere`} · Spil dem, giv dem stjerner – og byg selv det næste.
        ${e===`dev`?` Du ser <b>Dev</b>-kanalen.`:``}</p>
      ${p.error?`<p class="warn">Bedømmelserne kunne ikke hentes fra GitHub lige nu (${C(p.error)}). Prøv igen om lidt.</p>`:``}
    </section>
    <section class="filters">
      <div class="chips"><button data-type="" class="${j.type?``:`on`}">Alle</button>${t.map(e=>`<button data-type="${C(e)}" class="${j.type===e?`on`:``}">${C(e)}</button>`).join(``)}</div>
      <span class="spacer"></span>
      <label>Udvikler <select data-dev><option value="">Alle</option>${n.map(([e,t])=>`<option value="${C(e)}" ${j.dev===e?`selected`:``}>${C(t)}</option>`).join(``)}</select></label>
      <label>Sortér <select data-sort>
        ${[[`best`,`Bedst bedømt`],[`votes`,`Flest bedømmelser`],[`new`,`Nyeste`],[`az`,`A–Å`]].map(([e,t])=>`<option value="${e}" ${j.sort===e?`selected`:``}>${t}</option>`).join(``)}
      </select></label>
    </section>
    <section class="grid">${r.join(``)||`<p class="empty">Ingen spil passer til filtret.</p>`}
      ${i?`<a class="card add" href="#/guide"><div class="add-body"><span>＋</span><b>Tilføj dit spil</b><p>Indsend det på GitHub – så er du med i konkurrencen.</p></div></a>`:``}
    </section>`,u.querySelectorAll(`[data-type]`).forEach(e=>e.onclick=()=>(j.type=e.dataset.type,M())),u.querySelector(`[data-dev]`).onchange=e=>(j.dev=e.target.value,M()),u.querySelector(`[data-sort]`).onchange=e=>(j.sort=e.target.value,M())}var N=e=>e.date??e.versions.at(-1)?.date??``;function P(e){let t=D(),n=b(e.slug),r=f.platform?.repo,i=e.channels[t],a=t===`prod`?`dev`:`prod`;u.innerHTML=`
    <section class="game">
      <div class="game-cover">${e.cover?`<img src="${C(e.cover)}" alt="${C(e.title)}">`:``}</div>
      <div class="game-info">
        <a class="back" href="#/">← Bibliotek</a>
        <h1>${C(e.title)}</h1>
        <p class="tagline">${C(e.tagline)}</p>
        <p class="by">af <b>${C(_(e.developer))}</b></p>
        <div class="meta"><span class="tag type">${C(e.type||`Andet`)}</span>${e.tags.filter(t=>t!==e.type).map(e=>`<span class="tag">${C(e)}</span>`).join(``)}</div>
        <div class="rating">${S(n.avg,n.votes.length)}
          ${r?`<a class="rate" href="${C(s(r,e.slug,e.title))}" target="_blank" rel="noopener">★ Bedøm spillet</a>`:``}</div>
        <p class="desc">${C(e.description)}</p>
        ${e.url?`<a class="play" href="#/spil/${e.slug}/spil">▶ Spil nu</a>
             <p class="muted small">Et spil fra en kollega · <a href="${C(e.url)}" target="_blank" rel="noopener">åbn i nyt vindue</a></p>`:i?`<a class="play" href="#/spil/${e.slug}/spil">▶ Spil nu</a>
             <p class="muted">Version ${C(i)}${E?` ${A(t)}${e.channels[a]&&e.channels[a]!==i?` · ${k[a]}: ${C(e.channels[a])}`:``}`:``}</p>`:`<p class="soon-note">${E?`Ikke udgivet på ${k[t]} endnu.${e.channels[a]?` Skift til ${k[a]} for at spille version ${C(e.channels[a])}.`:``}`:`Kommer snart.`}</p>`}
        <p class="muted small">Dit spil gemmes i browseren.${E&&!e.url?` ${k.prod} og ${k.dev} har hver deres gemte spil.`:``}</p>
      </div>
    </section>
    ${I(n)}
    <section class="discussion"><h2>Kommentarer</h2><div id="giscus"></div></section>`,F(e)}function F(e){let t=document.getElementById(`giscus`),n=f.platform?.giscus,r=f.platform?.repo;if(!r||!n?.repoId||!n.categoryId){t.innerHTML=`<p class="muted">Kommentarsporet bliver slået til snart.</p>`;return}let i=document.createElement(`script`);i.src=`https://giscus.app/client.js`,i.async=!0,i.crossOrigin=`anonymous`;let a={repo:r,"repo-id":n.repoId,category:n.category,"category-id":n.categoryId,mapping:`specific`,term:`Kommentarer: ${e.slug}`,strict:`1`,"reactions-enabled":`1`,"emit-metadata":`0`,"input-position":`top`,theme:`dark_dimmed`,lang:`da`,loading:`lazy`};for(let[e,t]of Object.entries(a))i.setAttribute(`data-${e}`,t);t.append(i)}function I(e){if(!e.votes.length)return``;let t=f.platform?.repo,n=e.votes.filter(e=>e.comment.trim()).sort((e,t)=>t.date.localeCompare(e.date)),r=[...e.votes].sort((e,t)=>t.stars-e.stars||e.user.localeCompare(t.user)),i=e=>t&&e.issue?`href="${C(l(t,e.issue))}" target="_blank" rel="noopener"`:``;return`<section class="reviews">
    ${n.length?`<h2>Det siger kollegerne</h2>
    ${n.slice(0,20).map(e=>`<div class="review"><div class="review-head">${`★`.repeat(e.stars)}<i>${`★`.repeat(5-e.stars)}</i>
      <b>${C(e.user)}</b><span class="muted small">${w(e.date)}</span></div><p>${C(e.comment)}</p></div>`).join(``)}`:``}
    <h3>Alle stemmer (${r.length})</h3>
    <p class="voters">${r.map(e=>`<a ${i(e)}>${C(e.user)} <span>${`★`.repeat(e.stars)}</span></a>`).join(``)}</p>
    <p class="muted small">Alle stemmer er åbne: hver bedømmelse kan ses som et issue på GitHub. Kun godkendte kolleger kan stemme, én stemme pr. spil (den nyeste), og aldrig på egne spil.</p>
  </section>`}function L(e){let t=D(),n=e.url?`live`:e.channels[t];if(!n)return P(e);let r=e.url??`games/${e.slug}/${encodeURIComponent(n)}/index.html?channel=${t}`;document.body.classList.add(`playing`),V(`start/${e.slug}`,`Start: ${e.title}`,!0),u.innerHTML=`
    <div class="player">
      <div class="player-bar">
        <a class="back" href="#/spil/${e.slug}">← ${C(e.title)}</a>
        ${e.url?`<span class="muted">af ${C(_(e.developer))}</span>`:`<span class="muted">v${C(n)}</span>${A(t)}`}
        <span class="spacer"></span>
        <button id="fullscreen" title="Fuld skærm">⛶ Fuld skærm</button>
      </div>
      <iframe id="game-frame" src="${C(r)}" title="${C(e.title)}" allow="fullscreen; autoplay"
        ${e.url?`sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer"`:``}></iframe>
    </div>`,document.getElementById(`fullscreen`).onclick=()=>document.getElementById(`game-frame`).requestFullscreen?.()}function R(){let e=new Map;for(let t of m){let n=g(t.developer),r=e.get(n)??{name:_(t.developer),points:0,votes:0,games:[]},i=b(t.slug);r.points+=i.sum,r.votes+=i.votes.length,r.games.push(t),e.set(n,r)}let t=[...e.values()].sort((e,t)=>t.points-e.points||t.votes-e.votes||e.name.localeCompare(t.name)),n=[...e.values()].sort((e,t)=>t.games.length-e.games.length||t.points-e.points),r=m.map(e=>({g:e,sc:b(e.slug)})).filter(e=>e.sc.votes.length>=x).sort((e,t)=>t.sc.avg-e.sc.avg||t.sc.votes.length-e.sc.votes.length),i=m.filter(e=>b(e.slug).votes.length<x),a=e=>e<3?[`🥇`,`🥈`,`🥉`][e]:`${e+1}.`,o=e=>`#/?udvikler=${encodeURIComponent(e)}`;u.innerHTML=`
    <section class="hero"><h1>Topliste</h1>
      <p>Point er alle de stjerner, ens spil har fået af andre. Hver person tæller én gang pr. spil (den nyeste bedømmelse), og man kan ikke bedømme sine egne spil.</p>
      ${p.error?`<p class="warn">Bedømmelserne kunne ikke hentes fra GitHub lige nu – toplisten er tom indtil da.</p>`:``}</section>
    <section class="boards">
      <div class="board"><h2>Flest point</h2>
        <table>${t.map((e,t)=>`<tr><td class="rank">${a(t)}</td><td><a href="${o(g(e.games[0].developer))}">${C(e.name)}</a></td>
          <td class="num"><b>${e.points}</b> point</td><td class="num muted">${e.votes} ${e.votes===1?`stemme`:`stemmer`}</td></tr>`).join(``)}</table></div>
      <div class="board"><h2>Bedste spil</h2>
        ${r.length?`<table>${r.map(({g:e,sc:t},n)=>`<tr><td class="rank">${a(n)}</td><td><a href="#/spil/${e.slug}">${C(e.title)}</a><div class="muted small">${C(_(e.developer))}</div></td>
          <td class="num">${S(t.avg,t.votes.length,!0)}</td></tr>`).join(``)}</table>`:`<p class="muted">Endnu intet spil med ${x} bedømmelser.</p>`}
        ${i.length?`<p class="muted small">Mangler stemmer (under ${x}): ${i.map(e=>`<a href="#/spil/${e.slug}">${C(e.title)}</a> (${b(e.slug).votes.length})`).join(`, `)}</p>`:``}</div>
      <div class="board"><h2>Flest spil</h2>
        <table>${n.map((e,t)=>`<tr><td class="rank">${a(t)}</td><td><a href="${o(g(e.games[0].developer))}">${C(e.name)}</a>
          <div class="muted small">${e.games.map(e=>C(e.title)).join(`, `)}</div></td><td class="num"><b>${e.games.length}</b> spil</td></tr>`).join(``)}</table></div>
    </section>`}function z(){u.innerHTML=`<section class="hero"><h1>Ikke fundet</h1><p><a href="#/">Tilbage til biblioteket</a></p></section>`}function B(){let e=f.platform?.repo,t=e?c(e):``;u.innerHTML=`
    <section class="hero"><h1>Sådan tilføjer du dit spil</h1>
      <p>Dit spil kommer på spilsiden med det samme og er med i konkurrencen om flest point. Det tager 5 minutter, når spillet ligger online.</p></section>
    <section class="guide">
      <div class="step"><span class="n">1</span><div><h2>Det skal du have</h2>
        <ul>
          <li><b>En GitHub-konto, der er mindst 30 dage gammel.</b> Indsendelsen sker som et issue på GitHub, så toplisten ved, hvem der har lavet spillet.</li>
          <li><b>Et spil, der kører i browseren</b> – HTML/JavaScript, fx lavet med Claude. Ingen installation, intet login.</li>
          <li><b>En offentlig adresse, der starter med <code>https://</code>.</b> Spillet ligger hos dig, ikke på spilsiden.</li>
        </ul></div></div>
      <div class="step"><span class="n">2</span><div><h2>Læg spillet online</h2>
        <p>Har du ikke et sted? GitHub Pages er gratis:</p>
        <ol>
          <li>Lav et <b>offentligt</b> repository på GitHub og læg spillets filer i det (<code>index.html</code> i roden).</li>
          <li>Gå til <b>Settings → Pages</b>, vælg grenen <code>main</code> og mappen <code>/ (root)</code>, og gem.</li>
          <li>Efter et minut ligger spillet på <code>https://dit-brugernavn.github.io/repo-navn/</code>.</li>
        </ol>
        <p class="muted">Netlify, Vercel og lignende virker også. Brug relative stier (<code>./spil.js</code>, ikke <code>/spil.js</code>), så filerne findes under undermappen.</p></div></div>
      <div class="step"><span class="n">3</span><div><h2>Tjek, at det kan spilles herinde</h2>
        <p>Spilsiden viser dit spil i en ramme (en <i>iframe</i>) i en sandkasse. Det betyder:</p>
        <ul>
          <li>Siden må <b>ikke</b> nægte at blive vist i en ramme (<code>X-Frame-Options</code> eller <code>frame-ancestors</code>). GitHub Pages er i orden.</li>
          <li>Scripts, gemte spil (<code>localStorage</code>), lyd, fuld skærm, musefangst, formularer og popup-vinduer virker.</li>
          <li>Downloads og at skifte hele browserfanen til en anden side virker ikke.</li>
          <li>Spillet skal kunne starte uden login og fylde vinduet – det får hele skærmen under menulinjen.</li>
        </ul>
        <p class="muted">Valgfrit: en "Tilbage til menu"-knap kan sende <code>window.parent.postMessage({ type: "spilplatform:exit" }, "*")</code>, så kommer spilleren tilbage til spillets side.</p></div></div>
      <div class="step"><span class="n">4</span><div><h2>Udfyld formularen</h2>
        <table class="fields">
          <tr><td>Titel</td><td>Spillets navn, højst 60 tegn.</td></tr>
          <tr><td>Udvikler</td><td>Dit navn, som det skal stå på toplisten. Point går til din GitHub-konto.</td></tr>
          <tr><td>Adresse</td><td>Spillets <code>https://</code>-adresse fra trin 2.</td></tr>
          <tr><td>Type</td><td>Strategi, Simulation, Action, Arkade, Puslespil, Eventyr, Sport eller Andet – bruges til filtrene.</td></tr>
          <tr><td>Kort beskrivelse</td><td>Én linje til kortet i biblioteket, højst 140 tegn.</td></tr>
          <tr><td>Beskrivelse</td><td>Hvad går spillet ud på, og hvordan styrer man det? Højst 2000 tegn.</td></tr>
          <tr><td>Coverbillede</td><td>Valgfrit: <code>https://</code>-adresse på et billede i 16:9, fx 1280×720. Læg det samme sted som spillet.</td></tr>
        </table>
        ${t?`<p><a class="btn" href="${C(t)}" target="_blank" rel="noopener">Åbn formularen på GitHub</a></p>`:``}</div></div>
      <div class="step"><span class="n">5</span><div><h2>Når du har trykket "Submit new issue"</h2>
        <ul>
          <li>Inden for et minut svarer dommeren i issuet med ✅, og spillet står i biblioteket. Svarer den ⚠️, mangler titel eller adresse – indsend igen.</li>
          <li><b>Opdatér spillet ved at opdatere det på din adresse.</b> Spilsiden viser altid den nyeste version, og dine stemmer bliver.</li>
          <li>Rettelser i issuet bagefter tæller ikke. Skal titel eller tekst ændres, så indsend et nyt issue – men så starter det forfra uden stemmer, så skriv til Frederik i stedet, hvis det bare er en tekst.</li>
          <li>Frederik får besked om alle nye spil og kan tage et spil af siden.</li>
        </ul></div></div>
      <div class="step"><span class="n">★</span><div><h2>Konkurrencen</h2>
        <p>Kolleger giver 1–5 stjerner med "★ Bedøm spillet" på spillets side. Man kan ikke bedømme sine egne spil, og kun den nyeste stemme pr. person tæller. Alle stemmer er offentlige. Se stillingen på <a href="#/topliste">toplisten</a>.</p></div></div>
    </section>`}function V(e,t,n=!1){if(E)return;let r=0,i=()=>{let a=window.goatcounter;a?.count?a.count({path:e,title:t,event:n}):++r<40&&setTimeout(i,250)};i()}function H(){document.body.classList.remove(`playing`);let[e,t=``]=location.hash.replace(/^#\/?/,``).split(`?`),n=e.split(`/`).filter(Boolean);if(V(`/${e}`),document.querySelectorAll(`nav a`).forEach(e=>e.classList.toggle(`on`,e.getAttribute(`href`)===`#/${n[0]??``}`)),!n.length){let e=new URLSearchParams(t).get(`udvikler`);return e!==null&&(j.dev=e),M()}if(n[0]===`topliste`)return R();if(n[0]===`guide`)return B();if(n[0]===`spil`&&n[1]){let e=m.find(e=>e.slug===n[1]);return e?(document.title=`${e.title} – ${document.getElementById(`brand-title`).textContent}`,n[2]===`spil`?L(e):P(e)):z()}z()}async function U(){document.querySelectorAll(`[data-channel]`).forEach(e=>e.onclick=()=>O(e.dataset.channel)),document.querySelector(`.channel`).hidden=!E;try{f=await(await fetch(`catalog.json`,{cache:`no-cache`})).json()}catch{u.innerHTML=`<section class="hero"><h1>Kataloget kunne ikke hentes</h1><p>Prøv at genindlæse siden.</p></section>`;return}f.platform&&(document.getElementById(`brand-title`).textContent=f.platform.title,document.title=f.platform.title);let e=f.platform?.repo;e||(document.getElementById(`nav-submit`).hidden=!0),p=await o(e),m=[...f.games,...p.games.map(h)],y(),window.addEventListener(`hashchange`,H),window.addEventListener(`message`,e=>{let t=document.getElementById(`game-frame`);if(!t||e.source!==t.contentWindow||e.data?.type!==`spilplatform:exit`)return;let n=location.hash.replace(/^#\/?/,``).split(`/`)[1];location.hash=n?`#/spil/${n}`:`#/`}),O(D())}U();