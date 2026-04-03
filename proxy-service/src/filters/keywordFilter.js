function keywordFilter(content, keywords) {
  const normalized = String(content || '').toLowerCase();
  const matchedKeyword = keywords.find((item) => normalized.includes(item.keyword.toLowerCase()));

  if (!matchedKeyword) {
    return { matched: false };
  }

  return {
    matched: true,
    matchedRule: `keyword:block:${matchedKeyword.keyword}`
  };
}

module.exports = keywordFilter;
