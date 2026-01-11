export enum NewsCategory {
  CRYPTO = 'Crypto',
  TRADFI = 'TradFi',
  DEFI = 'DeFi',
  POLITICS = 'Politics',
  TECH = 'Technology',
  SPORTS = 'Sports',
  WORLD = 'World'
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  time: string;
  url?: string;
  category: NewsCategory;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface MapDataPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  intensity: number; // 0-1
}

export interface CryptoPrice {
  id: string;
  symbol: string;
  price: number;
  change24h: number;
}