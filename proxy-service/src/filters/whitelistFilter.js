function matchesDomain(target, domain) {
  return domain === target || domain.endsWith(`.${target}`);
}

function whitelistFilter(parsedRequest, rules) {
  const allowRules = rules.filter((rule) => rule.action === 'allow');

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
    matchedRule: `${matchedRule.type}:allow:${matchedRule.target}`
  };
}

module.exports = whitelistFilter;
