const http = require('http');
const net = require('net');
const { handleResponse } = require('./responseHandler');
const { evaluateConnectRequest, processHttpProxyRequest, safeLog } = require('./proxyRequestProcessor');
const { getClientIp } = require('../utils/http');

const MAX_BODY_SIZE = 5 * 1024 * 1024;

function isAbsoluteProxyUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function collectRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    req.on('data', (chunk) => {
      totalBytes += chunk.length;

      if (totalBytes > MAX_BODY_SIZE) {
        reject(new Error('Request body exceeds proxy limit'));
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(chunks.length > 0 ? Buffer.concat(chunks) : undefined);
    });

    req.on('error', reject);
  });
}

function writeProxyResult(res, result) {
  if (result.kind === 'forward') {
    handleResponse(res, result.response);
    return;
  }

  if (result.kind === 'block') {
    res.statusCode = result.statusCode;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(result.body);
    return;
  }

  res.statusCode = result.statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(result.body);
}

function createConnectErrorResponse(statusCode, statusText) {
  return `HTTP/1.1 ${statusCode} ${statusText}\r\nConnection: close\r\n\r\n`;
}

function startProxyServer({ app, port }) {
  const server = http.createServer(async (req, res) => {
    if (!isAbsoluteProxyUrl(req.url)) {
      app(req, res);
      return;
    }

    try {
      const body = await collectRequestBody(req);
      const result = await processHttpProxyRequest({
        method: req.method,
        targetUrl: req.url,
        headers: req.headers,
        body,
        clientIp: getClientIp(req)
      });

      writeProxyResult(res, result);
    } catch (error) {
      res.statusCode = 400;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        status: 'error',
        message: error.message
      }));
    }
  });

  server.on('connect', async (req, clientSocket, head) => {
    const clientIp = req.socket.remoteAddress || null;
    let connectDecision = null;

    try {
      connectDecision = await evaluateConnectRequest({ authority: req.url });

      if (connectDecision.ruleDecision.decision === 'block') {
        await safeLog({
          requestMethod: 'CONNECT',
          url: connectDecision.parsedRequest.url,
          domain: connectDecision.parsedRequest.domain,
          clientIp,
          decision: 'block',
          matchedRule: connectDecision.ruleDecision.matchedRule,
          statusCode: 403,
          blockedReason: connectDecision.ruleDecision.matchedRule
        });

        clientSocket.end(createConnectErrorResponse(403, 'Forbidden'));
        return;
      }

      const upstreamSocket = net.connect(
        Number(connectDecision.parsedRequest.port),
        connectDecision.parsedRequest.domain,
        async () => {
          clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

          if (head && head.length > 0) {
            upstreamSocket.write(head);
          }

          clientSocket.pipe(upstreamSocket);
          upstreamSocket.pipe(clientSocket);

          await safeLog({
            requestMethod: 'CONNECT',
            url: connectDecision.parsedRequest.url,
            domain: connectDecision.parsedRequest.domain,
            clientIp,
            decision: 'allow',
            matchedRule: connectDecision.ruleDecision.matchedRule,
            statusCode: 200,
            blockedReason: null
          });
        }
      );

      upstreamSocket.on('error', async (error) => {
        await safeLog({
          requestMethod: 'CONNECT',
          url: connectDecision ? connectDecision.parsedRequest.url : String(req.url || ''),
          domain: connectDecision ? connectDecision.parsedRequest.domain : null,
          clientIp,
          decision: 'block',
          matchedRule: 'proxy:error',
          statusCode: 502,
          blockedReason: error.message
        });

        clientSocket.end(createConnectErrorResponse(502, 'Bad Gateway'));
      });

      clientSocket.on('error', () => {
        upstreamSocket.destroy();
      });
    } catch (error) {
      await safeLog({
        requestMethod: 'CONNECT',
        url: connectDecision ? connectDecision.parsedRequest.url : String(req.url || ''),
        domain: connectDecision ? connectDecision.parsedRequest.domain : null,
        clientIp,
        decision: 'block',
        matchedRule: 'proxy:error',
        statusCode: 400,
        blockedReason: error.message
      });

      clientSocket.end(createConnectErrorResponse(400, 'Bad Request'));
    }
  });

  server.listen(port, () => {
    console.log(`proxy-service listening on port ${port}`);
  });

  return server;
}

module.exports = {
  startProxyServer
};
