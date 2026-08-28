
import React, { useState, useEffect, useCallback } from 'react';
import { FootballMatch, League, OddsData } from '../../types';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { PlusCircleIcon, RefreshIcon, PencilAltIcon, ListBulletIcon, CloudIcon, DatabaseIcon } from '../icons';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppContext } from '../../contexts/AppContext';
import { 
  fetchAvailableLeaguesFootballData, 
  fetchMatchesByDateAndLeague,
  fetchLeaguesFromOddsApi,
  fetchMatchesFromOddsApi,
  checkIsFootballDataApiAvailable,
  checkIsTheOddsApiAvailable
} from '../../services/footballApiService';

interface CreateBettingRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  leagues: League[]; 
  fetchMatchesFunction: (date: string, leagueCode: string) => Promise<FootballMatch[]>; 
  onCreateRound: (matchToCreate: FootballMatch) => void;
  isDataLoading: boolean; 
}

type CreationMode = 'api' | 'manual';
type ApiSource = 'football-data.org' | 'the-odds-api';

const getDefaultOddsApiDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().split('T')[0];
};

export const CreateBettingRoundModal: React.FC<CreateBettingRoundModalProps> = ({
  isOpen,
  onClose,
  onCreateRound,
  isDataLoading: isParentDataLoading,
}) => {
  const { translate } = useLanguage();
  const { addToast } = useAppContext();

  const [creationMode, setCreationMode] = useState<CreationMode>('api');
  const [selectedApiSource, setSelectedApiSource] = useState<ApiSource>('football-data.org');
  
  const [availableLeagues, setAvailableLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(''); 

  const [currentFootballDataDate, setCurrentFootballDataDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [oddsApiCommenceTimeToDate, setOddsApiCommenceTimeToDate] = useState<string>(getDefaultOddsApiDate());
  
  const [apiSelectableMatches, setApiSelectableMatches] = useState<FootballMatch[]>([]);
  const [selectedApiMatchInternalId, setSelectedApiMatchInternalId] = useState<string>(''); 
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [isLoadingLeagues, setIsLoadingLeagues] = useState<boolean>(false);
  const [isLoadingApiMatches, setIsLoadingApiMatches] = useState<boolean>(false);
  const [apiSelectionError, setApiSelectionError] = useState<string>('');

  const [manualHomeTeam, setManualHomeTeam] = useState<string>('');
  const [manualAwayTeam, setManualAwayTeam] = useState<string>('');
  const [manualStartTime, setManualStartTime] = useState<string>('');
  const [manualLeagueName, setManualLeagueName] = useState<string>('');
  const [manualInputError, setManualInputError] = useState<string>('');

  const isFootballDataApiConfigured = checkIsFootballDataApiAvailable();
  const isTheOddsApiConfigured = checkIsTheOddsApiAvailable();

  const resetModalState = useCallback(() => {
    setCreationMode('api');
    setSelectedApiSource(isFootballDataApiConfigured ? 'football-data.org' : (isTheOddsApiConfigured ? 'the-odds-api' : 'football-data.org'));
    
    setAvailableLeagues([]);
    setSelectedLeagueId('');
    setCurrentFootballDataDate(new Date().toISOString().split('T')[0]);
    setOddsApiCommenceTimeToDate(getDefaultOddsApiDate());
    
    setApiSelectableMatches([]);
    setSelectedApiMatchInternalId('');
    setSearchTerm('');
    setApiSelectionError('');
    
    setManualHomeTeam('');
    setManualAwayTeam('');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    setManualStartTime(tomorrow.toISOString().slice(0, 16));
    setManualLeagueName('');
    setManualInputError('');
  }, [isFootballDataApiConfigured, isTheOddsApiConfigured]);

  useEffect(() => {
    if (isOpen) {
      resetModalState();
    }
  }, [isOpen, resetModalState]);

  useEffect(() => {
    if (!isOpen || creationMode !== 'api') return;

    const loadLeagues = async () => {
      setIsLoadingLeagues(true);
      setAvailableLeagues([]);
      setSelectedLeagueId('');
      setApiSelectableMatches([]); 
      setSelectedApiMatchInternalId('');
      try {
        let fetchedLeagues: League[] = [];
        if (selectedApiSource === 'football-data.org' && isFootballDataApiConfigured) {
          fetchedLeagues = await fetchAvailableLeaguesFootballData();
        } else if (selectedApiSource === 'the-odds-api' && isTheOddsApiConfigured) {
          fetchedLeagues = await fetchLeaguesFromOddsApi();
        }
        setAvailableLeagues(fetchedLeagues);
        if (fetchedLeagues.length > 0) {
          setSelectedLeagueId(fetchedLeagues[0].id); 
        } else {
            addToast(translate('createBettingRoundModal.info.noLeaguesForSource', {sourceName: selectedApiSource }), 'info');
        }
      } catch (error) {
        console.error(`Error fetching leagues for ${selectedApiSource}:`, error);
        addToast(translate('createBettingRoundModal.error.fetchLeaguesFailed', { sourceName: selectedApiSource, errorMessage: (error as Error).message }), 'error');
      } finally {
        setIsLoadingLeagues(false);
      }
    };
    loadLeagues();
  }, [isOpen, creationMode, selectedApiSource, addToast, translate, isFootballDataApiConfigured, isTheOddsApiConfigured]);


  const handleLoadApiMatches = async () => {
    setApiSelectionError('');
    if (!selectedLeagueId) {
      setApiSelectionError(translate('createBettingRoundModal.error.selectLeague'));
      return;
    }
    
    setIsLoadingApiMatches(true);
    setSelectedApiMatchInternalId('');
    setApiSelectableMatches([]);

    try {
      let fetchedMatches: FootballMatch[] = [];
      if (selectedApiSource === 'football-data.org' && isFootballDataApiConfigured) {
        if (!currentFootballDataDate) {
          setApiSelectionError(translate('createBettingRoundModal.error.selectDate'));
          setIsLoadingApiMatches(false);
          return;
        }
        fetchedMatches = await fetchMatchesByDateAndLeague(currentFootballDataDate, selectedLeagueId);
      } else if (selectedApiSource === 'the-odds-api' && isTheOddsApiConfigured) {
        if (!oddsApiCommenceTimeToDate) {
          setApiSelectionError(translate('createBettingRoundModal.error.selectDateOddsApi'));
          setIsLoadingApiMatches(false);
          return;
        }
        fetchedMatches = await fetchMatchesFromOddsApi(selectedLeagueId, oddsApiCommenceTimeToDate); 
      }
      setApiSelectableMatches(fetchedMatches);
      if(fetchedMatches.length === 0){
        addToast(translate('createBettingRoundModal.info.noMatchesFoundForLeague', { leagueName: availableLeagues.find(l => l.id === selectedLeagueId)?.name || selectedLeagueId }), 'info');
      }
    } catch (error) {
      console.error("Error fetching matches in modal:", error);
      setApiSelectableMatches([]); 
      addToast(translate('createBettingRoundModal.error.fetchMatchesGeneric', {errorMessage: (error as Error).message}), 'error');
    } finally {
      setIsLoadingApiMatches(false);
    }
  };

  const validateManualInputs = (): boolean => {
    if (!manualHomeTeam.trim() || !manualAwayTeam.trim() || !manualStartTime || !manualLeagueName.trim()) {
      setManualInputError(translate('createBettingRoundModal.error.manualAllFieldsRequired'));
      return false;
    }
    if (new Date(manualStartTime) <= new Date()) {
      setManualInputError(translate('createBettingRoundModal.error.manualStartTimeInFuture'));
      return false;
    }
    setManualInputError('');
    return true;
  };

  const handleSubmit = () => {
    setApiSelectionError(''); 
    setManualInputError(''); 
    
    if (creationMode === 'api') {
      if (!selectedApiMatchInternalId) {
        setApiSelectionError(translate('createBettingRoundModal.error.selectMatchFromApi'));
        return;
      }
      const selectedMatch = apiSelectableMatches.find(m => m.id === selectedApiMatchInternalId); 
      if (selectedMatch) {
        onCreateRound(selectedMatch); 
        onClose();
      } else {
        setApiSelectionError(translate('createBettingRoundModal.error.selectedMatchNotFound'));
      }
    } else { 
      if (!validateManualInputs()) return;
      const newManualMatch: FootballMatch = {
        id: `manual_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        homeTeam: manualHomeTeam.trim(),
        awayTeam: manualAwayTeam.trim(),
        startTime: new Date(manualStartTime),
        league: manualLeagueName.trim(),
        apiSource: 'manual', 
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
  const selectBaseClasses = `${inputBaseClasses} appearance-none`;

  const renderApiMode = () => (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-textPrimary mb-1">{translate('createBettingRoundModal.api.selectSourceLabel')}</label>
        <div className="flex space-x-2">
          {isFootballDataApiConfigured && (
            <Button 
              onClick={() => setSelectedApiSource('football-data.org')}
              variant={selectedApiSource === 'football-data.org' ? 'primary' : 'outline'}
              size="sm"
              disabled={isLoadingLeagues || isLoadingApiMatches || isParentDataLoading}
            >
              <DatabaseIcon className="w-4 h-4 mr-2" /> Football-Data.org
            </Button>
          )}
          {isTheOddsApiConfigured && (
            <Button 
              onClick={() => setSelectedApiSource('the-odds-api')}
              variant={selectedApiSource === 'the-odds-api' ? 'primary' : 'outline'}
              size="sm"
              disabled={isLoadingLeagues || isLoadingApiMatches || isParentDataLoading}
            >
              <CloudIcon className="w-4 h-4 mr-2" /> The Odds API
            </Button>
          )}
        </div>
        {!isFootballDataApiConfigured && !isTheOddsApiConfigured && (
             <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">{translate('createBettingRoundModal.warning.noApisConfigured')}</p>
        )}
      </div>

      <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-2xl space-y-3 bg-black/5 dark:bg-white/5">
        <h4 className="text-md font-semibold text-textPrimary">
          {translate(selectedApiSource === 'football-data.org' ? 'createBettingRoundModal.api.titleFootballData' : 'createBettingRoundModal.api.titleTheOddsApi')}
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label htmlFor="leagueSelectApi" className="block text-sm font-medium text-textPrimary mb-1">{translate('createBettingRoundModal.api.selectLeagueLabel')}</label>
            <select
              id="leagueSelectApi"
              value={selectedLeagueId}
              onChange={(e) => { setSelectedLeagueId(e.target.value); setApiSelectableMatches([]); setSelectedApiMatchInternalId(''); }}
              className={selectBaseClasses}
              disabled={availableLeagues.length === 0 || isLoadingLeagues || isLoadingApiMatches || isParentDataLoading}
            >
              <option value="" disabled className="text-gray-500 dark:text-slate-500">{translate('createBettingRoundModal.api.selectLeagueDefault')}</option>
              {availableLeagues.map(league => (
                <option key={league.id} value={league.id} className="text-textPrimary dark:text-slate-100">{league.name}</option>
              ))}
            </select>
            {isLoadingLeagues && <p className="text-xs text-textSecondary mt-1"><LoadingSpinner size="sm" /> {translate('createBettingRoundModal.api.loadingLeagues')}</p>}
          </div>

          {selectedApiSource === 'football-data.org' && (
            <div>
              <label htmlFor="dateSelectApiFootballData" className="block text-sm font-medium text-textPrimary mb-1">{translate('createBettingRoundModal.api.selectDateLabel')}</label>
              <input
                type="date"
                id="dateSelectApiFootballData"
                value={currentFootballDataDate}
                onChange={(e) => { setCurrentFootballDataDate(e.target.value); setApiSelectableMatches([]); setSelectedApiMatchInternalId('');}}
                className={`${inputBaseClasses} dark:[color-scheme:dark]`}
                disabled={isLoadingLeagues || isLoadingApiMatches || isParentDataLoading}
              />
            </div>
          )}

          {selectedApiSource === 'the-odds-api' && (
             <div>
              <label htmlFor="dateSelectApiOddsApi" className="block text-sm font-medium text-textPrimary mb-1">{translate('createBettingRoundModal.api.selectDateOddsApiLabel')}</label>
              <input
                type="date"
                id="dateSelectApiOddsApi"
                value={oddsApiCommenceTimeToDate}
                onChange={(e) => { setOddsApiCommenceTimeToDate(e.target.value); setApiSelectableMatches([]); setSelectedApiMatchInternalId('');}}
                className={`${inputBaseClasses} dark:[color-scheme:dark]`}
                disabled={isLoadingLeagues || isLoadingApiMatches || isParentDataLoading}
              />
            </div>
          )}
          
          <div className={(selectedApiSource === 'football-data.org' || selectedApiSource === 'the-odds-api') ? '' : 'sm:col-span-2'}>
             <Button
                onClick={handleLoadApiMatches}
                disabled={
                    !selectedLeagueId || 
                    isLoadingLeagues || 
                    isLoadingApiMatches || 
                    isParentDataLoading || 
                    (selectedApiSource === 'football-data.org' && !currentFootballDataDate) ||
                    (selectedApiSource === 'the-odds-api' && !oddsApiCommenceTimeToDate)
                }
                fullWidth
                variant="secondary"
             >
                {isLoadingApiMatches ? <LoadingSpinner size="sm" className="mr-2" /> : <RefreshIcon className="w-5 h-5 mr-2"/>}
                {translate('createBettingRoundModal.api.button.loadMatches')}
             </Button>
          </div>
        </div>
        {apiSelectionError && 
            (
                !selectedLeagueId || 
                (selectedApiSource === 'football-data.org' && !currentFootballDataDate) ||
                (selectedApiSource === 'the-odds-api' && !oddsApiCommenceTimeToDate)
            ) && 
            <p className="text-sm text-danger mt-1">{apiSelectionError}</p>
        }
      </div>

      <>
        <div>
          <label htmlFor="matchSearch" className="block text-sm font-medium text-textPrimary mb-1 mt-3">{translate('createBettingRoundModal.api.searchMatchesLabel')}</label>
          <input
            type="text"
            id="matchSearch"
            placeholder={translate('createBettingRoundModal.api.searchMatchesPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={inputBaseClasses}
            disabled={!apiSelectableMatches.length && !isLoadingApiMatches}
          />
        </div>

        <div>
          <label htmlFor="matchSelect" className="block text-sm font-medium text-textPrimary mb-1 mt-2">
            {translate('createBettingRoundModal.api.selectMatchLabel')}
          </label>
          {(isLoadingApiMatches) && <div className="text-center py-2 text-textSecondary"><LoadingSpinner /> <span className="ml-2">{translate('createBettingRoundModal.api.loadingMatches')}</span></div>}
          {(!isLoadingApiMatches && apiSelectableMatches.length === 0 && !apiSelectionError && !isLoadingLeagues) && ( 
            <p className="text-sm text-textSecondary text-center py-2 italic p-3 bg-black/5 dark:bg-white/5 rounded-2xl">
                {selectedLeagueId ? translate('createBettingRoundModal.api.noMatchesLoadedOrFound') : translate('createBettingRoundModal.api.selectLeagueFirst') }
            </p>
          )}
          {(!isLoadingApiMatches && apiSelectableMatches.length > 0 && filteredMatchesForSelection.length === 0 && searchTerm) && (
            <p className="text-sm text-textSecondary text-center py-2 italic p-3 bg-black/5 dark:bg-white/5 rounded-2xl">
                {translate('createBettingRoundModal.api.noMatchesFoundForSearch', { searchTerm })}
            </p>
          )}
          <select
            id="matchSelect"
            value={selectedApiMatchInternalId}
            onChange={(e) => setSelectedApiMatchInternalId(e.target.value)}
            className={`${selectBaseClasses} overflow-y-auto`}
            disabled={filteredMatchesForSelection.length === 0 || isLoadingApiMatches}
            size={Math.min(5, Math.max(1,filteredMatchesForSelection.length || 1))}
          >
            <option value="" disabled className="text-gray-500 dark:text-slate-500">{translate('createBettingRoundModal.api.selectMatchDefault')}</option>
            {filteredMatchesForSelection.map(match => (
              <option key={match.id} value={match.id} className="text-textPrimary dark:text-slate-200 p-1.5 hover:bg-primary/10">
                {new Date(match.startTime).toLocaleDateString()} @ {new Date(match.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {match.homeTeam} vs {match.awayTeam} ({match.league})
              </option>
            ))}
          </select>
          {apiSelectionError && !selectedApiMatchInternalId && <p className="text-sm text-danger mt-1">{apiSelectionError}</p>}
        </div>
      </>
    </>
  );

  const renderManualMode = () => (
    <div className="space-y-3 p-4 border border-gray-200 dark:border-slate-700 rounded-2xl bg-black/5 dark:bg-white/5">
      <h4 className="text-md font-semibold text-textPrimary mb-2">{translate('createBettingRoundModal.manual.title')}</h4>
      <div>
        <label htmlFor="manualHomeTeam" className="block text-sm font-medium text-textPrimary mb-1">{translate('createBettingRoundModal.manual.homeTeamLabel')}</label>
        <input type="text" id="manualHomeTeam" value={manualHomeTeam} onChange={(e) => setManualHomeTeam(e.target.value)}
               className={inputBaseClasses} placeholder={translate('createBettingRoundModal.manual.homeTeamPlaceholder')} />
      </div>
      <div>
        <label htmlFor="manualAwayTeam" className="block text-sm font-medium text-textPrimary mb-1">{translate('createBettingRoundModal.manual.awayTeamLabel')}</label>
        <input type="text" id="manualAwayTeam" value={manualAwayTeam} onChange={(e) => setManualAwayTeam(e.target.value)}
               className={inputBaseClasses} placeholder={translate('createBettingRoundModal.manual.awayTeamPlaceholder')} />
      </div>
      <div>
        <label htmlFor="manualStartTime" className="block text-sm font-medium text-textPrimary mb-1">{translate('createBettingRoundModal.manual.startTimeLabel')}</label>
        <input type="datetime-local" id="manualStartTime" value={manualStartTime} onChange={(e) => setManualStartTime(e.target.value)}
               className={`${inputBaseClasses} dark:[color-scheme:dark]`} />
      </div>
      <div>
        <label htmlFor="manualLeague" className="block text-sm font-medium text-textPrimary mb-1">{translate('createBettingRoundModal.manual.leagueNameLabel')}</label>
        <input type="text" id="manualLeague" value={manualLeagueName} onChange={(e) => setManualLeagueName(e.target.value)}
               className={inputBaseClasses} placeholder={translate('createBettingRoundModal.manual.leagueNamePlaceholder')} />
      </div>
      {manualInputError && <p className="text-sm text-danger">{manualInputError}</p>}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={translate('createBettingRoundModal.title')} size="lg">
      <div className="space-y-4">
        <div className="flex space-x-2 border-b border-border pb-3 mb-3">
            <Button 
                onClick={() => setCreationMode('api')} 
                variant={creationMode === 'api' ? 'primary' : 'outline'}
                size="sm"
                title={translate('createBettingRoundModal.button.selectFromListTitle')}
            >
                <ListBulletIcon className="w-4 h-4 mr-2"/> {translate('createBettingRoundModal.button.selectFromList')}
            </Button>
            <Button 
                onClick={() => setCreationMode('manual')} 
                variant={creationMode === 'manual' ? 'primary' : 'outline'}
                size="sm"
            >
                <PencilAltIcon className="w-4 h-4 mr-2"/> {translate('createBettingRoundModal.button.enterManually')}
            </Button>
        </div>

        {creationMode === 'api' ? renderApiMode() : renderManualMode()}
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-4">
          <Button onClick={onClose} variant="secondary">{translate('common.button.cancel')}</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              (creationMode === 'api' && !selectedApiMatchInternalId) || 
              (creationMode === 'manual' && (!manualHomeTeam || !manualAwayTeam || !manualStartTime || !manualLeagueName)) || 
              isLoadingApiMatches || 
              isLoadingLeagues ||
              isParentDataLoading 
            }
          >
            <PlusCircleIcon className="w-5 h-5 mr-2"/>
            {translate('createBettingRoundModal.button.createRound')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};