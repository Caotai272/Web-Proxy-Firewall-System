const whitelistFilter = require('../filters/whitelistFilter');
const domainFilter = require('../filters/domainFilter');
const urlFilter = require('../filters/urlFilter');
const extensionFilter = require('../filters/extensionFilter');
const keywordFilter = require('../filters/keywordFilter');
const { listActiveRules } = require('../repositories/ruleRepository');
const { listActiveKeywords } = require('../repositories/keywordRepository');
const { listActiveExtensions } = require('../repositories/extensionRepository');

async function evaluateRules(parsedRequest) {
  const [rules, keywords, extensions] = await Promise.all([
    listActiveRules(),
    listActiveKeywords(),
    listActiveExtensions()
  ]);

  const whitelistResult = whitelistFilter(parsedRequest, rules);
  if (whitelistResult.matched) {
    return {
      decision: 'allow',
      matchedRule: whitelistResult.matchedRule,
      keywords
    };
  }

  const domainResult = domainFilter(parsedRequest, rules);
  if (domainResult.matched) {
    return {
      decision: 'block',
      matchedRule: domainResult.matchedRule,
      keywords
    };
  }

  const urlResult = urlFilter(parsedRequest, rules);
  if (urlResult.matched) {
    return {
      decision: 'block',
      matchedRule: urlResult.matchedRule,
      keywords
    };
  }

  const extensionResult = extensionFilter(parsedRequest, extensions);
  if (extensionResult.matched) {
    return {
      decision: 'block',
      matchedRule: extensionResult.matchedRule,
      keywords
    };
  }

  const keywordResult = keywordFilter(parsedRequest.url, keywords);
  if (keywordResult.matched) {
    return {
      decision: 'block',
      matchedRule: keywordResult.matchedRule,
      keywords
    };
  }

  return {
    decision: 'allow',
    matchedRule: null,
    keywords
  };
}

function inspectResponseContent(response, keywords) {
  const contentType = String(response.headers['content-type'] || '').toLowerCase();

  if (!contentType.includes('text/html')) {
    return {
      decision: 'allow',
      matchedRule: null
    };
  }

  const keywordResult = keywordFilter(response.body.toString('utf8'), keywords);

  if (!keywordResult.matched) {
    return {
      decision: 'allow',
      matchedRule: null
    };
  }

  return {
    decision: 'block',
    matchedRule: keywordResult.matchedRule
  };
}

module.exports = {
  evaluateRules,
  inspectResponseContent
};
