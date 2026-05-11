const apiBase = '/api';
let coletas = [];
let dashboards = {};
let logisticsMap;
let dashboardMap;
let pontosColeta = [];
let rotaInicialLayer = null;
let rotaOtimizadaLayer = null;
let rotaOtimizadaMarkers = null;
let currentListPage = 1;
const itemsPerPage = 5;

function apiFetch(path, options = {}) {
    return fetch(`${apiBase}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    }).then(async response => {
        const data = await response.text();
        let json = null;
        try { json = data ? JSON.parse(data) : null; } catch (err) { }
        if (!response.ok) {
            throw new Error(json?.message || 'Erro ao acessar o servidor');
        }
        return json;
    });
}

function mostrarMensagem(texto, tipo = 'success') {
    const mensagem = document.getElementById('mensagem');
    const classe = tipo === 'error' ? 'alert' : 'alert';
    mensagem.innerHTML = `<div class="${classe}" style="white-space: pre-wrap; line-height: 1.6;">${texto}</div>`;
    setTimeout(() => { mensagem.innerHTML = ''; }, 6000);
}

async function buscarColetas() {
    try {
        coletas = await apiFetch('/coletas');
        carregarColetas();
        atualizarDashboard();
        carregarEstatisticas();
    } catch (error) {
        console.error(error);
        mostrarMensagem('Não foi possível conectar ao servidor. Abra o projeto pelo Node.js.', 'error');
    }
}

function abrirLogistica() {
    document.getElementById('main-page').style.display = 'none';
    document.getElementById('logistics-page').style.display = 'block';
    setTimeout(() => {
        if (logisticsMap) logisticsMap.invalidateSize();
    }, 200);
}

function voltarDashboard() {
    document.getElementById('logistics-page').style.display = 'none';
    document.getElementById('main-page').style.display = 'block';
    setTimeout(() => {
        if (dashboardMap) dashboardMap.invalidateSize();
    }, 200);
}

function abrirRelatorioFrota() {
    document.getElementById('fleetReportModal').style.display = 'flex';
}

function fecharRelatorioFrota() {
    document.getElementById('fleetReportModal').style.display = 'none';
}

function abrirRelatorioRotas() {
    document.getElementById('routeResultModal').style.display = 'flex';
}

function fecharRelatorioRotas() {
    document.getElementById('routeResultModal').style.display = 'none';
}

function showSection(sectionId) {
    document.querySelectorAll('.section-page').forEach(section => {
        section.classList.toggle('active', section.id === `section-${sectionId}`);
    });
    document.querySelectorAll('.page-btn').forEach(button => {
        button.classList.toggle('active', button.dataset.section === sectionId);
    });

    if (sectionId === 'rotas' && logisticsMap) {
        setTimeout(() => {
            logisticsMap.invalidateSize();
        }, 200);
    }
}

function setListPage(page) {
    const totalPages = Math.max(1, Math.ceil(coletas.length / itemsPerPage));
    if (page < 1 || page > totalPages) return;
    currentListPage = page;
    carregarColetas();
}

function renderListPagination() {
    const pagination = document.getElementById('listaPagination');
    if (!pagination) return;
    const totalPages = Math.max(1, Math.ceil(coletas.length / itemsPerPage));
    pagination.innerHTML = `
        <button class="btn btn-secondary" onclick="setListPage(${currentListPage - 1})" ${currentListPage === 1 ? 'disabled' : ''}>◀ Anterior</button>
        <span>Página ${currentListPage} de ${totalPages}</span>
        <button class="btn btn-secondary" onclick="setListPage(${currentListPage + 1})" ${currentListPage === totalPages ? 'disabled' : ''}>Próxima ▶</button>
    `;
}

function carregarColetas() {
    const lista = document.getElementById('lista');
    lista.innerHTML = '';
    const start = (currentListPage - 1) * itemsPerPage;
    const pageItems = coletas.slice(start, start + itemsPerPage);
    if (pageItems.length === 0 && currentListPage > 1) {
        currentListPage = 1;
        return carregarColetas();
    }
    pageItems.forEach(coleta => {
        let classe = 'pendente';
        if (coleta.status === 'Em Rota') classe = 'rota';
        if (coleta.status === 'Concluído') classe = 'concluido';
        lista.innerHTML += `
            <div class="item">
                <h3>${coleta.nome}</h3>
                <p>${coleta.endereco}</p>
                <p>${coleta.tipo}</p>
                <p>${coleta.data}</p>
                <span class="status-pill ${classe}">${coleta.status}</span>
                <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn" style="flex:1; min-width:120px;" onclick="alterarStatus(${coleta.id}, 'Em Rota')">Em Rota</button>
                    <button class="btn btn-secondary" style="flex:1; min-width:120px;" onclick="alterarStatus(${coleta.id}, 'Concluído')">Concluir</button>
                </div>
            </div>`;
    });
    renderListPagination();
}

async function alterarStatus(id, status) {
    try {
        await apiFetch(`/coletas/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        await buscarColetas();
        mostrarMensagem('Status atualizado com sucesso.');
    } catch (error) {
        console.error(error);
        mostrarMensagem('Erro ao atualizar status.', 'error');
    }
}

function atualizarDashboard() {
    const total = coletas.length;
    const concluidas = coletas.filter(c => c.status === 'Concluído').length;
    const rota = coletas.filter(c => c.status === 'Em Rota').length;
    const pendente = coletas.filter(c => c.status === 'Pendente').length;
    document.getElementById('totalColetas').innerText = total;
    document.getElementById('coletasConcluidas').innerText = concluidas;
    document.getElementById('coletasRota').innerText = rota;
    document.getElementById('coletasPendentes').innerText = pendente;
    if (dashboards.statusChart) {
        dashboards.statusChart.data.datasets[0].data = [pendente, rota, concluidas];
        dashboards.statusChart.update();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar charts de forma segura
    const createChartIfElement = (elementId, config) => {
        const element = document.getElementById(elementId);
        if (!element) return null;
        return new Chart(element.getContext('2d'), config);
    };

    // Sales Chart
    dashboards.salesChart = createChartIfElement('salesChart', {
        type: 'line',
        data: {
            labels: ['Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar'],
            datasets: [{
                label: 'Vendas (R$ mil)',
                data: [32, 38, 42, 48, 50, 52],
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.12)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } }
        }
    });

    // Purchases Chart
    dashboards.purchasesChart = createChartIfElement('purchasesChart', {
        type: 'bar',
        data: {
            labels: ['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev'],
            datasets: [{
                label: 'Orçamentos (R$ mil)',
                data: [12, 15, 14, 16, 17, 18],
                backgroundColor: '#ff9800',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } }
        }
    });

    // Production Chart
    dashboards.productionChart = createChartIfElement('productionChart', {
        type: 'line',
        data: {
            labels: ['06h', '08h', '10h', '12h', '14h', '16h'],
            datasets: [{
                label: 'Toneladas Produzidas',
                data: [5, 12, 18, 25, 35, 42],
                borderColor: '#2196f3',
                backgroundColor: 'rgba(33, 150, 243, 0.12)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } }
        }
    });

    // Inventory Chart
    dashboards.inventoryChart = createChartIfElement('inventoryChart', {
        type: 'doughnut',
        data: {
            labels: ['Plástico', 'Papelão', 'Vidro', 'Metal', 'Outros'],
            datasets: [{
                data: [5000, 10000, 3000, 2000, 1500],
                backgroundColor: ['#4caf50', '#ff9800', '#2196f3', '#9c27b0', '#607d8b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // Financial Chart
    dashboards.financialChart = createChartIfElement('financialChart', {
        type: 'bar',
        data: {
            labels: ['Receitas', 'Despesas', 'Lucro'],
            datasets: [{
                label: 'Valores (R$ mil)',
                data: [75, 30, 45],
                backgroundColor: ['#4caf50', '#f44336', '#2196f3'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } }
        }
    });

    // Status Chart
    dashboards.statusChart = createChartIfElement('statusChart', {
        type: 'doughnut',
        data: {
            labels: ['Pendente', 'Em Rota', 'Concluído'],
            datasets: [{
                data: [2, 1, 1],
                backgroundColor: ['#ff9800', '#2196f3', '#4caf50']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // Rota Chart
    dashboards.rotaChart = createChartIfElement('rotaChart', {
        type: 'bar',
        data: {
            labels: ['Rota 1', 'Rota 2', 'Rota 3'],
            datasets: [{
                label: 'KM Médio',
                data: [12, 18, 9],
                backgroundColor: '#1a472a',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } }
        }
    });

    // Inicializar mapas
    const logisticsMapElement = document.getElementById('logistics-map');
    if (logisticsMapElement) {
        dashboardMap = L.map('logistics-map').setView([-23.5505, -46.6333], 12);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> & CartoDB',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(dashboardMap);
        initMapMarkers(dashboardMap);
    }

    const logisticsDetailMapElement = document.getElementById('logistics-detail-map');
    if (logisticsDetailMapElement) {
        logisticsMap = L.map('logistics-detail-map').setView([-23.5505, -46.6333], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(logisticsMap);
        initMapMarkers(logisticsMap);
    }

    buscarColetas();
    showSection('coleta');

    const coletaForm = document.getElementById('coletaForm');
    if (coletaForm) {
        coletaForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const coleta = {
                nome: document.getElementById('nome').value,
                endereco: document.getElementById('endereco').value,
                tipo: document.getElementById('tipo').value,
                data: document.getElementById('data').value
            };

            try {
                await apiFetch('/coletas', {
                    method: 'POST',
                    body: JSON.stringify(coleta)
                });
                mostrarMensagem('✅ Coleta cadastrada com sucesso');
                this.reset();
                await buscarColetas();
            } catch (error) {
                console.error(error);
                mostrarMensagem('Erro ao cadastrar coleta. Verifique o servidor.', 'error');
            }
        });
    }
});

async function carregarEstatisticas() {
    try {
        const stats = await apiFetch('/rotas');
        const kmElement = document.getElementById('kmMedio');
        const tempoElement = document.getElementById('tempoMedio');
        const kmModalElement = document.getElementById('kmMedioModal');
        const tempoModalElement = document.getElementById('tempoMedioModal');
        
        if (kmElement) kmElement.innerText = `${stats.kmMedio} km`;
        if (tempoElement) tempoElement.innerText = `${stats.tempoMedio} min`;
        if (kmModalElement) kmModalElement.innerText = `${stats.kmMedio} km`;
        if (tempoModalElement) tempoModalElement.innerText = `${stats.tempoMedio} min`;
        
        if (dashboards.statusChart) {
            dashboards.statusChart.data.datasets[0].data = [
                stats.statusCounts.pendente,
                stats.statusCounts.emRota,
                stats.statusCounts.concluido
            ];
            dashboards.statusChart.update();
        }
    } catch (error) {
        console.warn('Não foi possível carregar estatísticas:', error.message);
    }
}

function initMapMarkers(map) {
    pontosColeta = [
        { lat: -23.5505, lng: -46.6333, nome: 'Centro de Distribuição', tipo: 'hub' },
        { lat: -23.6000, lng: -46.6500, nome: 'Cliente X - 10T', tipo: 'cliente' },
        { lat: -23.5200, lng: -46.6200, nome: 'Cliente Y - 5T', tipo: 'cliente' },
        { lat: -23.5800, lng: -46.7000, nome: 'Cooperativa Zona Sul', tipo: 'cooperativa' },
        { lat: -23.5000, lng: -46.6000, nome: 'Empresa ABC', tipo: 'cliente' },
        { lat: -23.6200, lng: -46.5800, nome: 'Coleta Zona Leste', tipo: 'coleta' }
    ];

    const hubIcon = L.divIcon({ html: '🏭', iconSize: [30, 30], className: 'custom-icon' });
    const clienteIcon = L.divIcon({ html: '🏢', iconSize: [30, 30], className: 'custom-icon' });
    const coletaIcon = L.divIcon({ html: '♻️', iconSize: [30, 30], className: 'custom-icon' });

    pontosColeta.forEach((ponto) => {
        const marker = L.marker([ponto.lat, ponto.lng], {
            icon: createBasePointIcon(ponto)
        }).bindPopup(`<strong>${ponto.nome}</strong><br>Tipo: ${ponto.tipo}`)
          .addTo(map);
    });

    const rotaPontos = pontosColeta.map(p => [p.lat, p.lng]);
    rotaInicialLayer = L.polyline(rotaPontos, { color: '#4caf50', weight: 4, opacity: 0.85 }).addTo(map);
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML = `
            <strong>Legenda</strong><br>
            🏭 Hub Central<br>
            🏢 Clientes<br>
            ♻️ Pontos de Coleta<br>
            <div class="legend-item"><span class="legend-color legend-origin"></span> Rota padrão</div>
            <div class="legend-item"><span class="legend-color legend-optimized"></span> Rota otimizada</div>
        `;
        return div;
    };
    legend.addTo(map);
}

// Função para calcular distância entre dois pontos (Haversine)
function calcularDistancia(lat1, lng1, lat2, lng2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function getPointEmoji(tipo) {
    if (tipo === 'hub') return '🏭';
    if (tipo === 'cliente') return '🏢';
    if (tipo === 'cooperativa') return '♻️';
    return '📍';
}

function createBasePointIcon(ponto) {
    return L.divIcon({
        className: 'custom-marker-icon',
        html: `
            <div class="marker-with-number">
                <div class="marker-icon">${getPointEmoji(ponto.tipo)}</div>
            </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -34]
    });
}

function createNumberedPointIcon(ponto, number) {
    return L.divIcon({
        className: 'custom-marker-icon',
        html: `
            <div class="marker-with-number minimized">
                <div class="marker-icon optimized-marker">${getPointEmoji(ponto.tipo)}</div>
                <div class="route-label">${number}</div>
            </div>
        `,
        iconSize: [34, 44],
        iconAnchor: [17, 44],
        popupAnchor: [0, -38]
    });
}

// Função para otimizar rotas usando algoritmo Nearest Neighbor
function otimizarRotas() {
    if (pontosColeta.length === 0) {
        mostrarMensagem('Nenhum ponto de coleta disponível.', 'error');
        return;
    }

    // Ponto inicial é o Hub (Centro de Distribuição)
    const hub = pontosColeta[0];
    const pontosVisitaveis = pontosColeta.slice(1); // Todos exceto o hub
    const rotaOtimizada = [hub];
    const visitados = new Set();
    
    // Algoritmo Nearest Neighbor
    let pontoAtual = hub;
    while (visitados.size < pontosVisitaveis.length) {
        let menorDistancia = Infinity;
        let proximoPonto = null;
        let proximoIndice = -1;

        for (let i = 0; i < pontosVisitaveis.length; i++) {
            if (!visitados.has(i)) {
                const dist = calcularDistancia(
                    pontoAtual.lat, pontoAtual.lng,
                    pontosVisitaveis[i].lat, pontosVisitaveis[i].lng
                );
                if (dist < menorDistancia) {
                    menorDistancia = dist;
                    proximoPonto = pontosVisitaveis[i];
                    proximoIndice = i;
                }
            }
        }

        if (proximoPonto) {
            rotaOtimizada.push(proximoPonto);
            visitados.add(proximoIndice);
            pontoAtual = proximoPonto;
        }
    }

    // Voltar ao hub
    rotaOtimizada.push(hub);

    // Remover rota inicial se existir
    if (rotaInicialLayer) {
        logisticsMap.removeLayer(rotaInicialLayer);
        rotaInicialLayer = null;
    }

    // Remover rota otimizada anterior se existir
    if (rotaOtimizadaLayer) {
        logisticsMap.removeLayer(rotaOtimizadaLayer);
    }
    if (rotaOtimizadaMarkers) {
        logisticsMap.removeLayer(rotaOtimizadaMarkers);
    }

    // Desenhar a nova rota otimizada no mapa
    const rotaCoordenadas = rotaOtimizada.map(p => [p.lat, p.lng]);
    rotaOtimizadaLayer = L.polyline(rotaCoordenadas, { 
        color: '#ff6b6b', 
        weight: 5, 
        opacity: 0.9,
        dashArray: '8, 6'
    }).addTo(logisticsMap);

    rotaOtimizadaMarkers = L.layerGroup();
    rotaOtimizada.forEach((ponto, index) => {
        const marker = L.marker([ponto.lat, ponto.lng], {
            icon: createNumberedPointIcon(ponto, index + 1)
        }).bindPopup(`<strong>${index + 1}. ${ponto.nome}</strong><br>Posição da rota otimizada`);
        rotaOtimizadaMarkers.addLayer(marker);
    });
    rotaOtimizadaMarkers.addTo(logisticsMap);

    // Calcular distância total
    let distanciaTotal = 0;
    for (let i = 0; i < rotaOtimizada.length - 1; i++) {
        distanciaTotal += calcularDistancia(
            rotaOtimizada[i].lat, rotaOtimizada[i].lng,
            rotaOtimizada[i+1].lat, rotaOtimizada[i+1].lng
        );
    }

    // Tempo estimado (aproximadamente 20 km/h médio em área urbana)
    const tempoEstimado = Math.round((distanciaTotal / 20) * 60);

    // Mostrar relatório da rota otimizada em pop-up
    const sequencia = rotaOtimizada
        .slice(0, -1)
        .map((p, i) => `${i + 1}. ${p.nome}`)
        .join('\n');
    const paradas = Math.max(0, rotaOtimizada.length - 2);

    const rotaSequenciaElement = document.getElementById('rotaSequencia');
    const rotaDistanciaElement = document.getElementById('rotaDistancia');
    const rotaTempoElement = document.getElementById('rotaTempo');
    const rotaParadasElement = document.getElementById('rotaParadas');

    if (rotaSequenciaElement) rotaSequenciaElement.innerText = sequencia;
    if (rotaDistanciaElement) rotaDistanciaElement.innerText = `${distanciaTotal.toFixed(2)} km`;
    if (rotaTempoElement) rotaTempoElement.innerText = `${tempoEstimado} min`;
    if (rotaParadasElement) rotaParadasElement.innerText = paradas;

    abrirRelatorioRotas();
}