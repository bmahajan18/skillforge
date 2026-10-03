'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { getProblems, Problem } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Search, ArrowRight, Zap, ShieldCheck, Server } from 'lucide-react';

export default function HomePage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<string>('ALL');
  const { user } = useAuth();

  useEffect(() => {
    getProblems()
      .then((data) => {
        setProblems(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filtered = problems.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    const matchesDiff = difficulty === 'ALL' || p.difficulty === difficulty;
    return matchesSearch && matchesDiff;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main style={{ flex: 1, maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
        {/* Hero Section */}
        <section style={{
          marginBottom: '2.5rem',
          padding: '2.5rem 2rem',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            color: 'var(--accent-cyan)',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginBottom: '1rem'
          }}>
            <Zap size={14} /> Next-Gen Coding Platform
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.75rem', color: 'var(--text-heading)' }}>
            Master Algorithms & Ace Tech Interviews
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            Solve coding problems with real-time code execution, instant test-case feedback, and AI analysis.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><ShieldCheck size={14} color="#3fb950" /> 7 Languages Supported</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Server size={14} color="#38bdf8" /> Instant Real-Time Execution</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Zap size={14} color="#d29922" /> AI Code Feedback & Scoring</span>
          </div>
        </section>

        {/* Filter Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search problems by title or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 1rem 0.6rem 2.4rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-heading)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-card)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: difficulty === level ? 'var(--accent-primary)' : 'transparent',
                  color: difficulty === level ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Problem List Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            Loading problem catalog...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {filtered.map((problem) => (
              <Link key={problem.id} href={`/problems/${problem.slug}`} style={{ textDecoration: 'none' }}>
                <div className="clean-card" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className={`badge badge-${problem.difficulty.toLowerCase()}`}>
                        {problem.difficulty}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {problem.category}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', color: 'var(--text-heading)', marginBottom: '0.4rem', fontWeight: 600 }}>
                      {problem.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Python • JS • C++ • C • Java • Go • Rust
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.8rem' }}>
                      Solve <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
