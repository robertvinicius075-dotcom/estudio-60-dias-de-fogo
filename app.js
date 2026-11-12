/**
 * ESTÚDIO 60 DIAS DE FOGO
 * Arquitetura de Direção IA (Gemini 1.5 Flash Definitivo & Blindado)
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

// Inicialização segura garantida após o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
  console.log("Estúdio 60 Dias de Fogo inicializado com sucesso!");
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
  const btnExample = document.getElementById('btnLoadExample');
  if (btnExample) {
    btnExample.addEventListener('click', () => {
      document.getElementById('scenePrompt').value =
        'Tainá está preparando uma panela na cozinha. Lolô entra, começa a provocar Tainá e as duas discutem. Tainá fica nervosa, mexe a panela e responde. Lolô aponta para ela e sai da cozinha. A câmera termina em um close no rosto de Tainá.';
    });
  }

  // Modal de Chave de API
  const btnApiConfig = document.getElementById('btnApiConfig');
  if (btnApiConfig) {
    btnApiConfig.addEventListener('click', () => {
      document.getElementById('geminiApiKeyInput').value = geminiApiKey;
      document.getElementById('apiModal').classList.remove('hidden');
    });
  }

  const btnCloseModal = document.getElementById('btnCloseModal');
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
      document.getElementById('apiModal').classList.add('hidden');
    });
  }

  const btnSaveApi = document.getElementById('btnSaveApi');
  if (btnSaveApi) {
    btnSaveApi.addEventListener('click', () => {
      geminiApiKey = document.getElementById('geminiApiKeyInput').value.trim();
      localStorage.setItem('fogo_gemini_key', geminiApiKey);
      document.getElementById('apiModal').classList.add('hidden');
      alert('Chave de API salva com segurança no seu navegador!');
    });
  }

  // Botão Principal Gerar Roteiro / Direção (Garantido)
  const btnGenerate = document.getElementById('btnGenerate');
  if (btnGenerate) {
    btnGenerate.addEventListener('click', () => {
      console.log("Botão Gerar clicado!");
      handleGenerateStoryboard();
    });
  } else {
    console.error("Erro crítico: Botão btnGenerate não encontrado no HTML!");
  }

  // Player de Storyboard
  const btnPlay = document.getElementById('btnPlayStoryboard');
  if (btnPlay) {
    btnPlay.addEventListener('click', toggleStoryboardPlay);
  }

  const btnExport = document.getElementById('btnExportJson');
  if (btnExport) {
    btnExport.addEventListener('click', exportStoryboardJson);
  }

  // Limpar Histórico
  const btnClear = document.getElementById('btnClearHistory');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      historyItems = [];
      localStorage.setItem('fogo_history', JSON.stringify(historyItems));
      renderHistory();
    });
  }
}

// 2. BIBLIOTECA DE PERSONAGENS & FICHAS VISUAIS
function renderCharacters() {
  const grid = document.getElementById('charactersGrid');
  if (!grid) return;
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

// 3. PIPELINE DE DIRECIONAMENTO COM GEMINI API
async function handleGenerateStoryboard() {
  const promptInput = document.getElementById('scenePrompt');
  if (!promptInput) return;
  
  const promptText = promptInput.value.trim();
  if (!promptText) {
    alert('Por favor, escreva um comando descrevendo a cena.');
    return;
  }

  const duration = parseInt(document.getElementById('videoDuration').value, 10);
  const quality = document.getElementById('videoQuality').value;
  const autoDialogues = document.getElementById('autoDialogues').checked;

  const btnGenerate = document.getElementById('btnGenerate');
  if (btnGenerate) btnGenerate.disabled = true;
  
  showPipelineProgress(true);
  clearLogs();

  try {
    updateProgress(25, 'Conectando ao Diretor de IA (Gemini 1.5 Flash)...');
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

    const badge = document.getElementById('previewBadge');
    if (badge) badge.textContent = `${quality} • Storyboard Pronto`;
    
    const btnPlay = document.getElementById('btnPlayStoryboard');
    if (btnPlay) btnPlay.disabled = false;
    
    const btnExport = document.getElementById('btnExportJson');
    if (btnExport) btnExport.disabled = false;

  } catch (err) {
    console.error(err);
    addLog(`❌ Erro: ${err.message}`);
    alert(`Erro ao processar com a API do Gemini: ${err.message}`);
  } finally {
    if (btnGenerate) btnGenerate.disabled = false;
  }
}

// Chamada Oficial via Fetch para a API do Gemini com tratamento robusto
async function callGeminiApiDirector(promptText, totalDuration, autoDialogues) {
  const elencoStr = characters.map(c => `${c.name} (id: ${c.id}, Regra visual: ${c.visualLock})`).join('; ');

  const systemPrompt = `
Você é o Diretor de Animação sênior da série "60 Dias de Fogo".
Transforme o comando do usuário em um JSON estrito decupando a cena em planos sequenciais que somem exatamente ${totalDuration} segundos.
Elenco oficial e regras de identidade: ${elencoStr}.
Regras:
- Crie diálogos naturais em português se autoDialogues=${autoDialogues}.
- Especifique movimentos corporais, expressão facial, enquadramento de câmera e efeito sonoro.
Retorne APENAS um objeto JSON válido (sem blocos de código markdown ou texto extra) com a seguinte estrutura exata:
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
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
  let rawText = data.candidates[0].content.parts[0].text;
  
  // Limpar marcações de markdown caso o modelo insira
  rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

  return JSON.parse(rawText);
}

// Fallback caso não haja chave inserida
function generateFallbackStoryboard(
