import { useState } from 'react';
import Modal from '../common/Modal';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string }) => void;
  isLoading?: boolean;
}

export default function CreateProjectModal({
  open, onClose, onSubmit, isLoading,
}: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { setError('Project name is required'); return; }
    setError('');
    onSubmit({ name: name.trim(), description: description.trim() || undefined });
    setName('');
    setDescription('');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'inherit',
    color: '#374151', outline: 'none', background: '#fafbfc',
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Project">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && (
          <div style={{
            fontSize: 12, color: '#ef4444', background: '#fef2f2',
            border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px',
          }}>
            {error}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
            Project Name *
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. PlanView v2.0"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: '#1e3a5f', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
