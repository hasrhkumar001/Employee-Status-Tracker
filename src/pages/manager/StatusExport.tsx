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
}

interface User {
  _id: string;
  name: string;
  email: string;
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
  
  // Data for dropdowns
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [previewData, setPreviewData] = useState<StatusUpdate[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch teams and users for dropdowns
 useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setDataLoading(true);
        const token = localStorage.getItem('token');

        if (!token) {
          throw new Error('No authentication token found');
        }

        // Fetch teams
        const teamsRes = await axios.get('/api/teams', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const fetchedTeams = teamsRes.data;
        setTeams(fetchedTeams);

        // Fetch users from team members APIs
        const allUsers = new Map(); // Use Map to avoid duplicates
        
        // Fetch members from each team
        for (const team of fetchedTeams) {
          try {
            const membersRes = await axios.get(`/api/teams/${team._id}/members`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            // Add each member to the users map (avoiding duplicates by using user ID as key)
            membersRes.data.forEach((member: any) => {
              allUsers.set(member._id, {
                _id: member._id,
                name: member.name,
                email: member.email,
                role: member.role
              });
            });
          } catch (memberErr: any) {
            console.warn(`Error fetching members for team ${team.name}:`, memberErr);
            // Continue with other teams even if one fails
          }
        }

        // Convert Map values to array
        const uniqueUsers = Array.from(allUsers.values());
        console.log('fetched users from teams:', uniqueUsers); // Debug log

        setUsers(uniqueUsers);
      } catch (err: any) {
        console.error('Error fetching dropdown data:', err);
        setError(err.response?.data?.message || err.message || 'Failed to fetch data');
      } finally {
        setDataLoading(false);
      }
    };

    fetchDropdownData();
  }, []);

  // Helper function to build query parameters
  const buildQueryParams = () => {
    const params: any = {};
    
    // Handle team filter - if no specific team is selected, include all teams
    if (filters.team) {
      params.team = filters.team;
    } else if (teams.length > 0) {
      // Pass all team IDs when no specific team is selected
      params.teams = teams.map(team => team._id).join(',');
    }
    
    // Handle user filter - if no specific user is selected, include all users
    if (filters.user) {
      params.user = filters.user;
    } else if (users.length > 0) {
      // Pass all user IDs when no specific user is selected
      params.users = users.map(user => user._id).join(',');
    }
    
    // Handle date filtering
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

  // Fetch preview data when filters change
  useEffect(() => {
    const fetchPreviewData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Only fetch if we have teams and users data loaded
        if (teams.length === 0 || users.length === 0) return;

        const params = buildQueryParams();

        const response = await axios.get('/api/status', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params,
        });

        setPreviewData(response.data);
      } catch (err: any) {
        console.error('Error fetching preview data:', err);
        // Don't set error for preview data failures
      }
    };

    // Fetch preview data whenever filters change or when teams/users are loaded
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

      // Build export parameters
      let params = buildQueryParams();
      
      // If no date filter is set, default to current month
      if (!filters.month && !filters.startDate && !filters.endDate) {
        const currentDate = new Date();
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        params.startDate = startDate.toISOString().split('T')[0];
        params.endDate = endDate.toISOString().split('T')[0];
      }

      console.log('Exporting with params:', params);

      const response = await axios.get('/api/reports/excel', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
        responseType: 'blob',
        timeout: 30000, // 30 second timeout
      });

      // Check if response is actually a blob
      if (!(response.data instanceof Blob)) {
        throw new Error('Invalid response format received');
      }

      // Create blob link to download
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const currentDate = new Date();
      let filename = 'status-report';
      
      if (filters.team) {
        const teamName = teams.find(t => t._id === filters.team)?.name || 'team';
        filename += `-${teamName.toLowerCase().replace(/\s+/g, '-')}`;
      } else {
        filename += '-all-teams';
      }
      
      if (filters.user) {
        const userName = users.find(u => u._id === filters.user)?.name || 'user';
        filename += `-${userName.toLowerCase().replace(/\s+/g, '-')}`;
      } else {
        filename += '-all-users';
      }
      
      if (filters.month) {
        filename += `-${filters.month}`;
      } else if (filters.startDate && filters.endDate) {
        filename += `-${filters.startDate}-to-${filters.endDate}`;
      } else {
        filename += `-${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      }
      
      filename += '.xlsx';
      
      link.setAttribute('download', filename);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Clean up blob URL
      window.URL.revokeObjectURL(url);
      
      console.log('Export completed successfully');
      
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
          if (typeof err.response.data === 'string') {
            errorMessage = err.response.data;
          } else if (err.response.data.message) {
            errorMessage = err.response.data.message;
          }
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

  if (dataLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Export Status Reports</h1>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="space-y-6">
          {/* Filter Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Export Filters
              </h2>
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear All Filters
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Team Filter */}
              <div>
                <label
                  htmlFor="team"
                  className="block text-sm font-medium text-gray-700"
                >
                  Team
                </label>
                <select
                  id="team"
                  name="team"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={filters.team || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, team: e.target.value || undefined })
                  }
                >
                  <option value="">All Teams ({teams.length})</option>
                  {teams.map((team) => (
                    <option key={team._id} value={team._id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Filter */}
              <div>
                <label
                  htmlFor="user"
                  className="block text-sm font-medium text-gray-700"
                >
                  User
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
                  <option value="">All Users ({users.length})</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Filter */}
              <div>
                <label
                  htmlFor="month"
                  className="block text-sm font-medium text-gray-700"
                >
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
                      // Clear custom date range when month is selected
                      startDate: undefined,
                      endDate: undefined
                    })
                  }
                />
              </div>

              {/* Custom Date Range */}
              <div className="md:col-span-2 lg:col-span-3">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label
                      htmlFor="startDate"
                      className="block text-sm font-medium text-gray-700"
                    >
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
                          // Clear month when custom date is selected
                          month: undefined
                        })
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <label
                      htmlFor="endDate"
                      className="block text-sm font-medium text-gray-700"
                    >
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
                          // Clear month when custom date is selected
                          month: undefined
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Messages */}
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

          {/* Export Button */}
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

      {/* Export Format Preview */}
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
                    Questions & Answers
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.slice(0, 5).map((update) => (
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
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-2">
                        {update.responses.map((response, idx) => (
                          <div key={idx}>
                            <div className="font-medium text-gray-700">
                              {response.question.text}
                            </div>
                            <div className="text-gray-600">
                              {response.answer}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {previewData.length > 5 && (
              <div className="mt-4 text-sm text-gray-500 text-center">
                Showing first 5 records. Export will include all {previewData.length} records.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {teams.length > 0 && users.length > 0
              ? "No data found for the selected criteria"
              : "Loading data..."
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusExport;