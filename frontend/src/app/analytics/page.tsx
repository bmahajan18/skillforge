'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { getAnalytics, AnalyticsStats } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { BarChart2, CheckCircle2, Clock, Zap, Target, LogIn } from 'lucide-react';

export default function AnalyticsPage() {
  const { user, token, openAuthModal } = useAuth();
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadAnalytics(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadAnalytics = (jwt: string) => {
    setLoading(true);
    getAnalytics(jwt)
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main style={{ flex: 1, maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 color="var(--accent-green)" /> Submission Analytics & Velocity
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Track your solution pass rate, execution latency, difficulty distribution, and programming language frequency.
          </p>
        </div>

        {!user ? (
          <div className="clean-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <BarChart2 size={36} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Sign in to view submission analytics</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Authenticate your account to visualize pass rates and container execution metrics.
            </p>
            <button
              onClick={openAuthModal}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', background: 'var(--accent-primary)',
                color: '#ffffff', border: 'none', borderRadius: '6px',
                fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer'
              }}
            >
              <LogIn size={15} /> Sign In / Register
            </button>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Calculating performance metrics...
          </div>
        ) : !stats ? (
          <div className="clean-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No analytics available yet. Solve a problem to generate telemetry.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              
              <div className="clean-card" style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accuracy Rate</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                    {stats.accuracy_rate.toFixed(1)}%
                  </h2>
                  <Target size={24} color="var(--accent-green)" />
                </div>
              </div>

              <div className="clean-card" style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Submissions</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    {stats.total_submissions}
                  </h2>
                  <Zap size={24} color="var(--accent-primary)" />
                </div>
              </div>

              <div className="clean-card" style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Passed Solutions</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3fb950' }}>
                    {stats.passed_count}
                  </h2>
                  <CheckCircle2 size={24} color="#3fb950" />
                </div>
              </div>

              <div className="clean-card" style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Execution Latency</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {stats.avg_execution_ms.toFixed(0)} ms
                  </h2>
                  <Clock size={24} color="var(--accent-cyan)" />
                </div>
              </div>

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              
              <div className="clean-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Problems Solved by Difficulty</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                      <span style={{ color: '#3fb950', fontWeight: 600 }}>Easy</span>
                      <span>{stats.difficulty_counts['EASY'] || 0} solved</span>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ background: '#3fb950', height: '100%', width: `${Math.min(100, ((stats.difficulty_counts['EASY'] || 0) / 5) * 100)}%` }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                      <span style={{ color: '#d29922', fontWeight: 600 }}>Medium</span>
                      <span>{stats.difficulty_counts['MEDIUM'] || 0} solved</span>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ background: '#d29922', height: '100%', width: `${Math.min(100, ((stats.difficulty_counts['MEDIUM'] || 0) / 5) * 100)}%` }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                      <span style={{ color: '#f85149', fontWeight: 600 }}>Hard</span>
                      <span>{stats.difficulty_counts['HARD'] || 0} solved</span>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ background: '#f85149', height: '100%', width: `${Math.min(100, ((stats.difficulty_counts['HARD'] || 0) / 5) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="clean-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Submissions by Language</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Object.keys(stats.language_counts).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No submission language data recorded yet.</p>
                  ) : (
                    Object.entries(stats.language_counts).map(([lang, count]) => (
                      <div key={lang} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--bg-surface)', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{lang}</span>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{count} submissions</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
