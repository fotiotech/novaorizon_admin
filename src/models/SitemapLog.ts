// models/SitemapLog.js
import mongoose from 'mongoose';

const SitemapLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['generated', 'submitted', 'error', 'updated_settings'],
    required: true
  },
  details: String,
  urlsCount: Number,
  duration: Number, // in milliseconds
  error: String,
  triggeredBy: String // admin user ID or system
}, {
  timestamps: true
});

export default mongoose.models.SitemapLog || mongoose.model('SitemapLog', SitemapLogSchema);