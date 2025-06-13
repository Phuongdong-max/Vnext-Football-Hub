
import React, { useState, useEffect } from 'react';
import { FootballMatch, League } from '../../types'; // Ensure League is imported
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { PlusCircleIcon, RefreshIcon } from '../icons'; // Added RefreshIcon for loading
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface CreateBettingRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiAvailable: boolean;
  leagues: League[];
  mockMatches: FootballMatch[]; 
  fetchMatchesFunction: (date: string, leagueCode: string) => Promise<FootballMatch[]>;
  onCreateRound: (matchToCreate: FootballMatch) => void;
  isDataLoading: boolean; // Parent's data loading state
}

export const CreateBettingRoundModal: React.FC<CreateBettingRoundModalProps> = ({ 
  isOpen, 
  onClose, 
  apiAvailable,
  leagues,
  mockMatches,
  fetchMatchesFunction,
  onCreateRound,
  isDataLoading: isParentDataLoading // Renamed to avoid conflict with local loading state
}) => {
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [matchesToDisplay, setMatchesToDisplay] = useState<FootballMatch[]>([]);
  const [currentLeagueCode, setCurrentLeagueCode] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default to today
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(false); // Local loading state for API calls within modal

  useEffect(() => {
    // Initialize matchesToDisplay based on apiAvailable when modal opens or apiAvailable changes
    if (isOpen) {
      if (!apiAvailable) {
        setMatchesToDisplay(mockMatches);
      } else {
        // If API is available, user needs to select league/date and click "Load"
        // Optionally, could pre-load matches for a default league/date here
        setMatchesToDisplay([]); 
      }
      // Reset selections when modal opens
      setSelectedMatchId('');
      setSearchTerm('');
      if (leagues.length > 0) {
        setCurrentLeagueCode(leagues[0].id); // Default to first league if available
      }
    }
  }, [isOpen, apiAvailable, mockMatches, leagues]);

  const handleLoadApiMatches = async () => {
    if (!currentLeagueCode || !currentDate) {
      alert("Please select a league and a date."); // Or use a toast
      return;
    }
    setIsLoadingMatches(true);
    setSelectedMatchId(''); // Reset selection when loading new matches
    try {
      const fetched = await fetchMatchesFunction(currentDate, currentLeagueCode);
      setMatchesToDisplay(fetched);
    } catch (error) {
      console.error("Error fetching matches in modal:", error);
      setMatchesToDisplay([]); // Clear display on error
      // Potentially add a toast here
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedMatchId) return;
    const selectedMatch = matchesToDisplay.find(m => m.id === selectedMatchId);
    if (selectedMatch) {
      onCreateRound(selectedMatch);
      // Reset state for next time (handled by useEffect on isOpen mostly)
      onClose(); // Close modal after creation
    } else {
      console.error("Selected match not found in displayed list.");
      // Add a toast for error
    }
  };

  const filteredMatches = matchesToDisplay.filter(match =>
    match.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.awayTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.league.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New BettingRound" size="lg">
      <div className="space-y-4">
        {apiAvailable && (
          <div className="p-4 border border-gray-200 rounded-md space-y-3 bg-gray-50">
            <h4 className="text-md font-semibold text-textPrimary">Fetch Matches from API</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="leagueSelectApi" className="block text-sm font-medium text-textPrimary mb-1">Select League:</label>
                <select
                  id="leagueSelectApi"
                  value={currentLeagueCode}
                  onChange={(e) => setCurrentLeagueCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  disabled={leagues.length === 0 || isLoadingMatches || isParentDataLoading}
                >
                  <option value="" disabled>-- Select League --</option>
                  {leagues.map(league => (
                    <option key={league.id} value={league.id}>{league.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dateSelectApi" className="block text-sm font-medium text-textPrimary mb-1">Select Date:</label>
                <input
                  type="date"
                  id="dateSelectApi"
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  disabled={isLoadingMatches || isParentDataLoading}
                />
              </div>
            </div>
            <Button 
              onClick={handleLoadApiMatches} 
              disabled={!currentLeagueCode || !currentDate || isLoadingMatches || isParentDataLoading}
              fullWidth
              variant="secondary"
            >
              {isLoadingMatches ? <LoadingSpinner size="sm" className="mr-2" /> : <RefreshIcon className="w-5 h-5 mr-2"/>}
              Load Matches from API
            </Button>
          </div>
        )}
        
        {!apiAvailable && (
          <p className="text-sm text-textSecondary italic">API not available. Using pre-loaded mock matches.</p>
        )}

        <div>
          <label htmlFor="matchSearch" className="block text-sm font-medium text-textPrimary mb-1">Search Loaded Matches (Team or League):</label>
          <input
            type="text"
            id="matchSearch"
            placeholder="e.g., Manchester United, Premier League"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
        
        <div>
          <label htmlFor="matchSelect" className="block text-sm font-medium text-textPrimary mb-1">
            Select Match ({apiAvailable ? "from API results" : "from Mock Data"}):
          </label>
          {(isLoadingMatches) && <div className="text-center py-2"><LoadingSpinner /> <span className="ml-2">Loading matches...</span></div>}
          {(!isLoadingMatches && filteredMatches.length === 0) && (
             <p className="text-sm text-textSecondary text-center py-2">
                {matchesToDisplay.length === 0 && apiAvailable ? "Load matches using league/date filters above." : 
                 matchesToDisplay.length === 0 && !apiAvailable ? "No mock matches available." :
                `No matches found for "${searchTerm}". Try another search or broaden criteria.`}
            </p>
          )}
          <select
            id="matchSelect"
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            disabled={filteredMatches.length === 0 || isLoadingMatches}
            size={Math.min(5, Math.max(1,filteredMatches.length))} // Show a few items if list is populated
          >
            <option value="" disabled>-- Select a Match --</option>
            {filteredMatches.map(match => (
              <option key={match.id} value={match.id}>
                {new Date(match.startTime).toLocaleDateString()} @ {new Date(match.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {match.homeTeam} vs {match.awayTeam} ({match.league})
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedMatchId || isLoadingMatches || isParentDataLoading}>
            <PlusCircleIcon className="w-5 h-5 mr-2"/>
            Create Round
          </Button>
        </div>
      </div>
    </Modal>
  );
};
