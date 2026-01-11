import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NewsCategory, NewsItem, MapDataPoint, CryptoPrice } from './types';
import { fetchLiveNews } from './services/geminiService';
import NewsItemComponent from './components/NewsItem';
import WorldMap from './components/WorldMap';

const Categories = [
  { label: 'ALL', value: 'ALL' },
  { label: 'CRYPTO', value: NewsCategory.CRYPTO },
  { label: 'TRADFI', value: NewsCategory.TRADFI },
  { label: 'DEFI', value: NewsCategory.DEFI },
  { label: 'TECH', value: NewsCategory.TECH },
  { label: 'POLITICS', value: NewsCategory.POLITICS },
];

const GEO_KEYWORDS: Record<string, { lat: number, lng: number }> = {
  'CHINA': { lat: 35.8617, lng: 104.1954 },
  'US': { lat: 37.0902, lng: -95.7129 },
  'USA': { lat: 37.0902, lng: -95.7129 },
  'UK': { lat: 55.3781, lng: -3.4360 },
  'LONDON': { lat: 51.5074, lng: -0.1278 },
  'EU': { lat: 54.5260, lng: 15.2551 },
  'RUSSIA': { lat: 61.5240, lng: 105.3188 },
  'JAPAN': { lat: 36.2048, lng: 138.2529 },
  'TOKYO': { lat: 35.6762, lng: 139.6503 },
  'INDIA': { lat: 20.5937, lng: 78.9629 },
  'BRAZIL': { lat: -14.2350, lng: -51.9253 },
  'GERMANY': { lat: 51.1657, lng: 10.4515 },
  'FRANCE': { lat: 46.2276, lng: 2.2137 },
  'AUSTRALIA': { lat: -25.2744, lng: 133.7751 },
  'DUBAI': { lat: 25.2048, lng: 55.2708 },
  'NY': { lat: 40.7128, lng: -74.0060 },
  'YORK': { lat: 40.7128, lng: -74.0060 },
  'CALIFORNIA': { lat: 36.7783, lng: -119.4179 },
  'BEIJING': { lat: 39.9042, lng: 116.4074 },
  'SHANGHAI': { lat: 31.2304, lng: 121.4737 },
  'SINGAPORE': { lat: 1.3521, lng: 103.8198 },
  'HONG KONG': { lat: 22.3193, lng: 114.1694 },
};

function App() {
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | 'ALL'>('ALL');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isLive, setIsLive] = useState(true); 
  const [page, setPage] = useState(1);
  const [mapMarkers, setMapMarkers] = useState<MapDataPoint[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [marketData, setMarketData] = useState<CryptoPrice[]>([]);

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchMarketData = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano,ripple&vs_currencies=usd&include_24hr_change=true');
      const data = await response.json();
      
      const formatted: CryptoPrice[] = [
        { id: 'btc', symbol: 'BTC', price: data.bitcoin.usd, change24h: data.bitcoin.usd_24h_change },
        { id: 'eth', symbol: 'ETH', price: data.ethereum.usd, change24h: data.ethereum.usd_24h_change },
        { id: 'sol', symbol: 'SOL', price: data.solana.usd, change24h: data.solana.usd_24h_change },
        { id: 'xrp', symbol: 'XRP', price: data.ripple.usd, change24h: data.ripple.usd_24h_change },
      ];
      setMarketData(formatted);
    } catch (err) {
      // Silent fail or keep previous data
    }
  };

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = useCallback(async (category: NewsCategory | 'ALL', isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    const currentPage = isLoadMore ? page + 1 : 1;
    let items: NewsItem[] = [];

    // Note: We are now using real APIs for Crypto and Tech, which might return more items at once.
    if (category === 'ALL') {
      const crypto = await fetchLiveNews(NewsCategory.CRYPTO, currentPage);
      const tech = await fetchLiveNews(NewsCategory.TECH, currentPage);
      const world = await fetchLiveNews(NewsCategory.WORLD, currentPage); // Still Gemini
      items = [...crypto, ...tech, ...world].sort((a, b) => Math.random() - 0.5); 
    } else {
      items = await fetchLiveNews(category, currentPage);
    }

    if (isLoadMore) {
      setNews(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const uniqueNewItems = items.filter(n => !existingIds.has(n.id));
        return [...prev, ...uniqueNewItems];
      });
      setPage(currentPage);
      setLoadingMore(false);
    } else {
      setNews(items);
      setPage(1);
      if (items.length > 0 && !selectedNews) {
        handleNewsSelect(items[0]);
      }
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]); 

  useEffect(() => {
    loadData(selectedCategory, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]); 

  useEffect(() => {
    if (!isLive) return;
    const pollInterval = setInterval(() => {
       loadData(selectedCategory, false);
    }, 60000); 

    return () => clearInterval(pollInterval);
  }, [isLive, selectedCategory, loadData]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading && !loadingMore) {
          loadData(selectedCategory, true);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loading, loadingMore, selectedCategory, loadData]);

  const handleNewsSelect = (item: NewsItem) => {
    setSelectedNews(item);
    
    const upperText = (item.title + " " + item.summary).toUpperCase();
    let foundLoc: MapDataPoint | null = null;
    
    for (const [key, coords] of Object.entries(GEO_KEYWORDS)) {
      if (upperText.includes(key)) {
        foundLoc = { 
          id: `loc-${Date.now()}`, 
          lat: coords.lat, 
          lng: coords.lng, 
          label: key, 
          intensity: 1 
        };
        break;
      }
    }

    if (foundLoc) {
      setMapMarkers([foundLoc]);
    } else {
      setMapMarkers([]); 
    }
  };

  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-text font-mono flex flex-col overflow-hidden selection:bg-terminal-accent selection:text-black">
      
      {/* HEADER */}
      <header className="border-b border-terminal-border bg-terminal-panel/50 p-3 flex justify-between items-center sticky top-0 z-50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold tracking-tighter text-terminal-accent flex items-center gap-2">
            <div className="w-3 h-3 bg-terminal-accent animate-pulse-fast"></div>
            NEXUS_TERMINAL v2.0
          </div>
          <div className="h-6 w-px bg-terminal-border"></div>
          
          <div className="flex gap-1 hidden md:flex">
            {Categories.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setSelectedCategory(cat.value)}
                className={`
                  px-3 py-1 text-xs border transition-all duration-200
                  ${selectedCategory === cat.value 
                    ? 'border-terminal-accent text-terminal-accent bg-terminal-accent/10 shadow-[0_0_10px_rgba(0,255,157,0.2)]' 
                    : 'border-transparent hover:border-terminal-border text-terminal-muted hover:text-terminal-text'}
                `}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs">
           <div className="flex flex-col items-end">
             <span className="text-terminal-accent">{currentTime.toLocaleTimeString()}</span>
             <span className="text-terminal-muted">{currentTime.toLocaleDateString()}</span>
           </div>
           
           <button 
             onClick={() => setIsLive(!isLive)}
             className={`flex items-center gap-2 px-3 py-1 border transition-colors ${isLive ? 'border-terminal-alert bg-terminal-alert/10 text-terminal-alert' : 'border-terminal-muted text-terminal-muted'}`}
           >
             <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-terminal-alert animate-pulse' : 'bg-terminal-muted'}`}></div>
             <span className="font-bold">{isLive ? 'LIVE' : 'PAUSED'}</span>
           </button>
        </div>
      </header>

      {/* MAIN GRID */}
      <main className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        
        {/* LEFT COL: NEWS LIST (FEED) */}
        <div className="col-span-12 md:col-span-4 border-r border-terminal-border flex flex-col h-full bg-terminal-bg">
          
          <div className="p-2 border-b border-terminal-border bg-terminal-panel/30 flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-terminal-accent">
              Input Stream: {selectedCategory}
              <span className="ml-2 opacity-50">
                [{loading ? 'RECEIVING...' : isLive ? 'AUTO-REFRESH' : 'STATIC'}]
              </span>
            </h2>
            <button onClick={() => loadData(selectedCategory, false)} className="text-[10px] hover:text-white transition-colors text-terminal-muted">
              [ REFRESH ]
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-4 space-y-3 opacity-50">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-20 border-b border-terminal-border/30 animate-pulse bg-terminal-panel/20"></div>
                ))}
              </div>
            ) : (
              <>
                {news.map((item) => (
                  <NewsItemComponent 
                    key={item.id} 
                    item={item} 
                    onClick={handleNewsSelect}
                    isActive={selectedNews?.id === item.id}
                  />
                ))}
                
                <div ref={observerTarget} className="p-4 text-center border-t border-terminal-border/20">
                  {loadingMore ? (
                    <div className="flex items-center justify-center gap-2 text-xs animate-pulse text-terminal-accent">
                       <span>⟳</span>
                       <span>FETCHING ARCHIVES...</span>
                    </div>
                  ) : (
                    <div className="h-4"></div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* BOTTOM LEFT: MARKET TICKER */}
          <div className="h-32 border-t border-terminal-border bg-terminal-panel/20 p-2 flex flex-col">
            <h3 className="text-[10px] text-terminal-muted mb-2 uppercase flex justify-between">
              <span>Market Data (CoinGecko API)</span>
              <span className="text-terminal-accent text-[9px] opacity-70">LIVE</span>
            </h3>
            <div className="flex-1 flex gap-2 overflow-x-auto">
               {marketData.length > 0 ? marketData.map(coin => (
                 <div key={coin.id} className="flex-1 min-w-[100px] bg-terminal-bg border border-terminal-border p-2 flex flex-col justify-center items-center">
                    <span className="text-terminal-text text-lg font-bold">{coin.symbol}</span>
                    <span className={`text-xs ${coin.change24h >= 0 ? 'text-terminal-accent' : 'text-terminal-alert'}`}>
                       {coin.change24h > 0 ? '+' : ''}{coin.change24h.toFixed(2)}% {coin.change24h >= 0 ? '▲' : '▼'}
                    </span>
                    <span className="text-[10px] text-terminal-muted mt-1">${coin.price.toLocaleString()}</span>
                 </div>
               )) : (
                 <div className="w-full h-full flex items-center justify-center text-xs text-terminal-muted animate-pulse">
                    ESTABLISHING DATALINK...
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* RIGHT COL: DETAIL + MAP */}
        <div className="col-span-12 md:col-span-8 flex flex-col h-full overflow-y-auto">
          
          <div className="h-1/2 min-h-[400px] border-b border-terminal-border p-6 flex gap-6 relative">
            <div className="absolute top-2 right-2 flex gap-1">
              <div className="w-2 h-2 bg-terminal-border rounded-full"></div>
              <div className="w-2 h-2 bg-terminal-border rounded-full"></div>
            </div>

            {selectedNews ? (
              <div className="w-full flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                   <span className="px-2 py-1 text-black text-xs font-bold bg-terminal-accent">
                     {selectedNews.category}
                   </span>
                   <span className="text-terminal-muted text-xs">ID: {selectedNews.id.substring(0,8)}</span>
                </div>
                
                <h1 className="text-3xl font-bold mb-4 text-white leading-tight">{selectedNews.title}</h1>
                
                <div className="flex-1 overflow-y-auto pr-2">
                  <p className="text-terminal-text/90 text-xl mb-6 leading-relaxed border-l-4 border-terminal-accent pl-6 py-2">
                    {selectedNews.summary}
                  </p>
                  
                  {selectedNews.url && (
                    <a 
                      href={selectedNews.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-terminal-panel border border-terminal-accent text-terminal-accent hover:bg-terminal-accent hover:text-black transition-colors text-xs font-bold uppercase tracking-wider"
                    >
                      [ OPEN_UPLINK ] ↗
                    </a>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-terminal-border flex justify-between items-center text-xs text-terminal-muted">
                   <span className="text-terminal-secondary">SOURCE: {selectedNews.source}</span>
                   <span>RECEIVED: {selectedNews.time}</span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-terminal-muted">
                SELECT A TRANSMISSION TO DECODE
              </div>
            )}
          </div>

          {/* BOTTOM SECTION: MAP & ANALYTICS */}
          <div className="h-1/2 p-4 grid grid-cols-2 gap-4 bg-terminal-panel/5">
             {/* Map Container */}
             <div className="relative border border-terminal-border bg-terminal-bg p-1 group">
               <div className="absolute top-2 left-2 z-10 text-[10px] bg-black/80 px-1 border border-terminal-border text-terminal-text">GLOBAL_EVENT_HEATMAP</div>
               <WorldMap markers={mapMarkers} />
               <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-terminal-accent/5 to-transparent h-[10%] w-full animate-[scan_3s_linear_infinite] opacity-30"></div>
             </div>

             {/* Analytics / Trending Widgets */}
             <div className="flex flex-col gap-4">
                <div className="flex-1 border border-terminal-border bg-terminal-bg p-4 overflow-hidden relative">
                   <h3 className="text-xs text-terminal-secondary font-bold mb-3 border-b border-terminal-border/50 pb-1">TRENDING_KEYWORDS</h3>
                   <div className="flex flex-wrap gap-2">
                      {['#BITCOIN', '#ELECTION', '#AI_REGULATION', '#QUANTUM', '#SPACEX', '#INFLATION', '#FED', '#ETHEREUM'].map(tag => (
                        <span key={tag} className="text-xs px-2 py-1 bg-terminal-panel border border-terminal-border text-terminal-text/70 hover:text-terminal-accent hover:border-terminal-accent cursor-pointer transition-colors">
                          {tag}
                        </span>
                      ))}
                   </div>
                </div>

                <div className="flex-1 border border-terminal-border bg-terminal-bg p-4 flex flex-col relative overflow-hidden">
                    <h3 className="text-xs text-terminal-alert font-bold mb-2 flex justify-between">
                      <span>SYSTEM_ALERTS</span>
                      <span className="w-2 h-2 rounded-full bg-terminal-alert animate-pulse"></span>
                    </h3>
                    <ul className="text-xs space-y-2 font-mono text-terminal-text/80">
                      <li className="flex gap-2">
                        <span className="text-terminal-muted">[{currentTime.getHours()}:02]</span>
                        <span>High volatility detected in Crypto sector.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-terminal-muted">[{currentTime.getHours() - 1}:45]</span>
                        <span>Connection stable. 24ms latency.</span>
                      </li>
                    </ul>
                </div>
             </div>
          </div>

        </div>
      </main>
      
      {/* FOOTER TICKER */}
      <footer className="h-8 bg-terminal-panel border-t border-terminal-border flex items-center overflow-hidden whitespace-nowrap">
        <div className="px-4 bg-terminal-accent text-black font-bold text-xs h-full flex items-center z-10">LATEST</div>
        <div className="animate-[marquee_20s_linear_infinite] flex items-center gap-12 px-4 text-xs font-mono text-terminal-text">
           {news.map((n, i) => (
             <span key={i} className="flex items-center gap-2">
               <span className="text-terminal-secondary">★</span>
               <span className="uppercase">{n.title}</span>
               <span className="text-terminal-muted">[{n.source}]</span>
             </span>
           ))}
        </div>
      </footer>

      <style>{`
        @keyframes scan {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0a0a0a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
        }
      `}</style>
    </div>
  );
}

export default App;