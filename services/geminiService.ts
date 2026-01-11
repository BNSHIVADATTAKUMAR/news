import { GoogleGenAI } from "@google/genai";
import { NewsCategory, NewsItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- External API Helpers ---

async function fetchCryptoCompareNews(category: NewsCategory): Promise<NewsItem[]> {
  try {
    // 1. Fetch from CryptoCompare (Free, robust for Crypto/DeFi)
    const response = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
    const data = await response.json();
    
    if (data.Data && Array.isArray(data.Data)) {
      return data.Data.slice(0, 15).map((item: any) => ({
        id: `cc-${item.id}`,
        title: item.title,
        summary: item.body.replace(/&#39;/g, "'").replace(/&quot;/g, '"') || "No summary available.",
        source: item.source_info.name,
        time: new Date(item.published_on * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        url: item.url,
        category: category,
        sentiment: 'neutral'
      }));
    }
    return [];
  } catch (error) {
    console.error("CryptoCompare API Error:", error);
    return [];
  }
}

async function fetchHackerNews(): Promise<NewsItem[]> {
  try {
    // 2. Fetch from HNPWA (Faster HN API)
    const response = await fetch('https://api.hnpwa.com/v0/news/1.json');
    const data = await response.json();

    if (Array.isArray(data)) {
      return data.slice(0, 15).map((item: any) => ({
        id: `hn-${item.id}`,
        title: item.title,
        summary: `Trending on HackerNews. ${item.domain ? `Source: ${item.domain}` : ''}`,
        source: "HackerNews",
        time: item.time_ago,
        url: item.url,
        category: NewsCategory.TECH,
        sentiment: 'neutral'
      }));
    }
    return [];
  } catch (error) {
    console.error("HackerNews API Error:", error);
    return [];
  }
}

async function fetchGeminiSearchNews(category: NewsCategory, page: number): Promise<NewsItem[]> {
  try {
    // 3. Fallback/General: Use Gemini with Search Tool
    // "Remove AI Summary": We ask for direct headlines and snippets.
    const prompt = `Search for the absolute latest 10 news headlines about ${category}.
    Format strictly as list separated by "|||".
    Pattern: Title | Source | TimeAgo | Brief Snippet (do not generate a summary, use the lead text).
    Example: Senate passes new bill | AP News | 10m ago | The legislation aims to curb inflation...
    Do not use markdown.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    if (!text) return [];

    const lines = text.split('|||');
    return lines.map((line, index) => {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length < 4) return null;
      return {
        id: `gen-${category}-${page}-${index}-${Date.now()}`,
        title: parts[0],
        source: parts[1],
        time: parts[2],
        summary: parts[3],
        category: category,
        sentiment: 'neutral'
      };
    }).filter((item): item is NewsItem => item !== null);

  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
  }
}

// --- Main Dispatcher ---

export const fetchLiveNews = async (category: NewsCategory, page: number = 1): Promise<NewsItem[]> => {
  let items: NewsItem[] = [];

  // Route to specific APIs to reduce Gemini dependency
  if (category === NewsCategory.CRYPTO || category === NewsCategory.DEFI) {
    items = await fetchCryptoCompareNews(category);
  } else if (category === NewsCategory.TECH) {
    items = await fetchHackerNews();
  }
  
  // If external API returned items, return them.
  if (items.length > 0) return items;

  // Otherwise (or for World/Politics/TradFi/Sports), use Gemini Search
  return fetchGeminiSearchNews(category, page);
};