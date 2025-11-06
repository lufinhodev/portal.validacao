// script.js (CORRIGIDO PARA LER DO REALTIME DATABASE)

// =================================================================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// =================================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBknI9FOD29xFbA_tYX75WdrwHyYEHpKaI",
    authDomain: "sistema-staff-gestao.firebaseapp.com",
    databaseURL: "https://sistema-staff-gestao-default-rtdb.firebaseio.com",
    projectId: "sistema-staff-gestao",
    storageBucket: "sistema-staff-gestao.firebasestorage.app",
    messagingSenderId: "624820315750",
    appId: "1:624820315750:web:7272bebd96c3e3e74dafa7",
    measurementId: "G-DLTY20RN9V"
};

// Inicia o Firebase
firebase.initializeApp(firebaseConfig);
// MUDANÇA: Aponta para o Realtime Database
const database = firebase.database(); 

/**
 * Função para buscar os dados do Firebase Realtime Database.
 * @returns {Promise<Array>} Um array com os objetos de assinatura.
 */
async function fetchSignatures() {
    try {
        // MUDANÇA: Lógica de busca para o Realtime Database
        const snapshot = await database.ref('assinaturas').once('value');
        const data = snapshot.val();
        if (data) {
            // O Realtime Database retorna um objeto, nós o convertemos em uma lista
            return Object.values(data);
        }
        return []; // Retorna uma lista vazia se não houver dados
    } catch (error) {
        console.error("Erro ao buscar assinaturas do Realtime Database:", error);
        exibirErroGeral(`Falha ao conectar com o banco de dados: ${error.message}`);
        return [];
    }
}

// O restante do código permanece praticamente o mesmo, pois ele já espera receber uma lista.

document.addEventListener('DOMContentLoaded', async () => {
    const preloader = document.getElementById('preloader');
    const assinaturas = await fetchSignatures();
    
    setTimeout(() => {
        preloader.style.opacity = '0';
        preloader.addEventListener('transitionend', () => preloader.style.display = 'none');
    }, 500);

    setupSecurityListeners();

    if (assinaturas.length === 0 && !document.body.innerHTML.includes('Falha ao conectar')) {
        // Se não houver erro de conexão, mas a lista estiver vazia, mostramos o painel zerado
        showDashboardView([]);
        return;
    }
    
    if (assinaturas.length === 0 && document.body.innerHTML.includes('Falha ao conectar')) {
        return; // Interrompe se houver erro de conexão
    }

    const params = new URLSearchParams(window.location.search);
    const idAssinatura = params.get('id');

    if (idAssinatura) {
        const assinatura = assinaturas.find(a => a.id.replace(/[\s-]/g, '') === idAssinatura.replace(/[\s-]/g, ''));
        if (assinatura) {
            showSignatureView(assinatura);
        } else {
            exibirErro();
        }
    } else {
        showDashboardView(assinaturas);
    }
});

function showSignatureView(assinatura) {
    document.body.classList.add('signature-view-active');
    initPlexusBackground();
    preencherDadosAssinatura(assinatura);
    document.getElementById('container-assinatura').style.display = 'block';
    document.getElementById('lista-assinaturas').style.display = 'none';
}

function showDashboardView(assinaturas) {
    configurarPainelDeAssinaturas(assinaturas);
    const dashboardContainer = document.getElementById('lista-assinaturas');
    dashboardContainer.style.display = 'block';
    dashboardContainer.style.opacity = '1';
}

function preencherDadosAssinatura(assinatura) {
    document.title = `Validação: ${assinatura.id}`;
    document.getElementById('brasao-img').src = assinatura.imagemBrasao || 'brasao.png';
    document.getElementById('signatureId').textContent = assinatura.id;
    document.getElementById('inquerito-ref').textContent = assinatura.inquerito;
    document.getElementById('timestamp-footer').textContent = assinatura.timestamp || 'Data não registrada';

    const listaAutoridadesContainer = document.getElementById('autoridades-lista');
    listaAutoridadesContainer.innerHTML = '';
    if (assinatura.autoridades && assinatura.autoridades.length > 0) {
        assinatura.autoridades.forEach(autoridade => {
            const autoridadeDiv = document.createElement('div');
            autoridadeDiv.style.marginBottom = '10px';
            autoridadeDiv.textContent = `${autoridade.nome}, ${autoridade.cargo}`;
            listaAutoridadesContainer.appendChild(autoridadeDiv);
        });
    } else {
        // Fallback para o caso de não ter a lista de autoridades (compatibilidade)
        listaAutoridadesContainer.innerHTML = `
            <span style="display: block;">${assinatura.nome}</span>
        `;
    }

    const statusBadge = document.getElementById('status-badge');
    const iconValido = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>`;
    const iconExpirado = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

    const status = (assinatura.status || 'válido').toLowerCase();
    if (status === 'válido') {
        statusBadge.className = 'status-badge-dark valido';
        statusBadge.innerHTML = `${iconValido} <span>AUTÊNTICO</span>`;
        statusBadge.style.setProperty('--glow-color', 'rgba(34, 197, 94, 0.3)');
    } else {
        statusBadge.className = 'status-badge-dark expirado';
        statusBadge.innerHTML = `${iconExpirado} <span>EXPIRADO</span>`;
        statusBadge.style.setProperty('--glow-color', 'rgba(239, 68, 68, 0.3)');
    }

    const copyButton = document.getElementById('copy-button');
    copyButton.onclick = () => {
        navigator.clipboard.writeText(assinatura.id);
    };
}

function configurarPainelDeAssinaturas(assinaturas) {
    popularStatCards(assinaturas);
    renderizarTabela(assinaturas);

    const campoBusca = document.getElementById('campo-busca');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    campoBusca.addEventListener('input', () => {
        const termo = campoBusca.value.toLowerCase();
        clearSearchBtn.style.display = termo ? 'block' : 'none';
        
        const resultadosFiltrados = assinaturas.filter(a => 
            a.inquerito.toLowerCase().includes(termo) || 
            (a.nome && a.nome.toLowerCase().includes(termo)) ||
            (a.autoridades && a.autoridades.some(aut => aut.nome.toLowerCase().includes(termo)))
        );
        
        renderizarTabela(resultadosFiltrados);
    });

    clearSearchBtn.addEventListener('click', () => {
        campoBusca.value = '';
        clearSearchBtn.style.display = 'none';
        renderizarTabela(assinaturas);
    });
}

function popularStatCards(assinaturas) {
    const total = assinaturas.length;
    const validas = assinaturas.filter(a => (a.status || 'válido').toLowerCase() === 'válido').length;
    const expiradas = total - validas;
    document.getElementById('total-assinaturas').textContent = total;
    document.getElementById('assinaturas-validas').textContent = validas;
    document.getElementById('assinaturas-expiradas').textContent = expiradas;
}

function renderizarTabela(listaDeAssinaturas) {
    const corpoTabela = document.getElementById('corpo-tabela');
    const noResultsMessage = document.getElementById('no-results-message');
    corpoTabela.innerHTML = '';

    if (listaDeAssinaturas.length === 0) {
        noResultsMessage.style.display = 'flex';
    } else {
        noResultsMessage.style.display = 'none';
        listaDeAssinaturas.forEach(assinatura => {
            const row = document.createElement('tr');
            const status = assinatura.status || 'Válido';
            const statusClass = status.toLowerCase() === 'válido' ? 'valido' : 'expirado';
            
            row.innerHTML = `
                <td data-label="Ref. Processual">${assinatura.inquerito}</td>
                <td data-label="Assinado Por">${assinatura.nome}</td>
                <td data-label="Status"><span class="status-badge ${statusClass}">${status}</span></td>
                <td data-label="Ação"><a href="?id=${assinatura.id.replace(/[\s-]/g, '')}" class="view-link">Visualizar</a></td>
            `;
            corpoTabela.appendChild(row);
        });
    }
}

// Funções de utilidade e efeitos (não precisam de alteração)
function initPlexusBackground() {
    const canvas = document.getElementById('plexus-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let particles = [];
    const particleCount = Math.floor((canvas.width * canvas.height) / 15000);
    const maxDistance = 120;
    class Particle {
        constructor() { this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height; this.vx = Math.random() * 0.4 - 0.2; this.vy = Math.random() * 0.4 - 0.2; this.radius = 1.5; }
        update() { this.x += this.vx; this.y += this.vy; if (this.x < 0 || this.x > canvas.width) this.vx *= -1; if (this.y < 0 || this.y > canvas.height) this.vy *= -1; }
        draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = 'rgba(148, 163, 184, 0.4)'; ctx.fill(); }
    }
    function init() { particles = []; for (let i = 0; i < particleCount; i++) particles.push(new Particle()); }
    function connect() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x; const dy = particles[i].y - particles[j].y; const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < maxDistance) { ctx.beginPath(); ctx.strokeStyle = `rgba(148, 163, 184, ${1 - distance / maxDistance})`; ctx.lineWidth = 0.5; ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke(); }
            }
        }
    }
    function animate() { ctx.clearRect(0, 0, canvas.width, canvas.height); particles.forEach(p => { p.update(); p.draw(); }); connect(); requestAnimationFrame(animate); }
    window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; init(); });
    init();
    animate();
}

function setupSecurityListeners() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => { if (e.ctrlKey && ['s', 'u', 'c'].includes(e.key.toLowerCase()) || e.key === 'F12') e.preventDefault(); });
}

function exibirErro() {
    document.body.classList.remove('signature-view-active');
    const container = document.getElementById('container-principal');
    container.innerHTML = `<div class="dashboard-container"><div class="content-card" style="padding: 40px; text-align: center;"><h2 style="color: var(--dark-text);">Assinatura Não Encontrada</h2><p>O identificador fornecido na URL não corresponde a nenhuma assinatura válida. Verifique o link e tente novamente.</p><a href="/" style="font-weight: bold; color: var(--primary-color); text-decoration: none;">&larr; Voltar para o Painel de Validação</a></div></div>`;
}

function exibirErroGeral(mensagem) {
    document.body.classList.remove('signature-view-active');
    document.getElementById('container-principal').innerHTML = `<div class="dashboard-container" style="animation: none;"><div class="content-card" style="padding: 40px; text-align: center;"><h2 style="color: var(--error-color);">Erro Crítico</h2><p>${mensagem}</p><p>Verifique o console (F12) para mais detalhes e contate o suporte.</p></div></div>`;
}