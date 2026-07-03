// PLAYBOOK VENDAS — HOTFIX V10.5.1
// Corrige exclusão com action=deleteCall e restaura a área de gráficos no Cockpit.
// Deve ser carregado APÓS scripts/app-v10.5.js.
(function () {
  window.PLAYBOOK_VERSION = '10.5.1';

  function setBadge() {
    try {
      let badge = document.querySelector('.version-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'version-badge';
        document.body.appendChild(badge);
      }
      badge.textContent = 'V10.5.1';
    } catch (err) {}
  }

  function setSync(status) {
    try {
      syncStatus = status;
      if (typeof updateSyncBadge === 'function') updateSyncBadge();
    } catch (err) {}
  }

  function getCloserNameSafe() {
    try { return typeof CLOSER_NAME !== 'undefined' ? CLOSER_NAME : 'Eduardo'; }
    catch (err) { return 'Eduardo'; }
  }

  function getCallName(id) {
    try {
      const call = (state && Array.isArray(state.calls)) ? state.calls.find(c => c.id === id) : null;
      return call && call.leadName ? call.leadName : 'esta reunião';
    } catch (err) {
      return 'esta reunião';
    }
  }

  function formatDateInputSafe(value) {
    try {
      if (typeof dateInputValue === 'function') return dateInputValue(value);
      if (!value) return '';
      const s = String(value);
      const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      if (br) return `${br[3]}-${br[2]}-${br[1]}`;
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return '';
    } catch (err) { return ''; }
  }

  function getFilteredCallsSafe() {
    try {
      let calls = Array.isArray(state.calls) ? state.calls.slice() : [];
      if (typeof ensureCallModel === 'function') calls = calls.map(ensureCallModel);

      const start = sessionStorage.getItem('fil-start') || '';
      const end = sessionStorage.getItem('fil-end') || '';
      if (start || end) {
        calls = calls.filter(c => {
          const dv = formatDateInputSafe(c.date);
          if (!dv) return true;
          const t = new Date(dv + 'T12:00:00').getTime();
          return t >= (start ? new Date(start + 'T00:00:00').getTime() : 0) &&
                 t <= (end ? new Date(end + 'T23:59:59').getTime() : Infinity);
        });
      }

      const q = (sessionStorage.getItem('call-search') || '').toLowerCase();
      if (q) {
        calls = calls.filter(c =>
          String(c.leadName || '').toLowerCase().includes(q) ||
          String(c.sdrName || '').toLowerCase().includes(q) ||
          String(c.status || '').toLowerCase().includes(q)
        );
      }
      return calls;
    } catch (err) {
      console.warn('Falha ao montar dados dos gráficos V10.5.1:', err);
      return [];
    }
  }

  function mkLocal(tag, className, html) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html !== undefined) el.innerHTML = html;
    return el;
  }

  function restoreCharts() {
    try {
      const content = document.getElementById('content');
      if (!content) return;
      if (state.active !== 'dashboard') return;
      if (document.getElementById('chartStatus')) return;

      const historyPanel = content.querySelector('.history-panel');
      if (!historyPanel) return;

      const calls = getFilteredCallsSafe();
      if (!calls.length) return;

      const chartsBlock = document.createElement('div');
      chartsBlock.id = 'charts-restored-v10-5-1';

      const chartsRow = mkLocal('div', 'db-charts');
      [
        ['chartStatus', 'Distribuição dos status'],
        ['chartSdr', 'Volume comercial por SDR'],
        ['chartConversions', 'Conversões do funil']
      ].forEach(([id, title]) => {
        const cont = mkLocal('div', 'chart-container');
        cont.appendChild(mkLocal('div', 'chart-title', title));
        const wrap = mkLocal('div', '');
        wrap.style = 'position:relative;height:180px';
        const canvas = document.createElement('canvas');
        canvas.id = id;
        wrap.appendChild(canvas);
        cont.appendChild(wrap);
        chartsRow.appendChild(cont);
      });
      chartsBlock.appendChild(chartsRow);

      const evo = mkLocal('div', 'chart-container');
      evo.style.marginBottom = '28px';
      evo.appendChild(mkLocal('div', 'chart-title', 'Evolução mensal — aderência ao playbook x conversão'));
      const evoWrap = mkLocal('div', '');
      evoWrap.style = 'position:relative;height:220px';
      const evoCanvas = document.createElement('canvas');
      evoCanvas.id = 'chartEvolution';
      evoWrap.appendChild(evoCanvas);
      evo.appendChild(evoWrap);
      evo.appendChild(mkLocal('div', 'evo-note', 'Aderência = média dos scorecards preenchidos. Demos realizadas excluem No-show e reuniões em andamento.'));
      chartsBlock.appendChild(evo);

      content.insertBefore(chartsBlock, historyPanel);

      if (typeof buildCharts === 'function') {
        setTimeout(() => buildCharts(calls), 80);
      } else {
        console.warn('buildCharts não encontrado; containers dos gráficos foram restaurados, mas os gráficos não puderam ser renderizados.');
      }
    } catch (err) {
      console.warn('Não foi possível restaurar os gráficos V10.5.1:', err);
    }
  }

  // Corrige exclusão: usa deleteCall no backend e só remove localmente após OK.
  window.deleteCall = function deleteCallV1051(id) {
    const name = getCallName(id);
    const ok = confirm(
      `Deseja apagar a reunião de ${name}?\n\n` +
      'A reunião será ocultada do histórico e marcada como excluída na planilha.'
    );
    if (!ok) return;

    let token = '';
    try { token = getAccessToken(); } catch (err) { token = ''; }

    if (!token) {
      alert('Chave de acesso não encontrada. Faça login novamente antes de apagar a reunião.');
      try { resetAccessToken(); } catch (err) {}
      return;
    }

    setSync('saving');

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'deleteCall',
        token: token,
        closer: getCloserNameSafe(),
        id: id
      })
    })
      .then(r => r.json())
      .then(data => {
        if (!data || data.ok === false) {
          throw new Error(data && data.error ? data.error : 'delete_failed');
        }

        state.calls = (Array.isArray(state.calls) ? state.calls : []).filter(c => c.id !== id);
        if (state.activeCallId === id) state.activeCallId = null;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setSync('saved');
        if (typeof render === 'function') render();
        console.log('Reunião apagada e sincronizada V10.5.1:', data);
      })
      .catch(err => {
        console.error('Erro ao apagar reunião V10.5.1:', err);
        setSync('error');
        if (String(err.message).includes('unauthorized')) {
          alert('Chave inválida ou sessão expirada. Faça login novamente.');
          try { resetAccessToken(); } catch (e) {}
        } else {
          alert('Não foi possível apagar a reunião na nuvem. Tente novamente antes de limpar o cache.');
        }
      });
  };

  // Envolve render para reinserir gráficos sempre que o dashboard for renderizado.
  try {
    if (typeof window.render === 'function' && !window.__renderWrappedV1051) {
      const originalRender = window.render;
      window.render = function renderWrappedV1051() {
        const result = originalRender.apply(this, arguments);
        setBadge();
        setTimeout(restoreCharts, 90);
        return result;
      };
      window.__renderWrappedV1051 = true;
    }
  } catch (err) {
    console.warn('Não foi possível envolver render V10.5.1:', err);
  }

  function boot() {
    setBadge();
    setTimeout(restoreCharts, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  console.log('Hotfix Playbook V10.5.1 carregado: deleteCall + gráficos restaurados.');
})();
