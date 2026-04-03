require('dotenv').config();

const express = require('express');
const { startProxyServer } = require('./core/proxyServer');
const { getDbTime } = require('./db/client');
const { getClientIp } = require('./utils/http');
const { processHttpProxyRequest, previewProxyRequest } = require('./core/proxyRequestProcessor');
const { renderBlockPage } = require('./services/blockPageService');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.raw({ type: '*/*', limit: '1mb' }));

app.get('/health', async (req, res) => {
  try {
    const dbTime = await getDbTime();
    res.json({
      service: process.env.SERVICE_NAME || 'proxy-service',
      status: 'ok',
      database: 'connected',
      dbTime
    });
  } catch (error) {
    res.status(500).json({
      service: process.env.SERVICE_NAME || 'proxy-service',
      status: 'error',
      database: 'disconnected',
      message: error.message
    });
  }
});

app.get('/block-preview', (req, res) => {
  res.type('html').send(renderBlockPage({
    title: 'Access Blocked',
    message: 'This request matches an active filtering rule.'
  }));
});

app.get('/filter/preview', async (req, res) => {
  try {
    const preview = await previewProxyRequest({
      targetUrl: req.query.url,
      method: String(req.query.method || 'GET').toUpperCase(),
      headers: req.headers
    });

    res.json(preview);
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

app.all('/proxy', async (req, res) => {
  const result = await processHttpProxyRequest({
    method: req.method,
    targetUrl: req.query.url,
    headers: req.headers,
    body: req.body,
    clientIp: getClientIp(req)
  });

  if (result.kind === 'forward') {
    res.setHeader('x-proxy-mode', 'query');
    res.setHeader('x-proxy-target', result.response.finalUrl);
    res.status(result.response.status);
    Object.entries(result.response.headers).forEach(([key, value]) => {
      if (['content-length', 'transfer-encoding', 'connection', 'content-encoding'].includes(key.toLowerCase())) {
        return;
      }

      res.setHeader(key, value);
    });

    return res.send(result.response.body);
  }

  if (result.kind === 'block') {
    return res.status(result.statusCode).type('html').send(result.body);
  }

  return res.status(result.statusCode).json({
    status: 'error',
    message: result.message
  });
});

app.get('/', (req, res) => {
  res.type('html').send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Proxy Service</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: linear-gradient(160deg, #f4efe6 0%, #d8c3a5 100%);
            color: #261c15;
            font-family: Georgia, serif;
          }
          .card {
            width: min(760px, calc(100vw - 32px));
            padding: 28px;
            border-radius: 20px;
            background: rgba(255, 250, 244, 0.92);
            box-shadow: 0 24px 60px rgba(38, 28, 21, 0.12);
          }
          code {
            padding: 2px 8px;
            border-radius: 999px;
            background: rgba(176, 74, 43, 0.12);
          }
          a {
            color: #8f341a;
          }
        </style>
      </head>
      <body>
        <section class="card">
          <p>Proxy service is running.</p>
          <h1>HTTP proxy and CONNECT tunnel are ready</h1>
          <p>Use this service as an HTTP proxy at <code>http://localhost:${port}</code> or call the query helper below for direct testing.</p>
          <p>Query helper: <code>/proxy?url=http://admin-service:4000/health</code></p>
          <p>Preview helper: <code>/filter/preview?url=http://admin-service:4000/demo/download-installer</code></p>
          <p>Local example: <a href="/proxy?url=http://admin-service:4000/health">forward to admin-service health</a></p>
          <p>Blocked example: <a href="/proxy?url=http://facebook.com">facebook.com</a></p>
        </section>
      </body>
    </html>
  `);
});

startProxyServer({ app, port });
