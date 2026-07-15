let state = {
  active: 'dashboard',
  activeCallId: null,
  calls: [],
  sandboxCl: {},
  sandboxSc: {}
};

window.charts = {};

function mk(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!==undefined)e.innerHTML=html;return e;}

const API_URL = 'https://script.google.com/macros/s/AKfycbx1qJyA5y_23PzyQB92p_3PwutD9qozQedu6Dh0sbItvnA2_0yrRWoGmtfIrBwZEN6mkQ/exec';
const CLOSER_NAME = 'Eduardo';
const STORAGE_KEY = 'playbook_vendas_state';
const ACCESS_TOKEN_STORAGE_KEY = 'playbook_vendas_access_token';
const PLAYBOOK_PUBLIC_URL = 'https://eduardomingotti.github.io/playbook-vendas/';
let syncTimer = null;
let syncStatus = 'idle'; // idle | saving | saved | error
let apiReachable = false; // confirmado por ping inicial; controla o intervalo de debounce

window.PLAYBOOK_VERSION='13.0';
const PRECALL_NOTES_TEMPLATE = "Perguntas que preciso fazer:\n\nInformações que preciso descobrir:\n\nDor principal:\n\nSistema atual:\n\nDecisor:\n\nCusto da inação:\n\nHipótese de solução:\n\nObservações livres:\n";
function normalizeLeadName(str){return String(str||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');}
function normalizeStatus(str){return String(str||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function isInProgress(call){return normalizeStatus(call&&call.status)==='em andamento';}
function statusLabel(status){const s=normalizeStatus(status);if(s==='venda')return 'Fechado';if(s==='follow-up')return 'Follow-up';if(s==='no-show')return 'No-show';if(s==='perdido')return 'Perdido';if(s==='em andamento')return 'Em andamento';return status||'—';}
function makeLeadId(name){return 'lead_'+normalizeLeadName(name).replace(/\s+/g,'_')+'_'+Date.now();}
function formatDateShort(value){if(!value)return '';const s=String(value);if(/^\d{2}\/\d{2}\/\d{4}/.test(s))return s.slice(0,10);const d=new Date(s);if(!isNaN(d.getTime()))return d.toLocaleDateString('pt-BR');const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return `${m[3]}/${m[2]}/${m[1]}`;return s.replace(/T.*$/,'');}
function dateInputValue(value){if(!value)return '';const s=String(value);const br=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);if(br)return `${br[3]}-${br[2]}-${br[1]}`;const d=new Date(s);if(!isNaN(d.getTime()))return d.toISOString().slice(0,10);const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return iso?`${iso[1]}-${iso[2]}-${iso[3]}`:'';}
function ensureCallModel(call){if(!call)return call;if(!call.leadId)call.leadId=makeLeadId(call.leadName||'lead');if(!call.meetingType)call.meetingType='Primeira reunião';if(!Array.isArray(call.statusHistory))call.statusHistory=[{at:new Date().toISOString(),from:'',to:call.status||'Em andamento',note:call.statusNote||call.motivoPerdido||'',source:'frontend'}];if(!call.preCallNotes)call.preCallNotes={text:PRECALL_NOTES_TEMPLATE,updatedAt:'',locked:call.status&&!isInProgress(call)};if(call.statusNote===undefined)call.statusNote=call.motivoPerdido||'';if(call.finalObservation===undefined)call.finalObservation='';return call;}
function closeAllActionMenus(){document.querySelectorAll('.action-menu').forEach(m=>m.remove());}
document.addEventListener('click',e=>{if(!e.target.closest('.action-menu-wrap'))closeAllActionMenus();});
function scoreStatsFromCall(call){const sc=call&&call.sc?call.sc:{};let evaluated=0,total=0,max=24;for(let i=0;i<12;i++){const k=`sc-12-${i}`;if(sc[k]!==undefined&&sc[k]!==null){evaluated++;total+=Number(sc[k])||0;}}return{total,evaluated,max,percent:max?Math.round((total/max)*100):0};}


function saveToStorage(){
  localStorage.setItem('playbook_vendas_state', JSON.stringify(state));
  scheduleRemoteSync();
}

function scheduleRemoteSync(){
  syncStatus = 'saving';
  updateSyncBadge();
  clearTimeout(syncTimer);
  const delay = apiReachable ? 30000 : 1200;
  syncTimer = setTimeout(syncToRemote, delay);
}

function syncToRemote(){
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ closer: CLOSER_NAME, state: state })
  })
  .then(r => r.json())
  .then(() => { apiReachable = true; syncStatus = 'saved'; updateSyncBadge(); })
  .catch((err) => { console.error('Erro de sync:', err); syncStatus = 'error'; updateSyncBadge(); });
}

window.addEventListener('beforeunload', function(e){
  // Evita aviso indevido ao entrar no app; alerta apenas durante sincronização ativa.
  if(syncStatus === 'saving'){
    e.preventDefault();
    e.returnValue = '';
  }
});

function updateSyncBadge(){
  const el = document.getElementById('sync-badge');
  if(!el) return;
  const map = {
    idle: ['', ''],
    saving: ['<i class="ti ti-cloud-upload"></i> Salvando...', '#fbbf24'],
    saved: ['<i class="ti ti-cloud-check"></i> Salvo na nuvem', '#4ade80'],
    error: ['<i class="ti ti-cloud-off"></i> Falha ao sincronizar (salvo localmente)', '#f87171']
  };
  const [txt, color] = map[syncStatus] || map.idle;
  el.innerHTML = txt;
  el.style.color = color;
}

function loadFromStorage(){
  const saved = localStorage.getItem('playbook_vendas_state');
  if(saved){
    try {
      const parsed = JSON.parse(saved);
      if(parsed) state = { ...state, ...parsed };
    } catch(e) { console.error("Erro ao carregar dados", e); }
  }
}

function loadFromRemote(){
  return fetch(API_URL)
    .then(r => r.json())
    .then(data => {
      apiReachable = true;
      if(data && data.state){
        try {
          const parsed = JSON.parse(data.state);
          if(parsed && parsed.calls) {
            state = { ...state, ...parsed };
            localStorage.setItem('playbook_vendas_state', JSON.stringify(state));
          }
        } catch(e) { console.error('Erro ao parsear estado remoto', e); }
      }
    })
    .catch((err) => { console.error('Não foi possível conectar ao backend remoto. Usando dados locais.', err); });
}

function getActiveCall(){
  if(!state.activeCallId) return null;
  return state.calls.find(c => c.id === state.activeCallId) || null;
}

function getCurrentCl(){
  const call = getActiveCall();
  return call ? call.cl : state.sandboxCl;
}

function getCurrentSc(){
  const call = getActiveCall();
  return call ? call.sc : state.sandboxSc;
}

function renderSection(s,mod){
  const currentCl = getCurrentCl();
  const currentSc = getCurrentSc();

  if(s.t==='P'){
    const d=mk('div','sec');
    const box=mk('div','p-box');
    box.appendChild(mk('div','p-label',s.h));
    box.appendChild(mk('div','p-body',s.b));
    d.appendChild(box);return d;
  }
  if(s.t==='S'){
    const d=mk('div','sec');
    d.appendChild(mk('div','sec-h',s.h));
    if(s.sub)d.appendChild(mk('div','sec-sub',s.sub));
    d.appendChild(mk('div','s-box',s.b));
    return d;
  }
  if(s.t==='W'){
    const d=mk('div','sec');
    const box=mk('div','w-box');
    box.appendChild(mk('div','w-label','<i class="ti ti-ban"></i> '+s.h));
    const ul=mk('ul','');
    s.items.forEach(i=>{const li=mk('li','',i);ul.appendChild(li);});
    box.appendChild(ul);d.appendChild(box);return d;
  }
  if(s.t==='T'){
    const d=mk('div','sec');
    const box=mk('div','t-box');
    box.appendChild(mk('div','t-label','<i class="ti ti-info-circle"></i> '+s.h));
    box.appendChild(mk('div','t-body',s.b));
    d.appendChild(box);return d;
  }
  if(s.t==='ST'){
    const d=mk('div','sec');
    d.appendChild(mk('div','sec-h',s.h));
    if(s.sub)d.appendChild(mk('div','sec-sub',s.sub));
    const list=mk('div','gap6');
    s.items.forEach((item,i)=>{
      const card=mk('div','step-card');
      card.appendChild(mk('div','step-num',String(i+1)));
      const inner=mk('div','');
      inner.appendChild(mk('div','step-label',item.l));
      inner.appendChild(mk('div','step-desc',item.d));
      card.appendChild(inner);list.appendChild(card);
    });
    d.appendChild(list);return d;
  }
  if(s.t==='FW'){
    const d=mk('div','sec');
    d.appendChild(mk('div','sec-h',s.h));
    if(s.sub)d.appendChild(mk('div','sec-sub',s.sub));
    const list=mk('div','gap8');
    s.items.forEach(item=>{
      const row=mk('div','fw-row');
      row.appendChild(mk('div','fw-label',item.l));
      row.appendChild(mk('div','fw-desc',item.d));
      list.appendChild(row);
    });
    d.appendChild(list);return d;
  }
  if(s.t==='TBL'){
    const d=mk('div','sec');
    d.appendChild(mk('div','sec-h',s.h));
    if(s.sub)d.appendChild(mk('div','sec-sub',s.sub));
    const wrap=mk('div','tbl-wrap');
    const tbl=document.createElement('table');
    const thead=document.createElement('thead');
    const hr=document.createElement('tr');
    s.cols.forEach(c=>{const th=document.createElement('th');th.textContent=c;hr.appendChild(th);});
    thead.appendChild(hr);tbl.appendChild(thead);
    const tbody=document.createElement('tbody');
    s.rows.forEach(row=>{
      const tr=document.createElement('tr');
      row.forEach(cell=>{const td=document.createElement('td');td.textContent=cell;tr.appendChild(td);});
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);wrap.appendChild(tbl);d.appendChild(wrap);return d;
  }
  if(s.t==='RF'){
    const d=mk('div','sec');
    d.appendChild(mk('div','sec-h',s.h));
    s.items.forEach(item=>{
      const box=mk('div','rf-box');
      box.appendChild(mk('div','rf-flag','<i class="ti ti-alert-triangle"></i> '+item.f));
      box.appendChild(mk('div','rf-resp',item.r));
      d.appendChild(box);
    });
    return d;
  }
  if(s.t==='CL'){
    const d=mk('div','sec');
    d.appendChild(mk('div','sec-h',s.h));
    const box=mk('div','');
    box.style.cssText='border:1px solid #1e293b;border-radius:8px;overflow:hidden';
    s.items.forEach((item,i)=>{
      const key=`cl-${mod.id}-${i}`;
      const hasVal=currentCl[key]===true;
      const row=mk('div','cl-row'+(hasVal?' done':''));
      const icon=mk('i','ti '+(hasVal?'ti-circle-check':'ti-circle')+' cl-icon');
      const span=mk('span','cl-text',item);
      if(i<s.items.length-1)row.style.borderBottom='1px solid #1e293b';
      row.appendChild(icon);row.appendChild(span);
      row.addEventListener('click',()=>{
        currentCl[key]=!currentCl[key];
        saveToStorage();
        render();
      });
      box.appendChild(row);
    });
    d.appendChild(box);return d;
  }
  if(s.t==='SC'){
    const d=mk('div','sec');
    
    let evaluatedCount = 0;
    const total=s.items.reduce((sum,_,i)=>{
      const val=currentSc[`sc-${mod.id}-${i}`];
      if(val !== undefined && val !== null) {
        evaluatedCount++;
        return sum + val;
      }
      return sum;
    },0);
    
    const max=s.items.length*2;
    const pct=max > 0 ? Math.round((total/max)*100) : 0;
    const pctColor=pct>0 && evaluatedCount>0 ? (pct>=80?'#4ade80':pct>=50?'#fbbf24':'#f87171') : '#64748b';
    const barColor=pct>=80?'#22c55e':pct>=50?'#f59e0b':'#ef4444';
    
    const hdr=mk('div','sc-header');
    const left=mk('div','');
    left.appendChild(mk('div','sec-h',s.h));
    left.appendChild(mk('div','sec-sub',s.sub));
    const right=mk('div','');
    right.innerHTML=`<div class="sc-pct" style="color:${pctColor}">${evaluatedCount>0 ? pct+'%' : '--'}</div><div class="sc-pts">${total}/${max} pontos (${evaluatedCount}/${s.items.length})</div>`;
    hdr.appendChild(left);hdr.appendChild(right);d.appendChild(hdr);
    
    const bar=mk('div','sc-bar');
    const fill=mk('div','sc-bar-fill');
    fill.style.cssText=`width:${pct}%;background:${barColor}`;
    bar.appendChild(fill);d.appendChild(bar);
    
    s.items.forEach((item,i)=>{
      const key=`sc-${mod.id}-${i}`;
      const val=currentSc[key];
      const row=mk('div','sc-row');
      row.appendChild(mk('span','sc-item',item));
      const btns=mk('div','sc-btns');
      [0,1,2].forEach(v=>{
        const isAct = (val !== undefined && val !== null && val === v);
        const b=mk('button','sc-btn'+(isAct?' active':''),String(v));
        b.dataset.v=v;
        b.addEventListener('click',()=>{
          if(currentSc[key]===v){
            delete currentSc[key];
          } else {
            currentSc[key]=v;
          }
          saveToStorage();
          render();
        });
        btns.appendChild(b);
      });
      row.appendChild(btns);d.appendChild(row);
    });
    return d;
  }
  return null;
}

function showModal(title, htmlContent) {
  const backdrop = mk('div', 'md-backdrop');
  const box = mk('div', 'md-box');
  box.appendChild(mk('div', 'md-title', title));
  
  const container = mk('div');
  container.innerHTML = htmlContent;
  box.appendChild(container);
  backdrop.appendChild(box);
  
  const modalContainer = document.getElementById('modal-container');
  modalContainer.innerHTML = '';
  modalContainer.appendChild(backdrop);
  modalContainer.classList.remove('hidden');
}

function closeModal() {
  const modalContainer = document.getElementById('modal-container');
  modalContainer.innerHTML = '';
  modalContainer.classList.add('hidden');
}

function initNewCallForm() {
  showModal('Cadastrar Novo Lead', `
    <div class="md-form">
      <div class="md-group">
        <label class="md-label">Nome da Clínica / Lead</label>
        <input type="text" id="nc-lead" class="md-input" placeholder="Ex: Clínica São Lucas" required />
      </div>
      <div class="md-group">
        <label class="md-label">SDR que Agendou</label>
        <input type="text" id="nc-sdr" class="md-input" placeholder="Ex: João Silva" required />
      </div>
      <div class="md-group">
        <label class="md-label">Data da Reunião</label>
        <input type="date" id="nc-date" class="md-input" />
      </div>
      <div class="md-group">
        <label class="md-row-check">
          <input type="checkbox" id="nc-sao" checked style="accent-color:#3b82f6;" />
          <span>Validado como SAO (Sales Accepted Opportunity)</span>
        </label>
      </div>
      <div class="md-btns">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="submitNewCall()">Decolar Prontuário 🚀</button>
      </div>
    </div>
  `);
}

function submitNewCall() {
  const lead = document.getElementById('nc-lead').value.trim();
  const sdr = document.getElementById('nc-sdr').value.trim();
  const isSao = document.getElementById('nc-sao').checked;
  
  if(!lead || !sdr) {
    alert('Por favor, preencha todos os campos obrigatórios.');
    return;
  }
  
  const newCall = {
    id: 'call_' + Date.now(),
    leadName: lead,
    sdrName: sdr,
    isSao: isSao,
    status: 'Em andamento',
    motivoPerdido: '',
    date:(()=>{const d=document.getElementById('nc-date');return d&&d.value?new Date(d.value+'T12:00:00').toLocaleDateString('pt-BR'):new Date().toLocaleDateString('pt-BR')})(),
    cl: {},
    sc: {}
  };
  
  state.calls.push(newCall);
  state.activeCallId = newCall.id;
  state.active = 1; // Encaminha direto para o Pré-call
  closeModal();
  saveToStorage();
  render();
}

function openEndCallModal() {
  if(!state.activeCallId) return;
  showModal('Encerrar Sessão de Venda', `
    <div class="md-form">
      <div class="md-group">
        <label class="md-label">Status Final da Call</label>
        <select id="ec-status" class="md-input" onchange="document.getElementById('ec-motivo-wrap').classList.toggle('hidden', this.value !== 'Perdido')">
          <option value="Venda">Venda Concluída (SAL Assinado) 🟢</option>
          <option value="Follow-up">Follow-up Estratégico Agendado 🟡</option>
          <option value="Perdido">Perdido / Sem Fechamento 🔴</option>
          <option value="No-Show">No-Show (Lead não compareceu) ⚪</option>
        </select>
      </div>
      <div class="md-group hidden" id="ec-motivo-wrap">
        <label class="md-label">Motivo Primário da Perda</label>
        <input type="text" id="ec-motivo" class="md-input" placeholder="Ex: Fora do orçamento, falta módulo X..." />
      </div>
      <div class="md-btns">
        <button class="btn-secondary" onclick="closeModal()">Voltar</button>
        <button class="btn-primary" onclick="submitEndCall()">Arquivar Histórico</button>
      </div>
    </div>
  `);
}

function submitEndCall() {
  const status = document.getElementById('ec-status').value;
  const motivo = document.getElementById('ec-motivo').value.trim();
  
  const call = getActiveCall();
  if(call) {
    call.status = status;
    if(status === 'Perdido') call.motivoPerdido = motivo;
    state.activeCallId = null;
    state.active = 'dashboard';
    closeModal();
    saveToStorage();
    render();
  }
}

function deleteCall(id) {
  const call = (Array.isArray(state.calls) ? state.calls : []).find(c => c.id === id);
  const name = call && call.leadName ? call.leadName : 'esta reunião';
  const ok = confirm(`Deseja apagar a reunião de ${name}?\n\nA reunião será ocultada do histórico e marcada como excluída na planilha.`);
  if(!ok) return;

  const token = getAccessToken ? getAccessToken() : '';
  if(!token){
    alert('Chave de acesso não encontrada. Faça login novamente antes de apagar a reunião.');
    if(typeof resetAccessToken === 'function') resetAccessToken();
    return;
  }

  syncStatus = 'saving';
  updateSyncBadge();

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'deleteCall', token: token, closer: CLOSER_NAME, id: id })
  })
  .then(r => r.json())
  .then(data => {
    if(!data || data.ok === false) throw new Error(data && data.error ? data.error : 'delete_failed');
    state.calls = (Array.isArray(state.calls) ? state.calls : []).filter(c => c.id !== id);
    if(state.activeCallId === id) state.activeCallId = null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    syncStatus = 'saved';
    updateSyncBadge();
    render();
  })
  .catch(err => {
    console.error('Erro ao apagar reunião:', err);
    syncStatus = 'error';
    updateSyncBadge();
    if(String(err.message).includes('unauthorized')){
      alert('Chave inválida ou sessão expirada. Faça login novamente.');
      if(typeof resetAccessToken === 'function') resetAccessToken();
    } else {
      alert('Não foi possível apagar a reunião na nuvem. Tente novamente antes de limpar dados locais.');
    }
  });
}

function selectCall(id) {
  state.activeCallId = id;
  state.active = 1;
  saveToStorage();
  render();
}

function renderBanner(){const container=document.getElementById('call-banner-container');container.innerHTML='';const call=ensureCallModel(getActiveCall());document.body.classList.toggle('has-active-call',!!call);if(call){const bar=mk('div','sticky-context');const title=mk('div','sticky-context-title');title.innerHTML=`<span class="sticky-context-dot"></span><span><b>${escapeHtml(call.leadName)}</b> · SDR: ${escapeHtml(call.sdrName||'—')}</span>${call.isSao?' <span class="badge b-sao">SAO</span>':''}`;const actions=mk('div','sticky-context-actions');const bPre=mk('button','btn-secondary','Pré-call');bPre.onclick=()=>{state.active=1;saveToStorage();render();window.scrollTo(0,0);};const bNotes=mk('button','btn-secondary','Notas');bNotes.onclick=()=>{state.active=1;saveToStorage();render();setTimeout(()=>document.getElementById('precall-notes-text')?.focus(),80);};const bScore=mk('button','btn-secondary','Scorecard');bScore.onclick=()=>{state.active=12;saveToStorage();render();window.scrollTo(0,0);};const bEnd=mk('button','btn-danger','Concluir reunião');bEnd.onclick=openEndCallModal;actions.appendChild(bPre);actions.appendChild(bNotes);actions.appendChild(bScore);actions.appendChild(bEnd);bar.appendChild(title);bar.appendChild(actions);container.appendChild(bar);}else{const sandbox=mk('div','call-banner-sandbox');sandbox.innerHTML=`<i class="ti ti-info-circle"></i> Navegando sem reunião ativa. Vá até <b>Minhas Calls</b> para iniciar ou retomar uma reunião.`;container.appendChild(sandbox);}}

function renderDashboard() {
  const cnt = document.getElementById('content');
  cnt.innerHTML = '';
  
  cnt.appendChild(mk('div', 'mod-title', 'Cockpit de Vendas Consultivas'));
  cnt.appendChild(mk('div', 'mod-sub', 'Histórico local, acompanhamento de taxas de conversão de SAO e auditoria estrutural de processos.'));
  
  // Filter row
  const filRow=mk('div','fil-row');
  const fg1=mk('div','fil-grp'); fg1.innerHTML='<label class="fil-lbl">Data inicial</label>';
  const fi1=document.createElement('input'); fi1.type='date'; fi1.id='fil-start'; fi1.className='fil-inp';
  fi1.value=sessionStorage.getItem('fil-start')||''; fg1.appendChild(fi1);
  const fg2=mk('div','fil-grp'); fg2.innerHTML='<label class="fil-lbl">Data final</label>';
  const fi2=document.createElement('input'); fi2.type='date'; fi2.id='fil-end'; fi2.className='fil-inp';
  fi2.value=sessionStorage.getItem('fil-end')||''; fg2.appendChild(fi2);
  const bFil=mk('button','btn-primary','Filtrar');
  bFil.style.cssText='align-self:flex-end;font-size:12px;padding:7px 14px';
  bFil.addEventListener('click',()=>{
    sessionStorage.setItem('fil-start',document.getElementById('fil-start')?.value||'');
    sessionStorage.setItem('fil-end',document.getElementById('fil-end')?.value||'');
    state.active='dashboard'; render();
  });
  const bCmp=mk('button','btn-secondary','');
  bCmp.innerHTML='<i class="ti ti-arrows-left-right" style="font-size:13px;margin-right:5px"></i>Comparar';
  bCmp.style.cssText='align-self:flex-end;font-size:12px;padding:7px 12px;display:flex;align-items:center';
  bCmp.addEventListener('click',openCompareModal);
  filRow.appendChild(fg1); filRow.appendChild(fg2); filRow.appendChild(bFil); filRow.appendChild(bCmp);
  cnt.appendChild(filRow);

  const _fs=sessionStorage.getItem('fil-start')||''; const _fe=sessionStorage.getItem('fil-end')||'';
  let filteredCalls=state.calls;
  if(_fs||_fe){
    filteredCalls=state.calls.filter(c=>{
      if(!c.date) return true;
      const p=c.date.split('/'); if(p.length!==3) return true;
      const dt=new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime();
      return dt>=(_fs?new Date(_fs).getTime():0)&&dt<=(_fe?new Date(_fe+'T23:59:59').getTime():Infinity);
    });
  }

  const totalCalls = filteredCalls.length;
  const saos = filteredCalls.filter(c => c.isSao).length;
  const vendas = filteredCalls.filter(c => c.status === 'Venda').length;
  const txConv = saos > 0 ? Math.round((vendas / saos) * 100) : 0;
  
  let scoreSum = 0;
  let evaluatedCalls = 0;
  filteredCalls.forEach(c => {
    let scKeys = Object.keys(c.sc || {});
    if(scKeys.length > 0) {
      let sum = 0;
      let count = 0;
      scKeys.forEach(k => {
        if(c.sc[k] !== undefined && c.sc[k] !== null) {
          sum += c.sc[k];
          count++;
        }
      });
      if(count > 0) {
        scoreSum += (sum / (count * 2)) * 100;
        evaluatedCalls++;
      }
    }
  });
  const avgScore = evaluatedCalls > 0 ? Math.round(scoreSum / evaluatedCalls) : 0;

  const grid = mk('div', 'db-grid');
  grid.appendChild(createMetricCard('Total de Reuniões', totalCalls));
  grid.appendChild(createMetricCard('Volume de SAOs', saos));
  grid.appendChild(createMetricCard('Conversão (Venda / SAO)', txConv + '%'));
  grid.appendChild(createMetricCard('Aderência Média Playbook', avgScore > 0 ? avgScore + '%' : '--'));
  cnt.appendChild(grid);
  
  if(filteredCalls.length > 0) {
    const chartsRow = mk('div', 'db-charts');
    
    const container1 = mk('div', 'chart-container');
    container1.appendChild(mk('div', 'chart-title', 'Distribuição dos Fechamentos (Status)'));
    const cw1=mk('div',''); cw1.style='position:relative;height:180px';
    const canvas1=document.createElement('canvas'); canvas1.id='chartStatus';
    cw1.appendChild(canvas1); container1.appendChild(cw1);
    chartsRow.appendChild(container1);
    
    const container2 = mk('div', 'chart-container');
    container2.appendChild(mk('div', 'chart-title', 'Volume Comercial por SDR'));
    const cw2=mk('div',''); cw2.style='position:relative;height:180px';
    const canvas2=document.createElement('canvas'); canvas2.id='chartSdr';
    cw2.appendChild(canvas2); container2.appendChild(cw2);
    chartsRow.appendChild(container2);
    
    cnt.appendChild(chartsRow);

    const evoContainer = mk('div', 'chart-container');
    evoContainer.style.marginBottom = '28px';
    evoContainer.appendChild(mk('div', 'chart-title', 'Evolução Mensal — Aderência ao Playbook x Conversão'));
    const cw3 = mk('div', ''); cw3.style = 'position:relative;height:220px';
    const canvas3 = document.createElement('canvas'); canvas3.id = 'chartEvolution';
    cw3.appendChild(canvas3); evoContainer.appendChild(cw3);
    evoContainer.appendChild(mk('div', 'evo-note', 'Aderência = média dos scorecards preenchidos no mês. Conversão = Vendas / SAOs no mês. Com baixo volume de reuniões por mês, a correlação entre as duas linhas é estatisticamente frágil — dados mais confiáveis aparecem com volume maior de reuniões por mês.'));
    cnt.appendChild(evoContainer);
  }

  const listHeader = mk('div', '', '<h3 style="font-size:16px; font-weight:600; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">Histórico de Reuniões</h3>');
  const btnNew = mk('button', 'btn-primary', '<i class="ti ti-plus"></i> Novo Lead');
  btnNew.addEventListener('click', initNewCallForm);
  listHeader.firstChild.appendChild(btnNew);
  cnt.appendChild(listHeader);
  
  if(state.calls.length === 0) {
    cnt.appendChild(mk('div', '', '<p style="font-size:13px; color:#64748b; padding:20px; text-align:center; background:#1a2332; border:1px solid #334155; border-radius:8px;">Nenhuma reunião registrada localmente. Inicie uma nova call acima.</p>'));
  } else {
    const callsToDisplay=filteredCalls;
    const tblWrap = mk('div', 'tbl-wrap');
    const tbl = document.createElement('table');
    tbl.innerHTML = `
      <thead>
        <tr>
          <th>Lead / Clínica</th>
          <th>SDR</th>
          <th>SAO</th>
          <th>Data</th>
          <th>Status</th>
          <th style="text-align:right;">Ações</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = tbl.querySelector('tbody');
    
    [...callsToDisplay].reverse().forEach(c => {
      const tr = document.createElement('tr');
      
      let statusClass = 'b-progress';
      if(c.status === 'Venda') statusClass = 'b-venda';
      if(c.status === 'Follow-up') statusClass = 'b-follow';
      if(c.status === 'Perdido') statusClass = 'b-perdido';
      if(c.status === 'No-Show') statusClass = 'b-noshow';
      
      const statusLabel = c.status === 'Perdido' && c.motivoPerdido ? `${c.status} (${c.motivoPerdido})` : c.status;
      
      tr.innerHTML = `
        <td><b>${c.leadName}</b></td>
        <td>${c.sdrName}</td>
        <td>${c.isSao ? '<span class="badge b-sao">SAO</span>' : '<span style="color:#475569">—</span>'}</td>
        <td>${c.date}</td>
        <td><span class="badge ${statusClass}">${statusLabel}</span></td>
        <td style="text-align:right;"></td>
      `;
      
      const actTd = tr.querySelector('td:last-child');
      
      if(c.status === 'Em andamento') {
        const btnSel = mk('button', 'table-action-btn', 'Retomar');
        btnSel.addEventListener('click', () => selectCall(c.id));
        actTd.appendChild(btnSel);
      } else {
        const btnReview = mk('button', 'table-action-btn', 'Ver Checklist');
        btnReview.addEventListener('click', () => {
          state.activeCallId = c.id;
          state.active = 1;
          saveToStorage();
          render();
        });
        actTd.appendChild(btnReview);
      }
      
      const btnEd=mk('button','table-action-btn','Editar');
      btnEd.addEventListener('click',()=>openEditCallModal(c.id));
      actTd.appendChild(btnEd);
      const btnDel = mk('button', 'table-delete-btn', 'Apagar');
      btnDel.addEventListener('click', () => deleteCall(c.id));
      actTd.appendChild(btnDel);
      
      tbody.appendChild(tr);
    });
    
    tblWrap.appendChild(tbl);
    cnt.appendChild(tblWrap);
    
    setTimeout(() => buildCharts(filteredCalls), 50);
  }
}

function createMetricCard(label, val){
  const card = mk('div', 'db-card');
  card.appendChild(mk('div', 'db-card-label', label));
  card.appendChild(mk('div', 'db-card-val', String(val)));
  return card;
}

function getMonthKey(dateStr){
  if(!dateStr) return null;
  const p = dateStr.split('/');
  if(p.length !== 3) return null;
  return p[2] + '-' + p[1].padStart(2, '0');
}

function monthLabel(key){
  const [y, m] = key.split('-');
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return meses[parseInt(m, 10) - 1] + '/' + y.slice(2);
}

function buildEvolutionData(calls){
  const map = {};
  calls.forEach(c => {
    const key = getMonthKey(c.date);
    if(!key) return;
    if(!map[key]) map[key] = { saos: 0, vendas: 0, scoreSum: 0, scoreCount: 0 };
    if(c.isSao) map[key].saos++;
    if(c.status === 'Venda') map[key].vendas++;
    const scKeys = Object.keys(c.sc || {});
    if(scKeys.length > 0){
      let sum = 0, count = 0;
      scKeys.forEach(k => {
        if(c.sc[k] !== undefined && c.sc[k] !== null){ sum += c.sc[k]; count++; }
      });
      if(count > 0){
        map[key].scoreSum += (sum / (count * 2)) * 100;
        map[key].scoreCount++;
      }
    }
  });
  const keys = Object.keys(map).sort();
  return {
    labels: keys.map(monthLabel),
    adherence: keys.map(k => map[k].scoreCount > 0 ? Math.round(map[k].scoreSum / map[k].scoreCount) : null),
    conversion: keys.map(k => map[k].saos > 0 ? Math.round((map[k].vendas / map[k].saos) * 100) : null)
  };
}

function buildCharts(calls) {
  if (window.charts.status) window.charts.status.destroy();
  if (window.charts.sdr) window.charts.sdr.destroy();
  if (window.charts.evolution) window.charts.evolution.destroy();
  
  const ctxStatus = document.getElementById('chartStatus');
  const ctxSdr = document.getElementById('chartSdr');
  if(!ctxStatus || !ctxSdr) return;

  const statusCounts = { 'Venda': 0, 'Follow-up': 0, 'Perdido': 0, 'No-Show': 0, 'Em andamento': 0 };
  calls.forEach(c => { if(statusCounts[c.status] !== undefined) statusCounts[c.status]++; });

  window.charts.status = new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#64748b', '#3b82f6'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 } } } }
    }
  });

  const sdrData = {};
  calls.forEach(c => {
    if(!sdrData[c.sdrName]) sdrData[c.sdrName] = { saos: 0, vendas: 0 };
    if(c.isSao) sdrData[c.sdrName].saos++;
    if(c.status === 'Venda') sdrData[c.sdrName].vendas++;
  });

  window.charts.sdr = new Chart(ctxSdr, {
    type: 'bar',
    data: {
      labels: Object.keys(sdrData),
      datasets: [
        { label: 'Oportunidades SAO', data: Object.values(sdrData).map(d => d.saos), backgroundColor: '#06b6d4' },
        { label: 'Vendas Fechadas', data: Object.values(sdrData).map(d => d.vendas), backgroundColor: '#10b981' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
        y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#1e293b' } }
      },
      plugins: { legend: { labels: { color: '#94a3b8' } } }
    }
  });

  const ctxEvo = document.getElementById('chartEvolution');
  if(ctxEvo){
    const evo = buildEvolutionData(calls);
    window.charts.evolution = new Chart(ctxEvo, {
      type: 'line',
      data: {
        labels: evo.labels,
        datasets: [
          { label: 'Aderência ao playbook (%)', data: evo.adherence, borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.15)', tension: 0.25, spanGaps: true },
          { label: 'Conversão (Venda/SAO) (%)', data: evo.conversion, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)', tension: 0.25, spanGaps: true }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
          y: { min: 0, max: 100, ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }
        },
        plugins: { legend: { labels: { color: '#94a3b8' } } }
      }
    });
  }
}

function renderSettings() {
  const cnt = document.getElementById('content');
  cnt.innerHTML = '';
  
  cnt.appendChild(mk('div', 'mod-title', 'Configurações e Salvaguarda de Dados'));
  cnt.appendChild(mk('div', 'mod-sub', 'Como o ecossistema opera 100% no seu navegador, faça backups regulares para evitar perdas ao limpar o cache.'));
  
  const box = mk('div', 'p-box', '');
  box.style.background = '#1a2332';
  box.style.borderColor = '#334155';
  
  box.innerHTML = `
    <h4 style="font-size:14px; margin-bottom:8px; color:#f1f5f9;">Exportar Registros</h4>
    <p style="font-size:12px; color:#94a3b8; margin-bottom:14px;">Gere e faça o download de um arquivo contendo todo o seu histórico e notas para importação posterior em qualquer dispositivo.</p>
    <button class="btn-primary" onclick="exportData()"><i class="ti ti-download"></i> Baixar Backup JSON</button>
    <hr style="border:none; border-top:1px solid #334155; margin:24px 0;" />
    <h4 style="font-size:14px; margin-bottom:8px; color:#f1f5f9;">Importar Registros</h4>
    <p style="font-size:12px; color:#94a3b8; margin-bottom:14px;">⚠️ Atenção: Ao importar, os registros atuais salvos neste navegador serão substituídos pelo arquivo enviado.</p>
    <input type="file" id="import-file-field" class="md-input" accept=".json" style="max-width:300px; margin-bottom:14px; display:block;" />
    <button class="btn-secondary" onclick="importData()" style="color:#4ade80; border-color:#166534;"><i class="ti ti-upload"></i> Restaurar Banco de Dados</button>
    <hr style="border:none; border-top:1px solid #334155; margin:24px 0;" />
    <h4 style="font-size:14px; margin-bottom:8px; color:#f1f5f9;">Limpar Cache Local</h4>
    <p style="font-size:12px; color:#94a3b8; margin-bottom:14px;">Remove os dados salvos neste navegador (localStorage). Os dados já sincronizados com o Google Sheets não são afetados — a tela recarrega automaticamente a partir da nuvem.</p>
    <button class="btn-secondary" onclick="clearLocalCache()" style="color:#f87171; border-color:#991b1b;"><i class="ti ti-trash"></i> Limpar Cache Local</button>
  `;
  cnt.appendChild(box);
}

function clearLocalCache(){
  if(syncStatus !== 'saved'){
    const proceed = confirm('Há alterações ainda não sincronizadas com a nuvem. Recomendamos esperar a sincronização concluir, ou baixar um backup primeiro (botão acima). Deseja limpar o cache mesmo assim?');
    if(!proceed) return;
  }
  const confirmFinal = confirm('Tem certeza? Isso vai apagar os dados salvos neste navegador. Dados já sincronizados com o Google Sheets não são afetados.');
  if(!confirmFinal) return;
  localStorage.removeItem('playbook_vendas_state');
  state = { active: 'dashboard', activeCallId: null, calls: [], sandboxCl: {}, sandboxSc: {} };
  render();
  loadFromRemote().then(() => render());
}

function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `playbook_vendas_backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importData() {
  const fileField = document.getElementById('import-file-field');
  if(!fileField.files || fileField.files.length === 0) {
    alert('Selecione um arquivo de backup .json válido antes de prosseguir.');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedState = JSON.parse(e.target.result);
      if(importedState && Array.isArray(importedState.calls)) {
        state = importedState;
        saveToStorage();
        alert('Banco de dados restaurado com sucesso!');
        state.active = 'dashboard';
        render();
      } else {
        alert('Formato de backup inválido.');
      }
    } catch(err) {
      alert('Erro ao processar o arquivo JSON.');
    }
  };
  reader.readAsText(fileField.files[0]);
}


function openEditCallModal(id){
  const call=state.calls.find(c=>c.id===id); if(!call) return;
  let di='';
  if(call.date){const p=call.date.split('/');if(p.length===3)di=p[2]+'-'+p[1]+'-'+p[0];}
  const opts=['Em andamento','Follow-up','Venda','Perdido','No-Show'].map(s=>'<option value="'+s+'"'+(call.status===s?' selected':'')+'>'+s+'</option>').join('');
  showModal('Editar Registro de Call',`
    <div class="md-form">
      <div class="md-group"><label class="md-label">Lead / Clínica</label>
        <input type="text" id="ed-lead" class="md-input" value="${call.leadName||''}" /></div>
      <div class="md-group"><label class="md-label">SDR</label>
        <input type="text" id="ed-sdr" class="md-input" value="${call.sdrName||''}" /></div>
      <div class="md-group"><label class="md-label">Data</label>
        <input type="date" id="ed-date" class="md-input" value="${di}" /></div>
      <div class="md-group"><label class="md-label">Status</label>
        <select id="ed-status" class="md-input">${opts}</select></div>
      <div class="md-group"><label class="md-row-check">
        <input type="checkbox" id="ed-sao" ${call.isSao?'checked':''} style="accent-color:#3b82f6;" />
        <span>Validado como SAO</span></label></div>
      <div class="md-btns">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="submitEditCall('${id}')">Salvar</button>
      </div>
    </div>
  `);
}

function submitEditCall(id){
  const call=state.calls.find(c=>c.id===id); if(!call) return;
  const l=document.getElementById('ed-lead').value.trim(); if(l) call.leadName=l;
  const s=document.getElementById('ed-sdr').value.trim(); if(s) call.sdrName=s;
  call.status=document.getElementById('ed-status').value;
  call.isSao=document.getElementById('ed-sao').checked;
  const dv=document.getElementById('ed-date').value;
  if(dv) call.date=new Date(dv+'T12:00:00').toLocaleDateString('pt-BR');
  closeModal(); saveToStorage(); render();
}

function openCompareModal(){
  if(state.calls.length<2){alert('Você precisa de pelo menos 2 reuniões registradas para comparar.');return;}
  const opts=[...state.calls].reverse().map(c=>`<option value="${c.id}">${c.leadName} (${c.date||'s/d'}) — ${c.status}</option>`).join('');
  showModal('Comparador de Reuniões',`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="md-group">
        <label class="md-label">Reunião A</label>
        <select id="comp-a" class="md-input" onchange="renderCompare()">
          <option value="">-- Selecione A --</option>${opts}
        </select>
      </div>
      <div class="md-group">
        <label class="md-label">Reunião B</label>
        <select id="comp-b" class="md-input" onchange="renderCompare()">
          <option value="">-- Selecione B --</option>${opts}
        </select>
      </div>
    </div>
    <div id="comp-results"></div>
  `);
  const box=document.querySelector('#modal-container .md-box');
  if(box) box.style.maxWidth='680px';
}

function renderCompare(){
  const elA=document.getElementById('comp-a');
  const elB=document.getElementById('comp-b');
  const res=document.getElementById('comp-results');
  if(!elA||!elB||!res) return;
  const idA=elA.value; const idB=elB.value;
  if(!idA||!idB){res.innerHTML='';return;}
  const cA=state.calls.find(c=>c.id===idA);
  const cB=state.calls.find(c=>c.id===idB);
  if(!cA||!cB) return;
  const scSec=M[12].s.find(s=>s.t==='SC');
  const items=scSec?scSec.items:[];
  const mid=12;
  let html='<div class="cmp-grid">';
  [cA,cB].forEach(call=>{
    let pts=0; const mx=items.length*2;
    html+='<div class="cmp-col"><div style="font-size:13px;font-weight:600;color:#f1f5f9;margin-bottom:3px">'+call.leadName+'</div>';
    html+='<div style="font-size:11px;color:#64748b;margin-bottom:10px">'+call.sdrName+' · '+(call.date||'s/d')+' · '+call.status+'</div>';
    items.forEach((item,i)=>{
      const v=call.sc&&call.sc['sc-'+mid+'-'+i]!==undefined&&call.sc['sc-'+mid+'-'+i]!==null?call.sc['sc-'+mid+'-'+i]:null;
      if(v!==null) pts+=v;
      const cls=v===2?'cmp-v2':v===1?'cmp-v1':v===0?'cmp-v0':'cmp-vm';
      html+='<div class="cmp-row"><span>'+item+'</span><span class="cmp-val '+cls+'">'+(v!==null?v:'—')+'</span></div>';
    });
    const pct=mx>0?Math.round((pts/mx)*100):0;
    const pc=pct>=80?'#4ade80':pct>=50?'#fbbf24':'#f87171';
    html+='<div style="margin-top:10px;padding-top:8px;border-top:1px solid #334155;display:flex;justify-content:space-between;font-size:12px;color:#94a3b8"><span>Aderência</span><b style="color:'+pc+'">'+pct+'%</b></div>';
    html+='</div>';
  });
  html+='</div>';
  res.innerHTML=html;
}

function render(){renderBanner();if(!document.querySelector('.version-badge')){const vb=mk('div','version-badge','V11.0');document.body.appendChild(vb);}document.getElementById('btn-db').classList.toggle('active',state.active==='dashboard');document.getElementById('btn-cfg').classList.toggle('active',state.active==='settings');const nav=document.getElementById('nav');nav.innerHTML='';M.forEach(m=>{const isAct=(state.active===m.id);const btn=mk('button','sb-btn'+(isAct?' active':''));btn.style.setProperty('--ac',m.accent);btn.innerHTML=`<i class="ti ${m.icon}" style="font-size:15px;color:${isAct?m.accent:'inherit'};flex-shrink:0"></i>${m.label}`;btn.addEventListener('click',()=>{state.active=m.id;saveToStorage();render();window.scrollTo(0,0);});nav.appendChild(btn);});document.getElementById('btn-db').onclick=()=>{state.active='dashboard';saveToStorage();render();};document.getElementById('btn-cfg').onclick=()=>{state.active='settings';saveToStorage();render();};if(state.active==='dashboard'){renderDashboard();return;}if(state.active==='settings'){renderSettings();return;}const mod=M[state.active];const cnt=document.getElementById('content');cnt.innerHTML='';const num=mk('div','mod-num',`módulo ${String(mod.id).padStart(2,'0')}`);num.style.color=mod.accent;cnt.appendChild(num);cnt.appendChild(mk('div','mod-title',mod.title));cnt.appendChild(mk('div','mod-sub',mod.sub));mod.s.forEach(s=>{const sec=renderSection(s,mod);if(sec)cnt.appendChild(sec);});appendContextualModuleActions(mod.id,cnt);}

function setupMobileNav(){
  const toggle=document.getElementById('sb-toggle');
  const sb=document.getElementById('sb-nav');
  const backdrop=document.getElementById('sb-backdrop');
  if(!toggle||!sb||!backdrop) return;
  const open=()=>{sb.classList.add('sb-open');backdrop.classList.add('show');toggle.setAttribute('aria-expanded','true');};
  const close=()=>{sb.classList.remove('sb-open');backdrop.classList.remove('show');toggle.setAttribute('aria-expanded','false');};
  toggle.addEventListener('click',()=>{
    sb.classList.contains('sb-open')?close():open();
  });
  backdrop.addEventListener('click',close);
  sb.addEventListener('click',(e)=>{
    if(e.target.closest('button')) close();
  });
}


/* ===== MELHORIAS SOLICITADAS - PATCH COPILOT ===== */
function getScorecardDefinition(){ const mod = M.find(m => m.id === 12); return mod ? mod.s.find(s => s.t === 'SC') : null; }
function getScorecardStats(call){ const scDef=getScorecardDefinition(); const totalItems=scDef?scDef.items.length:0; const sc=(call&&call.sc)?call.sc:{}; let evaluated=0,points=0; for(let i=0;i<totalItems;i++){const key=`sc-12-${i}`; if(sc[key]!==undefined&&sc[key]!==null){evaluated++; points+=Number(sc[key])||0;}} return {evaluated,totalItems,points,max:totalItems*2,complete:totalItems>0&&evaluated===totalItems}; }
function hasAnyScorecardAnswer(call){ return getScorecardStats(call).evaluated>0; }
function getDemoRealizadaCalls(calls){ return calls.filter(c=>c.status!=='No-Show'&&c.status!=='Em andamento'); }
function getConversionStats(calls){ const demos=getDemoRealizadaCalls(calls).length; const saos=calls.filter(c=>c.isSao).length; const vendas=calls.filter(c=>c.status==='Venda').length; const pct=(n,d)=>d>0?Math.round((n/d)*100):0; return {demos,saos,vendas,demoSao:pct(saos,demos),saoVenda:pct(vendas,saos),demoVenda:pct(vendas,demos)}; }
function escapeHtml(str){ return String(str||'').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }

function initNewCallForm() {
  showModal('Cadastrar Novo Lead', `
    <div class="md-form">
      <div class="md-group"><label class="md-label">Nome da Clínica / Lead</label><input type="text" id="nc-lead" class="md-input" placeholder="Ex: Clínica São Lucas" required /></div>
      <div class="md-group"><label class="md-label">SDR que Agendou</label><input type="text" id="nc-sdr" class="md-input" placeholder="Ex: João Silva" required /></div>
      <div class="md-group"><label class="md-label">Data da Reunião</label><input type="date" id="nc-date" class="md-input" /></div>
      <div class="md-info">A marcação de SAO agora acontece no encerramento da reunião, depois da condução e do scorecard.</div>
      <div class="md-btns"><button class="btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn-primary" onclick="submitNewCall()">Decolar Prontuário 🚀</button></div>
    </div>`);
}
function submitNewCall(){const lead=document.getElementById('nc-lead').value.trim();const sdr=document.getElementById('nc-sdr').value.trim();if(!lead||!sdr){alert('Por favor, preencha todos os campos obrigatórios.');return;}const now=new Date().toISOString();const leadId=makeLeadId(lead);const newCall=ensureCallModel({id:'call_'+Date.now(),leadId,leadName:lead,sdrName:sdr,meetingType:'Primeira reunião',isSao:false,status:'Em andamento',statusNote:'',motivoPerdido:'',finalObservation:'',date:(()=>{const d=document.getElementById('nc-date');return d&&d.value?new Date(d.value+'T12:00:00').toLocaleDateString('pt-BR'):new Date().toLocaleDateString('pt-BR')})(),statusHistory:[{at:now,from:'',to:'Em andamento',note:'',source:'novoLead'}],preCallNotes:{text:PRECALL_NOTES_TEMPLATE,updatedAt:now,locked:false},cl:{},sc:{}});state.calls.push(newCall);state.activeCallId=newCall.id;state.active=1;closeModal();saveToStorage();render();}
function openEndCallModal(){const call=getActiveCall();if(!call)return;ensureCallModel(call);const st=getScorecardStats(call);const scoreMsg=st.complete?`<div class="md-info"><i class="ti ti-check"></i> Scorecard completo: ${st.evaluated}/${st.totalItems} critérios preenchidos.</div>`:`<div class="md-warning"><b>Scorecard pendente:</b> ${st.evaluated}/${st.totalItems} critérios preenchidos. Para concluir como Fechado, Follow-up ou Perdido, complete o scorecard antes de salvar.</div>`;const current=call.status&&!isInProgress(call)?call.status:'';showModal('Concluir reunião',`<div class="md-form">${scoreMsg}<div class="md-group"><label class="md-label">Status final da reunião</label><select id="ec-status" class="md-input" onchange="handleEndStatusChange()"><option value="" ${!current?'selected':''}>Selecione o status final...</option><option value="Venda" ${current==='Venda'?'selected':''}>Fechado / venda concluída 🟢</option><option value="Follow-up" ${current==='Follow-up'?'selected':''}>Follow-up agendado 🟡</option><option value="Perdido" ${current==='Perdido'?'selected':''}>Perdido 🔴</option><option value="No-Show" ${current==='No-Show'?'selected':''}>No-show (lead não compareceu) ⚪</option></select></div><div class="md-group" id="ec-note-wrap"><label class="md-label">Observação da reunião/status</label><textarea id="ec-motivo" class="md-input" rows="3" placeholder="Ex: retorno combinado, motivo da perda, contexto do follow-up...">${escapeHtml(call.statusNote||call.motivoPerdido||'')}</textarea></div><div class="md-group" id="ec-sao-wrap"><label class="md-row-check"><input type="checkbox" id="ec-sao" ${call.isSao?'checked':''} style="accent-color:#3b82f6;" /><span>Marcar como SAO ao final da reunião</span></label></div><div id="ec-noshow-warning" class="md-info hidden">No-show não entra como demo realizada e não exige scorecard preenchido.</div><div class="md-btns"><button class="btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn-primary" onclick="submitEndCall()">Concluir e salvar</button></div></div>`);handleEndStatusChange();}
function handleEndStatusChange(){const status=document.getElementById('ec-status')?.value;document.getElementById('ec-motivo-wrap')?.classList.toggle('hidden',status!=='Perdido');document.getElementById('ec-sao-wrap')?.classList.toggle('hidden',status==='No-Show');document.getElementById('ec-noshow-warning')?.classList.toggle('hidden',status!=='No-Show');}
function submitEndCall(){const status=document.getElementById('ec-status').value;if(!status){alert('Selecione o status final da reunião antes de salvar.');return;}const motivo=document.getElementById('ec-motivo').value.trim();const call=getActiveCall();if(!call)return;ensureCallModel(call);const st=getScorecardStats(call);if(status!=='No-Show'&&!st.complete){alert(`Antes de concluir, preencha o scorecard completo. Hoje estão preenchidos ${st.evaluated}/${st.totalItems} critérios.`);state.active=12;closeModal();saveToStorage();render();window.scrollTo(0,0);return;}const oldStatus=call.status||'';if(status==='No-Show'&&hasAnyScorecardAnswer(call)){const ok=confirm('Esta reunião possui scorecard preenchido. Ao salvar como No-show, as respostas do scorecard serão limpas e não entrarão nos indicadores. Deseja continuar?');if(!ok)return;call.sc={};}call.status=status;call.statusNote=motivo;call.isSao=status==='No-Show'?false:!!document.getElementById('ec-sao')?.checked;call.motivoPerdido=status==='Perdido'?motivo:'';call.preCallNotes=call.preCallNotes||{text:PRECALL_NOTES_TEMPLATE,updatedAt:'',locked:false};call.preCallNotes.locked=true;call.statusHistory=Array.isArray(call.statusHistory)?call.statusHistory:[];if(oldStatus!==status||motivo){call.statusHistory.push({at:new Date().toISOString(),from:oldStatus,to:status,note:motivo});}state.activeCallId=null;state.active='dashboard';closeModal();saveToStorage();render();}

function renderDashboard(){const cnt=document.getElementById('content');cnt.innerHTML='';cnt.appendChild(mk('div','mod-title','Cockpit de Vendas Consultivas'));cnt.appendChild(mk('div','mod-sub','Histórico, busca, conversões e aderência ao playbook.'));const topRow=mk('div','dash-actions');const topLeft=mk('div','dash-actions-left');const topNew=mk('button','btn-primary','<i class="ti ti-plus"></i> Novo Lead');topNew.title='Cadastrar um cliente/lead que ainda não existe.';topNew.onclick=initNewCallForm;topLeft.appendChild(topNew);const activeRunning=(Array.isArray(state.calls)?state.calls:[]).find(c=>isInProgress(c));if(activeRunning){const resume=mk('button','btn-secondary',`Retomar reunião: ${escapeHtml(activeRunning.leadName||'reunião em andamento')}`);resume.onclick=()=>{state.activeCallId=activeRunning.id;state.active=1;saveToStorage();render();window.scrollTo(0,0);};topLeft.appendChild(resume);}topRow.appendChild(topLeft);cnt.appendChild(topRow);let calls=(Array.isArray(state.calls)?state.calls:[]).map(ensureCallModel);const _fs=sessionStorage.getItem('fil-start')||'',_fe=sessionStorage.getItem('fil-end')||'';let filteredCalls=calls;if(_fs||_fe){filteredCalls=filteredCalls.filter(c=>{const dv=dateInputValue(c.date);if(!dv)return true;const t=new Date(dv+'T12:00:00').getTime();return t>=(_fs?new Date(_fs+'T00:00:00').getTime():0)&&t<=(_fe?new Date(_fe+'T23:59:59').getTime():Infinity);});}const searchTerm=(sessionStorage.getItem('call-search')||'').toLowerCase();if(searchTerm){filteredCalls=filteredCalls.filter(c=>(c.leadName||'').toLowerCase().includes(searchTerm)||(c.sdrName||'').toLowerCase().includes(searchTerm)||(c.status||'').toLowerCase().includes(searchTerm));}const convStats=getConversionStats(filteredCalls);let scoreSum=0,evaluatedCalls=0;filteredCalls.forEach(c=>{const st=scoreStatsFromCall(c);if(st.evaluated>0){scoreSum+=st.percent;evaluatedCalls++;}});const avgScore=evaluatedCalls?Math.round(scoreSum/evaluatedCalls):0;const grid=mk('div','db-grid');grid.appendChild(createMetricCard('Total de Reuniões',filteredCalls.length));grid.appendChild(createMetricCard('Demos Realizadas',convStats.demos));grid.appendChild(createMetricCard('Demo > SAO',convStats.demoSao+'%'));grid.appendChild(createMetricCard('SAO > Fechado',convStats.saoVenda+'%'));grid.appendChild(createMetricCard('Demo > Fechado',convStats.demoVenda+'%'));grid.appendChild(createMetricCard('Aderência Média Playbook',avgScore?avgScore+'%':'--'));cnt.appendChild(grid);if(filteredCalls.length>0){const chartsBlock=mk('div','charts-block');const chartsRow=mk('div','db-charts');[['chartStatus','Distribuição dos status'],['chartSdr','Volume comercial por SDR'],['chartConversions','Conversões do funil']].forEach(([id,title])=>{const cont=mk('div','chart-container');cont.appendChild(mk('div','chart-title',title));const wrap=mk('div','');wrap.style='position:relative;height:180px';const canvas=document.createElement('canvas');canvas.id=id;wrap.appendChild(canvas);cont.appendChild(wrap);chartsRow.appendChild(cont);});chartsBlock.appendChild(chartsRow);const evoContainer=mk('div','chart-container');evoContainer.style.marginBottom='28px';evoContainer.appendChild(mk('div','chart-title','Evolução mensal — aderência ao playbook x conversão'));const evoWrap=mk('div','');evoWrap.style='position:relative;height:220px';const evoCanvas=document.createElement('canvas');evoCanvas.id='chartEvolution';evoWrap.appendChild(evoCanvas);evoContainer.appendChild(evoWrap);evoContainer.appendChild(mk('div','evo-note','Aderência = média dos scorecards preenchidos. Demos realizadas excluem No-show e reuniões em andamento.'));chartsBlock.appendChild(evoContainer);cnt.appendChild(chartsBlock);setTimeout(()=>buildCharts(filteredCalls),50);}const panel=mk('div','history-panel');panel.appendChild(mk('div','mod-title','Histórico de Reuniões'));const toolbar=mk('div','history-toolbar');const left=mk('div','history-toolbar-left');const search=mk('div','search-wrap');search.innerHTML=`<i class="ti ti-search"></i><input type="search" id="call-search" class="search-input" placeholder="Pesquisar lead, clínica, SDR ou status..." value="${escapeHtml(sessionStorage.getItem('call-search')||'')}" />`;left.appendChild(search);[['fil-start','Data inicial',_fs],['fil-end','Data final',_fe]].forEach(x=>{const fg=mk('div','fil-grp');fg.innerHTML=`<label class="fil-lbl">${x[1]}</label>`;const inp=document.createElement('input');inp.type='date';inp.id=x[0];inp.className='fil-inp';inp.value=x[2];fg.appendChild(inp);left.appendChild(fg);});const bFil=mk('button','btn-secondary','Aplicar filtros');bFil.onclick=()=>{sessionStorage.setItem('fil-start',document.getElementById('fil-start')?.value||'');sessionStorage.setItem('fil-end',document.getElementById('fil-end')?.value||'');sessionStorage.setItem('calls-page','1');render();};left.appendChild(bFil);const right=mk('div','');const btnNew=mk('button','btn-primary','Novo Lead');btnNew.onclick=initNewCallForm;right.appendChild(btnNew);toolbar.appendChild(left);toolbar.appendChild(right);panel.appendChild(toolbar);cnt.appendChild(panel);setTimeout(()=>{const s=document.getElementById('call-search');if(s){let t=null;s.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(()=>{sessionStorage.setItem('call-search',s.value.trim());sessionStorage.setItem('calls-page','1');render();},220);});}},0);if(filteredCalls.length===0){const empty=mk('div','empty-search-box','Nenhum lead ou reunião encontrado para esta busca.<br>');const b=mk('button','btn-primary','Novo Lead');b.onclick=initNewCallForm;empty.appendChild(b);cnt.appendChild(empty);return;}const pageSize=20,totalPages=Math.max(1,Math.ceil(filteredCalls.length/pageSize));let currentPage=parseInt(sessionStorage.getItem('calls-page')||'1',10);if(currentPage<1)currentPage=1;if(currentPage>totalPages)currentPage=totalPages;const callsToDisplay=[...filteredCalls].reverse().slice((currentPage-1)*pageSize,currentPage*pageSize);const tblWrap=mk('div','tbl-wrap history-table-wrap');const tbl=document.createElement('table');tbl.innerHTML='<thead><tr><th>Lead</th><th>SDR</th><th>SAO</th><th>Data</th><th>Status</th><th style="text-align:right;">⋮</th></tr></thead><tbody></tbody>';const tbody=tbl.querySelector('tbody');callsToDisplay.forEach(c=>{const tr=document.createElement('tr');let statusClass='b-progress';if(c.status==='Venda'||c.status==='Fechado')statusClass='b-venda';if(c.status==='Follow-up')statusClass='b-follow';if(c.status==='Perdido')statusClass='b-perdido';if(c.status==='No-Show')statusClass='b-noshow';const label=statusLabel(c.status);tr.innerHTML=`<td><b>${escapeHtml(c.leadName)}</b><div style="font-size:11px;color:#64748b;margin-top:3px">${escapeHtml(c.meetingType||'Reunião')}</div></td><td>${escapeHtml(c.sdrName)}</td><td>${c.isSao?'<span class="badge b-sao">SAO</span>':'<span style="color:#475569">—</span>'}</td><td class="date-short">${escapeHtml(formatDateShort(c.date))}</td><td><span class="badge ${statusClass}">${escapeHtml(label||'—')}</span></td><td class="actions-cell" style="text-align:right;"></td>`;tr.querySelector('td:last-child').appendChild(createActionMenu(c));tbody.appendChild(tr);});tblWrap.appendChild(tbl);cnt.appendChild(tblWrap);const pg=mk('div','pg-row');const startItem=(currentPage-1)*pageSize+1,endItem=Math.min(currentPage*pageSize,filteredCalls.length);pg.appendChild(mk('div','',`Mostrando ${startItem}-${endItem} de ${filteredCalls.length} reuniões`));const btns=mk('div','pg-btns');const prev=mk('button','pg-btn','Anterior');prev.disabled=currentPage===1;prev.onclick=()=>{sessionStorage.setItem('calls-page',String(currentPage-1));render();};btns.appendChild(prev);const cur=mk('button','pg-btn active',String(currentPage));btns.appendChild(cur);const next=mk('button','pg-btn','Próxima');next.disabled=currentPage===totalPages;next.onclick=()=>{sessionStorage.setItem('calls-page',String(currentPage+1));render();};btns.appendChild(next);pg.appendChild(btns);cnt.appendChild(pg);}
function buildCharts(calls){
  if(window.charts.status)window.charts.status.destroy(); if(window.charts.sdr)window.charts.sdr.destroy(); if(window.charts.evolution)window.charts.evolution.destroy(); if(window.charts.conversions)window.charts.conversions.destroy(); const ctxStatus=document.getElementById('chartStatus'),ctxSdr=document.getElementById('chartSdr'); if(!ctxStatus||!ctxSdr)return; const statusCounts={'Venda':0,'Follow-up':0,'Perdido':0,'No-Show':0,'Em andamento':0}; calls.forEach(c=>{if(statusCounts[c.status]!==undefined)statusCounts[c.status]++;}); window.charts.status=new Chart(ctxStatus,{type:'doughnut',data:{labels:Object.keys(statusCounts),datasets:[{data:Object.values(statusCounts),backgroundColor:['#10b981','#f59e0b','#ef4444','#64748b','#3b82f6'],borderWidth:0}]},options:{responsive:true,plugins:{legend:{position:'right',labels:{color:'#94a3b8',font:{size:11}}}}}}); const sdrData={}; calls.forEach(c=>{if(!sdrData[c.sdrName])sdrData[c.sdrName]={saos:0,vendas:0}; if(c.isSao)sdrData[c.sdrName].saos++; if(c.status==='Venda')sdrData[c.sdrName].vendas++;}); window.charts.sdr=new Chart(ctxSdr,{type:'bar',data:{labels:Object.keys(sdrData),datasets:[{label:'Oportunidades SAO',data:Object.values(sdrData).map(d=>d.saos),backgroundColor:'#06b6d4'},{label:'Vendas Fechadas',data:Object.values(sdrData).map(d=>d.vendas),backgroundColor:'#10b981'}]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{ticks:{color:'#94a3b8'},grid:{display:false}},y:{ticks:{color:'#94a3b8',stepSize:1},grid:{color:'#1e293b'}}},plugins:{legend:{labels:{color:'#94a3b8'}}}}}); const ctxConversions=document.getElementById('chartConversions'); if(ctxConversions){const cs=getConversionStats(calls); window.charts.conversions=new Chart(ctxConversions,{type:'bar',data:{labels:['Demo > SAO','SAO > Venda','Demo > Venda'],datasets:[{label:'Conversão (%)',data:[cs.demoSao,cs.saoVenda,cs.demoVenda],backgroundColor:['#06b6d4','#10b981','#8b5cf6']}]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{ticks:{color:'#94a3b8'},grid:{display:false}},y:{min:0,max:100,ticks:{color:'#94a3b8'},grid:{color:'#1e293b'}}},plugins:{legend:{display:false}}}});} const ctxEvo=document.getElementById('chartEvolution'); if(ctxEvo){const evo=buildEvolutionData(calls); window.charts.evolution=new Chart(ctxEvo,{type:'line',data:{labels:evo.labels,datasets:[{label:'Aderência ao playbook (%)',data:evo.adherence,borderColor:'#8b5cf6',backgroundColor:'rgba(139,92,246,0.15)',tension:0.25,spanGaps:true},{label:'Conversão (Venda/SAO) (%)',data:evo.conversion,borderColor:'#10b981',backgroundColor:'rgba(16,185,129,0.15)',tension:0.25,spanGaps:true}]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{ticks:{color:'#94a3b8'},grid:{display:false}},y:{min:0,max:100,ticks:{color:'#94a3b8'},grid:{color:'#1e293b'}}},plugins:{legend:{labels:{color:'#94a3b8'}}}}});}
}
/* ===== FIM PATCH COPILOT ===== */


/* ===== PATCH FINAL V14-MERGE — ACESSO, MERGE, CACHE SEGURO E EXTENSÃO ===== */
function getAccessToken(){ return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) || ''; }
function setAccessLoading(isLoading){const btn=document.getElementById('access-submit-btn');if(!btn)return;btn.disabled=!!isLoading;btn.innerHTML=isLoading?'<i class="ti ti-loader-2"></i> Validando acesso...':'<i class="ti ti-lock-open"></i> Entrar no Playbook';}
function showAccessError(msg){const el=document.getElementById('access-error');if(el){el.textContent=msg;el.classList.remove('hidden');}}
function clearAccessError(){const el=document.getElementById('access-error');if(el){el.textContent='';el.classList.add('hidden');}}
function unlockApplication(){state.active='dashboard';state.activeCallId=null;document.body.classList.remove('app-locked');setupMobileNav();render();updateSyncBadge();}
function resetAccessToken(){localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);alert('Chave removida. A tela de acesso será exibida novamente.');document.body.classList.add('app-locked');const input=document.getElementById('access-token-input');if(input){input.value='';setTimeout(()=>input.focus(),100);}}
function loadFromStorage(){const saved=localStorage.getItem(STORAGE_KEY);if(saved){try{const parsed=JSON.parse(saved);if(parsed)state={...state,...parsed};}catch(e){console.error('Erro ao carregar cache local',e);}}}
function saveToStorage(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));scheduleRemoteSync();}
function scheduleRemoteSync(){syncStatus='saving';updateSyncBadge();clearTimeout(syncTimer);syncTimer=setTimeout(syncToRemote,apiReachable?15000:1200);}
function syncToRemote(){const token=getAccessToken();if(!token){syncStatus='error';updateSyncBadge();return;}const calls=(Array.isArray(state.calls)?state.calls:[]).map(ensureCallModel);fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'saveCalls',token:token,closer:CLOSER_NAME,calls:calls})}).then(r=>r.json()).then(data=>{if(!data||data.ok===false)throw new Error(data&&data.error?data.error:'Erro ao sincronizar');apiReachable=true;syncStatus='saved';updateSyncBadge();console.log('Sync V11.0 concluído:',data);}).catch(err=>{console.error('Erro de sync V11.0:',err);syncStatus='error';updateSyncBadge();if(String(err.message).includes('unauthorized'))resetAccessToken();});}
function fetchCallsRemote(token){const url=API_URL+'?action=getCalls&token='+encodeURIComponent(token)+'&closer='+encodeURIComponent(CLOSER_NAME);return fetch(url).then(r=>r.json());}
function applyRemoteCallsToState(calls){state={...state,active:'dashboard',activeCallId:null,calls:(Array.isArray(calls)?calls:[]).map(ensureCallModel),sandboxCl:state.sandboxCl||{},sandboxSc:state.sandboxSc||{}};localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function validateTokenAndLoad(token){if(!token){showAccessError('Digite a chave de acesso para continuar.');return;}clearAccessError();setAccessLoading(true);return fetchCallsRemote(token).then(data=>{if(!data||data.ok===false)throw new Error(data&&data.error?data.error:'unauthorized');localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY,token);apiReachable=true;applyRemoteCallsToState(data.calls||[]);syncStatus='saved';console.log('Dados carregados V11.0:',(data.calls||[]).length,'calls');unlockApplication();}).catch(err=>{console.error('Falha de autenticação/carregamento V11.0:',err);localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);showAccessError('Chave inválida ou conexão indisponível. Verifique a chave e tente novamente.');}).finally(()=>setAccessLoading(false));}
function loadFromRemote(){const token=getAccessToken();if(!token)return Promise.resolve();return fetchCallsRemote(token).then(data=>{apiReachable=true;if(!data||data.ok===false)throw new Error(data&&data.error?data.error:'Erro ao carregar');applyRemoteCallsToState(data.calls||[]);console.log('Recarregado da nuvem V11.0:',(data.calls||[]).length,'calls');}).catch(err=>{console.error('Não foi possível conectar ao backend V11.0.',err);if(String(err.message).includes('unauthorized'))resetAccessToken();});}
function initAccessGate(){loadFromStorage();const input=document.getElementById('access-token-input');const btn=document.getElementById('access-submit-btn');const saved=getAccessToken();if(btn)btn.addEventListener('click',()=>validateTokenAndLoad((input&&input.value?input.value:'').trim()));if(input){input.addEventListener('keydown',e=>{if(e.key==='Enter')validateTokenAndLoad(input.value.trim());});setTimeout(()=>input.focus(),100);}if(saved){if(input)input.value=saved;validateTokenAndLoad(saved);}}
function clearLocalCache(){const ok=confirm('Remover apenas os dados salvos neste navegador? Os dados da nuvem/Google Sheets NÃO serão apagados.');if(!ok)return;localStorage.removeItem(STORAGE_KEY);alert('Cache local removido. A página será recarregada para buscar novamente os dados da nuvem.');window.location.reload();}
function getPlaybookUrlForExtension(){return PLAYBOOK_PUBLIC_URL;}
function escapeAttr(str){return String(str||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function createExtensionIconBlob(){return new Promise(resolve=>{const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#10b981';ctx.fillRect(0,0,128,128);ctx.fillStyle='#fff';ctx.font='bold 86px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('$',64,67);canvas.toBlob(blob=>resolve(blob),'image/png');});}
function openChromeExtensionInstallModal(){const currentUrl=getPlaybookUrlForExtension();showModal('Instalar Extensão no Chrome',`<div class="md-form"><div class="md-info">A extensão gerada usa <b>Painel Lateral</b>, com área maior, fixa e redimensionável no Chrome.</div><div class="install-steps"><div class="install-step"><div class="install-step-num">1</div><div class="install-step-text">Clique no botão abaixo para baixar os arquivos da extensão.</div></div><div class="install-step"><div class="install-step-num">2</div><div class="install-step-text">Descompacte o arquivo <span class="install-code">.zip</span>.</div></div><div class="install-step"><div class="install-step-num">3</div><div class="install-step-text">Abra <span class="install-code">chrome://extensions/</span>.</div></div><div class="install-step"><div class="install-step-num">4</div><div class="install-step-text">Ative o <b>Modo do desenvolvedor</b>.</div></div><div class="install-step"><div class="install-step-num">5</div><div class="install-step-text">Clique em <b>Carregar sem compactação</b> e selecione a pasta descompactada.</div></div></div><div class="md-btns"><button class="btn-secondary" onclick="closeModal()">Fechar</button><button class="btn-primary" onclick="downloadChromeExtensionZip()"><i class="ti ti-download"></i> Baixar extensao_playbook.zip</button></div></div>`);const box=document.querySelector('#modal-container .md-box');if(box)box.style.maxWidth='620px';}
async function downloadChromeExtensionZip(){if(typeof JSZip==='undefined'){alert('Biblioteca JSZip não carregada. Verifique sua conexão com a internet e tente novamente.');return;}const playbookUrl=getPlaybookUrlForExtension();const manifest={manifest_version:3,name:'Cockpit Playbook de Vendas',version:'1.2',description:'Acesso rápido ao meu scorecard e playbook em nuvem.',permissions:['sidePanel'],background:{service_worker:'background.js'},action:{default_title:'Abrir Playbook'},side_panel:{default_path:'sidepanel.html'},icons:{128:'icon.png'}};const backgroundJs=`chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
  } catch (error) {
    console.error('Erro ao abrir o Side Panel:', error);
  }
});`;const sidepanelHtml=`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: none; display: block; }
  </style>
</head>
<body>
  <iframe src="${escapeAttr(playbookUrl)}"></iframe>
</body>
</html>`;const zip=new JSZip();zip.file('manifest.json',JSON.stringify(manifest,null,2));zip.file('sidepanel.html',sidepanelHtml);zip.file('background.js',backgroundJs);zip.file('icon.png',await createExtensionIconBlob());const blob=await zip.generateAsync({type:'blob'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='extensao_playbook.zip';document.body.appendChild(a);a.click();URL.revokeObjectURL(a.href);a.remove();}
function renderSettings(){const cnt=document.getElementById('content');cnt.innerHTML='';cnt.appendChild(mk('div','mod-title','Configurações e Salvaguarda de Dados'));cnt.appendChild(mk('div','mod-sub','Backups, chave de acesso, limpeza segura de cache local e instalação da extensão para Google Chrome.'));const box=mk('div','p-box','');box.style.background='#1a2332';box.style.borderColor='#334155';box.innerHTML=`<h4 style="font-size:14px; margin-bottom:8px; color:#f1f5f9;">Exportar Registros</h4><p style="font-size:12px; color:#94a3b8; margin-bottom:14px;">Gere e faça o download de um arquivo contendo todo o seu histórico e notas para importação posterior em qualquer dispositivo.</p><button class="btn-primary" onclick="exportData()"><i class="ti ti-download"></i> Baixar Backup JSON</button><hr style="border:none; border-top:1px solid #334155; margin:24px 0;" /><h4 style="font-size:14px; margin-bottom:8px; color:#f1f5f9;">Importar Registros</h4><p style="font-size:12px; color:#94a3b8; margin-bottom:14px;">⚠️ Atenção: Ao importar, os registros atuais salvos neste navegador serão substituídos pelo arquivo enviado.</p><input type="file" id="import-file-field" class="md-input" accept=".json" style="max-width:300px; margin-bottom:14px; display:block;" /><button class="btn-secondary" onclick="importData()" style="color:#4ade80; border-color:#166534;"><i class="ti ti-upload"></i> Restaurar Banco de Dados</button><hr style="border:none; border-top:1px solid #334155; margin:24px 0;" /><h4 style="font-size:14px; margin-bottom:8px; color:#f1f5f9;">Segurança</h4><p style="font-size:12px; color:#94a3b8; margin-bottom:14px;">Remove a chave salva neste navegador. O playbook será bloqueado até uma nova chave válida ser informada.</p><button class="btn-secondary" onclick="resetAccessToken()" style="color:#fbbf24; border-color:#78350f;"><i class="ti ti-key"></i> Remover chave salva neste navegador</button><hr style="border:none; border-top:1px solid #334155; margin:24px 0;" /><h4 style="font-size:14px; margin-bottom:8px; color:#f1f5f9;">Limpar Cache Local</h4><p style="font-size:12px; color:#94a3b8; margin-bottom:14px;">Remove apenas os dados deste navegador. A página será recarregada e buscará novamente os dados da nuvem. Não sobrescreve o Google Sheets com estado vazio.</p><button class="btn-secondary" onclick="clearLocalCache()" style="color:#f87171; border-color:#991b1b;"><i class="ti ti-trash"></i> Limpar apenas este navegador</button>`;cnt.appendChild(box);const install=mk('div','install-card');install.innerHTML=`<h4><i class="ti ti-brand-chrome"></i> Instalação como Extensão Side Panel</h4><p>Crie um pacote leve para abrir este Cockpit direto no painel lateral do Chrome.</p><button class="btn-primary" onclick="openChromeExtensionInstallModal()"><i class="ti ti-puzzle"></i> Instalar Extensão no Chrome</button>`;cnt.appendChild(install);}
/* ===== FIM PATCH FINAL V14-MERGE ===== */

initV13AccessGate();

function appendContextualModuleActions(moduleId,cnt){const activeCall=getActiveCall();if(moduleId===1&&activeCall){renderPreCallNotes(cnt);const row=mk('div','context-end-actions');const btn=mk('button','btn-primary','Continuar para Scorecard');btn.onclick=()=>{state.active=12;saveToStorage();render();window.scrollTo(0,0);};row.appendChild(btn);cnt.appendChild(row);}if(moduleId===12&&activeCall){const row=mk('div','context-end-actions');const btn=mk('button','btn-primary','Concluir reunião');btn.onclick=openEndCallModal;row.appendChild(btn);cnt.appendChild(row);}}
function renderPreCallNotes(cnt){const call=ensureCallModel(getActiveCall());if(!call)return;const box=mk('div','precall-notes-box');box.appendChild(mk('div','sec-h','Notas de preparação da reunião'));box.appendChild(mk('div','sec-sub','Use este espaço para perguntas, hipóteses e pontos que deseja validar durante a reunião.'));const locked=call.status&&!isInProgress(call);if(locked){box.appendChild(mk('div','readonly-note',escapeHtml((call.preCallNotes&&call.preCallNotes.text)||'')));box.appendChild(mk('div','sec-sub','Reunião concluída: notas em modo somente leitura.'));}else{const ta=document.createElement('textarea');ta.id='precall-notes-text';ta.className='md-input';ta.value=(call.preCallNotes&&call.preCallNotes.text)||PRECALL_NOTES_TEMPLATE;ta.addEventListener('input',()=>{call.preCallNotes={text:ta.value,updatedAt:new Date().toISOString(),locked:false};saveToStorage();});box.appendChild(ta);}cnt.appendChild(box);}
function createActionMenu(call){call=ensureCallModel(call);const wrap=mk('div','action-menu-wrap');const btn=mk('button','action-menu-btn','⋮');btn.onclick=(e)=>{e.stopPropagation();closeAllActionMenus();const menu=mk('div','action-menu');const items=[];if(isInProgress(call)){items.push(['Retomar reunião',()=>{state.activeCallId=call.id;state.active=1;saveToStorage();render();window.scrollTo(0,0);}]);}items.push(['Ver detalhes',()=>openDetailsModal(call.id)],['Revisar checklist',()=>openChecklistReviewModal(call.id)],['Editar dados',()=>openEditCallModal(call.id)],['Atualizar status',()=>openStatusModal(call.id)],['Adicionar nova reunião',()=>addMeetingFromCall(call.id)],['Apagar reunião',()=>deleteCall(call.id)]);items.forEach(([label,fn])=>{const b=mk('button','',label);b.onclick=(ev)=>{ev.stopPropagation();closeAllActionMenus();fn();};menu.appendChild(b);});wrap.appendChild(menu);};wrap.appendChild(btn);return wrap;}
function openChecklistReviewModal(id){const c=ensureCallModel(state.calls.find(x=>x.id===id));if(!c)return;const pre=M.find(m=>m.id===1);const clSec=pre&&pre.s?pre.s.find(s=>s.t==='CL'):null;let html='<div class="md-form"><div class="md-info">Visualização do checklist preenchido. Esta ação não retoma nem reabre a reunião.</div><div class="checklist-review-list">';(clSec&&clSec.items?clSec.items:[]).forEach((item,i)=>{const key=`cl-1-${i}`;const done=c.cl&&c.cl[key]===true;html+=`<div class="checklist-review-item ${done?'done':''}"><span class="checklist-review-icon">${done?'✓':'○'}</span><span>${escapeHtml(item)}</span></div>`;});html+='</div><div class="md-btns"><button class="btn-secondary" onclick="closeModal()">Fechar</button></div></div>';showModal('Checklist preenchido',html);const box=document.querySelector('#modal-container .md-box');if(box)box.style.maxWidth='680px';}
function openDetailsModal(id){const c=ensureCallModel(state.calls.find(x=>x.id===id));if(!c)return;const st=scoreStatsFromCall(c);const hist=(Array.isArray(c.statusHistory)?c.statusHistory:[]).map(h=>`<div class="status-history-item"><b>${formatDateShort(h.at)}</b> — ${escapeHtml(h.from?h.from+' → '+statusLabel(h.to):statusLabel(h.to)||'')}<br>${escapeHtml(h.note||'')}</div>`).join('')||'<div class="sec-sub">Sem histórico registrado.</div>';showModal('Detalhes da reunião',`<div class="md-form"><div class="detail-grid"><div class="detail-item"><div class="detail-label">Lead</div><div class="detail-value">${escapeHtml(c.leadName)}</div></div><div class="detail-item"><div class="detail-label">SDR</div><div class="detail-value">${escapeHtml(c.sdrName||'—')}</div></div><div class="detail-item"><div class="detail-label">Data</div><div class="detail-value">${escapeHtml(formatDateShort(c.date))}</div></div><div class="detail-item"><div class="detail-label">Status atual</div><div class="detail-value">${escapeHtml(statusLabel(c.status))}</div></div></div><div class="md-group"><label class="md-label">Observação da reunião/status</label><div class="readonly-note">${escapeHtml(c.statusNote||c.motivoPerdido||'—')}</div></div><div class="md-group"><label class="md-label">Notas de preparação da reunião</label><div class="readonly-note">${escapeHtml((c.preCallNotes&&c.preCallNotes.text)||'—')}</div></div><div class="md-group"><label class="md-label">Scorecard</label><div class="readonly-note">${st.total}/${st.max} pontos · ${st.percent}% · ${st.evaluated}/12 critérios avaliados</div></div><div class="md-group"><label class="md-label">Histórico de status</label><div class="status-history-list">${hist}</div></div><div class="md-btns"><button class="btn-secondary" onclick="closeModal()">Fechar</button></div></div>`);const box=document.querySelector('#modal-container .md-box');if(box)box.style.maxWidth='760px';}
function openStatusModal(id){const c=ensureCallModel(state.calls.find(x=>x.id===id));if(!c)return;const opts=['Em andamento','Follow-up','Venda','Perdido','No-Show'].map(s=>`<option value="${s}" ${c.status===s?'selected':''}>${statusLabel(s)}</option>`).join('');showModal('Atualizar status',`<div class="md-form"><div class="md-group"><label class="md-label">Novo status</label><select id="st-status" class="md-input">${opts}</select></div><div class="md-group"><label class="md-label">Nota desta atualização</label><textarea id="st-note" class="md-input" rows="4" placeholder="Ex: cliente pediu retorno, objeção, motivo da perda...">${escapeHtml(c.statusNote||c.motivoPerdido||'')}</textarea></div><div class="md-btns"><button class="btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn-primary" onclick="submitStatusUpdate('${id}')">Salvar status</button></div></div>`);}
function submitStatusUpdate(id){const c=ensureCallModel(state.calls.find(x=>x.id===id));if(!c)return;const old=c.status||'';const ns=document.getElementById('st-status').value;const note=document.getElementById('st-note').value.trim();c.status=ns;c.statusNote=note;if(ns==='Perdido')c.motivoPerdido=note;c.statusHistory=Array.isArray(c.statusHistory)?c.statusHistory:[];c.statusHistory.push({at:new Date().toISOString(),from:old,to:ns,note});closeModal();saveToStorage();render();}
function addMeetingFromCall(id){const base=ensureCallModel(state.calls.find(x=>x.id===id));if(!base)return;if(!confirm('Criar uma nova reunião para este mesmo lead? A reunião anterior será preservada.'))return;if(syncStatus!=='saved')syncToRemote();const now=new Date().toISOString();const newCall=ensureCallModel({id:'call_'+Date.now(),leadId:base.leadId,leadName:base.leadName,sdrName:base.sdrName,date:new Date().toLocaleDateString('pt-BR'),meetingType:'Reunião de sequência',isSao:false,status:'Em andamento',statusNote:'',motivoPerdido:'',finalObservation:'',statusHistory:[{at:now,from:'',to:'Em andamento',note:'',source:'adicionarReuniao'}],preCallNotes:{text:PRECALL_NOTES_TEMPLATE,updatedAt:now,locked:false},cl:{},sc:{}});state.calls.push(newCall);state.activeCallId=newCall.id;state.active=1;saveToStorage();render();window.scrollTo(0,0);}



/* ============================================================
   V13 ADDITIVE PATCH — mantém todo o produto V11 e troca apenas
   autenticação, persistência, administração e feedback de rede.
   ============================================================ */
const V13_SESSION_KEY='playbook_v13_session_token';
let v13User=null,v13Snapshots=new Map(),v13SyncChain=Promise.resolve(),v13Busy=0;
function v13Token(){return localStorage.getItem(V13_SESSION_KEY)||'';}
function v13Toast(msg){const e=document.getElementById('v13-toast');if(!e)return;e.textContent=msg;clearTimeout(e._t);e._t=setTimeout(()=>e.textContent='',4200);}
function v13Overlay(show,text){const e=document.getElementById('v13-overlay');if(!e)return;if(text)document.getElementById('v13-overlay-text').textContent=text;e.classList.toggle('hidden',!show);}
function v13LoginLoading(show){const e=document.getElementById('login-loading'),b=document.getElementById('access-submit-btn');if(e)e.classList.toggle('hidden',!show);if(b){b.disabled=show;b.innerHTML=show?'<span class="v13-spinner"></span> Entrando...':'<i class="ti ti-login"></i> Entrar';}}
async function v13Fetch(action,payload={},method='POST',timeout=20000){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);let r;try{if(method==='GET'){const u=new URL(API_URL);u.searchParams.set('action',action);u.searchParams.set('sessionToken',v13Token());Object.entries(payload).forEach(([k,v])=>v!==''&&v!=null&&u.searchParams.set(k,v));r=await fetch(u,{signal:ctrl.signal});}else{const body={action,...payload};if(v13Token()&&!['login','setPassword','validateInvite'].includes(action))body.sessionToken=v13Token();r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),signal:ctrl.signal});}const d=await r.json();if(!d||d.ok===false){const er=new Error(d&&d.message||d&&d.error||'Falha na operação');er.code=d&&d.error;er.data=d;throw er;}return d;}catch(e){if(e.name==='AbortError')throw new Error('O servidor demorou demais para responder. Tente novamente.');if(['unauthorized','session_expired','session_revoked','user_disabled'].includes(e.code))v13Lock(e.message);throw e;}finally{clearTimeout(timer);}}
function v13Lock(msg){localStorage.removeItem(V13_SESSION_KEY);v13User=null;document.body.classList.add('app-locked');if(msg)showAccessError(msg);}
function v13RenderUser(){const c=document.getElementById('v13-user-card'),a=document.getElementById('btn-admin');if(!v13User)return;if(c){c.innerHTML='<b>'+escapeHtml(v13User.name)+'</b><small>'+escapeHtml(v13User.role==='ADMIN'?'Administrador':'Closer')+'</small>';c.classList.remove('hidden');}if(a)a.classList.toggle('hidden',v13User.role!=='ADMIN');}
function v13SetSnapshots(){v13Snapshots=new Map((state.calls||[]).map(c=>[c.id,JSON.parse(JSON.stringify(c))]));}
function applyRemoteCallsToState(calls){state={...state,active:state.active||'dashboard',calls:(Array.isArray(calls)?calls:[]).map(ensureCallModel),sandboxCl:state.sandboxCl||{},sandboxSc:state.sandboxSc||{}};localStorage.setItem(STORAGE_KEY,JSON.stringify(state));v13SetSnapshots();}
async function fetchCallsRemote(){return v13Fetch('getCalls',{},'GET');}
async function loadFromRemote(){const data=await fetchCallsRemote();applyRemoteCallsToState(data.calls||[]);apiReachable=true;syncStatus='saved';updateSyncBadge();return data;}
function getAccessToken(){return v13Token();}
function resetAccessToken(){v13Lock('Sessão encerrada. Entre novamente.');}
function saveToStorage(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));scheduleRemoteSync();}
function scheduleRemoteSync(){syncStatus='saving';updateSyncBadge();clearTimeout(syncTimer);syncTimer=setTimeout(()=>{v13SyncChain=v13SyncChain.then(v13SyncChanges).catch(e=>{console.error(e);syncStatus='error';updateSyncBadge();v13Toast(e.message);});},350);}
function v13Json(v){return JSON.stringify(v??null);}
async function v13SyncOne(call) {
  const current = call;
  const originalSnapshot = v13Snapshots.get(current.id);

  /*
   * Uma call que ainda não existe no servidor.
   */
  if (!originalSnapshot) {
    const callSent = JSON.parse(JSON.stringify(current));

    const result = await v13Fetch('createCall', {
      call: callSent
    });

    /*
     * Não substitui campos que o usuário possa ter alterado
     * durante a requisição.
     */
    current.id = result.call.id;
    current.leadId = result.call.leadId;
    current.version = result.call.version;
    current.createdAt = result.call.createdAt;
    current.updatedAt = result.call.updatedAt;
    current.ownerUserId = result.call.ownerUserId;
    current.ownerEmail = result.call.ownerEmail;
    current.ownerName = result.call.ownerName;

    v13Snapshots.set(
      current.id,
      JSON.parse(JSON.stringify(result.call))
    );

    return;
  }

  const original = JSON.parse(
    JSON.stringify(originalSnapshot)
  );

  let version = Number(original.version || 1);
  let latestServerState = original;

  /*
   * Envia uma alteração sem substituir o estado local completo.
   *
   * O servidor devolve a call inteira, mas essa call pode representar
   * um estado anterior às alterações feitas durante a requisição.
   */
  const send = async function (action, payload) {
    const result = await v13Fetch(action, {
      id: current.id,
      expectedVersion: version,
      ...payload
    });

    latestServerState = result.call;
    version = Number(result.call.version || version + 1);

    /*
     * Atualiza somente metadados controlados pelo servidor.
     * Não sobrescreve sc, cl, notas, status ou outros campos editáveis.
     */
    current.version = version;
    current.updatedAt = result.call.updatedAt;

    if (result.call.createdAt) {
      current.createdAt = result.call.createdAt;
    }

    if (result.call.leadId) {
      current.leadId = result.call.leadId;
    }

    if (result.call.ownerUserId) {
      current.ownerUserId = result.call.ownerUserId;
    }

    if (result.call.ownerEmail) {
      current.ownerEmail = result.call.ownerEmail;
    }

    if (result.call.ownerName) {
      current.ownerName = result.call.ownerName;
    }

    /*
     * Indicadores calculados pelo backend podem ser atualizados
     * sem substituir as respostas locais do scorecard.
     */
    if (result.call.scoreTotal !== undefined) {
      current.scoreTotal = result.call.scoreTotal;
    }

    if (result.call.scorePercent !== undefined) {
      current.scorePercent = result.call.scorePercent;
    }

    if (result.call.scoreEvaluated !== undefined) {
      current.scoreEvaluated = result.call.scoreEvaluated;
    }

    if (result.call.scoreMax !== undefined) {
      current.scoreMax = result.call.scoreMax;
    }

    return result.call;
  };

  try {
    /*
     * Captura uma cópia de cada campo no momento do envio.
     * Assim, mudanças posteriores não alteram o payload já enviado.
     */

    if (v13Json(original.cl) !== v13Json(current.cl)) {
      const checklistSent = JSON.parse(
        JSON.stringify(current.cl || {})
      );

      await send('updateChecklist', {
        cl: checklistSent
      });
    }

    if (v13Json(original.sc) !== v13Json(current.sc)) {
      const scorecardSent = JSON.parse(
        JSON.stringify(current.sc || {})
      );

      await send('updateScorecard', {
        sc: scorecardSent
      });
    }

    if (
      v13Json(original.preCallNotes) !==
      v13Json(current.preCallNotes)
    ) {
      const notesSent = JSON.parse(
        JSON.stringify(current.preCallNotes || {})
      );

      await send('updatePreCall', {
        preCallNotes: notesSent
      });
    }

    if (
      original.status !== current.status ||
      original.statusNote !== current.statusNote ||
      original.isSao !== current.isSao
    ) {
      await send('updateStatus', {
        status: current.status,
        note: current.statusNote || '',
        isSao: Boolean(current.isSao)
      });
    }

    if (
      original.leadName !== current.leadName ||
      original.sdrName !== current.sdrName ||
      original.date !== current.date ||
      original.meetingType !== current.meetingType
    ) {
      await send('updateCall', {
        leadName: current.leadName,
        sdrName: current.sdrName,
        date: current.date,
        meetingType: current.meetingType,
        isSao: Boolean(current.isSao)
      });
    }

    /*
     * Snapshot representa exatamente o último estado confirmado
     * pelo servidor, não o estado local potencialmente mais novo.
     *
     * Se o usuário clicou durante a requisição, a próxima sincronização
     * detectará a diferença e enviará a alteração restante.
     */
    v13Snapshots.set(
      current.id,
      JSON.parse(JSON.stringify(latestServerState))
    );

  } catch (error) {
    if (error.code === 'conflict') {
      await loadFromRemote();
      render();

      v13Toast(
        'A reunião foi atualizada em outro lugar. ' +
        'Os dados mais recentes foram carregados.'
      );

      return;
    }

    throw error;
  }
}
async function v13SyncChanges(){const changed=(state.calls||[]).filter(c=>{const o=v13Snapshots.get(c.id);return !o||v13Json(o)!==v13Json(c);});for(const c of changed)await v13SyncOne(c);localStorage.setItem(STORAGE_KEY,JSON.stringify(state));syncStatus='saved';updateSyncBadge();}
function syncToRemote(){return v13SyncChanges();}
async function validateTokenAndLoad(){return loadFromRemote();}
async function initV13AccessGate(){loadFromStorage();const form=document.getElementById('login-form');if(form)form.addEventListener('submit',async e=>{e.preventDefault();clearAccessError();v13LoginLoading(true);try{const d=await v13Fetch('login',{email:document.getElementById('login-email').value.trim(),password:document.getElementById('login-password').value,userAgent:navigator.userAgent});localStorage.setItem(V13_SESSION_KEY,d.sessionToken);v13User=d.user;await v13Open();}catch(err){showAccessError(err.message||'Falha no acesso.');}finally{v13LoginLoading(false);}});document.getElementById('btn-logout')?.addEventListener('click',async()=>{try{await v13Fetch('logout');}catch(e){}v13Lock();});if (v13Token()) {
  try {
    const u = await v13Fetch('getCurrentUser', {}, 'GET');
    v13User = u.user;

    document.body.classList.remove('app-locked');
    v13RenderUser();
    setupMobileNav();

    v13Overlay(true, 'Carregando suas reuniões...');

    try {
      await loadFromRemote();
      state.active = 'dashboard';
      state.activeCallId = null;
      render();
    } catch (loadError) {
      console.error('Erro ao carregar reuniões:', loadError);

      /*
       * A sessão é válida.
       * Um erro de carregamento não deve apagar o login.
       */
      render();
      v13Toast(
        loadError.message ||
        'Não foi possível carregar as reuniões. Tente atualizar novamente.'
      );
    } finally {
      v13Overlay(false);
    }

  } catch (authError) {
    /*
     * Só volta ao login quando a validação da sessão realmente falha.
     */
    v13Lock(
      authError.message ||
      'Sua sessão expirou. Entre novamente.'
    );
  }
}else setTimeout(()=>document.getElementById('login-email')?.focus(),50);}
async function v13Open(){document.body.classList.remove('app-locked');v13RenderUser();setupMobileNav();v13Overlay(true,'Carregando suas reuniões...');try{await loadFromRemote();state.active='dashboard';state.activeCallId=null;render();}finally{v13Overlay(false);}}
async function deleteCall(id){const c=state.calls.find(x=>x.id===id);if(!c||!confirm('Deseja apagar esta reunião?'))return;v13Overlay(true,'Apagando reunião...');try{await v13Fetch('deleteCall',{id,expectedVersion:c.version});state.calls=state.calls.filter(x=>x.id!==id);v13Snapshots.delete(id);render();}catch(e){v13Toast(e.message);}finally{v13Overlay(false);}}
async function importData(){const f=document.getElementById('import-file-field')?.files?.[0];if(!f)return alert('Selecione um arquivo JSON.');if(v13User?.role!=='ADMIN')return alert('A importação é permitida apenas para ADMIN.');v13Overlay(true,'Importando backup...');try{const j=JSON.parse(await f.text());if(!Array.isArray(j.calls))throw new Error('Backup sem lista de calls.');const d=await v13Fetch('importCalls',{calls:j.calls});await loadFromRemote();render();alert('Importação concluída: '+d.inserted+' inseridas; '+d.skipped+' ignoradas.');}catch(e){alert('Falha na importação: '+e.message);}finally{v13Overlay(false);}}
const v13BaseRender=render;render=function(){if(state.active==='admin')return v13RenderAdmin();v13BaseRender();v13RenderUser();};
document.getElementById('btn-admin')?.addEventListener('click',()=>{state.active='admin';render();});
function v13RenderAdmin(){const cnt=document.getElementById('content');cnt.innerHTML='<div class="mod-title">Administração de usuários</div><div class="mod-sub">Crie usuários, reenvie convites, desative acessos e revogue sessões.</div><button id="v13-new-user" class="btn-primary"><i class="ti ti-user-plus"></i> Novo usuário</button><div id="v13-users" style="margin-top:16px"><div class="v13-loading"><span class="v13-spinner"></span> Carregando usuários...</div></div>';document.getElementById('v13-new-user').onclick=v13NewUser;v13LoadUsers();}
async function v13LoadUsers(){try{const d=await v13Fetch('listUsers',{},'GET'),box=document.getElementById('v13-users');box.innerHTML='<div class="tbl-wrap"><table><thead><tr><th>Usuário</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead><tbody>'+d.users.map(u=>'<tr><td><b>'+escapeHtml(u.name)+'</b><br><small>'+escapeHtml(u.email)+'</small></td><td>'+u.role+'</td><td>'+u.status+'</td><td><div class="v13-admin-actions">'+(u.status==='pending'?'<button class="table-action-btn" data-a="resendInvite" data-id="'+u.id+'">Reenviar convite</button>':'')+'<button class="table-action-btn" data-a="'+(u.status==='disabled'?'enableUser':'disableUser')+'" data-id="'+u.id+'">'+(u.status==='disabled'?'Ativar':'Desativar')+'</button><button class="table-action-btn" data-a="revokeUserSessions" data-id="'+u.id+'">Revogar sessões</button></div></td></tr>').join('')+'</tbody></table></div>';box.querySelectorAll('[data-a]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await v13Fetch(b.dataset.a,{userId:b.dataset.id});await v13LoadUsers();}catch(e){v13Toast(e.message);}finally{b.disabled=false;}});}catch(e){document.getElementById('v13-users').textContent=e.message;}}
function v13NewUser(){showModal('Novo usuário','<div class="md-form"><div class="md-group"><label class="md-label">Nome</label><input id="v13-name" class="md-input"></div><div class="md-group"><label class="md-label">E-mail</label><input id="v13-email" type="email" class="md-input"></div><div class="md-group"><label class="md-label">Perfil</label><select id="v13-role" class="md-input"><option value="CLOSER">Closer</option><option value="ADMIN">Administrador</option></select></div><div class="md-btns"><button class="btn-secondary" onclick="closeModal()">Cancelar</button><button id="v13-create-user" class="btn-primary">Criar e convidar</button></div></div>');document.getElementById('v13-create-user').onclick=async()=>{const b=document.getElementById('v13-create-user');b.disabled=true;try{await v13Fetch('createUser',{name:document.getElementById('v13-name').value,email:document.getElementById('v13-email').value,role:document.getElementById('v13-role').value});closeModal();v13LoadUsers();}catch(e){v13Toast(e.message);}finally{b.disabled=false;}};}
const v13OldSettings=renderSettings;renderSettings=function(){v13OldSettings();document.querySelectorAll('[onclick="resetAccessToken()"]')?.forEach(e=>e.remove());const cnt=document.getElementById('content');const session=mk('div','install-card');session.innerHTML='<h4><i class="ti ti-user-shield"></i> Sessão V13</h4><p>Usuário: <b>'+escapeHtml(v13User?.name||'')+'</b> · '+escapeHtml(v13User?.role||'')+'</p><button class="btn-secondary" id="v13-settings-logout">Sair da conta</button>';cnt.appendChild(session);document.getElementById('v13-settings-logout').onclick=()=>document.getElementById('btn-logout').click();};
/* ============================================================
   COACH IA — DOWNLOAD DO PROMPT EM MARKDOWN
   Adição independente para a V13
   ============================================================ */

function coachIaFormatSection(section) {
  if (!section) return '';

  const title = section.h ? `### ${section.h}\n\n` : '';

  if (section.t === 'P' || section.t === 'S' || section.t === 'T') {
    return `${title}${section.b || ''}\n\n`;
  }

  if (section.t === 'W' || section.t === 'CL') {
    const items = Array.isArray(section.items)
      ? section.items.map(item => `- ${item}`).join('\n')
      : '';

    return `${title}${items}\n\n`;
  }

  if (section.t === 'ST' || section.t === 'FW') {
    const items = Array.isArray(section.items)
      ? section.items.map(item => {
          return `- **${item.l || ''}:** ${item.d || ''}`;
        }).join('\n')
      : '';

    return `${title}${items}\n\n`;
  }

  if (section.t === 'RF') {
    const items = Array.isArray(section.items)
      ? section.items.map(item => {
          return [
            `- **Red flag:** ${item.f || ''}`,
            `  - **Como reagir:** ${item.r || ''}`
          ].join('\n');
        }).join('\n')
      : '';

    return `${title}${items}\n\n`;
  }

  if (section.t === 'TBL') {
    const columns = Array.isArray(section.cols) ? section.cols : [];
    const rows = Array.isArray(section.rows) ? section.rows : [];

    if (!columns.length) return '';

    const header = `| ${columns.join(' | ')} |`;
    const separator = `| ${columns.map(() => '---').join(' | ')} |`;
    const body = rows
      .map(row => `| ${row.join(' | ')} |`)
      .join('\n');

    return `${title}${header}\n${separator}\n${body}\n\n`;
  }

  if (section.t === 'SC') {
    const items = Array.isArray(section.items)
      ? section.items.map((item, index) => {
          return `${index + 1}. ${item}`;
        }).join('\n')
      : '';

    return `${title}${items}\n\n`;
  }

  return '';
}

function coachIaBuildPlaybookContent() {
  if (typeof M === 'undefined' || !Array.isArray(M)) {
    return 'Conteúdo do playbook indisponível.';
  }

  return M.map(module => {
    const sections = Array.isArray(module.s)
      ? module.s.map(coachIaFormatSection).join('')
      : '';

    return [
      `## Módulo ${String(module.id).padStart(2, '0')} — ${module.title}`,
      '',
      module.sub || '',
      '',
      sections
    ].join('\n');
  }).join('\n---\n\n');
}

function coachIaBuildPrompt() {
  const playbookContent = coachIaBuildPlaybookContent();

  return `# Coach IA — Avaliação de Reunião Comercial

## Sua função

Você é um Coach IA especializado em vendas consultivas.

Analise a transcrição da reunião comercial usando exclusivamente o método e os critérios deste Playbook.

Não faça apenas um resumo da conversa.

O objetivo é avaliar:

- a qualidade da condução comercial;
- a capacidade de diagnóstico;
- a construção de valor;
- o controle do processo de decisão;
- a aderência ao playbook;
- os riscos que podem impedir o avanço;
- os pontos que precisam ser corrigidos na próxima reunião.

---

## Regras obrigatórias da avaliação

1. Use evidências concretas da transcrição.
2. Cite frases ou momentos específicos da reunião.
3. Não invente informações que não estejam na transcrição.
4. Diferencie fatos de interpretações.
5. Não atribua mérito ao closer apenas porque houve venda.
6. Não penalize automaticamente o closer apenas porque não houve venda.
7. Separe a qualidade da execução da facilidade ou dificuldade do cenário.
8. Avalie cada item do scorecard individualmente.
9. Use a escala de 0 a 2:
   - 0 = não executado;
   - 1 = parcialmente executado;
   - 2 = bem executado.
10. Explique o motivo de cada nota.
11. Caso não exista evidência suficiente, informe isso explicitamente.
12. Não seja excessivamente complacente nem excessivamente crítico.

---

## Estrutura obrigatória da resposta

### 1. Resumo executivo

Explique brevemente:

- contexto da reunião;
- situação do lead;
- principal necessidade;
- resultado final;
- qualidade geral da condução.

### 2. Diagnóstico da oportunidade

Identifique:

- dor específica;
- impacto operacional;
- impacto financeiro;
- custo da inação;
- urgência;
- decisor;
- timing;
- critérios de decisão;
- concorrentes ou alternativas;
- riscos para o avanço.

Quando alguma informação não tiver sido identificada, escreva:

> Não identificado na transcrição.

### 3. Avaliação do scorecard

Avalie cada critério usando:

- **Nota:** 0, 1 ou 2;
- **Evidência:** trecho ou momento da transcrição;
- **Análise:** por que a execução foi adequada, parcial ou ausente;
- **Melhoria:** o que deveria ter sido feito.

Critérios:

1. Upfront contract e controle da abertura.
2. Dor específica identificada.
3. Custo do sistema atual e implicação quantificados.
4. Decisor, timing e critério de decisão mapeados.
5. Tese de valor antes da demonstração.
6. No máximo três provas conectadas à dor.
7. Checagem de aderência antes do preço.
8. Ancoragem e custo da inação.
9. Compromisso pré-preço.
10. Recomendação prescritiva.
11. Defesa de valor antes de desconto.
12. Fechamento e próximo passo datado.

### 4. Pontuação final

Apresente:

- pontos obtidos;
- máximo de 24 pontos;
- percentual de aderência;
- classificação final.

Use esta classificação:

- 80% a 100%: alta aderência;
- 60% a 79%: aderência intermediária;
- abaixo de 60%: baixa aderência.

### 5. Separação entre resultado e execução

Avalie separadamente:

#### Resultado comercial

Explique o desfecho da oportunidade.

#### Qualidade da execução

Explique se a condução foi boa independentemente do resultado.

#### Facilidade do cenário

Informe se o cenário era:

- favorável;
- neutro;
- difícil.

Justifique usando evidências.

### 6. Dois pontos fortes

Apresente exatamente dois pontos fortes, com evidências da transcrição.

### 7. Dois pontos críticos

Apresente exatamente dois pontos críticos, priorizados pelo impacto na venda.

### 8. Momento em que a venda perdeu força

Responda:

> Em qual momento a venda deixou de avançar ou correu maior risco?

Use evidências da transcrição.

### 9. Veredito final

Escolha um:

- Excelente condução;
- Boa condução com oportunidades de melhoria;
- Condução mediana;
- Condução fraca;
- Evidências insuficientes.

Justifique objetivamente.

### 10. Orientação para a próxima call

Forneça uma única orientação prática, específica e aplicável.

A orientação deve responder:

> Qual comportamento o closer deve priorizar na próxima reunião?

---

# Playbook completo de referência

${playbookContent}

---

# Transcrição para análise

Cole a transcrição abaixo desta linha:

`;
}

function downloadCoachIaPrompt() {
  try {
    const prompt = coachIaBuildPrompt();

    const blob = new Blob(
      [prompt],
      { type: 'text/markdown;charset=utf-8' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'coach-ia-playbook-vendas-v13.md';

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    if (typeof v13Toast === 'function') {
      v13Toast('Prompt do Coach IA baixado com sucesso.');
    }
  } catch (error) {
    console.error('Erro ao gerar prompt do Coach IA:', error);

    if (typeof v13Toast === 'function') {
      v13Toast('Não foi possível gerar o prompt do Coach IA.');
    } else {
      alert('Não foi possível gerar o prompt do Coach IA.');
    }
  }
}

/*
 * Complementa a tela de Configurações existente.
 * Não substitui nem remove as funções anteriores.
 */
const coachIaOriginalRenderSettings = renderSettings;

renderSettings = function () {
  coachIaOriginalRenderSettings();

  const content = document.getElementById('content');

  if (!content || document.getElementById('coach-ia-card')) {
    return;
  }

  const card = document.createElement('div');

  card.id = 'coach-ia-card';
  card.className = 'install-card';

  card.innerHTML = `
    <h4>
      <i class="ti ti-sparkles"></i>
      Coach IA
    </h4>

    <p>
      Baixe o guia completo de avaliação para usar junto com a
      transcrição de uma reunião comercial.
    </p>

    <button
      id="download-coach-ia-btn"
      class="btn-primary"
      type="button"
    >
      <i class="ti ti-file-download"></i>
      Baixar Prompt do Coach IA (.md)
    </button>
  `;

  content.appendChild(card);

  document
    .getElementById('download-coach-ia-btn')
    .addEventListener('click', downloadCoachIaPrompt);
};

/* ============================================================
   PATCH ADMINISTRACAO DE USUARIOS
   Filtros locais, limpar filtros, editar, redefinir senha e
   excluir logicamente. Reutiliza as classes CSS existentes.
   ============================================================ */
let v13AdminUsers=[];
let v13UserFilters={search:'',role:'',status:'',includeDeleted:false};

function v13RenderAdmin(){
  const cnt=document.getElementById('content');
  cnt.innerHTML=`
    <div class="mod-title">Administração de usuários</div>
    <div class="mod-sub">Crie, edite, filtre, desative, redefina senhas e exclua usuários.</div>

    <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px;">
      <div class="md-group" style="min-width:220px;flex:1;">
        <label class="md-label" for="v13-user-search">Buscar</label>
        <input id="v13-user-search" class="md-input" type="search" placeholder="Nome ou e-mail">
      </div>

      <div class="md-group" style="min-width:140px;">
        <label class="md-label" for="v13-user-role-filter">Perfil</label>
        <select id="v13-user-role-filter" class="md-input">
          <option value="">Todos</option>
          <option value="ADMIN">ADMIN</option>
          <option value="CLOSER">CLOSER</option>
        </select>
      </div>

      <div class="md-group" style="min-width:150px;">
        <label class="md-label" for="v13-user-status-filter">Status</label>
        <select id="v13-user-status-filter" class="md-input">
          <option value="">Todos</option>
          <option value="active">active</option>
          <option value="pending">pending</option>
          <option value="disabled">disabled</option>
        </select>
      </div>

      <label class="md-row-check" style="min-height:38px;">
        <input id="v13-include-deleted" type="checkbox">
        <span>Mostrar excluídos</span>
      </label>

      <button id="v13-clear-user-filters" class="btn-secondary" type="button">Limpar filtros</button>
      <button id="v13-new-user" class="btn-primary" type="button"><i class="ti ti-user-plus"></i> Novo usuário</button>
    </div>

    <div id="v13-user-filter-summary" class="sec-sub"></div>
    <div id="v13-users"><div class="v13-loading"><span class="v13-spinner"></span> Carregando usuários...</div></div>
  `;

  document.getElementById('v13-new-user').onclick=v13NewUser;
  document.getElementById('v13-user-search').value=v13UserFilters.search;
  document.getElementById('v13-user-role-filter').value=v13UserFilters.role;
  document.getElementById('v13-user-status-filter').value=v13UserFilters.status;
  document.getElementById('v13-include-deleted').checked=v13UserFilters.includeDeleted;

  let searchTimer=null;
  document.getElementById('v13-user-search').addEventListener('input',event=>{
    clearTimeout(searchTimer);
    searchTimer=setTimeout(()=>{
      v13UserFilters.search=event.target.value.trim();
      v13RenderUsersTable();
    },180);
  });
  document.getElementById('v13-user-role-filter').onchange=event=>{
    v13UserFilters.role=event.target.value;
    v13RenderUsersTable();
  };
  document.getElementById('v13-user-status-filter').onchange=event=>{
    v13UserFilters.status=event.target.value;
    v13RenderUsersTable();
  };
  document.getElementById('v13-include-deleted').onchange=async event=>{
    v13UserFilters.includeDeleted=event.target.checked;
    await v13LoadUsers();
  };
  document.getElementById('v13-clear-user-filters').onclick=()=>{
    v13UserFilters={search:'',role:'',status:'',includeDeleted:false};
    v13RenderAdmin();
  };

  v13LoadUsers();
}

async function v13LoadUsers(){
  const box=document.getElementById('v13-users');
  if(box)box.innerHTML='<div class="v13-loading"><span class="v13-spinner"></span> Carregando usuários...</div>';
  try{
    const data=await v13Fetch(
      'listUsers',
      {includeDeleted:v13UserFilters.includeDeleted},
      'GET'
    );
    v13AdminUsers=Array.isArray(data.users)?data.users:[];
    v13RenderUsersTable();
  }catch(error){
    if(box)box.textContent=error.message;
  }
}

function v13FilteredUsers(){
  const term=v13UserFilters.search.toLowerCase();
  return v13AdminUsers.filter(user=>{
    if(!v13UserFilters.includeDeleted&&user.deletedAt)return false;
    if(v13UserFilters.role&&user.role!==v13UserFilters.role)return false;
    if(v13UserFilters.status&&user.status!==v13UserFilters.status)return false;
    if(term){
      const haystack=((user.name||'')+' '+(user.email||'')).toLowerCase();
      if(!haystack.includes(term))return false;
    }
    return true;
  });
}

function v13RenderUsersTable(){
  const box=document.getElementById('v13-users');
  if(!box)return;

  const users=v13FilteredUsers();
  const summary=document.getElementById('v13-user-filter-summary');
  if(summary)summary.textContent='Mostrando '+users.length+' de '+v13AdminUsers.length+' usuários.';

  if(!users.length){
    box.innerHTML='<div class="empty-search-box">Nenhum usuário encontrado com os filtros atuais.</div>';
    return;
  }

  box.innerHTML=`
    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th>Usuário</th>
            <th>Perfil</th>
            <th>Status</th>
            <th>Último login</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(user=>v13UserRowHtml(user)).join('')}
        </tbody>
      </table>
    </div>
  `;

  box.querySelectorAll('[data-user-action]').forEach(button=>{
    button.onclick=()=>v13HandleUserAction(
      button.dataset.userAction,
      button.dataset.userId
    );
  });
}

function v13UserRowHtml(user){
  const deleted=Boolean(user.deletedAt);
  const lastLogin=user.lastLoginAt?formatDateShort(user.lastLoginAt):'—';
  const actions=[];

  if(!deleted){
    actions.push(`<button class="table-action-btn" data-user-action="edit" data-user-id="${escapeHtml(user.id)}">Editar</button>`);

    if(user.status==='pending'){
      actions.push(`<button class="table-action-btn" data-user-action="resendInvite" data-user-id="${escapeHtml(user.id)}">Reenviar convite</button>`);
    }
    if(user.status==='active'){
      actions.push(`<button class="table-action-btn" data-user-action="sendPasswordReset" data-user-id="${escapeHtml(user.id)}">Redefinir senha</button>`);
    }

    actions.push(`<button class="table-action-btn" data-user-action="${user.status==='disabled'?'enableUser':'disableUser'}" data-user-id="${escapeHtml(user.id)}">${user.status==='disabled'?'Ativar':'Desativar'}</button>`);
    actions.push(`<button class="table-action-btn" data-user-action="revokeUserSessions" data-user-id="${escapeHtml(user.id)}">Revogar sessões</button>`);
    actions.push(`<button class="table-delete-btn" data-user-action="delete" data-user-id="${escapeHtml(user.id)}">Excluir</button>`);
  }

  return `
    <tr${deleted?' style="opacity:.58"':''}>
      <td>
        <b>${escapeHtml(user.name||'')}</b><br>
        <small>${escapeHtml(user.email||'')}</small>
        ${deleted?'<div style="font-size:11px;color:#f87171;margin-top:3px;">Excluído logicamente</div>':''}
      </td>
      <td>${escapeHtml(user.role||'')}</td>
      <td>${escapeHtml(user.status||'')}${deleted?' / deleted':''}</td>
      <td>${escapeHtml(lastLogin)}</td>
      <td><div class="v13-admin-actions">${actions.join('')}</div></td>
    </tr>
  `;
}

async function v13HandleUserAction(action,userId){
  const user=v13AdminUsers.find(item=>item.id===userId);
  if(!user)return;

  if(action==='edit')return v13EditUser(user);
  if(action==='delete')return v13DeleteUser(user);

  const messages={
    resendInvite:'Reenviar o convite inicial para este usuário?',
    sendPasswordReset:'Enviar um link de redefinição de senha e revogar as sessões atuais?',
    disableUser:'Desativar o acesso deste usuário?',
    enableUser:'Ativar o acesso deste usuário?',
    revokeUserSessions:'Revogar todas as sessões ativas deste usuário?'
  };
  if(!confirm(messages[action]||'Executar esta ação?'))return;

  v13Overlay(true,'Atualizando usuário...');
  try{
    const result=await v13Fetch(action,{userId:userId});
    v13Toast(result.message||'Ação concluída.');
    await v13LoadUsers();
  }catch(error){
    v13Toast(error.message);
  }finally{
    v13Overlay(false);
  }
}

function v13EditUser(user){
  showModal('Editar usuário',`
    <div class="md-form">
      <div class="md-group">
        <label class="md-label">Nome</label>
        <input id="v13-edit-name" class="md-input" value="${escapeHtml(user.name||'')}">
      </div>
      <div class="md-group">
        <label class="md-label">E-mail</label>
        <input id="v13-edit-email" type="email" class="md-input" value="${escapeHtml(user.email||'')}">
      </div>
      <div class="md-group">
        <label class="md-label">Perfil</label>
        <select id="v13-edit-role" class="md-input">
          <option value="CLOSER" ${user.role==='CLOSER'?'selected':''}>Closer</option>
          <option value="ADMIN" ${user.role==='ADMIN'?'selected':''}>Administrador</option>
        </select>
      </div>
      <div class="md-btns">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button id="v13-save-user" class="btn-primary">Salvar alterações</button>
      </div>
    </div>
  `);

  document.getElementById('v13-save-user').onclick=async()=>{
    const button=document.getElementById('v13-save-user');
    const name=document.getElementById('v13-edit-name').value.trim();
    const email=document.getElementById('v13-edit-email').value.trim();
    const role=document.getElementById('v13-edit-role').value;

    if(!name||!email){
      v13Toast('Preencha nome e e-mail.');
      return;
    }

    button.disabled=true;
    try{
      const result=await v13Fetch('updateUser',{
        userId:user.id,
        name:name,
        email:email,
        role:role
      });
      closeModal();
      v13Toast('Usuário atualizado.');
      await v13LoadUsers();
      if(v13User&&v13User.id===result.user.id){
        v13User={...v13User,...result.user};
        v13RenderUser();
      }
    }catch(error){
      v13Toast(error.message);
    }finally{
      button.disabled=false;
    }
  };
}

async function v13DeleteUser(user){
  const confirmed=confirm(
    'Excluir logicamente '+user.name+'?\n\n'+
    'O usuário perderá o acesso e será ocultado da lista padrão. '+
    'Leads, calls e histórico serão preservados.'
  );
  if(!confirmed)return;

  v13Overlay(true,'Excluindo usuário...');
  try{
    await v13Fetch('deleteUser',{userId:user.id});
    v13Toast('Usuário excluído logicamente.');
    await v13LoadUsers();
  }catch(error){
    v13Toast(error.message);
  }finally{
    v13Overlay(false);
  }
}
