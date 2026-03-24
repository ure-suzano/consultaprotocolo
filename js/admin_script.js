// 1. INICIALIZAR SUPABASE CLIENT
const SUPABASE_URL = "https://fdcxcuyxrgbpmcrryiof.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkY3hjdXl4cmdicG1jcnJ5aW9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTk5NTMsImV4cCI6MjA4OTY5NTk1M30.AGRudVkfcFNGTftdV02NA3Xz6Xs1WzYruqCWLVnF-Rw";

// Criação do client do Supabase (A biblioteca importada no HTML viabiliza o 'window.supabase')
const clienteSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. REFERÊNCIAS DO DOM (Escopo Global)
let telaLogin, telaDashboard, formLogin, formCadastro, btnSair;

// 3. VERIFICADOR DE SESSÃO AUTOMÁTICO
async function checarSessao() {
    const { data: authData } = await clienteSupabase.auth.getSession();
    if (authData.session) {
        // Pula o login e mostra o Dashboard
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

    // Estado de Carregamento
    btnLogin.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Conectando...';
    btnLogin.disabled = true;
    alertBox.style.display = 'none';

    // Requisição oficial Auth do Supabase
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
        // Sucesso
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

// 6. LÓGICA DE INSERÇÃO DE DADOS (CADASTRAR PROCESSO)
async function cadastrarProcesso(event) {
    event.preventDefault(); // Impede o recarregamento natural do form

    const btnSalvar = document.getElementById('btnSalvar');
    const alertBox = document.getElementById('cadastroAlert');

    btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Salvando...';
    btnSalvar.disabled = true;

    const tabelaSelecionada = document.getElementById('cadTabela').value;

    // Preparação do Pacote de Dados
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

    // Comando de Insert Protegido (Automático via JWT nativo Supabase)
    const { data, error } = await clienteSupabase
        .from(tabelaSelecionada)
        .insert([dadosProcesso]);

    if (error) {
        alertBox.className = 'alert alert-danger floating-alert fw-bold small';
        alertBox.innerHTML = '<i class="bi bi-x-circle-fill me-2"></i> Acesso Negado pelo Banco de Dados. Verifique o console.';
        alertBox.style.display = 'block';
        console.error("ERRO RLS:", error.message);
    } else {
        alertBox.className = 'alert alert-success floating-alert fw-bold small';
        alertBox.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i> Processo cadastrado com sucesso! Segurança aprovada.';
        alertBox.style.display = 'block';

        // Limpar o formulário base para facilitar o próximo cadastro continuo
        document.getElementById('cadNome').value = "";
        document.getElementById('cadTema').value = "";
        document.getElementById('cadObservacoes').value = "";
        document.getElementById('cadProtocolo').value = "";
        document.getElementById('cadDataSaida').value = "";
        document.getElementById('cadNome').focus();
        carregarDashboard();
    }

    // Resetar Botão
    btnSalvar.innerHTML = '<i class="bi bi-cloud-arrow-up-fill me-2"></i> Gravar no Banco';
    btnSalvar.disabled = false;

    // Esconder o balão após 5 segundos
    setTimeout(() => { alertBox.style.display = 'none'; }, 5000);
}

// 7. LISTENERS DE EVENTOS (Prendendo a lógica na Página)
document.addEventListener("DOMContentLoaded", () => {
    // Captura os elementos apenas quando eles já existem na tela
    telaLogin = document.getElementById('telaLogin');
    telaDashboard = document.getElementById('telaDashboard');
    formLogin = document.getElementById('formLogin');
    formCadastro = document.getElementById('formCadastro');
    btnSair = document.getElementById('btnSair');

    // Sempre registre os eventos primeiro! Assim o formulário nunca recarrega a página por acidente.
    if (formLogin) formLogin.addEventListener("submit", realizarLogin);
    if (formCadastro) formCadastro.addEventListener("submit", cadastrarProcesso);
    if (btnSair) btnSair.addEventListener("click", realizarLogout);

    // Depois execute conferências que podem dar erro
    try {
        checarSessao();
    } catch (e) {
        console.error("Erro ao checar sessão:", e);
    }
});

// 8. LÓGICA DO DASHBOARD (MÉTRICAS 2026)
async function carregarDashboard() {
    try {
        const [resSeape, resSefrep] = await Promise.all([
            clienteSupabase.from('seape_registros').select('tema, status, observacoes, data_entrada'),
            clienteSupabase.from('sefrep_registros').select('tema, status, observacoes, data_entrada')
        ]);

        const todos = [...(resSeape.data || []), ...(resSefrep.data || [])];
        
        // Filtro do ano de 2026
        const filtro2026 = todos.filter(p => p.data_entrada && p.data_entrada.startsWith('2026'));

        // Filtro Aposentadorias
        const aposentadorias = filtro2026.filter(p => p.tema && p.tema.toUpperCase().includes('APOSENTADORIA'));
        
        // Verificando quais foram para DOE
        const publicadas = aposentadorias.filter(p => {
            const obs = (p.observacoes || "").toUpperCase();
            return obs.includes('DOE') || obs.includes('DIÁRIO') || obs.includes('PUBLICAÇÃO');
        });

        // O restante das aposentadorias está na fila aguardando
        const aguardando = aposentadorias.length - publicadas.length;

        // Injeta na Interface
        const elTotal = document.getElementById('dashTotal');
        const elPub = document.getElementById('dashPub');
        const elFila = document.getElementById('dashFila');
        
        if(elTotal) elTotal.innerText = filtro2026.length;
        if(elPub) elPub.innerText = publicadas.length;
        if(elFila) elFila.innerText = aguardando;
        
    } catch(e) {
        console.error("Erro ao carregar Dashboard:", e);
    }
}
