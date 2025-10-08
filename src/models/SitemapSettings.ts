// models/SitemapSettings.js
import mongoose from 'mongoose';

const SitemapSettingsSchema = new mongoose.Schema({
  autoRegenerate: {
    type: Boolean,
    default: true
  },
  changeFrequency: {
    type: String,
    enum: ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'],
    default: 'weekly'
  },
  prioritySettings: {
    home: { type: Number, default: 1.0, min: 0, max: 1 },
    products: { type: Number, default: 0.8, min: 0, max: 1 },
    categories: { type: Number, default: 0.7, min: 0, max: 1 },
    blog: { type: Number, default: 0.6, min: 0, max: 1 },
    static: { type: Number, default: 0.5, min: 0, max: 1 }
  },
  excludedUrls: [{
    url: String,
    pattern: String, // regex pattern for bulk exclusions
    reason: String,
    excludedAt: { type: Date, default: Date.now }
  }],
  lastGenerated: Date,
  urlsCount: Number,
  searchEnginePing: {
    google: { type: Boolean, default: true },
    bing: { type: Boolean, default: true },
    other: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

export default mongoose.models.SitemapSettings || mongoose.model('SitemapSettings', SitemapSettingsSchema);