import React from 'react';
import { TournamentPlayer, PlayerSkills } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../shared/Modal';
import { UserCircleIcon } from '../icons';
import { PlayerSkillChart } from './PlayerSkillChart';

interface PlayerDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: TournamentPlayer | null;
}

const defaultSkills: PlayerSkills = {
    speed: 50, shooting: 50, passing: 50,
    dribbling: 50, defending: 50, physical: 50
};

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({ isOpen, onClose, player }) => {
    const { translate } = useLanguage();

    if (!isOpen || !player) return null;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={translate('playerDetailModal.title')}
            size="lg"
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    {player.avatarUrl ? (
                        <img src={player.avatarUrl} alt={player.name} className="w-20 h-20 rounded-full object-cover border-2 border-primary" />
                    ) : (
                        <UserCircleIcon className="w-20 h-20 text-gray-300 dark:text-slate-600" />
                    )}
                    <div>
                        <h2 className="text-3xl font-bold text-textPrimary">{player.name}</h2>
                        <p className="text-xl text-textSecondary">{translate('playerDetailModal.jersey')} #{player.jerseyNumber}</p>
                    </div>
                </div>

                {/* Bio */}
                <div>
                    <h3 className="text-lg font-semibold text-textPrimary">{translate('playerInfo.bio')}</h3>
                    <p className="mt-1 text-textSecondary whitespace-pre-wrap bg-black/5 dark:bg-white/5 p-3 rounded-2xl min-h-[80px]">
                        {player.bio || 'N/A'}
                    </p>
                </div>

                {/* Skills Chart */}
                <div className="pt-4 border-t border-border">
                     <h3 className="text-lg font-semibold text-textPrimary text-center mb-2">{translate('playerDetailModal.skillsTitle')}</h3>
                     <div className="flex items-center justify-center">
                        <PlayerSkillChart skills={player.skills || defaultSkills} size={300} />
                     </div>
                </div>
            </div>
        </Modal>
    );
};
