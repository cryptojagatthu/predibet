import { formatDistanceToNow, format } from 'date-fns';
import type { Market, MarketFilter } from './types';
export function formatVolume(volume?: number | null): string {
if (!volume || volume === 0) return '$0';
if (volume &gt;= 1_000_000) {
return '$' + (volume / 1_000_000).toFixed(1) + 'M';
} else if (volume &gt;= 1_000) {
return '$' + (volume / 1_000).toFixed(1) + 'K';
} else {
return '$' + volume.toFixed(2);
}
}
export function formatProbability(prob?: number | null): string {
if (prob === null || prob === undefined) return '—';
return Math.round(prob * 100) + '%';
}
export function formatRelativeDate(dateString?: string | null): string {
if (!dateString) return '—';
try {
return formatDistanceToNow(new Date(dateString), { addSuffix: true });
} catch {
return '—';
}
}
export function formatAbsoluteDate(dateString?: string | null): string {
if (!dateString) return '—';
try {
return format(new Date(dateString), 'MMM dd, yyyy');
} catch {
return '—';
}
}
export function formatSpread(spread?: number | null): string {
if (!spread || spread === 0) return '—';
return (spread * 100).toFixed(2) + '%';
}
export function truncateText(text: string, maxLength: number = 100): string {
if (text.length &lt;= maxLength) return text;
return text.substring(0, maxLength) + '...';
}
export function getProbabilityColor(probability?: number | null): string {
if (!probability) return 'text-gray-400';
if (probability &gt; 0.65) return 'text-green-400';
if (probability &gt; 0.35) return 'text-yellow-400';
return 'text-red-400';
}
export function getProbabilityBgColor(probability?: number | null): string {
if (!probability) return 'bg-gray-900';
if (probability &gt; 0.65) return 'bg-green-950';
if (probability &gt; 0.35) return 'bg-yellow-950';
return 'bg-red-950';
}
export function filterMarkets(
markets: Market[],
filters: MarketFilter
): Market[] {
let filtered = [...markets];
if (filters.searchQuery) {
const query = filters.searchQuery.toLowerCase();
filtered = filtered.filter(
m =&gt;
m.question.toLowerCase().includes(query) ||
m.description?.toLowerCase().includes(query) ||
m.category?.toLowerCase().includes(query)
);
}
if (filters.category &amp;&amp; filters.category !== 'All') {
filtered = filtered.filter(m =&gt; m.category === filters.category);
}
if (filters.minVolume &amp;&amp; filters.minVolume &gt; 0) {
filtered = filtered.filter(m =&gt; (m.volume || 0) &gt;= filters.minVolume);
}
if (filters.sortBy) {
switch (filters.sortBy) {
case 'volume_desc':
filtered.sort((a, b) =&gt; (b.volume || 0) - (a.volume || 0));
break;
case 'volume_asc':
filtered.sort((a, b) =&gt; (a.volume || 0) - (b.volume || 0));
break;
case 'probability_high':
filtered.sort((a, b) =&gt; (b.probability || 0) - (a.probability || 0));
break;
case 'probability_low':
filtered.sort((a, b) =&gt; (a.probability || 0) - (b.probability || 0));
break;
case 'date_recent':
filtered.sort((a, b) =&gt; {
const dateA = new Date(a.created_at || 0).getTime();
const dateB = new Date(b.created_at || 0).getTime();
return dateB - dateA;
});
break;
}
}
return filtered;
}
export function getUniqueCategories(markets: Market[]): string[] {
const categories = new Set&lt;string&gt;();
markets.forEach(m =&gt; {
if (m.category) {
categories.add(m.category);
}
});
return Array.from(categories).sort();
}
export function getOutcomeColor(index: number): string {
const colors = ['bg-green-600', 'bg-red-600', 'bg-blue-600', 'bg-yellow-600'];
return colors[index % colors.length];
}
export function isValidImageUrl(url?: string): boolean {
if (!url) return false;
try {
const urlObj = new URL(url);
const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const pathname = urlObj.pathname.toLowerCase();
return validExtensions.some(ext =&gt; pathname.endsWith(ext));
} catch {
return false;
}
}
export function getMarketStatus(market: Market): string {
if (market.closed) return 'Closed';
if (market.archived) return 'Archived';
if (!market.accepting_orders) return 'Not Accepting';
if (market.active) return 'Live';
return 'Inactive';
}
export function getDaysUntilEnd(endDate?: string | null): number | null {
if (!endDate) return null;
try {
const end = new Date(endDate);
const now = new Date();
const diffMs = end.getTime() - now.getTime();
const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
return diffDays;
} catch {
return null;
}
}
export function formatDaysUntilEnd(endDate?: string | null): string {
const days = getDaysUntilEnd(endDate);
if (days === null) return '—';
if (days &lt; 0) return 'Ended';
if (days === 0) return 'Today';
if (days === 1) return 'Tomorrow';
return days + ' days';
}
