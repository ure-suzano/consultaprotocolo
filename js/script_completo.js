/* troca de telas */

/**
 * Alterna a visibilidade das seções (Início, Simulador, etc)
 * Melhora a experiência do usuário fechando menus e limpando resultados.
 */
function mostrar(id) {
    // Mapeamento de IDs para garantir que o assistente de bolso funcione
    const mapaId = {
        'consultar': 'processo',
        'solicitar': 'contagem',
        'documentos': 'documentos',
        'inicio': 'inicio',
        'requisitos': 'requisitos',
        'simulador': 'simulador'
    };

    const targetId = mapaId[id] || id;

    const telas = document.querySelectorAll(".tela");
    telas.forEach(tela => tela.style.display = "none");

    const target = document.getElementById(targetId);
    if (target) {
        target.style.display = "block";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Fecha o menu mobile do Bootstrap
    const navBar = document.getElementById('navMenu');
    if (navBar && navBar.classList.contains('show')) {
        const bootstrapCollapse = bootstrap.Collapse.getInstance(navBar);
        if (bootstrapCollapse) bootstrapCollapse.hide();
    }
}


const SB_URL = "https://ffprsdeicjjttfedzbif.supabase.co/rest/v1";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmcHJzZGVpY2pqdHRmZWR6YmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTg4NTksImV4cCI6MjA4MTEzNDg1OX0.U5J1L6vv7RZztxUjJ4UKcNhtHzwOlaU0NTeXoyAa0GU";

const HEADERS = {
    "apikey": SB_KEY,
    "Authorization": "Bearer " + SB_KEY,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
};

/**
 * Consulta um processo VTC exclusivamente no SEFREP
 * Garante dados em tempo real e fila enxuta (apenas pendências reais)
 */
async function consultarProcesso() {
    const input = document.getElementById("processoNumero");
    const numero = input.value.trim();
    const resultadoArea = document.getElementById("resultadoProcesso");

    if (!numero) {
        exibirResultado("⚠ Por favor, digite um número de processo VTC.", "warning");
        return;
    }

    // 1. Limpeza e Feedback Visual (Para garantir que o usuário veja a atualização)
    resultadoArea.innerHTML = `
        <div class="text-center py-4 w-100">
            <div class="spinner-border text-primary mb-3" role="status"></div>
            <p class="text-muted mb-0">Consultando base SEFREP em tempo real...</p>
        </div>
    `;
    resultadoArea.className = "mt-4 p-3 rounded bg-light border-start border-4 border-info d-flex align-items-center shadow-sm";

    try {
        // 2. Consulta ao Supabase (Busca o registro MAIS RECENTE pelo protocolo)
        const numeroLimpo = numero.trim();
        const res = await fetch(`${SB_URL}/sefrep_registros?protocolo=eq.${encodeURIComponent(numeroLimpo)}&order=data_entrada.desc&limit=1`, { 
            headers: HEADERS,
            cache: 'no-store'
        });
        const dados = await res.json();

        if (!dados || dados.length === 0) {
            exibirResultado("⚠️ Processo VTC não localizado no SEFREP. Verifique o número ou consulte sua unidade escolar.", "warning");
            return;
        }

        const processoEncontrado = dados[0];
        const observacao = (processoEncontrado.observacoes || "").toLowerCase();
        const statusReal = (processoEncontrado.status || "em analise").toLowerCase();
        const nomeEscola = processoEncontrado.escola || "Sua Unidade Escolar";
        const interessado = (processoEncontrado.nome || "Não informado").toUpperCase();
        const protocolo = processoEncontrado.protocolo || numero;

        // Preencher automaticamente a Unidade Escolar no formulário de requerimento
        const campoEscolaReq = document.getElementById('reqEscola');
        if (campoEscolaReq && processoEncontrado.escola) {
            campoEscolaReq.value = processoEncontrado.escola;
        }
        
        // Função auxiliar para evitar erro de fuso horário (UTC vs Local)
        const formatarDataLocal = (str) => {
            if (!str) return "N/D";
            const partes = str.split('T')[0].split('-');
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        };

        const dataEntradaFormatada = formatarDataLocal(processoEncontrado.data_entrada);
        const dataSaidaFormatada = processoEncontrado.data_saida ? formatarDataLocal(processoEncontrado.data_saida) : null;

        // 3. Inteligência de Desfecho (Apenas se o Status for Concluído/Finalizado)
        if (statusReal === "concluido" || statusReal === "finalizado") {
            // Nova Lógica de Prioridade:
            // 1. Se contiver "finalizado", é SUCESSO (Verde)
            // 2. Se contiver "falta", "correção", "pendente" ou "regularização", é DEVOLVIDO (Amarelo)
            // 3. Se contiver "concluido", e não tiver os termos acima, é SUCESSO (Verde)
            
            const temFinalizado = observacao.includes("finalizado") || observacao.includes("finalizada");
            const temPendencia = observacao.includes("falta") || 
                                 observacao.includes("correção") || 
                                 observacao.includes("pendente") || 
                                 observacao.includes("regularização") ||
                                 observacao.includes("devolvido para correção");
            const temConcluido = observacao.includes("concluido") || observacao.includes("concluida");

            let isRealmenteDevolvido = false;
            let isNaoFazJus = false;
            let isAbono = false;
            let isAposentadoria = false;

            // Novas Categorias baseadas na observação real
            if (observacao.includes("não faz jus") || observacao.includes("nao faz jus")) {
                isNaoFazJus = true;
            } else if (temFinalizado || temConcluido) {
                if (observacao.includes("aposentadoria")) {
                    isAposentadoria = true;
                } else if (observacao.includes("abono")) {
                    isAbono = true;
                } else if (!temPendencia) {
                    isAposentadoria = true; // Fallback para verde
                }
            } 

            if (!isNaoFazJus && !isAbono && !isAposentadoria && (temPendencia || observacao.includes("devolvido"))) {
                isRealmenteDevolvido = true;
            }

            // ==========================================
            // RENDERIZAÇÃO HUMANA (UX)
            // ==========================================

            if (isRealmenteDevolvido) {
                // CASO 1: Devolvido para Correções (AMARELO)
                exibirResultado(`
                    <div class="card border-0 mb-3 mx-auto shadow-sm text-start" style="max-width: 600px; border-radius: 12px; border-left: 6px solid #ffc107 !important;">
                        <div class="card-body p-4 position-relative">
                            <span class="badge bg-warning text-dark position-absolute top-0 end-0 m-3 px-3 rounded-pill shadow-sm"><i class="bi bi-arrow-return-left"></i> DEVOLVIDO (VTC)</span>
                            <h5 class="fw-bold mb-0 text-dark" style="text-transform: uppercase; letter-spacing: 0.5px;">${interessado}</h5>
                            <p class="text-muted small fw-bold mt-1 mb-3">PROTOCOLO: <span class="text-primary">${protocolo}</span> | DATA: ${dataEntradaFormatada}</p>
                            <p class="text-muted small mb-0"><i class="bi bi-building"></i> ${nomeEscola}</p>

                            <div class="mt-4 p-4 rounded bg-warning-subtle border border-warning-subtle shadow-sm alert-humanizado">
                                <h6 class="fw-bold text-warning-emphasis mb-3 d-flex align-items-center"><i class="bi bi-exclamation-triangle-fill me-2"></i> Processo Analisado, mas devolvido para correções.</h6>
                                <p class="small text-dark mb-2" style="line-height: 1.6;">Olá! O seu processo chegou ao nosso setor no dia <strong>${dataEntradaFormatada}</strong> e informamos que ele já foi totalmente analisado pelo <strong>Responsável pela Emissão de VTC</strong>.</p>
                                <p class="small text-dark mb-3" style="line-height: 1.6;">Durante a conferência, constatamos algumas pendências ou inconsistências nos documentos enviados. Por isso, no dia <strong>${dataSaidaFormatada || dataEntradaFormatada}</strong>, o seu pedido precisou ser devolvido oficialmente para a sua escola de origem.</p>
                                <hr style="border-color: rgba(0,0,0,0.1);">
                                <p class="mb-0 small text-dark" style="line-height: 1.6;"><strong>O que fazer agora?</strong> Por favor, procure a Gerência ou a Secretaria da sua Unidade Escolar. Eles já receberam nossos apontamentos e saberão exatamente quais correções precisam fazer para reenviar o processo.</p>
                            </div>
                        </div>
                    </div>
                `, "light-custom");
                return;
            } else if (isNaoFazJus) {
                // CASO 2: Indeferido / Não Faz Jus (VERMELHO)
                exibirResultado(`
                    <div class="card border-0 mb-3 mx-auto shadow-sm text-start" style="max-width: 600px; border-radius: 12px; border-left: 6px solid #dc3545 !important;">
                        <div class="card-body p-4 position-relative">
                            <span class="badge bg-danger position-absolute top-0 end-0 m-3 px-3 rounded-pill shadow-sm"><i class="bi bi-x-circle-fill"></i> NÃO FAZ JUS</span>
                            <h5 class="fw-bold mb-0 text-dark" style="text-transform: uppercase; letter-spacing: 0.5px;">${interessado}</h5>
                            <p class="text-muted small fw-bold mt-1 mb-3">PROTOCOLO: <span class="text-primary">${protocolo}</span> | DATA: ${dataEntradaFormatada}</p>
                            <p class="text-muted small mb-0"><i class="bi bi-building"></i> ${nomeEscola}</p>

                            <div class="mt-4 p-4 rounded bg-danger-subtle border border-danger-subtle shadow-sm alert-humanizado">
                                <h6 class="fw-bold text-danger-emphasis mb-3 d-flex align-items-center"><i class="bi bi-sign-stop-fill me-2"></i> Análise Concluída: Requisitos Não Atingidos no Momento</h6>
                                <p class="small text-dark mb-2" style="line-height: 1.6;">A sua documentação deu entrada em <strong>${dataEntradaFormatada}</strong> e foi minuciosamente conferida pelo <strong>Responsável pela Emissão de VTC</strong>. O processo foi indeferido na data de <strong>${dataSaidaFormatada || dataEntradaFormatada}</strong>.</p>
                                <p class="small text-dark mb-0" style="line-height: 1.6;">Embasado na legislação previdenciária vigente do Estado de São Paulo (<strong>Lei Complementar Estadual nº 1.354/2020</strong>), informamos que, na data atual, o(a) servidor(a) <strong>não faz jus</strong> à concessão do benefício pleiteado, pois não atingiu a totalidade dos requisitos legais exigidos por lei (como tempo de contribuição, idade ou pedágio).</p>
                            </div>
                        </div>
                    </div>
                `, "light-custom");
                return;
            } else if (isAbono) {
                // CASO 3: Abono Concluído (VERDE + AZUL CLARO)
                 exibirResultado(`
                    <div class="card border-0 mb-3 mx-auto shadow-sm text-start" style="max-width: 600px; border-radius: 12px; border-left: 6px solid #198754 !important;">
                        <div class="card-body p-4 position-relative">
                            <span class="badge bg-success position-absolute top-0 end-0 m-3 px-3 rounded-pill shadow-sm"><i class="bi bi-check-circle-fill"></i> ABONO FINALIZADO</span>
                            <h5 class="fw-bold mb-0 text-dark" style="text-transform: uppercase; letter-spacing: 0.5px;">${interessado}</h5>
                            <p class="text-muted small fw-bold mt-1 mb-3">PROTOCOLO: <span class="text-primary">${protocolo}</span> | DATA: ${dataEntradaFormatada}</p>
                            <p class="text-muted small mb-0"><i class="bi bi-building"></i> ${nomeEscola}</p>

                            <div class="mt-4 p-4 rounded bg-info-subtle border border-info-subtle shadow-sm alert-humanizado">
                                <h6 class="fw-bold text-primary-emphasis mb-3 d-flex align-items-center"><i class="bi bi-check-all me-2"></i> 1ª Fase Concluída: Validação de Tempo para Abono</h6>
                                <p class="small text-dark mb-3" style="line-height: 1.6;">Parabéns! O seu tempo de serviço enviado em <strong>${dataEntradaFormatada}</strong> foi validado pelo <strong>Responsável pela Emissão de VTC</strong> no dia <strong>${dataSaidaFormatada || dataEntradaFormatada}</strong>. Você atendeu aos requisitos da <strong>L.C. nº 1.354/2020</strong> para o Abono de Permanência!</p>
                                <hr style="border-color: rgba(0,0,0,0.1);">
                                <p class="mb-0 small text-dark" style="line-height: 1.6;"><strong>Atenção aos Próximos Passos:</strong> O documento que emitimos (VTC) é apenas a primeira fase. A liberação financeira não é automática. O seu processo já retornou para a sua escola. Agora, a Gerência da sua Unidade Escolar deve providenciar a documentação necessária para fins de pagamento e encaminhar para o setor do SEFREP para inclusão no sistema.</p>
                            </div>
                        </div>
                    </div>
                `, "light-custom");
                return;
            } else {
                // CASO 4: Aposentadoria Concluída (VERDE + AZUL CLARO)
                exibirResultado(`
                    <div class="card border-0 mb-3 mx-auto shadow-sm text-start" style="max-width: 600px; border-radius: 12px; border-left: 6px solid #198754 !important;">
                        <div class="card-body p-4 position-relative">
                            <span class="badge bg-success position-absolute top-0 end-0 m-3 px-3 rounded-pill shadow-sm"><i class="bi bi-check-circle-fill"></i> APOSENTADORIA CONCLUÍDA</span>
                            <h5 class="fw-bold mb-0 text-dark" style="text-transform: uppercase; letter-spacing: 0.5px;">${interessado}</h5>
                            <p class="text-muted small fw-bold mt-1 mb-3">PROTOCOLO: <span class="text-primary">${protocolo}</span> | DATA: ${dataEntradaFormatada}</p>
                            <p class="text-muted small mb-0"><i class="bi bi-building"></i> ${nomeEscola}</p>

                            <div class="mt-4 p-4 rounded bg-info-subtle border border-info-subtle shadow-sm alert-humanizado">
                                <h6 class="fw-bold text-primary-emphasis mb-3 d-flex align-items-center"><i class="bi bi-check-all me-2"></i> VTC Atualizada: Preparada para Aposentadoria</h6>
                                <p class="small text-dark mb-2" style="line-height: 1.6;">Informamos que a revisão final do seu tempo de contribuição, solicitada em <strong>${dataEntradaFormatada}</strong>, foi deferida e assinada pelo <strong>Responsável pela Emissão de VTC</strong> no dia <strong>${dataSaidaFormatada || dataEntradaFormatada}</strong>.</p>
                                <p class="small text-dark mb-3" style="line-height: 1.6;">Sua Validação de Tempo de Contribuição está atualizada, atestando o direito à aposentadoria sob as regras do Estado de São Paulo.</p>
                                <hr style="border-color: rgba(0,0,0,0.1);">
                                <p class="mb-0 small text-dark" style="line-height: 1.6;"><strong>Próxima Ação Necessária:</strong> O processo retornou à sua escola. Para que a sua aposentadoria seja de fato publicada em Diário Oficial, você precisa procurar imediatamente a secretaria da sua Unidade Escolar e formalizar o pedido final de concessão (Trâmite de Aposentadoria), que será encaminhado posteriormente ao setor de SEAPE.</p>
                            </div>
                        </div>
                    </div>
                `, "light-custom");
                return;
            }
        }

        // 4. Caso o Processo não esteja concluído -> Exibir Fila de Atendimento (EM ANALISE)
        // Buscamos todos do tema VTC para calcular a posição relativa
        // Corrigido: Usando a sintaxe correta "=" para o operador ilike
        const resFila = await fetch(`${SB_URL}/sefrep_registros?tema=ilike.*VTC*&select=*`, { 
            headers: HEADERS,
            cache: 'no-store'
        });
        let todosVtc = await resFila.json();
        
        // Filtro de Fila RESTRITO: Apenas quem está ATIVO (status específico) e sem notas de conclusão
        let filaAtiva = todosVtc.filter(p => {
            const obs = (p.observacoes || "").toLowerCase();
            const st = (p.status || "").toLowerCase();
            
            // O usuário solicitou especificamente "em analise" e "não concluido"
            // Também incluímos "em andamento" por ser um status ativo comum no banco
            const statusPermitido = st === "em analise" || st === "em andamento" || st === "não concluido";
            
            return statusPermitido && 
                   !obs.includes("finalizado") && 
                   !obs.includes("analise concluida") && 
                   !obs.includes("devolvido");
        });

        // Ordenação por antiguidade (Prioridade para quem aguarda há mais tempo)
        filaAtiva.sort((a, b) => new Date(a.data_entrada) - new Date(b.data_entrada));

        const index = filaAtiva.findIndex(p => p.id === processoEncontrado.id);
        const processosNaFrente = index >= 0 ? index : 0;
        const posicaoFila = processosNaFrente + 1;
        
        const dataEntrada = new Date(processoEncontrado.data_entrada);
        const diasDecorridos = Math.floor((new Date() - dataEntrada) / (1000 * 60 * 60 * 24));
        
        let diasEst = 60 + Math.floor(processosNaFrente * 0.25) - diasDecorridos;
        if (diasEst > 120) diasEst = 120;
        if (diasEst < 30) diasEst = 30;

        // Mensagem Inteligente para Processos em Análise
        let msgAnaliseExtra = "";
        if (observacao.includes("em analise") || observacao.includes("aguardando") || observacao.includes("email enviado")) {
            msgAnaliseExtra = `
                <div class="alert alert-info border-0 bg-info-subtle rounded-3 py-2 px-3 mb-3 shadow-sm border-start border-4 border-info">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-clipboard-pulse fs-5 me-3 text-info"></i>
                        <div class="small text-info-emphasis fw-semibold">
                            Processo em análise pelo responsável da emissão de VTC
                        </div>
                    </div>
                </div>
            `;
        }

        // 5. Resultado Final (UI Dinâmica de Fila e Temas)
        let infoHtml = "";

        // Definindo a cor e ícone baseando-se no STATUS
        let classeCorLateral = "border-left-primary";
        let corBadge = "bg-primary";
        let iconeBadge = "bi-activity";
        let statusDisplay = processoEncontrado.status.toUpperCase();

        const stLower = (processoEncontrado.status || "").toLowerCase();
        if (stLower.includes("finalizado") || stLower.includes("concluido")) {
            classeCorLateral = "border-left-success";
            corBadge = "bg-success";
            iconeBadge = "bi-check-circle-fill";
            statusDisplay = "FINALIZADO";
        } else if (stLower.includes("devolvido") || stLower.includes("correção") || stLower.includes("correcao")) {
            classeCorLateral = "border-left-warning";
            corBadge = "bg-warning text-dark";
            iconeBadge = "bi-arrow-return-left";
            statusDisplay = "DEVOLVIDO";
        }

        // Lógica de Protocolo vs SEI vs DOE
        let obsLimpa = (observacao || "").trim();
        let exibicaoProtocoloOuSEI = `<span>PROTOCOLO: <span class="text-primary">${protocolo}</span></span>`;
        let exibicaoDataDOE = "";
        let temDOE = false;

        const isLicenca = temaUpper.includes("LICENÇA") || temaUpper.includes("LICENCA");
        const isEvolucao = temaUpper.includes("EVOLUÇÃO") || temaUpper.includes("EVOLUCAO");

        if (isLicenca || isEvolucao) {
            // Em LP e Evolução, O "protocolo" do banco de dados na verdade é o SEI.
            exibicaoProtocoloOuSEI = `<span>NÚMERO DO SEI: <span class="text-${corBadge.replace('bg-', '')}">${protocolo}</span></span>`;
        }

        // Extrair DOE de Aposentadoria (Exemplo Simples)
        if (temaUpper.includes("APOSENTADORIA") && (obsLimpa.toUpperCase().includes("PUBLICAÇÃO EM DOE") || obsLimpa.toUpperCase().includes("PUBLICACAO EM DOE"))) {
            const regexDOE = /(?:PUBLICAÇÃO EM DOE|PUBLICACAO EM DOE):?\s*([\d]{2}\/[\d]{2}\/[\d]{4})/i;
            const match = obsLimpa.match(regexDOE);
            if (match && match[1]) {
                exibicaoDataDOE = `<span class="mx-2 text-muted fw-normal">|</span><span style="color: #6f42c1;"><i class="bi bi-newspaper me-1"></i> PUBLICAÇÃO EM DOE: <span class="fw-bold">${match[1]}</span></span>`;
                temDOE = true;
            }
        }

        // Montando linha de datas
        let linhaDatas = "";
        if (dataEntradaFormatada) {
            linhaDatas += `<span class="mx-2 text-muted fw-normal">|</span><span>ENTRADA: <span class="text-secondary fw-normal">${dataEntradaFormatada}</span></span>`;
        }
        if (dataSaidaFormatada && !temDOE) {
            linhaDatas += `<span class="mx-2 text-muted fw-normal">|</span><span>SAÍDA: <span class="text-secondary fw-normal">${dataSaidaFormatada}</span></span>`;
        }
        linhaDatas += exibicaoDataDOE;

        // Construção do componente
        infoHtml = `
            <div class="w-100 py-3 animate__animated animate__zoomIn">
                <!-- Se for Quinquenio, adicionar alerta do descongelamento em cima do card -->
                ${temaUpper.includes("QUINQU") ? `
                <div class="alert border-0 shadow-sm mb-3 text-start" style="background-color: #fff4e5; border-radius: 12px;">
                    <div class="d-flex">
                        <i class="bi bi-info-circle-fill me-2 fs-5 text-warning"></i>
                        <div class="small text-dark mt-1">
                            <b>Aviso Legal (LC 173/2020):</b> Devido ao recente descongelamento do tempo de serviço, há uma alta demanda de processos de Quinquênio. Agradecemos a compreensão.
                        </div>
                    </div>
                </div>
                ` : ""}
                
                <div class="card border-0 mb-3 mx-auto shadow-sm text-start w-100" style="border-radius: 12px; ${classeCorLateral.replace('border-left', 'border-left:')} !important;">
                    <div class="card-body p-4 position-relative">
                        <!-- Badge -->
                        <span class="badge ${corBadge} position-absolute top-0 end-0 m-3 px-3 py-2 rounded-pill shadow-sm" style="font-size: 0.75rem;">
                            <i class="bi ${iconeBadge}"></i> ${statusDisplay}
                        </span>
                        
                        <h5 class="fw-bold mb-0 text-dark" style="text-transform: uppercase; letter-spacing: 0.5px; font-size: 1.25rem;">${interessado}</h5>
                        
                        <div class="d-flex align-items-center flex-wrap pt-1 mb-2 protocolo-info fw-bold" style="font-size: 0.8rem; color: #868e96; letter-spacing: 0.2px;">
                            <span class="badge bg-light text-secondary border border-secondary-subtle tema-badge me-2" style="font-size: 0.70rem; letter-spacing: 0.5px;">TEMA: ${temaUpper}</span>
                            ${exibicaoProtocoloOuSEI}
                            ${linhaDatas}
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center flex-wrap pt-3 mt-1 border-top" style="border-top-color: #f1f3f5 !important;">
                            <p class="escola-nome mb-0 d-flex align-items-center" style="font-size: 0.85rem; color: #6c757d; letter-spacing: 0.2px;">
                                <i class="bi bi-building me-2 fs-5"></i> ${nomeEscola}
                            </p>
                            <button class="vtc-accordion-btn collapsed mt-2 mt-sm-0 shadow-sm" type="button" data-bs-toggle="collapse" data-bs-target="#collapseDetalhesGerais" aria-expanded="false" style="background: none; border: 1px solid #e9ecef; color: #495057; font-weight: 500; font-size: 0.85rem; padding: 6px 14px; border-radius: 50px; display: inline-flex; align-items: center; cursor: pointer; transition: all 0.2s ease; background-color: #f8f9fa;">
                                Detalhes do Processo <i class="bi bi-chevron-down" style="margin-left: 6px; font-size: 1rem; color: #adb5bd; transition: transform 0.3s ease;"></i>
                            </button>
                        </div>

                        <div class="collapse mt-3" id="collapseDetalhesGerais">
                            <div class="p-3 alert-humanizado shadow-sm border-${corBadge.replace('bg-', '')}-subtle bg-${corBadge.replace('bg-', '')}-subtle bg-opacity-10" style="border-radius: 8px; border: 1px solid #dee2e6;">
                                <h6 class="fw-bold text-${corBadge.replace('bg-', '')} mb-2" style="font-size: 0.9rem;"><i class="bi bi-chat-left-text-fill me-1"></i> OBSERVAÇÃO:</h6>
                                <p class="small text-dark mb-0" style="line-height: 1.6;">
                                    <i>"${obsLimpa || 'Sem detalhes adicionais disponíveis'}"</i>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Parte da Fila de Espera Exibida APENAS SE FOR STATUS DE ANÁLISE -->
                ${statusPermitido ? `
                <div class="card border-0 shadow-sm mb-4 bg-white" style="border-radius: 12px;">
                    <div class="card-body p-4 border-start border-5 border-info rounded-4">
                        <div class="d-flex align-items-center mb-3">
                            <i class="bi bi-activity fs-4 me-3 text-info"></i>
                            <h6 class="mb-0 fw-bold text-dark text-uppercase">Previsão na Fila de Análise</h6>
                        </div>
                        <p class="mb-0 fs-6 text-dark leading-relaxed">
                            O processo de <b>${interessado}</b> está no setor, 
                            atualmente na posição indicativa <b>${posicaoFila}</b> de sua categoria, 
                            com previsão de atendimento estimada em <b>até ${diasEst} dias</b>.
                        </p>
                    </div>
                </div>
                ` : ""}

            </div>
        `;

        exibirResultado(infoHtml, "light");

    } catch (error) {
        console.error("Erro na consulta SEFREP:", error);
        exibirResultado("❌ Erro ao conectar com a base de dados. Tente novamente em instantes.", "danger");
    }
}

function exibirResultado(mensagem, tipo) {
    let resultado = document.getElementById("resultadoProcesso");
    resultado.className = `mt-4 p-3 rounded bg-${tipo}-subtle text-${tipo}-emphasis border-start border-4 border-${tipo === 'light' ? 'primary' : tipo} shadow-sm`;
    resultado.innerHTML = mensagem;
}




/* GERAR REQUERIMENTO WORD (.DOC) E INICIAR PROTOCOLO PHP */

async function gerarRequerimentoWord() {
    // 1. Captura de Dados do Formulário
    const btnGerar = document.querySelector("#formRequerimento button");
    const nome = document.getElementById("reqNome").value.trim();
    const rg = document.getElementById("reqRG").value.trim();
    const endereco = document.getElementById("reqEndereco").value.trim();
    const telefone = document.getElementById("reqTelefone").value.trim();
    const email = document.getElementById("reqEmail").value.trim();
    const cargo = document.getElementById("reqCargo").value.trim();
    const escola = document.getElementById("reqEscola").value.trim();
    const tipo = document.getElementById("reqTipo").value;
    const dataAtual = new Date().toLocaleDateString('pt-BR');

    // 2. Validação Básica
    if (!nome || !rg || !escola || !email) {
        alert("⚠️ Por favor, preencha todos os campos corretamente.");
        return;
    }

    try {
        // Feedback Visual
        btnGerar.disabled = true;
        btnGerar.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando...`;

        let protocoloGerado = "";
        let isOffline = false;

        // 3. Envio para o Servidor PHP (Protegido com Fallback)
        try {
            const respostaPHP = await fetch('../php/enviar.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nome: nome,
                    rg: rg,
                    endereco: endereco,
                    telefone: telefone,
                    email: email,
                    cargo: cargo,
                    escola: escola,
                    tipo: tipo
                })
            });

            const resultado = await respostaPHP.json();

            if (!resultado.sucesso) {
                throw new Error(resultado.mensagem || "Falha lógica.");
            }
            protocoloGerado = resultado.protocolo; // Pegamos o REQ gerado no servidor

        } catch (erroFetch) {
            console.warn("⚠️ Servidor PHP inacessível. Entrando em Modo Local/Offline.", erroFetch);
            isOffline = true;
            
            // Geração de protocolo manual para o modo offline
            const d = new Date();
            const pad = (n) => n.toString().padStart(2, '0');
            protocoloGerado = `REQ-OFF-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
        }

        // 4. Montagem do Template HTML para o Word
        // O Word reconhece HTML básico quando o arquivo é salvo como .doc
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Requerimento</title><style>body{font-family:'Arial',sans-serif;line-height:1.5;padding:40px;}.titulo{text-align:center;font-weight:bold;text-decoration:underline;margin-bottom:30px;}.texto{text-align:justify;margin-bottom:40px;}.assinatura{text-align:center;margin-top:60px;}.protocolo{text-align:right;font-size:12px;color:#666;}</style></head><body>";
        
        const body = `
            <div class='protocolo'>Protocolo de Envio: <b>${protocoloGerado}</b></div>
            <div class='titulo'>
                <h2>REQUERIMENTO DE CONTAGEM DE TEMPO</h2>
            </div>
            <div class='texto'>
                <p>Eu, <b>${nome.toUpperCase()}</b>, RG nº <b>${rg}</b>, residente no endereço <b>${endereco}</b>, 
                contato telefônico <b>${telefone}</b> e e-mail <b>${email}</b>, servidor público estadual no cargo de 
                <b>${cargo}</b>, classificado na unidade escolar <b>${escola}</b>, venho respeitosamente requerer a 
                <b>CONTAGEM DE TEMPO DE CONTRIBUIÇÃO</b> para fins de <b>${tipo.toUpperCase()}</b>.</p>
                
                <p>Solicito análise e providências conforme a legislação vigente.</p>
                <p>Pede Deferimento.</p>
            </div>
            <div class='assinatura'>
                <p>___________________________________________________</p>
                <p><b>${nome.toUpperCase()}</b></p>
                <p style='margin-top:20px;'>Data: ${dataAtual}</p>
            </div>
        `;
        
        const footer = "</body></html>";
        const conteudoCompleto = header + body + footer;

        // 5. Geração e Download do Arquivo .doc
        const blob = new Blob(['\ufeff', conteudoCompleto], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        link.href = url;
        link.download = `Requerimento_${nome.split(' ')[0]}_${tipo.replace(/\s+/g, '')}.doc`;
        document.body.appendChild(link);
        link.click();
        
        // Limpeza DOC
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // 6. Mensagem de Sucesso na Interface
        const formulario = document.getElementById("formRequerimento");
        
        let avisoEmail = `Um aviso de confirmação da solicitação (${protocoloGerado}) foi preparado para envio ao seu e-mail pessoal (<b>${email}</b>).`;
        let badgeStatus = ``;
        
        if (isOffline) {
            badgeStatus = `<span class="badge bg-warning text-dark ms-2 align-middle fs-6">Modo Local</span>`;
            avisoEmail = `<span class="text-warning-emphasis fw-medium"><i class="bi bi-exclamation-triangle-fill"></i> Aviso: Como você está testando o arquivo sem um servidor web, o e-mail de confirmação não foi enviado. No entanto, o seu arquivo Word (.doc) foi gerado e baixado com sucesso!</span>`;
        }

        formulario.innerHTML = `
            <div class="col-12 text-center py-5 animate__animated animate__zoomIn">
                <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
                <h3 class="mt-3 fw-bold text-success">Solicitação Registrada!</h3>
                <h5 class="text-secondary mb-4">Protocolo: <b>${protocoloGerado}</b> ${badgeStatus}</h5>
                <p class="text-muted leading-relaxed">
                    O requerimento em formato Word foi baixado em seu computador para assinatura.<br>
                    <br>${avisoEmail}
                </p>
                <button class="btn btn-outline-primary mt-4 px-4 py-2" onclick="location.reload()">Fazer nova solicitação</button>
            </div>
        `;

    } catch (erro) {
        console.error("Erro fatal na geração do requerimento:", erro);
        alert("⚠️ Ocorreu um erro ao gerar o documento: " + erro.message);
    } finally {
        if (btnGerar) {
            btnGerar.disabled = false;
                btnGerar.innerHTML = `<i class="bi bi-file-earmark-word me-2"></i> Gerar Requerimento (.doc)`;
        }
    }
}

/* ======================================================================
   SIMULADOR DE TEMPO DE CONTRIBUIÇÃO - LC 1.354/2020
   ====================================================================== */

/**
 * Tabela progressiva de pontos (Art. 10 e §5º) — LC 1354/2020
 * A partir de 2020, +1 ponto por ano até o limite.
 */
function getPontosExigidos(ano, sexo, categoria) {
    const base = {
        geral:     { feminino: { inicio: 86, limite: 100 }, masculino: { inicio: 96, limite: 105 } },
        professor: { feminino: { inicio: 81, limite: 92  }, masculino: { inicio: 91, limite: 100 } }
    };
    const regra = base[categoria][sexo];
    const incremento = Math.max(0, ano - 2019); // +1 por ano a partir de 2020
    return Math.min(regra.inicio + incremento, regra.limite);
}

/**
 * Retorna os parâmetros legais conforme sexo e categoria
 */
function getParametros(sexo, categoria) {
    const tabela = {
        geral: {
            masculino: { idadeMin: 62, contrib: 35, idadePedagio: 60, contribPedagio: 35, servPublico: 20, cargo: 5 },
            feminino:  { idadeMin: 57, contrib: 30, idadePedagio: 57, contribPedagio: 30, servPublico: 20, cargo: 5 }
        },
        professor: {
            masculino: { idadeMin: 57, contrib: 30, idadePedagio: 55, contribPedagio: 30, servPublico: 20, cargo: 5 },
            feminino:  { idadeMin: 52, contrib: 25, idadePedagio: 52, contribPedagio: 25, servPublico: 20, cargo: 5 }
        }
    };
    return tabela[categoria][sexo];
}

/**
 * Calcula a idade a partir da data de nascimento
 */
function calcularIdade(dataNasc) {
    const hoje = new Date();
    const nasc = new Date(dataNasc);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNasc = nasc.getMonth();
    if (mesAtual < mesNasc || (mesAtual === mesNasc && hoje.getDate() < nasc.getDate())) {
        idade--;
    }
    return idade;
}

/**
 * Alterna o campo de tempo entre Anos/Meses e Total em Dias
 */
function toggleModo(btn, campo) {
    const divAM = document.getElementById(campo + '_am');
    const divDias = document.getElementById(campo + '_dias');
    const ehDias = divDias.classList.contains('d-none');

    if (ehDias) {
        divAM.classList.add('d-none');
        divDias.classList.remove('d-none');
        btn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Usar Anos/Meses';
    } else {
        divDias.classList.add('d-none');
        divAM.classList.remove('d-none');
        btn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Usar Dias';
    }
}

/**
 * Converte anos e meses em total de meses para facilitar cálculos
 */
function paraMeses(anos, meses) {
    return (parseInt(anos) || 0) * 12 + (parseInt(meses) || 0);
}

/**
 * Lê o tempo de um campo que pode estar em modo Anos/Meses ou Dias
 * Retorna total em meses
 */
function lerTempo(campo) {
    const divDias = document.getElementById(campo + '_dias');
    if (divDias && !divDias.classList.contains('d-none')) {
        // Modo dias: converte dias → meses (30 dias = 1 mês)
        const dias = parseInt(document.getElementById('sim' + campo.charAt(0).toUpperCase() + campo.slice(1) + 'Dias')?.value) || 0;
        return Math.round(dias / 30);
    }
    // Modo padrão: anos + meses (precisa mapear nomes)
    return -1; // fallback — será tratado no caller
}

/**
 * Formata meses em "X anos e Y meses"
 */
function formatarTempo(totalMeses) {
    const anos = Math.floor(totalMeses / 12);
    const meses = totalMeses % 12;
    if (anos === 0 && meses === 0) return '0 meses';
    if (anos === 0) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
    if (meses === 0) return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
    return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

/**
 * Verifica a data de ingresso para exibir ou ocultar a pergunta sobre quebra de vínculo.
 * Servidores com ingresso até 31/12/2003 (EC 41/2003) podem ter Paridade/Integralidade,
 * desde que não tenham quebra de vínculo superior a 90 dias.
 */
function verificarQuebraVinculo() {
    const input = document.getElementById('simDataIngresso');
    const dataIngresso = input.value;
    const divQuebra = document.getElementById('divQuebraVinculo');
    
    if (!dataIngresso) {
        divQuebra.classList.add('d-none');
        return;
    }

    // A regra de Integralidade/Paridade vale para quem ingressou até 31/12/2003 (EC 41/2003)
    // Embora a emenda seja de 2003, a nova regra de médias passou a valer em 01/01/2004.
    // Usando apenas os valores de ano/mês/dia para evitar problemas de fuso horário
    const [ano, mes, dia] = dataIngresso.split('-').map(Number);
    const ingressoDate = new Date(ano, mes - 1, dia); // mes é 0-indexed
    const limiteDate = new Date(2003, 11, 31); // 31 de Dezembro de 2003

    if (ingressoDate <= limiteDate) {
        divQuebra.classList.remove('d-none');
        // Adicionar um pequeno efeito para chamar atenção
        divQuebra.classList.add('animate__animated', 'animate__flash');
    } else {
        divQuebra.classList.add('d-none');
        // Se ocultar, volta para o padrão "Não"
        const radioNao = document.getElementById('quebraNao');
        if (radioNao) radioNao.checked = true;
    }
}

/**
 * Função principal do Simulador
 */
function simularContribuicao() {
    // 1. Coletar dados do formulário
    const sexo = document.querySelector('input[name="sexo"]:checked')?.value;
    const categoria = document.querySelector('input[name="categoria"]:checked')?.value;
    const dataNasc = document.getElementById('simDataNasc').value;
    const dataIngresso = document.getElementById('simDataIngresso').value;

    // Helper para ler campo dual (anos/meses ou dias)
    function lerCampoDual(campoId, anosId, mesesId, diasId) {
        const divDias = document.getElementById(campoId + '_dias');
        if (divDias && !divDias.classList.contains('d-none')) {
            const dias = parseInt(document.getElementById(diasId)?.value) || 0;
            return Math.round(dias / 30); // 30 dias ≈ 1 mês
        }
        return paraMeses(
            document.getElementById(anosId)?.value,
            document.getElementById(mesesId)?.value
        );
    }

    const servPublicoMeses = lerCampoDual('servPublico', 'simServPublicoAnos', 'simServPublicoMeses', 'simServPublicoDias');
    const cargoMeses = lerCampoDual('cargo', 'simCargoAnos', 'simCargoMeses', 'simCargoDias');
    const contrib2020Meses = lerCampoDual('contrib2020', 'simContrib2020Anos', 'simContrib2020Meses', 'simContrib2020Dias');
    const contribAtualMeses = lerCampoDual('contribAtual', 'simContribAtualAnos', 'simContribAtualMeses', 'simContribAtualDias');

    // 2. Validação
    if (!sexo || !categoria || !dataNasc || !dataIngresso) {
        alert('⚠ Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    // 3. Calcular idade e parâmetros legais
    const idade = calcularIdade(dataNasc);
    const params = getParametros(sexo, categoria);
    const anoAtual = new Date().getFullYear();
    const pontosExigidos = getPontosExigidos(anoAtual, sexo, categoria);
    const sexoLabel = sexo === 'masculino' ? 'Masculino' : 'Feminino';
    const catLabel = categoria === 'professor' ? 'Professor(a) - Magistério' : 'QAE / QSE - Geral';

    // 4. Calcular Regra de Pontos (Art. 10)
    const contribAtualAnos = contribAtualMeses / 12;
    const pontosAtuais = Math.floor((idade + contribAtualAnos) * 10) / 10; // 1 decimal
    const pontosFaltam = Math.max(0, pontosExigidos - pontosAtuais);
    const atingiuPontos = pontosAtuais >= pontosExigidos && idade >= params.idadeMin;

    // Projeção: em qual ano atinge os pontos
    let anoProjetado = anoAtual;
    let pontosProj = pontosAtuais;
    let idadeProj = idade;
    while (pontosProj < getPontosExigidos(anoProjetado, sexo, categoria) || idadeProj < params.idadeMin) {
        anoProjetado++;
        pontosProj += 2; // +1 ano de idade + ~1 de contribuição = +2 pontos
        idadeProj++;
        if (anoProjetado > anoAtual + 30) break; // segurança
    }

    // 5. Calcular Pedágio 100% (Art. 11)
    const contribMinPedagioMeses = params.contribPedagio * 12;
    const faltavaMeses = Math.max(0, contribMinPedagioMeses - contrib2020Meses);
    const pedagioMeses = faltavaMeses; // 100% do que faltava
    const totalExigidoPedagioMeses = contribMinPedagioMeses + pedagioMeses;
    const faltaPedagioMeses = Math.max(0, totalExigidoPedagioMeses - contribAtualMeses);
    const atingiuPedagio = contribAtualMeses >= totalExigidoPedagioMeses && idade >= params.idadePedagio;

    // 6. Verificar requisitos comuns
    const servPublicoOK = servPublicoMeses >= params.servPublico * 12;
    const cargoOK = cargoMeses >= params.cargo * 12;

    // 6.5 Determinar Fundamento do Cálculo (Base legal dos proventos)
    // Nota: A EC 41/2003 (publicada em 31/12/2003) alterou a forma de cálculo.
    // Ingressantes até 31/12/2003 mantêm Integralidade/Paridade (se sem quebra de vínculo > 90 dias).
    // Ingressantes a partir de 01/01/2004 entram na regra de médias.
    const quebraVinculo = document.querySelector('input[name="quebraVinculo"]:checked')?.value || 'nao';
    const dataIngressoObj = new Date(dataIngresso);
    const dataCorteEC41 = new Date('2003-12-31');
    const dataReforma2020 = new Date('2020-03-07');

    let fundamentoTitulo = "";
    let fundamentoDesc = "";
    let fundamentoIcone = "";
    let fundamentoCor = "";

    if (dataIngressoObj <= dataCorteEC41 && quebraVinculo === 'nao') {
        fundamentoTitulo = "Integral c/ Paridade";
        fundamentoDesc = "Proventos iguais à última remuneração e reajustes iguais aos ativos (EC 41/2003).";
        fundamentoIcone = "bi-award-fill";
        fundamentoCor = "success";
    } else if (dataIngressoObj < dataReforma2020) {
        fundamentoTitulo = "Média 100%";
        fundamentoDesc = "Proventos baseados na média de 100% das contribuições desde 07/1994, sem paridade.";
        fundamentoIcone = "bi-percent";
        fundamentoCor = "info";
    } else {
        fundamentoTitulo = "Regra Permanente";
        fundamentoDesc = "Cálculo de 60% da média + 2% por ano que exceder 20 anos de contribuição.";
        fundamentoIcone = "bi-slash-circle";
        fundamentoCor = "secondary";
    }

    // 7. Renderizar resultado
    const area = document.getElementById('resultadoSimulador');
    area.style.display = 'block';
    area.scrollIntoView({ behavior: 'smooth', block: 'start' });

    area.innerHTML = `
        <!-- Cabeçalho do Resultado -->
        <div class="border-bottom pb-3 mb-4">
            <h4 class="fw-bold text-dark mb-1"><i class="bi bi-clipboard-data me-2 text-primary"></i>Resultado da Simulação</h4>
            <span class="badge bg-${sexo === 'masculino' ? 'primary' : 'danger'} me-1">${sexoLabel}</span>
            <span class="badge bg-dark me-1">${catLabel}</span>
            <span class="badge bg-secondary">Idade: ${idade} anos</span>
        </div>

        <!-- Requisitos Comuns -->
        <div class="alert ${servPublicoOK && cargoOK ? 'alert-success' : 'alert-warning'} mb-4" role="alert">
            <h6 class="fw-bold mb-2"><i class="bi bi-check2-square me-1"></i> Requisitos Comuns (Art. 10 e 11)</h6>
            <div class="d-flex gap-4 flex-wrap">
                <span>${servPublicoOK ? '✅' : '❌'} Serviço Público: <strong>${formatarTempo(servPublicoMeses)}</strong> (mín. ${params.servPublico} anos)</span>
                <span>${cargoOK ? '✅' : '❌'} Tempo no Cargo: <strong>${formatarTempo(cargoMeses)}</strong> (mín. ${params.cargo} anos)</span>
            </div>
        </div>

        <!-- Cards Art. 10 e Art. 11 -->
        <div class="row g-4 mb-4">
            <!-- Art. 10 — Pontos -->
            <div class="col-md-6">
                <div class="card h-100 border-${atingiuPontos ? 'success' : 'primary'} shadow-sm">
                    <div class="card-header bg-${atingiuPontos ? 'success' : 'primary'} text-white py-3">
                        <h5 class="mb-0 fw-bold"><i class="bi bi-123 me-2"></i>Regra de Pontos</h5>
                        <small>Art. 10, LC 1.354/2020</small>
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between mb-2">
                            <span>Idade Mínima:</span>
                            <span class="fw-bold ${idade >= params.idadeMin ? 'text-success' : 'text-danger'}">${idade} / ${params.idadeMin} anos ${idade >= params.idadeMin ? '✅' : '❌'}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Contribuição Mínima:</span>
                            <span class="fw-bold">${formatarTempo(contribAtualMeses)} / ${params.contrib} anos</span>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Seus Pontos Atuais:</span>
                            <span class="fw-bold fs-5">${pontosAtuais.toFixed(1)} pts</span>
                        </div>
                        <div class="d-flex justify-content-between mb-3">
                            <span>Pontos Exigidos (${anoAtual}):</span>
                            <span class="fw-bold fs-5">${pontosExigidos} pts</span>
                        </div>
                        <div class="alert ${atingiuPontos ? 'alert-success' : 'alert-light border'} text-center py-2 mb-0">
                            ${atingiuPontos 
                                ? '<i class="bi bi-check-circle-fill text-success me-1"></i> <strong>Requisitos atingidos!</strong>' 
                                : `<i class="bi bi-hourglass-split text-muted me-1"></i> Faltam <strong>${pontosFaltam.toFixed(1)} pontos</strong>. Projeção: <strong>${anoProjetado}</strong>`
                            }
                        </div>
                    </div>
                    <div class="card-footer bg-light text-center small text-muted">
                        Fundamento: <strong>Art. 10</strong>${categoria === 'professor' ? ', §4° e §5°' : ''} da LC 1.354/2020
                    </div>
                </div>
            </div>

            <!-- Art. 11 — Pedágio 100% -->
            <div class="col-md-6">
                <div class="card h-100 border-${atingiuPedagio ? 'success' : 'info'} shadow-sm">
                    <div class="card-header bg-${atingiuPedagio ? 'success' : 'info'} text-${atingiuPedagio ? 'white' : 'dark'} py-3">
                        <h5 class="mb-0 fw-bold"><i class="bi bi-clock-history me-2"></i>Pedágio 100%</h5>
                        <small>Art. 11, LC 1.354/2020</small>
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between mb-2">
                            <span>Idade Mínima:</span>
                            <span class="fw-bold ${idade >= params.idadePedagio ? 'text-success' : 'text-danger'}">${idade} / ${params.idadePedagio} anos ${idade >= params.idadePedagio ? '✅' : '❌'}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Contribuição em 07/03/2020:</span>
                            <span class="fw-bold">${formatarTempo(contrib2020Meses)}</span>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Faltava em 07/03/2020:</span>
                            <span class="fw-bold text-warning">${formatarTempo(faltavaMeses)}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Pedágio (100%):</span>
                            <span class="fw-bold text-info">+ ${formatarTempo(pedagioMeses)}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-3">
                            <span>Total Exigido:</span>
                            <span class="fw-bold fs-5">${formatarTempo(totalExigidoPedagioMeses)}</span>
                        </div>
                        <div class="alert ${atingiuPedagio ? 'alert-success' : 'alert-light border'} text-center py-2 mb-0">
                            ${atingiuPedagio 
                                ? '<i class="bi bi-check-circle-fill text-success me-1"></i> <strong>Requisitos atingidos!</strong>' 
                                : `<i class="bi bi-hourglass-split text-muted me-1"></i> Faltam <strong>${formatarTempo(faltaPedagioMeses)}</strong> de contribuição`
                            }
                        </div>
                    </div>
                    <div class="card-footer bg-light text-center small text-muted">
                        Fundamento: <strong>Art. 11</strong>${categoria === 'professor' ? ', §1°' : ''} da LC 1.354/2020
                    </div>
                </div>
            </div>
        </div>

        <!-- Card Extra: Fundamento do Cálculo -->
        <div class="card border-${fundamentoCor} shadow-sm mb-4">
            <div class="card-body d-flex align-items-center gap-3">
                <div class="bg-${fundamentoCor}-subtle p-3 rounded-circle">
                    <i class="bi ${fundamentoIcone} fs-3 text-${fundamentoCor}"></i>
                </div>
                <div>
                    <h6 class="fw-bold text-${fundamentoCor} mb-1">Fundamento do Cálculo dos Proventos</h6>
                    <h5 class="fw-bold mb-1">${fundamentoTitulo}</h5>
                    <p class="small text-muted mb-0">${fundamentoDesc}</p>
                </div>
            </div>
        </div>

        <!-- Rodapé Legal -->
        <div class="alert alert-secondary mt-4 text-center small mb-0">
            <i class="bi bi-shield-exclamation me-1"></i>
            Esta simulação é meramente informativa. A confirmação oficial dos fundamentos legais depende da <strong>Validação de Tempo de Contribuição - VTC</strong> junto ao órgão competente.
        </div>
    `;
}
