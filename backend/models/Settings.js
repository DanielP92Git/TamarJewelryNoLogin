const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  global_discount_percentage: { type: Number, default: 0 },
  discount_active: { type: Boolean, default: false },
  discount_label: { type: String, default: 'End of Year Discount' },
  updatedAt: { type: Date, default: Date.now },
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

