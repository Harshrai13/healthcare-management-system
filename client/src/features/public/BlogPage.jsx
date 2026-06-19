import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, User, ArrowRight, Clock, Tag, FileText } from 'lucide-react';
import { blogAPI } from '../../api/generalAPI';
import { useDebounce } from '../../hooks/useDebounce';

function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchPosts = useCallback(async (category) => {
    setLoading(true);
    try {
      const params = { limit: 24 };
      if (category && category !== 'All') params.category = category;
      const res = await blogAPI.getAll(params);
      const data = res.data.data;
      setPosts(data?.posts || []);

      // build category list from posts if not already loaded
      const cats = new Set(['All']);
      (data?.posts || []).forEach((p) => {
        if (p.category) cats.add(p.category);
      });
      setCategories([...cats]);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(selectedCategory);
  }, [fetchPosts, selectedCategory]);

  // client-side search filter
  const filteredPosts = posts.filter((post) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      (post.title || '').toLowerCase().includes(q) ||
      (post.excerpt || '').toLowerCase().includes(q) ||
      (post.category || '').toLowerCase().includes(q)
    );
  });

  const featuredPost = filteredPosts[0];
  const gridPosts = filteredPosts.slice(1);

  const formatAuthor = (post) =>
    post.authorId
      ? `${post.authorId.firstName || ''} ${post.authorId.lastName || ''}`.trim() || 'VerdantCare Team'
      : 'VerdantCare Team';

  const formatDate = (post) => {
    const dateStr = post.publishedAt || post.createdAt;
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatReadTime = (post) =>
    post.content ? `${Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200))} min read` : '5 min read';

  return (
    <section className="section-padding">
      <div className="container-custom">
        <div className="text-center mb-12">
          <span className="text-primary-700 font-medium">Our Blog</span>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-neutral-900 mt-2">
            Health Tips & Insights
          </h1>
          <p className="text-neutral-600 mt-4 max-w-2xl mx-auto text-lg">
            Stay informed with the latest healthcare advice, wellness tips, and medical insights from our expert physicians.
          </p>
        </div>

        {/* Featured Post */}
        {featuredPost && !loading && (
          <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-8 mb-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium mb-3">
                  Featured
                </span>
                <h2 className="text-2xl font-display font-bold text-neutral-900 mb-3">{featuredPost.title}</h2>
                <p className="text-neutral-600 mb-4">{featuredPost.excerpt}</p>
                <div className="flex items-center gap-4 text-sm text-neutral-500 mb-4">
                  <span className="flex items-center gap-1"><User size={14} /> {formatAuthor(featuredPost)}</span>
                  <span className="flex items-center gap-1"><Clock size={14} /> {formatReadTime(featuredPost)}</span>
                </div>
                <Link
                  to={`/blog/${featuredPost.slug}`}
                  className="inline-flex items-center gap-2 text-primary-700 font-medium hover:text-primary-800"
                >
                  Read Article <ArrowRight size={16} />
                </Link>
              </div>
              <div className="bg-white rounded-xl h-48 flex items-center justify-center border border-neutral-100">
                {featuredPost.coverImage ? (
                  <img src={featuredPost.coverImage} alt={featuredPost.title} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <span className="text-neutral-300 text-sm">Featured Image</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary-700 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Blog Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-neutral-100 overflow-hidden animate-pulse">
                <div className="bg-neutral-100 h-40" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-neutral-100 rounded w-1/3" />
                  <div className="h-5 bg-neutral-100 rounded w-3/4" />
                  <div className="h-3 bg-neutral-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <FileText size={40} className="mx-auto mb-3 text-neutral-300" />
            <p className="font-medium">No articles found matching your criteria</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridPosts.map((post) => (
              <Link
                key={post._id || post.id}
                to={`/blog/${post.slug}`}
                className="bg-white rounded-xl border border-neutral-100 overflow-hidden hover:shadow-md transition-shadow group block"
              >
                <div className="bg-neutral-50 h-40 flex items-center justify-center border-b border-neutral-100">
                  {post.coverImage ? (
                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-neutral-300 text-sm">Article Image</span>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex items-center gap-1 text-xs text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                      <Tag size={10} /> {post.category || 'Health'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-neutral-500">
                      <Clock size={10} /> {formatReadTime(post)}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-neutral-900 mb-2 group-hover:text-primary-700 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-neutral-600 mb-4 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>{formatAuthor(post)}</span>
                    <span>{formatDate(post)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default BlogPage;