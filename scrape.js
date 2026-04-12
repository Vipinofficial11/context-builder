// Feature 3: Smart Website Scraping
// This script is injected dynamically and returns the scraped content.

(function() {
  try {
    // 1. Use Readability to extract main content
    // We need to clone the document because Readability modifies it
    const documentClone = document.cloneNode(true);
    const reader = new Readability(documentClone);
    const article = reader.parse();

    if (!article || !article.content) {
      return { error: 'Failed to extract content with Readability.' };
    }

    // 2. Use Turndown to convert to Markdown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
    
    const markdown = turndownService.turndown(article.content);

    // Return the result
    return {
      title: article.title,
      content: markdown
    };
  } catch (error) {
    console.error('Scrape error:', error);
    return { error: error.message };
  }
})();
