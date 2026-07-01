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
  if(syncStatus !== 'saved'){
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
  showModal('Iniciar Nova Call Consultiva', `
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
  if(confirm('Tem certeza de que deseja apagar permanentemente o registro desta call?')) {
    const token = getAccessToken();
    state.calls = state.calls.filter(c => c.id !== id);
    if(state.activeCallId === id) state.activeCallId = null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();

    if(token){
      syncStatus = 'saving';
      updateSyncBadge();
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'deleteCall', token: token, closer: CLOSER_NAME, id: id })
      })
      .then(r => r.json())
      .then(data => {
        if(!data || data.ok === false) throw new Error(data && data.error ? data.error : 'Erro ao apagar');
        syncStatus = 'saved';
        updateSyncBadge();
        console.log('Call marcada como excluída em Calls_v2:', data);
      })
      .catch(err => {
        console.error('Erro ao apagar call em Calls_v2:', err);
        syncStatus = 'error';
        updateSyncBadge();
      });
    }
  }
}

function selectCall(id) {
  state.activeCallId = id;
  state.active = 1;
  saveToStorage();
  render();
}

function renderBanner() {
  const container = document.getElementById('call-banner-container');
  container.innerHTML = '';
  
  const call = getActiveCall();
  if(call) {
    const banner = mk('div', 'call-banner');
    const left = mk('div', 'call-banner-txt');
    left.innerHTML = `<div class="call-banner-dot"></div><span>Sessão Ativa: <b>${call.leadName}</b> · SDR: ${call.sdrName}</span>`;
    if(call.isSao) {
      left.appendChild(mk('span', 'badge b-sao', 'SAO'));
    }
    
    const right = mk('div', '');
    right.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap';
    const btnSc = mk('button', 'btn-secondary', '<i class="ti ti-chart-bar"></i> Ir para Scorecard');
    btnSc.addEventListener('click', () => { state.active = 12; saveToStorage(); render(); window.scrollTo(0,0); });
    const btnEnd = mk('button', 'btn-danger', '<i class="ti ti-circle-check"></i> Concluir Execução');
    btnEnd.addEventListener('click', openEndCallModal);
    right.appendChild(btnSc);
    right.appendChild(btnEnd);
    
    banner.appendChild(left);
    banner.appendChild(right);
    container.appendChild(banner);
  } else {
    const sandbox = mk('div', 'call-banner-sandbox');
    sandbox.innerHTML = `<i class="ti ti-info-circle"></i> Navegando em Modo Sandbox (Simulação). Nenhuma call ativa. Os dados preenchidos serão salvos temporariamente. Vá até o <b>Cockpit</b> para iniciar um atendimento real.`;
    container.appendChild(sandbox);
  }
}

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
  const btnNew = mk('button', 'btn-primary', '<i class="ti ti-plus"></i> + Nova Call (Checklist Ativo)');
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

function render(){
  renderBanner();
  
  document.getElementById('btn-db').classList.toggle('active', state.active === 'dashboard');
  document.getElementById('btn-cfg').classList.toggle('active', state.active === 'settings');
  
  const nav=document.getElementById('nav');
  nav.innerHTML='';
  
  M.forEach(m=>{
    const isAct = (state.active === m.id);
    const btn=mk('button','sb-btn'+(isAct?' active':''));
    btn.style.setProperty('--ac',m.accent);
    btn.innerHTML=`<i class="ti ${m.icon}" style="font-size:15px;color:${isAct?m.accent:'inherit'};flex-shrink:0"></i>${m.label}`;
    btn.addEventListener('click',()=>{
      state.active=m.id;
      saveToStorage();
      render();
      window.scrollTo(0,0);
    });
    nav.appendChild(btn);
  });
  
  document.getElementById('btn-db').onclick = () => { state.active = 'dashboard'; saveToStorage(); render(); };
  document.getElementById('btn-cfg').onclick = () => { state.active = 'settings'; saveToStorage(); render(); };

  if(state.active === 'dashboard') {
    renderDashboard();
    return;
  }
  if(state.active === 'settings') {
    renderSettings();
    return;
  }

  const mod=M[state.active];
  const cnt=document.getElementById('content');
  cnt.innerHTML='';
  
  const num=mk('div','mod-num',`módulo ${String(mod.id).padStart(2,'0')}`);
  num.style.color=mod.accent;
  cnt.appendChild(num);
  cnt.appendChild(mk('div','mod-title',mod.title));
  cnt.appendChild(mk('div','mod-sub',mod.sub));
  mod.s.forEach(s=>{const sec=renderSection(s,mod);if(sec)cnt.appendChild(sec);});
}

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
  showModal('Iniciar Nova Call Consultiva', `
    <div class="md-form">
      <div class="md-group"><label class="md-label">Nome da Clínica / Lead</label><input type="text" id="nc-lead" class="md-input" placeholder="Ex: Clínica São Lucas" required /></div>
      <div class="md-group"><label class="md-label">SDR que Agendou</label><input type="text" id="nc-sdr" class="md-input" placeholder="Ex: João Silva" required /></div>
      <div class="md-group"><label class="md-label">Data da Reunião</label><input type="date" id="nc-date" class="md-input" /></div>
      <div class="md-info">A marcação de SAO agora acontece no encerramento da reunião, depois da condução e do scorecard.</div>
      <div class="md-btns"><button class="btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn-primary" onclick="submitNewCall()">Decolar Prontuário 🚀</button></div>
    </div>`);
}
function submitNewCall() {
  const lead=document.getElementById('nc-lead').value.trim(); const sdr=document.getElementById('nc-sdr').value.trim();
  if(!lead||!sdr){alert('Por favor, preencha todos os campos obrigatórios.');return;}
  const newCall={id:'call_'+Date.now(),leadName:lead,sdrName:sdr,isSao:false,status:'Em andamento',motivoPerdido:'',date:(()=>{const d=document.getElementById('nc-date');return d&&d.value?new Date(d.value+'T12:00:00').toLocaleDateString('pt-BR'):new Date().toLocaleDateString('pt-BR')})(),cl:{},sc:{}};
  state.calls.push(newCall); state.activeCallId=newCall.id; state.active=1; closeModal(); saveToStorage(); render();
}
function openEndCallModal(){
  const call=getActiveCall(); if(!call)return; const st=getScorecardStats(call);
  const scoreMsg=st.complete?`<div class="md-info"><i class="ti ti-check"></i> Scorecard completo: ${st.evaluated}/${st.totalItems} critérios preenchidos.</div>`:`<div class="md-warning"><b>Scorecard pendente:</b> ${st.evaluated}/${st.totalItems} critérios preenchidos. Para encerrar como Venda, Follow-up ou Perdido, complete o scorecard antes de arquivar.</div>`;
  const noShowWarning=hasAnyScorecardAnswer(call)?`<div id="ec-noshow-warning" class="md-warning hidden"><b>Atenção:</b> marcar como No-Show vai limpar e desconsiderar as respostas já preenchidas no scorecard desta reunião.</div>`:`<div id="ec-noshow-warning" class="md-info hidden">No-Show não entra como demo realizada e não exige scorecard preenchido.</div>`;
  showModal('Encerrar Sessão de Venda', `<div class="md-form">${scoreMsg}<div class="md-group"><label class="md-label">Status Final da Call</label><select id="ec-status" class="md-input" onchange="handleEndStatusChange()"><option value="Venda">Venda Concluída (SAL Assinado) 🟢</option><option value="Follow-up">Follow-up Estratégico Agendado 🟡</option><option value="Perdido">Perdido / Sem Fechamento 🔴</option><option value="No-Show">No-Show (Lead não compareceu) ⚪</option></select></div><div class="md-group hidden" id="ec-motivo-wrap"><label class="md-label">Motivo Primário da Perda</label><input type="text" id="ec-motivo" class="md-input" placeholder="Ex: Fora do orçamento, falta módulo X..." /></div><div class="md-group" id="ec-sao-wrap"><label class="md-row-check"><input type="checkbox" id="ec-sao" ${call.isSao?'checked':''} style="accent-color:#3b82f6;" /><span>Marcar como SAO ao final da reunião</span></label></div>${noShowWarning}<div class="md-btns"><button class="btn-secondary" onclick="closeModal()">Voltar</button><button class="btn-primary" onclick="submitEndCall()">Arquivar Histórico</button></div></div>`);
  handleEndStatusChange();
}
function handleEndStatusChange(){const status=document.getElementById('ec-status')?.value;document.getElementById('ec-motivo-wrap')?.classList.toggle('hidden',status!=='Perdido');document.getElementById('ec-sao-wrap')?.classList.toggle('hidden',status==='No-Show');document.getElementById('ec-noshow-warning')?.classList.toggle('hidden',status!=='No-Show');}
function submitEndCall(){
  const status=document.getElementById('ec-status').value; const motivo=document.getElementById('ec-motivo').value.trim(); const call=getActiveCall(); if(!call)return;
  const st=getScorecardStats(call); if(status!=='No-Show'&&!st.complete){alert(`Antes de encerrar, preencha o scorecard completo. Hoje estão preenchidos ${st.evaluated}/${st.totalItems} critérios.`); state.active=12; closeModal(); saveToStorage(); render(); window.scrollTo(0,0); return;}
  if(status==='No-Show'&&hasAnyScorecardAnswer(call)){const ok=confirm('Esta reunião possui scorecard preenchido. Ao salvar como No-Show, as respostas do scorecard serão limpas e não entrarão nos indicadores. Deseja continuar?'); if(!ok)return; call.sc={};}
  call.status=status; call.isSao=status==='No-Show'?false:!!document.getElementById('ec-sao')?.checked; if(status==='Perdido')call.motivoPerdido=motivo; if(status!=='Perdido')call.motivoPerdido=''; state.activeCallId=null; state.active='dashboard'; closeModal(); saveToStorage(); render();
}

function renderDashboard(){
  const cnt=document.getElementById('content'); cnt.innerHTML=''; cnt.appendChild(mk('div','mod-title','Cockpit de Vendas Consultivas')); cnt.appendChild(mk('div','mod-sub','Histórico local, conversões de Demo realizada > SAO, SAO > Venda, Demo > Venda e auditoria estrutural de processos.'));
  const topActions=mk('div','dash-actions'); const topLeft=mk('div','dash-actions-left'); const btnNewTop=mk('button','btn-primary','<i class="ti ti-plus"></i> Nova Call'); btnNewTop.addEventListener('click',initNewCallForm); topLeft.appendChild(btnNewTop); const searchBox=mk('div','search-wrap'); searchBox.innerHTML='<i class="ti ti-search"></i><input type="search" id="call-search" class="search-input" placeholder="Pesquisar pelo nome da clínica/lead..." value="'+escapeHtml(sessionStorage.getItem('call-search')||'')+'" />'; topLeft.appendChild(searchBox); topActions.appendChild(topLeft); cnt.appendChild(topActions); cnt.appendChild(mk('div','loading-feedback','<span class="loading-dot"></span><span>Buscando reuniões...</span>'));
  setTimeout(()=>{const s=document.getElementById('call-search'); if(s){let t=null; s.addEventListener('input',()=>{document.querySelector('.loading-feedback')?.classList.add('show'); clearTimeout(t); t=setTimeout(()=>{sessionStorage.setItem('call-search',s.value.trim());sessionStorage.setItem('calls-page','1');render();},250);});}},0);
  const filRow=mk('div','fil-row'); const fg1=mk('div','fil-grp'); fg1.innerHTML='<label class="fil-lbl">Data inicial</label>'; const fi1=document.createElement('input'); fi1.type='date'; fi1.id='fil-start'; fi1.className='fil-inp'; fi1.value=sessionStorage.getItem('fil-start')||''; fg1.appendChild(fi1); const fg2=mk('div','fil-grp'); fg2.innerHTML='<label class="fil-lbl">Data final</label>'; const fi2=document.createElement('input'); fi2.type='date'; fi2.id='fil-end'; fi2.className='fil-inp'; fi2.value=sessionStorage.getItem('fil-end')||''; fg2.appendChild(fi2); const bFil=mk('button','btn-primary','Filtrar'); bFil.style.cssText='align-self:flex-end;font-size:12px;padding:7px 14px'; bFil.addEventListener('click',()=>{sessionStorage.setItem('fil-start',document.getElementById('fil-start')?.value||'');sessionStorage.setItem('fil-end',document.getElementById('fil-end')?.value||'');sessionStorage.setItem('calls-page','1');state.active='dashboard';render();}); const bCmp=mk('button','btn-secondary',''); bCmp.innerHTML='<i class="ti ti-arrows-left-right" style="font-size:13px;margin-right:5px"></i>Comparar'; bCmp.style.cssText='align-self:flex-end;font-size:12px;padding:7px 12px;display:flex;align-items:center'; bCmp.addEventListener('click',openCompareModal); filRow.appendChild(fg1);filRow.appendChild(fg2);filRow.appendChild(bFil);filRow.appendChild(bCmp); cnt.appendChild(filRow);
  const _fs=sessionStorage.getItem('fil-start')||'', _fe=sessionStorage.getItem('fil-end')||''; let filteredCalls=state.calls; if(_fs||_fe){filteredCalls=state.calls.filter(c=>{if(!c.date)return true; const p=c.date.split('/'); if(p.length!==3)return true; const dt=new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime(); return dt>=(_fs?new Date(_fs).getTime():0)&&dt<=(_fe?new Date(_fe+'T23:59:59').getTime():Infinity);});} const searchTerm=(sessionStorage.getItem('call-search')||'').toLowerCase(); if(searchTerm){filteredCalls=filteredCalls.filter(c=>(c.leadName||'').toLowerCase().includes(searchTerm));}
  const convStats=getConversionStats(filteredCalls); let scoreSum=0,evaluatedCalls=0; filteredCalls.forEach(c=>{let scKeys=Object.keys(c.sc||{}); if(scKeys.length>0){let sum=0,count=0; scKeys.forEach(k=>{if(c.sc[k]!==undefined&&c.sc[k]!==null){sum+=c.sc[k];count++;}}); if(count>0){scoreSum+=(sum/(count*2))*100;evaluatedCalls++;}}}); const avgScore=evaluatedCalls>0?Math.round(scoreSum/evaluatedCalls):0; const grid=mk('div','db-grid'); grid.appendChild(createMetricCard('Total de Reuniões',filteredCalls.length)); grid.appendChild(createMetricCard('Demos Realizadas',convStats.demos)); grid.appendChild(createMetricCard('Demo > SAO',convStats.demoSao+'%')); grid.appendChild(createMetricCard('SAO > Venda',convStats.saoVenda+'%')); grid.appendChild(createMetricCard('Demo > Venda',convStats.demoVenda+'%')); grid.appendChild(createMetricCard('Aderência Média Playbook',avgScore>0?avgScore+'%':'--')); cnt.appendChild(grid);
  if(filteredCalls.length>0){const chartsRow=mk('div','db-charts'); [['chartStatus','Distribuição dos Fechamentos (Status)'],['chartSdr','Volume Comercial por SDR'],['chartConversions','Conversões do Funil']].forEach(pair=>{const cont=mk('div','chart-container'); cont.appendChild(mk('div','chart-title',pair[1])); const cw=mk('div',''); cw.style='position:relative;height:180px'; const cv=document.createElement('canvas'); cv.id=pair[0]; cw.appendChild(cv); cont.appendChild(cw); chartsRow.appendChild(cont);}); cnt.appendChild(chartsRow); const evoContainer=mk('div','chart-container'); evoContainer.style.marginBottom='28px'; evoContainer.appendChild(mk('div','chart-title','Evolução Mensal — Aderência ao Playbook x Conversão')); const cw3=mk('div',''); cw3.style='position:relative;height:220px'; const canvas3=document.createElement('canvas'); canvas3.id='chartEvolution'; cw3.appendChild(canvas3); evoContainer.appendChild(cw3); evoContainer.appendChild(mk('div','evo-note','Aderência = média dos scorecards preenchidos no mês. Conversão = Vendas / SAOs no mês. Demos realizadas excluem No-Show e reuniões em andamento.')); cnt.appendChild(evoContainer);}
  cnt.appendChild(mk('div','','<h3 style="font-size:16px; font-weight:600; margin-bottom:12px;">Histórico de Reuniões</h3>'));
  if(state.calls.length===0){cnt.appendChild(mk('div','','<p style="font-size:13px; color:#64748b; padding:20px; text-align:center; background:#1a2332; border:1px solid #334155; border-radius:8px;">Nenhuma reunião registrada localmente. Inicie uma nova call no topo da página.</p>'));}
  else if(filteredCalls.length===0){cnt.appendChild(mk('div','','<p style="font-size:13px; color:#64748b; padding:20px; text-align:center; background:#1a2332; border:1px solid #334155; border-radius:8px;">Nenhuma reunião encontrada com os filtros atuais.</p>'));}
  else{const pageSize=20,totalPages=Math.max(1,Math.ceil(filteredCalls.length/pageSize)); let currentPage=parseInt(sessionStorage.getItem('calls-page')||'1',10); if(currentPage<1)currentPage=1; if(currentPage>totalPages)currentPage=totalPages; const callsToDisplay=[...filteredCalls].reverse().slice((currentPage-1)*pageSize,currentPage*pageSize); const tblWrap=mk('div','tbl-wrap'); const tbl=document.createElement('table'); tbl.innerHTML='<thead><tr><th>Lead / Clínica</th><th>SDR</th><th>SAO</th><th>Data</th><th>Status</th><th style="text-align:right;">Ações</th></tr></thead><tbody></tbody>'; const tbody=tbl.querySelector('tbody'); callsToDisplay.forEach(c=>{const tr=document.createElement('tr'); let statusClass='b-progress'; if(c.status==='Venda')statusClass='b-venda'; if(c.status==='Follow-up')statusClass='b-follow'; if(c.status==='Perdido')statusClass='b-perdido'; if(c.status==='No-Show')statusClass='b-noshow'; const statusLabel=c.status==='Perdido'&&c.motivoPerdido?`${c.status} (${c.motivoPerdido})`:c.status; tr.innerHTML=`<td><b>${escapeHtml(c.leadName)}</b></td><td>${escapeHtml(c.sdrName)}</td><td>${c.isSao?'<span class="badge b-sao">SAO</span>':'<span style="color:#475569">—</span>'}</td><td>${escapeHtml(c.date)}</td><td><span class="badge ${statusClass}">${escapeHtml(statusLabel)}</span></td><td style="text-align:right;"></td>`; const actTd=tr.querySelector('td:last-child'); if(c.status==='Em andamento'){const btnSel=mk('button','table-action-btn','Retomar'); btnSel.addEventListener('click',()=>selectCall(c.id)); actTd.appendChild(btnSel);} else{const btnReview=mk('button','table-action-btn','Ver Checklist'); btnReview.addEventListener('click',()=>{state.activeCallId=c.id;state.active=1;saveToStorage();render();}); actTd.appendChild(btnReview);} const btnEd=mk('button','table-action-btn','Editar'); btnEd.addEventListener('click',()=>openEditCallModal(c.id)); actTd.appendChild(btnEd); const btnDel=mk('button','table-delete-btn','Apagar'); btnDel.addEventListener('click',()=>deleteCall(c.id)); actTd.appendChild(btnDel); tbody.appendChild(tr);}); tblWrap.appendChild(tbl); cnt.appendChild(tblWrap); const pg=mk('div','pg-row'); const startItem=filteredCalls.length?((currentPage-1)*pageSize+1):0,endItem=Math.min(currentPage*pageSize,filteredCalls.length); pg.appendChild(mk('div','',`Mostrando ${startItem}-${endItem} de ${filteredCalls.length} reuniões`)); const btns=mk('div','pg-btns'); const prev=mk('button','pg-btn','Anterior'); prev.disabled=currentPage===1; prev.addEventListener('click',()=>{sessionStorage.setItem('calls-page',String(currentPage-1));render();}); btns.appendChild(prev); for(let i=1;i<=totalPages;i++){if(i===1||i===totalPages||Math.abs(i-currentPage)<=2){const b=mk('button','pg-btn'+(i===currentPage?' active':''),String(i)); b.addEventListener('click',()=>{sessionStorage.setItem('calls-page',String(i));render();}); btns.appendChild(b);}} const next=mk('button','pg-btn','Próxima'); next.disabled=currentPage===totalPages; next.addEventListener('click',()=>{sessionStorage.setItem('calls-page',String(currentPage+1));render();}); btns.appendChild(next); pg.appendChild(btns); cnt.appendChild(pg); setTimeout(()=>buildCharts(filteredCalls),50);}
}
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
function scheduleRemoteSync(){
  syncStatus = 'saving';
  updateSyncBadge();
  clearTimeout(syncTimer);
  const delay = apiReachable ? 15000 : 1200;
  syncTimer = setTimeout(syncToRemote, delay);
}
function syncToRemote(){
  const token = getAccessToken();
  if(!token){
    syncStatus = 'error';
    updateSyncBadge();
    return;
  }

  const calls = Array.isArray(state.calls) ? state.calls : [];

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'saveCalls',
      token: token,
      closer: CLOSER_NAME,
      calls: calls
    })
  })
  .then(r => r.json())
  .then(data => {
    if(!data || data.ok === false) throw new Error(data && data.error ? data.error : 'Erro ao sincronizar');
    apiReachable = true;
    syncStatus = 'saved';
    updateSyncBadge();
    console.log('Sync Calls_v2 concluído:', data);
  })
  .catch(err => {
    console.error('Erro de sync Calls_v2:', err);
    syncStatus = 'error';
    updateSyncBadge();
    if(String(err.message).includes('unauthorized')) resetAccessToken();
  });
}
function fetchCallsV2Remote(token){
  const url = API_URL + '?action=getCalls&token=' + encodeURIComponent(token) + '&closer=' + encodeURIComponent(CLOSER_NAME);
  return fetch(url).then(r => r.json());
}

function applyCallsV2ToState(calls){
  state = {
    ...state,
    active: 'dashboard',
    activeCallId: null,
    calls: Array.isArray(calls) ? calls : [],
    sandboxCl: state.sandboxCl || {},
    sandboxSc: state.sandboxSc || {}
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function validateTokenAndLoad(token){
  if(!token){
    showAccessError('Digite a chave de acesso para continuar.');
    return;
  }

  clearAccessError();
  setAccessLoading(true);

  return fetchCallsV2Remote(token)
    .then(data => {
      if(!data || data.ok === false) throw new Error(data && data.error ? data.error : 'unauthorized');

      localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
      apiReachable = true;
      applyCallsV2ToState(data.calls || []);

      syncStatus = 'saved';
      console.log('Dados carregados exclusivamente de Calls_v2:', (data.calls || []).length, 'calls');
      unlockApplication();
    })
    .catch(err => {
      console.error('Falha de autenticação/carregamento Calls_v2:', err);
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      showAccessError('Chave inválida, backend indisponível ou aba Calls_v2 ausente. Confira a chave e tente novamente.');
    })
    .finally(() => setAccessLoading(false));
}
function loadFromRemote(){
  const token = getAccessToken();
  if(!token) return Promise.resolve();

  return fetchCallsV2Remote(token)
    .then(data => {
      apiReachable = true;
      if(!data || data.ok === false) throw new Error(data && data.error ? data.error : 'Erro ao carregar');
      applyCallsV2ToState(data.calls || []);
      console.log('Recarregado da nuvem exclusivamente via Calls_v2:', (data.calls || []).length, 'calls');
    })
    .catch(err => {
      console.error('Não foi possível conectar ao backend Calls_v2.', err);
      if(String(err.message).includes('unauthorized')) resetAccessToken();
    });
}
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

initAccessGate();
