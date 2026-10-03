'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Terminal, Trophy, Code2, FolderPlus, Sparkles, BarChart2, LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AuthModal from './AuthModal';
import ProfileDrawer from './ProfileDrawer';

interface HeaderProps {
  isConnected?: boolean;
}

export default function Header({ isConnected = true }: HeaderProps) {
  const { user, logout, openAuthModal, isAuthModalOpen, closeAuthModal } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand Logo */}
        <Link
          href="/"
          title="Return to Home"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.66rem',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, #1f6feb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(31, 111, 235, 0.25)',
            transition: 'transform 0.15s ease'
          }}>
            <Terminal size={19} color="#ffffff" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              SkillForge
            </span>
          </div>
        </Link>

        {/* Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link href="/" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Code2 size={15} color="var(--accent-primary)" /> Problems
          </Link>
          <Link href="/projects" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <FolderPlus size={15} color="var(--accent-cyan)" /> Projects
          </Link>
          <Link href="/ai-feedback" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={15} color="var(--accent-purple)" /> AI Review
          </Link>
          <Link href="/analytics" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <BarChart2 size={15} color="var(--accent-green)" /> Analytics
          </Link>
          <Link href="/leaderboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Trophy size={15} color="var(--accent-amber)" /> Leaderboard
          </Link>
        </nav>

        {/* Auth / User Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px',
            background: 'var(--bg-surface)',
            borderRadius: '12px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isConnected ? '#3fb950' : '#f85149'
            }} />
            {isConnected ? 'K8s Engine Live' : 'Offline'}
          </div>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setIsProfileOpen(true)}
                title="View Profile & Submissions Record"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '4px 12px 4px 4px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  color: 'inherit'
                }}
              >
                <img
                  src={user.avatar_url || 'https://github.com/identicons/user.png'}
                  alt="Avatar"
                  style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                />
                <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-heading)' }}>{user.username}</span>
              </button>

              <button
                onClick={logout}
                title="Sign out"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: 'var(--accent-primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <LogIn size={15} /> Sign In
            </button>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
      />

      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
}
