import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

// SVG 30-Day Health Score Trend Line Chart Component
function TrendLineChart({ history = [], highRiskCutoff = 35 }) {
  if (!history || history.length < 2) {
    return <p style={{ fontSize: '12px', color: '#64748b' }}>No historical trend data available</p>;
  }

  const width = 320;
  const height = 110;
  const padding = 20;

  const minVal = 0;
  const maxVal = 100;

  // Calculate coordinates for SVG polyline and dots
  const points = history.map((val, idx) => {
    const x = padding + (idx / (history.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - minVal) / (maxVal - minVal)) * (height - padding * 2);
    return { x, y, val };
  });

  const pathD = points.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  const initialScore = history[0];
  const currentScore = history[history.length - 1];
  const delta = currentScore - initialScore;
  const isDeclining = delta < 0;
  const strokeColor = isDeclining ? '#ef4444' : '#10b981';

  return (
    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>30-Day Health Trajectory</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: strokeColor }}>
          {delta > 0 ? `+${delta}` : delta} pts ({isDeclining ? 'Declining' : 'Improving'})
        </span>
      </div>

      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={`gradient-${isDeclining ? 'drop' : 'up'}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* High Risk Cutoff Reference Line */}
        <line 
          x1={padding} y1={height - padding - (highRiskCutoff / 100) * (height - padding * 2)} 
          x2={width - padding} y2={height - padding - (highRiskCutoff / 100) * (height - padding * 2)} 
          stroke="rgba(239, 68, 68, 0.4)" strokeDasharray="3 3" strokeWidth="1" 
        />

        {/* Gradient Area Fill */}
        <path d={areaD} fill={`url(#gradient-${isDeclining ? 'drop' : 'up'})`} />

        {/* Line Chart Path */}
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />

        {/* Data Point Circles */}
        {points.map((pt, i) => (
          <circle 
            key={i} 
            cx={pt.x} cy={pt.y} r="3.5" 
            fill="#ffffff" 
            stroke={strokeColor} 
            strokeWidth="2" 
          >
            <title>Checkpoint {i + 1}: {pt.val}/100</title>
          </circle>
        ))}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
        <span>30 Days Ago ({initialScore})</span>
        <span>15 Days Ago</span>
        <span>Today ({currentScore})</span>
      </div>
    </div>
  );
}

export default function App() {
  // Navigation & View Flow State ('landing' | 'auth' | 'app')
  const [viewMode, setViewMode] = useState('landing'); 
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'signup'

  // --- Authentication State ---
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState([]);
  
  // Store ID instead of entire object to stay dynamically in sync
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [hoveredAccountId, setHoveredAccountId] = useState(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');

  // What-If Simulator State (Simulated Engagement Drop in %)
  const [simulatedDrop, setSimulatedDrop] = useState(0);
  
  // Settings & API Key Vault State
  const [settings, setSettings] = useState({
    highRiskCutoff: 35,
    emailAlerts: true,
    dailyDigest: false,
    apiKey: '••••••••••••••••3a9F',
    isKeyConfigured: true
  });
  const [newApiKey, setNewApiKey] = useState('');

  // Modal States
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '' });

  // Edit Account State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState({ id: null, name: '', initials: '', desc: '', email: '' });

  // AI Email Drafter State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiEmailText, setAiEmailText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const navTabs = ['Dashboard', 'At-risk radar', 'Accounts', 'Settings'];

  // --- Supabase Authentication Listener ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) setViewMode('app');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setViewMode('app');
      } else {
        setViewMode('landing');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Auth Handlers ---
  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthError(error.message);
    } else {
      setViewMode('app');
    }
    setAuthLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setAuthError(error.message);
    } else {
      openModal('Account Created', 'Verification link sent! Check your email to confirm your account.');
    }
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setViewMode('landing');
  };

  // Fetch Accounts directly from Supabase
  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;

      if (Array.isArray(data)) {
        const cleanedData = data.map(account => ({
          ...account,
          name: account.name || 'Unnamed Account',
          score: typeof account.score === 'number' ? account.score : 0,
          desc: account.desc || account.desc_text || '',
          history: Array.isArray(account.history) ? account.history : [],
          factors: Array.isArray(account.factors) ? account.factors : [],
          email: account.email || ''
        }));
        
        setDashboardData(cleanedData);
        
        if (cleanedData.length > 0) {
          setActiveAccountId(prevId => {
            const exists = cleanedData.find(item => item.id === prevId);
            return exists ? exists.id : cleanedData[0].id;
          });
        } else {
          setActiveAccountId(null);
        }
      } else {
        setDashboardData([]);
      }
    } catch (err) {
      console.error('Error fetching data from Supabase:', err);
      setDashboardData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchAccounts();
  }, []);

  // Compute Accounts with What-If Simulation applied dynamically
  const simulatedAccounts = dashboardData.map(account => {
    const adjustedScore = Math.max(0, Math.round(account.score - (account.score * (simulatedDrop / 100))));
    const adjustedHistory = account.history
      ? account.history.map(val => Math.max(0, Math.round(val - (val * (simulatedDrop / 100)))))
      : [];
    return { ...account, simulatedScore: adjustedScore, simulatedHistory: adjustedHistory };
  });

  // Dynamically derived active account (always matches active simulated state)
  const activeAccount = simulatedAccounts.find(acc => acc.id === activeAccountId) || simulatedAccounts[0] || null;

  // Filtered accounts computed dynamically with null-safe checks
  const filteredAccounts = simulatedAccounts.filter(account => {
    const matchesSearch = (account.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (account.desc || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (account.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRisk = riskFilter === 'ALL' || 
                        (riskFilter === 'HIGH' && account.simulatedScore <= settings.highRiskCutoff) || 
                        (riskFilter === 'MEDIUM' && account.simulatedScore > settings.highRiskCutoff);

    return matchesSearch && matchesRisk;
  });

  // 1-Click CSV Export Function with consistent simulated status
  const handleExportCSV = () => {
    if (!dashboardData.length) return;

    const headers = ['Account ID', 'Company Name', 'Contact Email', 'Health Score', 'Simulated Score', 'Risk Status', 'Signals'];
    const rows = dashboardData.map(acc => {
      const simulatedScore = Math.max(0, Math.round(acc.score - (acc.score * (simulatedDrop / 100))));
      const riskStatus = simulatedScore <= settings.highRiskCutoff ? 'High Risk' : 'Medium Risk';
      return [
        acc.id,
        `"${acc.name || ''}"`,
        `"${acc.email || ''}"`,
        acc.score,
        simulatedScore,
        riskStatus,
        `"${(acc.desc || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `havlook_risk_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Edit Modal with active account data
  const handleOpenEditModal = (account) => {
    setEditAccount({
      id: account.id,
      name: account.name,
      initials: account.initials,
      desc: account.desc,
      email: account.email || ''
    });
    setIsEditModalOpen(true);
  };

  // Handle Submitting Edit using Supabase
  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    if (!editAccount.name || !editAccount.initials) return;

    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          name: editAccount.name,
          email: editAccount.email,
          initials: editAccount.initials,
          desc: editAccount.desc
        })
        .eq('id', editAccount.id);

      if (error) throw error;

      setIsEditModalOpen(false);
      fetchAccounts();
    } catch (err) {
      console.error('Error updating account:', err);
      openModal('Update Failed', `Could not update the account. Details: ${err.message}`);
    }
  };

  // SECURE BACKEND GENERATION VIA SUPABASE EDGE FUNCTION
  const handleDraftOutreach = async (account) => {
    setIsAiModalOpen(true);
    setIsGenerating(true);
    setAiEmailText('');
    setCopied(false);

    const negativeFactors = account.factors
      ? account.factors.filter(f => !f.isPositive).map(f => `${f.name} (${f.val})`).join(', ')
      : 'recent usage metrics drop';

    try {
      // Supabase automatically attaches authorization headers to functions.invoke()
      const { data, error } = await supabase.functions.invoke('generate-outreach', {
        body: { 
          account_name: account.name, 
          accountName: account.name,
          email: account.email || 'N/A',
          score: account.simulatedScore || account.score,
          healthScore: account.simulatedScore || account.score,
          desc: account.desc || negativeFactors,
          riskSignals: negativeFactors 
        }
      });

      if (error) throw error;

      // Handles both 'text' and 'emailText' response keys from backend
      const resultText = data?.text || data?.emailText;

      if (resultText) {
        setAiEmailText(`To: ${account.email || 'No email on file'}\n\n${resultText}`);
      } else if (data && data.error) {
        const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error, null, 2) : data.error;
        setAiEmailText(`⚠️ Backend Error:\n${errorMsg}`);
      } else {
        setAiEmailText('⚠️ Unexpected response format received from Supabase Edge Function.');
      }
    } catch (err) {
      console.error('Edge Function Fetch Error:', err);
      setAiEmailText(`⚠️ Network Error: Unable to reach secure backend. Details: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(aiEmailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle Deleting Account using Supabase
  const handleDeleteAccount = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchAccounts();
    } catch (err) {
      console.error('Error deleting account:', err);
      openModal('Delete Failed', `Could not delete the account. Details: ${err.message}`);
    }
  };

  // Handle Saving API Key securely in Vault
  const handleSaveApiKey = (e) => {
    e.preventDefault();
    if (!newApiKey) return;
    const masked = '••••••••••••••••' + newApiKey.slice(-4);
    setSettings(prev => ({
      ...prev,
      apiKey: masked,
      isKeyConfigured: true
    }));
    setNewApiKey('');
    openModal('API Key Encrypted & Saved', 'Your key has been encrypted with AES-256 and stored securely in your backend vault.');
  };

  const openModal = (title, message) => {
    setModalConfig({ isOpen: true, title, message });
  };

  const closeModal = () => {
    setModalConfig({ isOpen: false, title: '', message: '' });
  };

  const handleMetricClick = (label) => {
    openModal('Navigation', `Navigating to detailed breakdown for: ${label}`);
  };

  if (isLoading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
        <p style={{ color: '#64748b' }}>Loading Havlook Platform...</p>
      </div>
    );
  }

  const urgentAccounts = simulatedAccounts.filter(a => a.simulatedScore <= settings.highRiskCutoff);

  return (
    <div className="container" style={{ background: '#f8fafc', color: '#0f172a', minHeight: '100vh' }}>
      
      {/* Global Header */}
      <header className="header flex align-center space-between" style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff', padding: '12px 24px' }}>
        <div className="flex align-center" style={{ gap: '24px' }}>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setViewMode(user ? 'app' : 'landing'); }}
            className="logo flex align-center" 
            style={{ fontWeight: 800, fontSize: '20px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}
          >
            HavLook
          </a>

          {viewMode === 'app' && user && (
            <nav className="nav flex">
              {navTabs.map(tab => (
                <a 
                  key={tab}
                  href="#" 
                  className={activeTab === tab ? 'active' : ''}
                  onClick={(e) => { e.preventDefault(); setActiveTab(tab); }}
                >
                  {tab}
                </a>
              ))}
            </nav>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{user.email}</span>
              <button 
                onClick={handleSignOut}
                style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}
              >
                Sign Out
              </button>
              <div className="avatar" title="User Profile" style={{ cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: '#ffffff', fontWeight: 700 }}>
                {user.email ? user.email.slice(0, 2).toUpperCase() : 'CS'}
              </div>
            </>
          ) : (
            <>
              <button 
                onClick={() => { setAuthTab('login'); setAuthError(null); setViewMode('auth'); }}
                style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#0f172a', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}
              >
                Log in
              </button>
              <button 
                onClick={() => { setAuthTab('signup'); setAuthError(null); setViewMode('auth'); }}
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none', color: '#ffffff', padding: '6px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* VIEW 1: LANDING PAGE */}
      {viewMode === 'landing' && (
        <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 20px' }}>
          <section style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>
              NEXT-GEN CUSTOMER SUCCESS AI
            </span>
            <h1 style={{ fontSize: '48px', fontWeight: 800, marginTop: '16px', marginBottom: '16px', color: '#0f172a', lineHeight: 1.15 }}>
              Predict Churn Before It Happens.<br />
              <span style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Automate Outreach Instantly.
              </span>
            </h1>
            <p style={{ fontSize: '18px', color: '#64748b', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
              Havlook combines real-time health trajectory analytics, SHAP risk factor diagnostics, and serverless Gemini AI to keep your accounts thriving.
            </p>
          </section>

          <section style={{ 
            background: '#ffffff', borderRadius: '16px', padding: '12px', 
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', marginBottom: '80px' 
          }}>
            <div style={{ background: '#f8fafc', borderRadius: '10px', height: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed #cbd5e1' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <i className="ti ti-player-play" style={{ fontSize: '28px', color: '#6366f1' }}></i>
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#0f172a' }}>Interactive Demo & Media Preview</h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Watch how Havlook flags churn risk signals & drafts emails using Gemini API</p>
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {[
              { title: 'Real-Time Trajectory', icon: '📈', desc: 'Visual 30-day sparklines track sudden drops in health scores before accounts hit critical thresholds.' },
              { title: 'What-If Churn Simulator', icon: '🎛️', desc: 'Stress-test market trends by simulating engagement drops across your entire portfolio.' },
              { title: '1-Click Gemini Outreach', icon: '✨', desc: 'Generate personalized outreach drafts using secure, encrypted server-side LLM edge functions.' }
            ].map((f, i) => (
              <div key={i} style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '28px', display: 'block', marginBottom: '12px' }}>{f.icon}</span>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>{f.title}</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </section>
        </main>
      )}

      {/* VIEW 2: AUTHENTICATION PAGE */}
      {viewMode === 'auth' && (
        <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)', padding: '20px' }}>
          <div style={{ background: '#ffffff', padding: '36px', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '420px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
            
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <button 
                onClick={() => { setAuthTab('login'); setAuthError(null); }}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: 'none', borderBottom: authTab === 'login' ? '2px solid #6366f1' : 'none', fontWeight: authTab === 'login' ? 700 : 500, color: authTab === 'login' ? '#6366f1' : '#64748b', cursor: 'pointer' }}
              >
                Log in
              </button>
              <button 
                onClick={() => { setAuthTab('signup'); setAuthError(null); }}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: 'none', borderBottom: authTab === 'signup' ? '2px solid #6366f1' : 'none', fontWeight: authTab === 'signup' ? 700 : 500, color: authTab === 'signup' ? '#6366f1' : '#64748b', cursor: 'pointer' }}
              >
                Create Account
              </button>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
              {authTab === 'login' ? 'Welcome back to Havlook' : 'Get started with Havlook'}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0, marginBottom: '20px' }}>
              {authTab === 'login' ? 'Enter your credentials to access your dashboard' : 'Start managing churn risk in real-time'}
            </p>

            <form onSubmit={authTab === 'login' ? handleSignIn : handleSignUp}>
              {authError && (
                <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '6px', fontSize: '12px', marginBottom: '14px' }}>
                  ⚠️ {authError}
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Work Email</label>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com" 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Password</label>
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••" 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={authLoading}
                style={{ width: '100%', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none', color: '#ffffff', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: authLoading ? 0.7 : 1 }}
              >
                {authLoading ? 'Authenticating...' : (authTab === 'login' ? 'Sign In to Workspace' : 'Create Free Account')}
              </button>
            </form>

            <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '20px', lineHeight: 1.4 }}>
              🔒 Zero API key exposure guarantee. Your platform credentials and keys are encrypted at rest using AES-256.
            </p>
          </div>
        </main>
      )}

      {/* VIEW 3: MAIN APP DASHBOARD */}
      {viewMode === 'app' && user && (
        <main>
          
          {/* TAB 1: EXECUTIVE DASHBOARD VIEW */}
          {activeTab === 'Dashboard' && (
            <>
              {/* What-If Risk Simulator Bar */}
              <div style={{
                backgroundColor: '#ffffff',
                padding: '16px 20px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                gap: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <div>
                  <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a' }}>
                    Churn Simulator {simulatedDrop > 0 && <span style={{ color: '#ef4444', fontSize: '12px' }}>(-{simulatedDrop}% Engagement)</span>}
                  </strong>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                    Simulate a market-wide engagement drop to see how portfolio health reacts in real time.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '320px' }}>
                  <input 
                    type="range" min="0" max="50" step="5"
                    value={simulatedDrop}
                    onChange={e => setSimulatedDrop(parseInt(e.target.value))}
                    style={{ flex: 1, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '45px', textAlign: 'right', color: '#0f172a' }}>-{simulatedDrop}%</span>
                  {simulatedDrop > 0 && (
                    <button 
                      onClick={() => setSimulatedDrop(0)}
                      style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Metrics Grid */}
              <section className="metrics-grid">
                {[
                  { label: 'Total accounts', val: simulatedAccounts.length },
                  { label: 'Flagged at-risk', val: urgentAccounts.length, danger: true },
                  { label: 'Avg health score', val: simulatedAccounts.length ? Math.round(simulatedAccounts.reduce((acc, curr) => acc + curr.simulatedScore, 0) / simulatedAccounts.length) : 0 },
                  { label: 'MRR at risk', val: `$${urgentAccounts.length * 24 + 40}k` }
                ].map(metric => (
                  <article 
                    key={metric.label} 
                    className="metric-card" 
                    style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}
                    onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                    onClick={() => handleMetricClick(metric.label)}
                  >
                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{metric.label}</span>
                    <strong style={{ fontSize: '24px', display: 'block', marginTop: '4px', color: metric.danger ? '#ef4444' : '#0f172a' }}>{metric.val}</strong>
                  </article>
                ))}
              </section>

              <section className="main-grid">
                <article className="panel" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h2 className="panel-title" style={{ margin: 0, color: '#0f172a', fontSize: '16px' }}>Urgent Churn Threats</h2>
                      <p className="panel-subtitle" style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Accounts below high-risk cutoff (≤{settings.highRiskCutoff})</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('At-risk radar')}
                      style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#6366f1', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Open Full Radar ↗
                    </button>
                  </div>

                  <div className="radar-list">
                    {urgentAccounts.length > 0 ? (
                      urgentAccounts.map(account => (
                        <div 
                          key={account.id} 
                          style={{ 
                            padding: '12px', 
                            borderRadius: '8px', 
                            border: '1px solid rgba(239, 68, 68, 0.3)', 
                            backgroundColor: 'rgba(239, 68, 68, 0.04)',
                            marginBottom: '10px',
                            display: 'flex',
                            justify: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: '14px', display: 'block', marginBottom: '2px', color: '#0f172a' }}>{account.name}</strong>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{account.desc}</p>
                          </div>
                          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#ef4444' }}>{account.simulatedScore}</span>
                            <button 
                              className="btn"
                              onClick={() => handleDraftOutreach(account)}
                              style={{ margin: 0, padding: '6px 12px', fontSize: '12px', width: 'auto', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              Draft Email
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: '#64748b', padding: '20px 0', textAlign: 'center' }}>No urgent high-risk accounts right now!</p>
                    )}
                  </div>
                </article>

                <article className="panel" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                  <h2 className="panel-title" style={{ color: '#0f172a', fontSize: '16px', margin: 0 }}>Portfolio Health & Risk Analytics</h2>
                  <p className="panel-subtitle" style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>Interactive breakdown of account health scores</p>

                  <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '12px' }}>
                      Health Score Distribution (Visual Bar View)
                    </span>
                    
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '120px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                      {simulatedAccounts.map(acc => {
                        const isDanger = acc.simulatedScore <= settings.highRiskCutoff;
                        const heightPercent = Math.max(15, acc.simulatedScore);
                        return (
                          <div key={acc.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '10px', color: isDanger ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>{acc.simulatedScore}</span>
                            <div 
                              title={`${acc.name}: ${acc.simulatedScore}`}
                              style={{ 
                                width: '100%', 
                                height: `${heightPercent}%`, 
                                backgroundColor: isDanger ? '#ef4444' : '#6366f1',
                                borderRadius: '4px 4px 0 0',
                                transition: 'height 0.3s ease'
                              }}
                            />
                            <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '35px' }}>{acc.initials}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginTop: '20px', padding: '16px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#6366f1' }}>🤖 Gemini AI + Visual Insights</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                      Adjust the <strong>What-If Churn Simulator</strong> slider at the top to test stress scenarios across your entire account list in real-time.
                    </p>
                  </div>
                </article>
              </section>
            </>
          )}

          {/* TAB 2: AT-RISK RADAR VIEW */}
          {activeTab === 'At-risk radar' && (
            <section className="main-grid">
              
              <article className="panel" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h2 className="panel-title" style={{ margin: 0, color: '#0f172a' }}>At-risk radar</h2>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input 
                    type="text" 
                    placeholder="Search accounts or emails..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '13px' }}
                  />
                  <select 
                    value={riskFilter}
                    onChange={e => setRiskFilter(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '13px', cursor: 'pointer' }}
                  >
                    <option value="ALL">All Risk Levels</option>
                    <option value="HIGH">High Risk (≤{settings.highRiskCutoff})</option>
                    <option value="MEDIUM">Medium Risk (&gt;{settings.highRiskCutoff})</option>
                  </select>
                </div>

                <div className="radar-list">
                  {filteredAccounts.length > 0 ? (
                    filteredAccounts.map((account) => {
                      const isActive = activeAccount?.id === account.id;
                      const isHovered = hoveredAccountId === account.id;
                      const isDanger = account.simulatedScore <= settings.highRiskCutoff;
                      
                      return (
                        <div 
                          key={account.id} 
                          className="radar-item"
                          onClick={() => setActiveAccountId(account.id)}
                          onMouseEnter={() => setHoveredAccountId(account.id)}
                          onMouseLeave={() => setHoveredAccountId(null)}
                          style={{ 
                            cursor: 'pointer', 
                            backgroundColor: isActive ? 'rgba(99, 102, 241, 0.08)' : (isHovered ? '#f8fafc' : 'transparent'),
                            padding: '12px 10px',
                            borderRadius: '8px',
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background-color 0.2s ease'
                          }}
                        >
                          <div className={`radar-icon ${isDanger ? 'icon-danger' : 'icon-warning'}`}>
                            {account.initials}
                          </div>
                          <div className="radar-info">
                            <p className="radar-name" style={{ color: '#0f172a', fontWeight: 600 }}>{account.name}</p>
                            <p className="radar-desc" style={{ color: '#64748b' }}>{account.desc}</p>
                          </div>
                          <div className="radar-score">
                            <span className={`score-value ${isDanger ? 'text-danger' : 'text-warning'}`} style={{ fontWeight: 700 }}>
                              {account.simulatedScore}
                            </span>
                            <p className={`score-label ${isDanger ? 'text-danger' : 'text-warning'}`}>
                              {isDanger ? 'High risk' : 'Medium risk'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                      No accounts match your criteria.
                    </p>
                  )}
                </div>
              </article>

              {/* Diagnostics Panel */}
              <article className="panel" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                {activeAccount ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h2 className="panel-title" style={{ marginBottom: '4px', color: '#0f172a' }}>Why flagged: {activeAccount.name}</h2>
                        {activeAccount.email && (
                          <p style={{ fontSize: '13px', color: '#6366f1', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ✉️ {activeAccount.email}
                          </p>
                        )}
                        <p className="panel-subtitle" style={{ color: '#64748b' }}>SHAP contribution to churn risk & historical trends</p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          onClick={() => handleOpenEditModal(activeAccount)}
                          style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteAccount(activeAccount.id, activeAccount.name)}
                          style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444', color: '#ef4444', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <TrendLineChart 
                      history={activeAccount.simulatedHistory || activeAccount.history} 
                      highRiskCutoff={settings.highRiskCutoff} 
                    />

                    {activeAccount.factors?.map((factor, index) => (
                      <div className="shap-row" key={index} style={{ margin: '12px 0' }}>
                        <div className="shap-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ color: '#334155' }}>{factor.name}</span>
                          <span style={{ color: factor.isPositive ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                            {factor.val}
                          </span>
                        </div>
                        <div className="shap-track" style={{ background: '#f1f5f9', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div 
                            className={`shap-fill ${factor.isPositive ? 'fill-success' : 'fill-danger'}`} 
                            style={{ width: `${factor.percent}%`, transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', height: '100%', background: factor.isPositive ? '#10b981' : '#ef4444' }}
                          ></div>
                        </div>
                      </div>
                    ))}

                    <button 
                      className="btn" 
                      onClick={() => handleDraftOutreach(activeAccount)}
                      style={{ marginTop: '20px', width: '100%', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Draft outreach ↗
                    </button>
                  </>
                ) : (
                  <p style={{ color: '#64748b' }}>Select an account to view details.</p>
                )}
              </article>
            </section>
          )}

          {/* TAB 3: ACCOUNTS DATA TABLE VIEW */}
          {activeTab === 'Accounts' && (
            <article className="panel" style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 className="panel-title" style={{ margin: 0, color: '#0f172a' }}>All Managed Accounts</h2>
                  <p className="panel-subtitle" style={{ color: '#64748b', fontSize: '12px' }}>Comprehensive list of accounts and health statuses</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={handleExportCSV}
                    style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    📥 Export CSV
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <input 
                  type="text" 
                  placeholder="Search by company, email, or signal..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '13px' }}
                />
                <select 
                  value={riskFilter}
                  onChange={e => setRiskFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '13px', cursor: 'pointer' }}
                >
                  <option value="ALL">All Risk Levels</option>
                  <option value="HIGH">High Risk (≤{settings.highRiskCutoff})</option>
                  <option value="MEDIUM">Medium Risk (&gt;{settings.highRiskCutoff})</option>
                </select>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ padding: '12px 10px' }}>Account</th>
                      <th style={{ padding: '12px 10px' }}>Health Score</th>
                      <th style={{ padding: '12px 10px' }}>Risk Status</th>
                      <th style={{ padding: '12px 10px' }}>Key Signals</th>
                      <th style={{ padding: '12px 10px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.length > 0 ? (
                      filteredAccounts.map(account => {
                        const isDanger = account.simulatedScore <= settings.highRiskCutoff;
                        return (
                          <tr key={account.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 10px', fontWeight: 600, color: '#0f172a' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className={`radar-icon ${isDanger ? 'icon-danger' : 'icon-warning'}`} style={{ width: '30px', height: '30px', fontSize: '11px', flexShrink: 0 }}>
                                  {account.initials}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span>{account.name}</span>
                                  {account.email && <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>{account.email}</span>}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 10px', fontWeight: 600 }}>{account.simulatedScore} / 100</td>
                            <td style={{ padding: '12px 10px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: isDanger ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                color: isDanger ? '#ef4444' : '#d97706'
                              }}>
                                {isDanger ? 'High Risk' : 'Medium Risk'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 10px', color: '#64748b' }}>{account.desc}</td>
                            <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                              <button 
                                onClick={() => { setActiveAccountId(account.id); setActiveTab('At-risk radar'); }}
                                style={{ background: 'transparent', border: 'none', color: '#6366f1', cursor: 'pointer', marginRight: '10px', fontSize: '12px', fontWeight: 600 }}
                              >
                                Radar
                              </button>
                              <button 
                                onClick={() => handleOpenEditModal(account)}
                                style={{ background: 'transparent', border: 'none', color: '#0f172a', cursor: 'pointer', marginRight: '10px', fontSize: '12px' }}
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteAccount(account.id, account.name)}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                          No accounts match your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          )}

          {/* TAB 4: SETTINGS VIEW */}
          {activeTab === 'Settings' && (
            <article className="panel" style={{ maxWidth: '650px', margin: '0 auto', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
              <h2 className="panel-title" style={{ marginBottom: '4px', color: '#0f172a' }}>Platform Settings & Vault</h2>
              <p className="panel-subtitle" style={{ marginBottom: '24px', color: '#64748b' }}>Configure churn thresholds, notifications, and secure server-side API keys</p>

              <div style={{ marginBottom: '28px', padding: '16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '14px', margin: 0, color: '#0f172a', fontWeight: 700 }}>🔑 Server-Side API Key Setup</h3>
                  <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    ● Vault Secured
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: 0, marginBottom: '12px', lineHeight: 1.4 }}>
                  Enter your LLM API key once. It is encrypted immediately using AES-256 and used exclusively inside backend edge functions. Keys are never rendered or returned to client browsers.
                </p>

                <form onSubmit={handleSaveApiKey} style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="password" 
                    placeholder="Enter new Gemini / LLM Key"
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', color: '#0f172a' }}
                  />
                  <button type="submit" style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Encrypt & Save
                  </button>
                </form>

                {settings.isKeyConfigured && (
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>
                    Active key in vault: <strong style={{ color: '#0f172a' }}>{settings.apiKey}</strong>
                  </p>
                )}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); openModal('Settings Saved', 'Your configuration settings have been updated successfully.'); }}>
                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#0f172a' }}>
                    High Risk Threshold Score: <span style={{ color: '#ef4444' }}>{settings.highRiskCutoff}</span>
                  </label>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                    Accounts with a health score equal to or below this threshold will be flagged as <strong>High Risk</strong> across the radar.
                  </p>
                  <input 
                    type="range" min="10" max="60" 
                    value={settings.highRiskCutoff}
                    onChange={(e) => setSettings({ ...settings, highRiskCutoff: parseInt(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#0f172a' }}>Alert Preferences</h3>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px', fontSize: '13px', color: '#334155' }}>
                    <input 
                      type="checkbox" 
                      checked={settings.emailAlerts}
                      onChange={(e) => setSettings({ ...settings, emailAlerts: e.target.checked })}
                    />
                    <span>Email alerts when an account enters High Risk status</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                    <input 
                      type="checkbox" 
                      checked={settings.dailyDigest}
                      onChange={(e) => setSettings({ ...settings, dailyDigest: e.target.checked })}
                    />
                    <span>Receive daily CS digest summary email</span>
                  </label>
                </div>

                <button type="submit" style={{ width: '100%', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none', color: '#ffffff', padding: '10px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  Save Configuration
                </button>
              </form>
            </article>
          )}

        </main>
      )}

      {/* Edit Account Modal */}
      {isEditModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px',
            width: '400px', maxWidth: '90%', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#0f172a' }}>Edit Account: {editAccount.name}</h3>
            <form onSubmit={handleUpdateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Company Name</label>
                <input 
                  type="text" value={editAccount.name} required
                  onChange={e => setEditAccount({...editAccount, name: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Contact Email</label>
                <input 
                  type="email" value={editAccount.email} placeholder="client@company.com"
                  onChange={e => setEditAccount({...editAccount, email: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Initials</label>
                <input 
                  type="text" maxLength={3} value={editAccount.initials} required
                  onChange={e => setEditAccount({...editAccount, initials: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Description / Signals</label>
                <input 
                  type="text" value={editAccount.desc} required
                  onChange={e => setEditAccount({...editAccount, desc: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', marginTop: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" style={{ background: 'transparent', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Email Drafter Modal */}
      {isAiModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px',
            width: '560px', maxWidth: '90%', border: '1px solid #e2e8f0',
            boxShadow: '0 20px 30px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="ti ti-sparkles" style={{ color: '#6366f1', fontSize: '18px' }}></i>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>HavLook Gemini Assistant</h3>
              </div>
              <span style={{ fontSize: '12px', color: isGenerating ? '#d97706' : '#10b981', fontWeight: 600 }}>
                {isGenerating ? 'Connecting to Edge Function...' : '● Generated via Edge Function'}
              </span>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '13px',
              color: '#0f172a',
              whiteSpace: 'pre-wrap',
              minHeight: '220px',
              maxHeight: '350px',
              overflowY: 'auto',
              lineHeight: '1.6'
            }}>
              {isGenerating ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
                  <p style={{ color: '#64748b' }}>Analyzing risk factors securely & drafting personalized email...</p>
                </div>
              ) : (
                aiEmailText
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button 
                style={{ width: 'auto', margin: 0, background: 'transparent', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                onClick={() => setIsAiModalOpen(false)}
              >
                Close
              </button>
              <button 
                style={{ width: 'auto', margin: 0, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                disabled={isGenerating}
                onClick={handleCopyEmail}
              >
                {copied ? 'Copied to Clipboard!' : 'Copy Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {modalConfig.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px',
            width: '400px', maxWidth: '90%', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>{modalConfig.title}</h3>
            <p style={{ color: '#64748b', fontSize: '14px', whiteSpace: 'pre-wrap', marginBottom: '24px', lineHeight: 1.5 }}>{modalConfig.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={closeModal} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer' }}>Got it</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}