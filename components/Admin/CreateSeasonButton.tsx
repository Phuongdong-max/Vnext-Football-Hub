import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppContext } from '../../contexts/AppContext';
import { createTournament } from '../../services/firebaseService';
import { CreateEditTournamentModal } from '../Tournament/CreateEditTournamentModal';
import { PlusCircleIcon } from '../icons';

interface CreateSeasonButtonProps {
    /** "hero" sits on the season page's coloured header; "panel" on a plain surface. */
    appearance?: 'hero' | 'panel';
    className?: string;
}

/**
 * Creating a season is reachable from two places - the admin panel and next to
 * the season picker - so the button, the form and the write live together here
 * rather than being written out twice.
 *
 * Renders nothing at all for non-admins, so the caller does not have to guard.
 */
export const CreateSeasonButton: React.FC<CreateSeasonButtonProps> = ({ appearance = 'panel', className = '' }) => {
    const { translate } = useLanguage();
    const { isAdmin, currentUser, addToast, refreshTournaments, selectTournament } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);

    if (!isAdmin) return null;

    const handleSubmit = async (name: string, season: number, startDate: Date, endDate: Date | null) => {
        if (!currentUser) return;
        try {
            const id = await createTournament(name, season, { startDate, endDate }, currentUser);
            addToast('tournament.toast.createdSuccess', 'success', { name });
            await refreshTournaments();
            // Open the season that was just created - filling it in is what
            // comes next.
            selectTournament(id);
            setIsOpen(false);
        } catch (error) {
            addToast('tournament.toast.createError', 'error', { message: (error as Error).message });
        }
    };

    const styles = appearance === 'hero'
        ? 'bg-white/95 text-primary hover:bg-white shadow-md'
        : 'bg-primary text-white hover:bg-opacity-90 shadow-sm';

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={`inline-flex items-center justify-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/70 ${styles} ${className}`}
            >
                <PlusCircleIcon className="mr-1.5 h-5 w-5" />
                {translate('admin.season.createButton')}
            </button>

            {isOpen && (
                <CreateEditTournamentModal
                    isOpen
                    onClose={() => setIsOpen(false)}
                    mode="create"
                    onSubmit={handleSubmit}
                />
            )}
        </>
    );
};
