import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Shield, Trash2, Lock, CheckCircle2, XCircle } from 'lucide-react';
import vaultService from '../../services/vault';
import type { Vault } from '../../types';

const VaultPage = () => {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadVaults = async () => {
    try {
      setLoading(true);
      const data = await vaultService.getVaults();
      setVaults(data.vaults || []);
    } catch {
      toast.error('Failed to load vaults');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVaults(); }, []);

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) { toast.error('Vault content is required'); return; }
    try {
      setSubmitting(true);
      await vaultService.createVault({ encrypted_data: content, metadata: { title, description, type: 'text' } });
      toast.success('Vault created successfully');
      setContent(''); setTitle(''); setDescription('');
      await loadVaults();
    } catch {
      toast.error('Failed to create vault');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVault = async (id: string) => {
    try {
      await vaultService.deleteVault(id);
      toast.success('Vault deleted');
      await loadVaults();
    } catch {
      toast.error('Failed to delete vault');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Digital Vault</h1>
        <p className="text-gray-600 mt-2">Store encrypted instructions that can be conditionally released.</p>
      </div>

      {/* Create form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-blue-50 p-2 rounded-lg">
            <Lock size={18} className="text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Create Vault Item</h2>
        </div>
        <form onSubmit={handleCreateVault} className="space-y-4">
          <input
            type="text"
            placeholder="Title"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Description"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[100px] resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <textarea
            placeholder="Write your secret instruction here..."
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[160px] resize-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-150 shadow-sm hover:shadow-md"
          >
            {submitting ? 'Saving...' : 'Create Vault'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Vault Items</h2>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading vaults...</p>
        ) : vaults.length === 0 ? (
          <div className="text-center py-14">
            <Shield size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No vault items yet.</p>
            <p className="text-gray-400 text-sm mt-1">Create your first vault item above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vaults.map((vault) => (
              <div
                key={vault.id}
                className="border border-gray-100 rounded-xl p-5 flex items-start justify-between gap-4 hover:border-gray-200 hover:bg-gray-50 transition-all duration-150 group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{vault.metadata?.title || 'Untitled vault'}</h3>
                  <p className="text-sm text-gray-500 mt-1">{vault.metadata?.description || 'No description'}</p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${vault.is_active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                      {vault.is_active ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                      {vault.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${vault.release_triggered ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                      {vault.release_triggered ? <CheckCircle2 size={11} /> : <Lock size={11} />}
                      {vault.release_triggered ? 'Released' : 'Locked'}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      {vault.created_at ? new Date(vault.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteVault(vault.id)}
                  className="flex-shrink-0 p-2.5 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all duration-150"
                  title="Delete vault"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VaultPage;