import React from 'react';
import Header from '@/components/Header';
import { Cpu, Server, ShieldCheck, Layers, GitBranch, Terminal, HardDrive, Network } from 'lucide-react';

export default function ArchitecturePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main style={{ flex: 1, maxWidth: '1000px', margin: '0 auto', padding: '2.5rem 1.5rem', width: '100%' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu color="#06b6d4" /> Production Infrastructure Specifications
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            SkillForge is designed around load-bearing Kubernetes orchestration, ephemeral container sandboxing, queue backpressure handling, and horizontal Redis Pub/Sub WebSocket scaling.
          </p>
        </div>

        {/* Spec Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '1.5rem' }}>
          
          {/* K8s Job Sandbox */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <Server color="#6366f1" size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Kubernetes Ephemeral Jobs (`batch/v1 Job`)</h3>
            </div>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              <li><strong>Isolation</strong>: One `batch/v1 Job` per code submission (no shared pod state).</li>
              <li><strong>Hard Resource Limits</strong>: 500m CPU limit, 128MB Memory cap via cgroups.</li>
              <li><strong>Watchdog Timeout</strong>: `ActiveDeadlineSeconds: 5` kills infinite loops at the K8s layer.</li>
              <li><strong>Security Context</strong>: Non-root user execution, read-only root FS, disabled networking.</li>
            </ul>
          </div>

          {/* Redis Pub/Sub WebSocket Bridge */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <Network color="#06b6d4" size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Redis Pub/Sub Cross-Pod WS Relay</h3>
            </div>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              <li><strong>Multi-Pod Routing</strong>: Solves cross-pod socket dispatch when API Gateway is horizontally scaled.</li>
              <li><strong>Redis Channel</strong>: `submission_updates` channel broadcasts status transitions.</li>
              <li><strong>Leaderboard</strong>: O(log N) fast rankings using Redis Sorted Sets (`ZADD`, `ZREVRANGE`).</li>
            </ul>
          </div>

          {/* RabbitMQ Queue Pipeline */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <Layers color="#f59e0b" size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>RabbitMQ Queue & HPA Scaling</h3>
            </div>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              <li><strong>Queue Backpressure</strong>: Ingests sudden burst traffic without crashing execution workers.</li>
              <li><strong>QoS Prefetch</strong>: Worker pulls 1 job at a time per pod to guarantee CPU fairness.</li>
              <li><strong>Autoscaling</strong>: Queue depth metrics directly drive K8s Horizontal Pod Autoscaler.</li>
            </ul>
          </div>

          {/* Terraform & Observability */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <ShieldCheck color="#10b981" size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Terraform IAC & Prometheus Observability</h3>
            </div>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              <li><strong>Terraform Modules</strong>: Provisioning AWS EKS, RDS PostgreSQL, and ElastiCache Redis.</li>
              <li><strong>Prometheus Metrics</strong>: Exporting active WS client gauges, queue latency histograms, and container OOM counters.</li>
            </ul>
          </div>

        </div>
      </main>
    </div>
  );
}
