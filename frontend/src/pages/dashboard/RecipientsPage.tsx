import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Users,
  Trash2,
  CheckCircle2,
  XCircle,
  Mail,
  Clock,
  Loader2,
} from 'lucide-react';
import vaultService from '../../services/vault';
import type { Recipient } from '../../types';

const RecipientsPage = () => {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadRecipients = async () => {
    try {
      setLoading(true);
      const data = await vaultService.getRecipients();
      setRecipients(data.recipients || []);
    } catch {
      toast.error('Failed to load recipients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipients();
  }, []);

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    try {
      setSubmitting(true);
      await vaultService.addRecipient({ name, email, relationship });
      toast.success('Invitation sent');
      setName('');
      setEmail('');
      setRelationship('');
      await loadRecipients();
    } catch {
      toast.error('Failed to add recipient');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (id: string) => {
    try {
      await vaultService.resendInvitation(id);
      toast.success('Invitation resent');
    } catch {
      toast.error('Failed to resend invitation');
    }
  };

  const handleDeleteRecipient = async (id: string) => {
    try {
      await vaultService.deleteRecipient(id);
      toast.success('Recipient removed');
      await loadRecipients();
    } catch {
      toast.error('Failed to remove recipient');
    }
  };

  const getInitials = (n: string) =>
    n
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const inputClass =
    'border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition';

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
          People
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Recipients
        </h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Invited recipients receive an email with a setup link. They choose
          their own passphrase and generate a keypair in their browser. Only
          then can your vault be encrypted to them.
        </p>
      </div>

      {/* Add */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users size={17} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Add recipient
          </h2>
        </div>

        <form onSubmit={handleAddRecipient} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Full name"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="Relationship (e.g. spouse)"
              className={inputClass}
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg transition inline-flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Sending…
              </>
            ) : (
              'Send invitation'
            )}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-5">
          Trusted recipients
        </h2>

        {loading ? (
          <p className="text-slate-500 text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading recipients…
          </p>
        ) : recipients.length === 0 ? (
          <div className="text-center py-14">
            <Users size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">
              No recipients added yet.
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Add a trusted person above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recipients.map((recipient) => {
              const isAccepted = recipient.invitation_status === 'accepted';
              return (
                <div
                  key={recipient.id}
                  className="border border-slate-200 rounded-xl p-5 flex items-center gap-4 hover:border-slate-300 hover:shadow-sm transition"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-semibold text-xs flex-shrink-0">
                    {getInitials(recipient.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">
                        {recipient.name}
                      </p>
                      {recipient.relationship && (
                        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          {recipient.relationship}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {recipient.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                          isAccepted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {isAccepted ? (
                          <CheckCircle2 size={11} />
                        ) : (
                          <Clock size={11} />
                        )}
                        {isAccepted ? 'Keypair ready' : 'Awaiting setup'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                          recipient.access_granted
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {recipient.access_granted ? (
                          <CheckCircle2 size={11} />
                        ) : (
                          <XCircle size={11} />
                        )}
                        {recipient.access_granted
                          ? 'Accessed'
                          : 'Not accessed'}
                      </span>
                    </div>
                  </div>

                  {!isAccepted && (
                    <button
                      onClick={() => handleResend(recipient.id)}
                      className="flex-shrink-0 p-2.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition"
                      title="Resend invitation email"
                    >
                      <Mail size={17} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteRecipient(recipient.id)}
                    className="flex-shrink-0 p-2.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Remove recipient"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipientsPage;
