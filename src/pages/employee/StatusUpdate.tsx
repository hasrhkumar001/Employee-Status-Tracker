import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Save, AlertCircle, Calendar, Coffee } from 'lucide-react';
import axios from 'axios';

interface QuestionOption {
  text: string;
  order: number;
}

interface Question {
  _id: string;
  text: string;
  type: 'text' | 'single_choice' | 'multiple_choice';
  options: QuestionOption[];
  isCommon: boolean;
  order: number;
}

interface StatusResponse {
  question: string;
  answer: string;
}

interface PreviousStatus {
  _id: string;
  date: string;
  isLeave: boolean;
  leaveReason?: string;
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
  const [isLeave, setIsLeave] = useState<boolean>(false);
  const [leaveReason, setLeaveReason] = useState<string>('');
  const [hasExistingStatus, setHasExistingStatus] = useState<boolean>(false);
  const [existingStatusType, setExistingStatusType] = useState<'status' | 'leave' | null>(null);

  // Helper function to check if date is allowed (today and last 2 days)
  const isDateAllowed = (dateString: string): boolean => {
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);
    
    return selectedDate >= twoDaysAgo && selectedDate <= today;
  };

  // Get min and max dates for date input
  const getDateConstraints = () => {
    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);
    
    return {
      min: twoDaysAgo.toISOString().split('T')[0],
      max: today.toISOString().split('T')[0]
    };
  };

  // Check for existing status on selected date
  const checkExistingStatus = async (date: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !currentUser || !teamId) return;

      const statusRes = await axios.get('/api/status', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          user: currentUser.id,
          team: teamId,
          date: date
        }
      });

      if (statusRes.data && statusRes.data.length > 0) {
        const existingStatus = statusRes.data[0];
        setHasExistingStatus(true);
        setExistingStatusType(existingStatus.isLeave ? 'leave' : 'status');
        
        if (existingStatus.isLeave) {
          setIsLeave(true);
          setLeaveReason(existingStatus.leaveReason || '');
        } else {
          setIsLeave(false);
          setLeaveReason('');
          // Pre-populate responses if it's a status update
          const updatedResponses = questions.map(q => {
            const existingResponse = existingStatus.responses.find(
              (r: any) => r.question._id === q._id || r.question === q._id
            );
            return {
              question: q._id,
              answer: existingResponse ? existingResponse.answer : ''
            };
          });
          setResponses(updatedResponses);
        }
      } else {
        setHasExistingStatus(false);
        setExistingStatusType(null);
        setIsLeave(false);
        setLeaveReason('');
        // Reset responses
        setResponses(questions.map(q => ({ question: q._id, answer: '' })));
      }
    } catch (err) {
      console.error('Error checking existing status:', err);
      setHasExistingStatus(false);
      setExistingStatusType(null);
    }
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
        setCurrentUser(userRes.data);

        // Fetch questions for the specific team if teamId is provided
        const questionsParams: any = {};
        if (teamId) {
          questionsParams.team = teamId;
        }

        const questionsRes = await axios.get('/api/questions', {
          headers: { Authorization: `Bearer ${token}` },
          params: questionsParams
        });
        
        console.log('Fetched questions:', questionsRes.data);
        const realQuestions: Question[] = questionsRes.data
          .sort((a: Question, b: Question) => a.order - b.order); // Sort by order

        setQuestions(realQuestions);
        setResponses(
          realQuestions.map(q => ({
            question: q._id,
            answer: ''
          }))
        );

        // Fetch previous status update for current user and team (latest one)
        if (teamId && userRes.data) {
          const statusRes = await axios.get('/api/status', {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              user: userRes.data.id,
              team: teamId
            }
          });

          if (statusRes.data && statusRes.data.length > 0) {
            // Get the most recent status (first in the sorted array)
            setPreviousStatus(statusRes.data[0]);
          }
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

  // Check existing status when date or questions change
  useEffect(() => {
    if (currentUser && teamId && questions.length > 0) {
      checkExistingStatus(selectedDate);
    }
  }, [selectedDate, currentUser, teamId, questions]);

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

      if (!isDateAllowed(selectedDate)) {
        throw new Error('You can only add status for today or the last two days');
      }

      // Validate based on leave status
      if (isLeave) {
        if (!leaveReason.trim()) {
          throw new Error('Please provide a reason for leave');
        }
      } else {
        // Filter out empty responses for status updates
        const validResponses = responses.filter(r => r.answer.trim() !== '');
        if (validResponses.length === 0) {
          throw new Error('Please provide at least one response');
        }
      }

      const statusData = {
        team: teamId,
        user: currentUser.id || currentUser._id,
        date: selectedDate,
        isLeave,
        leaveReason: isLeave ? leaveReason : undefined,
        responses: isLeave ? [] : responses.filter(r => r.answer.trim() !== '')
      };

      console.log('Submitting status data:', statusData);

      const response = await axios.post('/api/status', statusData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 201) {
        alert(`${isLeave ? 'Leave' : 'Status'} updated successfully!`);
        
        // Refresh to check existing status
        await checkExistingStatus(selectedDate);
        
        // Refresh previous status (latest one)
        const statusRes = await axios.get('/api/status', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            user: currentUser.id,
            team: teamId
          }
        });

        if (statusRes.data && statusRes.data.length > 0) {
          setPreviousStatus(statusRes.data[0]);
        }
      }
    } catch (err: any) {
      console.error('Error submitting status:', err);
      setError(
        err.response?.data?.message || 
        err.response?.data?.errors?.[0]?.msg || 
        err.message || 
        `Failed to save ${isLeave ? 'leave' : 'status update'}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResponseChange = (questionId: string, answer: string) => {
    setResponses(prev =>
      prev.map(r =>
        r.question === questionId ? { ...r, answer } : r
      )
    );
  };

  const handleMultipleChoiceChange = (questionId: string, optionText: string, checked: boolean) => {
    const currentResponse = responses.find(r => r.question === questionId);
    let currentAnswers = currentResponse?.answer ? currentResponse.answer.split(', ') : [];
    
    if (checked) {
      if (!currentAnswers.includes(optionText)) {
        currentAnswers.push(optionText);
      }
    } else {
      currentAnswers = currentAnswers.filter(answer => answer !== optionText);
    }
    
    handleResponseChange(questionId, currentAnswers.join(', '));
  };

  const handleDateChange = (date: string) => {
    if (isDateAllowed(date)) {
      setSelectedDate(date);
      setError(null);
    } else {
      setError('You can only select today or the last two days');
    }
  };

  const handleLeaveToggle = (value: boolean) => {
    setIsLeave(value);
    if (value) {
      setLeaveReason('');
    } else {
      setLeaveReason('');
      // Reset responses when switching back to status mode
      if (!hasExistingStatus) {
        setResponses(questions.map(q => ({ question: q._id, answer: '' })));
      }
    }
  };

  const renderQuestionInput = (question: Question) => {
    const currentResponse = responses.find(r => r.question === question._id);
    const currentAnswer = currentResponse?.answer || '';

    switch (question.type) {
      case 'text':
        return (
          <textarea
            id={`question-${question._id}`}
            rows={3}
            className="shadow-sm block w-full focus:ring-blue-500 focus:border-blue-500 sm:text-sm border border-gray-300 rounded-md"
            value={currentAnswer}
            onChange={e => handleResponseChange(question._id, e.target.value)}
            placeholder="Enter your response..."
            disabled={hasExistingStatus}
          />
        );

      case 'single_choice':
        return (
          <div className="space-y-2">
            {question.options
              .sort((a, b) => a.order - b.order)
              .map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center">
                  <input
                    id={`question-${question._id}-option-${optionIndex}`}
                    name={`question-${question._id}`}
                    type="radio"
                    value={option.text}
                    checked={currentAnswer === option.text}
                    onChange={e => handleResponseChange(question._id, e.target.value)}
                    disabled={hasExistingStatus}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label
                    htmlFor={`question-${question._id}-option-${optionIndex}`}
                    className="ml-3 block text-sm font-medium text-gray-700"
                  >
                    {option.text}
                  </label>
                </div>
              ))}
          </div>
        );

      case 'multiple_choice':
        const currentAnswers = currentAnswer ? currentAnswer.split(', ') : [];
        return (
          <div className="space-y-2">
            {question.options
              .sort((a, b) => a.order - b.order)
              .map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center">
                  <input
                    id={`question-${question._id}-option-${optionIndex}`}
                    type="checkbox"
                    checked={currentAnswers.includes(option.text)}
                    onChange={e => handleMultipleChoiceChange(question._id, option.text, e.target.checked)}
                    disabled={hasExistingStatus}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor={`question-${question._id}-option-${optionIndex}`}
                    className="ml-3 block text-sm font-medium text-gray-700"
                  >
                    {option.text}
                  </label>
                </div>
              ))}
          </div>
        );

      default:
        return (
          <textarea
            id={`question-${question._id}`}
            rows={3}
            className="shadow-sm block w-full focus:ring-blue-500 focus:border-blue-500 sm:text-sm border border-gray-300 rounded-md"
            value={currentAnswer}
            onChange={e => handleResponseChange(question._id, e.target.value)}
            placeholder="Enter your response..."
            disabled={hasExistingStatus}
          />
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

  const dateConstraints = getDateConstraints();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Daily Status Update</h1>
        <span className="text-sm text-gray-500">
          {new Date().toLocaleDateString()}
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
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Select Date
            </label>
          </div>
          <input
            type="date"
            id="date"
            value={selectedDate}
            min={dateConstraints.min}
            max={dateConstraints.max}
            onChange={(e) => handleDateChange(e.target.value)}
            className="shadow-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          You can only add status for today and the last two days
        </p>
      </div>

      {/* Existing Status Warning */}
      {hasExistingStatus && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <p className="ml-3 text-sm text-yellow-700">
              You have already added a {existingStatusType} for this date. 
              You can view it below but cannot edit it.
            </p>
          </div>
        </div>
      )}

      {/* Leave/Status Toggle */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <input
              id="status-mode"
              name="mode"
              type="radio"
              checked={!isLeave}
              onChange={() => handleLeaveToggle(false)}
              disabled={hasExistingStatus}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label htmlFor="status-mode" className="ml-2 block text-sm font-medium text-gray-700">
              Status Update
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="leave-mode"
              name="mode"
              type="radio"
              checked={isLeave}
              onChange={() => handleLeaveToggle(true)}
              disabled={hasExistingStatus}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label htmlFor="leave-mode" className="ml-2 block text-sm font-medium text-gray-700 flex items-center">
              <Coffee className="h-4 w-4 mr-1" />
              Mark Leave
            </label>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {isLeave ? (
          /* Leave Reason Section */
          <div className="bg-white shadow-sm rounded-lg p-6">
            <label
              htmlFor="leave-reason"
              className="block text-sm font-medium text-gray-900 mb-2"
            >
              Leave Reason *
            </label>
            <textarea
              id="leave-reason"
              rows={3}
              className="shadow-sm block w-full focus:ring-blue-500 focus:border-blue-500 sm:text-sm border border-gray-300 rounded-md"
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="Please provide reason for leave..."
              disabled={hasExistingStatus}
              required
            />
          </div>
        ) : (
          /* Status Questions Section */
          <div className="bg-white shadow-sm rounded-lg divide-y divide-gray-200">
            {questions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No questions available for this team.
              </div>
            ) : (
              questions.map((question, index) => (
                <div key={question._id} className="p-6">
                  <label
                    htmlFor={`question-${question._id}`}
                    className="block text-sm font-medium text-gray-900 mb-3"
                  >
                    {index + 1}. {question.text}
                    {/* {question.type !== 'text' && (
                      <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {question.type === 'single_choice' ? 'Single Choice' : 'Multiple Choice'}
                      </span>
                    )} */}
                  </label>
                  <div className="mt-2">
                    {renderQuestionInput(question)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!hasExistingStatus && questions.length > 0 && (
          <div className="flex justify-end">
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
                  {isLeave ? 'Mark Leave' : 'Submit Update'}
                </>
              )}
            </button>
          </div>
        )}
      </form>

      {/* Previous Updates Preview */}
      {previousStatus && (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Latest Update
          </h2>
          
          {previousStatus.isLeave ? (
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Coffee className="h-5 w-5 text-orange-600 mr-2" />
                <h3 className="text-sm font-medium text-orange-800">Leave</h3>
              </div>
              <p className="text-sm text-orange-700">
                <strong>Reason:</strong> {previousStatus.leaveReason}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {previousStatus.responses.map((response, index) => (
                <div key={response.question._id} className="border-l-4 border-blue-200 pl-4">
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
          <p className="text-gray-500">No previous updates found.</p>
        </div>
      )}
    </div>
  );
};

export default StatusUpdate;