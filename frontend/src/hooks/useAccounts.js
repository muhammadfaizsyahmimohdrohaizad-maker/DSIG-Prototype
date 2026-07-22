import { useState, useEffect } from 'react';

export const useAccounts = (selectedAccountId) => {
  const [accounts, setAccounts] = useState([]);
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);

  // Fetch Radar Accounts
  useEffect(() => {
    const fetchRadar = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/accounts/radar');
        const data = await response.json();
        setAccounts(data);
      } catch (error) {
        console.error("Failed to fetch radar accounts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRadar();
  }, []);

  // Fetch SHAP Diagnostics when an account is selected
  useEffect(() => {
    if (!selectedAccountId) return;

    const fetchDiagnostics = async () => {
      setDiagnosticsLoading(true);
      try {
        const response = await fetch(`http://localhost:8000/api/v1/diagnostics/${selectedAccountId}`);
        const data = await response.json();
        setDiagnostics(data);
      } catch (error) {
        console.error("Failed to fetch diagnostics:", error);
      } finally {
        setDiagnosticsLoading(false);
      }
    };
    fetchDiagnostics();
  }, [selectedAccountId]);

  return { accounts, diagnostics, loading, diagnosticsLoading };
};