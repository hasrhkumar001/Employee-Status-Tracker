import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Users } from 'lucide-react';

interface Team {
  _id: string;
  name: string;
  project?: {
    _id: string;
    name: string;
  };
}

interface Question {
  _id: string;
  text: string;
  isCommon: boolean;
  teams: {
    _id: string;
    name: string;
  }[];
}

const ManageQuestionTeams: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setInitialLoading(true);
        
        // Fetch question and teams in parallel
        const [questionRes, teamsRes] = await Promise.all([
          fetch(`/api/questions/${id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }),
          fetch('/api/teams', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
        ]);

        if (!questionRes.ok) {
          throw new Error('Failed to fetch question');
        }

        const questionData = await questionRes.json();
        const teamsData = teamsRes.ok ? await teamsRes.json() : [];

        // Check if question is common (shouldn't allow team management for common questions)
        if (questionData.isCommon) {
          navigate('/admin/questions');
          return;
        }

        setQuestion(questionData);
        setTeams(teamsData);
        setSelectedTeams(questionData.teams.map((team: any) => team._id));
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data');
      } finally {
        setInitialLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/questions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getToken()}`
        },
        body: JSON.stringify({
          text: question?.text,
          isCommon: question?.isCommon,
          teams: selectedTeams,
          order: question?.order || 0,
          active: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update question teams');
      }

      navigate('/admin/questions');
    } catch (err: any) {
      setError(err.message || 'Failed to update question teams');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamChange = (teamId: string, checked: boolean) => {
    setSelectedTeams(prev => 
      checked 
        ? [...prev, teamId]
        : prev.filter(id => id !== teamId)
    );
  };

  const selectAllTeams = () => {
    setSelectedTeams(teams.map(team => team._id));
  };

  const deselectAllTeams = () => {
    setSelectedTeams([]);
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !question) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/questions')}
            className="inline-flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Questions
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Manage Teams</h1>
        </div>
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => navigate('/admin/questions')}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Go back to questions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/admin/questions')}
          className="inline-flex items-center text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Questions
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manage Teams</h1>
          <p className="text-sm text-gray-600 mt-1">
            Assign teams to: "{question?.text}"
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                <Users size={16} className="inline mr-2" />
                Select Teams
              </label>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={selectAllTeams}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  type="button"
                  onClick={deselectAllTeams}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Deselect All
                </button>
              </div>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto border border-gray-200 rounded-md p-4">
              {teams.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No teams available
                </p>
              ) : (
                teams.map(team => (
                  <div key={team._id} className="flex items-center justify-between p-3 border border-gray-100 rounded-md hover:bg-gray-50">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`team-${team._id}`}
                        checked={selectedTeams.includes(team._id)}
                        onChange={(e) => handleTeamChange(team._id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`team-${team._id}`} className="ml-3 cursor-pointer">
                        <div className="text-sm font-medium text-gray-900">
                          {team.name}
                        </div>
                        {team.project && (
                          <div className="text-xs text-gray-500">
                            Project: {team.project.name}
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-3 text-sm text-gray-600">
              {selectedTeams.length} of {teams.length} teams selected
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/admin/questions')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save size={16} className="mr-2" />
              )}
              {loading ? 'Updating...' : 'Save Teams'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManageQuestionTeams;