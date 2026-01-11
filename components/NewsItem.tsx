import React from 'react';
import { NewsItem as NewsItemType } from '../types';

interface Props {
  item: NewsItemType;
  onClick: (item: NewsItemType) => void;
  isActive: boolean;
}

const NewsItem: React.FC<Props> = ({ item, onClick, isActive }) => {
  return (
    <div 
      onClick={() => onClick(item)}
      className={`
        p-3 border-b border-terminal-border cursor-pointer transition-all duration-200 group
        ${isActive ? 'bg-terminal-border/30 border-l-2 border-l-terminal-accent' : 'hover:bg-terminal-panel border-l-2 border-l-transparent'}
      `}
    >
      <div className="flex justify-between items-start mb-1">
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${isActive ? 'bg-terminal-accent text-black' : 'text-terminal-accent bg-terminal-accent/10'}`}>
          {item.category.toUpperCase()}
        </span>
        <span className="text-[10px] text-terminal-muted font-mono">{item.time}</span>
      </div>
      <h3 className={`font-mono text-sm mb-1 leading-tight group-hover:text-white ${isActive ? 'text-white' : 'text-terminal-text'}`}>
        {item.title}
      </h3>
      <div className="flex justify-between items-end">
        <span className="text-[10px] text-terminal-secondary uppercase tracking-wider font-mono">
          SOURCE: {item.source}
        </span>
      </div>
    </div>
  );
};

export default NewsItem;
