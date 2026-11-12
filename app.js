/**
 * ESTÚDIO 60 DIAS DE FOGO
 * Arquitetura de Direção IA (Gemini API) + Fichas Visuais e Storyboard Interativo
 */

// 1. ELENCO FIXO (Identidade Visual Preservada)
const DEFAULT_CHARACTERS = [
  { id: 'taina', name: 'Tainá Rocha', role: 'Protagonista / Cozinheira', visualLock: 'Tainá Rocha, jovem cozinheira, avental característico, traços fixos oficiais', referenceImage: null },
  { id: 'lolo', name: 'Heloísa “Lolô” Barreto', role: 'Rival / Provocadora', visualLock: 'Heloísa Lolô Barreto, postura confiante e irônica, visual oficial', referenceImage: null },
  { id: 'armando', name: 'Chef Armando Vidal', role: 'Mentor / Jurado Exigente', visualLock: 'Chef Armando Vidal, dólmã profissional impecável, expressão rigorosa', referenceImage: null },
  { id: 'beto', name: 'Beto Nunes', role: 'Competidor / Aliado', visualLock: 'Beto Nunes, estilo casual de cozinha, traços oficiais', referenceImage: null },
  { id: 'zelia', name: 'Dona Zélia', role: 'Veterana / Sabedoria Culinária', visualLock: 'Dona Zélia, senhora experiente, olhar acolhedor e firme', referenceImage: null }
];

// Estado Global
let characters = JSON.parse(localStorage.getItem('fogo_characters')) || DEFAULT_CHARACTERS;
let historyItems = JSON.parse(localStorage.getItem('fogo_history')) || [];
let geminiApiKey = localStorage.getItem('fogo_gemini_key') || '';

let currentScript = null;
let isPlaying = false;
let animationFrameId = null;
let storyboardStartTime = 0;
let lastSpokenIndex = -1;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  renderCharacters();
  renderHistory();
  bindEvents();
});

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

function bindEvents() {
  // Exemplo rápido
  document.getElementById('btnLoadExample').addEventListener('click', () => {
    document.getElementById('scenePrompt').value =
      'Tainá está preparando uma panela na cozinha. Lolô entra, começa a provocar Tainá e as duas discutem. Tainá fica nervosa, mexe a panela e responde. Lolô aponta para ela e sai da cozinha. A câmera termina em um close no rosto de Tainá.';
  });

  // Modal de Chave de API
  document.getElementById('btnApiConfig').addEventListener('click', () => {
    document.getElementById('geminiApiKeyInput').value = geminiApiKey;
    document.getElementById('apiModal').classList.remove('hidden');
  });
  document.getElementById('btnCloseModal').addEventListener('click', () => {
    document.getElementById('apiModal').classList.add('hidden');
  });
  document.getElementById('btnSaveApi').addEventListener('click', () => {
    geminiApiKey = document.getElementById('geminiApiKeyInput').value.trim();
    localStorage.setItem('fogo_gemini_key', geminiApiKey);
    document.getElementById('apiModal').classList.add('hidden');
    alert('Chave de API salva com segurança no seu navegador!');
  });

  // Botão Gerar Roteiro / Direção
  document.getElementById('btnGenerate').addEventListener('click', handleGenerateStoryboard);

  // Player de Storyboard
  document.getElementById('btnPlayStoryboard').addEventListener('click', toggleStoryboardPlay);
  document.getElementById('btnExportJson').addEventListener('click', exportStoryboardJson);

  // Limpar Histórico
  document.getElementById('btnClearHistory').addEventListener('click', () => {
    historyItems = [];
    localStorage.setItem('fogo_history', JSON.stringify(historyItems));
    renderHistory();
  });
}

// 2. BIBLIOTECA DE PERSONAGENS & FICHAS VISUAIS
function renderCharacters() {
  const grid = document.getElementById('charactersGrid');
  grid.innerHTML = '';

  characters.forEach((char, index) => {
    const card = document.createElement('div');
    card.className = 'char-card';

    const imgHtml = char.referenceImage
      ? `<img src="${char.referenceImage}" alt="${char.name}" />`
      : `<span class="muted" style="text-align:center; padding:10px;">Sem ficha visual (PNG/JPG)</span>`;

    card.innerHTML = `
      <span class="char-badge">${char.referenceImage ? '🔒 Ficha Travada' : '⚠️ Pendente'}</span>
      <div class="char-avatar">${imgHtml}</div>
      <div>
        <strong>${char.name}</strong>
        <p class="muted" style="font-size:0.8rem;">${char.role}</p>
      </div>
      <label class="btn-secondary" style="text-align:center; display:block; cursor:pointer;">
        📁 Importar Ficha Oficial
        <input type="file" accept="image/*" data-index="${index}" class="upload-char-input" hidden />
      </label>
    `;
    grid.appendChild(card);
  });

  document.querySelectorAll('.upload-char-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = e.target.dataset.index;
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        characters[idx].referenceImage = reader.result;
        localStorage.setItem('fogo_characters', JSON.stringify(characters));
        renderCharacters();
      };
      reader.readAsDataURL(file);
    });
  });
}

// 3. PIPELINE DE DIRECIONAMENTO COM GEMINI API (REAL E ATUALIZADO)
async function handleGenerateStoryboard() {
  const promptText = document.getElementById('scenePrompt').value.trim();
  if (!promptText) {
    alert('Escreva um comando descrevendo a cena.');
    return;
  }

  const duration = parseInt(document.getElementById('videoDuration').value, 10);
  const quality = document.getElementById('videoQuality').value;
  const autoDialogues = document.getElementById('autoDialogues').checked;

  const btnGenerate = document.getElementById('btnGenerate');
  btnGenerate.disabled = true;
  showPipelineProgress(true);
  clearLogs();

  try {
    updateProgress(25, 'Conectando ao Diretor de IA (Gemini 3.8 Flash)...');
    addLog('Enviando prompt e fichas do elenco para o modelo...');

    let storyboardData;

    if (geminiApiKey) {
      storyboardData = await callGeminiApiDirector(promptText, duration, autoDialogues);
      addLog('✅ Roteiro técnico estruturado com sucesso pela IA do Gemini.');
    } else {
      addLog('⚠️ Nenhuma chave de API configurada. Usando gerador estruturado interno...');
      await sleep(800);
      storyboardData = generateFallbackStoryboard(promptText, duration);
      addLog('💡 Dica: Clique em "⚙️ Chave de API" no topo para conectar sua chave gratuita do Gemini.');
    }

    // Vincular elenco e imagens de referência
    updateProgress(75, 'Vinculando identidades visuais dos 5 personagens...');
    storyboardData.scenes = storyboardData.scenes.map(scene => {
      const match = characters.find(c =>
        scene.character.toLowerCase().includes(c.id) ||
        c.name.toLowerCase().includes(scene.character.toLowerCase())
      ) || characters[0];

      return {
        ...scene,
        characterObj: match
      };
    });

    updateProgress(100, 'Storyboard gerado com sucesso!');
    addLog(`🎬 Roteiro pronto (${quality} • ${duration}s).`);

    currentScript = {
      id: Date.now(),
      prompt: promptText,
      duration,
      quality,
      createdAt: new Date().toLocaleString('pt-BR'),
      ...storyboardData
    };

    saveToHistory(currentScript);
    renderScriptTimeline(currentScript);
    startStoryboardPreview(currentScript);

    document.getElementById('previewBadge').textContent = `${quality} • Storyboard Pronto`;
    document.getElementById('btnPlayStoryboard').disabled = false;
    document.getElementById('btnExportJson').disabled = false;

  } catch (err) {
    console.error(err);
    addLog(`❌ Erro: ${err.message}`);
    alert(`Erro ao processar com a API do Gemini: ${err.message}`);
  } finally {
    btnGenerate.disabled = false;
  }
}

// Chamada Oficial via Fetch para a API do Gemini (Modelo Atualizado: gemini-3.8-flash)
async function callGeminiApiDirector(promptText, totalDuration, autoDialogues) {
  const elencoStr = characters.map(c => `${c.name} (id: ${c.id}, Regra visual: ${c.visualLock})`).join('; ');

  const systemPrompt = `
Você é o Diretor de Animação sênior da série "60 Dias de Fogo".
Transforme o comando do usuário em um JSON estrito decupando a cena em planos sequenciais que somem exatamente ${totalDuration} segundos.
Elenco oficial e regras de identidade: ${elencoStr}.
Regras:
- Crie diálogos naturais em português se autoDialogues=${autoDialogues}.
- Especifique movimentos corporais, expressão facial, enquadramento de câmera e efeito sonoro.
Retorne APENAS um objeto JSON válido (sem markdown ou texto extra) com a seguinte estrutura exata:
{
  "title": "Título resumido da cena",
  "scenes": [
    {
      "durationSec": 5,
      "character": "taina",
      "camera": "Plano Médio 9:16",
      "bodyAction": "Descrição do movimento corporal natural",
      "facialExpression": "Expressão facial e piscadas",
      "dialogue": "Fala exata do personagem (ou vazio se for só ação)",
      "sfx": "Efeito sonoro"
    }
  ]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nCOMANDO DO USUÁRIO: "${promptText}"` }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    }
  );

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error?.message || 'Falha na requisição da API Gemini.');
  }

  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;
  return JSON.parse(rawText);
}

// Fallback caso não haja chave inserida
function generateFallbackStoryboard(promptText, totalDuration) {
  const pSec = Math.max(4, Math.floor(totalDuration / 3));
  return {
    title: 'Cena Gerada — 60 Dias de Fogo',
    scenes: [
      {
        durationSec: pSec,
        character: 'taina',
        camera: 'Plano Médio (9:16)',
        bodyAction: 'Prepara os ingredientes na bancada com postura firme',
        facialExpression: 'Concentrada, olhar determinado',
        dialogue: 'Preciso garantir que o ponto esteja perfeito.',
        sfx: 'Som de utensílios de cozinha'
      },
      {
        durationSec: pSec,
        character: 'lolo',
        camera: 'Corte lateral dinâmico',
        bodyAction: 'Entra em cena cruzando os braços com ironia',
        facialExpression: 'Sorriso debochado, sobrancelha erguida',
        dialogue: 'Tem certeza de que vai dar conta disso sozinha?',
        sfx: 'Passos firmes'
      },
      {
        durationSec: totalDuration - (pSec * 2),
        character: 'taina',
        camera: 'Close-up no rosto',
        bodyAction: 'Vira o rosto rapidamente com expressão séria',
        facialExpression: 'Séria e focada',
        dialogue: 'Presta atenção na sua própria bancada.',
        sfx: 'Trilha dramática'
      }
    ]
  };
}

// 4. PRÉ-VISUALIZAÇÃO DE STORYBOARD ANIMADO & SÍNTESE DE VOZ (Navegador)
function startStoryboardPreview(scriptData) {
  document.getElementById('emptyViewport').classList.add('hidden');
  isPlaying = true;
  storyboardStartTime = performance.now();
  lastSpokenIndex = -1;
  document.getElementById('btnPlayStoryboard').textContent = '⏸️ Pausar Storyboard';

  runStoryboardLoop(scriptData);
}

function runStoryboardLoop(scriptData) {
  if (!isPlaying) return;

  const canvas = document.getElementById('previewCanvas');
  const ctx = canvas.getContext('2d');
  const elapsed = (performance.now() - storyboardStartTime) / 1000;

  // Encontrar cena ativa
  let acc = 0;
  let activeScene = scriptData.scenes[scriptData.scenes.length - 1];
  let activeIndex = scriptData.scenes.length - 1;

  for (let i = 0; i < scriptData.scenes.length; i++) {
    if (elapsed >= acc && elapsed < acc + scriptData.scenes[i].durationSec) {
      activeScene = scriptData.scenes[i];
      activeIndex = i;
      break;
    }
    acc += scriptData.scenes[i].durationSec;
  }

  // Disparar voz neural nativa na troca de cena
  if (activeIndex !== lastSpokenIndex) {
    lastSpokenIndex = activeIndex;
    speakDialogue(activeScene);
  }

  // Reiniciar loop se acabar
  if (elapsed >= scriptData.duration) {
    storyboardStartTime = performance.now();
    lastSpokenIndex = -1;
  }

  drawStoryboardFrame(ctx, canvas.width, canvas.height, activeScene, elapsed);
  animationFrameId = requestAnimationFrame(() => runStoryboardLoop(scriptData));
}

function drawStoryboardFrame(ctx, w, h, scene, time) {
  // Fundo do estúdio
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#161b22');
  grad.addColorStop(1, '#0b0e14');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Animação leve de câmera (Zoom in/out simulado)
  const zoom = 1.0 + Math.sin(time * 1.5) * 0.025;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-w / 2, -h / 2);

  // Renderizar imagem de referência oficial se houver, senão placeholder estilizado
  const char = scene.characterObj;
  if (char && char.referenceImage) {
    const img = new Image();
    img.src = char.referenceImage;
    if (img.complete) {
      ctx.drawImage(img, 70, 160, 400, 540);
    }
  } else {
    ctx.fillStyle = '#1f293d';
    ctx.beginPath();
    ctx.roundRect(60, 180, 420, 480, 20);
    ctx.fill();

    ctx.fillStyle = '#ff5722';
    ctx.font = 'bold 24px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(char ? char.name : scene.character, w / 2, 410);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Inter';
    ctx.fillText('Ficha visual não importada', w / 2, 445);
    ctx.fillText('(Acesse a aba Elenco para carregar)', w / 2, 470);
  }

  ctx.restore();

  // HUD de Direção (Câmera e Ação)
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(16, 16, w - 32, 75);

  ctx.fillStyle = '#ff5722';
  ctx.font = 'bold 14px Inter';
  ctx.textAlign = 'left';
  ctx.fillText(`🎥 ${scene.camera}`, 28, 40);

  ctx.fillStyle = '#e5e7eb';
  ctx.font = '13px Inter';
  ctx.fillText(`🏃 ${scene.bodyAction.slice(0, 50)}...`, 28, 64);

  // Legenda de Diálogo
  if (scene.dialogue) {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.beginPath();
    ctx.roundRect(20, h - 170, w - 40, 110, 12);
    ctx.fill();

    ctx.fillStyle = '#ff9800';
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(char ? char.name.toUpperCase() : '', w / 2, h - 140);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Inter';
    wrapText(ctx, `"${scene.dialogue}"`, w / 2, h - 110, w - 60, 24);
  }
}

function speakDialogue(scene) {
  if (!scene || !scene.dialogue || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(scene.dialogue);
  utt.lang = 'pt-BR';
  utt.rate = 1.05;
  window.speechSynthesis.speak(utt);
}

function toggleStoryboardPlay() {
  if (!currentScript) return;
  isPlaying = !isPlaying;
  document.getElementById('btnPlayStoryboard').textContent = isPlaying ? '⏸️ Pausar Storyboard' : '▶️ Reproduzir Storyboard & Voz';
  if (isPlaying) {
    storyboardStartTime = performance.now();
    runStoryboardLoop(currentScript);
  } else {
    window.speechSynthesis.cancel();
    cancelAnimationFrame(animationFrameId);
  }
}

function exportStoryboardJson() {
  if (!currentScript) return;
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentScript, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `storyboard-60-dias-de-fogo-${Date.now()}.json`);
  dlAnchor.click();
}

// 5. HISTÓRICO E ROTEIROS
function renderScriptTimeline(script) {
  const container = document.getElementById('scriptContainer');
  const timeline = document.getElementById('scriptTimeline');
  container.classList.remove('hidden');
  timeline.innerHTML = '';

  script.scenes.forEach((sc, idx) => {
    const div = document.createElement('div');
    div.className = 'scene-card';
    div.innerHTML = `
      <div><strong>Cena ${idx + 1} (${sc.durationSec}s) — ${sc.characterObj ? sc.characterObj.name : sc.character}</strong></div>
      <div class="muted">🎥 ${sc.camera} | 😊 ${sc.facialExpression}</div>
      <div>🏃 ${sc.bodyAction}</div>
      ${sc.dialogue ? `<div style="color:#ff9800; margin-top:4px;">💬 "${sc.dialogue}"</div>` : ''}
    `;
    timeline.appendChild(div);
  });
}

function saveToHistory(item) {
  historyItems.unshift(item);
  if (historyItems.length > 15) historyItems.pop();
  localStorage.setItem('fogo_history', JSON.stringify(historyItems));
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('historyList');
  if (!historyItems.length) {
    list.innerHTML = '<p class="muted">Nenhum roteiro gerado ainda.</p>';
    return;
  }
  list.innerHTML = historyItems.map(item => `
    <div class="history-item">
      <div>
        <strong>${item.title || 'Roteiro de Cena'}</strong>
        <p class="muted" style="font-size:0.8rem;">"${item.prompt.slice(0, 80)}..."</p>
        <span style="font-size:0.75rem; color:#10b981;">${item.duration}s • ${item.createdAt}</span>
      </div>
    </div>
  `).join('');
}

// Utilitários
function showPipelineProgress(show) {
  document.getElementById('pipelineStatus').classList.toggle('hidden', !show);
}
function updateProgress(percent, text) {
  document.getElementById('progressFill').style.width = `${percent}%`;
  document.getElementById('pipelinePercent').textContent = `${percent}%`;
  document.getElementById('pipelineStepText').textContent = text;
}
function addLog(msg) {
  const li = document.createElement('li');
  li.textContent = msg;
  document.getElementById('pipelineLogs').appendChild(li);
}
function clearLogs() {
  document.getElementById('pipelineLogs').innerHTML = '';
}
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}
