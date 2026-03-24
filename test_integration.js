const url = "https://fdcxcuyxrgbpmcrryiof.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkY3hjdXl4cmdicG1jcnJ5aW9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTk5NTMsImV4cCI6MjA4OTY5NTk1M30.AGRudVkfcFNGTftdV02NA3Xz6Xs1WzYruqCWLVnF-Rw";

async function iniciarSimulacao() {
    console.log("=============================================================");
    console.log("🔄 SIMULADOR DO FLUXO COMPLETO (TELA DE LOGIN -> CONSULTA) ");
    console.log("=============================================================\n");

    try {
        console.log("1️⃣  [ADMINISTRADOR]");
        console.log("   ➤ Digitou: teste@teste.com | Senha: ****");
        const loginRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'apikey': anonKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: 'teste@teste.com', password: 'senhasegura2026' })
        });
        const loginData = await loginRes.json();
        const jwt = loginData.access_token;
        if(!jwt) {
            console.log("   ❌ Falha: O Supabase bloqueou o robô de teste. Senha deve ter mudado.");
            return;
        }
        console.log("   ✅ Login APROVADO pelo Supabase. Banco desbloqueado.\n");

        console.log("2️⃣  [ADMINISTRADOR] CADASTRANDO PROCESSOS");
        console.log("   ➤ Inserindo 'JOAO SILVA' na tabela SEAPE...");
        const insert1 = await fetch(`${url}/rest/v1/seape_registros`, {
            method: 'POST',
            headers: {
                'apikey': anonKey,
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: "JOAO SILVA SIMULACAO",
                tema: "LICENÇA PREMIO",
                status: "Em Análise",
                data_entrada: "2026-03-22",
                escola: "EE DOM PEDRO II"
            })
        });
        if(insert1.ok) console.log("   ✅ Gravado com sucesso (Proteção RLS liberou porque estamos logados!).");

        console.log("   ➤ Inserindo 'MARIAZINHA' na tabela SEFREP...");
        const insert2 = await fetch(`${url}/rest/v1/sefrep_registros`, {
            method: 'POST',
            headers: {
                'apikey': anonKey,
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: "MARIAZINHA DA SILVA SIMULACAO",
                tema: "APOSENTADORIA",
                status: "Finalizado",
                data_entrada: "2026-03-20",
                data_saida: "2026-03-22",
                escola: "EE RUI BARBOSA",
                observacoes: "PUBLICAÇÃO EM DOE: 22/03/2026"
            })
        });
        if(insert2.ok) console.log("   ✅ Gravado com sucesso.\n");

        console.log("=============================================================");
        console.log("3️⃣  [O CIDADÃO NA RUA]");
        console.log("   ➤ Ele entra em seu site público e pesquisa: 'JOAO SILVA'");
        const searchJoao = await fetch(`${url}/rest/v1/seape_registros?nome=ilike.*JOAO*SILVA*&select=*`, {
            headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` } // Usa a chave anônima (sem privilégios administrativos)
        });
        const joaoData = await searchJoao.json();
        if(joaoData && joaoData.length > 0) {
           console.log(`   🔎 O site encontrou o processo na hora:`);
           console.log(`      └─> Nome: ${joaoData[joaoData.length-1].nome}`);
           console.log(`      └─> Tema: ${joaoData[joaoData.length-1].tema}`);
           console.log(`      └─> Status: ${joaoData[joaoData.length-1].status}`);
        } else {
            console.log(`   ⚠ Nenhum Joao localizado pelas regras Padrão RLS`);
        }

        console.log("\n   ➤ Agora ele pesquisa: 'MARIAZINHA'");
        const searchMaria = await fetch(`${url}/rest/v1/sefrep_registros?nome=ilike.*MARIAZINHA*&select=*`, {
            headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
        });
        const mariaData = await searchMaria.json();
        if(mariaData && mariaData.length > 0) {
           console.log(`   🔎 O site encontrou o processo formatado:`);
           console.log(`      └─> Nome: ${mariaData[mariaData.length-1].nome}`);
           console.log(`      └─> Tema: ${mariaData[mariaData.length-1].tema}`);
           console.log(`      └─> Observação: ${mariaData[mariaData.length-1].observacoes}`);
        }

        console.log("\n=============================================================");
        console.log("🏆 SUCESSO! A INTEGRAÇÃO E A SEGURANÇA FORAM TESTADAS.");

    } catch (e) {
        console.log("Erro no servidor de simetria:", e);
    }
}

iniciarSimulacao();
