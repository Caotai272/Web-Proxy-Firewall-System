const { forwardRequest } = require('./forwarder');
const { parseRequestUrl, parseConnectTarget } = require('./requestParser');
const { loadActiveFilterData, evaluateRequestRules, evaluateRules, inspectResponseContent } = require('../services/ruleService');
const { renderBlockPage } = require('../services/blockPageService');
const { logAccess } = require('../services/logService');

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

function buildErrorResult(error) {
  const statusCode = error.name === 'TimeoutError' ? 504 : 400;

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

  try {
    parsedRequest = parseRequestUrl(targetUrl);
    const filterData = await loadActiveFilterData();
    const ruleDecision = evaluateRequestRules(parsedRequest, filterData);

    if (ruleDecision.decision === 'block') {
      await safeLog({
        requestMethod: method,
        url: parsedRequest.url,
        domain: parsedRequest.domain,
        clientIp,
        decision: 'block',
        matchedRule: ruleDecision.matchedRule,
        statusCode: 403,
        blockedReason: ruleDecision.matchedRule
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
        matchedRule: responseDecision.matchedRule,
        statusCode: 403,
        blockedReason: responseDecision.matchedRule
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
      matchedRule: ruleDecision.matchedRule,
      statusCode: forwardedResponse.status,
      blockedReason: null
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
      matchedRule: 'proxy:error',
      statusCode: errorResult.statusCode,
      blockedReason: error.message
    });

    return errorResult;
  }
}

async function evaluateConnectRequest({ authority }) {
  const parsedRequest = parseConnectTarget(authority);
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
  safeLog
};
