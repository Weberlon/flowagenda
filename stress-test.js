import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 20 },  // Aquecimento: 20 VUs
    { duration: '40s', target: 50 },  // Carga moderada: 50 VUs sustentados
    { duration: '30s', target: 100 }, // Pico: 100 VUs
    { duration: '20s', target: 0 },   // Desaceleração
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

const BASE_URL = 'https://www.flowagenda.online/api/webhooks/whatsapp';
const WEBHOOK_SECRET = 'senha-segura-flowagenda-2026';

export default function () {
  const phoneSuffix = Math.floor(100000 + Math.random() * 900000);
  const remoteJid = `5531987${phoneSuffix}@s.whatsapp.net`;
  const messageId = `TEST_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const payload = JSON.stringify({
    event: 'messages.upsert',
    instance: 'flowagenda-teste',
    data: {
      key: {
        remoteJid: remoteJid,
        fromMe: false,
        id: messageId,
      },
      pushName: `Cliente Teste ${phoneSuffix}`,
      message: {
        conversation: 'Olá! Gostaria de saber os horários disponíveis e valores para corte esta semana.',
      },
      messageType: 'conversation',
      messageTimestamp: Math.floor(Date.now() / 1000),
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-hook-token': WEBHOOK_SECRET,
      'User-Agent': 'k6-Stress-Test-FlowAgenda',
    },
  };

  const res = http.post(BASE_URL, payload, params);

  check(res, {
    'status HTTP 200': (r) => r.status === 200,
    'resposta rapida (<1000ms)': (r) => r.timings.duration < 1000,
    'status queued': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'queued';
      } catch (e) {
        return false;
      }
    },
  });

  sleep(Math.random() + 1);
}
