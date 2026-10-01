import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOrg } from '../context/OrgContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { projectsApi, tasksApi, membersApi } from '../api/client.js';
import { TASK_STATUS, TASK_PRIORITY } from '../utils/constants.js';
import { getGradientStyle, getInitials, formatDate } from '../utils/colors.js';
import { TaskModal, CreateProjectModal, ConfirmModal } from '../components/Modals.jsx';
import { ClipboardIcon, PlusIcon, CalendarIcon, XIcon, InfoIcon } from '../components/Icons.jsx';

export const Board = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeOrg, activeRole, refetchIndex } = useOrg();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState('All'); // All, High priority, Assigned to me, Due this week
  const [loading, setLoading] = useState(true);

  // Modals state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Drag over tracking
  const [dragOverCol, setDragOverCol] = useState(null);

  const isOwnerOrAdmin = ['OWNER', 'ADMIN', 'Owner', 'Admin'].includes(activeRole);

  // 1. Fetch projects and members in active org
  useEffect(() => {
    if (!activeOrg) return;

    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const [projRes, memRes] = await Promise.all([
          projectsApi.list(activeOrg.id),
          membersApi.list(activeOrg.id)
        ]);

        if (!isMounted) return;

        if (projRes.success) {
          setProjects(projRes.data);
          const requestedProjId = searchParams.get('project');
          let selected = projRes.data.find((p) => p.id === requestedProjId);
          if (!selected && projRes.data.length > 0) {
            selected = projRes.data[0];
          }
          setActiveProject(selected || null);
          if (selected) {
            setSearchParams({ project: selected.id }, { replace: true });
          }
        }

        if (memRes.success) {
          setMembers(memRes.data);
        }
      } catch (err) {
        console.error('Failed to load board data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [activeOrg, refetchIndex]);

  // 2. Fetch tasks for active project
  const loadProjectTasks = useCallback(async () => {
    if (!activeProject) {
      setTasks([]);
      return;
    }
    try {
      const res = await tasksApi.list(activeProject.id);
      if (res.success) {
        setTasks(res.data);
      }
    } catch (err) {
      console.error('Failed to load project tasks:', err);
    }
  }, [activeProject]);

  useEffect(() => {
    loadProjectTasks();
  }, [loadProjectTasks]);

  // Select project change handler
  const handleSelectProject = (projectId) => {
    const proj = projects.find((p) => p.id === projectId);
    if (proj) {
      setActiveProject(proj);
      setSearchParams({ project: proj.id });
    }
  };

  // Drag & drop handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, colStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colStatus) {
      setDragOverCol(colStatus);
    }
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const taskToMove = tasks.find((t) => (t.id || t._id) === taskId);
    if (!taskToMove || taskToMove.status === targetStatus) return;

    const originalStatus = taskToMove.status;

    // Optimistic UI Update
    setTasks((prev) =>
      prev.map((t) => ((t.id || t._id) === taskId ? { ...t, status: targetStatus } : t))
    );

    try {
      await tasksApi.update(taskId, { status: targetStatus });
      showToast(`Task moved to ${targetStatus.replace('_', ' ')}`, 'info');
    } catch (err) {
      // Rollback on failure
      setTasks((prev) =>
        prev.map((t) => ((t.id || t._id) === taskId ? { ...t, status: originalStatus } : t))
      );
      showToast(err.message || 'Failed to update task status', 'error');
    }
  };

  // Task creation/update submission
  const handleSaveTask = async (taskData) => {
    if (editingTask) {
      const taskId = editingTask.id || editingTask._id;
      const res = await tasksApi.update(taskId, taskData);
      if (res.success) {
        showToast('Task updated successfully', 'success');
        loadProjectTasks();
      }
    } else {
      const res = await tasksApi.create(activeProject.id, taskData);
      if (res.success) {
        showToast('Task created successfully', 'success');
        loadProjectTasks();
      }
    }
  };

  // Task delete
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    const taskId = taskToDelete.id || taskToDelete._id;
    try {
      await tasksApi.delete(taskId);
      showToast('Task deleted successfully', 'success');
      loadProjectTasks();
    } catch (err) {
      showToast(err.message || 'Failed to delete task', 'error');
    } finally {
      setTaskToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  // Filter tasks based on filter chips
  const filteredTasks = tasks.filter((t) => {
    if (filter === 'High priority') return t.priority === TASK_PRIORITY.HIGH;
    if (filter === 'Assigned to me') {
      const assigneeId = t.assignee?._id || t.assignee?.id || t.assignee;
      return assigneeId === user?.id;
    }
    if (filter === 'Due this week') {
      if (!t.dueDate) return false;
      const now = new Date();
      const due = new Date(t.dueDate);
      const diffDays = (due - now) / (1000 * 60 * 60 * 24);
      return diffDays >= -1 && diffDays <= 7;
    }
    return true;
  });

  const columns = [
    { key: TASK_STATUS.TODO, label: 'To do', color: '#f59e0b' },
    { key: TASK_STATUS.IN_PROGRESS, label: 'In progress', color: '#2563eb' },
    { key: TASK_STATUS.DONE, label: 'Done', color: '#16a34a' }
  ];

  if (!activeProject && !loading) {
    return (
      <div className="empty-state g" style={{ maxWidth: 540, margin: '60px auto' }}>
        <div className="av grad" style={{ width: 64, height: 64, borderRadius: 12, margin: '0 auto 16px' }}>
          <ClipboardIcon size={28} />
        </div>
        <h3>No projects in this workspace</h3>
        <p>Create a project first to use the Kanban Task Board.</p>
        {isOwnerOrAdmin && (
          <button className="btn" onClick={() => setProjectModalOpen(true)}>
            <PlusIcon size={14} />
            <span>Create Project</span>
          </button>
        )}
        <CreateProjectModal
          isOpen={projectModalOpen}
          onClose={() => setProjectModalOpen(false)}
          onSubmit={async (data) => {
            const res = await projectsApi.create(activeOrg.id, data);
            if (res.success) {
              setProjects((prev) => [res.data, ...prev]);
              setActiveProject(res.data);
              setSearchParams({ project: res.data.id });
              showToast('Project created', 'success');
            }
          }}
        />
      </div>
    );
  }

  return (
    <>
      {/* Board Header */}
      <div className="hd">
        <div>
          <div className="s">
            {activeOrg?.name} › Projects
            {projects.length > 1 && (
              <select
                value={activeProject?.id || ''}
                onChange={(e) => handleSelectProject(e.target.value)}
                style={{
                  display: 'inline-block',
                  width: 'auto',
                  marginLeft: 8,
                  padding: '2px 8px',
                  borderRadius: 8,
                  fontSize: 12
                }}
                aria-label="Select active project"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <h1>{activeProject?.name || 'Project Board'}</h1>
        </div>

        <div className="chips">
          <div className="stack">
            {members.slice(0, 4).map((m, j) => (
              <span
                key={m.id}
                className="av"
                style={getGradientStyle(j)}
                title={m.user?.name || m.name}
              >
                {getInitials(m.user?.name || m.name)}
              </span>
            ))}
          </div>

          <button
            type="button"
            className="btn"
            onClick={() => {
              setEditingTask(null);
              setTaskModalOpen(true);
            }}
          >
            <PlusIcon size={14} />
            <span>Add task</span>
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="chips" style={{ marginBottom: 18 }}>
        {['All', 'High priority', 'Assigned to me', 'Due this week'].map((f) => (
          <button
            key={f}
            type="button"
            className={`chip ${filter === f ? 'on' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Kanban Columns */}
      <div className="cols">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.key);

          return (
            <div
              key={col.key}
              className={`g col ${dragOverCol === col.key ? 'ov' : ''}`}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <h4>
                <i style={{ background: col.color }} />
                <span>{col.label}</span>
                <em>{colTasks.length}</em>
              </h4>

              <div className="col-cards">
                {colTasks.length === 0 ? (
                  <div
                    style={{
                      border: '1px dashed var(--line)',
                      borderRadius: 14,
                      padding: 24,
                      textAlign: 'center',
                      color: 'var(--mut)',
                      fontSize: 12
                    }}
                  >
                    Drop tasks here
                  </div>
                ) : (
                  colTasks.map((t, i) => {
                    const taskId = t.id || t._id;
                    const assigneeName = t.assignee?.name || 'Unassigned';

                    return (
                      <div
                        key={taskId}
                        className="tk"
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, taskId)}
                        onClick={() => {
                          setEditingTask(t);
                          setTaskModalOpen(true);
                        }}
                        title="Click to edit task or view details"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="tag">{t.label || 'Task'}</span>
                          <span className={`pill ${t.priority}`}>{t.priority}</span>
                        </div>

                        <p>{t.title}</p>

                        <div className="f">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CalendarIcon size={12} />
                            <span>{formatDate(t.dueDate)}</span>
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              className="av"
                              style={{
                                ...getGradientStyle(i + col.key.length),
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                fontSize: 10
                              }}
                              title={`Assigned to ${assigneeName}`}
                            >
                              {getInitials(assigneeName)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaskToDelete(t);
                                setDeleteConfirmOpen(true);
                              }}
                              style={{ color: 'var(--mut)', padding: '2px 4px', fontSize: 12, display: 'inline-flex', alignItems: 'center' }}
                              title="Delete task"
                              aria-label="Delete task"
                            >
                              <XIcon size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ color: 'var(--mut)', marginTop: 14, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <InfoIcon size={14} />
        <span>Drag and drop cards between columns to change status, or click any card to edit details.</span>
      </div>

      {/* Task Modal for Create / Edit */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSaveTask}
        task={editingTask}
        members={members}
      />

      {/* Confirm Task Deletion */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Task"
        isDanger={true}
      />
    </>
  );
};
