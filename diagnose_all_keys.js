
const API_BASE_URL = 'https://apibling-z8wn.onrender.com';
const ADMIN_API_KEY = 'ak_live_2026_Yama_9rT4mN7qX2pL6vK1';

async function diagnose() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/services?limit=50`, {
      headers: { 'x-admin-key': ADMIN_API_KEY }
    });
    const data = await res.json();
    const services = data.services || [];
    
    console.log('Total services fetched:', services.length);
    const allKeys = new Set();
    services.forEach(s => Object.keys(s).forEach(k => allKeys.add(k)));
    console.log('All available keys:', Array.from(allKeys).join(', '));
    
    services.forEach((s, i) => {
      if (!s.cliente || s.cliente === "" || s.cliente === "-") {
         console.log(`Service ${i} (${s.id}) HAS EMPTY CLIENT. Fields:`);
         Object.keys(s).forEach(k => {
            if (s[k] && s[k] !== "" && s[k] !== "0" && !k.toLowerCase().includes('foto') && !k.toLowerCase().includes('assinatura')) {
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
