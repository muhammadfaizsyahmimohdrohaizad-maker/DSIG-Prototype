import { useState } from 'react';
// Make sure your supabase client is imported correctly based on your project setup
import { supabase } from './supabaseClient'; 

export function OutreachGenerator({ accountDetails }) {
  const [draft, setDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateOutreach = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Invoke the Edge Function with the account payload
      const { data, error: functionError } = await supabase.functions.invoke('generate-outreach', {
        body: {
          accountName: accountDetails.name,
          email: accountDetails.email,
          healthScore: accountDetails.healthScore,
          riskSignals: accountDetails.riskSignals
        }
      }); //

      if (functionError) throw functionError;

      // Update the UI state with the generated text
      setDraft(data.emailText);

    } catch (err) {
      console.error("Error generating outreach:", err);
      setError("Failed to generate draft. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="outreach-container">
      <button 
        onClick={handleGenerateOutreach} 
        disabled={isGenerating}
      >
        {isGenerating ? 'Generating Draft...' : 'Generate AI Outreach'}
      </button>

      {error && <p className="error-text" style={{ color: 'red' }}>{error}</p>}

      {draft && (
        <div className="draft-preview">
          <h3>Generated Email Draft</h3>
          <textarea 
            value={draft} 
            onChange={(e) => setDraft(e.target.value)} 
            rows={10} 
            cols={50}
          />
        </div>
      )}
    </div>
  );
}