require('dotenv').config();

const express = require('express');
const { parseRequestUrl } = require('./core/requestParser');
const { forwardRequest } = require('./core/forwarder');
const { handleResponse } = require('./core/responseHandler');
const { getDbTime } = require('./db/client');
const { getClientIp } = require('./utils/http');
const { logAccess } = require('./services/logService');
const { evaluateRules, inspectResponseContent } = require('./services/ruleService');
const { renderBlockPage } = require('./services/blockPageService');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.raw({ type: '*/*', limit: '1mb' }));

async function safeLog(entry) {
  try {
    await logAccess(entry);
  } catch (error) {
    console.error('Failed to write access log:', error.message);
  }
}

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

app.all('/proxy', async (req, res) => {
  let parsedRequest = null;
  const clientIp = getClientIp(req);

  try {
    parsedRequest = parseRequestUrl(req.query.url);
    const ruleDecision = await evaluateRules(parsedRequest);

    if (ruleDecision.decision === 'block') {
      await safeLog({
        requestMethod: req.method,
        url: parsedRequest.url,
        domain: parsedRequest.domain,
        clientIp,
        decision: 'block',
        matchedRule: ruleDecision.matchedRule,
        statusCode: 403,
        blockedReason: ruleDecision.matchedRule
      });

      return res.status(403).type('html').send(renderBlockPage({
        title: 'Access Blocked',
        message: ruleDecision.matchedRule || 'Blocked by an active rule.'
      }));
    }

    const forwardedResponse = await forwardRequest({
      method: req.method,
      targetUrl: parsedRequest.url,
      headers: req.headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body
    });

    const responseDecision = inspectResponseContent(forwardedResponse, ruleDecision.keywords);
    if (responseDecision.decision === 'block') {
      await safeLog({
        requestMethod: req.method,
        url: parsedRequest.url,
        domain: parsedRequest.domain,
        clientIp,
        decision: 'block',
        matchedRule: responseDecision.matchedRule,
        statusCode: 403,
        blockedReason: responseDecision.matchedRule
      });

      return res.status(403).type('html').send(renderBlockPage({
        title: 'Response Blocked',
        message: responseDecision.matchedRule
      }));
    }

    await safeLog({
      requestMethod: req.method,
      url: parsedRequest.url,
      domain: parsedRequest.domain,
      clientIp,
      decision: 'allow',
      matchedRule: ruleDecision.matchedRule,
      statusCode: forwardedResponse.status,
      blockedReason: null
    });

    return handleResponse(res, forwardedResponse);
  } catch (error) {
    const statusCode = error.name === 'TimeoutError' ? 504 : 400;

    await safeLog({
      requestMethod: req.method,
      url: parsedRequest ? parsedRequest.url : String(req.query.url || ''),
      domain: parsedRequest ? parsedRequest.domain : null,
      clientIp,
      decision: 'block',
      matchedRule: 'proxy:error',
      statusCode,
      blockedReason: error.message
    });

    return res.status(statusCode).json({
      status: 'error',
      message: error.message
    });
  }
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
          <h1>Basic forwarding flow is ready</h1>
          <p>Use <code>/proxy?url=http://admin-service:4000/health</code> to forward a request through the proxy container.</p>
          <p>Local example: <a href="/proxy?url=http://admin-service:4000/health">forward to admin-service health</a></p>
          <p>Blocked example: <a href="/proxy?url=http://facebook.com">facebook.com</a></p>
        </section>
      </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`proxy-service listening on port ${port}`);
});
