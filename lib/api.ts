import axios, { AxiosError } from 'axios';
import type {
Market,
MarketsResponse,
CategoriesResponse,
ApiError
} from './types';
// Use Render backend URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://predibet.onrender.com';
console.log(`[API] Using backend URL: ${API_URL}`);
const apiClient = axios.create({
baseURL: API_URL,
timeout: 20000, // Increased for Render cold starts
headers: {
'Content-Type': 'application/json',
'Accept': 'application/json',
},
});
apiClient.interceptors.request.use(
(config) =&gt; {
console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
return config;
},
(error) =&gt; {
console.error(`[API] Request Error:`, error.message);
return Promise.reject(error);
}
);
apiClient.interceptors.response.use(
(response) =&gt; {
console.log(`[API] Success (${response.status}): Got ${response.data.count || 0} markets`);
return response;
},
(error: AxiosError) =&gt; {
console.error(`[API] Response Error:`, {
status: error.response?.status,
message: error.message,
url: error.config?.url,
});
return Promise.reject(error);
}
);
export async function fetchMarkets(filters?: {
limit?: number;
min_volume?: number;
category?: string;
}): Promise&lt;Market[]&gt; {
try {
const params = {
limit: filters?.limit || 1000,
...(filters?.min_volume &amp;&amp; { min_volume: filters.min_volume }),
...(filters?.category &amp;&amp; { category: filters.category }),
};
console.log('[API] Fetching markets with params:', params);
const response = await apiClient.get&lt;MarketsResponse&gt;('/api/markets', {
params,
});
if (!response.data.success) {
throw new Error('API returned success: false');
}
const markets = response.data.markets || [];
console.log(`[API] Successfully fetched ${markets.length} markets`);
return markets;
} catch (error) {
throw handleApiError(error);
}
}
export async function fetchCategories(): Promise&lt;string[]&gt; {
try {
const response = await apiClient.get&lt;CategoriesResponse&gt;('/api/categories');
if (!response.data.success) {
throw new Error('API returned success: false');
}
const categories = response.data.categories
.map(cat =&gt; cat.name)
.sort();
console.log(`[API] Fetched ${categories.length} categories`);
return categories;
} catch (error) {
console.warn('[API] Failed to fetch categories, continuing');
return [];
}
}
export async function fetchMarketById(marketId: string): Promise&lt;Market | null&gt; {
try {
const markets = await fetchMarkets({ limit: 1000 });
return markets.find(m =&gt; m.id === marketId) || null;
} catch (error) {
throw handleApiError(error);
}
}
export async function searchMarkets(query: string): Promise&lt;Market[]&gt; {
try {
const allMarkets = await fetchMarkets({ limit: 1000 });
const queryLower = query.toLowerCase();
return allMarkets.filter(market =&gt;
market.question.toLowerCase().includes(queryLower) ||
market.description?.toLowerCase().includes(queryLower) ||
market.category?.toLowerCase().includes(queryLower)
);
} catch (error) {
throw handleApiError(error);
}
}
export async function getMarketStats(): Promise&lt;{
totalMarkets: number;
totalVolume: number;
avgProbability: number;
categories: string[];
lastUpdated: Date;
}&gt; {
try {
const markets = await fetchMarkets({ limit: 1000 });
const categories = await fetchCategories();
const totalVolume = markets.reduce((sum, m) =&gt; sum + (m.volume || 0), 0);
const avgProbability = markets.length &gt; 0
? markets.reduce((sum, m) =&gt; sum + (m.probability || 0), 0) / markets.length
: 0;
return {
totalMarkets: markets.length,
totalVolume,
avgProbability,
categories,
lastUpdated: new Date(),
};
} catch (error) {
throw handleApiError(error);
}
}
function handleApiError(error: unknown): Error {
if (axios.isAxiosError(error)) {
if (error.response) {
const status = error.response.status;
const data = error.response.data as any;
if (status === 503) {
return new Error('Backend is temporarily unavailable. Please try again.');
} else if (status === 504) {
return new Error('Request timeout. Backend is slow.');
} else if (status &gt;= 500) {
return new Error(`Server error (${status}): ${data?.error || 'Unknown'}`);
}
return new Error(data?.error || `Error: ${status}`);
} else if (error.request) {
return new Error(
'Cannot connect to backend. Make sure server is running at: ' + API_URL
);
} else {
return new Error(`Request error: ${error.message}`);
}
}
return new Error(
error instanceof Error ? error.message : 'Unknown error'
);
}
export async function fetchWithRetry&lt;T&gt;(
fn: () =&gt; Promise&lt;T&gt;,
maxRetries: number = 3,
baseDelay: number = 1000
): Promise&lt;T&gt; {
let lastError: Error | undefined;
for (let attempt = 0; attempt &lt; maxRetries; attempt++) {
try {
return await fn();
} catch (error) {
lastError = error instanceof Error ? error : new Error(String(error));
if (attempt &lt; maxRetries - 1) {
const delay = baseDelay * Math.pow(2, attempt);
console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
await new Promise(resolve =&gt; setTimeout(resolve, delay));
}
}
}
throw lastError;
}
export async function checkHealth(): Promise&lt;boolean&gt; {
try {
const response = await apiClient.get('/health', { timeout: 5000 });
return response.status === 200;
} catch (error) {
return false;
}
}
export default apiClient;
