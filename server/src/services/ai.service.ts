import { Shop, type IShop } from '../models/Shop';
import { AnalyticsEvent } from '../models/AnalyticsEvent';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { escapeRegex } from '../utils/slug';

export interface UserLocation {
  lat?: number;
  lng?: number;
  area?: string;
  city?: string;
}

export interface AssistantIntent {
  intent: 'product_search' | 'price_comparison' | 'store_discovery' | 'clarification' | 'greeting';
  query: string;
  category?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  quantity?: number;
  purpose?: string;
  requirements: string[];
  availability: 'in_stock' | 'any';
  sort: 'relevance' | 'price_low' | 'distance' | 'rating';
  isAffordableInquiry?: boolean;
}

export interface MatchedProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  comparePrice?: number;
  unit?: string;
  category?: string;
  inStock: boolean;
  shop: {
    id: string;
    name: string;
    slug: string;
    landmark: string;
    city: string;
    phone: string;
    whatsapp?: string;
    rating: number;
    ratingCount: number;
    isVerified: boolean;
    distanceKm?: number;
    hasDelivery?: boolean;
  };
  labels: string[];
  isCheapest?: boolean;
  priceAnomalyWarning?: string;
}

export interface AssistantResponse {
  conversationId: string;
  message: string;
  intent: AssistantIntent;
  products: MatchedProduct[];
  comparison?: {
    itemName: string;
    lowestPrice: number;
    highestPrice: number;
    averagePrice: number;
    savings: number;
    lowestShopName: string;
    note: string;
  };
  suggestedPrompts: string[];
  clarificationOptions?: string[];
  disclaimer: string;
}

interface ConversationState {
  id: string;
  intent: Partial<AssistantIntent>;
  lastQuery: string;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
  updatedAt: number;
}

// In-memory conversation store with 1-hour TTL
const conversations = new Map<string, ConversationState>();

function getOrCreateConversation(id?: string): ConversationState {
  const convId = id && conversations.has(id) ? id : crypto.randomUUID();
  let state = conversations.get(convId);
  if (!state) {
    state = {
      id: convId,
      intent: { requirements: [] },
      lastQuery: '',
      history: [],
      updatedAt: Date.now(),
    };
    conversations.set(convId, state);
  }
  state.updatedAt = Date.now();
  return state;
}

// Periodically clean up conversations older than 1 hour
setInterval(() => {
  const cutoff = Date.now() - 3600 * 1000;
  for (const [id, state] of conversations.entries()) {
    if (state.updatedAt < cutoff) conversations.delete(id);
  }
}, 600 * 1000).unref();

export function clearConversation(id: string) {
  conversations.delete(id);
}

/**
 * Natural Language Understanding Engine
 * Parses English, Hindi, and Hinglish queries into validated structured search parameters.
 */
export function extractIntentFromText(
  text: string,
  previousIntent?: Partial<AssistantIntent>,
): AssistantIntent {
  const raw = text.trim();
  const lower = raw.toLowerCase();

  // 1. Budget extraction
  let budgetMax: number | null = previousIntent?.budgetMax ?? null;
  let budgetMin: number | null = previousIntent?.budgetMin ?? null;

  // Patterns like: "500-1000", "500 to 1000", "500 se 1000"
  const rangeMatch = lower.match(/(?:₹|rs\.?|inr)?\s*(\d{2,6})\s*(?:-|to|se|tak)\s*(?:₹|rs\.?|inr)?\s*(\d{2,6})/i);
  if (rangeMatch) {
    const val1 = parseInt(rangeMatch[1], 10);
    const val2 = parseInt(rangeMatch[2], 10);
    budgetMin = Math.min(val1, val2);
    budgetMax = Math.max(val1, val2);
  } else {
    // Patterns like: "under 500", "below 1000", "500 ke andar", "500 tak", "500 se kam", "budget 1500"
    const maxMatch = lower.match(
      /(?:under|below|less than|max|budget(?: of)?|upto|up to|₹|rs\.?|inr)\s*(\d{2,6})|(?:₹|rs\.?|inr)?\s*(\d{2,6})\s*(?:ke andar|se kam|tak|max|rupaye tak|rupees tak|budget)/i,
    );
    if (maxMatch) {
      const parsed = parseInt(maxMatch[1] || maxMatch[2], 10);
      if (!Number.isNaN(parsed)) budgetMax = parsed;
    }

    // Patterns like: "around 1000", "1000 ke aas paas"
    const approxMatch = lower.match(/(?:around|approx|nearly)\s*(?:₹|rs\.?|inr)?\s*(\d{2,6})|(?:₹|rs\.?|inr)?\s*(\d{2,6})\s*(?:ke aas paas|ke lagbhag)/i);
    if (approxMatch) {
      const target = parseInt(approxMatch[1] || approxMatch[2], 10);
      if (!Number.isNaN(target)) {
        budgetMin = Math.round(target * 0.8);
        budgetMax = Math.round(target * 1.25);
      }
    }
  }

  // 2. Purpose / Requirements extraction
  const requirements: string[] = [...(previousIntent?.requirements || [])];
  let purpose = previousIntent?.purpose || '';

  if (lower.includes('online class') || lower.includes('online classes') || lower.includes('study') || lower.includes('padhai')) {
    purpose = 'online classes';
    if (!requirements.includes('online classes')) requirements.push('online classes');
  }
  if (lower.includes('college') || lower.includes('university') || lower.includes('student')) {
    purpose = 'college';
    if (!requirements.includes('college')) requirements.push('college');
  }
  if (lower.includes('gaming') || lower.includes('game')) {
    purpose = 'gaming';
    if (!requirements.includes('gaming')) requirements.push('gaming');
  }
  if (lower.includes('office') || lower.includes('work')) {
    purpose = 'office';
    if (!requirements.includes('office')) requirements.push('office');
  }
  if (lower.includes('mic') || lower.includes('microphone') || lower.includes('calling')) {
    if (!requirements.includes('microphone')) requirements.push('microphone');
  }
  if (lower.includes('wireless') || lower.includes('bluetooth') || lower.includes('bina wire')) {
    if (!requirements.includes('wireless')) requirements.push('wireless');
    // Remove conflicting 'wired' requirement if switched
    const wiredIdx = requirements.indexOf('wired');
    if (wiredIdx > -1) requirements.splice(wiredIdx, 1);
  } else if (lower.includes('wired') || lower.includes('wire wala')) {
    if (!requirements.includes('wired')) requirements.push('wired');
    const wirelessIdx = requirements.indexOf('wireless');
    if (wirelessIdx > -1) requirements.splice(wirelessIdx, 1);
  }
  if (lower.includes('fast charging') || lower.includes('fast charger') || lower.includes('type c') || lower.includes('usb c') || lower.includes('type-c')) {
    if (!requirements.includes('fast charging')) requirements.push('fast charging');
  }

  // 3. Product Extraction & Category Mapping
  let query = previousIntent?.query || '';
  let category = previousIntent?.category || '';

  const productDictionary: Array<{
    keywords: string[];
    canonical: string;
    category: string;
  }> = [
    { keywords: ['charger', 'charging', 'adapter', 'data cable', 'type c'], canonical: 'charger', category: 'electronics' },
    { keywords: ['headphone', 'headphones', 'earphone', 'earphones', 'earbuds', 'neckband', 'airpods', 'tws'], canonical: 'headphones', category: 'electronics' },
    { keywords: ['mouse', 'gaming mouse', 'optical mouse'], canonical: 'mouse', category: 'electronics' },
    { keywords: ['laptop', 'computer', 'notebook', 'macbook'], canonical: 'laptop', category: 'electronics' },
    { keywords: ['mobile', 'phone', 'smartphone', 'screen replacement', 'battery replacement'], canonical: 'mobile', category: 'electronics' },
    { keywords: ['haircut', 'barber', 'salon', 'shave', 'beard', 'facial', 'spa', 'massage'], canonical: 'haircut', category: 'salons' },
    { keywords: ['coffee', 'cappuccino', 'pizza', 'sandwich', 'burger', 'roll', 'cafe', 'restaurant', 'dosa', 'poha'], canonical: 'cafe', category: 'restaurants' },
    { keywords: ['atta', 'rice', 'oil', 'sugar', 'salt', 'grocery', 'kirana', 'dal', 'milk', 'vegetables', 'onion', 'tomato'], canonical: 'grocery', category: 'grocery' },
    { keywords: ['gym', 'fitness', 'workout', 'yoga', 'membership', 'zumba'], canonical: 'gym', category: 'gyms' },
    { keywords: ['medicine', 'pharmacy', 'blood test', 'lab test', 'chemist', 'doctor'], canonical: 'pharmacy', category: 'healthcare' },
    { keywords: ['plumber', 'electrician', 'cleaning', 'repair', 'ac service', 'pest control'], canonical: 'home services', category: 'home-services' },
    { keywords: ['saree', 'lehenga', 'kurta', 'dress', 'shirt', 'clothes', 'tailor'], canonical: 'clothing', category: 'fashion' },
  ];

  for (const item of productDictionary) {
    if (item.keywords.some((kw) => lower.includes(kw))) {
      query = item.canonical;
      category = item.category;
      break;
    }
  }

  // If query is still empty, retain previous or fall back to general keywords
  if (!query) {
    if (lower.includes('sasta') || lower.includes('affordable') || lower.includes('cheap') || lower.includes('best price')) {
      query = previousIntent?.query || 'products';
    } else {
      query = previousIntent?.query || lower.replace(/[^\w\s]/g, '').slice(0, 30).trim();
    }
  }

  // 4. Sorting & Affordability preference
  let sort: AssistantIntent['sort'] = previousIntent?.sort || 'relevance';
  let isAffordableInquiry = false;
  if (
    lower.includes('sabse sasta') ||
    lower.includes('affordable') ||
    lower.includes('lowest price') ||
    lower.includes('cheapest') ||
    lower.includes('kam price') ||
    lower.includes('best price')
  ) {
    sort = 'price_low';
    isAffordableInquiry = true;
  } else if (lower.includes('paas') || lower.includes('nearby') || lower.includes('nearest') || lower.includes('close to me')) {
    sort = 'distance';
  } else if (lower.includes('best rating') || lower.includes('top rated') || lower.includes('achha')) {
    sort = 'rating';
  }

  // 5. Intent type
  let intentType: AssistantIntent['intent'] = 'product_search';
  if (/^(hi|hello|hey|namaste|pranam|halo)\b/i.test(lower) && lower.length < 15) {
    intentType = 'greeting';
  } else if (isAffordableInquiry || lower.includes('compare') || lower.includes('difference')) {
    intentType = 'price_comparison';
  } else if (lower.includes('shop') || lower.includes('store') || lower.includes('dukaan')) {
    intentType = 'store_discovery';
  }

  return {
    intent: intentType,
    query,
    category: category || previousIntent?.category,
    budgetMin,
    budgetMax,
    quantity: 1,
    purpose: purpose || undefined,
    requirements,
    availability: 'in_stock',
    sort,
    isAffordableInquiry,
  };
}

/**
 * Calculates straight-line distance in km between two coordinate pairs
 */
function calculateDistanceKm(coord1: [number, number], coord2: [number, number]): number {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Executes a deterministic search across verified shops and their catalog items
 */
async function searchDatabaseProducts(
  intent: AssistantIntent,
  location?: UserLocation,
): Promise<MatchedProduct[]> {
  const matchFilter: Record<string, unknown> = {
    isActive: true,
    'verification.status': 'verified',
  };

  if (intent.category) {
    matchFilter['basicInfo.category'] = intent.category;
  }

  const shops = await Shop.find(matchFilter).lean();

  const userCoords: [number, number] | null =
    location?.lat !== undefined && location?.lng !== undefined ? [location.lng, location.lat] : null;

  const matched: MatchedProduct[] = [];

  // Match search terms: query + requirements
  const queryTerms = [
    intent.query,
    ...(intent.requirements || []),
    ...(intent.purpose ? [intent.purpose] : []),
  ].filter(Boolean).map((t) => t.toLowerCase());

  for (const shop of shops) {
    const shopDistance =
      userCoords && shop.location?.coordinates
        ? calculateDistanceKm(userCoords, shop.location.coordinates)
        : undefined;

    const items = shop.pricing?.items || [];
    for (const item of items) {
      if (item.isAvailable === false) continue;

      const itemName = item.name.toLowerCase();
      const itemDesc = (item.description || '').toLowerCase();
      const itemCat = (item.category || '').toLowerCase();
      const shopTags = (shop.basicInfo?.tags || []).map((t: string) => t.toLowerCase());

      // Keyword matching
      let isMatch = false;

      // Extract stem tokens for query matching (e.g. "headphones" -> "headphone", "chargers" -> "charger")
      const rawQ = (intent.query || '').toLowerCase().trim();
      const qTokens = [
        rawQ,
        rawQ.endsWith('s') ? rawQ.slice(0, -1) : rawQ,
        rawQ.endsWith('es') ? rawQ.slice(0, -2) : rawQ,
      ].filter((t) => t.length >= 3);

      // Check if item name or description matches query
      if (qTokens.length > 0) {
        if (
          qTokens.some((tok) => itemName.includes(tok) || itemDesc.includes(tok) || itemCat.includes(tok))
        ) {
          isMatch = true;
        }

        // Special synonym mappings
        if (!isMatch) {
          if (rawQ.includes('headphone') || rawQ.includes('earphone')) {
            if (itemName.includes('earbud') || itemName.includes('headset') || itemName.includes('neckband') || itemCat.includes('audio')) {
              isMatch = true;
            }
          } else if (rawQ.includes('charger')) {
            if (itemName.includes('charger') || itemName.includes('adapter') || itemName.includes('charging')) {
              isMatch = true;
            }
          }
        }
      } else if (intent.category && shop.basicInfo.category === intent.category) {
        // General category browse if no specific product keyword
        isMatch = true;
      }

      if (!isMatch) continue;

      // Filter: wireless requirement check
      if (intent.requirements.includes('wireless')) {
        const isWireless =
          itemName.includes('wireless') ||
          itemName.includes('bluetooth') ||
          itemName.includes('earbuds') ||
          itemDesc.includes('wireless') ||
          itemDesc.includes('bluetooth');
        if (!isWireless && (itemName.includes('headphone') || itemName.includes('mouse'))) {
          continue; // User explicitly asked for wireless
        }
      }

      // Filter: wired / mic requirement check
      if (intent.requirements.includes('wired')) {
        const isWireless = itemName.includes('wireless') || itemName.includes('bluetooth');
        if (isWireless) continue;
      }

      // Filter: budget constraints
      if (intent.budgetMax !== null && intent.budgetMax !== undefined) {
        if (item.price > intent.budgetMax) continue;
      }
      if (intent.budgetMin !== null && intent.budgetMin !== undefined) {
        if (item.price < intent.budgetMin) continue;
      }

      // Match labels
      const labels: string[] = ['In Stock'];
      if (intent.budgetMax && item.price <= intent.budgetMax) labels.push('Within Budget');
      if (shopDistance !== undefined && shopDistance <= 5) labels.push('Nearby');
      if (shop.ratings?.average && shop.ratings.average >= 4.2) labels.push('Top Rated');

      matched.push({
        id: String(item._id || `${shop._id}-${item.name}`),
        name: item.name,
        description: item.description,
        price: item.price,
        comparePrice: item.comparePrice,
        unit: item.unit,
        category: item.category || shop.basicInfo.category,
        inStock: true,
        shop: {
          id: String(shop._id),
          name: shop.basicInfo.name,
          slug: shop.slug,
          landmark: shop.location?.landmark || shop.location?.address || 'Bhopal',
          city: shop.location?.city || 'Bhopal',
          phone: shop.contact?.phone || '',
          whatsapp: shop.contact?.whatsapp,
          rating: shop.ratings?.average || 0,
          ratingCount: shop.ratings?.total || 0,
          isVerified: shop.verification?.status === 'verified',
          distanceKm: shopDistance,
          hasDelivery: shop.features?.hasDelivery,
        },
        labels,
      });
    }
  }

  // Determine cheapest and price anomaly
  if (matched.length > 0) {
    const prices = matched.map((m) => m.price);
    const minPrice = Math.min(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    matched.forEach((p) => {
      if (p.price === minPrice) {
        p.isCheapest = true;
        if (!p.labels.includes('Lowest Price')) p.labels.unshift('Lowest Price');
      }
      // Anomaly detection: flag if listing is > 60% higher than average of similar matching items
      if (prices.length >= 3 && p.price > avgPrice * 1.6) {
        p.priceAnomalyWarning = 'This listing is significantly higher than other available Shopzy listings.';
      }
    });

    // Sort according to intent
    if (intent.sort === 'price_low') {
      matched.sort((a, b) => a.price - b.price);
    } else if (intent.sort === 'distance') {
      matched.sort((a, b) => (a.shop.distanceKm ?? 999) - (b.shop.distanceKm ?? 999));
    } else if (intent.sort === 'rating') {
      matched.sort((a, b) => b.shop.rating - a.shop.rating);
    } else {
      // Default: Best match (lowest price within budget + distance boost)
      matched.sort((a, b) => {
        const scoreA = (a.isCheapest ? 2 : 0) + (a.shop.distanceKm ? 1 / (1 + a.shop.distanceKm / 5) : 1);
        const scoreB = (b.isCheapest ? 2 : 0) + (b.shop.distanceKm ? 1 / (1 + b.shop.distanceKm / 5) : 1);
        return scoreB - scoreA;
      });
    }
  }

  return matched;
}

/**
 * Builds conversational response and price comparisons based strictly on real DB results
 */
function buildAssistantMessage(
  queryText: string,
  intent: AssistantIntent,
  products: MatchedProduct[],
  location?: UserLocation,
): { message: string; comparison?: AssistantResponse['comparison']; suggestedPrompts: string[]; clarificationOptions?: string[] } {
  // GREETING
  if (intent.intent === 'greeting') {
    return {
      message:
        "Namaste! I'm Shopzy AI Citizen Assistant. I help you discover verified local shops, compare real prices, and check product availability near you in Bhopal.\n\nWhat are you looking to buy today? (e.g., '₹500 ke andar phone charger', '₹1000 ke andar headphones', or 'nearby grocery stores')",
      suggestedPrompts: [
        '₹500 ke andar charger dikhao',
        '₹1000 ke andar headphones chahiye',
        'Mere paas available grocery shops dikhao',
        'Sabse affordable option kya hai?',
      ],
    };
  }

  // NO MATCHES
  if (products.length === 0) {
    const budgetNote = intent.budgetMax ? ` within ₹${intent.budgetMax}` : '';
    const queryName = intent.query || 'this item';
    return {
      message: `I couldn't find an exact verified match for "${queryName}"${budgetNote} in the current Shopzy local database.\n\nWould you like to increase your budget, explore other categories, or view nearby stores?`,
      suggestedPrompts: [
        'Show all available options',
        'Increase budget limit',
        'Search nearby electronics stores',
        'Compare other categories',
      ],
      clarificationOptions: ['Increase Budget', 'Remove Filter', 'Search Nearby'],
    };
  }

  // MATCHES FOUND
  const count = products.length;
  const prices = products.map((p) => p.price);
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const cheapestProduct = products.find((p) => p.price === lowest) || products[0];

  let comparison: AssistantResponse['comparison'] | undefined;
  if (products.length > 1 && lowest !== highest) {
    comparison = {
      itemName: cheapestProduct.name,
      lowestPrice: lowest,
      highestPrice: highest,
      averagePrice: avg,
      savings: highest - lowest,
      lowestShopName: cheapestProduct.shop.name,
      note: `Lowest listed price among the available Shopzy results is ₹${lowest} at ${cheapestProduct.shop.name}.`,
    };
  }

  let text = `I found **${count} option${count > 1 ? 's' : ''}** from verified local shops in Bhopal`;
  if (intent.budgetMax) text += ` within your budget of ₹${intent.budgetMax}`;
  text += ':\n\n';

  if (comparison) {
    text += `💰 **Price Comparison Insight:**\n`;
    text += `• **Lowest listed price:** ₹${lowest} (${cheapestProduct.shop.name}`;
    if (cheapestProduct.shop.distanceKm !== undefined) text += ` · ${cheapestProduct.shop.distanceKm} km away`;
    text += `)\n`;
    text += `• **Average listed price:** ₹${avg}\n`;
    text += `• You can save up to **₹${comparison.savings}** by choosing the lowest listed store among these results.\n\n`;
  }

  text += `Here are the top verified options based on real inventory data:`;

  // Contextual suggested prompts for next turn
  const suggestedPrompts: string[] = [];
  if (!intent.requirements.includes('wireless') && (intent.query.includes('headphone') || intent.query.includes('earphone'))) {
    suggestedPrompts.push('Wireless chahiye');
  }
  if (!intent.isAffordableInquiry && products.length > 1) {
    suggestedPrompts.push('Sabse affordable option kya hai?');
  }
  suggestedPrompts.push('View shop location');
  suggestedPrompts.push('Compare prices on map');

  return { message: text, comparison, suggestedPrompts };
}

/**
 * Main AI Assistant Orchestrator
 */
export async function processAssistantMessage(opts: {
  message: string;
  conversationId?: string;
  location?: UserLocation;
}): Promise<AssistantResponse> {
  const conversation = getOrCreateConversation(opts.conversationId);

  // Extract structured intent merging with multi-turn conversation memory
  const intent = extractIntentFromText(opts.message, conversation.intent);
  conversation.intent = { ...conversation.intent, ...intent };
  conversation.lastQuery = opts.message;

  // Search deterministic MongoDB database
  const products = await searchDatabaseProducts(intent, opts.location);

  // Formulate response
  const { message, comparison, suggestedPrompts, clarificationOptions } = buildAssistantMessage(
    opts.message,
    intent,
    products,
    opts.location,
  );

  // Save history
  conversation.history.push({ role: 'user', text: opts.message });
  conversation.history.push({ role: 'assistant', text: message });

  // Record anonymous analytics event for citizen search
  void AnalyticsEvent.create({
    eventType: 'search',
    query: `ai:${intent.query}`,
    shopCategory: intent.category,
    resultCount: products.length,
    location:
      opts.location?.lat !== undefined && opts.location?.lng !== undefined
        ? { lat: opts.location.lat, lng: opts.location.lng, city: opts.location.city || 'Bhopal' }
        : undefined,
  }).catch(() => undefined);

  return {
    conversationId: conversation.id,
    message,
    intent,
    products,
    comparison,
    suggestedPrompts,
    clarificationOptions,
    disclaimer:
      'All product names, prices, availability, and distances are sourced directly from Shopzy verified store listings.',
  };
}

/**
 * Marketplace Insights for Admin Panel & Governance
 */
export async function getMarketplaceInsights() {
  const [totalShops, verifiedShops, shopsWithPricing, topSearches] = await Promise.all([
    Shop.countDocuments({ isActive: true }),
    Shop.countDocuments({ isActive: true, 'verification.status': 'verified' }),
    Shop.find({ isActive: true, 'verification.status': 'verified' })
      .select('basicInfo.name basicInfo.category location.city pricing.items ratings.average')
      .lean(),
    AnalyticsEvent.aggregate([
      { $match: { eventType: 'search' } },
      { $group: { _id: '$query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  let totalItemsAnalyzed = 0;
  const categoryPriceMap: Record<string, { count: number; prices: number[]; min: number; max: number; avg: number }> = {};
  const unusualVariations: Array<{ item: string; shop: string; price: number; median: number; ratio: number }> = [];

  for (const s of shopsWithPricing) {
    const items = s.pricing?.items || [];
    totalItemsAnalyzed += items.length;

    for (const it of items) {
      if (!it.price || it.price <= 0) continue;
      const cat = s.basicInfo?.category || 'general';
      if (!categoryPriceMap[cat]) {
        categoryPriceMap[cat] = { count: 0, prices: [], min: it.price, max: it.price, avg: it.price };
      }
      categoryPriceMap[cat].count += 1;
      categoryPriceMap[cat].prices.push(it.price);
    }
  }

  // Calculate stats for each category
  for (const [cat, data] of Object.entries(categoryPriceMap)) {
    data.min = Math.min(...data.prices);
    data.max = Math.max(...data.prices);
    data.avg = Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length);
  }

  return {
    summary: {
      totalProductsAnalyzed: totalItemsAnalyzed,
      totalVerifiedShops: verifiedShops,
      totalActiveShops: totalShops,
      source: 'Shopzy Marketplace Data',
      lastRefreshed: new Date().toISOString(),
    },
    categoryPriceVariations: Object.entries(categoryPriceMap).map(([cat, data]) => ({
      category: cat,
      itemCount: data.count,
      minPrice: data.min,
      maxPrice: data.max,
      avgPrice: data.avg,
    })),
    topSearchedKeywords: topSearches.map((s) => ({ keyword: s._id, searches: s.count })),
    disclaimer:
      'Notice: This data reflects internal Shopzy marketplace listings and does not constitute official government market survey data.',
  };
}
