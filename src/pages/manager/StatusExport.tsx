import React, { useState, useEffect } from 'react';
import { Download, Filter, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface ExportFilters {
  user?: string;
  team?: string;
  startDate?: string;
  endDate?: string;
  month?: string;
}

interface Team {
  _id: string;
  name: string;
  members?: User[];
}

interface User {
  _id: string;
  name: string;
  email: string;
  role?: string;
}

interface StatusUpdate {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  team: {
    _id: string;
    name: string;
  };
  date: string;
  isLeave: boolean;
  leaveReason?: string;
  responses: {
    question: {
      _id: string;
      text: string;
    };
    answer: string;
  }[];
}

const StatusExport: React.FC = () => {
  const [filters, setFilters] = useState<ExportFilters>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [previewData, setPreviewData] = useState<StatusUpdate[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setDataLoading(true);
        const token = localStorage.getItem('token');

        if (!token) {
          throw new Error('No authentication token found');
        }

        const teamsRes = await axios.get('/api/teams', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const fetchedTeams = teamsRes.data;
        const teamsWithMembers: Team[] = [];
        const allUsers = new Map();

        for (const team of fetchedTeams) {
          try {
            const membersRes = await axios.get(`/api/teams/${team._id}/members`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            const teamMembers = membersRes.data.map((member: any) => ({
              _id: member._id,
              name: member.name,
              email: member.email,
              role: member.role,
            }));

            teamsWithMembers.push({
              ...team,
              members: teamMembers,
            });

            teamMembers.forEach((member: User) => {
              allUsers.set(member._id, member);
            });
          } catch (memberErr: any) {
            console.warn(`Error fetching members for team ${team.name}:`, memberErr);
            teamsWithMembers.push({ ...team, members: [] });
          }
        }

        setTeams(teamsWithMembers);
        setUsers(Array.from(allUsers.values()));
      } catch (err: any) {
        console.error('Error fetching dropdown data:', err);
        setError(err.response?.data?.message || err.message || 'Failed to fetch data');
      } finally {
        setDataLoading(false);
      }
    };

    fetchDropdownData();
  }, []);

  const getFilteredUsers = (): User[] => {
    if (!filters.team) {
      return users;
    }
    const selectedTeam = teams.find((team) => team._id === filters.team);
    return selectedTeam?.members?.length ? selectedTeam.members : [];
  };

  const handleTeamChange = (teamId: string) => {
    setFilters({
      ...filters,
      team: teamId || undefined,
      user: undefined, // Reset user filter when team changes
    });
    setExportError(null);
  };

  const buildQueryParams = () => {
    const params: any = {};

    if (filters.team) {
      params.team = filters.team;
    } else if (teams.length > 0) {
      params.teams = teams.map((team) => team._id).join(',');
    }

    if (filters.user) {
      params.user = filters.user;
    } else if (filters.team) {
      const filteredUsers = getFilteredUsers();
      if (filteredUsers.length > 0) {
        params.users = filteredUsers.map((user) => user._id).join(',');
      }
    }

    if (filters.month) {
      const [year, month] = filters.month.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      params.startDate = startDate.toISOString().split('T')[0];
      params.endDate = endDate.toISOString().split('T')[0];
    } else if (filters.startDate && filters.endDate) {
      params.startDate = filters.startDate;
      params.endDate = filters.endDate;
    }

    return params;
  };

  useEffect(() => {
    const fetchPreviewData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token || teams.length === 0 || users.length === 0) return;

        const params = buildQueryParams();
        const response = await axios.get('/api/status', {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });

        setPreviewData(response.data);
      } catch (err: any) {
        console.error('Error fetching preview data:', err);
      }
    };

    if (teams.length > 0 && users.length > 0) {
      fetchPreviewData();
    }
  }, [filters, teams, users]);

  const handleExport = async () => {
    try {
      setLoading(true);
      setExportError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      let params = buildQueryParams();

      if (!filters.month && !filters.startDate && !filters.endDate) {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, currentDate.getMonth() + 1, 0).getDate();
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const response = await axios.get('/api/reports/excel', {
        headers: { Authorization: `Bearer ${token}` },
        params,
        responseType: 'blob',
        timeout: 30000,
      });

      if (!(response.data instanceof Blob)) {
        throw new Error('Invalid response format received');
      }

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;

      let filename = 'status-report';
      if (filters.team) {
        const teamName = teams.find((t) => t._id === filters.team)?.name || 'team';
        filename += `-${teamName.toLowerCase().replace(/\s+/g, '-')}`;
      } else {
        filename += '-all-teams';
      }

      if (filters.user) {
        const userName = getFilteredUsers().find((u) => u._id === filters.user)?.name || 'user';
        filename += `-${userName.toLowerCase().replace(/\s+/g, '-')}`;
      } else {
        filename += '-all-users';
      }

      if (filters.month) {
        filename += `-${filters.month}`;
      } else if (filters.startDate && filters.endDate) {
        filename += `-${filters.startDate}-to-${filters.endDate}`;
      } else {
        const currentDate = new Date();
        filename += `-${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      }

      filename += '.xlsx';
      link.setAttribute('download', filename);

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export error:', err);
      let errorMessage = 'Failed to export report';
      if (err.response) {
        if (err.response.status === 403) {
          errorMessage = 'You do not have permission to export this report';
        } else if (err.response.status === 404) {
          errorMessage = 'No data found for the selected criteria';
        } else if (err.response.status === 500) {
          errorMessage = 'Server error occurred while generating report';
        } else if (err.response.data) {
          errorMessage = err.response.data.message || 'Failed to export report';
        }
      } else if (err.request) {
        errorMessage = 'Network error - please check your connection';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setExportError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({});
    setExportError(null);
  };

  const renderStatusContent = (update: StatusUpdate) => {
    if (update.isLeave) {
      return (
        <div className="bg-orange-50 px-3 py-2 rounded-md">
          <div className="flex items-center">
            <span className="text-orange-600 font-medium">On Leave</span>
            {update.leaveReason && (
              <span className="ml-2 text-orange-800">({update.leaveReason})</span>
            )}
          </div>
        </div>
      );
    }

    if (update.responses && update.responses.length > 0) {
      return (
        <div className="space-y-2">
          {update.responses.map((response, idx) => (
            <div key={idx}>
              <div className="font-medium text-gray-700 text-sm">{response.question?.text}</div>
              <div className="text-gray-600 text-sm">{response.answer}</div>
            </div>
          ))}
        </div>
      );
    }

    return <span className="text-gray-400 italic">No data</span>;
  };

  if (dataLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const filteredUsers = getFilteredUsers();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Export Status Reports</h1>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Export Filters</h2>
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear All Filters
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label htmlFor="team" className="block text-sm font-medium text-gray-700">
                  Team
                </label>
                <select
                  id="team"
                  name="team"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={filters.team || ''}
                  onChange={(e) => handleTeamChange(e.target.value)}
                >
                  <option value="">All Teams</option>
                  {teams.map((team) => (
                    <option key={team._id} value={team._id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="user" className="block text-sm font-medium text-gray-700">
                  User {filters.team && <span className="text-xs text-gray-500 ml-1">(from selected team)</span>}
                </label>
                <select
                  id="user"
                  name="user"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={filters.user || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, user: e.target.value || undefined })
                  }
                >
                  <option value="">
                    {filters.team
                      ? `All Users from ${teams.find((t) => t._id === filters.team)?.name || 'Selected Team'}`
                      : 'All Users'}
                  </option>
                  {filteredUsers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="month" className="block text-sm font-medium text-gray-700">
                  Month
                </label>
                <input
                  type="month"
                  id="month"
                  name="month"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={filters.month || ''}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      month: e.target.value || undefined,
                      startDate: undefined,
                      endDate: undefined,
                    })
                  }
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={filters.startDate || ''}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          startDate: e.target.value || undefined,
                          month: undefined,
                        })
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={filters.endDate || ''}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          endDate: e.target.value || undefined,
                          month: undefined,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {exportError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">Export Error: {exportError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleExport}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={16} className="mr-2" />
                  Export Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Preview ({previewData.length} records)
        </h2>

        {previewData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Content
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.slice(0, 10).map((update) => (
                  <tr key={update._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {update.team?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {update.user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(update.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {update.isLeave ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Leave
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {renderStatusContent(update)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {previewData.length > 10 && (
              <div className="mt-4 text-sm text-gray-500 text-center">
                Showing first 10 records. Export will include all {previewData.length} records.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {teams.length > 0 && users.length > 0
              ? 'No data found for the selected criteria'
              : 'Loading data...'}
          </div>
        )}
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Export Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Status Types:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                  Active
                </span>
                Regular status updates with question responses
              </li>
              <li className="flex items-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mr-2">
                  Leave
                </span>
                Leave entries with optional reason
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Excel Format:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>&bull; Each row represents a user's response to a specific question</li>
              <li>&bull; Leave entries are highlighted in orange</li>
              <li>&bull; Data is organized by Team &rarr; User &rarr; Question</li>
              <li>&bull; Dates are displayed as columns for easy comparison</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusExport;