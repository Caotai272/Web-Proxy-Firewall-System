const { appliesToScope } = require('./ruleScope');

function urlFilter(parsedRequest, rules) {
  const matchedRule = rules.find(
    (rule) =>
      rule.type === 'url_pattern' &&
      rule.action === 'block' &&
      appliesToScope(rule, parsedRequest) &&
      parsedRequest.url.includes(rule.target)
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

module.exports = urlFilter;
