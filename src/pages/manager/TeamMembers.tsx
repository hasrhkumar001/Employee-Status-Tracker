import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Mail, AlertCircle, X, UserPlus, Search } from 'lucide-react';
import axios from 'axios';

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  lastActive: string;
  statusCount: number;
  isActive: boolean;
}

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Team {
  _id: string;
  name: string;
  description?: string;
}

const TeamMembers: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add member modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  
  // Edit member modal state
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const roles = ['Member', 'Team Lead', 'Developer', 'Designer', 'QA', 'DevOps', 'Manager'];

  useEffect(() => {
    if (teamId) {
      fetchTeamData();
      fetchMembers();
    }
  }, [teamId]);

  const fetchTeamData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await axios.get(`/api/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTeam(response.data);
    } catch (err: any) {
      console.error('Error fetching team data:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await axios.get(`/api/teams/${teamId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMembers(response.data);
    } catch (err: any) {
      console.error('Error fetching members:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch team members');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await axios.get('/api/users/available', {
        headers: { Authorization: `Bearer ${token}` },
        params: { teamId, search: searchTerm },
      });

      setAvailableUsers(response.data);
    } catch (err: any) {
      console.error('Error fetching available users:', err);
      setAddError('Failed to fetch available users');
    }
  };

  const handleAddMember = async (userId: string, role: string = 'Member') => {
    try {
      setAddLoading(true);
      setAddError(null);

      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      await axios.post(`/api/teams/${teamId}/members`, {
        userId,
        role,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Refresh members list
      await fetchMembers();
      setShowAddModal(false);
      setSearchTerm('');
    } catch (err: any) {
      console.error('Error adding member:', err);
      setAddError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditMember = async () => {
    if (!editingMember) return;

    try {
      setEditLoading(true);

      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      await axios.put(`/api/teams/${teamId}/members/${editingMember._id}`, {
        role: editRole,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Refresh members list
      await fetchMembers();
      setEditingMember(null);
    } catch (err: any) {
      console.error('Error editing member:', err);
      setError(err.response?.data?.message || 'Failed to update member');
    } finally {
      setEditLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      await axios.delete(`/api/teams/${teamId}/members/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Refresh members list
      await fetchMembers();
    } catch (err: any) {
      console.error('Error removing member:', err);
      setError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleSendMessage = async (memberEmail: string, memberName: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      await axios.post('/api/notifications/send', {
        email: memberEmail,
        type: 'reminder',
        message: `Hi ${memberName}, this is a reminder to submit your status update.`,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert(`Reminder sent to ${memberName}`);
    } catch (err: any) {
      console.error('Error sending message:', err);
      alert('Failed to send reminder');
    }
  };

  useEffect(() => {
    if (showAddModal) {
      fetchAvailableUsers();
    }
  }, [showAddModal, searchTerm]);

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Team Members</h1>
          {team && (
            <p className="text-sm text-gray-600 mt-1">{team.name}</p>
          )}
        </div>
        {/* <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus size={16} className="mr-2" />
          Add Member
        </button> */}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">Error: {error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status Updates
                </th> */}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-lg font-medium text-blue-600">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {member.name}
                          </div>
                          {member.isActive && (
                            <div className="ml-2 h-2 w-2 rounded-full bg-green-400"></div>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </td>
                  {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.lastActive ? new Date(member.lastActive).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {member.statusCount} updates
                    </div>
                  </td> */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {/* <button
                        onClick={() => handleSendMessage(member.email, member.name)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Send Reminder"
                      >
                        <Mail size={18} />
                      </button> */}
                      {/* <button
                        onClick={() => {
                          setEditingMember(member);
                          setEditRole(member.role);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit Member"
                      >
                        <Edit size={18} />
                      </button> */}
                      <button
                        onClick={() => handleRemoveMember(member._id, member.name)}
                        className="text-red-600 hover:text-red-900"
                        title="Remove Member"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {members.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No team members found. Add some members to get started.
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Team Member</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchTerm('');
                  setAddError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {addError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">{addError}</p>
              </div>
            )}

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {filteredUsers.length > 0 ? (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                      <button
                        onClick={() => handleAddMember(user._id)}
                        disabled={addLoading}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 disabled:opacity-50"
                      >
                        <UserPlus size={16} className="mr-1" />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  {searchTerm ? 'No users found' : 'No available users'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Member Role</h3>
              <button
                onClick={() => setEditingMember(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4">
              <div className="font-medium text-gray-900">{editingMember.name}</div>
              <div className="text-sm text-gray-500">{editingMember.email}</div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleEditMember}
                disabled={editLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {editLoading ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMembers;