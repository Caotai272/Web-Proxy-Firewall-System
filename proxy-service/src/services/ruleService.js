const whitelistFilter = require('../filters/whitelistFilter');
const domainFilter = require('../filters/domainFilter');
const urlFilter = require('../filters/urlFilter');
const extensionFilter = require('../filters/extensionFilter');
const keywordFilter = require('../filters/keywordFilter');
const { listActiveRules } = require('../repositories/ruleRepository');
const { listActiveKeywords } = require('../repositories/keywordRepository');
const { listActiveExtensions } = require('../repositories/extensionRepository');

async function loadActiveFilterData() {
  const [rules, keywords, extensions] = await Promise.all([
    listActiveRules(),
    listActiveKeywords(),
    listActiveExtensions()
  ]);

  return {
    rules,
    keywords,
    extensions
  };
}

function buildDecision(decision, matchedRule, stage, extra = {}) {
  return {
    decision,
    matchedRule,
    stage,
    ...extra
  };
}

function extractPathExtension(pathname) {
  const lastSegment = String(pathname || '')
    .split('/')
    .filter(Boolean)
    .pop() || '';

  if (!lastSegment.includes('.')) {
    return null;
  }

  return `.${lastSegment.split('.').pop().toLowerCase()}`;
}

function extractFilenameFromContentDisposition(contentDisposition) {
  const headerValue = String(contentDisposition || '').trim();

  if (!headerValue) {
    return null;
  }

  const utf8Match = headerValue.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/^"|"$/g, ''));
    } catch (error) {
      return utf8Match[1].replace(/^"|"$/g, '');
    }
  }

  const plainMatch = headerValue.match(/filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i);
  if (!plainMatch) {
    return null;
  }

  return (plainMatch[1] || plainMatch[2] || '').trim().replace(/^"|"$/g, '');
}

function detectResponseExtension(response) {
  const dispositionFilename = extractFilenameFromContentDisposition(
    response.headers['content-disposition']
  );
  const dispositionExtension = dispositionFilename ? extractPathExtension(dispositionFilename) : null;

  if (dispositionExtension) {
    return {
      extension: dispositionExtension,
      source: 'content-disposition',
      filename: dispositionFilename
    };
  }

  const finalUrlExtension = extractPathExtension(new URL(response.finalUrl).pathname);
  if (finalUrlExtension) {
    return {
      extension: finalUrlExtension,
      source: 'final-url',
      filename: null
    };
  }

  return {
    extension: null,
    source: null,
    filename: dispositionFilename
  };
}

function evaluateRequestRules(parsedRequest, filterData) {
  const { rules, keywords, extensions } = filterData;

  const whitelistResult = whitelistFilter(parsedRequest, rules);
  if (whitelistResult.matched) {
    return buildDecision('allow', whitelistResult.matchedRule, 'request:whitelist', {
      matchedRuleId: whitelistResult.matchedRuleId,
      keywords,
      extensions
    });
  }

  const domainResult = domainFilter(parsedRequest, rules);
  if (domainResult.matched) {
    return buildDecision('block', domainResult.matchedRule, 'request:domain', {
      matchedRuleId: domainResult.matchedRuleId,
      keywords,
      extensions
    });
  }

  const urlResult = urlFilter(parsedRequest, rules);
  if (urlResult.matched) {
    return buildDecision('block', urlResult.matchedRule, 'request:url_pattern', {
      matchedRuleId: urlResult.matchedRuleId,
      keywords,
      extensions
    });
  }

  const extensionResult = extensionFilter(parsedRequest, extensions);
  if (extensionResult.matched) {
    return buildDecision('block', extensionResult.matchedRule, 'request:extension', {
      keywords,
      extensions,
      detectedExtension: parsedRequest.extension,
      detectedExtensionSource: 'request-path'
    });
  }

  const keywordResult = keywordFilter(parsedRequest.url, keywords);
  if (keywordResult.matched) {
    return buildDecision('block', keywordResult.matchedRule, 'request:keyword', {
      keywords,
      extensions
    });
  }

  return buildDecision('allow', null, 'request:pass', {
    keywords,
    extensions
  });
}

async function evaluateRules(parsedRequest) {
  const filterData = await loadActiveFilterData();
  return evaluateRequestRules(parsedRequest, filterData);
}

function inspectResponseContent(response, filterData) {
  const responseExtension = detectResponseExtension(response);
  const extensionResult = responseExtension.extension
    ? extensionFilter(responseExtension.extension, filterData.extensions)
    : { matched: false };

  if (extensionResult.matched) {
    return buildDecision('block', extensionResult.matchedRule, 'response:extension', {
      detectedExtension: responseExtension.extension,
      detectedExtensionSource: responseExtension.source,
      detectedFilename: responseExtension.filename
    });
  }

  const contentType = String(response.headers['content-type'] || '').toLowerCase();

  if (!contentType.includes('text/html')) {
    return buildDecision('allow', null, 'response:pass', {
      contentType,
      detectedExtension: responseExtension.extension,
      detectedExtensionSource: responseExtension.source,
      detectedFilename: responseExtension.filename
    });
  }

  const keywordResult = keywordFilter(response.body.toString('utf8'), filterData.keywords);

  if (!keywordResult.matched) {
    return buildDecision('allow', null, 'response:pass', {
      contentType,
      detectedExtension: responseExtension.extension,
      detectedExtensionSource: responseExtension.source,
      detectedFilename: responseExtension.filename
    });
  }

  return buildDecision('block', keywordResult.matchedRule, 'response:keyword', {
    contentType,
    detectedExtension: responseExtension.extension,
    detectedExtensionSource: responseExtension.source,
    detectedFilename: responseExtension.filename
  });
}

module.exports = {
  loadActiveFilterData,
  evaluateRequestRules,
  evaluateRules,
  inspectResponseContent
};
