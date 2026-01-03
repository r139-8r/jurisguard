'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, Clock, FileCheck, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AuthForm from '@/components/AuthForm';
import DocumentUpload from '@/components/DocumentUpload';
import RiskDashboard from '@/components/RiskDashboard';
import ChatPanel from '@/components/ChatPanel';
import DocumentHistory from '@/components/DocumentHistory';
import SettingsPanel from '@/components/SettingsPanel';
import ExportButton from '@/components/ExportButton';
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

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 }
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [documentText, setDocumentText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      // Get the current session to include the access token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert('Please sign in again to continue.');
        setAnalyzing(false);
        return;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          documentText: text,
          fileName: file.name,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        alert(data.error || 'Analysis failed. Please try again.');
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
        <motion.div
          className="breath-animation"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      </div>
    );
  }

  // Not logged in - show landing + auth
  if (!user) {
    return (
      <>
        {/* Animated Background */}
        <div className="animated-bg">
          <motion.div
            className="floating-shape floating-shape-1"
            animate={{
              x: [0, 30, -20, 0],
              y: [0, -30, 20, 0],
              scale: [1, 1.05, 0.95, 1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="floating-shape floating-shape-2"
            animate={{
              x: [0, -30, 20, 0],
              y: [0, 20, -30, 0],
              scale: [1, 0.95, 1.05, 1]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="floating-shape floating-shape-3"
            animate={{
              x: [0, 20, -20, 0],
              y: [0, -20, 20, 0],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.header
          className="main-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="logo"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            Juris<span>Guard</span>
          </motion.div>
        </motion.header>

        <main>
          <motion.div
            className="hero"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.h1 variants={fadeInUp} transition={{ duration: 0.6 }}>
              Legal Protection <span>Made Simple</span>
            </motion.h1>
            <motion.p variants={fadeInUp} transition={{ duration: 0.6 }}>
              Upload a contract, get a safety score and fix-list in 30 seconds.
              No legal expertise required.
            </motion.p>

            {/* Feature Cards */}
            <motion.div
              className="features-grid"
              variants={staggerContainer}
            >
              <motion.div
                className="feature-card"
                variants={scaleIn}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
              >
                <div className="feature-icon">
                  <Clock size={24} />
                </div>
                <h3>30-Second Analysis</h3>
                <p>AI-powered risk assessment that works faster than your morning coffee</p>
              </motion.div>

              <motion.div
                className="feature-card"
                variants={scaleIn}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
              >
                <div className="feature-icon">
                  <Shield size={24} />
                </div>
                <h3>Risk Protection</h3>
                <p>Identify hidden clauses and potential liabilities before you sign</p>
              </motion.div>

              <motion.div
                className="feature-card"
                variants={scaleIn}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
              >
                <div className="feature-icon">
                  <Sparkles size={24} />
                </div>
                <h3>AI-Powered Suggestions</h3>
                <p>Get actionable recommendations to negotiate better terms</p>
              </motion.div>
            </motion.div>
          </motion.div>

          <AuthForm onSuccess={() => { }} />
        </main>
      </>
    );
  }

  // Logged in
  return (
    <>
      {/* Animated Background */}
      <div className="animated-bg">
        <motion.div
          className="floating-shape floating-shape-1"
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -30, 20, 0],
            scale: [1, 1.05, 0.95, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="floating-shape floating-shape-2"
          animate={{
            x: [0, -30, 20, 0],
            y: [0, 20, -30, 0],
            scale: [1, 0.95, 1.05, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.header
        className="main-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="logo"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          Juris<span>Guard</span>
        </motion.div>
        <div className="user-menu">
          <motion.button
            onClick={() => setSettingsOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
            }}
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            title="Settings"
          >
            <Settings size={20} />
          </motion.button>
          <span className="user-email">{user.email}</span>
          <motion.button
            className="logout-btn"
            onClick={handleLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Sign out
          </motion.button>
        </div>
      </motion.header>

      <main className="main-content">
        <AnimatePresence mode="wait">
          {!analysis ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="hero"
                style={{ padding: '40px 20px' }}
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <motion.h1 variants={fadeInUp}>
                  Analyze Your <span>Contract</span>
                </motion.h1>
                <motion.p variants={fadeInUp}>
                  Drop your document below for instant risk assessment
                </motion.p>
              </motion.div>
              <DocumentUpload onUpload={handleUpload} isLoading={analyzing} />

              {/* Document History */}
              {user && (
                <DocumentHistory
                  userId={user.id}
                  onSelectDocument={(savedAnalysis, savedFileName) => {
                    setAnalysis(savedAnalysis as Analysis);
                    setFileName(savedFileName);
                  }}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <RiskDashboard
                analysis={analysis}
                fileName={fileName}
                onNewUpload={handleNewUpload}
              />

              {/* Export Button */}
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
                <ExportButton
                  originalText={documentText}
                  flaggedClauses={analysis.flagged_clauses}
                  fileName={fileName}
                  riskScore={analysis.risk_score}
                  riskLevel={analysis.risk_level}
                />
              </div>

              <ChatPanel
                documentText={documentText}
                analysisJson={JSON.stringify(analysis)}
                isOpen={chatOpen}
                onToggle={() => setChatOpen(!chatOpen)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Settings Panel */}
      <SettingsPanel
        userId={user.id}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
