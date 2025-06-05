import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Users, ClipboardList, Calendar, Download } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

interface Team {
  _id: string;
  name: string;
  project: {
    _id: string;
    name: string;
  };
  members: {
    _id: string;
    name: string;
    email: string;
  }[];
}

interface StatusUpdateSummary {
  teamId: string;
  teamName: string;
  updated: number;
  missing: number;
  lastUpdate: string | null;
}

const ManagerDashboard: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [teams, setTeams] = useState<Team[]>([]);
  const [statusSummary, setStatusSummary] = useState<StatusUpdateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch teams data
        const teamsResponse = await axios.get('/api/teams', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const teamsData = teamsResponse.data;
        setTeams(teamsData);

        // Generate status summary for each team
        const statusSummaryPromises = teamsData.map(async (team: Team) => {
          try {
            // Get today's date in YYYY-MM-DD format
            const today = new Date().toISOString().split('T')[0];

            // Fetch today's status updates for this team
            const statusResponse = await axios.get('/api/status', {
              params: {
                team: team._id,
                date: today
              },
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });

            const todayStatuses = statusResponse.data;

            // Create a set of user IDs who have submitted status today
            const usersWithStatus = new Set(
              todayStatuses.map((status: any) => status.user._id)
            );

            // Calculate updated and missing counts
            const updated = usersWithStatus.size;
            const missing = team.members.length - updated;

            // Find the latest status update for this team
            let lastUpdate = null;
            if (todayStatuses.length > 0) {
              const latestStatus = todayStatuses.reduce((latest: any, current: any) => {
                return new Date(current.date) > new Date(latest.date) ? current : latest;
              });
              lastUpdate = latestStatus.date;
            }

            return {
              teamId: team._id,
              teamName: team.name,
              updated,
              missing,
              lastUpdate
            };
          } catch (err) {
            console.error(`Error fetching status for team ${team.name}:`, err);
            // Return default values if status fetch fails
            return {
              teamId: team._id,
              teamName: team.name,
              updated: 0,
              missing: team.members.length,
              lastUpdate: null
            };
          }
        });

        // Wait for all status summary requests to complete
        const statusSummaryData = await Promise.all(statusSummaryPromises);
        setStatusSummary(statusSummaryData);

      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(
          err.response?.data?.message ||
          err.message ||
          'Failed to fetch dashboard data'
        );
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleExportTeamStatus = async (teamId: string) => {
    try {
      // Get the first and last day of the current month in YYYY-MM-DD format
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 2).toISOString().split('T')[0];
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];

      const response = await axios.get('/api/reports/excel', {
        params: {
          team: teamId,
          startDate: startDate,
          endDate: endDate
        },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        responseType: 'blob'
      });

      // Create download link for the Excel file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `team-status-${teamId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting team status:', err);
    }
  };

  const handleExportAllStatus = async () => {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 2).toISOString().split('T')[0];
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];
      const response = await axios.get('/api/reports/excel', {
        params: {

          startDate: startDate,
          endDate: endDate
        },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        responseType: 'blob'
      });

      // Create download link for the Excel file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `all-status-reports.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting all status reports:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Manager Dashboard</h1>
        <button
          onClick={handleExportAllStatus}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Download size={16} className="mr-2" />
          Export All Status Reports
        </button>
      </div>

      {/* Status Summary */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Today's Status Updates</h2>
        {statusSummary.length === 0 ? (
          <p className="text-gray-500">No teams found or no status data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pending
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Update
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statusSummary.map(summary => (
                  <tr key={summary.teamId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {summary.teamName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {summary.updated} members
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {summary.missing > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {summary.missing} members
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {summary.lastUpdate ? new Date(summary.lastUpdate).toLocaleDateString() : 'No updates yet'}

                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/manager/teams/${summary.teamId}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Teams Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">No teams found. Create a team to get started.</p>
          </div>
        ) : (
          teams.map(team => (
            <div key={team._id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{team.name}</h3>
                  <p className="text-sm text-gray-500">{team.project.name}</p>
                </div>
                <div className="flex space-x-2">
                  <Link
                    to={`/manager/teams/${team._id}`}
                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                  >
                    <ClipboardList size={14} className="mr-1" />
                    Status
                  </Link>
                  <Link
                    to={`/manager/members/${team._id}`}
                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-purple-700 bg-purple-100 hover:bg-purple-200"
                  >
                    <Users size={14} className="mr-1" />
                    Members
                  </Link>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Team Members ({team.members.length})</h4>
                {team.members.length === 0 ? (
                  <p className="text-sm text-gray-500">No members assigned</p>
                ) : (
                  <ul className="space-y-2">
                    {team.members.slice(0, 3).map(member => (
                      <li key={member._id} className="flex items-center text-sm">
                        <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="ml-2 truncate">{member.name}</span>
                      </li>
                    ))}
                    {team.members.length > 3 && (
                      <li className="text-sm text-gray-500">
                        +{team.members.length - 3} more members
                      </li>
                    )}
                  </ul>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleExportTeamStatus(team._id)}
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  <Download size={14} className="mr-1" />
                  Export Team Status
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;