const url = "https://fdcxcuyxrgbpmcrryiof.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkY3hjdXl4cmdicG1jcnJ5aW9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTk5NTMsImV4cCI6MjA4OTY5NTk1M30.AGRudVkfcFNGTftdV02NA3Xz6Xs1WzYruqCWLVnF-Rw";

async function consultar() {
    console.log("=============================================================");
    console.log("🔍 TESTE DE PESQUISA (SISTEMA DE CONSULTA PÚBLICA)");
    console.log("=============================================================\n");

    try {
        console.log("➤ CIDADÃO DIGITA NA BARRA DE BUSCA: 'JOAO'");
        const s1 = await fetch(`${url}/rest/v1/seape_registros?nome=ilike.*JOAO*&select=*`, {
            headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` } 
        });
        const d1 = await s1.json();
        
        if (d1.length > 0) {
           console.log(`   ✅ O BANCO RETORNOU ${d1.length} PROCESSO(S):`);
           d1.forEach((joao, i) => {
               console.log(`      [${i+1}] Nome: ${joao.nome}`);
               console.log(`          Tema: ${joao.tema}`);
               console.log(`          Status: ${joao.status}`);
               console.log(`          Entrada: ${joao.data_entrada}\n`);
           });
        } else {
            console.log(`   ⚠ Nada de Joao na tabela SEAPE!\n`);
        }

        console.log("➤ CIDADÃO DIGITA NA BARRA DE BUSCA: 'MARIA'");
        const s2 = await fetch(`${url}/rest/v1/sefrep_registros?nome=ilike.*MARIA*&select=*`, {
            headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
        });
        const d2 = await s2.json();
        
        if (d2.length > 0) {
           console.log(`   ✅ O BANCO RETORNOU ${d2.length} PROCESSO(S):`);
           d2.forEach((maria, i) => {
               console.log(`      [${i+1}] Nome: ${maria.nome}`);
               console.log(`          Tema: ${maria.tema}`);
               console.log(`          Observação: ${maria.observacoes || "Nenhuma"}`);
               console.log(`          Status: ${maria.status}\n`);
           });
        } else {
            console.log(`   ⚠ Nenhuma Maria na tabela SEFREP!\n`);
        }

        console.log("=============================================================");
        console.log("🚀 SUCESSO ABSOLUTO! O CÓDIGO DA CONSULTA ESTÁ LENDO O BANCO!");
    } catch (e) {
        console.log("Erro:", e);
    }
}
consultar();
