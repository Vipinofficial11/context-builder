// Compressor Utility for ContextBuilder

function compressText(text) {
  if (!text) return '';

  // 1. Extract code blocks to preserve them
  const codeBlocks = [];
  let placeholderCount = 0;
  
  // Regex to find markdown code blocks
  const codeBlockRegex = /```[\s\S]*?```/g;
  
  const textWithPlaceholders = text.replace(codeBlockRegex, (match) => {
    const placeholder = `__CODE_BLOCK_${placeholderCount}__`;
    codeBlocks.push({ placeholder, content: match });
    placeholderCount++;
    return placeholder;
  });

  // 2. Compress the non-code text
  let compressed = textWithPlaceholders;

  // 2.1 Remove common stop words (case-insensitive)
  const stopWords = [
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 
    'to', 'of', 'in', 'on', 'at', 'for', 'with', 
    'about', 'by', 'and', 'or', 'but', 'this', 'that'
  ];
  
  stopWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    compressed = compressed.replace(regex, '');
  });

  // 2.2 Technical Abbreviations
  const abbreviations = {
    'information': 'info',
    'application': 'app',
    'development': 'dev',
    'management': 'mgmt',
    'reference': 'ref',
    'database': 'db',
    'function': 'fn',
    'parameter': 'param',
    'variables': 'vars',
    'variable': 'var',
    'between': 'btwn',
    'without': 'w/o',
    'people': 'ppl',
    'message': 'msg',
    'context': 'ctx',
    'builder': 'bldr'
  };

  Object.keys(abbreviations).forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    compressed = compressed.replace(regex, abbreviations[word]);
  });

  // 2.3 Whitespace reduction
  // Reduce multiple spaces to single space
  compressed = compressed.replace(/[ \t]+/g, ' ');
  // Reduce multiple newlines to single newline
  compressed = compressed.replace(/\n\s*\n/g, '\n');
  
  compressed = compressed.trim();

  // 3. Restore code blocks
  codeBlocks.forEach(block => {
    compressed = compressed.replace(block.placeholder, '\n' + block.content + '\n');
  });

  // Final cleanup of spacing around code blocks
  compressed = compressed.replace(/\n+/g, '\n');

  return compressed;
}

// Make it available globally in the content script context
window.compressText = compressText;
