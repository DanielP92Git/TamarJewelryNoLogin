const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  global_discount_percentage: { type: Number, default: 0 },
  discount_active: { type: Boolean, default: false },
  discount_label: { type: String, default: 'Discount' },
  updatedAt: { type: Date, default: Date.now },
  // Exchange rate fields
  usd_ils_rate: { type: Number, default: null },
  exchange_rate_last_updated: { type: Date, default: null },
  exchange_rate_source: { type: String, default: null },
});

// Ensure only one settings document exists
SettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports =
  mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

