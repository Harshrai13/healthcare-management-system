import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, User, Clock, ArrowLeft, Tag, Share2 } from 'lucide-react';
import { blogAPI } from '../../api/generalAPI';

function useBlogPost(slug) {
  return useQuery({
    queryKey: ['blog', slug],
    queryFn: async () => {
      const { data } = await blogAPI.getBySlug(slug);
      return data.data;
    },
    enabled: !!slug,
  });
}

function BlogDetailPage() {
  const { slug } = useParams();
  const { data: post, isLoading, error } = useBlogPost(slug);

  if (isLoading) {
    return (
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <div className="animate-pulse space-y-6">
            <div className="h-6 bg-neutral-200 rounded w-1/3" />
            <div className="h-12 bg-neutral-200 rounded w-2/3" />
            <div className="h-4 bg-neutral-200 rounded w-1/2" />
            <div className="h-64 bg-neutral-200 rounded-2xl" />
            <div className="space-y-3">
              <div className="h-4 bg-neutral-200 rounded" />
              <div className="h-4 bg-neutral-200 rounded" />
              <div className="h-4 bg-neutral-200 rounded w-5/6" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !post) {
    return (
      <section className="section-padding">
        <div className="container-custom max-w-4xl text-center py-16">
          <h1 className="text-3xl font-display font-bold text-neutral-900 mb-4">Article Not Found</h1>
          <p className="text-neutral-600 mb-8">The article you're looking for doesn't exist or has been removed.</p>
          <Link to="/blog" className="inline-flex items-center gap-2 text-primary-700 font-medium hover:text-primary-800">
            <ArrowLeft size={16} /> Back to Blog
          </Link>
        </div>
      </section>
    );
  }

  const authorName = post.authorId
    ? `${post.authorId.firstName || ''} ${post.authorId.lastName || ''}`.trim()
    : 'VerdantCare Team';

  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const readTime = post.content
    ? `${Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200))} min read`
    : '5 min read';

  return (
    <section className="section-padding">
      <div className="container-custom max-w-4xl">
        {/* Back link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-primary-700 font-medium hover:text-primary-800 mb-8 transition-colors"
        >
          <ArrowLeft size={16} /> Back to All Articles
        </Link>

        {/* Article Header */}
        <article>
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1 text-xs text-primary-700 bg-primary-50 px-3 py-1 rounded-full font-medium">
                <Tag size={10} /> {post.category || 'Health'}
              </span>
              <span className="flex items-center gap-1 text-xs text-neutral-500">
                <Clock size={12} /> {readTime}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-neutral-900 leading-tight mb-6">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="text-lg text-neutral-600 leading-relaxed mb-6">{post.excerpt}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-neutral-500 pb-6 border-b border-neutral-100">
              <span className="flex items-center gap-1.5">
                <User size={14} /> {authorName}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} /> {publishedDate}
              </span>
            </div>
          </header>

          {/* Cover Image */}
          {post.coverImage && (
            <div className="mb-10 rounded-2xl overflow-hidden">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-64 md:h-96 object-cover"
                loading="lazy"
              />
            </div>
          )}
          {!post.coverImage && (
            <div className="mb-10 rounded-2xl bg-gradient-to-r from-primary-50 to-secondary-50 h-48 md:h-64 flex items-center justify-center border border-neutral-100">
              <span className="text-neutral-300 text-sm">Article Cover Image</span>
            </div>
          )}

          {/* Article Content */}
          <div
            className="prose prose-lg prose-neutral max-w-none
              prose-headings:font-display prose-headings:font-bold prose-headings:text-neutral-900
              prose-p:text-neutral-700 prose-p:leading-relaxed
              prose-a:text-primary-700 prose-a:font-medium
              prose-strong:text-neutral-900
              prose-blockquote:border-primary-300 prose-blockquote:text-neutral-600
              prose-img:rounded-xl"
          >
            {post.content ? (
              post.content.split('\n').map((paragraph, idx) => {
                if (!paragraph.trim()) return null;
                if (paragraph.startsWith('# ')) {
                  return <h2 key={idx} className="text-2xl font-display font-bold text-neutral-900 mt-10 mb-4">{paragraph.replace('# ', '')}</h2>;
                }
                if (paragraph.startsWith('## ')) {
                  return <h3 key={idx} className="text-xl font-display font-bold text-neutral-900 mt-8 mb-3">{paragraph.replace('## ', '')}</h3>;
                }
                if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                  return (
                    <li key={idx} className="text-neutral-700 ml-4 mb-1 list-disc">
                      {paragraph.replace(/^[-*]\s/, '')}
                    </li>
                  );
                }
                return <p key={idx} className="text-neutral-700 leading-relaxed mb-4">{paragraph}</p>;
              })
            ) : (
              <p className="text-neutral-500 italic">Content coming soon.</p>
            )}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-neutral-100">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs font-medium hover:bg-neutral-200 transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Share */}
          <div className="mt-8 p-6 bg-primary-50 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-neutral-900">Found this article helpful?</h3>
              <p className="text-sm text-neutral-600 mt-1">Share it with someone who might benefit from this information.</p>
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-700 text-white rounded-xl font-medium hover:bg-primary-800 transition-colors shadow-sm"
            >
              <Share2 size={16} /> Share Article
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

export default BlogDetailPage;
