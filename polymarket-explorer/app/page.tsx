'use client';
import { useState, useEffect, useCallback } from 'react';
import { fetchMarkets, fetchCategories, fetchWithRetry } from '@/lib/api';
import { filterMarkets } from '@/lib/utils';
import type { Market, MarketFilter } from '@/lib/types';
import { MarketCard } from '@/components/MarketCard';
import { MarketDetailModal } from '@/components/MarketDetailModal';
import { FilterPanel } from '@/components/FilterPanel';
import { SkeletonGrid } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
export default function Home() {
const [markets, setMarkets] = useState&lt;Market[]&gt;([]);
const [filteredMarkets, setFilteredMarkets] = useState&lt;Market[]&gt;([]);
const [categories, setCategories] = useState&lt;string[]&gt;([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState&lt;string | null&gt;(null);
const [selectedMarket, setSelectedMarket] = useState&lt;Market | null&gt;(null);
const [displayedCount, setDisplayedCount] = useState(20);
const [retrying, setRetrying] = useState(false);
const loadMarkets = useCallback(async () =&gt; {
try {
setLoading(true);
setError(null);
setRetrying(false);
// Retry logic for Render cold starts
const data = await fetchWithRetry(
() =&gt; fetchMarkets({ limit: 1000 }),
3, // 3 retries
1000 // 1 second initial delay
);
setMarkets(data);
setFilteredMarkets(data);
} catch (err) {
const message = err instanceof Error ? err.message : 'Failed to load markets';
setError(message);
console.error('Error loading markets:', message);
} finally {
setLoading(false);
}
}, []);
const loadCategories = useCallback(async () =&gt; {
try {
const cats = await fetchCategories();
setCategories(cats);
} catch (err) {
console.warn('Failed to load categories');
}
}, []);
useEffect(() =&gt; {
loadMarkets();
loadCategories();
}, [loadMarkets, loadCategories]);
const handleFilter = useCallback((filters: MarketFilter) =&gt; {
const filtered = filterMarkets(markets, filters);
setFilteredMarkets(filtered);
setDisplayedCount(20);
}, [markets]);
const visibleMarkets = filteredMarkets.slice(0, displayedCount);
const hasMore = displayedCount &lt; filteredMarkets.length;
return (
<div>
&lt;section className="relative py-12 px-4 sm:px-6 lg:px-8"&gt;
<div>
<div>
<div>
<div>
<span> </span>
</div>
<h1>
Polymarket Explorer
</h1>
</div>
<p>
Explore live prediction markets from Render backend
</p>
</div>
&lt;FilterPanel
categories={categories}
onFilter={handleFilter}
onRefresh={loadMarkets}
totalMarkets={filteredMarkets.length}
/&gt;
</div>
&lt;/section&gt;
&lt;section className="px-4 sm:px-6 lg:px-8 pb-20"&gt;
<div>
{loading ? (
<div>
&lt;SkeletonGrid count={12} /&gt;
<p>
Connecting to backend... (may take a moment on first load)
</p>
</div>
) : error ? (
&lt;ErrorState error={error} onRetry={loadMarkets} /&gt;
) : filteredMarkets.length === 0 ? (
&lt;EmptyState /&gt;
) : (
&lt;&gt;
<div>
{visibleMarkets.map((market) =&gt; (
<div> setSelectedMarket(market)}
className="cursor-pointer fade-in"
&gt;
&lt;MarketCard market={market} /&gt;
</div>
))}
</div>
{hasMore &amp;&amp; (
<div>
&lt;button
onClick={() =&gt; setDisplayedCount(prev =&gt; prev + 20)}
className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold
&gt;
Load More ({displayedCount} / {filteredMarkets.length})
&lt;/button&gt;
</div>
)}
<div>
Showing {visibleMarkets.length} of {filteredMarkets.length} markets
</div>
)}
</div>
&lt;/section&gt;
{selectedMarket &amp;&amp; (
&lt;MarketDetailModal
market={selectedMarket}
onClose={() =&gt; setSelectedMarket(null)}
/&gt;
)}
</div>
);
}
