import React, { useState, useRef, useEffect } from 'react';
import { useOrg } from '../context/OrgContext.jsx';
import { getGradientStyle } from '../utils/colors.js';
import { CreateOrgModal } from './Modals.jsx';
import { orgsApi } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

export const OrgSwitcher = () => {
  const { organizations, activeOrg, switchOrg, refreshActiveOrg } = useOrg();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOrg = (orgId) => {
    switchOrg(orgId);
    setOpen(false);
    showToast('Switched organization workspace', 'info');
  };

  const handleCreateOrg = async (name) => {
    const res = await orgsApi.create({ name });
    if (res.success) {
      showToast(`Created organization "${name}"`, 'success');
      await refreshActiveOrg();
      switchOrg(res.data.id);
    }
  };

  const activeIndex = organizations.findIndex((o) => o.id === activeOrg?.id);

  return (
    <div className="sw" ref={menuRef}>
      <button
        type="button"
        className="swb"
        id="swb"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span
          className="av"
          id="oav"
          style={getGradientStyle(activeIndex >= 0 ? activeIndex : 0)}
        >
          {activeOrg?.name?.[0] || 'N'}
        </span>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <b id="on" style={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {activeOrg?.name || 'Select Workspace'}
          </b>
          <small id="or">
            {activeOrg ? `${activeOrg.role} · ${activeOrg.memberCount || 1} members` : 'No active workspace'}
          </small>
        </span>
        <span style={{ color: 'var(--mut)', fontSize: 16 }}>⇅</span>
      </button>

      {open && (
        <div className="menu g" id="menu">
          {organizations.map((org, index) => (
            <button
              key={org.id}
              type="button"
              onClick={() => handleSelectOrg(org.id)}
              style={org.id === activeOrg?.id ? { background: 'var(--line)' } : {}}
            >
              <span className="av" style={getGradientStyle(index)}>
                {org.name[0]}
              </span>
              <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <b style={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {org.name}
                </b>
                <small style={{ color: 'var(--mut)', fontSize: 11 }}>{org.role}</small>
              </span>
              {org.id === activeOrg?.id && <span style={{ color: 'var(--a)' }}>✓</span>}
            </button>
          ))}
          <button
            type="button"
            style={{ color: 'var(--a)', fontWeight: 700, borderTop: '1px solid var(--line)', marginTop: 4 }}
            onClick={() => {
              setOpen(false);
              setModalOpen(true);
            }}
          >
            <span>＋</span>
            <span>Create organization</span>
          </button>
        </div>
      )}

      <CreateOrgModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateOrg}
      />
    </div>
  );
};
