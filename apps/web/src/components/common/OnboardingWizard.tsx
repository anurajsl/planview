import { useState } from 'react';
import { projectsApi, featuresApi, storiesApi } from '../../api/client';
import { useToastStore } from '../../stores/toast.store';

interface OnboardingWizardProps {
  userName: string;
  onComplete: (projectId: string) => void;
  onSkip: () => void;
}

const SAMPLE_FEATURES = [
  { name: 'Planning & Design', color: '#6366f1' },
  { name: 'Development', color: '#3b82f6' },
  { name: 'Testing & QA', color: '#22c55e' },
];

const d = (offset: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString().split('T')[0];
};

export default function OnboardingWizard({ userName, onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [projectName, setProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const toast = useToastStore();

  const handleCreateSample = async () => {
    setCreating(true);
    try {
      const project = await projectsApi.create({
        name: projectName || 'My First Project',
        description: 'Created during onboarding',
      });

      // Create sample features
      const features = [];
      for (const f of SAMPLE_FEATURES) {
        const feat = await featuresApi.create({ projectId: project.id, name: f.name, color: f.color });
        features.push(feat);
      }

      // Create sample stories
      const sampleStories = [
        { featureId: features[0].id, name: 'Define project requirements', startDate: d(0), endDate: d(3), status: 'active' },
        { featureId: features[0].id, name: 'Create wireframes', startDate: d(2), endDate: d(6), status: 'planned' },
        { featureId: features[1].id, name: 'Set up development environment', startDate: d(1), endDate: d(2), status: 'active' },
        { featureId: features[1].id, name: 'Build core features', startDate: d(4), endDate: d(14), status: 'planned' },
        { featureId: features[2].id, name: 'Write test cases', startDate: d(10), endDate: d(16), status: 'planned' },
      ];

      for (const s of sampleStories) {
        await storiesApi.create({ projectId: project.id, ...s });
      }

      toast.success('Sample project created!');
      onComplete(project.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message?.[0] || 'Failed to create project');
    }
    setCreating(false);
  };

  const handleCreateEmpty = async () => {
    setCreating(true);
    try {
      const project = await projectsApi.create({
        name: projectName || 'My First Project',
      });
      toast.success('Project created!');
      onComplete(project.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message?.[0] || 'Failed to create project');
    }
    setCreating(false);
  };

  const steps = [
    // Step 0: Welcome
    <div key="welcome" style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>
        Welcome, {userName}!
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 32px', maxWidth: 400, marginInline: 'auto' }}>
        PlanView helps you manage projects with a beautiful Gantt timeline. Let's get you started in under a minute.
      </p>
      <button onClick={() => setStep(1)} style={primaryBtnStyle}>
        Let's go →
      </button>
    </div>,

    // Step 1: Name your project
    <div key="project" style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🏗️</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
        Name your first project
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px' }}>
        What are you working on?
      </p>
      <input
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="e.g. Website Redesign, Mobile App, Q2 Sprint"
        style={{
          width: '100%', maxWidth: 360, padding: '12px 16px', borderRadius: 10,
          border: '2px solid var(--border, #e5e7eb)', fontSize: 15, fontWeight: 500,
          fontFamily: 'inherit', outline: 'none', textAlign: 'center',
          color: 'var(--text-primary)', background: 'var(--bg-surface)',
        }}
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && setStep(2)}
      />
      <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={() => setStep(2)} style={primaryBtnStyle}>
          Continue →
        </button>
      </div>
    </div>,

    // Step 2: Choose setup
    <div key="setup" style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
        How would you like to start?
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 28px' }}>
        We can set up sample data so you can see PlanView in action right away.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleCreateSample}
          disabled={creating}
          style={{
            ...cardBtnStyle,
            border: '2px solid #3b82f6',
            background: '#eff6ff',
          }}
        >
          <span style={{ fontSize: 28 }}>✨</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>Sample Project</span>
          <span style={{ fontSize: 11, color: '#6b7280' }}>3 features, 5 stories — ready to explore</span>
        </button>
        <button
          onClick={handleCreateEmpty}
          disabled={creating}
          style={cardBtnStyle}
        >
          <span style={{ fontSize: 28 }}>📄</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Empty Project</span>
          <span style={{ fontSize: 11, color: '#6b7280' }}>Start from scratch</span>
        </button>
      </div>
      {creating && (
        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          Setting things up...
        </div>
      )}
    </div>,
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'var(--bg-app, #f5f6f8)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Header */}
      <div style={{ position: 'absolute', top: 20, left: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e3a5f, #3b82f6)', color: '#fff', fontSize: 14, fontWeight: 700,
        }}>P</div>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#1e3a5f' }}>PlanView</span>
      </div>

      {/* Skip button */}
      <button
        onClick={onSkip}
        style={{
          position: 'absolute', top: 24, right: 24,
          fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Skip setup →
      </button>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: step === i ? 24 : 8, height: 8, borderRadius: 4,
            background: step >= i ? '#3b82f6' : 'var(--border, #e5e7eb)',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>

      {/* Content card */}
      <div style={{
        background: 'var(--bg-surface, #fff)', borderRadius: 16,
        border: '1px solid var(--border, #e5e7eb)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        padding: '20px 40px', maxWidth: 520, width: '100%',
      }}>
        {steps[step]}
      </div>
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700,
  border: 'none', background: '#1e3a5f', color: '#fff',
  cursor: 'pointer', fontFamily: 'inherit',
};

const cardBtnStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
  padding: '20px 24px', borderRadius: 12, width: 180,
  border: '2px solid var(--border, #e5e7eb)', background: 'var(--bg-surface, #fff)',
  cursor: 'pointer', fontFamily: 'inherit',
};
