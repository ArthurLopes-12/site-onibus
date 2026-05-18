const BDLINHAS = {
    NumLinha: [],
    Codigo: [],
    Nome: [],

    itens: 0
};

const PONTOS = {
    Id: [],
    Linhas: [],
    Posicao: [],

    itens: 0
};

const busIcon = L.icon({
    iconUrl: 'imgs/bus.png',
    iconSize: [32, 32]
});

let ONIBUS = [];
let marcadores_onibus = [];
let marcadores_pontos = [];
let marcadorProximo = null;

const mapa = L.map('map');

// Guarda o filtro ativo (null = mostrar todos)
let linhaBuscada = null;

// Normaliza o código da linha para comparação
// Remove espaços, deixa maiúsculo e remove zeros à esquerda
// ex: "067" → "67" | " 9200 " → "9200"
function normalizarLinha(codigo)
{
    return String(codigo ?? "").trim().toUpperCase().replace(/^0+/, "");
}

function iniciarapp()
{
    carregarTudo();
    setInterval(atualizarOnibus, 20000);
}

async function carregarTudo()
{
    await carregarBDLINHA();
    await carregarPONTOS();
    await carregarMapa();
    await atualizarOnibus();
}

function atualizarMapa()
{
    // Remove marcadores antigos
    for(let i = 0; i < marcadores_onibus.length; i++)
    {
        mapa.removeLayer(marcadores_onibus[i]);
    }

    // Limpa array
    marcadores_onibus = [];

    // Percorre ônibus
    for(let i = 0; i < ONIBUS.length; i++)
    {
        const bus = ONIBUS[i];

        // CORRIGIDO: comparação exata normalizada
        if(linhaBuscada !== null)
        {
            const linhaDoOnibus = normalizarLinha(bus.NL);
            const buscando = normalizarLinha(linhaBuscada);

            if(linhaDoOnibus !== buscando)
            {
                continue;
            }
        }

        //console.log(bus);

        // TESTE TEMPORÁRIO
        const lat = parseFloat(bus.LT);
        const lng = parseFloat(bus.LG);

        // Ignora inválidos
        if(
            lat === undefined ||
            lng === undefined ||
            isNaN(lat) ||
            isNaN(lng)
        )
        {
            continue;
        }
        
        
        // Cria marcador
        const marcador = L.marker(
            [lat, lng],
            {
                icon: busIcon
            }
        );
        
        // popup q mostra informacoes reais do onibus
        marcador.bindPopup(`
    <b>Linha:</b> ${bus.NL ?? "N/A"} <br>
    <b>Veículo:</b> ${bus.NV ?? "N/A"} <br>
    <b>Velocidade:</b> ${bus.VL ?? "N/A"} km/h
    `);

        marcador.addTo(mapa);

        marcadores_onibus.push(marcador);
        
    }

    
}

// Atualiza os pontos de parada no mapa filtrando pela linha selecionada
function atualizarPontos()
{
    // Remove pontos antigos
    for (let i = 0; i < marcadores_pontos.length; i++) {
        mapa.removeLayer(marcadores_pontos[i]);
    }
    marcadores_pontos = [];

    for (let i = 0; i < PONTOS.itens; i++) {
        const pos = PONTOS.Posicao[i];
        const linha = PONTOS.Linhas[i];

        if (!pos || isNaN(pos[0]) || isNaN(pos[1])) continue;

        // Se tiver filtro, mostra só os pontos daquela linha
        if(linhaBuscada !== null)
        {
            const codigoLinha = normalizarLinha(linha.Codigo);
            const buscando = normalizarLinha(linhaBuscada);

            if(codigoLinha !== buscando) continue;
        }

        let circulo = L.circleMarker(pos, {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.5,
            radius: 2
        });

        circulo.bindPopup(`<b>Linha:</b> ${linha.Codigo}`);
        circulo.addTo(mapa);
        marcadores_pontos.push(circulo);
    }
}

// Pega onde o usuario ta e acha o ponto de onibus mais perto
function destacarPontoMaisProximo()
{
    // Remove marcador anterior se existir
    if (marcadorProximo !== null) {
        mapa.removeLayer(marcadorProximo);
        marcadorProximo = null;
    }

    if (linhaBuscada === null) return;

    navigator.geolocation.getCurrentPosition((position) => {
        var userLat = position.coords.latitude;
        var userLng = position.coords.longitude;

        var menorDistancia = 999999999;
        var indiceMaisProximo = -1;

        for (var i = 0; i < PONTOS.itens; i++) {
            var pos = PONTOS.Posicao[i];
            if (!pos || isNaN(pos[0]) || isNaN(pos[1])) continue;

            // CORRIGIDO: usa NumLinha em vez de Codigo
            var codigoLinha = normalizarLinha(PONTOS.Linhas[i].Codigo);
            var buscando = normalizarLinha(linhaBuscada);

            if(codigoLinha !== buscando) continue;

            var distancia = mapa.distance([userLat, userLng], pos);

            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                indiceMaisProximo = i;
            }
        }

        if (indiceMaisProximo === -1) return;

        var posProximo = PONTOS.Posicao[indiceMaisProximo];
        var linhaProximo = PONTOS.Linhas[indiceMaisProximo];

        // Remove marcador anterior se ainda existir
        if (marcadorProximo !== null) {
            mapa.removeLayer(marcadorProximo);
            marcadorProximo = null;
        }

        // Cria marcador verde no ponto mais próximo
        marcadorProximo = L.circleMarker(posProximo, {
            color: 'green',
            fillColor: '#0f0',
            fillOpacity: 0.9,
            radius: 10
        });

        // CORRIGIDO: popup com NumLinha
        marcadorProximo.bindPopup(
            "<b>Ponto mais próximo!</b><br>" +
            "<b>Linha:</b> " + linhaProximo.Codigo
        ).openPopup();

        marcadorProximo.addTo(mapa);
    });
}

async function carregarMapa()
{
    // CORRIGIDO: busca a primeira posição válida para não quebrar se a primeira for nula
    const primeiraPosicaoValida = PONTOS.Posicao.find(p => p !== null && !isNaN(p[0]));
    mapa.setView(primeiraPosicaoValida, 15);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        minZoom: 15,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> | Coltec UFMG'
    }).addTo(mapa);

    // CORRIGIDO: pontos aparecem sempre, independente da geolocalização
    atualizarPontos();

    // Tenta pegar localização do usuário (opcional)
    if(navigator.geolocation)
    {
        navigator.geolocation.getCurrentPosition(function(position) {
            var lat = position.coords.latitude;
            var lon = position.coords.longitude;

            // Cria o marcador na sua localização e adiciona ao mapa
            L.marker([lat, lon]).addTo(mapa)
                .bindPopup("Você está aqui!")
                .openPopup();
        });
    }
}


//Converter string de ponto UTM para [Lat, Lng]
function PointParaLatLng(point) {
    const utmFormat = "+proj=utm +zone=23 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
    let p_vals = point.replace('POINT (', '').replace(')', '').split(' ');
    let x = parseFloat(p_vals[0]);
    let y = parseFloat(p_vals[1]);

    const coords = proj4(utmFormat, "EPSG:4326", [x, y]);
    return [coords[1], coords[0]];
}

//-- FUNÇÕES DE CARREGAMENTO


//Carregar API
async function atualizarOnibus()
{   
    // lembrando que a proxy do lucas tava dando erro.
    const urlAPI = "https://api.allorigins.win/raw?url=https://temporeal.pbh.gov.br/?param=D";

    try
    {
        const response = await fetch(urlAPI);
        const data = await response.json();
        
        // ADICIONA ISSO TEMPORARIAMENTE
        console.log("Primeiro ônibus:", data[0]);
        console.log("Todos os campos:", Object.keys(data[0]));

        // LIMPA ônibus antigos
        ONIBUS = [];
        let ids = new Set();

        for(let i = 0; i < data.length; i++){
            let bus = data[i];
            //console.log(bus);
            if(ids.has(bus.NV)) continue;

            ids.add(bus.NV);
            ONIBUS.push(bus);
        }

        // ADICIONA novos ônibus
        //ONIBUS.push(...data);
        console.log(ONIBUS);

        atualizarMapa();
    }
    catch(error)
    {
        console.error(error);
    }
}

//Carregar CSV das linhas de ônibus
// Carregar CSV das linhas de ônibus
function carregarBDLINHA()
{
    return new Promise((resolve) => {
        Papa.parse("/csv/bdlinha.csv",
            {
                download: true,
                header: true,
                delimiter: ";",

                step: (row) => {
                    BDLINHAS.NumLinha.push(parseInt(row.data[0]["NumeroLinha"]));
                    BDLINHAS.Codigo.push(row.data[0]["Linha"]);
                    BDLINHAS.Nome.push(row.data[0]["Nome"]);
                    BDLINHAS.itens += 1;
                },

                complete: () => {
                    console.log("BDLINHAS: ", BDLINHAS);
                    resolve(); // <-- aqui que o await em carregarTudo() vai esperar
                }
            }
        );
    });
}

// Carregar CSV dos pontos de ônibus
function carregarPONTOS()
{
    return new Promise((resolve) => {
        Papa.parse("/csv/pontos.csv",
            {
                download: true,
                header: true,
                delimiter: ";",

                step: (row) => {
                    const linha = {NumLinha: 0, Codigo: "", Nome: "", Sublinha: "", Origem: ""};

                    PONTOS.Id.push(parseInt(row.data[0]["IDENTIFICADOR_PONTO_ONIBUS"]));

                    linha.NumLinha = parseInt(row.data[0]["ID_PONTO_ONIBUS_LINHA"]);
                    linha.Codigo = row.data[0]["COD_LINHA"];
                    linha.Nome = row.data[0]["NOME_LINHA"];
                    linha.Sublinha = row.data[0]["NOME_SUB_LINHA"];
                    linha.Origem = row.data[0]["ORIGEM"];

                    PONTOS.Linhas.push(linha);
                    let point = row.data[0]["GEOMETRIA"];
                    const posicao = (point && point.includes("POINT")) ? PointParaLatLng(point) : null;
                    PONTOS.Posicao.push(posicao);

                    PONTOS.itens += 1;
                },

                complete: () => {
                    console.log("PONTOS: ", PONTOS);
                    resolve(); // <-- idem
                }
            }
        );
    });
}

function buscarLinha()
{
    // Pega o texto digitado e remove espaços extras
    const texto = document.getElementById("campo_digita").value.trim();

    // Se estiver vazio, mostra todos
    if(texto === "")
    {
        linhaBuscada = null;

        // Remove marcador do ponto mais próximo ao limpar a busca
        if(marcadorProximo !== null)
        {
            mapa.removeLayer(marcadorProximo);
            marcadorProximo = null;
        }
    }
    else
    {
        linhaBuscada = texto;
    }

    // Redesenha o mapa com o filtro aplicado
    atualizarMapa();
    atualizarPontos();
    destacarPontoMaisProximo();
}

// Conecta o botão ao buscarLinha
document.getElementById("botao_buscar").addEventListener("click", buscarLinha);

iniciarapp();