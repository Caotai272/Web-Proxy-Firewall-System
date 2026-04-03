function matchesDomain(target, domain) {
  return domain === target || domain.endsWith(`.${target}`);
}

function normalizeIp(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.startsWith('::ffff:') ? normalized.slice(7) : normalized;
}

function appliesToScope(rule, parsedRequest) {
  const scopeType = rule.scope_type || 'global';
  const scopeValue = rule.scope_value || null;

  if (scopeType === 'global') {
    return true;
  }

  if (scopeType === 'client_ip') {
    return Boolean(scopeValue) && normalizeIp(parsedRequest.clientIp) === normalizeIp(scopeValue);
  }

  if (scopeType === 'request_domain') {
    return Boolean(scopeValue) && matchesDomain(scopeValue, parsedRequest.domain);
  }

  return true;
}

module.exports = {
  matchesDomain,
  appliesToScope
};
