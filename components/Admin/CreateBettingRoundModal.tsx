
import React, { useState } from 'react';
import { FootballMatch } from '../../types';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { PlusCircleIcon } from '../icons';

interface CreateBettingRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  upcomingMatches: FootballMatch[];
  onCreate: (matchId: string) => void;
}

export const CreateBettingRoundModal: React.FC<CreateBettingRoundModalProps> = ({ isOpen, onClose, upcomingMatches, onCreate }) => {
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleSubmit = () => {
    if (!selectedMatchId) return;
    onCreate(selectedMatchId);
    setSelectedMatchId(''); // Reset for next time
    setSearchTerm('');
  };

  const filteredMatches = upcomingMatches.filter(match =>
    match.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.awayTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.league.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Betting Round">
      <div className="space-y-4">
        <div>
          <label htmlFor="matchSearch" className="block text-sm font-medium text-textPrimary mb-1">Search Matches (Team or League):</label>
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
          <label htmlFor="matchSelect" className="block text-sm font-medium text-textPrimary mb-1">Select Match:</label>
          {filteredMatches.length === 0 && <p className="text-sm text-textSecondary">No matches found for "{searchTerm}". Try another search or check available matches.</p>}
          <select
            id="matchSelect"
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            disabled={filteredMatches.length === 0}
          >
            <option value="" disabled>-- Select a Match --</option>
            {filteredMatches.map(match => (
              <option key={match.id} value={match.id}>
                {new Date(match.startTime).toLocaleDateString()} - {match.homeTeam} vs {match.awayTeam} ({match.league})
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end space-x-3">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedMatchId}>
            <PlusCircleIcon className="w-5 h-5 mr-2"/>
            Create Round
          </Button>
        </div>
      </div>
    </Modal>
  );
};
