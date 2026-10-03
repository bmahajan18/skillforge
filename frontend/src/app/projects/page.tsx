'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { getProjects, createProject, Project } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { FolderPlus, FileCode, Plus } from 'lucide-react';

export default function ProjectsPage() {
  const { user, token, openAuthModal } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // New Project Modal State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState('go-microservice');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (token) {
      loadProjects(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadProjects = (jwt: string) => {
    setLoading(true);
    getProjects(jwt)
      .then((data) => {
        setProjects(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      openAuthModal();
      return;
    }
    if (!name) return;
    setCreating(true);

    try {
      const newProj = await createProject(token, name, description, template);
      setProjects([newProj, ...projects]);
      setShowModal(false);
      setName('');
      setDescription('');
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main style={{ flex: 1, maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderPlus color="var(--accent-cyan)" /> My Projects
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Create multi-file systems, microservices, and custom challenge repositories.
            </p>
          </div>

          <button
            onClick={() => {
              if (!token) openAuthModal();
              else setShowModal(true);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', background: 'var(--accent-primary)',
              color: '#ffffff', border: 'none', borderRadius: '6px',
              fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer'
            }}
          >
            <Plus size={16} /> New Project
          </button>
        </div>

        {/* Projects List */}
        {!user ? (
          <div className="clean-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <FolderPlus size={36} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Sign in to view your projects</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Authenticate your account to create and manage multi-file repositories.
            </p>
            <button
              onClick={openAuthModal}
              style={{
                padding: '8px 16px', background: 'var(--accent-primary)',
                color: '#ffffff', border: 'none', borderRadius: '6px',
                fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer'
              }}
            >
              Sign In / Register
            </button>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading project repositories...
          </div>
        ) : projects.length === 0 ? (
          <div className="clean-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <FolderPlus size={36} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No projects created yet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Click "New Project" to start building your first multi-file workspace.
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                padding: '8px 16px', background: 'var(--accent-primary)',
                color: '#ffffff', border: 'none', borderRadius: '6px',
                fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer'
              }}
            >
              Create First Project
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {projects.map((proj) => (
              <div key={proj.id} className="clean-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{proj.name}</h3>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    {proj.template}
                  </span>
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', minHeight: '40px', lineHeight: 1.5 }}>
                  {proj.description || 'No description provided.'}
                </p>

                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileCode size={14} /> {proj.files?.length || 0} files
                  </span>
                  <span>{new Date(proj.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="clean-panel" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 700 }}>Create New Project</h2>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. distributed-kv-store"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-heading)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Description</label>
                <textarea
                  placeholder="Short summary of architecture..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-heading)', outline: 'none', height: '70px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Template</label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-heading)', outline: 'none' }}
                >
                  <option value="go-microservice">Go Microservice Starter</option>
                  <option value="python-api">Python FastAPI / Flask Template</option>
                  <option value="react-app">React / TypeScript Component Hub</option>
                  <option value="rust-cli">Rust System Tool Starter</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{ padding: '8px 16px', background: 'var(--accent-primary)', border: 'none', color: '#ffffff', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
