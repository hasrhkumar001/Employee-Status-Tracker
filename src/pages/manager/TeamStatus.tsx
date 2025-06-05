import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, Download, AlertCircle, Coffee } from 'lucide-react';
import axios from 'axios';

interface StatusUpdate {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
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

interface TeamMember {
  _id: string;
  name: string;
  email: string;
}

const TeamStatus: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');

        // Fetch team members
        const membersRes = await axios.get(`/api/teams/members/${teamId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const teamMembers = membersRes.data;

        // Fetch status updates
        const statusRes = await axios.get('/api/status', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            team: teamId,
            date: selectedDate,
          },
        });

        const statusUpdates = statusRes.data;

        setTeamMembers(teamMembers);
        setStatusUpdates(statusUpdates);
      } catch (err: any) {
        console.error('Fetch data error:', err);
        setError(err.response?.data?.message || err.message || 'Failed to fetch team status');
      } finally {
        setLoading(false);
      }
    };

    if (teamId && selectedDate) {
      fetchData();
    }
  }, [teamId, selectedDate]);

  const handleExport = async () => {
    try {
      setExportLoading(true);
      setExportError(null);

      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get the selected date to determine date range
      const currentDate = new Date(selectedDate);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 2);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

      console.log('Exporting with params:', {
        team: teamId,
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0],
      });

      const response = await axios.get('/api/reports/excel', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          team: teamId,
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: endOfMonth.toISOString().split('T')[0],
        },
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
      
      // Generate filename with current date
      const filename = `status-report-${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}.xlsx`;
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
        // Server responded with error status
        if (err.response.status === 403) {
          errorMessage = 'You do not have permission to export this report';
        } else if (err.response.status === 404) {
          errorMessage = 'No data found for the selected criteria';
        } else if (err.response.status === 500) {
          errorMessage = 'Server error occurred while generating report';
        } else if (err.response.data) {
          // Try to get error message from response
          if (typeof err.response.data === 'string') {
            errorMessage = err.response.data;
          } else if (err.response.data.message) {
            errorMessage = err.response.data.message;
          }
        }
      } else if (err.request) {
        // Network error
        errorMessage = 'Network error - please check your connection';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setExportError(errorMessage);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Team Status Updates</h1>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} className="mr-2" />
            {exportLoading ? 'Exporting...' : 'Export Monthly Report'}
          </button>
        </div>
      </div>

      {/* Error Messages */}
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

      {exportError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">Export Error: {exportError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg divide-y divide-gray-200">
        {statusUpdates.map((update) => (
          <div key={update._id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {update.user.name}
                </h3>
                <p className="text-sm text-gray-500">{update.user.email}</p>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Clock size={16} className="mr-1" />
                {new Date(update.date).toLocaleTimeString()}
              </div>
            </div>
            
            {/* Check if this is a leave entry */}
            {update.isLeave ? (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                <div className="flex items-center">
                  <Coffee className="h-5 w-5 text-orange-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">On Leave</p>
                    {update.leaveReason && (
                      <p className="text-sm text-orange-700 mt-1">
                        Reason: {update.leaveReason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {update.responses.map((response, index) => (
                  <div key={index}>
                    <h4 className="text-sm font-medium text-gray-700">
                      {response.question.text}
                    </h4>
                    <p className="mt-1 text-sm text-gray-600">{response.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {statusUpdates.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No status updates for this date.
          </div>
        )}
      </div>

      {/* Missing Updates Section */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Missing Updates
        </h2>
        <div className="space-y-2">
          {teamMembers
            .filter(
              (member) =>
                !statusUpdates.some(
                  (update) => update.user._id === member._id
                )
            )
            .map((member) => (
              <div
                key={member._id}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {member.name}
                  </p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
              </div>
            ))}

          {teamMembers.length === statusUpdates.length && (
            <p className="text-sm text-green-600">
              All team members have submitted their updates.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamStatus;