const { appliesToScope, matchesDomain } = require('./ruleScope');

function domainFilter(parsedRequest, rules) {
  const matchedRule = rules.find(
    (rule) =>
      rule.type === 'domain' &&
      rule.action === 'block' &&
      appliesToScope(rule, parsedRequest) &&
      matchesDomain(rule.target, parsedRequest.domain)
  );

  if (!matchedRule) {
    return { matched: false };
  }

  return {
    matched: true,
    matchedRule: `${matchedRule.type}:block:${matchedRule.target}`,
    matchedRuleId: matchedRule.id
  };
}

module.exports = domainFilter;
