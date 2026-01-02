'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AuthForm from '@/components/AuthForm';
import DocumentUpload from '@/components/DocumentUpload';
import RiskDashboard from '@/components/RiskDashboard';
import ChatPanel from '@/components/ChatPanel';
import type { User } from '@supabase/supabase-js';

interface Analysis {
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  summary: string;
  flagged_clauses: {
    id: string;
    type: string;
    original_text: string;
    risk_rating: 'Low' | 'Medium' | 'High';
    explanation: string;
    suggested_edit: string;
  }[];
  route_used?: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [documentText, setDocumentText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpload = async (file: File, text: string) => {
    setFileName(file.name);
    setDocumentText(text);
    setAnalyzing(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: text,
          userId: user?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        alert('Analysis failed. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAnalysis(null);
    setDocumentText('');
    setFileName('');
  };

  const handleNewUpload = () => {
    setAnalysis(null);
    setDocumentText('');
    setFileName('');
    setChatOpen(false);
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div className="breath-animation"></div>
      </div>
    );
  }

  // Not logged in - show landing + auth
  if (!user) {
    return (
      <>
        <header className="main-header">
          <div className="logo">Juris<span>Guard</span></div>
        </header>
        <main>
          <div className="hero">
            <h1>Legal Protection Made Simple</h1>
            <p>
              Upload a contract, get a safety score and fix-list in 30 seconds.
              No legal expertise required.
            </p>
          </div>
          <AuthForm onSuccess={() => { }} />
        </main>
      </>
    );
  }

  // Logged in
  return (
    <>
      <header className="main-header">
        <div className="logo">Juris<span>Guard</span></div>
        <div className="user-menu">
          <span className="user-email">{user.email}</span>
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="main-content">
        {!analysis ? (
          <>
            <div className="hero" style={{ padding: '40px 20px' }}>
              <h1>Analyze Your Contract</h1>
              <p>Drop your document below for instant risk assessment</p>
            </div>
            <DocumentUpload onUpload={handleUpload} isLoading={analyzing} />
          </>
        ) : (
          <>
            <RiskDashboard
              analysis={analysis}
              fileName={fileName}
              onNewUpload={handleNewUpload}
            />
            <ChatPanel
              documentText={documentText}
              analysisJson={JSON.stringify(analysis)}
              isOpen={chatOpen}
              onToggle={() => setChatOpen(!chatOpen)}
            />
          </>
        )}
      </main>
    </>
  );
}
