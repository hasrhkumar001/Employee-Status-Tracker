import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, UserPlus, UserMinus, Mail, Save } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Team {
  _id: string;
  name: string;
  description: string;
  project: {
    _id: string;
    name: string;
  };
  members: User[];
}

const TeamMembers: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const [teamRes, usersRes] = await Promise.all([
        fetch(`/api/teams/${id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (!teamRes.ok || !usersRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [teamData, usersData] = await Promise.all([
        teamRes.json(),
        usersRes.json()
      ]);

      setTeam(teamData);
      
      // Filter out users who are already team members
      const currentMemberIds = teamData.members.map((member: User) => member._id);
      const available = usersData.filter((user: User) => !currentMemberIds.includes(user._id));
      setAvailableUsers(available);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const addMembers = async () => {
    if (!team || selectedUsers.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const newMembers = [...team.members.map(m => m._id), ...selectedUsers];
      
      const response = await fetch(`/api/teams/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: team.name,
          description: team.description,
          members: newMembers
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add members');
      }

      // Refresh data
      await fetchData();
      setSelectedUsers([]);
    } catch (err: any) {
      setError(err.message || 'Failed to add members');
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!team) return;

    setLoading(true);
    setError(null);

    try {
      const newMembers = team.members.filter(m => m._id !== userId).map(m => m._id);
      
      const response = await fetch(`/api/teams/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: team.name,
          description: team.description,
          members: newMembers
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove member');
      }

      // Refresh data
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-700">Team not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/admin/teams')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} className="mr-1" />
          Back to Teams
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manage Team Members</h1>
          <p className="text-gray-600">{team.name} - {team.project.name}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Members */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Current Members ({team.members.length})
          </h2>
          
          {team.members.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No members assigned to this team</p>
          ) : (
            <div className="space-y-3">
              {team.members.map(member => (
                <div key={member._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{member.name}</div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail size={14} className="mr-1" />
                        {member.email}
                      </div>
                      <div className="text-xs text-gray-400 capitalize">{member.role}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMember(member._id)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Remove member"
                    disabled={loading}
                  >
                    <UserMinus size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Users */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Available Users ({availableUsers.length})
            </h2>
            {selectedUsers.length > 0 && (
              <button
                onClick={addMembers}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                <UserPlus size={16} className="mr-1" />
                Add Selected ({selectedUsers.length})
              </button>
            )}
          </div>

          {availableUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">All users are already team members</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availableUsers.map(user => (
                <div key={user._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail size={14} className="mr-1" />
                        {user.email}
                      </div>
                      <div className="text-xs text-gray-400 capitalize">{user.role}</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={selectedUsers.includes(user._id)}
                    onChange={() => toggleUserSelection(user._id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex space-x-4">
          <button
            onClick={() => {
              const allUserIds = availableUsers.map(u => u._id);
              setSelectedUsers(allUserIds);
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={availableUsers.length === 0}
          >
            Select All Available
          </button>
          <button
            onClick={() => setSelectedUsers([])}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={selectedUsers.length === 0}
          >
            Clear Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamMembers;