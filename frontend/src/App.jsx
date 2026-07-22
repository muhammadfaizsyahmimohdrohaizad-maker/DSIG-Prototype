import React, { useState, useEffect } from 'react';
import './index.css';

// SVG 30-Day Health Score Trend Line Chart Component
function TrendLineChart({ history = [], highRiskCutoff = 35 }) {
  if (!history || history.length < 2) {
    return <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No historical trend data available</p>;
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
    <div style={{ background: 'var(--surface-1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>30-Day Health Trajectory</span>
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
            fill="var(--surface-2)" 
            stroke={strokeColor} 
            strokeWidth="2" 
          >
            <title>Checkpoint {i + 1}: {pt.val}/100</title>
          </circle>
        ))}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
        <span>30 Days Ago ({initialScore})</span>
        <span>15 Days Ago</span>
        <span>Today ({currentScore})</span>
      </div>
    </div>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [hoveredAccountId, setHoveredAccountId] = useState(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');

  // What-If Simulator State (Simulated Engagement Drop in %)
  const [simulatedDrop, setSimulatedDrop] = useState(0);
  
  // Settings State (Google Gemini API Key)
  const [settings, setSettings] = useState({
    highRiskCutoff: 35,
    emailAlerts: true,
    dailyDigest: false,
    apiKey: ''
  });

  // Modal States
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '' });

  // Edit Account State (includes Email)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState({ id: null, name: '', initials: '', desc: '', email: '' });

  // AI Email Drafter State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiEmailText, setAiEmailText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const navTabs = ['Dashboard', 'At-risk radar', 'Accounts', 'Settings'];

  // Fetch Accounts from PHP API
  const fetchAccounts = () => {
    fetch("/api")
      .then(res => res.json())
      .then(data => {
        setDashboardData(data);
        if (data.length > 0) {
          setActiveAccount(prev => {
            const exists = data.find(item => item.id === prev?.id);
            return exists ? data.find(item => item.id === prev.id) : data[0];
          });
        } else {
          setActiveAccount(null);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching data:', err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    setIsLoading(true); 

    fetch('http://localhost/DSIG%20Prototype/api.php')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const cleanedData = data.map(account => ({
            ...account,
            desc: account.desc || account.desc_text || '',
            history: account.history || [],
            factors: account.factors || [],
            email: account.email || ''
          }));
          setDashboardData(cleanedData);
          if (cleanedData.length > 0) setActiveAccount(cleanedData[0]);
        } else {
          setDashboardData([]);
        }
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        setDashboardData([]); 
      })
      .finally(() => {
        setIsLoading(false); 
      });
  }, []);

  // Compute Accounts with What-If Simulation applied
  const simulatedAccounts = dashboardData.map(account => {
    const adjustedScore = Math.max(0, Math.round(account.score - (account.score * (simulatedDrop / 100))));
    const adjustedHistory = account.history
      ? account.history.map(val => Math.max(0, Math.round(val - (val * (simulatedDrop / 100)))))
      : [];
    return { ...account, simulatedScore: adjustedScore, simulatedHistory: adjustedHistory };
  });

  // Filtered accounts computed dynamically
  const filteredAccounts = simulatedAccounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          account.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (account.email && account.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRisk = riskFilter === 'ALL' || 
                        (riskFilter === 'HIGH' && account.simulatedScore <= settings.highRiskCutoff) || 
                        (riskFilter === 'MEDIUM' && account.simulatedScore > settings.highRiskCutoff);

    return matchesSearch && matchesRisk;
  });

  // 1-Click CSV Export Function (Updated with Email)
  const handleExportCSV = () => {
    if (!dashboardData.length) return;

    const headers = ['Account ID', 'Company Name', 'Contact Email', 'Health Score', 'Simulated Score', 'Risk Status', 'Signals'];
    const rows = dashboardData.map(acc => [
      acc.id,
      `"${acc.name}"`,
      `"${acc.email || ''}"`,
      acc.score,
      Math.max(0, Math.round(acc.score - (acc.score * (simulatedDrop / 100)))),
      acc.score <= settings.highRiskCutoff ? 'High Risk' : 'Medium Risk',
      `"${acc.desc.replace(/"/g, '""')}"`
    ]);

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

  // Handle Submitting Edit
  const handleUpdateAccount = (e) => {
    e.preventDefault();
    if (!editAccount.name || !editAccount.initials) return;

    fetch('http://localhost/DSIG%20Prototype/api.php', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editAccount)
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success') {
          setIsEditModalOpen(false);
          fetchAccounts();
        }
      });
  };

  // REAL GEMINI API CALL FUNCTION
  const handleDraftOutreach = async (account) => {
    setIsAiModalOpen(true);
    setIsGenerating(true);
    setAiEmailText('');
    setCopied(false);

    const negativeFactors = account.factors
      ? account.factors.filter(f => !f.isPositive).map(f => `${f.name} (${f.val})`).join(', ')
      : 'recent usage metrics drop';

    const apiKey = settings.apiKey.trim();

    if (!apiKey) {
      setAiEmailText(
        `⚠️ Missing Gemini API Key!\n\nPlease enter your Google Gemini API key in the "Settings" tab to enable live AI generation.\n\nSimulated Quick Preview:\n\nSubject: Quick sync regarding ${account.name} & HavLook\n\nHi ${account.name} team,\n\nWe noticed recent changes around ${negativeFactors}. Let's connect for 15 minutes this week to help you get maximum value from HavLook.`
      );
      setIsGenerating(false);
      return;
    }

    try {
      const prompt = `You are an expert Customer Success Manager at HavLook SaaS. Write a warm, concise, and highly effective outreach email to "${account.name}".

Context:
- Company: ${account.name}
- Contact Email: ${account.email || 'N/A'}
- Health Score: ${account.simulatedScore || account.score}/100
- Risk Signals: ${negativeFactors}

Guidelines:
1. Include an engaging Subject Line.
2. Empathetically bring up the risk factors without being robotic.
3. Offer a brief 15-minute call this week.
4. Keep it under 140 words.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();

      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        setAiEmailText(`To: ${account.email || 'No email on file'}\n\n${data.candidates[0].content.parts[0].text}`);
      } else if (data.error) {
        setAiEmailText(`⚠️ Gemini API Error:\n${data.error.message || 'Invalid API Key or quota limit reached.'}`);
      } else {
        setAiEmailText('⚠️ Unexpected response format received from Google Gemini API.');
      }
    } catch (err) {
      console.error('Gemini API Fetch Error:', err);
      setAiEmailText(`⚠️ Network Error: Unable to reach Gemini API. Details: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(aiEmailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle Deleting Account
  const handleDeleteAccount = (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;

    fetch(`http://localhost/DSIG%20Prototype/api.php?id=${id}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success') {
          fetchAccounts();
        }
      });
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
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  const urgentAccounts = simulatedAccounts.filter(a => a.simulatedScore <= settings.highRiskCutoff);

  return (
    <div className="container">
      
      {/* Header Area */}
      <header className="header flex align-center space-between">
        <div className="flex align-center">
          <a href="#" className="logo flex align-center">
            <i className="ti ti-radar-2" aria-hidden="true"></i> HavLook
          </a>
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
        </div>
        <div className="avatar" title="User Profile" style={{ cursor: 'pointer' }}>CS</div>
      </header>

      <main>
        
        {/* TAB 1: EXECUTIVE DASHBOARD VIEW */}
        {activeTab === 'Dashboard' && (
          <>
            {/* What-If Risk Simulator Bar */}
            <div style={{
              backgroundColor: 'var(--surface-2)',
              padding: '16px 20px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              gap: '20px'
            }}>
              <div>
                <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Churn Simulator {simulatedDrop > 0 && <span style={{ color: 'var(--text-danger)', fontSize: '12px' }}>(-{simulatedDrop}% Engagement)</span>}
                </strong>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
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
                <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '45px', textAlign: 'right' }}>-{simulatedDrop}%</span>
                {simulatedDrop > 0 && (
                  <button 
                    onClick={() => setSimulatedDrop(0)}
                    style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Top Metrics Grid */}
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
                  style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                  onClick={() => handleMetricClick(metric.label)}
                >
                  <span>{metric.label}</span>
                  <strong className={metric.danger ? 'text-danger' : ''}>{metric.val}</strong>
                </article>
              ))}
            </section>

            <section className="main-grid">
              {/* Left Panel: High Priority Urgent Accounts */}
              <article className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h2 className="panel-title" style={{ margin: 0 }}>Urgent Churn Threats</h2>
                    <p className="panel-subtitle">Accounts below high-risk cutoff (≤{settings.highRiskCutoff})</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('At-risk radar')}
                    style={{ background: 'transparent', border: '1px solid var(--border)', color: '#6366f1', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
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
                          backgroundColor: 'rgba(239, 68, 68, 0.05)',
                          marginBottom: '10px',
                          display: 'flex',
                          justify: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '14px', display: 'block', marginBottom: '2px' }}>{account.name}</strong>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{account.desc}</p>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="text-danger" style={{ fontWeight: 'bold', fontSize: '16px' }}>{account.simulatedScore}</span>
                          <button 
                            className="btn"
                            onClick={() => handleDraftOutreach(account)}
                            style={{ margin: 0, padding: '4px 10px', fontSize: '12px', width: 'auto' }}
                          >
                            Draft Email
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', padding: '20px 0', textAlign: 'center' }}>No urgent high-risk accounts right now!</p>
                  )}
                </div>
              </article>

              {/* Right Panel: Visual SVG Charts & Portfolio Distribution */}
              <article className="panel">
                <h2 className="panel-title">Portfolio Health & Risk Analytics</h2>
                <p className="panel-subtitle">Interactive breakdown of account health scores</p>

                {/* SVG Visual Bar Chart */}
                <div style={{ marginTop: '20px', padding: '16px', background: 'var(--surface-1)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '12px' }}>
                    Health Score Distribution (Visual Bar View)
                  </span>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '120px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                    {simulatedAccounts.map(acc => {
                      const isDanger = acc.simulatedScore <= settings.highRiskCutoff;
                      const heightPercent = Math.max(15, acc.simulatedScore);
                      return (
                        <div key={acc.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '10px', color: isDanger ? 'var(--text-danger)' : 'var(--text-warning)' }}>{acc.simulatedScore}</span>
                          <div 
                            title={`${acc.name}: ${acc.simulatedScore}`}
                            style={{ 
                              width: '100%', 
                              height: `${heightPercent}%`, 
                              backgroundColor: isDanger ? 'var(--text-danger)' : '#6366f1',
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.3s ease'
                            }}
                          />
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '35px' }}>{acc.initials}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginTop: '20px', padding: '16px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#6366f1' }}>🤖 Gemini AI + Visual Insights</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
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
            
            {/* Radar Panel */}
            <article className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 className="panel-title" style={{ margin: 0 }}>At-risk radar</h2>
              </div>

              {/* Search and Filter Row */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input 
                  type="text" 
                  placeholder="Search accounts or emails..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ 
                    flex: 1, 
                    padding: '6px 10px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--border)', 
                    background: 'var(--surface-1)', 
                    color: '#fff',
                    fontSize: '13px'
                  }}
                />
                <select 
                  value={riskFilter}
                  onChange={e => setRiskFilter(e.target.value)}
                  style={{ 
                    padding: '6px 10px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--border)', 
                    background: 'var(--surface-1)', 
                    color: '#fff',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
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
                        onClick={() => setActiveAccount(account)}
                        onMouseEnter={() => setHoveredAccountId(account.id)}
                        onMouseLeave={() => setHoveredAccountId(null)}
                        style={{ 
                          cursor: 'pointer', 
                          backgroundColor: isActive || isHovered ? 'var(--surface-1)' : 'transparent',
                          padding: '12px 10px',
                          borderRadius: '8px',
                          borderBottom: isActive ? 'none' : '1px solid var(--border)',
                          transition: 'background-color 0.2s ease',
                          margin: isActive ? '4px 0' : '0'
                        }}
                      >
                        <div className={`radar-icon ${isDanger ? 'icon-danger' : 'icon-warning'}`}>
                          {account.initials}
                        </div>
                        <div className="radar-info">
                          <p className="radar-name">{account.name}</p>
                          <p className="radar-desc">{account.desc}</p>
                        </div>
                        <div className="radar-score">
                          <span className={`score-value ${isDanger ? 'text-danger' : 'text-warning'}`}>
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
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                    No accounts match your criteria.
                  </p>
                )}
              </div>
            </article>

            {/* Diagnostics Panel */}
            <article className="panel">
              {activeAccount ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 className="panel-title" style={{ marginBottom: '4px' }}>Why flagged: {activeAccount.name}</h2>
                      {activeAccount.email && (
                        <p style={{ fontSize: '13px', color: '#6366f1', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ✉️ {activeAccount.email}
                        </p>
                      )}
                      <p className="panel-subtitle">SHAP contribution to churn risk & historical trends</p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={() => handleOpenEditModal(activeAccount)}
                        style={{ 
                          backgroundColor: 'var(--surface-1)', 
                          border: '1px solid var(--border)', 
                          color: 'var(--text-primary)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteAccount(activeAccount.id, activeAccount.name)}
                        style={{ 
                          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                          border: '1px solid var(--text-danger)', 
                          color: 'var(--text-danger)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* 30-Day Health Trajectory Line Chart Component */}
                  <TrendLineChart 
                    history={activeAccount.simulatedHistory || activeAccount.history} 
                    highRiskCutoff={settings.highRiskCutoff} 
                  />

                  {/* Dynamic SHAP Bars */}
                  {activeAccount.factors?.map((factor, index) => (
                    <div className="shap-row" key={index}>
                      <div className="shap-labels">
                        <span>{factor.name}</span>
                        <span className={factor.isPositive ? 'text-success' : 'text-danger'}>
                          {factor.val}
                        </span>
                      </div>
                      <div className="shap-track">
                        <div 
                          className={`shap-fill ${factor.isPositive ? 'fill-success' : 'fill-danger'}`} 
                          style={{ width: `${factor.percent}%`, transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        ></div>
                      </div>
                    </div>
                  ))}

                  <button 
                    className="btn" 
                    onClick={() => handleDraftOutreach(activeAccount)}
                  >
                    Draft outreach ↗
                  </button>
                </>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>Select an account to view details.</p>
              )}
            </article>
          </section>
        )}

        {/* TAB 3: ACCOUNTS DATA TABLE VIEW + CSV EXPORT */}
        {activeTab === 'Accounts' && (
          <article className="panel" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 className="panel-title" style={{ margin: 0 }}>All Managed Accounts</h2>
                <p className="panel-subtitle">Comprehensive list of accounts and health statuses</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={handleExportCSV}
                  style={{ 
                    backgroundColor: 'var(--surface-1)', 
                    border: '1px solid var(--border)', 
                    color: 'var(--text-primary)',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  📥 Export CSV
                </button>
              </div>
            </div>

            {/* Table Search & Filter */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <input 
                type="text" 
                placeholder="Search by company, email, or signal..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ 
                  flex: 1, 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: '1px solid var(--border)', 
                  background: 'var(--surface-1)', 
                  color: '#fff',
                  fontSize: '13px'
                }}
              />
              <select 
                value={riskFilter}
                onChange={e => setRiskFilter(e.target.value)}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: '1px solid var(--border)', 
                  background: 'var(--surface-1)', 
                  color: '#fff',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Risk Levels</option>
                <option value="HIGH">High Risk (≤{settings.highRiskCutoff})</option>
                <option value="MEDIUM">Medium Risk (&gt;{settings.highRiskCutoff})</option>
              </select>
            </div>

            {/* Accounts Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
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
                        <tr key={account.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 10px', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div className={`radar-icon ${isDanger ? 'icon-danger' : 'icon-warning'}`} style={{ width: '30px', height: '30px', fontSize: '11px', flexShrink: 0 }}>
                                {account.initials}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span>{account.name}</span>
                                {account.email && <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>{account.email}</span>}
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
                              backgroundColor: isDanger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: isDanger ? 'var(--text-danger)' : 'var(--text-warning)'
                            }}>
                              {isDanger ? 'High Risk' : 'Medium Risk'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{account.desc}</td>
                          <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                            <button 
                              onClick={() => { setActiveAccount(account); setActiveTab('At-risk radar'); }}
                              style={{ background: 'transparent', border: 'none', color: '#6366f1', cursor: 'pointer', marginRight: '10px', fontSize: '12px' }}
                            >
                              Radar
                            </button>
                            <button 
                              onClick={() => handleOpenEditModal(account)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', marginRight: '10px', fontSize: '12px' }}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteAccount(account.id, account.name)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-danger)', cursor: 'pointer', fontSize: '12px' }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
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
          <article className="panel" style={{ maxWidth: '650px', margin: '0 auto' }}>
            <h2 className="panel-title" style={{ marginBottom: '4px' }}>Platform Settings</h2>
            <p className="panel-subtitle" style={{ marginBottom: '24px' }}>Configure churn thresholds and Gemini LLM integration</p>

            <form onSubmit={(e) => { e.preventDefault(); openModal('Settings Saved', 'Your configuration settings have been updated successfully.'); }}>
              
              {/* High Risk Cutoff Control */}
              <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                  High Risk Threshold Score: <span style={{ color: 'var(--text-danger)' }}>{settings.highRiskCutoff}</span>
                </label>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  Accounts with a health score equal to or below this threshold will be flagged as <strong>High Risk</strong> across the radar.
                </p>
                <input 
                  type="range" min="10" max="60" 
                  value={settings.highRiskCutoff}
                  onChange={(e) => setSettings({ ...settings, highRiskCutoff: parseInt(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Gemini API Key Entry */}
              <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '6px' }}>Google Gemini API Key</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  Paste your API key from Google AI Studio to power real-time AI outreach email generation.
                </p>
                <input 
                  type="password" 
                  placeholder="AIzaSy..."
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--border)', 
                    background: 'var(--surface-1)', 
                    color: '#fff',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Alerts & Notifications */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Alert Preferences</h3>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px', fontSize: '13px' }}>
                  <input 
                    type="checkbox" 
                    checked={settings.emailAlerts}
                    onChange={(e) => setSettings({ ...settings, emailAlerts: e.target.checked })}
                  />
                  <span>Email alerts when an account enters High Risk status</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
                  <input 
                    type="checkbox" 
                    checked={settings.dailyDigest}
                    onChange={(e) => setSettings({ ...settings, dailyDigest: e.target.checked })}
                  />
                  <span>Receive daily CS digest summary email</span>
                </label>
              </div>

              <button type="submit" className="btn">Save Configuration</button>
            </form>
          </article>
        )}

      </main>

      {/* Edit Account Modal */}
      {isEditModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'var(--surface-2)', padding: '24px', borderRadius: '12px',
            width: '400px', maxWidth: '90%', border: '1px solid var(--border)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Edit Account: {editAccount.name}</h3>
            <form onSubmit={handleUpdateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Company Name</label>
                <input 
                  type="text" value={editAccount.name} required
                  onChange={e => setEditAccount({...editAccount, name: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-1)', color: '#fff', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Contact Email</label>
                <input 
                  type="email" value={editAccount.email} placeholder="client@company.com"
                  onChange={e => setEditAccount({...editAccount, email: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-1)', color: '#fff', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Initials</label>
                <input 
                  type="text" maxLength={3} value={editAccount.initials} required
                  onChange={e => setEditAccount({...editAccount, initials: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-1)', color: '#fff', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Description / Signals</label>
                <input 
                  type="text" value={editAccount.desc} required
                  onChange={e => setEditAccount({...editAccount, desc: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-1)', color: '#fff', marginTop: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="btn" style={{ width: 'auto', background: 'transparent', border: '1px solid var(--border)' }} onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn" style={{ width: 'auto' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Email Drafter Modal */}
      {isAiModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'var(--surface-2)', padding: '24px', borderRadius: '12px',
            width: '560px', maxWidth: '90%', border: '1px solid var(--border)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="ti ti-sparkles" style={{ color: '#6366f1', fontSize: '18px' }}></i>
                <h3 style={{ margin: 0, fontSize: '18px' }}>HavLook Gemini Assistant</h3>
              </div>
              <span style={{ fontSize: '12px', color: isGenerating ? '#f59e0b' : 'var(--text-success)' }}>
                {isGenerating ? 'Connecting to Gemini...' : '● Generated via Gemini API'}
              </span>
            </div>

            <div style={{
              backgroundColor: 'var(--surface-1)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '13px',
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              minHeight: '220px',
              maxHeight: '350px',
              overflowY: 'auto',
              lineHeight: '1.6'
            }}>
              {isGenerating ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>Analyzing risk factors & drafting personalized email...</p>
                </div>
              ) : (
                aiEmailText
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button 
                className="btn" 
                style={{ width: 'auto', margin: 0, background: 'transparent', border: '1px solid var(--border)' }}
                onClick={() => setIsAiModalOpen(false)}
              >
                Close
              </button>
              <button 
                className="btn" 
                style={{ width: 'auto', margin: 0 }}
                disabled={isGenerating || !settings.apiKey}
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
          backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'var(--surface-2)', padding: '24px', borderRadius: '12px',
            width: '400px', maxWidth: '90%', border: '1px solid var(--border)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px', fontWeight: 600 }}>{modalConfig.title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', whiteSpace: 'pre-wrap', marginBottom: '24px', lineHeight: 1.5 }}>{modalConfig.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={closeModal} style={{ width: 'auto', marginTop: 0, padding: '8px 20px' }}>Got it</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}