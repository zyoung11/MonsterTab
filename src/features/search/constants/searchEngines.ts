import { SearchEngine } from '@/shared/types';

export const SEARCH_ENGINES: SearchEngine[] = [
  {
    id: 'google',
    name: 'Google',
    url: 'https://www.google.com/search?q=',
  },
  {
    id: 'bing',
    name: 'Bing',
    url: 'https://www.bing.com/search?q=',
  },
  {
    id: 'baidu',
    name: 'Baidu',
    url: 'https://www.baidu.com/s?wd=',
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=',
  },
  {
    id: 'yahoo',
    name: 'Yahoo',
    url: 'https://search.yahoo.com/search?p=',
  },
  {
    id: 'ecosia',
    name: 'Ecosia',
    url: 'https://www.ecosia.org/search?q=',
  },
];

// 默认使用 Google 搜索引擎
export const DEFAULT_SEARCH_ENGINE: SearchEngine = SEARCH_ENGINES.find(e => e.id === 'google')!;

/**
 * 按启用列表过滤搜索引擎，空列表表示全部启用
 */
export function filterEnabledEngines(enabled: string[]): SearchEngine[] {
  if (enabled.length === 0) return SEARCH_ENGINES;
  return SEARCH_ENGINES.filter((engine) => enabled.includes(engine.id));
}

