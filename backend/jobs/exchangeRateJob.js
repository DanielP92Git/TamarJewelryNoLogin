const cron = require('node-cron');
const { Product } = require('../models');
const exchangeRateService = require('../services/exchangeRateService');

const isProd = process.env.NODE_ENV === 'production';

/**
 * Daily job to update exchange rate and recalculate all product USD prices
 * Runs daily at 2:00 AM
 */
async function updateExchangeRateAndPrices() {
  try {
    if (!isProd) {
      console.log('\n=== Starting Daily Exchange Rate Update ===');
    }

    // Fetch current exchange rate from API
    let newRate;
    try {
      const { rate, source } = await exchangeRateService.fetchCurrentRate();
      newRate = rate;

      // Update the rate in database
      await exchangeRateService.updateRate(rate, source);

      if (!isProd) {
        console.log(`✓ Exchange rate updated: ${rate} (source: ${source})`);
      }
    } catch (error) {
      console.error(
        'Failed to fetch new exchange rate from API:',
        error.message
      );

      // Try to use stored rate
      const storedRate = await exchangeRateService.getStoredRate();
      if (storedRate && Number.isFinite(storedRate) && storedRate > 0) {
        newRate = storedRate;
        if (!isProd) {
          console.log(`⚠ Using stored exchange rate: ${newRate}`);
        }
      } else {
        // Fall back to environment variable or default
        newRate = await exchangeRateService.getExchangeRate();
        if (!isProd) {
          console.log(`⚠ Using fallback exchange rate: ${newRate}`);
        }
      }
    }

    // Recalculate USD prices for all products based on ILS prices
    const products = await Product.find({});
    let updatedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        // Handle legacy products: if they have USD price but no ILS price, reverse-calculate ILS
        if (!product.ils_price || !Number.isFinite(product.ils_price)) {
          if (
            product.usd_price &&
            Number.isFinite(product.usd_price) &&
            product.usd_price > 0
          ) {
            // Reverse-calculate ILS from USD: ILS = USD * rate
            // Use current rate as approximation (we don't know the original rate)
            const calculatedIlsPrice = Math.round(product.usd_price * newRate);
            product.ils_price = calculatedIlsPrice;

            // Set original prices if they don't exist
            if (!product.original_ils_price) {
              product.original_ils_price = calculatedIlsPrice;
            }
            if (!product.original_usd_price) {
              product.original_usd_price = product.usd_price;
            }

            await product.save();
            updatedCount++;
            if (!isProd) {
              console.log(
                `  Migrated legacy product ${product.id}: set ils_price = ${calculatedIlsPrice} from usd_price = ${product.usd_price}`
              );
            }
          }
          continue; // Skip USD recalculation for newly migrated products
        }

        // Calculate USD price from ILS price: USD = ILS / rate
        // Round to whole number as per requirements
        const calculatedUsdPrice = Math.round(product.ils_price / newRate);

        // Calculate original USD price from original ILS price
        const calculatedOriginalUsdPrice =
          product.original_ils_price &&
          Number.isFinite(product.original_ils_price)
            ? Math.round(product.original_ils_price / newRate)
            : calculatedUsdPrice;

        // Track if we need to save
        let needsSave = false;

        // Update USD price if missing, zero, or has changed
        const needsUsdUpdate =
          !product.usd_price ||
          !Number.isFinite(product.usd_price) ||
          product.usd_price === 0 ||
          product.usd_price !== calculatedUsdPrice;

        if (needsUsdUpdate) {
          product.usd_price = calculatedUsdPrice;
          needsSave = true;
        }

        // Always ensure original_usd_price is set (even if usd_price doesn't need updating)
        // We intentionally overwrite legacy/bad values so frontend can always trust this field.
        if (
          !Number.isFinite(product.original_usd_price) ||
          product.original_usd_price !== calculatedOriginalUsdPrice
        ) {
          product.original_usd_price = calculatedOriginalUsdPrice;
          needsSave = true;
        }

        if (needsSave) {
          await product.save();
          updatedCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`Error updating product ${product.id}:`, error.message);
      }
    }

    if (!isProd) {
      console.log(`✓ Updated ${updatedCount} product USD prices`);
      if (errorCount > 0) {
        console.log(`⚠ ${errorCount} products had errors`);
      }
      console.log('=== Exchange Rate Update Complete ===\n');
    } else {
      console.log(
        `Exchange rate update: ${updatedCount} products updated, ${errorCount} errors`
      );
    }
  } catch (error) {
    console.error('Fatal error in exchange rate update job:', error);
  }
}

/**
 * Initialize and start the scheduled job
 * Runs weekly at 12:53 PM on Sunday
 */
function startExchangeRateJob() {
  // Cron expression: '00 02 * * 0' means "at 2:00 AM every Sunday"
  // Format: minute hour day month day-of-week
  cron.schedule(
    '00 02 * * 0',
    async () => {
      await updateExchangeRateAndPrices();
    },
    {
      scheduled: true,
      timezone: 'Asia/Jerusalem', // Israel timezone
    }
  );

  if (!isProd) {
    console.log(
      '✓ Weekly exchange rate job scheduled (runs at 2:00 AM every Sunday)'
    );
  }
}

/**
 * Manually trigger the exchange rate update (for testing or admin use)
 */
async function runExchangeRateUpdate() {
  await updateExchangeRateAndPrices();
}

module.exports = {
  startExchangeRateJob,
  runExchangeRateUpdate,
  updateExchangeRateAndPrices,
};
