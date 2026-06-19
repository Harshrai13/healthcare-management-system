import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit2, Trash2, Eye, FileText, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { blogAPI } from '../../api/generalAPI';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminBlogPage() {
  const [activeTab, setActiveTab] = useState('PUBLISHED');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['admin_blog_posts'],
    queryFn: async () => {
      const { data } = await blogAPI.getAdminAll({ limit: 100 });
      return data.data?.posts || [];
    },
  });

  const filteredPosts = useMemo(() => {
    let filtered = posts.filter((post) => {
      const status = (post.status || 'PUBLISHED').toUpperCase();
      return status === activeTab;
    });
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.title || '').toLowerCase().includes(q) ||
          (p.authorId?.firstName || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [posts, activeTab, searchQuery]);

  const stats = useMemo(() => {
    const published = posts.filter((p) => (p.status || 'PUBLISHED').toUpperCase() === 'PUBLISHED').length;
    const drafts = posts.filter((p) => ['DRAFT', 'SCHEDULED'].includes((p.status || '').toUpperCase())).length;
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    return { published, drafts, totalViews };
  }, [posts]);

  const deleteMutation = useMutation({
    mutationFn: (id) => blogAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_blog_posts'] });
      toast.success('Post deleted');
    },
    onError: () => toast.error('Failed to delete post'),
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Blog Management</h1>
          <p className="text-neutral-500 text-sm">Create, edit, and manage articles</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus size={18} /> New Article
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><CheckCircle size={24} /></div>
          <div>
            <p className="text-sm font-medium text-neutral-500">Published Posts</p>
            <h3 className="text-2xl font-bold text-neutral-900">{stats.published}</h3>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-yellow-50 text-yellow-600 rounded-2xl"><Clock size={24} /></div>
          <div>
            <p className="text-sm font-medium text-neutral-500">Scheduled / Drafts</p>
            <h3 className="text-2xl font-bold text-neutral-900">{stats.drafts}</h3>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-primary-50 text-primary-600 rounded-2xl"><Eye size={24} /></div>
          <div>
            <p className="text-sm font-medium text-neutral-500">Total Views</p>
            <h3 className="text-2xl font-bold text-neutral-900">{stats.totalViews > 1000 ? `${(stats.totalViews / 1000).toFixed(1)}k` : stats.totalViews}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-neutral-100 p-1 rounded-xl w-full md:w-auto">
            {['PUBLISHED', 'DRAFT', 'SCHEDULED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-100 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 border-b border-neutral-100">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Article Title</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Author</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Views</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                    <FileText className="mx-auto text-neutral-300 mb-3" size={32} />
                    <p className="font-medium text-neutral-900">No {activeTab.toLowerCase()} posts found.</p>
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <tr key={post._id || post.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-neutral-900 line-clamp-1">{post.title}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{post.authorId ? `${post.authorId.firstName} ${post.authorId.lastName}` : 'Admin'}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-neutral-100 text-neutral-600 rounded-lg text-xs font-medium">{post.category || 'General'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{formatDate(post.createdAt || post.date)}</td>
                    <td className="px-6 py-4 font-semibold text-neutral-900">{post.views || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 text-neutral-400">
                        <button className="p-2 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="View"><Eye size={18} /></button>
                        <button className="p-2 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Edit2 size={18} /></button>
                        <button
                          onClick={() => deleteMutation.mutate(post._id || post.id)}
                          className="p-2 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
