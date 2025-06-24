import React, { useState, useEffect, useCallback } from 'react';
import { FootballMatch, League } from '../../types';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { PlusCircleIcon, RefreshIcon, PencilAltIcon, ListBulletIcon } from '../icons';
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface CreateBettingRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiAvailable: boolean;
  leagues: League[];
  fetchMatchesFunction: (date: string, leagueCode: string) => Promise<FootballMatch[]>;
  onCreateRound: (matchToCreate: FootballMatch) => void;
  isDataLoading: boolean; 
}

type CreationMode = 'api' | 'manual';

export const CreateBettingRoundModal: React.FC<CreateBettingRoundModalProps> = ({
  isOpen,
  onClose,
  apiAvailable,
  leagues,
  fetchMatchesFunction,
  onCreateRound,
  isDataLoading: isParentDataLoading,
}) => {
  const [creationMode, setCreationMode] = useState<CreationMode>('api');

  const [selectedApiMatchId, setSelectedApiMatchId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [apiSelectableMatches, setApiSelectableMatches] = useState<FootballMatch[]>([]);
  const [currentLeagueCode, setCurrentLeagueCode] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoadingApiMatches, setIsLoadingApiMatches] = useState<boolean>(false);

  const [manualHomeTeam, setManualHomeTeam] = useState<string>('');
  const [manualAwayTeam, setManualAwayTeam] = useState<string>('');
  const [manualStartTime, setManualStartTime] = useState<string>('');
  const [manualLeague, setManualLeague] = useState<string>('');
  const [manualInputError, setManualInputError] = useState<string>('');

  const resetModalState = useCallback(() => {
    setSelectedApiMatchId('');
    setSearchTerm('');
    setApiSelectableMatches([]);
    
    if (leagues.length > 0) {
      setCurrentLeagueCode(leagues[0].id);
    } else {
      setCurrentLeagueCode('');
    }
    setCurrentDate(new Date().toISOString().split('T')[0]);
    
    setManualHomeTeam('');
    setManualAwayTeam('');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    setManualStartTime(tomorrow.toISOString().slice(0, 16));
    setManualLeague('');
    setManualInputError('');
    setCreationMode(apiAvailable ? 'api' : 'manual');
  }, [apiAvailable, leagues]);

  useEffect(() => {
    if (isOpen) {
      resetModalState();
    }
  }, [isOpen, resetModalState]);

  const handleLoadApiMatches = async () => {
    if (!currentLeagueCode || !currentDate) {
      alert("Please select a league and a date.");
      return;
    }
    if (!apiAvailable) { 
        setApiSelectableMatches([]);
        return;
    }
    setIsLoadingApiMatches(true);
    setSelectedApiMatchId('');
    try {
      const fetchedMatches = await fetchMatchesFunction(currentDate, currentLeagueCode);
      setApiSelectableMatches(fetchedMatches); 
    } catch (error) {
      console.error("Error fetching matches in modal:", error);
      setApiSelectableMatches([]); 
    } finally {
      setIsLoadingApiMatches(false);
    }
  };

  const validateManualInputs = (): boolean => {
    if (!manualHomeTeam.trim() || !manualAwayTeam.trim() || !manualStartTime || !manualLeague.trim()) {
      setManualInputError('All fields are required for manual match creation.');
      return false;
    }
    if (new Date(manualStartTime) <= new Date()) {
      setManualInputError('Match start time must be in the future.');
      return false;
    }
    setManualInputError('');
    return true;
  };

  const handleSubmit = () => {
    if (creationMode === 'api') {
      if (!selectedApiMatchId) return;
      const selectedMatch = apiSelectableMatches.find(m => m.id === selectedApiMatchId);
      if (selectedMatch) {
        onCreateRound(selectedMatch);
        onClose();
      } else {
        alert("Selected match not found. Please re-select or load matches again.");
      }
    } else { 
      if (!validateManualInputs()) return;
      const newManualMatch: FootballMatch = {
        id: `manual_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        homeTeam: manualHomeTeam.trim(),
        awayTeam: manualAwayTeam.trim(),
        startTime: new Date(manualStartTime),
        league: manualLeague.trim(),
      };
      onCreateRound(newManualMatch);
      onClose();
    }
  };

  const filteredMatchesForSelection = apiSelectableMatches.filter(match =>
    match.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.awayTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.league.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  
  const inputBaseClasses = "w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-surface dark:bg-slate-700 text-textPrimary dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500";
  const selectBaseClasses = `${inputBaseClasses} appearance-none`; // for custom arrow if needed later

  const renderApiMode = () => (
    <>
      {apiAvailable && (
        <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-md space-y-3 bg-gray-50 dark:bg-slate-800/60">
          <h4 className="text-md font-semibold text-textPrimary">Fetch Matches from API</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="leagueSelectApi" className="block text-sm font-medium text-textPrimary mb-1">Select League:</label>
              <select
                id="leagueSelectApi"
                value={currentLeagueCode}
                onChange={(e) => setCurrentLeagueCode(e.target.value)}
                className={selectBaseClasses}
                disabled={leagues.length === 0 || isLoadingApiMatches || isParentDataLoading}
              >
                <option value="" disabled className="text-gray-500 dark:text-slate-500">-- Select League --</option>
                {leagues.map(league => (
                  <option key={league.id} value={league.id} className="text-textPrimary dark:text-slate-100">{league.name}</option>
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
                className={`${inputBaseClasses} dark:[color-scheme:dark]`}
                disabled={isLoadingApiMatches || isParentDataLoading}
              />
            </div>
          </div>
          <Button
            onClick={handleLoadApiMatches}
            disabled={!currentLeagueCode || !currentDate || isLoadingApiMatches || isParentDataLoading}
            fullWidth
            variant="secondary"
          >
            {isLoadingApiMatches ? <LoadingSpinner size="sm" className="mr-2" /> : <RefreshIcon className="w-5 h-5 mr-2"/>}
            Load Matches from API
          </Button>
        </div>
      )}

      {!apiAvailable && creationMode === 'api' && (
        <p className="text-sm text-yellow-700 dark:text-yellow-300 italic p-3 bg-yellow-100 dark:bg-yellow-700/30 border border-yellow-200 dark:border-yellow-600/50 rounded-md">
            Live API selection is not available. Please use "Enter Manually" or ensure the API is configured.
        </p>
      )}

      {apiAvailable && creationMode === 'api' && ( 
        <>
          <div>
            <label htmlFor="matchSearch" className="block text-sm font-medium text-textPrimary mb-1 mt-3">Search Loaded Matches:</label>
            <input
              type="text"
              id="matchSearch"
              placeholder="e.g., Manchester United, Premier League"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={inputBaseClasses}
              disabled={!apiSelectableMatches.length && !isLoadingApiMatches}
            />
          </div>

          <div>
            <label htmlFor="matchSelect" className="block text-sm font-medium text-textPrimary mb-1 mt-2">
              Select Match (from API results):
            </label>
            {(isLoadingApiMatches) && <div className="text-center py-2 text-textSecondary"><LoadingSpinner /> <span className="ml-2">Loading API matches...</span></div>}
            {(!isLoadingApiMatches && apiSelectableMatches.length === 0 && !searchTerm) && (
              <p className="text-sm text-textSecondary text-center py-2 italic p-3 bg-gray-50 dark:bg-slate-700/50 rounded-md">
                  No matches loaded. Use filters above to load matches from the API.
              </p>
            )}
            {(!isLoadingApiMatches && apiSelectableMatches.length > 0 && filteredMatchesForSelection.length === 0 && searchTerm) && (
              <p className="text-sm text-textSecondary text-center py-2 italic p-3 bg-gray-50 dark:bg-slate-700/50 rounded-md">
                  No matches found for "{searchTerm}". Try another search term.
              </p>
            )}
            <select
              id="matchSelect"
              value={selectedApiMatchId}
              onChange={(e) => setSelectedApiMatchId(e.target.value)}
              className={`${selectBaseClasses} overflow-y-auto`} // Changed from overflow-x-auto
              disabled={filteredMatchesForSelection.length === 0 || isLoadingApiMatches}
              size={Math.min(5, Math.max(1,filteredMatchesForSelection.length || 1))}
            >
              <option value="" disabled className="text-gray-500 dark:text-slate-500">-- Select a Match --</option>
              {filteredMatchesForSelection.map(match => (
                <option key={match.id} value={match.id} className="text-textPrimary dark:text-slate-200 p-1.5 hover:bg-primary/10">
                  {new Date(match.startTime).toLocaleDateString()} @ {new Date(match.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {match.homeTeam} vs {match.awayTeam} ({match.league})
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </>
  );

  const renderManualMode = () => (
    <div className="space-y-3 p-4 border border-gray-200 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800/60">
      <h4 className="text-md font-semibold text-textPrimary mb-2">Enter Match Details Manually</h4>
      <div>
        <label htmlFor="manualHomeTeam" className="block text-sm font-medium text-textPrimary mb-1">Home Team:</label>
        <input type="text" id="manualHomeTeam" value={manualHomeTeam} onChange={(e) => setManualHomeTeam(e.target.value)}
               className={inputBaseClasses} placeholder="e.g., Local Heroes FC" />
      </div>
      <div>
        <label htmlFor="manualAwayTeam" className="block text-sm font-medium text-textPrimary mb-1">Away Team:</label>
        <input type="text" id="manualAwayTeam" value={manualAwayTeam} onChange={(e) => setManualAwayTeam(e.target.value)}
               className={inputBaseClasses} placeholder="e.g., Visiting Stars" />
      </div>
      <div>
        <label htmlFor="manualStartTime" className="block text-sm font-medium text-textPrimary mb-1">Start Time:</label>
        <input type="datetime-local" id="manualStartTime" value={manualStartTime} onChange={(e) => setManualStartTime(e.target.value)}
               className={`${inputBaseClasses} dark:[color-scheme:dark]`} />
      </div>
      <div>
        <label htmlFor="manualLeague" className="block text-sm font-medium text-textPrimary mb-1">League Name:</label>
        <input type="text" id="manualLeague" value={manualLeague} onChange={(e) => setManualLeague(e.target.value)}
               className={inputBaseClasses} placeholder="e.g., Sunday League Division 1" />
      </div>
      {manualInputError && <p className="text-sm text-danger">{manualInputError}</p>}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Betting Round" size="lg">
      <div className="space-y-4">
        <div className="flex space-x-2 border-b border-border pb-3 mb-3">
            <Button 
                onClick={() => setCreationMode('api')} 
                variant={creationMode === 'api' ? 'primary' : 'outline'}
                size="sm"
                disabled={!apiAvailable} 
                title={!apiAvailable ? "API selection not available" : "Select from list"}
            >
                <ListBulletIcon className="w-4 h-4 mr-2"/> Select from List
            </Button>
            <Button 
                onClick={() => setCreationMode('manual')} 
                variant={creationMode === 'manual' ? 'primary' : 'outline'}
                size="sm"
            >
                <PencilAltIcon className="w-4 h-4 mr-2"/> Enter Manually
            </Button>
        </div>

        {creationMode === 'api' ? renderApiMode() : renderManualMode()}
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-4">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              (creationMode === 'api' && (!selectedApiMatchId || !apiAvailable)) || 
              (creationMode === 'manual' && (!manualHomeTeam || !manualAwayTeam || !manualStartTime || !manualLeague)) || 
              isLoadingApiMatches || 
              isParentDataLoading 
            }
          >
            <PlusCircleIcon className="w-5 h-5 mr-2"/>
            Create Round
          </Button>
        </div>
      </div>
    </Modal>
  );
};