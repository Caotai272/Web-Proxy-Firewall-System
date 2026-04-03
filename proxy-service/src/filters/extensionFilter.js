function extensionFilter(parsedRequest, extensions) {
  const matchedExtension = extensions.find(
    (item) => item.extension.toLowerCase() === String(parsedRequest.extension || '').toLowerCase()
  );

  if (!matchedExtension) {
    return { matched: false };
  }

  return {
    matched: true,
    matchedRule: `extension:block:${matchedExtension.extension}`
  };
}

module.exports = extensionFilter;
