'use client';

import React, { useEffect, useState } from 'react';
import { X, LogOut, CheckCircle2, Award, Terminal, Code2, Clock, ChevronRight, Copy, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, UserProfileRecord, UserSubmissionDetail } from '@/lib/api';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const { token, logout } = useAuth();
  const [profileData, setProfileData] = useState<UserProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<UserSubmissionDetail | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && token) {
      setLoading(true);
      getUserProfile(token)
        .then((data) => {
          setProfileData(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 110,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      justifyContent: 'flex-end',
      transition: 'opacity 0.2s ease-in-out'
    }}>
      {/* Click outside to close */}
      <div style={{ flex: 1 }} onClick={onClose} />

      {/* Drawer Container */}
      <div className="clean-panel" style={{
        width: '100%',
        maxWidth: '560px',
        height: '100vh',
        borderRadius: 0,
        borderLeft: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card)'
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-heading)' }}>
            <Award color="var(--accent-primary)" size={20} /> User Profile & Records
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Loading user profile records...
            </div>
          ) : profileData ? (
            <div>
              {/* User Bio Card */}
              <div style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <img
                    src={profileData.user.avatar_url || 'https://github.com/identicons/user.png'}
                    alt="Avatar"
                    style={{ width: '52px', height: '52px', borderRadius: '50%', border: '2px solid var(--accent-primary)' }}
                  />
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
                      {profileData.user.username}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                      {profileData.user.email}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Joined {new Date(profileData.user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid rgba(248, 81, 73, 0.4)',
                    background: 'rgba(248, 81, 73, 0.1)',
                    color: '#f85149',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div className="clean-card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3fb950' }}>
                    {profileData.solved_count}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>
                    Questions Solved
                  </div>
                </div>

                <div className="clean-card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#58a6ff' }}>
                    {profileData.total_submissions}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>
                    Submissions
                  </div>
                </div>

                <div className="clean-card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#bc8cff' }}>
                    {profileData.accuracy_rate.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>
                    Accuracy
                  </div>
                </div>
              </div>

              {/* Submission History List */}
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-heading)' }}>
                Submitted Code History
              </h4>

              {!profileData.submissions || profileData.submissions.length === 0 ? (
                <div style={{
                  padding: '2.5rem',
                  textAlign: 'center',
                  background: 'var(--bg-primary)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem'
                }}>
                  No code submissions yet. Pick a problem and submit code to see your records here!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {profileData.submissions.map((sub) => {
                    const isPassed = sub.status === 'PASSED';
                    return (
                      <div
                        key={sub.id}
                        className="clean-card"
                        style={{
                          padding: '1rem',
                          borderLeft: `4px solid ${isPassed ? '#3fb950' : '#f85149'}`,
                          cursor: 'pointer'
                        }}
                        onClick={() => setSelectedSubmission(sub)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                          <div>
                            <span className={`badge badge-${sub.problem_difficulty.toLowerCase()}`} style={{ marginRight: '8px' }}>
                              {sub.problem_difficulty}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-heading)' }}>
                              {sub.problem_title}
                            </span>
                          </div>

                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: isPassed ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)',
                            color: isPassed ? '#3fb950' : '#f85149'
                          }}>
                            {sub.status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>
                            {sub.language.toUpperCase()} • {sub.execution_time_ms}ms
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                            View Code <ChevronRight size={14} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>Failed to load profile.</div>
          )}
        </div>
      </div>

      {/* Code Inspector Sub-Modal */}
      {selectedSubmission && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 120,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="clean-panel" style={{
            width: '100%',
            maxWidth: '750px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-card)'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Code2 size={18} color="var(--accent-primary)" /> {selectedSubmission.problem_title} Code Record
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Language: {selectedSubmission.language.toUpperCase()} • Submitted at {new Date(selectedSubmission.created_at).toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => handleCopyCode(selectedSubmission.code)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.8rem', cursor: 'pointer'
                  }}
                >
                  {copied ? <Check size={14} color="#3fb950" /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', background: '#0d1117' }}>
              <pre style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
                color: '#e6edf3',
                lineHeight: 1.6,
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {selectedSubmission.code}
              </pre>

              {selectedSubmission.output && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                    STDOUT Output
                  </h4>
                  <pre style={{ background: '#000000', padding: '0.75rem', borderRadius: '6px', color: '#3fb950', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                    {selectedSubmission.output}
                  </pre>
                </div>
              )}

              {selectedSubmission.error_message && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: '#f85149', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                    Error Output
                  </h4>
                  <pre style={{ background: 'rgba(248, 81, 73, 0.1)', borderLeft: '3px solid #f85149', padding: '0.75rem', borderRadius: '6px', color: '#f85149', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                    {selectedSubmission.error_message}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
