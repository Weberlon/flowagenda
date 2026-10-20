import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

/**
 * ==============================================================================
 * FlowAgenda — Prospector Georreferenciado Multi-Frente
 * Base de Origem: CEP 32115-250 (Novo Progresso, Contagem - MG)
 * Raio de Visita Presencial: até 5.0 km
 * Arquivo: scripts/prospect-leads.ts
 * ==============================================================================
 */

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...values] = trimmed.split('=');
        const val = values.join('=').replace(/(^['"]|['"]$)/g, '').trim();
        process.env[key.trim()] = val;
      }
    });
  }
}

loadEnvLocal();

const PLACES_API_KEY =
  process.env.GOOGLE_PLACES_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  '';

// Coordenadas Exatas do CEP 32115-250 (Rua José Cairo Militão, Novo Progresso)
const BASE_COORDS = {
  lat: -19.8970,
  lng: -44.0246,
};

const RAIO_CORTE_KM = 5.0;

// Varredura estratégica cobrindo o miolo do raio de 5 km e a zona de expansão
const SEARCH_QUERIES = [
  // 1. Núcleo Imediato (< 3 km)
  'clínica odontológica Novo Progresso Contagem MG',
  'salão de beleza Novo Progresso Contagem MG',
  'barbearia Novo Progresso Contagem MG',
  'estética Novo Progresso Contagem MG',
  'dentista Pedra Azul Contagem MG',
  'salão de beleza Pedra Azul Contagem MG',
  'barbearia Pedra Azul Contagem MG',
  'estúdio de estética Ressaca Contagem MG',
  'clínica odontológica Ressaca Contagem MG',
  'barbearia Oitis Contagem MG',
  'salão de beleza Oitis Contagem MG',
  'dentista São Joaquim Contagem MG',
  'salão de beleza São Joaquim Contagem MG',
  'barbearia São Joaquim Contagem MG',

  // 2. Eixos Comerciais do Raio de 5 km
  'salão de beleza Severino Ballesteros Contagem MG',
  'clínica odontológica Princesa Isabel Contagem MG',
  'salão de beleza Cabral Contagem MG',
  'clínica estética Cabral Contagem MG',
  'dentista Alvorada Contagem MG',
  'podologia Ressaca Contagem MG',

  // 3. Área Geral de Expansão (> 5 km)
  'clínica odontológica Eldorado Contagem MG',
  'salão de beleza Eldorado Contagem MG',
  'barbearia Eldorado Contagem MG',
  'estética Eldorado Contagem MG',
  'clínica médica Cidade Industrial Contagem MG',
];

interface GooglePlace {
  id?: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
}

interface ProspectLead {
  nome: string;
  distanciaKm: number;
  categoriaVisita: 'PRESENCIAL (ATÉ 5KM)' | 'REMOTO (ACIMA DE 5KM)';
  tipoTelefone: 'CELULAR (WHATSAPP)' | 'FIXO' | 'NÃO INFORMADO';
  telefone: string;
  whatsappUrl: string;
  rotaGpsUrl: string;
  endereco: string;
  notaGoogle: string;
  qtdAvaliacoes: number;
  temSiteProprio: 'SIM' | 'NÃO' | 'APENAS REDE SOCIAL';
  siteUrl: string;
  perfilMaps: string;
  ganchoComercial: string;
}

// Fórmula de Haversine para cálculo de distância precisa a partir do CEP
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

async function searchPlaces(query: string): Promise<GooglePlace[]> {
  const url = 'https://places.googleapis.com/v1/places:searchText';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_API_KEY,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri',
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: 20,
      languageCode: 'pt-BR',
      locationBias: {
        circle: {
          center: {
            latitude: BASE_COORDS.lat,
            longitude: BASE_COORDS.lng,
          },
          radius: 5000.0, // Prioriza o anel de 5 km do CEP
        },
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`❌ [Erro na busca "${query}"]: HTTP ${response.status} - ${errText}`);
    return [];
  }

  const data = (await response.json()) as { places?: GooglePlace[] };
  return data.places || [];
}

function parseBrazilianPhone(rawPhone?: string): {
  clean: string;
  type: 'CELULAR (WHATSAPP)' | 'FIXO' | 'NÃO INFORMADO';
} {
  if (!rawPhone) return { clean: '', type: 'NÃO INFORMADO' };

  const digits = rawPhone.replace(/\D/g, '');
  let localDigits = digits;
  if (digits.length >= 12 && digits.startsWith('55')) {
    localDigits = digits.slice(2);
  }

  if (localDigits.length === 11 && localDigits[2] === '9') {
    return { clean: `55${localDigits}`, type: 'CELULAR (WHATSAPP)' };
  }

  if (localDigits.length === 10) {
    return { clean: `55${localDigits}`, type: 'FIXO' };
  }

  return { clean: digits.length >= 10 ? `55${digits}` : digits, type: 'FIXO' };
}

function analyzeWebsite(url?: string): 'SIM' | 'NÃO' | 'APENAS REDE SOCIAL' {
  if (!url) return 'NÃO';
  const lower = url.toLowerCase();
  if (
    lower.includes('instagram.com') ||
    lower.includes('facebook.com') ||
    lower.includes('linktr.ee') ||
    lower.includes('bio.site') ||
    lower.includes('wa.me')
  ) {
    return 'APENAS REDE SOCIAL';
  }
  return 'SIM';
}

function classifyOpportunity(place: GooglePlace, siteStatus: string, dist: number): string {
  const ratings = place.userRatingCount || 0;
  const isClose = dist <= RAIO_CORTE_KM;

  if (siteStatus === 'APENAS REDE SOCIAL') {
    return isClose
      ? '🔥 VISITA PRESENCIAL: Usa link de Instagram. Apresentar página própria FlowAgenda direto no balcão.'
      : 'OPORTUNIDADE REMOTA: Usa rede social como site. Abordar no WhatsApp com prévia do FlowAgenda.';
  }
  if (siteStatus === 'NÃO' && ratings < 15) {
    return isClose
      ? '🚨 VISITA PRESENCIAL URGENTE: Sem site e perfil frio no Maps. Propor robô 5★ + agendamento.'
      : 'ALTA VULNERABILIDADE: Sem site e poucas notas no Maps. Propor solução completa via WhatsApp.';
  }
  if (siteStatus === 'NÃO') {
    return 'ESTABELECIMENTO MOVIMENTADO: Ficha ativa no Google, mas perde clientes por falta de agendamento 24h.';
  }
  if (ratings < 25) {
    return 'GANCHO DE REPUTAÇÃO: Tem site mas poucas avaliações. Foco na automação de pós-atendimento para Google Maps.';
  }
  return 'EFICIÊNCIA OPERACIONAL: Redução de faltas (No-Show) e automação de lembretes via WhatsApp.';
}

function escapeCsvField(field: string | number): string {
  const str = String(field ?? '');
  if (str.includes(',') || str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCsvContent(leads: ProspectLead[]): string {
  const headers = [
    'Distância (km)',
    'Modalidade Prospecção',
    'Nome do Estabelecimento',
    'Rota GPS (Navegar)',
    'Tipo Telefone',
    'Telefone',
    'Link WhatsApp',
    'Endereço Completo',
    'Nota Google',
    'Qtd Avaliações',
    'Tem Site Próprio?',
    'Site Cadastrado',
    'Link Google Maps',
    'Gancho Comercial',
  ];

  const rows = leads.map((l) =>
    [
      escapeCsvField(l.distanciaKm === 999 ? 'N/D' : l.distanciaKm.toString().replace('.', ',')),
      escapeCsvField(l.categoriaVisita),
      escapeCsvField(l.nome),
      escapeCsvField(l.rotaGpsUrl),
      escapeCsvField(l.tipoTelefone),
      escapeCsvField(l.telefone),
      escapeCsvField(l.whatsappUrl),
      escapeCsvField(l.endereco),
      escapeCsvField(l.notaGoogle),
      escapeCsvField(l.qtdAvaliacoes),
      escapeCsvField(l.temSiteProprio),
      escapeCsvField(l.siteUrl),
      escapeCsvField(l.perfilMaps),
      escapeCsvField(l.ganchoComercial),
    ].join(';')
  );

  return '\uFEFF' + [headers.join(';'), ...rows].join('\n');
}

function safeWriteCsv(filePath: string, content: string): boolean {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (err: unknown) {
    const isEbusy =
      err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'EBUSY';
    if (isEbusy) {
      console.warn(
        `⚠️ [AVISO]: Não foi possível salvar "${path.basename(filePath)}". O arquivo está aberto no Excel ou em outro programa. Feche-o e execute o script novamente para atualizar.`
      );
      return false;
    }
    throw err;
  }
}

async function runProspector() {
  if (!PLACES_API_KEY) {
    console.error('\n❌ ERRO: Nenhuma chave da Google Cloud encontrada.');
    console.error('Certifique-se de configurar GOOGLE_PLACES_API_KEY no arquivo .env.local.\n');
    process.exit(1);
  }

  console.log('🚀 Iniciando mineração com epicentro no CEP 32115-250 (Novo Progresso)...');
  console.log(`📍 Coordenadas Base: Lat ${BASE_COORDS.lat}, Lng ${BASE_COORDS.lng}`);
  console.log(`🎯 Divisão Operacional: Presencial (até ${RAIO_CORTE_KM} km) vs Remoto (> ${RAIO_CORTE_KM} km)\n`);

  const seenPlaceIds = new Set<string>();
  const seenPhones = new Set<string>();
  const leads: ProspectLead[] = [];

  for (const query of SEARCH_QUERIES) {
    console.log(`🔍 Pesquisando: "${query}"...`);
    const places = await searchPlaces(query);

    for (const p of places) {
      if (p.id && seenPlaceIds.has(p.id)) continue;
      if (p.id) seenPlaceIds.add(p.id);

      const nome = p.displayName?.text || 'Sem Nome';
      const rawPhone = p.nationalPhoneNumber || p.internationalPhoneNumber || '';
      const { clean: cleanPhone, type: tipoTelefone } = parseBrazilianPhone(rawPhone);

      if (cleanPhone && seenPhones.has(cleanPhone)) continue;
      if (cleanPhone) seenPhones.add(cleanPhone);

      let dist = 999.0;
      let gpsUrl = '';
      if (p.location?.latitude && p.location?.longitude) {
        dist = calculateDistanceKm(
          BASE_COORDS.lat,
          BASE_COORDS.lng,
          p.location.latitude,
          p.location.longitude
        );
        gpsUrl = `https://www.google.com/maps/dir/?api=1&destination=${p.location.latitude},${p.location.longitude}`;
      }

      const categoriaVisita =
        dist <= RAIO_CORTE_KM
          ? 'PRESENCIAL (ATÉ 5KM)'
          : 'REMOTO (ACIMA DE 5KM)';

      const siteStatus = analyzeWebsite(p.websiteUri);
      const waLink = tipoTelefone === 'CELULAR (WHATSAPP)' ? `https://wa.me/${cleanPhone}` : '';
      const gancho = classifyOpportunity(p, siteStatus, dist);

      leads.push({
        nome,
        distanciaKm: dist,
        categoriaVisita,
        tipoTelefone,
        telefone: rawPhone,
        whatsappUrl: waLink,
        rotaGpsUrl: gpsUrl,
        endereco: p.formattedAddress || 'Não informado',
        notaGoogle: p.rating ? p.rating.toFixed(1) : 'S/N',
        qtdAvaliacoes: p.userRatingCount || 0,
        temSiteProprio: siteStatus,
        siteUrl: p.websiteUri || '',
        perfilMaps: p.googleMapsUri || '',
        ganchoComercial: gancho,
      });
    }

    await new Promise((res) => setTimeout(res, 600));
  }

  // Ordenação prioritária: do portão da sua casa para fora
  leads.sort((a, b) => a.distanciaKm - b.distanciaKm);

  // Segmentação inteligente
  const leadsPresencial = leads.filter((l) => l.distanciaKm <= RAIO_CORTE_KM);
  const leadsRemoto = leads.filter((l) => l.distanciaKm > RAIO_CORTE_KM);

  // Diretório de exportação isolado
  const outputDir = path.resolve(process.cwd(), 'exports', 'leads');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Gravação resiliente a EBUSY
  const pathMaster = path.join(outputDir, 'prospects_master.csv');
  const pathPresencial = path.join(outputDir, 'prospects_presencial_5km.csv');
  const pathRemoto = path.join(outputDir, 'prospects_remoto.csv');

  const savedPresencial = safeWriteCsv(pathPresencial, generateCsvContent(leadsPresencial));
  safeWriteCsv(pathRemoto, generateCsvContent(leadsRemoto));
  safeWriteCsv(pathMaster, generateCsvContent(leads));

  console.log('\n======================================================');
  console.log(`✅ Mineração e Segmentação Concluídas com Sucesso!`);
  console.log(`📍 Total de Estabelecimentos Mapeados: ${leads.length}`);
  console.log(`------------------------------------------------------`);
  console.log(`🚶‍♂️ PRESENCIAIS (até ${RAIO_CORTE_KM} km do seu CEP): ${leadsPresencial.length} estabelecimentos`);
  console.log(`   📁 Salvo em: ${pathPresencial}`);
  console.log(`📞 REMOTOS (acima de ${RAIO_CORTE_KM} km): ${leadsRemoto.length} estabelecimentos`);
  console.log(`   📁 Salvo em: ${pathRemoto}`);
  console.log(`📊 MASTER (Todos ordenados da porta de casa para fora):`);
  console.log(`   📁 Salvo em: ${pathMaster}`);
  console.log('======================================================\n');

  if (savedPresencial && process.platform === 'win32') {
    console.log('🚀 Abrindo planilha presencial no Excel...');
    exec(`start "" "${pathPresencial}"`);
  }
}

runProspector().catch((err) => {
  console.error('Falha fatal na execução do prospector:', err);
});