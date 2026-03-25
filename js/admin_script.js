// 1. CONFIGURAÇÕES DA API (BACKEND PROXY)
const API_URL = "https://api-consultaprotocolo.vercel.app/api"; // Centralizar a URL da API Vercel

// 1.1 INICIALIZAR SUPABASE CLIENT (Apenas para Autenticação/Auth)
// O Auth ainda é feito via Supabase JS, mas a escrita/leitura agora é via Proxy.
const SUPABASE_URL = "https://fdcxcuyxrgbpmcrryiof.supabase.co"; // URL pública é segura para Auth
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkY3hjdXl4cmdicG1jcnJ5aW9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTk5NTMsImV4cCI6MjA4OTY5NTk1M30.AGRudVkfcFNGTftdV02NA3Xz6Xs1WzYruqCWLVnF-Rw"; // Chave anon pública é segura apenas para Auth

const clienteSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. REFERÊNCIAS DO DOM (Escopo Global)
let telaLogin, telaDashboard, formLogin, formCadastro, btnSair;

// 3. VERIFICADOR DE SESSÃO AUTOMÁTICO
async function checarSessao() {
    const { data: { session } } = await clienteSupabase.auth.getSession();
    if (session) {
        telaLogin.classList.add('hidden');
        telaDashboard.classList.remove('hidden');
        carregarDashboard();
    }
}

// 4. LÓGICA DE LOGIN
async function realizarLogin(event) {
    event.preventDefault();

    const email = document.getElementById('inputEmail').value;
    const senha = document.getElementById('inputSenha').value;
    const btnLogin = document.getElementById('btnLogin');
    const alertBox = document.getElementById('loginAlert');

    btnLogin.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Conectando...';
    btnLogin.disabled = true;
    alertBox.style.display = 'none';

    const { data, error } = await clienteSupabase.auth.signInWithPassword({
        email: email,
        password: senha,
    });

    if (error) {
        alertBox.innerHTML = '<i class="bi bi-exclamation-octagon-fill me-1"></i> E-mail ou Senha incorretos!';
        alertBox.style.display = 'block';
        btnLogin.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i> Autenticar';
        btnLogin.disabled = false;
    } else {
        telaLogin.classList.add('hidden');
        telaDashboard.classList.remove('hidden');
        btnLogin.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i> Autenticar';
        btnLogin.disabled = false;
        formLogin.reset();
        carregarDashboard();
    }
}

// 5. LÓGICA DE LOGOUT
async function realizarLogout() {
    await clienteSupabase.auth.signOut();
    telaDashboard.classList.add('hidden');
    telaLogin.classList.remove('hidden');
}

// 6. LÓGICA DE INSERÇÃO DE DADOS (CADASTRAR PROCESSO VIA PROXY)
async function cadastrarProcesso(event) {
    event.preventDefault();

    const btnSalvar = document.getElementById('btnSalvar');
    const alertBox = document.getElementById('cadastroAlert');

    btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Enviando ao Servidor...';
    btnSalvar.disabled = true;

    const tabelaSelecionada = document.getElementById('cadTabela').value;
    const dadosProcesso = {
        nome: document.getElementById('cadNome').value.trim().toUpperCase(),
        tema: document.getElementById('cadTema').value.trim().toUpperCase(),
        status: document.getElementById('cadStatus').value,
        data_entrada: document.getElementById('cadDataEntrada').value,
        data_saida: document.getElementById('cadDataSaida').value || null,
        protocolo: document.getElementById('cadProtocolo').value.trim().toUpperCase(),
        escola: document.getElementById('cadEscola').value.trim().toUpperCase(),
        observacoes: document.getElementById('cadObservacoes').value.trim()
    };

    try {
        const { data: { session } } = await clienteSupabase.auth.getSession();
        if (!session) throw new Error("Sessão expirada. Faça login novamente.");

        const response = await fetch(`${API_URL}/cadastrar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                tabela: tabelaSelecionada,
                dados: dadosProcesso
            })
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.erro || "Erro interno no servidor");

        alertBox.className = 'alert alert-success floating-alert fw-bold small';
        alertBox.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i> Processo cadastrado via Proxy Seguro!';
        alertBox.style.display = 'block';

        formCadastro.reset();
        document.getElementById('cadNome').focus();
        carregarDashboard();

    } catch (error) {
        alertBox.className = 'alert alert-danger floating-alert fw-bold small';
        alertBox.innerHTML = `<i class="bi bi-x-circle-fill me-2"></i> Erro: ${error.message}`;
        alertBox.style.display = 'block';
    } finally {
        btnSalvar.innerHTML = '<i class="bi bi-cloud-arrow-up-fill me-2"></i> Gravar no Banco';
        btnSalvar.disabled = false;
        setTimeout(() => { alertBox.style.display = 'none'; }, 5000);
    }
}

// 7. LISTENERS DE EVENTOS
document.addEventListener("DOMContentLoaded", () => {
    telaLogin = document.getElementById('telaLogin');
    telaDashboard = document.getElementById('telaDashboard');
    formLogin = document.getElementById('formLogin');
    formCadastro = document.getElementById('formCadastro');
    btnSair = document.getElementById('btnSair');

    if (formLogin) formLogin.addEventListener("submit", realizarLogin);
    if (formCadastro) formCadastro.addEventListener("submit", cadastrarProcesso);
    if (btnSair) btnSair.addEventListener("click", realizarLogout);

    checarSessao();
});

// 8. LÓGICA DO DASHBOARD (CARREGAR VIA PROXY PÚBLICO)
async function carregarDashboard() {
    try {
        // Para o dashboard, podemos usar o endpoint de consulta pública de forma inteligente
        // ou criar um endpoint de Dashboard para maior segurança.
        // Por agora, usaremos a API de consulta pública (consultar.js) que já temos.
        
        // Simulação de métricas filtradas pelo frontend (Melhorar para backend futuramente)
        const fetchAll = async (tabela) => {
            const res = await fetch(`${API_URL}/consultar?protocolo=2026`); // Busca ampla por ano
            return await res.json();
        };

        const result = await fetchAll();
        if (!result || !Array.isArray(result)) return;

        const filtro2026 = result;
        const aposentadorias = filtro2026.filter(p => p.tema && p.tema.toUpperCase().includes('APOSENTADORIA'));
        const publicadas = aposentadorias.filter(p => {
            const obs = (p.observacoes || "").toUpperCase();
            return obs.includes('DOE') || obs.includes('DIÁRIO') || obs.includes('PUBLICAÇÃO');
        });

        const aguardando = aposentadorias.length - publicadas.length;

        const elTotal = document.getElementById('dashTotal');
        const elPub = document.getElementById('dashPub');
        const elFila = document.getElementById('dashFila');
        
        if(elTotal) elTotal.innerText = filtro2026.length;
        if(elPub) elPub.innerText = publicadas.length;
        if(elFila) elFila.innerText = aguardando;

        // Armazenar globalmente para o sistema de filtros
        window._processosCache = filtro2026;
        renderizarTabelaAdmin(filtro2026);
        
    } catch(e) {
        console.error("Erro ao carregar Dashboard:", e);
    }
}

// NOVA FUNÇÃO: RENDERIZAR E FILTRAR TABELA ADMIN
function renderizarTabelaAdmin(lista) {
    const corpo = document.getElementById('corpoTabelaAdmin');
    if (!corpo) return;

    corpo.innerHTML = lista.map(p => `
        <tr>
            <td class="small fw-bold">${p.data_entrada ? new Date(p.data_entrada).toLocaleDateString('pt-BR') : '-'}</td>
            <td class="small">${p.data_saida ? new Date(p.data_saida).toLocaleDateString('pt-BR') : '<span class="text-muted">-</span>'}</td>
            <td class="fw-bold">${p.nome || 'N/A'}</td>
            <td class="small text-muted">${p.tema || 'N/A'}</td>
            <td><span class="badge bg-${p.status === 'CONCLUÍDO' ? 'success' : (p.status === 'ATRASADO' ? 'danger' : 'warning')}">${p.status}</span></td>
            <td class="fw-bold text-primary">${p.protocolo || 'N/A'}</td>
        </tr>
    `).join('');
}

// FUNÇÃO DE FILTRO GLOBAL
function filtrarAdmin() {
    const termo = document.getElementById('filtroAdminTermo').value.toUpperCase();
    const status = document.getElementById('filtroAdminStatus').value;
    const ordenacao = document.getElementById('filtroAdminOrdem').value;

    let lista = [...(window._processosCache || [])];

    // 1. Filtro por Termo (Nome ou Protocolo)
    if (termo) {
        lista = lista.filter(p => 
            (p.nome || "").toUpperCase().includes(termo) || 
            (p.protocolo || "").toUpperCase().includes(termo)
        );
    }

    // 2. Filtro por Status
    if (status) {
        lista = lista.filter(p => p.status === status);
    }

    // 3. Ordenação
    if (ordenacao === 'data_desc') {
        lista.sort((a, b) => new Date(b.data_entrada) - new Date(a.data_entrada));
    } else if (ordenacao === 'data_asc') {
        lista.sort((a, b) => new Date(a.data_entrada) - new Date(b.data_entrada));
    } else if (ordenacao === 'nome') {
        lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    }

    renderizarTabelaAdmin(lista);
}
