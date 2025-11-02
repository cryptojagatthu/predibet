export interface MarketOutcome {
name: string;
price: number;
}
export interface Market {
id: string;
condition_id?: string;
question_id?: string;
slug?: string;
question: string;
description?: string;
category?: string;
tags?: string[];
probability?: number;
outcomes?: string[];
outcome_prices?: number[];
spread?: number;
volume?: number;
liquidity?: number;
volume_24h?: number;
enable_order_book?: boolean;
clob_token_ids?: string[];
neg_risk?: boolean;
minimum_order_size?: number;
minimum_tick_size?: number;
created_at?: string;
end_date?: string;
game_start_time?: string;
accepting_orders?: boolean;
accepting_order_timestamp?: string;
image?: string;
icon?: string;
is_50_50_outcome?: boolean;
notifications_enabled?: boolean;
active?: boolean;
closed?: boolean;
archived?: boolean;
fpmm?: string;
}
export interface MarketsResponse {
success: boolean;
count: number;
total_available: number;
cached: boolean;
cache_age_seconds?: number;
markets: Market[];
}
export interface CategoriesResponse {
success: boolean;
categories: Category[];
}
export interface Category {
name: string;
count: number;
}
export interface MarketFilter {
searchQuery?: string;
category?: string;
minVolume?: number;
sortBy?: 'volume_desc' | 'volume_asc' | 'probability_high' | 'probability_low' | 'date_re
limit?: number;
}
export interface ApiError {
message: string;
status?: number;
details?: string;
}
