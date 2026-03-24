const strStatusList = [
    "Em Análisé", 
    "em andamento", 
    "ATENDENDO EXIGENCIA", 
    "Atendimento de Exigência", 
    "Concluído", 
    "finalizado", 
    "Devolvido para Correção"
];

console.log("=========================================================================");
console.log("🧪 TESTE AUTOMATIZADO DOS AGRUPAMENTOS DE STATUS VISUAIS DO NOVO SISTEMA");
console.log("=========================================================================\n");

for (const status of strStatusList) {
    const stLower = status.toLowerCase();
    
    // Simulação exata da lógica injetada no script.js
    const isEmAndamentoStatus = stLower.includes("análise") || stLower.includes("analise") || stLower.includes("andamento") || stLower.includes("exigencia") || stLower.includes("exigência") || stLower.includes("atendendo") || stLower.includes("análisé");

    let corCorpo = "AZUL [Processo em Avaliação Inicial]";
    let pillLateral = isEmAndamentoStatus ? "🟡 [CARD AMARELO - COM CONTAGEM DE FILA ATIVA]" : "🔵 [CARD AZUL - AVALIAÇÃO RECENTE]";
    let statusDisplay = status;

    if (stLower.includes("finalizado") || stLower.includes("concluido") || stLower.includes("concluída") || stLower.includes("concluído")) {
        pillLateral = "🟢 [CARD VERDE - STATUS FINALIZADO]";
        statusDisplay = "FINALIZADO";
        corCorpo = "VERDE CLARO [Sucesso]";
    } else if (stLower.includes("devolvido") || stLower.includes("correção") || stLower.includes("correcao") || stLower.includes("pendente")) {
        pillLateral = "🔴 [CARD VERMELHO - RETORNO DE PENDÊNCIA]";
        statusDisplay = "DEVOLVIDO / PENDÊNCIA";
        corCorpo = "VERMELHO CLARO [Aviso Crítico]";
    } else if (stLower.includes("não faz jus") || stLower.includes("nao faz jus") || stLower.includes("indeferido")) {
        pillLateral = "⚫ [CARD PRETO - NÃO FAZ JUS]";
        statusDisplay = "NÃO FAZ JUS";
        corCorpo = "CINZA ESCURO [Reprovado]";
    }

    console.log(`👉 Inserção no Supabase:  "${status}"`);
    console.log(`   └─ Vai Ficar:          ${pillLateral}`);
    console.log(`   └─ Texto Superior:     ${statusDisplay.toUpperCase()}`);
    console.log(`   ----------------------------------------------------------------------`);
}
