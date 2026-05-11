const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = process.env.PORT || 3000;
const appRoot = __dirname;
const dbFile = path.join(appRoot, 'coletas.json');

function readJsonFile() {
  try {
    const raw = fs.readFileSync(dbFile, 'utf8');
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function writeJsonFile(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf8');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function serveStaticFile(req, res) {
  let requestPath = url.parse(req.url).pathname;
  if (requestPath === '/') requestPath = '/index.html';
  const filePath = path.join(appRoot, requestPath);
  const ext = path.extname(filePath).toLowerCase();
  const mapping = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Arquivo não encontrado');
    return;
  }

  const contentType = mapping[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        return resolve(JSON.parse(body));
      } catch (error) {
        return reject(new Error('JSON inválido no corpo da requisição'));
      }
    });
  });
}

function computeRouteStats(coletas) {
  const total = coletas.length;
  const kmMedio = total ? Math.round(8 + total * 1.5) : 10;
  const tempoMedio = total ? Math.round(25 + total * 2.5) : 35;
  const concluidas = coletas.filter(c => c.status === 'Concluído').length;
  const eficiencia = total ? Math.round((concluidas / total) * 100) : 0;

  return {
    totalColetas: total,
    kmMedio,
    tempoMedio,
    eficiencia,
    statusCounts: {
      pendente: coletas.filter(c => c.status === 'Pendente').length,
      emRota: coletas.filter(c => c.status === 'Em Rota').length,
      concluido: concluidas
    }
  };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const method = req.method.toUpperCase();
  const pathname = parsedUrl.pathname;

  if (method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (pathname.startsWith('/api')) {
    const coletas = readJsonFile();

    if (method === 'GET' && pathname === '/api/coletas') {
      sendJson(res, 200, coletas);
      return;
    }

    if (method === 'GET' && pathname === '/api/rotas') {
      sendJson(res, 200, computeRouteStats(coletas));
      return;
    }

    if (method === 'POST' && pathname === '/api/coletas') {
      try {
        const body = await parseBody(req);
        const { nome, endereco, tipo, data } = body;
        if (!nome || !endereco || !tipo || !data) {
          sendJson(res, 400, { message: 'Campos obrigatórios: nome, endereço, tipo e data.' });
          return;
        }

        const novaColeta = {
          id: Date.now(),
          nome,
          endereco,
          tipo,
          data,
          status: 'Pendente'
        };
        coletas.push(novaColeta);
        writeJsonFile(coletas);
        sendJson(res, 201, novaColeta);
      } catch (error) {
        sendJson(res, 400, { message: error.message });
      }
      return;
    }

    if (method === 'PATCH' && pathname.match(/^\/api\/coletas\/\d+\/status$/)) {
      try {
        const body = await parseBody(req);
        const id = Number(pathname.split('/')[3]);
        const coleta = coletas.find(item => item.id === id);
        if (!coleta) {
          sendJson(res, 404, { message: 'Coleta não encontrada.' });
          return;
        }
        if (!body.status) {
          sendJson(res, 400, { message: 'Campo status é obrigatório.' });
          return;
        }
        coleta.status = body.status;
        writeJsonFile(coletas);
        sendJson(res, 200, coleta);
      } catch (error) {
        sendJson(res, 400, { message: error.message });
      }
      return;
    }

    sendJson(res, 404, { message: 'API não encontrada.' });
    return;
  }

  serveStaticFile(req, res);
});

server.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
