const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    content: { type: String, required: true },
    excerpt: { type: String },
    coverImage: { type: String },
    category: { type: String, index: true },
    tags: [{ type: String }],
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'DRAFT',
    },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

blogPostSchema.index({ status: 1, publishedAt: -1 });

module.exports = mongoose.model('BlogPost', blogPostSchema);
