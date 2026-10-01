import React, { useState, useEffect, useCallback } from 'react';
import { useOrg } from '../context/OrgContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { membersApi } from '../api/client.js';
import { getGradientStyle, getInitials } from '../utils/colors.js';
import { InviteMemberModal, ConfirmModal } from '../components/Modals.jsx';
import { PlusIcon } from '../components/Icons.jsx';

export const Members = () => {
  const { activeOrg, activeRole, refetchIndex } = useOrg();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  const isOwner = ['OWNER', 'Owner'].includes(activeRole);
  const isAdmin = ['ADMIN', 'Admin'].includes(activeRole);
  const canInvite = isOwner || isAdmin;

  const loadMembers = useCallback(async () => {
    if (!activeOrg) return;
    try {
      setLoading(true);
      const res = await membersApi.list(activeOrg.id);
      if (res.success) {
        setMembers(res.data);
      }
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  }, [activeOrg]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers, refetchIndex]);

  const handleInvite = async ({ email, role }) => {
    const res = await membersApi.add(activeOrg.id, { email, role });
    if (res.success) {
      showToast(`Invited ${email} as ${role}`, 'success');
      loadMembers();
    }
  };

  const handleRoleChange = async (memberUserId, newRole) => {
    try {
      const res = await membersApi.updateRole(activeOrg.id, memberUserId, { role: newRole });
      if (res.success) {
        showToast('Member role updated successfully', 'success');
        loadMembers();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update role', 'error');
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      const userId = memberToRemove.user?.id || memberToRemove.user?._id;
      await membersApi.remove(activeOrg.id, userId);
      showToast('Member removed from organization', 'success');
      loadMembers();
    } catch (err) {
      showToast(err.message || 'Failed to remove member', 'error');
    } finally {
      setMemberToRemove(null);
      setConfirmRemoveOpen(false);
    }
  };

  const canRemoveTarget = (targetRole, targetUserId) => {
    if (targetUserId === user?.id) return false; // Prevent removing self directly from list
    if (isOwner) return true;
    if (isAdmin && ['MEMBER', 'Member'].includes(targetRole)) return true;
    return false;
  };

  return (
    <>
      <div className="hd">
        <div>
          <h1>Members</h1>
          <div className="s">People collaborating in {activeOrg?.name || 'Workspace'}</div>
        </div>

        {canInvite && (
          <button className="btn" onClick={() => setInviteModalOpen(true)}>
            <PlusIcon size={14} />
            <span>Invite member</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="mg">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="g mc skeleton" style={{ height: 210 }} />
          ))}
        </div>
      ) : (
        <div className="mg">
          {members.map((m, i) => {
            const memberUser = m.user || {};
            const memberUserId = memberUser.id || memberUser._id;
            const isCurrentUser = memberUserId === user?.id;

            return (
              <div key={m.id} className="g mc">
                <div className="av" style={getGradientStyle(i)}>
                  {getInitials(memberUser.name)}
                </div>

                <h3>{memberUser.name || 'Member'}</h3>
                <small>{memberUser.email}</small>

                {isOwner && !isCurrentUser ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(memberUserId, e.target.value)}
                    style={{
                      width: 'auto',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    aria-label={`Change role for ${memberUser.name}`}
                  >
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                  </select>
                ) : (
                  <span className={`pill ${m.role}`}>
                    {m.role} {isCurrentUser && ' (You)'}
                  </span>
                )}

                {canRemoveTarget(m.role, memberUserId) && (
                  <div className="actions">
                    <button
                      type="button"
                      className="rm"
                      onClick={() => {
                        setMemberToRemove(m);
                        setConfirmRemoveOpen(true);
                      }}
                    >
                      Remove from org
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSubmit={handleInvite}
        canInviteAdmin={isOwner}
      />

      {/* Confirm Remove Member Modal */}
      <ConfirmModal
        isOpen={confirmRemoveOpen}
        onClose={() => {
          setConfirmRemoveOpen(false);
          setMemberToRemove(null);
        }}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message={`Are you sure you want to remove ${memberToRemove?.user?.name} (${memberToRemove?.user?.email}) from ${activeOrg?.name}? Any tasks assigned to them will be unassigned.`}
        confirmText="Remove Member"
        isDanger={true}
      />
    </>
  );
};
