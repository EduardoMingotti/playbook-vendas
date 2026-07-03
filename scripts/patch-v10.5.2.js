// PLAYBOOK VENDAS — PATCH V10.5.2
// Objetivo: corrigir deleteCall de verdade, restaurar gráficos e mostrar badge V10.5.2.
// Carregar depois de scripts/app-v10.5.js.
(function () {
  window.PLAYBOOK_VERSION = '10.5.2';

  function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }

  function setBadge() {
    let badge = document.querySelector('.version-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'version-badge';
      document.body.appendChild(badge);
    }
    badge.textContent = 'V10.5.2';
  }

  function setSync(status) {
    safe(function () {
      syncStatus = status;
      if (typeof updateSyncBadge === 'function') updateSyncBadge();
    });
  }

  function closerName() {
    return safe(function () { return CLOSER_NAME || 'Eduardo'; }, 'Eduardo');
  }

  function getTokenSafe() {
    return safe(function () { return getAccessToken(); }, '');
  }

  function normalizeStatusLocal(str) {
    return String(str || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim();
  }

  function isInProgressLocal(call) {
    return normalizeStatusLocal(call && call.status) === 'em andamento';
  }

  function statusLabelLocal(status) {
    var s = normalizeStatusLocal(status);
    if (s === 'venda') return 'Fechado';
    if (s === 'follow-up') return 'Follow-up';
    if (s === 'no-show') return 'No-show';
    if (s === 'perdido') return 'Perdido';
    if (s === 'em andamento') return 'Em andamento';
    return status || '—';
  }

  function callById(id) {
    return safe(function () {
      return (Array.isArray(state.calls) ? state.calls : []).find(function (c) { return c.id === id; });
    }, null);
  }

  function callName(id) {
    var call = callById(id);
    return call && call.leadName ? call.leadName : 'esta reunião';
  }

  function localStorageSave() {
    safe(function () { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); });
  }

  // 1) CORREÇÃO CRÍTICA: deleteCall precisa chamar action=deleteCall, não saveCalls.
  function deleteCallV1052(id) {
    var name = callName(id);
    var ok = confirm(
      'Deseja apagar a reunião de ' + name + '?\n\n' +
      'A reunião será ocultada do histórico e marcada como excluída na planilha.'
    );
    if (!ok) return;

    var token = getTokenSafe();
    if (!token) {
      alert('Chave de acesso não encontrada. Faça login novamente antes de apagar a reunião.');
      safe(function () { resetAccessToken(); });
      return;
    }

    setSync('saving');

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'deleteCall',
        token: token,
        closer: closerName(),
        id: id
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.ok === false) {
          throw new Error(data && data.error ? data.error : 'delete_failed');
        }
        state.calls = (Array.isArray(state.calls) ? state.calls : []).filter(function (c) { return c.id !== id; });
        if (state.activeCallId === id) state.activeCallId = null;
        localStorageSave();
        setSync('saved');
        if (typeof render === 'function') render();
        console.log('V10.5.2 — reunião apagada e sincronizada:', data);
      })
      .catch(function (err) {
        console.error('V10.5.2 — erro ao apagar reunião:', err);
        setSync('error');
        if (String(err.message).includes('unauthorized')) {
          alert('Chave inválida ou sessão expirada. Faça login novamente.');
          safe(function () { resetAccessToken(); });
        } else {
          alert('Não foi possível apagar a reunião na nuvem. Tente novamente antes de limpar dados locais.');
        }
      });
  }

  // Atribuição direta e via window para cobrir os dois cenários de escopo global.
  safe(function () { deleteCall = deleteCallV1052; });
  window.deleteCall = deleteCallV1052;

  function createActionMenuV1052(call) {
    if (typeof ensureCallModel === 'function') call = ensureCallModel(call);
    var wrap = document.createElement('div');
    wrap.className = 'action-menu-wrap';
    var btn = document.createElement('button');
    btn.className = 'action-menu-btn';
    btn.textContent = '⋮';
    btn.onclick = function (e) {
      e.stopPropagation();
      document.querySelectorAll('.action-menu').forEach(function (m) { m.remove(); });
      var menu = document.createElement('div');
      menu.className = 'action-menu';
      var items = [];
      if (isInProgressLocal(call)) {
        items.push(['Retomar reunião', function () {
          state.activeCallId = call.id;
          state.active = 1;
          localStorageSave();
          if (typeof render === 'function') render();
          window.scrollTo(0, 0);
        }]);
      }
      items.push(
        ['Ver detalhes', function () { if (typeof openDetailsModal === 'function') openDetailsModal(call.id); }],
        ['Revisar checklist', function () { if (typeof openChecklistReviewModal === 'function') openChecklistReviewModal(call.id); }],
        ['Editar dados', function () { if (typeof openEditCallModal === 'function') openEditCallModal(call.id); }],
        ['Atualizar status', function () { if (typeof openStatusModal === 'function') openStatusModal(call.id); }],
        ['Adicionar nova reunião', function () { if (typeof addMeetingFromCall === 'function') addMeetingFromCall(call.id); }],
        ['Apagar reunião', function () { deleteCallV1052(call.id); }]
      );
      items.forEach(function (item) {
        var b = document.createElement('button');
        b.textContent = item[0];
        b.onclick = function (ev) {
          ev.stopPropagation();
          document.querySelectorAll('.action-menu').forEach(function (m) { m.remove(); });
          item[1]();
        };
        menu.appendChild(b);
      });
      wrap.appendChild(menu);
    };
    wrap.appendChild(btn);
    return wrap;
  }

  safe(function () { createActionMenu = createActionMenuV1052; });
  window.createActionMenu = createActionMenuV1052;

  function dateInputSafe(value) {
    if (typeof dateInputValue === 'function') return dateInputValue(value);
    if (!value) return '';
    var s = String(value);
    var br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) return br[3] + '-' + br[2] + '-' + br[1];
    var d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return '';
  }

  function filteredCallsForCharts() {
    var calls = safe(function () { return Array.isArray(state.calls) ? state.calls.slice() : []; }, []);
    if (typeof ensureCallModel === 'function') calls = calls.map(ensureCallModel);
    var start = sessionStorage.getItem('fil-start') || '';
    var end = sessionStorage.getItem('fil-end') || '';
    if (start || end) {
      calls = calls.filter(function (c) {
        var dv = dateInputSafe(c.date);
        if (!dv) return true;
        var t = new Date(dv + 'T12:00:00').getTime();
        return t >= (start ? new Date(start + 'T00:00:00').getTime() : 0) &&
               t <= (end ? new Date(end + 'T23:59:59').getTime() : Infinity);
      });
    }
    var q = (sessionStorage.getItem('call-search') || '').toLowerCase();
    if (q) {
      calls = calls.filter(function (c) {
        return String(c.leadName || '').toLowerCase().includes(q) ||
               String(c.sdrName || '').toLowerCase().includes(q) ||
               String(c.status || '').toLowerCase().includes(q);
      });
    }
    return calls;
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  // 2) RESTAURA GRÁFICOS: reinsere containers e chama buildCharts.
  function restoreChartsV1052() {
    var content = document.getElementById('content');
    if (!content) return;
    if (!state || state.active !== 'dashboard') return;
    if (document.getElementById('chartStatus')) return;
    var historyPanel = content.querySelector('.history-panel');
    if (!historyPanel) return;
    var calls = filteredCallsForCharts();
    if (!calls.length) return;

    var block = document.createElement('div');
    block.id = 'charts-restored-v10-5-2';

    var row = el('div', 'db-charts');
    [
      ['chartStatus', 'Distribuição dos status'],
      ['chartSdr', 'Volume comercial por SDR'],
      ['chartConversions', 'Conversões do funil']
    ].forEach(function (it) {
      var cont = el('div', 'chart-container');
      cont.appendChild(el('div', 'chart-title', it[1]));
      var w = el('div', '');
      w.style = 'position:relative;height:180px';
      var cv = document.createElement('canvas');
      cv.id = it[0];
      w.appendChild(cv);
      cont.appendChild(w);
      row.appendChild(cont);
    });
    block.appendChild(row);

    var evo = el('div', 'chart-container');
    evo.style.marginBottom = '28px';
    evo.appendChild(el('div', 'chart-title', 'Evolução mensal — aderência ao playbook x conversão'));
    var ew = el('div', '');
    ew.style = 'position:relative;height:220px';
    var ec = document.createElement('canvas');
    ec.id = 'chartEvolution';
    ew.appendChild(ec);
    evo.appendChild(ew);
    evo.appendChild(el('div', 'evo-note', 'Aderência = média dos scorecards preenchidos. Demos realizadas excluem No-show e reuniões em andamento.'));
    block.appendChild(evo);

    content.insertBefore(block, historyPanel);
    if (typeof buildCharts === 'function') {
      setTimeout(function () { buildCharts(calls); }, 80);
    } else {
      console.warn('V10.5.2: buildCharts não encontrado. Containers restaurados, mas gráficos não renderizados.');
    }
  }

  // Envolve render e também usa polling curto para garantir que gráficos apareçam.
  safe(function () {
    if (typeof render === 'function' && !window.__renderWrappedV1052) {
      var originalRender = render;
      render = function renderWrappedV1052() {
        var result = originalRender.apply(this, arguments);
        setBadge();
        setTimeout(restoreChartsV1052, 120);
        return result;
      };
      window.render = render;
      window.__renderWrappedV1052 = true;
    }
  });

  var tries = 0;
  var timer = setInterval(function () {
    setBadge();
    restoreChartsV1052();
    tries += 1;
    if (tries > 20) clearInterval(timer);
  }, 300);

  setBadge();
  setTimeout(restoreChartsV1052, 200);
  console.log('Patch Playbook V10.5.2 carregado: deleteCall + gráficos + badge.');
})();
