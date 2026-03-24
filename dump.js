const u = 'https://fdcxcuyxrgbpmcrryiof.supabase.co';
const k = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkY3hjdXl4cmdicG1jcnJ5aW9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTk5NTMsImV4cCI6MjA4OTY5NTk1M30.AGRudVkfcFNGTftdV02NA3Xz6Xs1WzYruqCWLVnF-Rw';
Promise.all([
    fetch(u+'/rest/v1/seape_registros?select=*',{headers:{apikey:k}}).then(r=>r.json()),
    fetch(u+'/rest/v1/sefrep_registros?select=*',{headers:{apikey:k}}).then(r=>r.json())
]).then(d=>{
    require('fs').writeFileSync('out.json', JSON.stringify(d, null, 2));
    console.log("DONE");
});
