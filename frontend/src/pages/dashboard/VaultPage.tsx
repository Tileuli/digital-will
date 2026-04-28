import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Shield,
  Trash2,
  Lock,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Paperclip,
  Download,
  Image as ImageIcon,
  FileText,
  Users,
  Loader2,
  Calendar,
} from 'lucide-react';
import vaultService from '../../services/vault';
import type {
  Recipient,
  Vault,
  VaultAttachment,
  VaultPlaintext,
} from '../../types';
import { hasSessionKeys } from '../../services/keySession';
import {
  checkAttachmentSize,
  downloadAttachment,
  formatBytes,
  isImage,
  makePreviewDataUrl,
  readFileAsAttachment,
} from '../../services/files';

const VaultPage = () => {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [releaseAt, setReleaseAt] = useState<string>('');
  const [attachments, setAttachments] = useState<VaultAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState<{
    id: string;
    data: VaultPlaintext;
  } | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const locked = !hasSessionKeys();
  const acceptedRecipients = recipients.filter(
    (r) => r.invitation_status === 'accepted' && r.public_key
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [vaultsData, recipientsData] = await Promise.all([
        vaultService.getVaults(),
        vaultService.getRecipients(),
      ]);
      setVaults(vaultsData.vaults || []);
      setRecipients(recipientsData.recipients || []);
    } catch {
      toast.error('Failed to load vaults');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      const newAttachments = await Promise.all(files.map(readFileAsAttachment));
      const combined = [...attachments, ...newAttachments];
      const err = checkAttachmentSize(combined);
      if (err) {
        toast.error(err);
        return;
      }
      setAttachments(combined);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to read file');
    } finally {
      e.target.value = '';
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && attachments.length === 0) {
      toast.error('Add some content or at least one attachment');
      return;
    }
    if (selectedRecipientIds.length === 0) {
      toast.error('Select at least one recipient for this vault');
      return;
    }
    if (locked) {
      toast.error('Session locked — please log in again');
      return;
    }
    if (releaseAt) {
      const ts = new Date(releaseAt).getTime();
      if (Number.isNaN(ts) || ts <= Date.now()) {
        toast.error('Release date must be in the future');
        return;
      }
    }
    try {
      setSubmitting(true);
      await vaultService.createVault(
        {
          title: title || 'Untitled',
          description,
          content,
          type: attachments.length > 0 ? 'file' : 'text',
          attachments: attachments.length > 0 ? attachments : undefined,
        },
        selectedRecipientIds,
        { releaseAt: releaseAt ? new Date(releaseAt).toISOString() : null }
      );
      toast.success('Vault created');
      setContent('');
      setTitle('');
      setDescription('');
      setReleaseAt('');
      setAttachments([]);
      setSelectedRecipientIds([]);
      await loadData();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to create vault'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewVault = async (id: string) => {
    if (locked) {
      toast.error('Session locked — please log in again');
      return;
    }
    try {
      setViewLoading(true);
      const { plaintext } = await vaultService.getVaultDetailed(id);
      setViewing({ id, data: plaintext });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to decrypt vault');
    } finally {
      setViewLoading(false);
    }
  };

  const handleDeleteVault = async (id: string) => {
    try {
      await vaultService.deleteVault(id);
      toast.success('Vault deleted');
      await loadData();
    } catch {
      toast.error('Failed to delete vault');
    }
  };

  const inputClass =
    'w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition';

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
          Encrypted vault
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          My digital vault
        </h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Content is encrypted in your browser before upload. The server stores
          only opaque ciphertext.
        </p>
        {locked && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
            Your encryption session is locked. Please log out and log in again
            to unlock your keys.
          </div>
        )}
      </div>

      {/* Create form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Lock size={17} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Create vault item
          </h2>
        </div>

        <form onSubmit={handleCreateVault} className="space-y-4">
          <input
            type="text"
            placeholder="Title"
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Description"
            className={`${inputClass} min-h-[88px] resize-none`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <textarea
            placeholder="Write your secret instruction here…"
            className={`${inputClass} min-h-[160px] resize-none`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* Attachments */}
          <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/40">
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 text-sm font-medium">
              <Paperclip size={16} />
              <span>Attach files or photos</span>
              <input
                type="file"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
              />
            </label>
            <p className="text-xs text-slate-500 mt-1">
              Files are encrypted locally. Max 8 MB total.
            </p>

            {attachments.length > 0 && (
              <ul className="mt-3 space-y-2">
                {attachments.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    {isImage(a.mimetype) ? (
                      <ImageIcon
                        size={14}
                        className="text-slate-500 flex-shrink-0"
                      />
                    ) : (
                      <FileText
                        size={14}
                        className="text-slate-500 flex-shrink-0"
                      />
                    )}
                    <span className="flex-1 truncate text-slate-700">
                      {a.filename}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatBytes(a.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded transition"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Time-locked release */}
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">
                Release on a specific date
              </span>
              <span className="text-xs text-slate-400">(optional)</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              In addition to the dead-man's switch, you can schedule this vault
              to release on an exact date — useful for letters tied to
              birthdays, anniversaries, or future milestones.
            </p>
            <input
              type="datetime-local"
              value={releaseAt}
              onChange={(e) => setReleaseAt(e.target.value)}
              min={new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16)}
              className={`${inputClass} sm:max-w-xs`}
            />
          </div>

          {/* Recipients */}
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">
                Recipients for this vault
              </span>
              <span className="text-xs text-slate-400">
                (who will receive it after release)
              </span>
            </div>

            {acceptedRecipients.length === 0 ? (
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                You have no accepted recipients yet.{' '}
                <Link
                  to="/dashboard/recipients"
                  className="text-slate-900 hover:underline font-medium"
                >
                  Add recipients
                </Link>{' '}
                and wait for them to accept their invitation before creating a
                vault.
              </div>
            ) : (
              <ul className="space-y-1">
                {acceptedRecipients.map((r) => {
                  const checked = selectedRecipientIds.includes(r.id);
                  return (
                    <li key={r.id}>
                      <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRecipient(r.id)}
                          className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {r.name}
                            {r.relationship && (
                              <span className="text-slate-400 font-normal">
                                {' '}
                                · {r.relationship}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {r.email}
                          </p>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <button
            type="submit"
            disabled={
              submitting ||
              locked ||
              acceptedRecipients.length === 0 ||
              selectedRecipientIds.length === 0
            }
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg transition inline-flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Encrypting…
              </>
            ) : (
              'Create vault'
            )}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-5">
          Vault items
        </h2>

        {loading ? (
          <p className="text-slate-500 text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading vaults…
          </p>
        ) : vaults.length === 0 ? (
          <div className="text-center py-14">
            <Shield size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">No vault items yet.</p>
            <p className="text-slate-500 text-sm mt-1">
              Create your first vault item above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {vaults.map((vault) => (
              <div
                key={vault.id}
                className="border border-slate-200 rounded-xl p-5 flex items-start justify-between gap-4 hover:border-slate-300 hover:shadow-sm transition"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900">
                    Encrypted vault
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Contents are visible only after decrypting in your browser.
                  </p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Tag
                      label={vault.is_active ? 'Active' : 'Inactive'}
                      tone={vault.is_active ? 'success' : 'neutral'}
                      icon={vault.is_active ? CheckCircle2 : XCircle}
                    />
                    <Tag
                      label={vault.release_triggered ? 'Released' : 'Locked'}
                      tone={vault.release_triggered ? 'warning' : 'neutral'}
                      icon={vault.release_triggered ? CheckCircle2 : Lock}
                    />
                    {vault.metadata?.type === 'file' && (
                      <Tag label="Attachments" tone="info" icon={Paperclip} />
                    )}
                    {vault.release_at && (
                      <Tag
                        label={`Releases ${new Date(vault.release_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                        tone="info"
                        icon={Calendar}
                      />
                    )}
                    <span className="text-xs text-slate-400 ml-1">
                      {vault.created_at
                        ? new Date(vault.created_at).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }
                          )
                        : '—'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleViewVault(vault.id)}
                    disabled={viewLoading || locked}
                    className="p-2.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition disabled:opacity-40"
                    title="Decrypt and view"
                  >
                    <Eye size={17} />
                  </button>
                  <button
                    onClick={() => handleDeleteVault(vault.id)}
                    className="p-2.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Delete vault"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewing && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setViewing(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-lg text-slate-900">
                {viewing.data.title}
              </h3>
              <button
                onClick={() => setViewing(null)}
                className="text-slate-400 hover:text-slate-700 transition p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {viewing.data.description && (
                <p className="text-sm text-slate-600 italic">
                  {viewing.data.description}
                </p>
              )}
              {viewing.data.content && (
                <pre className="whitespace-pre-wrap break-words text-sm text-slate-800 bg-slate-50 p-4 rounded-lg border border-slate-100 font-mono">
                  {viewing.data.content}
                </pre>
              )}
              {viewing.data.attachments &&
                viewing.data.attachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Paperclip size={14} /> Attachments (
                      {viewing.data.attachments.length})
                    </p>
                    <ul className="space-y-2">
                      {viewing.data.attachments.map((a, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3"
                        >
                          {isImage(a.mimetype) ? (
                            <img
                              src={makePreviewDataUrl(a)}
                              alt={a.filename}
                              className="w-14 h-14 object-cover rounded-md border border-slate-200"
                            />
                          ) : (
                            <div className="w-14 h-14 bg-white border border-slate-200 rounded-md flex items-center justify-center text-slate-400">
                              <FileText size={20} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {a.filename}
                            </p>
                            <p className="text-xs text-slate-500">
                              {a.mimetype} · {formatBytes(a.size)}
                            </p>
                          </div>
                          <button
                            onClick={() => downloadAttachment(a)}
                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
                            title="Download"
                          >
                            <Download size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Tag: React.FC<{
  label: string;
  tone: 'success' | 'warning' | 'info' | 'neutral';
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = ({ label, tone, icon: Icon }) => {
  const styles: Record<typeof tone, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${styles[tone]}`}
    >
      <Icon size={11} />
      {label}
    </span>
  );
};

export default VaultPage;
