import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppContext } from '../../contexts/AppContext';
import { TournamentSummary, TournamentStatus } from '../../types';
import { updateTournament, setTournamentStatus, deleteTournament } from '../../services/firebaseService';
import { getSeasonPhase, SEASON_PHASE_LABEL } from '../../utils/seasonPhase';
import { CreateEditTournamentModal } from '../Tournament/CreateEditTournamentModal';
import { CreateSeasonButton } from './CreateSeasonButton';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { TrashIcon, ShieldExclamationIcon, PencilIcon, ArchiveBoxIcon, TrophyIcon } from '../icons';

const PHASE_CHIP: Record<string, string> = {
    upcoming: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    ongoing: 'bg-green-500/15 text-green-700 dark:text-green-300',
    finished: 'bg-black/10 text-textSecondary dark:bg-white/10',
    archived: 'bg-warning/20 text-textPrimary',
};

/**
 * The whole life of a season lives here: create it, rename it, move its dates,
 * archive it, delete it. The season page itself is for reading.
 */
export const SeasonAdminSection: React.FC = () => {
    const { translate, language } = useLanguage();
    const { tournaments, refreshTournaments, addToast, selectedTournamentId, currentUser } = useAppContext();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState<TournamentSummary | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const [target, setTarget] = useState<TournamentSummary | null>(null);
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const openEdit = (t: TournamentSummary) => { setEditing(t); setIsFormOpen(true); };

    const handleSubmit = async (name: string, season: number, startDate: Date, endDate: Date | null) => {
        if (!currentUser || !editing) return;
        try {
            await updateTournament(editing.id, {
                name, season,
                startDate: window.firebase.firestore.Timestamp.fromDate(startDate),
                endDate: endDate ? window.firebase.firestore.Timestamp.fromDate(endDate) : null,
            }, currentUser);
            addToast('tournament.toast.updatedSuccess', 'success');
            await refreshTournaments();
            setIsFormOpen(false);
            setEditing(null);
        } catch (error) {
            addToast('tournament.toast.updateError', 'error', { message: (error as Error).message });
        }
    };

    const handleToggleArchive = async (t: TournamentSummary) => {
        const next: TournamentStatus = t.status === 'archived' ? 'active' : 'archived';
        const key = next === 'archived' ? 'tournament.archiveConfirm.message' : 'tournament.unarchiveConfirm.message';
        if (!window.confirm(translate(key, { name: t.name }))) return;
        setBusyId(t.id);
        try {
            await setTournamentStatus(t.id, next, currentUser);
            addToast(next === 'archived' ? 'tournament.toast.archivedSuccess' : 'tournament.toast.unarchivedSuccess', 'success', { name: t.name });
            await refreshTournaments();
        } catch (error) {
            addToast('tournament.toast.archiveError', 'error', { message: (error as Error).message });
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async () => {
        if (!target || confirmText.trim() !== target.name) return;
        setIsDeleting(true);
        try {
            const removedPlayers = await deleteTournament(target.id);
            addToast('admin.season.deleted', 'success', { name: target.name, players: removedPlayers });
            await refreshTournaments();
            setTarget(null);
            setConfirmText('');
        } catch (error) {
            addToast('admin.season.deleteError', 'error', { message: (error as Error).message });
        } finally {
            setIsDeleting(false);
        }
    };

    const fmt = (d?: Date | null) => d ? d.toLocaleDateString(language, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

    return (
        <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                <div>
                    <h2 className="text-xl font-semibold text-textPrimary">{translate('admin.season.title')}</h2>
                    <p className="mt-0.5 text-sm text-textSecondary">{translate('admin.season.subtitle')}</p>
                </div>
                <CreateSeasonButton />
            </div>

            {tournaments.length === 0 ? (
                <div className="p-10 text-center">
                    <TrophyIcon className="mx-auto h-12 w-12 text-textSecondary/30" />
                    <p className="mt-3 font-medium text-textPrimary">{translate('season.empty.title')}</p>
                    <p className="mt-1 text-sm text-textSecondary">{translate('admin.season.emptyHint')}</p>
                </div>
            ) : (
                <ul className="divide-y divide-border">
                    {tournaments.map(t => {
                        const phase = getSeasonPhase({ status: t.status, startDate: t.startDate ?? null, endDate: t.endDate ?? null });
                        const isArchived = t.status === 'archived';
                        return (
                            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-textPrimary">{t.name}</span>
                                        {t.season && (
                                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">{t.season}</span>
                                        )}
                                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${PHASE_CHIP[phase]}`}>
                                            {translate(SEASON_PHASE_LABEL[phase])}
                                        </span>
                                        {t.id === selectedTournamentId && (
                                            <span className="rounded bg-success/15 px-1.5 py-0.5 text-xs font-medium text-success">
                                                {translate('admin.season.currentlyViewing')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-textSecondary">
                                        {translate('admin.season.dateRange', { start: fmt(t.startDate), end: fmt(t.endDate) })}
                                    </p>
                                </div>

                                <div className="flex flex-shrink-0 items-center gap-2">
                                    <Button onClick={() => openEdit(t)} variant="outline" size="sm" disabled={busyId === t.id}>
                                        <PencilIcon className="mr-1 h-4 w-4" />
                                        {translate('tournament.button.edit')}
                                    </Button>
                                    <Button onClick={() => handleToggleArchive(t)} variant={isArchived ? 'secondary' : 'warning'} size="sm" disabled={busyId === t.id}>
                                        {busyId === t.id ? <LoadingSpinner size="sm" /> : <ArchiveBoxIcon className="mr-1 h-4 w-4" />}
                                        {translate(isArchived ? 'tournament.button.unarchive' : 'tournament.button.archive')}
                                    </Button>
                                    <Button onClick={() => { setTarget(t); setConfirmText(''); }} variant="danger" size="sm" disabled={busyId === t.id}>
                                        <TrashIcon className="mr-1 h-4 w-4" />
                                        {translate('admin.season.deleteButton')}
                                    </Button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {isFormOpen && (
                <CreateEditTournamentModal
                    isOpen
                    onClose={() => { setIsFormOpen(false); setEditing(null); }}
                    mode="edit"
                    initialName={editing?.name ?? ''}
                    initialSeason={editing?.season}
                    initialStartDate={editing?.startDate ?? null}
                    initialEndDate={editing?.endDate ?? null}
                    onSubmit={handleSubmit}
                />
            )}

            {target && (
                <Modal isOpen onClose={() => { if (!isDeleting) { setTarget(null); setConfirmText(''); } }} title={translate('admin.season.deleteModalTitle')}>
                    <div className="space-y-4">
                        <div className="flex gap-3 rounded-md border-l-4 border-danger bg-danger/10 p-3">
                            <ShieldExclamationIcon className="h-5 w-5 flex-shrink-0 text-danger" />
                            <div className="text-sm text-textPrimary">
                                <p className="font-semibold">{translate('admin.season.deleteWarnTitle', { name: target.name })}</p>
                                <p className="mt-1 text-textSecondary">{translate('admin.season.deleteWarnBody')}</p>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="delete-confirm" className="mb-1 block text-sm font-medium text-textPrimary">
                                {translate('admin.season.deleteConfirmLabel', { name: target.name })}
                            </label>
                            <input
                                id="delete-confirm"
                                type="text"
                                value={confirmText}
                                onChange={e => setConfirmText(e.target.value)}
                                autoComplete="off"
                                autoFocus
                                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-textPrimary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-700"
                            />
                        </div>

                        <div className="flex justify-end gap-3 border-t border-border pt-4">
                            <Button variant="secondary" onClick={() => { setTarget(null); setConfirmText(''); }} disabled={isDeleting}>
                                {translate('common.button.cancel')}
                            </Button>
                            <Button variant="danger" onClick={handleDelete} disabled={isDeleting || confirmText.trim() !== target.name}>
                                {isDeleting ? <LoadingSpinner size="sm" /> : <TrashIcon className="mr-1 h-4 w-4" />}
                                {translate('admin.season.deleteButton')}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </section>
    );
};
