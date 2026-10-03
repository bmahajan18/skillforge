'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import { getProblemBySlug, submitCode, Problem, SupportedLanguage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { SkillForgeSocket } from '@/lib/ws';
import Editor from '@monaco-editor/react';
import { Play, CheckCircle2, XCircle, Clock, Cpu, Sparkles, FileText, Code2 } from 'lucide-react';

const LANGUAGE_LABELS: Record<SupportedLanguage, { label: string; monacoMode: string }> = {
  python: { label: 'Python 3.11', monacoMode: 'python' },
  javascript: { label: 'Node.js 20', monacoMode: 'javascript' },
  cpp: { label: 'C++ 20 (GCC 13)', monacoMode: 'cpp' },
  c: { label: 'C (GCC 13)', monacoMode: 'c' },
  java: { label: 'Java 21 (OpenJDK)', monacoMode: 'java' },
  go: { label: 'Go 1.22', monacoMode: 'go' },
  rust: { label: 'Rust 1.75', monacoMode: 'rust' },
};

export default function ProblemDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { user, token, openAuthModal } = useAuth();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [code, setCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'description' | 'output' | 'ai'>('description');

  // Execution & WS State
  const [submitting, setSubmitting] = useState(false);
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<any>(null);
  const [aiFeedback, setAiFeedback] = useState<any>(null);

  useEffect(() => {
    if (slug) {
      getProblemBySlug(slug).then((p) => {
        setProblem(p);
        setCode(p.starter_code[language] || '');
      });
    }
  }, [slug]);

  useEffect(() => {
    if (!token) return;

    const socket = new SkillForgeSocket(token);
    const unsubscribe = socket.subscribe((msg) => {
      if (msg.type === 'STATUS_UPDATE') {
        const payload = msg.payload;
        setSubStatus(payload.status);

        if (payload.result) {
          setExecResult(payload.result);
          setSubmitting(false);
          setActiveTab('output');
        }

        if (payload.ai_feedback) {
          setAiFeedback(payload.ai_feedback);
        }
      }
    });

    return () => {
      unsubscribe();
      socket.close();
    };
  }, [token]);

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    if (problem) {
      setCode(problem.starter_code[newLang] || `// Code in ${newLang}\n`);
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      openAuthModal();
      return;
    }
    if (!problem) return;
    setSubmitting(true);
    setSubStatus('QUEUED');
    setExecResult(null);
    setAiFeedback(null);
    setActiveTab('output');

    try {
      await submitCode(token, problem.id, language, code);
    } catch (err: any) {
      setSubStatus('ERROR');
      setExecResult({ error_message: err.message || 'Submission failed' });
      setSubmitting(false);
    }
  };

  if (!problem) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading problem workspace...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Header />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', height: 'calc(100vh - 65px)', overflow: 'hidden' }}>
        
        {/* Left Pane: Description & Tabs */}
        <div style={{ borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', background: 'rgba(10, 13, 20, 0.5)', borderBottom: '1px solid var(--border-color)', padding: '0.5rem 1rem', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('description')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '8px', border: 'none',
                background: activeTab === 'description' ? 'var(--bg-card)' : 'transparent',
                color: activeTab === 'description' ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              <FileText size={15} /> Problem Statement
            </button>
            <button
              onClick={() => setActiveTab('output')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '8px', border: 'none',
                background: activeTab === 'output' ? 'var(--bg-card)' : 'transparent',
                color: activeTab === 'output' ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              <Cpu size={15} /> Test Results {subStatus && `(${subStatus})`}
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '8px', border: 'none',
                background: activeTab === 'ai' ? 'var(--bg-card)' : 'transparent',
                color: activeTab === 'ai' ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              <Sparkles size={15} color="#a855f7" /> AI Review {aiFeedback && '✓'}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {activeTab === 'description' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <span className={`badge badge-${problem.difficulty.toLowerCase()}`}>
                    {problem.difficulty}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{problem.category}</span>
                </div>

                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.25rem' }}>{problem.title}</h1>

                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  {problem.description}
                </div>
              </div>
            )}

            {activeTab === 'output' && (
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 700 }}>Execution Results</h3>

                {subStatus ? (
                  <div style={{
                    padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem',
                    background: subStatus === 'PASSED' ? 'rgba(16, 185, 129, 0.12)' : subStatus === 'RUNNING' || subStatus === 'QUEUED' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                    border: `1px solid ${subStatus === 'PASSED' ? '#10b981' : subStatus === 'RUNNING' || subStatus === 'QUEUED' ? '#f59e0b' : '#f43f5e'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {subStatus === 'PASSED' && <CheckCircle2 color="#10b981" />}
                      {subStatus === 'FAILED' && <XCircle color="#f43f5e" />}
                      {(subStatus === 'QUEUED' || subStatus === 'RUNNING') && <Clock color="#f59e0b" className="pulse-active" />}
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                        {subStatus === 'QUEUED' && 'Job Queued in RabbitMQ...'}
                        {subStatus === 'RUNNING' && `Executing ${LANGUAGE_LABELS[language].label} in K8s...`}
                        {subStatus === 'PASSED' && 'All Test Cases Passed!'}
                        {subStatus === 'FAILED' && 'Test Suite Failed'}
                        {subStatus === 'TIME_LIMIT_EXCEEDED' && 'Time Limit Exceeded (5s Cap)'}
                      </span>
                    </div>

                    {execResult && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {execResult.execution_time_ms}ms execution
                      </span>
                    )}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>Select your language and click "Run & Submit".</p>
                )}

                {execResult && (
                  <div>
                    {execResult.passed_count !== undefined && (
                      <div style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: 600 }}>
                        Test Cases Passed: <span style={{ color: '#10b981' }}>{execResult.passed_count}</span> / {execResult.total_count}
                      </div>
                    )}

                    {execResult.error_message && (
                      <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #f43f5e', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#f87171', marginBottom: '1rem' }}>
                        {execResult.error_message}
                      </div>
                    )}

                    {execResult.output && (
                      <div>
                        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>STDOUT Logs</h4>
                        <pre style={{ background: '#000000', padding: '1rem', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', overflowX: 'auto', color: '#34d399' }}>
                          {execResult.output}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ai' && (
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles color="#a855f7" /> Claude AI Code Review
                </h3>

                {aiFeedback ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="glass-card" style={{ padding: '1rem' }}>
                      <h4 style={{ color: '#60a5fa', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Code Quality</h4>
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{aiFeedback.code_quality_notes}</p>
                    </div>

                    <div className="glass-card" style={{ padding: '1rem' }}>
                      <h4 style={{ color: '#a855f7', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Complexity Observations</h4>
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{aiFeedback.complexity_notes}</p>
                    </div>

                    <div className="glass-card" style={{ padding: '1rem' }}>
                      <h4 style={{ color: '#34d399', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Suggested Improvements</h4>
                      <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {aiFeedback.suggestions?.map((item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Submit your solution to receive instant AI code critique notes.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Code Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
          <div style={{ padding: '0.5rem 1rem', background: 'rgba(10, 13, 20, 0.7)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Code2 size={16} color="var(--accent-indigo)" />
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as any)}
                style={{
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  fontWeight: 600
                }}
              >
                {Object.entries(LANGUAGE_LABELS).map(([langKey, cfg]) => (
                  <option key={langKey} value={langKey}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 20px', borderRadius: '8px', border: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                color: '#ffffff', fontWeight: 700, fontSize: '0.9rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)',
                opacity: submitting ? 0.7 : 1
              }}
            >
              <Play size={15} fill="#ffffff" /> {submitting ? 'Running in K8s...' : 'Run & Submit'}
            </button>
          </div>

          <div style={{ flex: 1 }}>
            <Editor
              height="100%"
              language={LANGUAGE_LABELS[language].monacoMode}
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                fontSize: 14,
                fontFamily: 'var(--font-mono)',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 }
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
