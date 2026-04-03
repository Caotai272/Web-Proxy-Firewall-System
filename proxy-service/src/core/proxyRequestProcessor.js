const { forwardRequest } = require('./forwarder');
const { parseRequestUrl, parseConnectTarget } = require('./requestParser');
const { evaluateRules, inspectResponseContent } = require('../services/ruleService');
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
    const ruleDecision = await evaluateRules(parsedRequest);

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

    const responseDecision = inspectResponseContent(forwardedResponse, ruleDecision.keywords);
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

module.exports = {
  processHttpProxyRequest,
  evaluateConnectRequest,
  safeLog
};
