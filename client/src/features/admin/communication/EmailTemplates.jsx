import { useEffect, useState } from 'react';
import { Search, Edit2, Eye, Send, Save } from 'lucide-react';
import { getEmailTemplates, updateEmailTemplate, previewEmailTemplate, sendTestTemplate } from '../../../api/communicationAPI';

export default function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [testEmail, setTestEmail] = useState('');

  async function load() {
    try {
      const res = await getEmailTemplates({ search });
      setTemplates(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [search]);

  async function saveTemplate() {
    try {
      await updateEmailTemplate(editing._id, editing);
      setEditing(null);
      load();
    } catch (err) {
      console.error(err);
    }
  }

  async function showPreview(template) {
    try {
      const res = await previewEmailTemplate(template._id);
      setPreview(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function sendTest(template) {
    if (!testEmail) return;
    try {
      await sendTestTemplate(template._id, { to: testEmail });
      alert('Test email sent');
      setTestEmail('');
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900 mb-4">Email Templates</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-96 pl-9 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-teal-600"
        />
      </div>

      <div className="space-y-4">
        {templates.map((template) => (
          <div key={template._id} className="bg-white p-6 rounded-lg border border-neutral-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-neutral-900">{template.name}</h3>
                <p className="text-sm text-neutral-500">{template.description}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded">{template.category}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => showPreview(template)} className="p-2 hover:bg-neutral-100 rounded" title="Preview"><Eye className="w-4 h-4" /></button>
                <button onClick={() => setEditing(template)} className="p-2 hover:bg-neutral-100 rounded" title="Edit"><Edit2 className="w-4 h-4" /></button>
              </div>
            </div>

            {editing?._id === template._id && (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={editing.subject}
                  onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg"
                />
                <textarea
                  value={editing.htmlBody}
                  onChange={(e) => setEditing({ ...editing, htmlBody: e.target.value })}
                  rows={8}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg font-mono text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={saveTemplate} className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800"><Save className="w-4 h-4" /> Save</button>
                  <button onClick={() => setEditing(null)} className="px-4 py-2 border border-neutral-200 rounded-lg">Cancel</button>
                </div>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <input
                type="email"
                placeholder="Test email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm"
              />
              <button onClick={() => sendTest(template)} className="flex items-center gap-1 px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded-lg text-sm hover:bg-neutral-200"><Send className="w-3 h-3" /> Test</button>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-2">{preview.subject}</h3>
            <div dangerouslySetInnerHTML={{ __html: preview.html }} className="border border-neutral-200 rounded-lg p-4" />
            <button onClick={() => setPreview(null)} className="mt-4 px-4 py-2 bg-neutral-100 rounded-lg">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
