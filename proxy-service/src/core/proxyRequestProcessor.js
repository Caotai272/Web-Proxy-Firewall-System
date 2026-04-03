const { forwardRequest } = require('./forwarder');
const { parseRequestUrl, parseConnectTarget } = require('./requestParser');
const { loadActiveFilterData, evaluateRequestRules, evaluateRules, inspectResponseContent } = require('../services/ruleService');
const { renderBlockPage } = require('../services/blockPageService');
const { logAccess } = require('../services/logService');

const BAD_GATEWAY_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'EAI_AGAIN',
  'ENETUNREACH',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'UND_ERR_SOCKET'
]);

const GATEWAY_TIMEOUT_ERROR_CODES = new Set([
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT'
]);

async function safeLog(entry) {
  try {
    await logAccess(entry);
  } catch (error) {
    console.error('Failed to write access log:', error.message);
  }
}

function buildBlockResult(matchedRule, title, message) {
  return {
    kind: 'block',
    statusCode: 403,
    matchedRule,
    body: Buffer.from(renderBlockPage({ title, message }), 'utf8')
  };
}

function classifyProxyError(error) {
  if (typeof error.statusCode === 'number') {
    return error.statusCode;
  }

  if (error.name === 'TimeoutError') {
    return 504;
  }

  const causeCode = error.cause && typeof error.cause.code === 'string'
    ? error.cause.code
    : null;

  if (causeCode && GATEWAY_TIMEOUT_ERROR_CODES.has(causeCode)) {
    return 504;
  }

  if (
    error.message === 'fetch failed' ||
    (causeCode && BAD_GATEWAY_ERROR_CODES.has(causeCode))
  ) {
    return 502;
  }

  return 400;
}

function buildErrorResult(error) {
  const statusCode = classifyProxyError(error);

  return {
    kind: 'error',
    statusCode,
    message: error.message,
    body: Buffer.from(
      JSON.stringify({
        status: 'error',
        message: error.message
      }),
      'utf8'
    )
  };
}

async function processHttpProxyRequest({ method, targetUrl, headers, body, clientIp }) {
  let parsedRequest = null;
  const startedAt = Date.now();

  try {
    parsedRequest = parseRequestUrl(targetUrl, { clientIp });
    const filterData = await loadActiveFilterData();
    const ruleDecision = evaluateRequestRules(parsedRequest, filterData);

    if (ruleDecision.decision === 'block') {
      await safeLog({
        requestMethod: method,
        url: parsedRequest.url,
        domain: parsedRequest.domain,
        clientIp,
        decision: 'block',
        ruleStage: ruleDecision.stage,
        matchedRule: ruleDecision.matchedRule,
        matchedRuleId: ruleDecision.matchedRuleId || null,
        statusCode: 403,
        upstreamStatus: null,
        blockedReason: ruleDecision.matchedRule,
        finalUrl: null,
        contentType: null,
        detectedExtension: ruleDecision.detectedExtension || null,
        responseSizeBytes: null,
        latencyMs: Date.now() - startedAt
      });

      return buildBlockResult(
        ruleDecision.matchedRule,
        'Access Blocked',
        ruleDecision.matchedRule || 'Blocked by an active rule.'
      );
    }

    const forwardedResponse = await forwardRequest({
      method,
      targetUrl: parsedRequest.url,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : body
    });

    const responseDecision = inspectResponseContent(forwardedResponse, filterData);
    if (responseDecision.decision === 'block') {
      await safeLog({
        requestMethod: method,
        url: parsedRequest.url,
        domain: parsedRequest.domain,
        clientIp,
        decision: 'block',
        ruleStage: responseDecision.stage,
        matchedRule: responseDecision.matchedRule,
        statusCode: 403,
        upstreamStatus: forwardedResponse.status,
        blockedReason: responseDecision.matchedRule,
        finalUrl: forwardedResponse.finalUrl,
        contentType: forwardedResponse.headers['content-type'] || null,
        detectedExtension: responseDecision.detectedExtension || null,
        responseSizeBytes: forwardedResponse.body.length,
        latencyMs: Date.now() - startedAt
      });

      return buildBlockResult(
        responseDecision.matchedRule,
        'Response Blocked',
        responseDecision.matchedRule
      );
    }

    await safeLog({
      requestMethod: method,
      url: parsedRequest.url,
      domain: parsedRequest.domain,
      clientIp,
      decision: 'allow',
      ruleStage: responseDecision.stage,
      matchedRule: ruleDecision.matchedRule,
      matchedRuleId: ruleDecision.matchedRuleId || null,
      statusCode: forwardedResponse.status,
      upstreamStatus: forwardedResponse.status,
      blockedReason: null,
      finalUrl: forwardedResponse.finalUrl,
      contentType: forwardedResponse.headers['content-type'] || null,
      detectedExtension: responseDecision.detectedExtension || null,
      responseSizeBytes: forwardedResponse.body.length,
      latencyMs: Date.now() - startedAt
    });

    return {
      kind: 'forward',
      response: forwardedResponse
    };
  } catch (error) {
    const errorResult = buildErrorResult(error);

    await safeLog({
      requestMethod: method,
      url: parsedRequest ? parsedRequest.url : String(targetUrl || ''),
      domain: parsedRequest ? parsedRequest.domain : null,
      clientIp,
      decision: 'block',
      ruleStage: 'proxy:error',
      matchedRule: 'proxy:error',
      statusCode: errorResult.statusCode,
      upstreamStatus: null,
      blockedReason: error.message,
      finalUrl: parsedRequest ? parsedRequest.url : null,
      contentType: null,
      detectedExtension: null,
      responseSizeBytes: null,
      latencyMs: Date.now() - startedAt
    });

    return errorResult;
  }
}

async function evaluateConnectRequest({ authority, clientIp = null }) {
  const parsedRequest = parseConnectTarget(authority, { clientIp });
  const ruleDecision = await evaluateRules(parsedRequest);

  return {
    parsedRequest,
    ruleDecision
  };
}

async function previewProxyRequest({ targetUrl, method = 'GET', headers = {} }) {
  const parsedRequest = parseRequestUrl(targetUrl);
  const filterData = await loadActiveFilterData();
  const requestDecision = evaluateRequestRules(parsedRequest, filterData);

  if (requestDecision.decision === 'block') {
    return {
      target: parsedRequest,
      requestDecision,
      responseDecision: null,
      finalDecision: 'block',
      blockedAt: 'request',
      upstreamStatus: null
    };
  }

  const forwardedResponse = await forwardRequest({
    method,
    targetUrl: parsedRequest.url,
    headers,
    body: undefined
  });

  const responseDecision = inspectResponseContent(forwardedResponse, filterData);

  return {
    target: parsedRequest,
    requestDecision,
    responseDecision,
    finalDecision: responseDecision.decision === 'block' ? 'block' : 'allow',
    blockedAt: responseDecision.decision === 'block' ? 'response' : null,
    upstreamStatus: forwardedResponse.status,
    upstreamStatusText: forwardedResponse.statusText,
    responseMeta: {
      contentType: forwardedResponse.headers['content-type'] || null,
      finalUrl: forwardedResponse.finalUrl,
      detectedExtension: responseDecision.detectedExtension || null,
      detectedExtensionSource: responseDecision.detectedExtensionSource || null,
      detectedFilename: responseDecision.detectedFilename || null
    }
  };
}

module.exports = {
  processHttpProxyRequest,
  evaluateConnectRequest,
  previewProxyRequest,
  classifyProxyError,
  safeLog
};
