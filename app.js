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

const mapa = L.map('map');

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
        
        marcador.bindPopup("Ônibus");

        marcador.addTo(mapa);

        marcadores_onibus.push(marcador);
        
    }

    
}

async function carregarMapa()
{
    mapa.setView(PONTOS.Posicao[0], 15);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        minZoom: 15,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> | Coltec UFMG'
    }).addTo(mapa);

    for(let i = 0; i < PONTOS.itens; i++)
{
    const pos = PONTOS.Posicao[i];

    // Ignora posições inválidas
    if(!pos || isNaN(pos[0]) || isNaN(pos[1])) continue;

    let circulo = L.circleMarker(pos, {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: 2
    });

    circulo.addTo(mapa);
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
    const urlAPI = "https://proxy.corsfix.com/?https://temporeal.pbh.gov.br/?param=D";

    try
    {
        const response = await fetch(urlAPI);
        const data = await response.json();
        //console.log(data);

        //const ids = data.map(bus => bus.c);
        //const duplicados = ids.filter((id, i) => ids.indexOf(id) !== i);
        //console.log("Duplicados:", duplicados.length, data[0]); // <--

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


iniciarapp();