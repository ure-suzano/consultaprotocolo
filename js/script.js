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

    // Lógica de visibilidade dos botões de navegação
    const navItemInicio = document.getElementById('nav-item-inicio');
    const navItemRequisitos = document.getElementById('nav-item-requisitos');
    const navItemDocumentos = document.getElementById('nav-item-documentos');

    if (targetId === 'inicio') {
        if (navItemInicio) navItemInicio.style.display = 'none';
        if (navItemRequisitos) navItemRequisitos.style.display = 'none';
        if (navItemDocumentos) navItemDocumentos.style.display = 'none';
    } else {
        if (navItemInicio) navItemInicio.style.display = 'block';
        if (navItemRequisitos) navItemRequisitos.style.display = 'none';
        if (navItemDocumentos) navItemDocumentos.style.display = 'none';
    }

    // Fecha o menu mobile do Bootstrap
    const navBar = document.getElementById('navMenu');
    if (navBar && navBar.classList.contains('show')) {
        const bootstrapCollapse = bootstrap.Collapse.getInstance(navBar);
        if (bootstrapCollapse) bootstrapCollapse.hide();
    }
}

// Lógica para abrir aba específica via parâmetro na URL (?aba=id)
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const aba = urlParams.get('aba');
    if (aba) {
        // Pequeno atraso para garantir que tudo carregou
        setTimeout(() => mostrar(aba), 100);
    }
});

/**
 * Alterna a visibilidade do card de Regras de Paridade e Integralidade
 */
function toggleRegrasFinanceiras() {
    const content = document.getElementById('collapseRegrasFinanceiras');
    const btn = document.getElementById('btnToggleRegras');

    if (content.style.display === "none") {
        content.style.display = "block";
        btn.innerHTML = 'Clique para recolher <i class="bi bi-chevron-up ms-1"></i>';
    } else {
        content.style.display = "none";
        btn.innerHTML = 'Clique para expandir <i class="bi bi-chevron-down ms-1"></i>';
    }
}


/**
 * Consulta um processo unificado (SEFREP e SEAPE)
 * Atualizado para ASP.NET Core Proxy
 */
async function consultarProcesso() {
    const input = document.getElementById("processoNumero");
    // Remove espaços no ínicio/fim e padroniza a busca (maiúsculas)
    const protocoloDigitado = input.value.trim().toUpperCase();
    const resultadoArea = document.getElementById("resultadoProcesso");

    // Lógica 0: Verifica o selo de humanidade do Captcha
    const turnstileInput = document.querySelector('[name="cf-turnstile-response"]');
    const cfToken = turnstileInput ? turnstileInput.value : null;

    if (!protocoloDigitado) {
        exibirResultado("⚠ Por favor, digite o número do protocolo.", "warning");
        return;
    }

    if (!cfToken) {
        exibirResultado("⚠ Verificação de segurança (Anti-Robô) pendente ou expirada. Pressione F5 e aguarde a validação.", "warning");
        return;
    }

    // 1. Limpeza e Feedback Visual (Moderno)
    resultadoArea.innerHTML = `
        <div class="text-center py-5 w-100 animate__animated animate__fadeIn">
            <div class="spinner-grow text-primary mb-3" style="width: 3rem; height: 3rem;" role="status"></div>
            <p class="text-muted fw-medium mb-0">Localizando protocolo nas bases de dados, um momento...</p>
        </div>
    `;
    resultadoArea.className = "mt-4 p-4 card-glass border-0 d-flex align-items-center justify-content-center shadow-lg";

    // -------------------------------------------------------------
    // AS CHAVES E A URL DO SUPABASE NÃO EXISTEM MAIS NESTE ARQUIVO! 
    // ESTAMOS 100% PROTEGIDOS PELA API DA VERCEL.
    // -------------------------------------------------------------

    try {
        // 2. Consulta direcionada ao nosso "Guarda-Costas" (API do Vercel remotamente do Github Pages)
        const encodedProtocol = encodeURIComponent(protocoloDigitado);
        
        // Chamando o link absoluto onde nossa API Backend está hospedada agora!
        // E enviando o token de segurança Anti-Robô no cabeçalho
        const resProxy = await fetch(`https://api-consultaprotocolo.vercel.app/api/consultar?protocolo=${encodedProtocol}`, { 
            method: 'GET',
            headers: {
                'X-Turnstile-Token': cfToken
            }
        });

        if (resProxy.status === 429) {
            exibirResultado(`⚠️ <b>Limite de consultas atingido.</b><br><small>Você realizou muitas buscas em pouco tempo. Por favor, aguarde cerca de 1 minuto e tente novamente.</small>`, "warning");
            return;
        }

        if (!resProxy.ok) {
            throw new Error("Erro de comunicação com o servidor seguro Vercel.");
        }

        // O Proxy da Vercel já fez todo o trabalho sujo de buscar nas duas tabelas
        const todosResultados = await resProxy.json();

        if (todosResultados.length === 0) {
            exibirResultado(`⚠️ Nenhum processo localizado para o protocolo: <b>${protocoloDigitado}</b>.<br><small>Verifique se o código foi digitado corretamente. Em caso de dúvidas, procure a sua unidade escolar.</small>`, "warning");
            return;
        }

        // --- LÓGICA DE DEDUPLICAÇÃO ---
        // (Agrupa apenas em caso de duplicação do mesmo tema, embora os IDs sejam únicos)
        const temasUnicos = new Map();
        
        todosResultados.forEach(p => {
            const temaKey = (p.tema || "OUTROS").toUpperCase().trim();
            if (!temasUnicos.has(temaKey)) {
                temasUnicos.set(temaKey, p);
            }
        });
        const resultadosFiltrados = Array.from(temasUnicos.values());

        // Limpar área para novos cards premium
        resultadoArea.innerHTML = "";
        resultadoArea.className = "mt-4 row g-4";

        const formatarDataLocal = (str) => {
            if (!str) return null;
            const partes = str.split('T')[0].split('-');
            return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : null;
        };

        // --- PREPARAÇÃO DA FILA VTC UNIFICADA (Apenas 1 Request) ---
        // Verificamos se há algum processo VTC "Em Andamento/Análise" nos resultados antes de buscar a fila inteira.
        const temVTCAtivo = resultadosFiltrados.some(p => {
            const tema = (p.tema || "").toUpperCase();
            const stLower = (p.status || "").toLowerCase();
            const obs = (p.observacoes || "").toLowerCase();
            return tema.includes("VTC") && 
                   !obs.includes("finalizado") && 
                   !obs.includes("analise concluida") && 
                   !obs.includes("devolvido") &&
                   !obs.includes("não faz jus") &&
                   !obs.includes("nao faz jus");
        });

        // A fila global agora é calculada nativamente pela API Vercel no Backend para máxima segurança.

        // 3. Renderização Premium
        for (const processo of resultadosFiltrados) {
            const tema = (processo.tema || "Processo").toUpperCase();
            const statusReal = (processo.status || "em analise").toLowerCase();
            const observacao = processo.observacoes || "";
            const interessado = (processo.nome || "Não informado").toUpperCase();
            const protocolo = processo.protocolo || "N/D";
            const escola = (processo.escola || "").toUpperCase();
            // Formatação de Datas
            const dataEntrada = formatarDataLocal(processo.data_entrada);
            const dataSaida = formatarDataLocal(processo.data_saida);

            const isVTC = tema.includes("VTC");
            const isQuinquenio = tema.includes("QUINQUÊNIO") || tema.includes("QUINQUENIO");
            const isContagemTempo = tema.includes("CONTAGEM");

            let obsLimpa = (observacao || "").trim();
            const obsLower = obsLimpa.toLowerCase();

            let isRealmenteDevolvido = false;
            let isNaoFazJus = false;
            let isAbono = false;
            let isAposentadoria = false;
            let isEmAnaliseVTC = false;

            if (isVTC) {
                const temFinalizado = obsLower.includes("finalizado") || obsLower.includes("finalizada");
                const temPendencia = obsLower.includes("falta") || obsLower.includes("correção") || obsLower.includes("pendente") || obsLower.includes("regularização") || obsLower.includes("devolvido para correção");
                const temConcluido = obsLower.includes("concluido") || obsLower.includes("concluida");
                
                if (obsLower.includes("não faz jus") || obsLower.includes("nao faz jus")) {
                    isNaoFazJus = true;
                } else if (temFinalizado || temConcluido) {
                    if (obsLower.includes("aposentadoria")) isAposentadoria = true;
                    else if (obsLower.includes("abono")) isAbono = true;
                    else if (!temPendencia) isAposentadoria = true;
                }
                
                if (!isNaoFazJus && !isAbono && !isAposentadoria && (temPendencia || obsLower.includes("devolvido"))) {
                    isRealmenteDevolvido = true;
                }

                // Identifica se é o caso exato de "Em analise" puro que o usuário quer ver a fila
                if (!isNaoFazJus && !isAbono && !isAposentadoria && !isRealmenteDevolvido) {
                    isEmAnaliseVTC = true;
                }
            }

            // Definindo a cor e ícone baseando-se no STATUS
            const stLower = (processo.status || "").toLowerCase();
            const isEmAndamentoStatus = stLower.includes("análise") || stLower.includes("analise") || stLower.includes("andamento") || stLower.includes("exigencia") || stLower.includes("exigência") || stLower.includes("atendendo");

            let classeCorLateral = isEmAndamentoStatus ? "border-left-warning" : "border-left-primary";
            let corBadge = isEmAndamentoStatus ? "bg-warning text-dark" : "bg-primary";
            let iconeBadge = isEmAndamentoStatus ? "bi-hourglass-split" : "bi-activity";
            let statusDisplay = (processo.status || "EM ANÁLISE").toUpperCase();

            // Override finalizado, devolvido, nao faz jus
            if (stLower.includes("finalizado") || stLower.includes("concluido") || stLower.includes("concluída") || stLower.includes("concluído")) {
                classeCorLateral = "border-left-success";
                corBadge = "bg-success";
                iconeBadge = "bi-check-circle-fill";
                statusDisplay = "FINALIZADO";
            } else if (stLower.includes("devolvido") || stLower.includes("correção") || stLower.includes("correcao") || stLower.includes("pendente") || isRealmenteDevolvido) {
                classeCorLateral = "border-left-warning"; // Original era Amarelo (Warning) e não Danger
                corBadge = "bg-warning text-dark";
                iconeBadge = "bi-arrow-return-left";
                statusDisplay = "DEVOLVIDO / PENDÊNCIA";
            } else if (stLower.includes("não faz jus") || stLower.includes("nao faz jus") || stLower.includes("indeferido") || isNaoFazJus) {
                classeCorLateral = "border-left-danger"; // Original era Vermelho (Danger) e não Dark
                corBadge = "bg-danger";
                iconeBadge = "bi-x-circle-fill";
                statusDisplay = "NÃO FAZ JUS";
            }
            
            // Fix para separar a cor pura do Bootstrap ('primary', 'warning', etc)
            const nomeCorBase = corBadge.replace('bg-', '').replace(' text-dark', '');

            // Exibição da Unidade Escolar ou Setor
            let exibicaoEscola = escola || "SUA UNIDADE ESCOLAR";
            if (isEmAndamentoStatus && processo.origem) {
                exibicaoEscola = `<span class="fw-bold text-primary">SETOR DE ANÁLISE: ${processo.origem}</span>`;
            }

            // Lógica de Protocolo vs SEI vs DOE
            let exibicaoProtocoloOuSEI = `<span>PROTOCOLO: <span class="text-primary">${protocolo}</span></span>`;
            let exibicaoDataDOE = "";
            let temDOE = false;

            const isLicenca = tema.includes("LICENÇA") || tema.includes("LICENCA");
            const isEvolucao = tema.includes("EVOLUÇÃO") || tema.includes("EVOLUCAO");

            if (isLicenca || isEvolucao) {
                exibicaoProtocoloOuSEI = `<span>NÚMERO DO SEI: <span class="text-${corBadge.replace('bg-', '')}">${protocolo}</span></span>`;
            }

            if (tema.includes("APOSENTADORIA")) {
                // Regex aprimorada para aceitar tanto descrições longas quanto apenas "DOE" seguido de pontuações opcionais e a data
                const regexDOE = /(?:PUBLICAÇÃO EM DOE|PUBLICACAO EM DOE|DOE)[\s\-,:]*([\d]{2}\/[\d]{2}\/[\d]{4})/i;
                const match = obsLimpa.match(regexDOE);
                if (match && match[1]) {
                    // Estilo Opção 1 (Cinza Escuro Neutro)
                    exibicaoDataDOE = `<span class="mx-2 text-muted fw-normal">|</span><span class="text-secondary"><i class="bi bi-newspaper me-1"></i> PUBLICAÇÃO EM DOE: <span class="fw-bold text-dark">${match[1]}</span></span>`;
                    temDOE = true;
                }
            }

            let linhaDatas = "";
            if (dataEntrada) {
                linhaDatas += `<span class="mx-2 text-muted fw-normal">|</span><span>ENTRADA: <span class="text-secondary fw-normal">${dataEntrada}</span></span>`;
            }
            if (dataSaida && !temDOE) {
                linhaDatas += `<span class="mx-2 text-muted fw-normal">|</span><span>SAÍDA: <span class="text-secondary fw-normal">${dataSaida}</span></span>`;
            }
            linhaDatas += exibicaoDataDOE;

            // --- LÓGICA DE FILA (AGORA VINDO PRONTA DO BACKEND VERCEL) ---
            let infoFilaHtml = "";

            if (isEmAnaliseVTC && processo._posicaoFila) {
                const posicaoReal = processo._posicaoFila;
                const diasEst = processo._diasEstimados || 60;
                
                const dataPrevisao = new Date();
                dataPrevisao.setDate(dataPrevisao.getDate() + diasEst);
                const dd = String(dataPrevisao.getDate()).padStart(2, '0');
                const mm = String(dataPrevisao.getMonth() + 1).padStart(2, '0');
                const yy = String(dataPrevisao.getFullYear()).slice(-2);
                const dataFormatada = `${dd}/${mm}/${yy}`;
                    
                    infoFilaHtml = `
                    <div class="mt-2 text-start">
                        <div class="d-inline-flex align-items-center bg-warning bg-opacity-25 border border-warning border-opacity-50 rounded-pill px-3 py-1 mb-1" style="font-size: 0.75rem;">
                            <span class="text-dark fw-bold me-3"><i class="bi bi-people-fill me-1"></i> POSIÇÃO NA FILA: ${posicaoReal}º</span>
                            <span class="text-dark fw-bold"><i class="bi bi-calendar-event me-1"></i> PREVISÃO: ${dataFormatada}</span>
                        </div>
                        <div class="text-muted ms-1" style="font-size: 0.65rem; max-width: 90%;">
                            <i class="bi bi-info-circle"></i> A previsão pode sofrer alterações pontuais conforme o aumento da demanda do setor.
                        </div>
                    </div>
                    `;
            }

            const colCard = document.createElement("div");
            colCard.className = "col-12 animate__animated animate__zoomIn";

            let conteudoCard = `
                <!-- Alerta de Demanda para Quinquenio e Contagem de Tempo -->
                ${isQuinquenio || isContagemTempo ? `
                <div class="alert border-0 shadow-sm mb-3 text-start" style="background-color: #fff4e5; border-radius: 12px;">
                    <div class="d-flex">
                        <i class="bi bi-info-circle-fill me-2 fs-5 text-warning"></i>
                        <div class="small text-dark mt-1">
                            <b>Aviso Legal (LC 173/2020):</b> Devido ao recente descongelamento do tempo de serviço, há uma alta demanda de processos de Contagem de Tempo e Quinquênio. Agradecemos a compreensão.
                        </div>
                    </div>
                </div>
                ` : ""}

                <div class="card border-0 mb-4 mx-auto shadow-sm text-start w-100" style="border-radius: 12px; ${classeCorLateral.replace('border-left', 'border-left:')} !important;">
                    <div class="card-body p-4 position-relative">
                        <span class="badge ${corBadge} position-absolute top-0 end-0 m-3 px-3 py-2 rounded-pill shadow-sm" style="font-size: 0.75rem;">
                            <i class="bi ${iconeBadge}"></i> ${statusDisplay}
                        </span>
                        
                        <h5 class="fw-bold mb-0 text-dark" style="text-transform: uppercase; letter-spacing: 0.5px; font-size: 1.25rem;">${interessado}</h5>
                        
                        <div class="d-flex align-items-center flex-wrap pt-1 mb-1 fw-bold" style="font-size: 0.8rem; color: #868e96; letter-spacing: 0.2px;">
                            <span class="badge bg-light text-secondary border border-secondary-subtle me-2" style="font-size: 0.70rem; letter-spacing: 0.5px;">TEMA: ${tema}</span>
                            ${exibicaoProtocoloOuSEI}
                            ${linhaDatas}
                        </div>
                        
                        ${infoFilaHtml}
                        
                        <div class="d-flex justify-content-between align-items-center flex-wrap pt-3 mt-2 border-top" style="border-top-color: #f1f3f5 !important;">
                            <p class="mb-0 d-flex align-items-center" style="font-size: 0.85rem; color: #6c757d; letter-spacing: 0.2px;">
                                <i class="bi bi-building me-2 fs-5"></i> ${exibicaoEscola}
                            </p>
                            <button class="collapsed mt-2 mt-sm-0 shadow-sm btn-detalhes" type="button" data-bs-toggle="collapse" data-bs-target="#collapseDetalhe_${processo.id}" aria-expanded="false" style="background: none; border: 1px solid #e9ecef; color: #495057; font-weight: 500; font-size: 0.85rem; padding: 6px 14px; border-radius: 50px; display: inline-flex; align-items: center; cursor: pointer; transition: all 0.2s ease; background-color: #f8f9fa;">
                                Detalhes do Processo <i class="bi bi-chevron-down" style="margin-left: 6px; font-size: 1rem; color: #adb5bd; transition: transform 0.3s ease;"></i>
                            </button>
                        </div>

                        <div class="collapse mt-3" id="collapseDetalhe_${processo.id}">
                            ${isRealmenteDevolvido ? `
                                <div class="p-3 shadow-sm border-warning-subtle bg-warning-subtle bg-opacity-10" style="border-radius: 8px; border: 1px solid #dee2e6;">
                                    <h6 class="fw-bold text-warning-emphasis mb-2" style="font-size: 0.9rem;"><i class="bi bi-exclamation-triangle-fill me-1"></i> Processo Analisado, mas devolvido para correções.</h6>
                                    <p class="small text-dark mb-2" style="line-height: 1.6;">Olá! O seu processo chegou ao nosso setor no dia <strong>${dataEntrada || '---'}</strong> e informamos que ele já foi totalmente analisado pelo <strong>Responsável pela Emissão de VTC</strong>.</p>
                                    <p class="small text-dark mb-2" style="line-height: 1.6;">Durante a conferência, constatamos algumas pendências ou inconsistências nos documentos enviados. Por isso, no dia <strong>${dataSaida || '---'}</strong>, o seu pedido precisou ser devolvido oficialmente para a sua escola de origem.</p>
                                    <hr style="border-color: rgba(0,0,0,0.1);">
                                    <p class="mb-0 small text-dark" style="line-height: 1.6;"><strong>O que fazer agora?</strong> Por favor, procure a Gerência ou a Secretaria da sua Unidade Escolar. Eles já receberam nossos apontamentos e saberão exatamente quais correções precisam fazer para reenviar o processo.</p>
                                </div>
                            ` : isNaoFazJus ? `
                                <div class="p-3 shadow-sm border-danger-subtle bg-danger-subtle bg-opacity-10" style="border-radius: 8px; border: 1px solid #dee2e6;">
                                    <h6 class="fw-bold text-danger-emphasis mb-2" style="font-size: 0.9rem;"><i class="bi bi-sign-stop-fill me-1"></i> Análise Concluída: Requisitos Não Atingidos no Momento</h6>
                                    <p class="small text-dark mb-2" style="line-height: 1.6;">A sua documentação deu entrada em <strong>${dataEntrada || '---'}</strong> e foi minuciosamente conferida pelo <strong>Responsável pela Emissão de VTC</strong>. O processo foi indeferido na data de <strong>${dataSaida || '---'}</strong>.</p>
                                    <p class="small text-dark mb-0" style="line-height: 1.6;">Embasado na legislação previdenciária vigente do Estado de São Paulo (<strong>Emenda Constitucional nº 49/2020 e Lei Complementar Estadual nº 1.354/2020</strong>), informamos que, na data atual, o(a) servidor(a) <strong>não faz jus</strong> à concessão do benefício pleiteado, pois não atingiu a totalidade dos requisitos legais exigidos por lei.</p>
                                </div>
                            ` : isAbono ? `
                                <div class="p-3 shadow-sm border-info-subtle bg-info-subtle bg-opacity-10" style="border-radius: 8px; border: 1px solid #dee2e6;">
                                    <h6 class="fw-bold text-primary-emphasis mb-2" style="font-size: 0.9rem;"><i class="bi bi-check-all me-1"></i> 1ª Fase Concluída: Validação de Tempo para Abono</h6>
                                    <p class="small text-dark mb-2" style="line-height: 1.6;">Parabéns! O seu tempo de serviço enviado em <strong>${dataEntrada || '---'}</strong> foi validado pelo <strong>Responsável pela Emissão de VTC</strong> no dia <strong>${dataSaida || '---'}</strong>. Você atendeu aos requisitos da <strong>E.C. nº 49/2020 e L.C. nº 1.354/2020</strong> para o Abono de Permanência!</p>
                                    <hr style="border-color: rgba(0,0,0,0.1);">
                                    <p class="mb-0 small text-dark" style="line-height: 1.6;"><strong>Próximos Passos:</strong> O documento que emitimos é apenas a primeira fase e a liberação financeira não é automática. A Gerência da sua Unidade Escolar deve providenciar a documentação para fins de pagamento e encaminhar para inclusão no sistema.</p>
                                </div>
                            ` : isAposentadoria ? `
                                <div class="p-3 shadow-sm border-info-subtle bg-info-subtle bg-opacity-10" style="border-radius: 8px; border: 1px solid #dee2e6;">
                                    <h6 class="fw-bold text-primary-emphasis mb-2" style="font-size: 0.9rem;"><i class="bi bi-check-all me-1"></i> VTC Atualizada: Preparada para Aposentadoria</h6>
                                    <p class="small text-dark mb-2" style="line-height: 1.6;">Informamos que a revisão final do seu tempo de contribuição, solicitada em <strong>${dataEntrada || '---'}</strong>, foi deferida e assinada pelo <strong>Responsável pela Emissão de VTC</strong> no dia <strong>${dataSaida || '---'}</strong>.</p>
                                    <p class="small text-dark mb-2" style="line-height: 1.6;">Sua Validação de Tempo de Contribuição está atualizada, atestando o direito à aposentadoria sob as regras do Estado de São Paulo.</p>
                                    <hr style="border-color: rgba(0,0,0,0.1);">
                                    <p class="mb-0 small text-dark" style="line-height: 1.6;"><strong>Próxima Ação Necessária:</strong> Para que a sua aposentadoria seja publicada em Diário Oficial, procure imediatamente a secretaria da sua Unidade Escolar e formalize o pedido final de concessão (Trâmite de Aposentadoria).</p>
                                </div>
                            ` : `
                                <div class="p-3 shadow-sm border-${nomeCorBase}-subtle bg-${nomeCorBase}-subtle bg-opacity-10" style="border-radius: 8px; border: 1px solid #dee2e6;">
                                    <h6 class="fw-bold text-${nomeCorBase}-emphasis mb-2" style="font-size: 0.9rem;"><i class="bi bi-chat-left-text-fill me-1"></i> OBSERVAÇÃO:</h6>
                                    <p class="small text-dark mb-0" style="line-height: 1.6;">
                                        <i>"${obsLimpa || 'Sem detalhes adicionais disponíveis.'}"</i>
                                    </p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            `;

            colCard.innerHTML = conteudoCard;
            resultadoArea.appendChild(colCard);
        }

    } catch (error) {
        console.error("Erro na consulta unificada:", error);
        exibirResultado("❌ Falha na conexão com os servidores. Tente novamente.", "danger");
    }
}

function exibirResultado(mensagem, tipo) {
    let resultado = document.getElementById("resultadoProcesso");
    resultado.className = `mt-4 p-3 rounded bg-${tipo}-subtle text-${tipo}-emphasis border-start border-4 border-${tipo === 'light' ? 'primary' : tipo} shadow-sm`;
    resultado.innerHTML = mensagem;
}




/* GERAR REQUERIMENTO WORD (.DOC) E INICIAR PROTOCOLO .NET */

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

        // 3. Envio para a API C# (.NET)
        try {
            const respostaNET = await fetch('/api/Email/enviar', {
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

            const resultado = await respostaNET.json();

            if (!resultado.sucesso) {
                throw new Error(resultado.mensagem || "Falha lógica.");
            }
            protocoloGerado = resultado.protocolo; // Pegamos o REQ gerado na API

        } catch (erroFetch) {
            console.warn("⚠️ Servidor API inacessível. Entrando em Modo Local/Offline.", erroFetch);
            isOffline = true;

            // Geração de protocolo manual para o modo offline
            const d = new Date();
            const pad = (n) => n.toString().padStart(2, '0');
            protocoloGerado = `REQ-OFF-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
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
        geral: { feminino: { inicio: 86, limite: 100 }, masculino: { inicio: 96, limite: 105 } },
        professor: { feminino: { inicio: 81, limite: 92 }, masculino: { inicio: 91, limite: 100 } }
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
            feminino: { idadeMin: 57, contrib: 30, idadePedagio: 57, contribPedagio: 30, servPublico: 20, cargo: 5 }
        },
        professor: {
            masculino: { idadeMin: 57, contrib: 30, idadePedagio: 55, contribPedagio: 30, servPublico: 20, cargo: 5 },
            feminino: { idadeMin: 52, contrib: 25, idadePedagio: 52, contribPedagio: 25, servPublico: 20, cargo: 5 }
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
