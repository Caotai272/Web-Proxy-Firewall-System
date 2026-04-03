const { appliesToScope, matchesDomain } = require('./ruleScope');

function whitelistFilter(parsedRequest, rules) {
  const allowRules = rules.filter((rule) => rule.action === 'allow' && appliesToScope(rule, parsedRequest));

  const matchedRule = allowRules.find((rule) => {
    if (rule.type === 'domain') {
      return matchesDomain(rule.target, parsedRequest.domain);
    }

    if (rule.type === 'url_pattern') {
      return parsedRequest.url.includes(rule.target);
    }

    return false;
  });

  if (!matchedRule) {
    return { matched: false };
  }

  return {
    matched: true,
    matchedRule: `${matchedRule.type}:allow:${matchedRule.target}`,
    matchedRuleId: matchedRule.id
  };
}

module.exports = whitelistFilter;
