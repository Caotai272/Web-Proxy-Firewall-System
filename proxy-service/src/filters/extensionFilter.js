function extensionFilter(target, extensions) {
  const extension = typeof target === 'string'
    ? target
    : String(target && target.extension ? target.extension : '');

  const matchedExtension = extensions.find(
    (item) => item.extension.toLowerCase() === extension.toLowerCase()
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
