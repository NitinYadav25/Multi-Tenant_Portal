import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useOrg } from '../context/OrgContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { projectsApi, orgsApi, membersApi } from '../api/client.js';
import { getGradientStyle, GRADIENT_PALETTES, getInitials } from '../utils/colors.js';
import { CreateProjectModal, CreateOrgModal } from '../components/Modals.jsx';

export const Dashboard = () => {
  const { user } = useAuth();
  const { activeOrg, activeRole, refetchIndex, refreshActiveOrg, organizations, switchOrg } = useOrg();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    projects: 0,
    openTasks: 0,
    members: 0,
    completedTasks: 0,
    recentActivity: []
  });
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [orgModalOpen, setOrgModalOpen] = useState(false);

  const isOwnerOrAdmin = ['OWNER', 'ADMIN', 'Owner', 'Admin'].includes(activeRole);

  const loadDashboardData = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [statsRes, projectsRes, membersRes] = await Promise.all([
        orgsApi.getStats(activeOrg.id),
        projectsApi.list(activeOrg.id, { search }),
        membersApi.list(activeOrg.id)
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (projectsRes.success) setProjects(projectsRes.data);
      if (membersRes.success) setMembers(membersRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeOrg, search]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, refetchIndex]);

  const handleCreateProject = async (data) => {
    const res = await projectsApi.create(activeOrg.id, data);
    if (res.success) {
      showToast(`Created project "${data.name}"`, 'success');
      loadDashboardData();
    }
  };

  const handleCreateOrg = async (name) => {
    const res = await orgsApi.create({ name });
    if (res.success) {
      showToast(`Created organization "${name}"`, 'success');
      await refreshActiveOrg();
      switchOrg(res.data.id);
    }
  };

  const renderSparkline = (paletteIndex) => {
    const [c1] = GRADIENT_PALETTES[paletteIndex % GRADIENT_PALETTES.length];
    return (
      <svg className="sp" viewBox="0 0 110 46" aria-hidden="true">
        <defs>
          <linearGradient id={`s_${paletteIndex}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={c1} stopOpacity="0.45" />
            <stop offset="1" stopColor={c1} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 36 L18 28 L36 32 L54 18 L72 22 L90 8 L110 12 V46 H0Z"
          fill={`url(#s_${paletteIndex})`}
        />
        <path
          d="M0 36 L18 28 L36 32 L54 18 L72 22 L90 8 L110 12"
          fill="none"
          stroke={c1}
          strokeWidth="2.5"
        />
      </svg>
    );
  };

  if (!activeOrg && organizations.length === 0) {
    return (
      <div className="empty-state g" style={{ maxWidth: 540, margin: '60px auto' }}>
        <div className="av grad" style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px', fontSize: 24 }}>
          🏢
        </div>
        <h3>No organizations found</h3>
        <p>Get started by creating your first organization workspace.</p>
        <button className="btn" onClick={() => setOrgModalOpen(true)}>
          ＋ Create Organization
        </button>
        <CreateOrgModal
          isOpen={orgModalOpen}
          onClose={() => setOrgModalOpen(false)}
          onSubmit={handleCreateOrg}
        />
      </div>
    );
  }

  const statCards = [
    { title: 'Projects', value: stats.projects, trend: '+2', icon: '▦' },
    { title: 'Open tasks', value: stats.openTasks, trend: '+12%', icon: '✓' },
    { title: 'Members', value: stats.members, trend: '+1', icon: '☺' },
    { title: 'Completed', value: stats.completedTasks, trend: '+8%', icon: '★' }
  ];

  return (
    <>
      <div className="hd">
        <div>
          <h1>
            Good day, <span className="gt">{user?.name?.split(' ')[0] || 'Demo'}</span> 👋
          </h1>
          <div className="s">Here’s what’s happening in {activeOrg?.name || 'Workspace'}</div>
        </div>

        <div className="chips">
          <input
            type="search"
            className="srch"
            placeholder="🔍 Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {isOwnerOrAdmin ? (
            <button className="btn" onClick={() => setProjectModalOpen(true)}>
              ＋ New project
            </button>
          ) : (
            <span className="pill LOW">Member access</span>
          )}
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="stats">
        {statCards.map((s, idx) => (
          <div key={s.title} className="g st">
            <div className="ic" style={getGradientStyle(idx)}>
              {s.icon}
            </div>
            <span className="d">{s.trend}</span>
            <b>{loading ? '-' : s.value}</b>
            <span>{s.title}</span>
            {renderSparkline(idx)}
          </div>
        ))}
      </div>

      {/* Main Two-Column Layout */}
      <div className="two">
        {/* Left Column: Projects */}
        <div>
          <h3 className="sec2">Projects</h3>

          {loading ? (
            <div className="pg">
              {[1, 2, 3].map((n) => (
                <div key={n} className="g pj skeleton" style={{ height: 180 }} />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="g empty-state">
              <h3>No projects yet</h3>
              <p>Create your first project to start organizing tasks and collaborating.</p>
              {isOwnerOrAdmin && (
                <button className="btn" onClick={() => setProjectModalOpen(true)}>
                  ＋ Create Project
                </button>
              )}
            </div>
          ) : (
            <div className="pg">
              {projects.map((p, idx) => (
                <div
                  key={p.id}
                  className="g pj"
                  onClick={() => navigate(`/board?project=${p.id}`)}
                  title="Open Kanban Task Board"
                >
                  <div className="t">
                    <span className="tag">Project</span>
                    <div
                      className="ring"
                      style={{
                        background: `conic-gradient(${GRADIENT_PALETTES[idx % GRADIENT_PALETTES.length][0]} ${p.progress || 0}%, var(--line) 0)`
                      }}
                    >
                      <span>{p.progress || 0}%</span>
                    </div>
                  </div>

                  <h3>{p.name}</h3>
                  <p>{p.description || 'No description provided.'}</p>

                  <div className="f">
                    <div className="stack">
                      {members.slice(0, 3).map((m, mIdx) => (
                        <span
                          key={m.id}
                          className="av"
                          style={getGradientStyle(mIdx + idx)}
                        >
                          {getInitials(m.user?.name || m.name)}
                        </span>
                      ))}
                    </div>
                    <span style={{ color: 'var(--mut)', fontSize: 12 }}>
                      {p.totalTasks || 0} tasks
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recent Activity & Tenant Shield */}
        <div>
          <div className="g act">
            <h3 className="sec2">Recent activity</h3>
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((a, i) => (
                <div key={a.id || i} className="ai">
                  <span
                    className="av"
                    style={{
                      ...getGradientStyle(i),
                      width: 30,
                      height: 30,
                      borderRadius: '50%'
                    }}
                  >
                    {a.actor?.[0] || 'U'}
                  </span>
                  <div>
                    <b>{a.actor}</b> {a.action}
                    <small>
                      {a.updatedAt
                        ? new Date(a.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Just now'}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--mut)', fontSize: 13, padding: '8px 0' }}>
                No recent activity in this workspace.
              </div>
            )}
          </div>

          <div className="g shield">
            <b>🛡️ Tenant isolation active</b>
            <ul>
              <li>✓ Membership verified on every request</li>
              <li>✓ Active Role: {activeRole}</li>
              <li>✓ Cross-org access blocked (404)</li>
              <li>✓ Data strictly segmented by organization</li>
            </ul>
          </div>
        </div>
      </div>

      <CreateProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </>
  );
};
