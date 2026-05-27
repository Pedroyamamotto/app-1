
const API_BASE_URL = 'https://api-bling-990709313938.us-central1.run.app';
const ADMIN_API_KEY = 'ak_live_2026_Yama_9rT4mN7qX2pL6vK1';

async function diagnose() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/services?limit=100`, {
      headers: { 'x-admin-key': ADMIN_API_KEY }
    });
    const data = await res.json();
    const services = data.services || [];
    
    console.log('Total services fetched:', services.length);
    
    services.forEach((s, i) => {
      // Procurar serviços que tenham telefone ou endereço mas SEM nome
      const hasPhone = s.telefone && s.telefone !== "";
      const hasAddr = s.endereco && s.endereco !== "";
      const hasNoName = !s.cliente || s.cliente === "" || s.cliente === "-";
      
      if (hasNoName && (hasPhone || hasAddr)) {
         console.log(`Service index ${i} ID ${s.id} has INFO but NO NAME. All Fields:`);
         Object.keys(s).forEach(k => {
            if (s[k] && s[k] !== "" && !k.toLowerCase().includes('foto')) {
               console.log(`  ${k}: ${s[k]}`);
            }
         });
      }
    });

  } catch (e) {
    console.error(e);
  }
}

diagnose();
