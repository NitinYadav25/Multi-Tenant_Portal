import React, { useState, useEffect } from 'react';
import { TASK_STATUS, TASK_PRIORITY } from '../utils/constants.js';

/* Base Modal Container */
export const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="g modal-content">
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

/* Create Organization Modal */
export const CreateOrgModal = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Organization name is required');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await onSubmit(name.trim());
      setName('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Organization">
      <form onSubmit={handleSubmit}>
        {error && <div style={{ color: 'var(--bad)', marginBottom: 12 }}>{error}</div>}
        <label htmlFor="org-name-input">Organization Name</label>
        <input
          id="org-name-input"
          placeholder="e.g. Acme Innovations"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
        <div className="modal-actions">
          <button type="button" className="btn o" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Creating...' : 'Create Organization →'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* Create Project Modal */
export const CreateProjectModal = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await onSubmit({ name: name.trim(), description: description.trim() });
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Project">
      <form onSubmit={handleSubmit}>
        {error && <div style={{ color: 'var(--bad)', marginBottom: 12 }}>{error}</div>}
        <label htmlFor="proj-name-input">Project Name</label>
        <input
          id="proj-name-input"
          placeholder="e.g. Customer Portal Redesign"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />

        <label htmlFor="proj-desc-input">Description</label>
        <textarea
          id="proj-desc-input"
          placeholder="Brief description of the project goals..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="modal-actions">
          <button type="button" className="btn o" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* Task Modal (Create & Edit) */
export const TaskModal = ({ isOpen, onClose, onSubmit, task = null, members = [] }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(TASK_STATUS.TODO);
  const [priority, setPriority] = useState(TASK_PRIORITY.MEDIUM);
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || TASK_STATUS.TODO);
      setPriority(task.priority || TASK_PRIORITY.MEDIUM);
      setAssignee(task.assignee?._id || task.assignee?.id || task.assignee || '');
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
      setLabel(task.label || '');
    } else {
      setTitle('');
      setDescription('');
      setStatus(TASK_STATUS.TODO);
      setPriority(TASK_PRIORITY.MEDIUM);
      setAssignee('');
      setDueDate('');
      setLabel('');
    }
    setError('');
  }, [task, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assignee: assignee || null,
        dueDate: dueDate || null,
        label: label.trim()
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Task' : 'Add New Task'}>
      <form onSubmit={handleSubmit}>
        {error && <div style={{ color: 'var(--bad)', marginBottom: 12 }}>{error}</div>}

        <label htmlFor="task-title-input">Task Title</label>
        <input
          id="task-title-input"
          placeholder="e.g. Build responsive navbar"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
        />

        <label htmlFor="task-desc-input">Description</label>
        <textarea
          id="task-desc-input"
          placeholder="Add details, criteria or context..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label htmlFor="task-status-select">Status</label>
            <select
              id="task-status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value={TASK_STATUS.TODO}>To do</option>
              <option value={TASK_STATUS.IN_PROGRESS}>In progress</option>
              <option value={TASK_STATUS.DONE}>Done</option>
            </select>
          </div>

          <div>
            <label htmlFor="task-priority-select">Priority</label>
            <select
              id="task-priority-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value={TASK_PRIORITY.LOW}>LOW</option>
              <option value={TASK_PRIORITY.MEDIUM}>MEDIUM</option>
              <option value={TASK_PRIORITY.HIGH}>HIGH</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label htmlFor="task-assignee-select">Assignee</label>
            <select
              id="task-assignee-select"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user?.id || m.id} value={m.user?.id || m.id}>
                  {m.user?.name || m.name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="task-due-input">Due Date</label>
            <input
              id="task-due-input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <label htmlFor="task-label-input">Label / Category Tag</label>
        <input
          id="task-label-input"
          placeholder="e.g. Frontend, Design, Security"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <div className="modal-actions">
          <button type="button" className="btn o" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* Invite Member Modal */
export const InviteMemberModal = ({ isOpen, onClose, onSubmit, canInviteAdmin = false }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('User email is required');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await onSubmit({ email: email.trim(), role });
      setEmail('');
      setRole('MEMBER');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to invite member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Team Member">
      <form onSubmit={handleSubmit}>
        {error && <div style={{ color: 'var(--bad)', marginBottom: 12 }}>{error}</div>}
        <label htmlFor="invite-email-input">User Email</label>
        <input
          id="invite-email-input"
          type="email"
          placeholder="colleague@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          required
        />

        <label htmlFor="invite-role-select">Role</label>
        <select
          id="invite-role-select"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="MEMBER">Member (Can view, create tasks)</option>
          {canInviteAdmin && <option value="ADMIN">Admin (Can manage projects & invite members)</option>}
        </select>

        <div className="modal-actions">
          <button type="button" className="btn o" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Inviting...' : 'Send Invite →'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* Confirmation Modal */
export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', isDanger = true }) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p style={{ color: 'var(--mut)', margin: '14px 0 24px', lineHeight: 1.6 }}>{message}</p>
      <div className="modal-actions">
        <button type="button" className="btn o" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn ${isDanger ? 'danger' : ''}`}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
};
