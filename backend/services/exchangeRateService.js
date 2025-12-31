const { Settings } = require('../models');

/**
 * Exchange Rate Service
 * Handles fetching, storing, and retrieving USD to ILS exchange rates
 */

// Free API endpoints - try multiple sources for reliability
const EXCHANGE_RATE_API_URLS = [
  'https://api.exchangerate-api.com/v4/latest/USD', // exchangerate-api.com (more reliable)
  'https://api.exchangerate.host/latest?base=USD&symbols=ILS', // exchangerate.host (backup)
];

// Fallback exchange rate if all else fails
const DEFAULT_EXCHANGE_RATE = 3.3;

/**
 * Fetches the current USD to ILS exchange rate from external API
 * @returns {Promise<{rate: number, source: string}>} Exchange rate and source
 */
async function fetchCurrentRate() {
  const errors = [];
  
  // Try each API endpoint in order
  for (let i = 0; i < EXCHANGE_RATE_API_URLS.length; i++) {
    const apiUrl = EXCHANGE_RATE_API_URLS[i];
    try {
      // Use fetch if available (Node 18+), otherwise use http module
      let response;
      if (typeof globalThis.fetch === 'function') {
        response = await globalThis.fetch(apiUrl);
      } else {
        // Fallback for older Node versions
        const https = require('https');
        const url = require('url');
        const parsedUrl = url.parse(apiUrl);
        
        response = await new Promise((resolve, reject) => {
          const req = https.get(parsedUrl, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              resolve({
                ok: res.statusCode === 200,
                status: res.statusCode,
                json: async () => JSON.parse(data),
              });
            });
          });
          req.on('error', reject);
        });
      }
      
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle different API response formats
      let rate;
      let source;
      
      // Format 1: exchangerate-api.com - { rates: { ILS: 3.3 } }
      if (data.rates && data.rates.ILS) {
        rate = parseFloat(data.rates.ILS);
        source = 'exchangerate-api.com';
      }
      // Format 2: exchangerate.host - { rates: { ILS: 3.3 } } or { result: 3.3 }
      else if (data.result && Number.isFinite(data.result)) {
        rate = parseFloat(data.result);
        source = 'exchangerate.host';
      }
      // Format 3: Direct ILS field
      else if (data.ILS && Number.isFinite(data.ILS)) {
        rate = parseFloat(data.ILS);
        source = apiUrl.includes('exchangerate-api') ? 'exchangerate-api.com' : 'exchangerate.host';
      }
      else {
        // Log the actual response for debugging
        console.error(`API ${i + 1} response format not recognized:`, JSON.stringify(data).substring(0, 200));
        throw new Error('Invalid API response format: unexpected structure');
      }
      
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error(`Invalid rate value: ${rate}`);
      }
      
      return {
        rate,
        source,
      };
    } catch (error) {
      errors.push(`API ${i + 1} (${apiUrl}): ${error.message}`);
      // Continue to next API if this one failed
      continue;
    }
  }
  
  // All APIs failed
  const errorMessage = `All exchange rate APIs failed:\n${errors.join('\n')}`;
  console.error('Error fetching exchange rate from API:', errorMessage);
  throw new Error(errorMessage);
}

/**
 * Gets the stored exchange rate from the database
 * @returns {Promise<number|null>} Stored exchange rate or null if not found
 */
async function getStoredRate() {
  try {
    const settings = await Settings.getSettings();
    return settings.usd_ils_rate || null;
  } catch (error) {
    console.error('Error getting stored exchange rate:', error.message);
    return null;
  }
}

/**
 * Updates the exchange rate in the database
 * @param {number} rate - The exchange rate to store
 * @param {string} source - The source of the rate (e.g., 'exchangerate.host')
 * @returns {Promise<void>}
 */
async function updateRate(rate, source = 'exchangerate.host') {
  try {
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Invalid rate value: ${rate}`);
    }
    
    const settings = await Settings.getSettings();
    settings.usd_ils_rate = rate;
    settings.exchange_rate_last_updated = new Date();
    settings.exchange_rate_source = source;
    await settings.save();
    
    console.log(`Exchange rate updated: ${rate} (source: ${source})`);
  } catch (error) {
    console.error('Error updating exchange rate:', error.message);
    throw error;
  }
}

/**
 * Gets the exchange rate with fallback chain:
 * 1. Try to fetch from API
 * 2. Fall back to stored rate in database
 * 3. Fall back to environment variable
 * 4. Fall back to default rate
 * 
 * @param {boolean} forceRefresh - If true, always fetch from API
 * @returns {Promise<number>} The exchange rate to use
 */
async function getExchangeRate(forceRefresh = false) {
  // If force refresh, try API first
  if (forceRefresh) {
    try {
      const { rate, source } = await fetchCurrentRate();
      await updateRate(rate, source);
      return rate;
    } catch (error) {
      console.warn('Failed to refresh rate from API, using stored rate');
    }
  }
  
  // Try to get stored rate from database
  const storedRate = await getStoredRate();
  if (storedRate && Number.isFinite(storedRate) && storedRate > 0) {
    return storedRate;
  }
  
  // Fall back to environment variable
  const envRate = parseFloat(process.env.USD_ILS_RATE);
  if (Number.isFinite(envRate) && envRate > 0) {
    console.log('Using exchange rate from environment variable');
    // Store it in database for future use
    try {
      await updateRate(envRate, 'environment_variable');
    } catch (error) {
      console.warn('Failed to store env rate in database:', error.message);
    }
    return envRate;
  }
  
  // Final fallback to default
  console.warn(`Using default exchange rate: ${DEFAULT_EXCHANGE_RATE}`);
  return DEFAULT_EXCHANGE_RATE;
}

/**
 * Checks if the stored exchange rate is stale (older than specified hours)
 * @param {number} maxAgeHours - Maximum age in hours (default: 24)
 * @returns {Promise<boolean>} - True if rate is stale or missing
 */
async function isRateStale(maxAgeHours = 24) {
  try {
    const settings = await Settings.getSettings();
    
    if (!settings.usd_ils_rate || !settings.exchange_rate_last_updated) {
      return true; // Rate is missing, consider it stale
    }
    
    const now = new Date();
    const lastUpdated = new Date(settings.exchange_rate_last_updated);
    const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);
    
    return hoursSinceUpdate >= maxAgeHours;
  } catch (error) {
    console.error('Error checking rate staleness:', error.message);
    return true; // On error, consider it stale to trigger refresh
  }
}

module.exports = {
  fetchCurrentRate,
  getStoredRate,
  updateRate,
  getExchangeRate,
  isRateStale,
  DEFAULT_EXCHANGE_RATE,
};
