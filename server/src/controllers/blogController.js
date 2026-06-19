const { BlogPost } = require('../models');
const { AppError, ErrorCodes } = require('../utils/AppError');

async function getPosts(req, res, next) {
  try {
    const { category, status, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = { status: status || 'PUBLISHED' };
    if (category) where.category = category;

    const [posts, total] = await Promise.all([
      BlogPost.find(where)
        .populate({ path: 'authorId', select: 'firstName lastName' })
        .skip(skip).limit(limitNum).sort({ publishedAt: -1 }),
      BlogPost.countDocuments(where),
    ]);

    res.json({
      success: true,
      data: { posts, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } },
    });
  } catch (error) {
    next(error);
  }
}

async function getPostBySlug(req, res, next) {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug })
      .populate({ path: 'authorId', select: 'firstName lastName avatar' });
    if (!post) throw new AppError('Blog post not found.', 404, ErrorCodes.NOT_FOUND);
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
}

async function createPost(req, res, next) {
  try {
    const { title, slug, content, excerpt, coverImage, category, tags, status } = req.body;
    const post = await BlogPost.create({
      authorId: req.user.id, title, slug, content, excerpt, coverImage, category, tags, status,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
    });
    res.status(201).json({ success: true, message: 'Blog post created.', data: post });
  } catch (error) {
    next(error);
  }
}

async function updatePost(req, res, next) {
  try {
    const { title, slug, content, excerpt, coverImage, category, tags, status } = req.body;
    const updateData = { title, slug, content, excerpt, coverImage, category, tags, status };
    if (status === 'PUBLISHED') updateData.publishedAt = new Date();
    const post = await BlogPost.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ success: true, message: 'Blog post updated.', data: post });
  } catch (error) {
    next(error);
  }
}

async function deletePost(req, res, next) {
  try {
    await BlogPost.findByIdAndUpdate(req.params.id, { status: 'ARCHIVED' });
    res.json({ success: true, message: 'Blog post archived.' });
  } catch (error) {
    next(error);
  }
}

async function getAdminAllPosts(req, res, next) {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (status && status !== 'ALL') where.status = status;

    const [posts, total] = await Promise.all([
      BlogPost.find(where)
        .populate({ path: 'authorId', select: 'firstName lastName' })
        .skip(skip).limit(limitNum).sort({ createdAt: -1 }),
      BlogPost.countDocuments(where),
    ]);

    res.json({
      success: true,
      data: { posts, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getPosts, getPostBySlug, createPost, updatePost, deletePost, getAdminAllPosts };
