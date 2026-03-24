const SUPABASE_URL = "https://fdcxcuyxrgbpmcrryiof.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkY3hjdXl4cmdicG1jcnJ5aW9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTk5NTMsImV4cCI6MjA4OTY5NTk1M30.AGRudVkfcFNGTftdV02NA3Xz6Xs1WzYruqCWLVnF-Rw";

async function testar() {
    console.log("Testando acesso direto a tabela sefrep_registros...");
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/sefrep_registros?select=nome,protocolo&limit=2`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!res.ok) {
            console.log("Bloqueado ou Erro HTTP:", res.status);
            const err = await res.text();
            console.log(err);
        } else {
            const data = await res.json();
            if (data.length > 0) {
                console.log("VULNERÁVEL: Conseguiu ler", data.length, "registros sem protocolo secreto.");
                console.log("Exemplo:", JSON.stringify(data));
            } else {
                console.log("SEGURO ou VAZIO: Nenhuma linha retornada. Se há dados no banco, o RLS bloqueou o acesso aberto.");
            }
        }
    } catch (e) {
        console.error("Erro no fetch", e);
    }
}
testar();
