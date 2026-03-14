import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Users, Trash2, CheckCircle2, XCircle } from 'lucide-react';
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

  useEffect(() => { loadRecipients(); }, []);

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { toast.error('Name and email are required'); return; }
    try {
      setSubmitting(true);
      await vaultService.addRecipient({ name, email, relationship });
      toast.success('Recipient added successfully');
      setName(''); setEmail(''); setRelationship('');
      await loadRecipients();
    } catch {
      toast.error('Failed to add recipient');
    } finally {
      setSubmitting(false);
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
    n.split(' ').filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Recipients</h1>
        <p className="text-gray-600 mt-2">Choose trusted people who may receive access if release conditions are triggered.</p>
      </div>

      {/* Add form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-green-50 p-2 rounded-lg">
            <Users size={18} className="text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Add Recipient</h2>
        </div>
        <form onSubmit={handleAddRecipient} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Full name"
              className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email"
              className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="Relationship (e.g. spouse)"
              className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-150 shadow-sm hover:shadow-md"
          >
            {submitting ? 'Saving...' : 'Add Recipient'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Trusted Recipients</h2>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading recipients...</p>
        ) : recipients.length === 0 ? (
          <div className="text-center py-14">
            <Users size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No recipients added yet.</p>
            <p className="text-gray-400 text-sm mt-1">Add a trusted person above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recipients.map((recipient) => (
              <div
                key={recipient.id}
                className="border border-gray-100 rounded-xl p-5 flex items-center gap-4 hover:border-gray-200 hover:bg-gray-50 transition-all duration-150 group"
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {getInitials(recipient.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{recipient.name}</p>
                    {recipient.relationship && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {recipient.relationship}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{recipient.email}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${recipient.notification_sent ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                      {recipient.notification_sent ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                      {recipient.notification_sent ? 'Notified' : 'Not notified'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${recipient.access_granted ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                      {recipient.access_granted ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                      {recipient.access_granted ? 'Access granted' : 'No access yet'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteRecipient(recipient.id)}
                  className="flex-shrink-0 p-2.5 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all duration-150"
                  title="Remove recipient"
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

export default RecipientsPage;