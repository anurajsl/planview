import { useState } from 'react';
import Modal from '../common/Modal';

interface CreateFeatureModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { projectId: string; name: string; color: string }) => void;
  projectId: string;
  isLoading?: boolean;
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
  '#22c55e', '#0ea5e9', '#14b8a6', '#f97316', '#64748b',
];

export default function CreateFeatureModal({
  open, onClose, onSubmit, projectId, isLoading,
}: CreateFeatureModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { setError('Feature name is required'); return; }
    setError('');
    onSubmit({ projectId, name: name.trim(), color });
    setName('');
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Feature">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && (
          <div style={{
            fontSize: 12, color: '#ef4444', background: '#fef2f2',
            border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px',
          }}>
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
            Feature Name *
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. User Authentication"
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'inherit',
              color: '#374151', outline: 'none', background: '#fafbfc',
            }}
          />
        </div>

        {/* Color picker */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
            Color
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: c, cursor: 'pointer', position: 'relative',
                  boxShadow: color === c ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : '0 1px 2px rgba(0,0,0,0.1)',
                  transition: 'box-shadow 0.15s',
                }}
              >
                {color === c && (
                  <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 8, background: color + '08',
          border: `1px solid ${color}20`,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
            {name || 'Feature preview'}
          </span>
        </div>

        {/* Actions */}
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
            {isLoading ? 'Creating...' : 'Create Feature'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
