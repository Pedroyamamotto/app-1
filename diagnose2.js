import fetch from 'node-fetch';

const API_BASE_URL = 'https://api-bling-990709313938.us-central1.run.app';

async function run() {
    const res = await fetch(`${API_BASE_URL}/api/admin/services?limit=5`, {
        headers: { 'x-user-type': 'admin' }
    });
    const data = await res.json();
    const services = data.services || data.servicos || [];
    console.log(JSON.stringify(services.map(s => ({
        id: s.id,
        tecnico: s.tecnico,
        tecnico_id: s.tecnico_id,
        tecnicoId: s.tecnicoId,
        nome_tecnico: s.nome_tecnico,
        tecnico_nome: s.tecnico_nome,
        cliente: s.cliente
    })), null, 2));
}

run();
