import React from 'react';
import { TournamentTeam, TournamentPlayer } from '../../types';
import { Modal } from '../shared/Modal';
import { UserCircleIcon } from '../icons';

interface TeamDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: TournamentTeam | null;
    allPlayers: TournamentPlayer[];
    onSelectPlayer: (player: TournamentPlayer) => void;
}

export const TeamDetailModal: React.FC<TeamDetailModalProps> = ({ isOpen, onClose, team, allPlayers, onSelectPlayer }) => {
    if (!isOpen || !team) return null;

    const teamMembers = team.members
        .map(member => allPlayers.find(p => p.id === member.playerId))
        .filter((player): player is TournamentPlayer => player !== undefined);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={team.name} size="md">
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-textPrimary mb-2">Thành viên đội</h3>
                <ul className="space-y-2 max-h-80 overflow-y-auto">
                    {teamMembers.length > 0 ? (
                        teamMembers.map(player => (
                            <li key={player.id}>
                                <button 
                                    onClick={() => onSelectPlayer(player)}
                                    className="w-full flex items-center p-2 rounded-md text-left transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                                >
                                    {player.avatarUrl ? (
                                        <img src={player.avatarUrl} alt={player.name} className="w-10 h-10 rounded-full mr-3 object-cover" />
                                    ) : (
                                        <UserCircleIcon className="w-10 h-10 text-gray-400 dark:text-slate-500 mr-3" />
                                    )}
                                    <div>
                                        <p className="font-semibold text-textPrimary">{player.name}</p>
                                        <p className="text-sm text-textSecondary">#{player.jerseyNumber}</p>
                                    </div>
                                </button>
                            </li>
                        ))
                    ) : (
                        <p className="text-textSecondary italic text-center py-4">Chưa có thành viên nào.</p>
                    )}
                </ul>
            </div>
        </Modal>
    );
};