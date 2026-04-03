function matchesDomain(target, domain) {
  return domain === target || domain.endsWith(`.${target}`);
}

function domainFilter(parsedRequest, rules) {
  const matchedRule = rules.find(
    (rule) =>
      rule.type === 'domain' &&
      rule.action === 'block' &&
      matchesDomain(rule.target, parsedRequest.domain)
  );

  if (!matchedRule) {
    return { matched: false };
  }

  return {
    matched: true,
    matchedRule: `${matchedRule.type}:block:${matchedRule.target}`
  };
}

module.exports = domainFilter;
