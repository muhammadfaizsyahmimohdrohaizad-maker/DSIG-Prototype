import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; // Adjust path to your Supabase client

export default function AccountSettings() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveKey = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus({ type: '', message: '' });

    try {
      // Get the current user's session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("You must be logged in to save an API key.");

      // Call our secure Edge Function
      const response = await fetch(
        'https://hfsypwqxvsdlpfefldgp.supabase.co/functions/v1/save-user-key',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ apiKey })
        }
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to save key');

      setStatus({ type: 'success', message: 'API Key securely encrypted and saved!' });
      setApiKey(''); // Clear the input for security
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 mt-10 bg-white border border-slate-200 shadow-sm rounded-2xl">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Settings</h2>
      <p className="text-slate-500 mb-8">Manage your API integrations and security preferences.</p>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Google Gemini API Key</h3>
        
        <form onSubmit={handleSaveKey} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Secret Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full pl-4 pr-12 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              🔒 Your key is encrypted at rest using AES-256 and never leaves our secure backend.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {isSaving ? 'Encrypting & Saving...' : 'Save API Key'}
          </button>
        </form>

        {status.message && (
          <div className={`mt-4 p-4 rounded-lg text-sm font-medium ${
            status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}