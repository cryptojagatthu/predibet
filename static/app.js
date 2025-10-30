// Application State (in-memory storage)
const appState = {
    apiBaseUrl: 'http://localhost:8080',
    markets: [],
    filteredMarkets: [],
    categories: [],
    currentView: 'grid',
    filters: {
        category: '',
        minVolume: 0,
        sort: 'volume',
        limit: 50,
        search: ''
    },
    autoRefresh: false,
    autoRefreshInterval: null,
    lastUpdated: null,
    cache: {
        markets: null,
        timestamp: null,
        duration: 300000 // 5 minutes
    }
};

// Utility Functions
const utils = {
    formatNumber(num) {
        if (num >= 1000000) {
            return '$' + (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return '$' + (num / 1000).toFixed(1) + 'K';
        }
        return '$' + num.toFixed(0);
    },

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    },

    formatTimeAgo(date) {
        if (!date) return 'Never';
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return seconds + 's ago';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        return Math.floor(seconds / 86400) + 'd ago';
    },

    getCountdown(endDate) {
        if (!endDate) return 'No end date';
        const now = new Date();
        const end = new Date(endDate);
        const diff = end - now;
        
        if (diff < 0) return 'Ended';
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days > 0) return `Ends in ${days}d`;
        if (hours > 0) return `Ends in ${hours}h`;
        return 'Ending soon';
    },

    getProbabilityClass(probability) {
        if (probability >= 0.7) return 'high';
        if (probability >= 0.3) return 'medium';
        return 'low';
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// API Functions
const api = {
    async checkHealth() {
        try {
            const response = await fetch(`${appState.apiBaseUrl}/health`);
            const data = await response.json();
            return data.status === 'healthy';
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    },

    async fetchMarkets() {
        try {
            const now = Date.now();
            
            // Check cache
            if (appState.cache.markets && appState.cache.timestamp && 
                (now - appState.cache.timestamp) < appState.cache.duration) {
                console.log('Using cached markets data');
                return appState.cache.markets;
            }

            const { category, minVolume, limit } = appState.filters;
            let url = `${appState.apiBaseUrl}/api/markets?limit=${limit}`;
            
            if (minVolume > 0) url += `&min_volume=${minVolume}`;
            if (category) url += `&category=${encodeURIComponent(category)}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch markets');
            
            const data = await response.json();
            
            if (data.success && data.markets) {
                // Update cache
                appState.cache.markets = data.markets;
                appState.cache.timestamp = now;
                appState.lastUpdated = new Date();
                return data.markets;
            }
            
            throw new Error('Invalid response format');
        } catch (error) {
            console.error('Error fetching markets:', error);
            utils.showToast('Failed to fetch markets. Please check your API connection.', 'error');
            return [];
        }
    },

    async fetchCategories() {
        try {
            const response = await fetch(`${appState.apiBaseUrl}/api/categories`);
            if (!response.ok) throw new Error('Failed to fetch categories');
            
            const data = await response.json();
            
            if (data.success && data.categories) {
                return data.categories;
            }
            
            return [];
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    }
};

// UI Rendering Functions
const ui = {
    updateStats(markets) {
        const totalMarkets = markets.length;
        const totalVolume = markets.reduce((sum, m) => sum + (m.volume || 0), 0);
        const avgProbability = markets.reduce((sum, m) => sum + (m.probability || 0), 0) / totalMarkets;
        const volume24h = markets.reduce((sum, m) => sum + (m.volume_24h || 0), 0);
        
        document.getElementById('statTotalMarkets').textContent = totalMarkets.toLocaleString();
        document.getElementById('statTotalVolume').textContent = utils.formatNumber(totalVolume);
        document.getElementById('statAvgProbability').textContent = (avgProbability * 100).toFixed(1) + '%';
        document.getElementById('statVolume24h').textContent = utils.formatNumber(volume24h);
    },

    renderMarketCard(market) {
        const probability = market.probability || 0;
        const yesPrice = market.outcome_prices && market.outcome_prices[0] ? market.outcome_prices[0] : probability;
        const noPrice = market.outcome_prices && market.outcome_prices[1] ? market.outcome_prices[1] : (1 - probability);
        
        return `
            <div class="market-card" data-id="${market.id}">
                <div class="market-header">
                    ${market.image ? 
                        `<img src="${market.image}" alt="Market" class="market-image" onerror="this.style.display='none'">` : 
                        ''}
                    <span class="category-badge">${market.category || 'Other'}</span>
                </div>
                <h3 class="market-question">${market.question}</h3>
                <div class="probability-section">
                    <div class="probability-label">
                        <span>Probability</span>
                        <span>${(probability * 100).toFixed(1)}%</span>
                    </div>
                    <div class="probability-bar">
                        <div class="probability-fill ${utils.getProbabilityClass(probability)}" 
                             style="width: ${probability * 100}%"></div>
                    </div>
                </div>
                <div class="outcome-prices">
                    <div class="outcome-price yes">
                        <div class="outcome-label">YES</div>
                        <div class="outcome-value">${(parseFloat(yesPrice) * 100).toFixed(1)}¢</div>
                    </div>
                    <div class="outcome-price no">
                        <div class="outcome-label">NO</div>
                        <div class="outcome-value">${(parseFloat(noPrice) * 100).toFixed(1)}¢</div>
                    </div>
                </div>
                <div class="market-footer">
                    <div class="volume-badge">
                        <span>💰 ${utils.formatNumber(market.volume || 0)}</span>
                    </div>
                    <div class="end-date">${utils.getCountdown(market.end_date)}</div>
                </div>
            </div>
        `;
    },

    renderMarketRow(market) {
        const probability = market.probability || 0;
        return `
            <tr data-id="${market.id}">
                <td class="table-question">
                    <span class="table-badge">${market.category || 'Other'}</span>
                    ${market.question}
                </td>
                <td>${(probability * 100).toFixed(1)}%</td>
                <td>${utils.formatNumber(market.volume || 0)}</td>
                <td>${utils.formatNumber(market.liquidity || 0)}</td>
                <td>${utils.formatDate(market.end_date)}</td>
                <td><button class="table-btn" data-id="${market.id}">View</button></td>
            </tr>
        `;
    },

    renderMarkets(markets) {
        const gridView = document.getElementById('marketsGrid');
        const listView = document.getElementById('marketsList');
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        
        loadingState.classList.add('hidden');
        
        if (markets.length === 0) {
            gridView.innerHTML = '';
            listView.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        if (appState.currentView === 'grid') {
            gridView.innerHTML = markets.map(m => this.renderMarketCard(m)).join('');
            gridView.classList.remove('hidden');
            listView.classList.add('hidden');
            
            // Add click handlers
            gridView.querySelectorAll('.market-card').forEach(card => {
                card.addEventListener('click', () => {
                    const id = card.dataset.id;
                    const market = markets.find(m => m.id === id);
                    if (market) this.showMarketModal(market);
                });
            });
        } else {
            const tableHTML = `
                <table class="markets-table">
                    <thead>
                        <tr>
                            <th>Market</th>
                            <th>Probability</th>
                            <th>Volume</th>
                            <th>Liquidity</th>
                            <th>End Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${markets.map(m => this.renderMarketRow(m)).join('')}
                    </tbody>
                </table>
            `;
            listView.innerHTML = tableHTML;
            listView.classList.remove('hidden');
            gridView.classList.add('hidden');
            
            // Add click handlers
            listView.querySelectorAll('tbody tr').forEach(row => {
                row.addEventListener('click', (e) => {
                    if (e.target.tagName !== 'BUTTON') {
                        const id = row.dataset.id;
                        const market = markets.find(m => m.id === id);
                        if (market) this.showMarketModal(market);
                    }
                });
            });
            
            listView.querySelectorAll('.table-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const market = markets.find(m => m.id === id);
                    if (market) this.showMarketModal(market);
                });
            });
        }
    },

    showMarketModal(market) {
        const modal = document.getElementById('marketModal');
        const modalBody = document.getElementById('modalBody');
        
        const probability = market.probability || 0;
        const yesPrice = market.outcome_prices && market.outcome_prices[0] ? market.outcome_prices[0] : probability;
        const noPrice = market.outcome_prices && market.outcome_prices[1] ? market.outcome_prices[1] : (1 - probability);
        
        modalBody.innerHTML = `
            <div class="modal-header">
                <span class="modal-category">${market.category || 'Other'}</span>
                <h2 class="modal-question">${market.question}</h2>
                ${market.description ? `<p class="modal-description">${market.description}</p>` : ''}
            </div>
            
            <div class="probability-display">
                <div class="probability-value">${(probability * 100).toFixed(1)}%</div>
                <div class="probability-breakdown">
                    <div class="breakdown-item">
                        <div class="breakdown-label">YES Price</div>
                        <div class="breakdown-value" style="color: var(--success);">
                            ${(parseFloat(yesPrice) * 100).toFixed(1)}¢
                        </div>
                    </div>
                    <div class="breakdown-item">
                        <div class="breakdown-label">NO Price</div>
                        <div class="breakdown-value" style="color: var(--danger);">
                            ${(parseFloat(noPrice) * 100).toFixed(1)}¢
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="modal-stats">
                <div class="stat-item">
                    <div class="stat-item-label">Total Volume</div>
                    <div class="stat-item-value">${utils.formatNumber(market.volume || 0)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-item-label">24h Volume</div>
                    <div class="stat-item-value">${utils.formatNumber(market.volume_24h || 0)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-item-label">Liquidity</div>
                    <div class="stat-item-value">${utils.formatNumber(market.liquidity || 0)}</div>
                </div>
                ${market.spread ? `
                    <div class="stat-item">
                        <div class="stat-item-label">Spread</div>
                        <div class="stat-item-value">${(market.spread * 100).toFixed(2)}%</div>
                    </div>
                ` : ''}
                <div class="stat-item">
                    <div class="stat-item-label">Created</div>
                    <div class="stat-item-value">${utils.formatDate(market.created_at)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-item-label">End Date</div>
                    <div class="stat-item-value">${utils.formatDate(market.end_date)}</div>
                </div>
            </div>
            
            ${market.tags && market.tags.length > 0 ? `
                <div class="modal-tags">
                    ${market.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            
            ${market.slug ? `
                <a href="https://polymarket.com/event/${market.slug}" 
                   target="_blank" 
                   class="modal-link">View on Polymarket →</a>
            ` : ''}
        `;
        
        modal.classList.remove('hidden');
    },

    showLoading() {
        document.getElementById('loadingState').classList.remove('hidden');
        document.getElementById('marketsGrid').innerHTML = '';
        document.getElementById('marketsList').innerHTML = '';
        document.getElementById('emptyState').classList.add('hidden');
    },

    updateLastUpdated() {
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (appState.lastUpdated) {
            lastUpdatedEl.textContent = `Last updated: ${utils.formatTimeAgo(appState.lastUpdated)}`;
        }
    },

    updateAPIStatus(isConnected) {
        const statusEl = document.getElementById('apiStatus');
        const dot = statusEl.querySelector('.status-dot');
        
        if (isConnected) {
            dot.classList.add('connected');
            statusEl.title = 'API Connected';
        } else {
            dot.classList.remove('connected');
            statusEl.title = 'API Disconnected';
        }
    }
};

// Filter and Search Functions
function applyFilters() {
    let filtered = [...appState.markets];
    
    // Search filter
    if (appState.filters.search) {
        const searchLower = appState.filters.search.toLowerCase();
        filtered = filtered.filter(m => 
            m.question.toLowerCase().includes(searchLower) ||
            (m.description && m.description.toLowerCase().includes(searchLower))
        );
    }
    
    // Category filter
    if (appState.filters.category) {
        filtered = filtered.filter(m => m.category === appState.filters.category);
    }
    
    // Volume filter
    if (appState.filters.minVolume > 0) {
        filtered = filtered.filter(m => (m.volume || 0) >= appState.filters.minVolume);
    }
    
    // Sort
    switch (appState.filters.sort) {
        case 'volume':
            filtered.sort((a, b) => (b.volume || 0) - (a.volume || 0));
            break;
        case 'probability':
            filtered.sort((a, b) => (b.probability || 0) - (a.probability || 0));
            break;
        case 'latest':
            filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            break;
    }
    
    appState.filteredMarkets = filtered;
    ui.renderMarkets(filtered);
    ui.updateStats(filtered);
}

async function loadMarkets() {
    ui.showLoading();
    const markets = await api.fetchMarkets();
    appState.markets = markets;
    applyFilters();
    ui.updateLastUpdated();
}

async function loadCategories() {
    const categories = await api.fetchCategories();
    appState.categories = categories;
    
    const categoryFilter = document.getElementById('categoryFilter');
    categoryFilter.innerHTML = '<option value="">All Categories</option>' + 
        categories.map(cat => 
            `<option value="${cat.name}">${cat.name} (${cat.count})</option>`
        ).join('');
}

// Event Handlers
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', utils.debounce((e) => {
        appState.filters.search = e.target.value;
        applyFilters();
    }, 300));
    
    // Category filter
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        appState.filters.category = e.target.value;
        loadMarkets();
    });
    
    // Volume filter
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    volumeSlider.addEventListener('input', utils.debounce((e) => {
        const value = parseInt(e.target.value);
        volumeValue.textContent = (value / 1000).toFixed(0) + 'K';
        appState.filters.minVolume = value;
        applyFilters();
    }, 300));
    
    // Sort filter
    document.getElementById('sortFilter').addEventListener('change', (e) => {
        appState.filters.sort = e.target.value;
        applyFilters();
    });
    
    // Limit filter
    document.getElementById('limitFilter').addEventListener('change', (e) => {
        appState.filters.limit = parseInt(e.target.value);
        loadMarkets();
    });
    
    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.currentView = btn.dataset.view;
            ui.renderMarkets(appState.filteredMarkets);
        });
    });
    
    // Auto-refresh toggle
    document.getElementById('autoRefreshToggle').addEventListener('change', (e) => {
        appState.autoRefresh = e.target.checked;
        
        if (appState.autoRefresh) {
            appState.autoRefreshInterval = setInterval(() => {
                loadMarkets();
            }, 60000); // 60 seconds
            utils.showToast('Auto-refresh enabled', 'success');
        } else {
            if (appState.autoRefreshInterval) {
                clearInterval(appState.autoRefreshInterval);
                appState.autoRefreshInterval = null;
            }
            utils.showToast('Auto-refresh disabled', 'info');
        }
    });
    
    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.remove('hidden');
        document.getElementById('apiUrlInput').value = appState.apiBaseUrl;
    });
    
    // Settings modal close
    document.getElementById('settingsCloseBtn').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.add('hidden');
    });
    
    // Test connection
    document.getElementById('testConnectionBtn').addEventListener('click', async () => {
        const input = document.getElementById('apiUrlInput');
        const statusEl = document.getElementById('connectionStatus');
        const tempUrl = appState.apiBaseUrl;
        
        appState.apiBaseUrl = input.value;
        statusEl.classList.remove('hidden', 'success', 'error');
        statusEl.textContent = 'Testing connection...';
        
        const isHealthy = await api.checkHealth();
        
        if (isHealthy) {
            statusEl.classList.add('success');
            statusEl.textContent = '✓ Connection successful!';
        } else {
            statusEl.classList.add('error');
            statusEl.textContent = '✗ Connection failed. Please check the URL.';
            appState.apiBaseUrl = tempUrl;
        }
    });
    
    // Save settings
    document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
        const input = document.getElementById('apiUrlInput');
        appState.apiBaseUrl = input.value;
        document.getElementById('settingsModal').classList.add('hidden');
        utils.showToast('Settings saved', 'success');
        
        // Reload data with new URL
        await initialize();
    });
    
    // Reset settings
    document.getElementById('resetSettingsBtn').addEventListener('click', () => {
        appState.apiBaseUrl = 'http://localhost:8080';
        document.getElementById('apiUrlInput').value = appState.apiBaseUrl;
        utils.showToast('Settings reset to default', 'info');
    });
    
    // Modal close
    document.getElementById('modalCloseBtn').addEventListener('click', () => {
        document.getElementById('marketModal').classList.add('hidden');
    });
    
    // Modal overlay close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.add('hidden');
            });
        });
    });
    
    // Scroll to top
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollTopBtn.classList.remove('hidden');
        } else {
            scrollTopBtn.classList.add('hidden');
        }
    });
    
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Initialization
async function initialize() {
    console.log('Initializing PrediBet...');
    
    // Check API health
    const isHealthy = await api.checkHealth();
    ui.updateAPIStatus(isHealthy);
    
    if (!isHealthy) {
        utils.showToast('Backend API is not available. Please check your connection.', 'error');
    }
    
    // Load initial data
    await Promise.all([
        loadMarkets(),
        loadCategories()
    ]);
    
    // Setup periodic health check
    setInterval(async () => {
        const healthy = await api.checkHealth();
        ui.updateAPIStatus(healthy);
    }, 30000); // 30 seconds
    
    // Update last updated time periodically
    setInterval(() => {
        ui.updateLastUpdated();
    }, 10000); // 10 seconds
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initialize();
});