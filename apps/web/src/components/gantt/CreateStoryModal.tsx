import { useState } from 'react';
import Modal from '../common/Modal';

interface CreateStoryModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    projectId: string;
    featureId: string;
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    assigneeId?: string;
    status?: string;
  }) => void;
  projectId: string;
  features: any[];
  members: any[];
  isLoading?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned', color: '#94a3b8' },
  { value: 'active', label: 'Active', color: '#3b82f6' },
];

const todayStr = () => new Date().toISOString().split('T')[0];
const nextWeekStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
};

export default function CreateStoryModal({
  open, onClose, onSubmit, projectId, features, members, isLoading,
}: CreateStoryModalProps) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    featureId: features[0]?.id || '',
    startDate: todayStr(),
    endDate: nextWeekStr(),
    assigneeId: '',
    status: 'planned',
  });
  const [error, setError] = useState('');

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    if (!form.name.trim()) { setError('Story name is required'); return; }
    if (!form.featureId) { setError('Please select a feature'); return; }
    if (form.endDate < form.startDate) { setError('End date must be after start date'); return; }
    setError('');

    onSubmit({
      projectId,
      featureId: form.featureId,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      assigneeId: form.assigneeId || undefined,
      status: form.status,
    });

    // Reset form
    setForm({
      name: '', description: '', featureId: features[0]?.id || '',
      startDate: todayStr(), endDate: nextWeekStr(), assigneeId: '', status: 'planned',
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'inherit',
    color: '#374151', outline: 'none', background: '#fafbfc',
    transition: 'border-color 0.15s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4,
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Story">
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
          <label style={labelStyle}>Story Name *</label>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. Build user profile page"
            style={inputStyle}
          />
        </div>

        {/* Feature */}
        <div>
          <label style={labelStyle}>Feature *</label>
          <select
            value={form.featureId}
            onChange={(e) => update('featureId', e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">Select feature...</option>
            {features.map((f: any) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => update('startDate', e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => update('endDate', e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Assignee + Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Assignee</label>
            <select
              value={form.assigneeId}
              onChange={(e) => update('assigneeId', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">Unassigned</option>
              {members.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update('status', opt.value)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    border: `1.5px solid ${form.status === opt.value ? opt.color : '#e5e7eb'}`,
                    background: form.status === opt.value ? opt.color + '12' : '#fff',
                    color: form.status === opt.value ? opt.color : '#9ca3af',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Description (optional)</label>
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Add details..."
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 48 }}
          />
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
            {isLoading ? 'Creating...' : 'Create Story'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
