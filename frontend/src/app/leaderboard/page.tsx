'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { getLeaderboard, LeaderboardUser } from '@/lib/api';
import { Trophy, Medal, Award, Flame, RefreshCw } from 'lucide-react';

export default function LeaderboardPage() {
  const [rankings, setRankings] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    getLeaderboard()
      .then((data) => {
        setRankings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main style={{ flex: 1, maxWidth: '900px', margin: '0 auto', padding: '2.5rem 1.5rem', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Trophy color="#f59e0b" /> Global Leaderboard
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Powered by Redis Sorted Sets (O(log N) fast rankings) & live WebSocket broadcasts.
            </p>
          </div>

          <button
            onClick={loadData}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-color)',
              background: 'var(--bg-glass)', color: 'var(--text-primary)',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
            }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading live leaderboard...
          </div>
        ) : (
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rank</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Engineer</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Score Points</th>
                </tr>
              </thead>
              <tbody>
                {rankings.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No submissions scored yet. Be the first to solve a problem!
                    </td>
                  </tr>
                ) : (
                  rankings.map((entry) => (
                    <tr key={entry.username} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>
                        {entry.rank === 1 && <span style={{ fontSize: '1.2rem' }}>🥇</span>}
                        {entry.rank === 2 && <span style={{ fontSize: '1.2rem' }}>🥈</span>}
                        {entry.rank === 3 && <span style={{ fontSize: '1.2rem' }}>🥉</span>}
                        {entry.rank > 3 && <span style={{ color: 'var(--text-muted)' }}>#{entry.rank}</span>}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={`https://github.com/identicons/${entry.username}.png`}
                            alt="Avatar"
                            style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                          />
                          <span>{entry.username}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 800, textAlign: 'right', color: 'var(--accent-indigo)' }}>
                        {entry.score} pts
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
