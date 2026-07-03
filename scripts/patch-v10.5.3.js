// V10.5.3 — patch limpo: deleteCall real, gráficos, overlay menu e badge.
(function(){
  window.PLAYBOOK_VERSION='10.5.3';
  function safe(fn,fb){try{return fn()}catch(e){return fb}}
  function setBadge(){let b=document.querySelector('.version-badge');if(!b){b=document.createElement('div');b.className='version-badge';document.body.appendChild(b)}b.textContent='V10.5.3'}
  function saveLocal(){safe(()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state)))}
  function sync(status){safe(()=>{syncStatus=status;if(typeof updateSyncBadge==='function')updateSyncBadge()})}
  function token(){return safe(()=>getAccessToken(),'')}
  function closer(){return safe(()=>CLOSER_NAME||'Eduardo','Eduardo')}
  function nstatus(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
  function inProgress(c){return nstatus(c&&c.status)==='em andamento'}
  function callById(id){return safe(()=>(Array.isArray(state.calls)?state.calls:[]).find(c=>c.id===id),null)}
  function callName(id){const c=callById(id);return c&&c.leadName?c.leadName:'esta reunião'}
  function statusLabelV(s){const x=nstatus(s);if(x==='venda')return 'Fechado';if(x==='follow-up')return 'Follow-up';if(x==='no-show')return 'No-show';if(x==='perdido')return 'Perdido';if(x==='em andamento')return 'Em andamento';return s||'—'}
  function dateInputSafe(value){if(typeof dateInputValue==='function')return dateInputValue(value);if(!value)return '';const s=String(value);const br=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);if(br)return `${br[3]}-${br[2]}-${br[1]}`;const d=new Date(s);return !isNaN(d.getTime())?d.toISOString().slice(0,10):''}

  function deleteCallReal(id){
    const ok=confirm(`Deseja apagar a reunião de ${callName(id)}?\n\nA reunião será ocultada do histórico e marcada como excluída na planilha.`);
    if(!ok)return;
    const t=token();
    if(!t){alert('Chave de acesso não encontrada. Faça login novamente antes de apagar a reunião.');safe(()=>resetAccessToken());return;}
    sync('saving');
    fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'deleteCall',token:t,closer:closer(),id:id})})
      .then(r=>r.json())
      .then(data=>{if(!data||data.ok===false)throw new Error(data&&data.error?data.error:'delete_failed');state.calls=(Array.isArray(state.calls)?state.calls:[]).filter(c=>c.id!==id);if(state.activeCallId===id)state.activeCallId=null;saveLocal();sync('saved');if(typeof render==='function')render();console.log('V10.5.3 deleteCall OK',data)})
      .catch(err=>{console.error('V10.5.3 deleteCall ERRO',err);sync('error');if(String(err.message).includes('unauthorized')){alert('Chave inválida ou sessão expirada. Faça login novamente.');safe(()=>resetAccessToken())}else{alert('Não foi possível apagar a reunião na nuvem. Tente novamente antes de limpar dados locais.')}})
  }
  safe(()=>{deleteCall=deleteCallReal}); window.deleteCall=deleteCallReal;

  function createActionMenuFixed(call){
    if(typeof ensureCallModel==='function')call=ensureCallModel(call);
    const wrap=document.createElement('div');wrap.className='action-menu-wrap';
    const btn=document.createElement('button');btn.className='action-menu-btn';btn.textContent='⋮';
    btn.onclick=(e)=>{e.stopPropagation();document.querySelectorAll('.action-menu').forEach(m=>m.remove());const menu=document.createElement('div');menu.className='action-menu';const items=[];
      if(inProgress(call))items.push(['Retomar reunião',()=>{state.activeCallId=call.id;state.active=1;saveLocal();if(typeof render==='function')render();window.scrollTo(0,0)}]);
      items.push(['Ver detalhes',()=>safe(()=>openDetailsModal(call.id))],['Revisar checklist',()=>safe(()=>openChecklistReviewModal(call.id))],['Editar dados',()=>safe(()=>openEditCallModal(call.id))],['Atualizar status',()=>safe(()=>openStatusModal(call.id))],['Adicionar nova reunião',()=>safe(()=>addMeetingFromCall(call.id))],['Apagar reunião',()=>deleteCallReal(call.id)]);
      items.forEach(([label,fn])=>{const b=document.createElement('button');b.textContent=label;b.onclick=(ev)=>{ev.stopPropagation();document.querySelectorAll('.action-menu').forEach(m=>m.remove());fn()};menu.appendChild(b)});wrap.appendChild(menu)};
    wrap.appendChild(btn);return wrap;
  }
  safe(()=>{createActionMenu=createActionMenuFixed}); window.createActionMenu=createActionMenuFixed;

  function filteredCalls(){let calls=safe(()=>Array.isArray(state.calls)?state.calls.slice():[],[]);if(typeof ensureCallModel==='function')calls=calls.map(ensureCallModel);const fs=sessionStorage.getItem('fil-start')||'',fe=sessionStorage.getItem('fil-end')||'';if(fs||fe){calls=calls.filter(c=>{const dv=dateInputSafe(c.date);if(!dv)return true;const tt=new Date(dv+'T12:00:00').getTime();return tt>=(fs?new Date(fs+'T00:00:00').getTime():0)&&tt<=(fe?new Date(fe+'T23:59:59').getTime():Infinity)})}const q=(sessionStorage.getItem('call-search')||'').toLowerCase();if(q)calls=calls.filter(c=>String(c.leadName||'').toLowerCase().includes(q)||String(c.sdrName||'').toLowerCase().includes(q)||String(c.status||'').toLowerCase().includes(q));return calls}
  function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!==undefined)e.innerHTML=html;return e}
  function restoreCharts(){const content=document.getElementById('content');if(!content||!state||state.active!=='dashboard')return;if(document.getElementById('chartStatus'))return;const history=content.querySelector('.history-panel');if(!history)return;const calls=filteredCalls();if(!calls.length)return;const block=document.createElement('div');block.id='charts-restored-v10-5-3';const row=el('div','db-charts');[['chartStatus','Distribuição dos status'],['chartSdr','Volume comercial por SDR'],['chartConversions','Conversões do funil']].forEach(([id,title])=>{const cont=el('div','chart-container');cont.appendChild(el('div','chart-title',title));const w=el('div');w.style='position:relative;height:180px';const cv=document.createElement('canvas');cv.id=id;w.appendChild(cv);cont.appendChild(w);row.appendChild(cont)});block.appendChild(row);const evo=el('div','chart-container');evo.style.marginBottom='28px';evo.appendChild(el('div','chart-title','Evolução mensal — aderência ao playbook x conversão'));const ew=el('div');ew.style='position:relative;height:220px';const ec=document.createElement('canvas');ec.id='chartEvolution';ew.appendChild(ec);evo.appendChild(ew);evo.appendChild(el('div','evo-note','Aderência = média dos scorecards preenchidos. Demos realizadas excluem No-show e reuniões em andamento.'));block.appendChild(evo);content.insertBefore(block,history);if(typeof buildCharts==='function')setTimeout(()=>buildCharts(calls),80)}

  function fixMenuOverlay(){const sb=document.getElementById('sb-nav'),back=document.getElementById('sb-backdrop'),toggle=document.getElementById('sb-toggle');if(!sb||!back||!toggle)return;function close(){sb.classList.remove('sb-open');back.classList.remove('show');toggle.setAttribute('aria-expanded','false')}back.onclick=close;sb.addEventListener('click',e=>{if(e.target.closest('button'))close()})}
  safe(()=>{if(typeof render==='function'&&!window.__renderWrappedV1053){const old=render;render=function(){const r=old.apply(this,arguments);setBadge();setTimeout(()=>{restoreCharts();fixMenuOverlay()},120);return r};window.render=render;window.__renderWrappedV1053=true}});
  let tries=0;const timer=setInterval(()=>{setBadge();restoreCharts();fixMenuOverlay();tries++;if(tries>20)clearInterval(timer)},300);
  setBadge();setTimeout(()=>{restoreCharts();fixMenuOverlay()},200);console.log('Patch V10.5.3 carregado');
})();
