import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Save, AlertCircle, Calendar, Coffee, Lock, Edit } from 'lucide-react';
import axios from 'axios';

interface Question {
  _id: string;
  text: string;
  isCommon: boolean;
}

interface StatusResponse {
  question: string;
  answer: string;
}

interface PreviousStatus {
  _id: string;
  date: string;
  responses: Array<{
    question: {
      _id: string;
      text: string;
    };
    answer: string;
  }>;
  updatedBy: {
    name: string;
  };
  isLeave?: boolean;
  leaveReason?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const StatusUpdate: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<StatusResponse[]>([]);
  const [previousStatus, setPreviousStatus] = useState<PreviousStatus | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLeave, setIsLeave] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  // Calculate date restrictions
  const today = new Date();
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);
  
  const minDate = twoDaysAgo.toISOString().split('T')[0];
  const maxDate = today.toISOString().split('T')[0];

  // Helper function to check if data already exists for selected date
  const hasExistingData = () => {
    return previousStatus !== null;
  };

  // Helper function to check if current user can edit
  const canEdit = () => {
    if (!hasExistingData()) return true; // No existing data, can create new
    if (!currentUser || !previousStatus) return false;
    
    // User can edit their own status or if they're a manager/admin
    const isOwnStatus = previousStatus.updatedBy && 
      (currentUser.id === previousStatus.updatedBy.id || 
       currentUser.name === previousStatus.updatedBy.name);
    
    return isOwnStatus || currentUser.role === 'manager' || currentUser.role === 'admin';
  };

  // Helper function to determine if form should be disabled
  const isFormDisabled = () => {
    return hasExistingData() && !isEditMode;
  };

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
        console.log('Current user data:', userRes.data);
        setCurrentUser(userRes.data);

        // Fetch questions
        const questionsRes = await axios.get('/api/questions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const realQuestions: Question[] = questionsRes.data;

        setQuestions(realQuestions);
        setResponses(
          realQuestions.map(q => ({
            question: q._id,
            answer: ''
          }))
        );

        // Fetch previous status update for selected date
        if (teamId && userRes.data) {
          await fetchStatusForDate(selectedDate, userRes.data, token);
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.message || err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teamId]);

  const fetchStatusForDate = async (date: string, user: User, token: string) => {
    try {
      const statusRes = await axios.get('/api/status', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          user: user.id,
          team: teamId,
          date: date
        }
      });

      if (statusRes.data && statusRes.data.length > 0) {
        const status = statusRes.data[0];
        setPreviousStatus(status);
        setIsEditMode(false); // Reset edit mode when fetching new data
        
        // If there's an existing status for this date, populate the form
        if (status.isLeave) {
          setIsLeave(true);
          setLeaveReason(status.leaveReason || '');
          setResponses(questions.map(q => ({ question: q._id, answer: '' })));
        } else {
          setIsLeave(false);
          setLeaveReason('');
          // Populate responses from existing status
          const existingResponses = status.responses.map((r: any) => ({
            question: r.question._id || r.question,
            answer: r.answer
          }));
          setResponses(existingResponses);
        }
      } else {
        setPreviousStatus(null);
        setIsEditMode(false);
        setIsLeave(false);
        setLeaveReason('');
        setResponses(questions.map(q => ({ question: q._id, answer: '' })));
      }
    } catch (err) {
      console.error('Error fetching status for date:', err);
      setPreviousStatus(null);
      setIsEditMode(false);
    }
  };

  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    setError(null);
    setIsEditMode(false); // Reset edit mode when date changes
    
    if (currentUser) {
      const token = localStorage.getItem('token');
      if (token) {
        await fetchStatusForDate(date, currentUser, token);
      }
    }
  };

  const validateDate = (date: string): boolean => {
    const selectedDateObj = new Date(date);
    const minDateObj = new Date(minDate);
    const maxDateObj = new Date(maxDate);
    
    return selectedDateObj >= minDateObj && selectedDateObj <= maxDateObj;
  };

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (!currentUser || !teamId) {
        throw new Error('Missing user or team information');
      }

      if (!validateDate(selectedDate)) {
        throw new Error('You can only add status for today or the last two days');
      }

      let statusData;

      if (isLeave) {
        // Leave submission
        if (!leaveReason.trim()) {
          throw new Error('Please provide a reason for leave');
        }

        statusData = {
          team: teamId,
          user: currentUser.id || currentUser._id,
          date: new Date(selectedDate).toISOString(),
          isLeave: true,
          leaveReason: leaveReason.trim(),
          responses: []
        };
      } else {
        // Regular status submission
        const validResponses = responses.filter(r => r.answer.trim() !== '');

        if (validResponses.length === 0) {
          throw new Error('Please provide at least one response');
        }

        statusData = {
          team: teamId,
          user: currentUser.id || currentUser._id,
          date: new Date(selectedDate).toISOString(),
          isLeave: false,
          responses: validResponses
        };
      }

      console.log('Submitting status data:', statusData);

      const response = await axios.post('/api/status', statusData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 201) {
        alert(`${isLeave ? 'Leave' : 'Status'} ${hasExistingData() ? 'updated' : 'saved'} successfully!`);
        
        // Refresh status for the selected date
        await fetchStatusForDate(selectedDate, currentUser, token);
      }
    } catch (err: any) {
      console.error('Error submitting status:', err);
      setError(
        err.response?.data?.message || 
        err.response?.data?.errors?.[0]?.msg || 
        err.message || 
        'Failed to save status update'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResponseChange = (questionId: string, answer: string) => {
    if (isFormDisabled()) return; // Prevent changes when disabled
    
    setResponses(prev =>
      prev.map(r =>
        r.question === questionId ? { ...r, answer } : r
      )
    );
  };

  const handleLeaveToggle = () => {
    if (isFormDisabled()) return; // Prevent changes when disabled
    
    setIsLeave(!isLeave);
    if (!isLeave) {
      // Switching to leave mode, clear responses
      setResponses(questions.map(q => ({ question: q._id, answer: '' })));
    } else {
      // Switching to status mode, clear leave reason
      setLeaveReason('');
    }
  };

  const handleLeaveReasonChange = (value: string) => {
    if (isFormDisabled()) return; // Prevent changes when disabled
    setLeaveReason(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Daily Status Update</h1>
        <span className="text-sm text-gray-500">
          {new Date(selectedDate).toLocaleDateString()}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Date Selection */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <label htmlFor="date-select" className="text-sm font-medium text-gray-700">
              Select Date:
            </label>
          </div>
          <input
            id="date-select"
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            min={minDate}
            max={maxDate}
            className="block w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <span className="text-xs text-gray-500">
            (Can only select today or last 2 days)
          </span>
        </div>
      </div>

      {/* Status Indicator */}
      {/* {hasExistingData() && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Lock className="h-5 w-5 text-blue-400" />
              <p className="ml-3 text-sm text-blue-700">
                Status already submitted for {new Date(selectedDate).toLocaleDateString()}
              </p>
            </div>
            {canEdit() && (
              <button
                onClick={handleEditToggle}
                className="inline-flex items-center px-3 py-1 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Edit size={14} className="mr-1" />
                {isEditMode ? 'Cancel Edit' : 'Edit'}
              </button>
            )}
          </div>
        </div>
      )} */}

      {/* Leave Toggle */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Coffee className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Mark as Leave Day</span>
          </div>
          <button
            type="button"
            onClick={handleLeaveToggle}
            disabled={isFormDisabled()}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isFormDisabled() 
                ? 'bg-gray-200 cursor-not-allowed' 
                : isLeave 
                  ? 'bg-blue-600' 
                  : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isLeave ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        
        {isLeave && (
          <div className="mt-4">
            <label htmlFor="leave-reason" className="block text-sm font-medium text-gray-700 mb-2">
              Leave Reason *
            </label>
            <input
              id="leave-reason"
              type="text"
              value={leaveReason}
              onChange={(e) => handleLeaveReasonChange(e.target.value)}
              disabled={isFormDisabled()}
              placeholder="Enter reason for leave (e.g., Sick leave, Personal leave, etc.)"
              className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                isFormDisabled() ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
              }`}
            />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {!isLeave && (
          <div className="bg-white shadow-sm rounded-lg divide-y divide-gray-200">
            {questions.map((question, index) => (
              <div key={question._id} className="p-6">
                <label
                  htmlFor={`question-${question._id}`}
                  className="block text-sm font-medium text-gray-900"
                >
                  {index + 1}. {question.text}
                </label>
                <div className="mt-2">
                  <textarea
                    id={`question-${question._id}`}
                    rows={3}
                    className={`shadow-sm block w-full focus:ring-blue-500 focus:border-blue-500 sm:text-sm border border-gray-300 rounded-md ${
                      isFormDisabled() ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : ''
                    }`}
                    value={
                      responses.find(r => r.question === question._id)?.answer || ''
                    }
                    onChange={e =>
                      handleResponseChange(question._id, e.target.value)
                    }
                    placeholder="Enter your response..."
                    disabled={isFormDisabled()}
                    readOnly={isFormDisabled()}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          {!hasExistingData() || isEditMode ? (
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  {isLeave ? <Coffee size={16} className="mr-2" /> : <Save size={16} className="mr-2" />}
                  {hasExistingData() 
                    ? (isLeave ? 'Update Leave' : 'Update Status')
                    : (isLeave ? 'Mark Leave' : 'Submit Update')
                  }
                </>
              )}
            </button>
          ) : (
            <div className="text-sm text-gray-500 flex items-center">
              <Lock className="h-4 w-4 mr-2" />
              Status already filled. 
              {/* {canEdit() ? 'Click Edit to modify.' : 'Contact your manager to modify.'} */}
            </div>
          )}
        </div>
      </form>

      {/* Previous Updates Preview */}
      {previousStatus && (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Status for {new Date(selectedDate).toLocaleDateString()}
          </h2>
          
          {previousStatus.isLeave ? (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-md">
              <div className="flex items-center">
                <Coffee className="h-5 w-5 text-orange-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-800">Leave Day</p>
                  <p className="text-sm text-orange-700 mt-1">
                    Reason: {previousStatus.leaveReason}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {previousStatus.responses.map((response, index) => (
                <div key={response.question._id}>
                  <h3 className="text-sm font-medium text-gray-700">
                    {response.question.text}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {response.answer}
                  </p>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-500">
            Submitted on {new Date(previousStatus.date).toLocaleDateString()} at{' '}
            {new Date(previousStatus.date).toLocaleTimeString()}
            {previousStatus.updatedBy && (
              <span> by {previousStatus.updatedBy.name}</span>
            )}
          </div>
        </div>
      )}

      {!previousStatus && !loading && (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-gray-500">No status found for {new Date(selectedDate).toLocaleDateString()}.</p>
        </div>
      )}
    </div>
  );
};

export default StatusUpdate;