import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight, AlertCircle, CheckCircle, UserX } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

interface Team {
  _id: string;
  name: string;
  project: {
    _id: string;
    name: string;
  };
}

interface StatusUpdate {
  _id: string;
  date: string;
  team: {
    _id: string;
    name: string;
  };
  responses: {
    question: {
      _id: string;
      text: string;
    };
    answer: string;
  }[];
  isLeave: boolean;
  leaveReason?: string;
}

// Status Updates Table Component
const StatusUpdatesTable: React.FC<{ recentUpdates: StatusUpdate[] }> = ({ recentUpdates }) => {
  // Get all unique questions across all updates
  const getAllUniqueQuestions = () => {
    const questionsMap = new Map();
    
    recentUpdates.forEach(update => {
      if (!update.isLeave && update.responses) {
        update.responses.forEach(response => {
          if (response.question) {
            questionsMap.set(response.question._id, response.question.text);
          }
        });
      }
    });
    
    return Array.from(questionsMap.entries()).map(([id, text]) => ({ id, text }));
  };

  const uniqueQuestions = getAllUniqueQuestions();

  // Function to get answer for a specific question in an update
  const getAnswerForQuestion = (update: StatusUpdate, questionId: string) => {
    if (update.isLeave) return null;
    
    const response = update.responses?.find(r => r.question?._id === questionId);
    return response ? response.answer : '';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() ;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
              Date & Time
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-28 bg-gray-50 z-10">
              Team
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            {uniqueQuestions.map(question => (
              <th key={question.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-48">
                {question.text}
              </th>
            ))}
            {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Leave Reason
            </th> */}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {recentUpdates.map((update, index) => (
            <tr key={update._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-inherit z-10">
                <div className="flex items-center">
                  <Clock size={14} className="mr-2 text-gray-400" />
                  {formatDate(update.date)}
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 sticky left-28 bg-inherit z-10">
                {update.team?.name || 'Unknown Team'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                {update.isLeave ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    <UserX size={12} className="mr-1" />
                    On Leave
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle size={12} className="mr-1" />
                    Active
                  </span>
                )}
              </td>
              {uniqueQuestions.map(question => (
                <td key={question.id} className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                  <div className="break-words">
                    {update.isLeave ? (
                      <span className="text-gray-400 italic">N/A (On Leave)</span>
                    ) : (
                      getAnswerForQuestion(update, question.id) || (
                        <span className="text-gray-400 italic">No response</span>
                      )
                    )}
                  </div>
                </td>
              ))}
              {/* <td className="px-4 py-4 text-sm text-gray-900">
                {update.isLeave ? (
                  <div className="text-orange-700">
                    {update.leaveReason || 'No reason provided'}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td> */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const EmployeeDashboard: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [currentUser, setCurrentUser] = useState<any>(user);
  const [teams, setTeams] = useState<Team[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<StatusUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          return;
        }

        // Fetch current user
        const userRes = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Current user data:', userRes.data); // Debug log
        setCurrentUser(userRes.data);
      }
      catch (err: any) {
        setError(err.message || 'Failed to fetch user data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    fetchTeams();
  }, []);
  
  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }

      const data = await response.json();
      setTeams(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchRecentUpdates = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Fetch all status updates for the current user
        const statusRes = await axios.get('/api/status', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            user: currentUser._id || currentUser.id,
          },
        });

        if (statusRes.data && statusRes.data.length > 0) {
          // Sort all updates by date (most recent first)
          const sortedUpdates = statusRes.data.sort((a: StatusUpdate, b: StatusUpdate) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          setRecentUpdates(sortedUpdates);
        } else {
          setRecentUpdates([]);
        }
      } catch (err: any) {
        console.error('Error fetching recent updates:', err);
        setError(err.message || 'Failed to fetch recent updates');
      } finally {
        setLoading(false);
      }
    };

    if (teams.length > 0 && currentUser) {
      fetchRecentUpdates();
    }
  }, [teams, currentUser]);

  // Function to get the latest status for a team (for displaying status in team cards)
  const getLatestStatusForTeam = (teamId: string) => {
    const teamUpdates = recentUpdates.filter(update => update.team?._id === teamId);
    return teamUpdates.length > 0 ? teamUpdates[0] : null;
  };

  // Function to check if today's status update exists for a team
  const getTodayStatusForTeam = (teamId: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    return recentUpdates.find(update => {
      const updateDate = new Date(update.date);
      const updateDateStr = updateDate.toISOString().split('T')[0];
      return update.team?._id === teamId && updateDateStr === todayStr;
    });
  };

  // Function to get status badge
  const getStatusBadge = (teamId: string) => {
    const todayStatus = getTodayStatusForTeam(teamId);
    
    if (todayStatus) {
      if (todayStatus.isLeave) {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <UserX size={12} className="mr-1" />
            On Leave Today
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={12} className="mr-1" />
            Updated Today
          </span>
        );
      }
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle size={12} className="mr-1" />
          No Update Today
        </span>
      );
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">My Dashboard</h1>
      </div>

      {/* Teams / Status Updates */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">My Teams</h2>
        <div className="space-y-4">
          {teams.map(team => {
            const latestStatus = getLatestStatusForTeam(team._id);
            return (
              <div key={team._id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{team.name}</h3>
                    <p className="text-sm text-gray-500">{team.project.name}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(team._id)}
                    <Link
                      to={`/employee/status/${team._id}`}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Update Status
                    </Link>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar size={16} className="mr-1" />
                    <span>Last update: </span>
                    <span className="ml-1 font-medium">
                      {latestStatus
                        ? new Date(latestStatus.date).toLocaleDateString()
                        : 'No updates yet'}
                    </span>
                  </div>
                  {latestStatus && (
                    <div className="text-sm text-gray-500">
                      {latestStatus.isLeave ? (
                        <span className="inline-flex items-center text-orange-600">
                          <UserX size={14} className="mr-1" />
                          {latestStatus.leaveReason || 'Leave'}
                        </span>
                      ) : (
                        <span className="text-green-600">
                          {/* {latestStatus.responses?.length || 0} responses */}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Updates - Table Format */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          {/* <Calendar className="mr-2" size={20} /> */}
          Recent Status Updates 
        </h2>
        
        {recentUpdates.length > 0 ? (
          <>
            <StatusUpdatesTable recentUpdates={recentUpdates} />
            <div className="mt-4 text-sm text-gray-500">
              Showing {recentUpdates.length} recent updates
            </div>
            <div className="flex justify-end mt-4">
              <Link
                to="/employee/status"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                View All Status Updates
                <ArrowRight size={16} className="ml-2" />
              </Link>
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-center py-4">No recent status updates.</p>
        )}
        
        {teams.length > 0 && (
          <div className="mt-6 text-center">
            <Link 
              to={`/employee/status/${teams[0]._id}`}
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Create a new status update <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;