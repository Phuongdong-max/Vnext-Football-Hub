import React, { useEffect, useMemo, useState } from 'react';
import { TournamentPlayer, TournamentSummary } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppContext } from '../../contexts/AppContext';
import { getPlayersOfTournament, addPlayer, updatePlayer } from '../../services/firebaseService';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { UserCircleIcon } from '../icons';

/**
 * Names are matched with the diacritics stripped and the case flattened.
 * The 2025 squad was typed with Vietnamese tone marks and the 2026 one without,
 * so "NGUYỄN PHI HÙNG" and "NGUYEN PHI HUNG" are the same person and a plain
 * string compare would have found nobody at all.
 */
export const normaliseName = (name: string): string =>
    String(name || '')
        .normalize('NFD')
        // Escaped rather than written literally: a range of bare combining
        // marks in source is invisible and easily mangled by tooling.
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();

/** What importing one source player would do to this season. */
type Action = 'add' | 'fill' | 'nothing';

interface Candidate {
    source: TournamentPlayer;
    existing: TournamentPlayer | null;
    action: Action;
    /** Fields that would be copied onto an existing player. */
    fills: string[];
}

interface ImportPlayersModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** The season being imported into. */
    targetTournamentId: string;
    /** Its current squad, so the diff can be shown before anything is written. */
    currentPlayers: TournamentPlayer[];
    /** Every season, to choose a source from. */
    tournaments: TournamentSummary[];
}

export const ImportPlayersModal: React.FC<ImportPlayersModalProps> = ({
    isOpen, onClose, targetTournamentId, currentPlayers, tournaments,
}) => {
    const { translate } = useLanguage();
    const { addToast } = useAppContext();

    const sources = useMemo(
        () => tournaments.filter(t => t.id !== targetTournamentId),
        [tournaments, targetTournamentId],
    );

    const [sourceId, setSourceId] = useState('');
    const [sourcePlayers, setSourcePlayers] = useState<TournamentPlayer[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [picked, setPicked] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!isOpen) return;
        setSourceId(sources[0]?.id ?? '');
        setSourcePlayers(null);
        setPicked({});
    }, [isOpen, sources]);

    useEffect(() => {
        if (!isOpen || !sourceId) return;
        let cancelled = false;
        setIsLoading(true);
        setSourcePlayers(null);
        getPlayersOfTournament(sourceId)
            .then(players => { if (!cancelled) setSourcePlayers(players); })
            .catch(error => { if (!cancelled) addToast('playerInfo.import.loadError', 'error', { message: (error as Error).message }); })
            .finally(() => { if (!cancelled) setIsLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen, sourceId, addToast]);

    const candidates: Candidate[] = useMemo(() => {
        if (!sourcePlayers) return [];
        const byName = new Map(currentPlayers.map(p => [normaliseName(p.name), p]));
        return sourcePlayers.map(source => {
            const existing = byName.get(normaliseName(source.name)) ?? null;
            if (!existing) return { source, existing: null, action: 'add' as Action, fills: [] };

            // Only ever fill a gap. Overwriting something already entered for
            // this season would quietly undo somebody's work.
            const fills: string[] = [];
            if (source.avatarUrl && !existing.avatarUrl) fills.push(translate('playerInfo.import.field.photo'));
            if (source.bio?.trim() && !existing.bio?.trim()) fills.push(translate('playerInfo.import.field.bio'));
            if (source.skills && !existing.skills) fills.push(translate('playerInfo.import.field.skills'));
            return { source, existing, action: fills.length ? 'fill' as Action : 'nothing' as Action, fills };
        });
    }, [sourcePlayers, currentPlayers, translate]);

    // Default selection: everything that would actually change something. A
    // player who left the club is simply unticked.
    useEffect(() => {
        if (!candidates.length) return;
        setPicked(Object.fromEntries(candidates.map(c => [c.source.id, c.action !== 'nothing'])));
    }, [candidates]);

    const chosen = candidates.filter(c => picked[c.source.id] && c.action !== 'nothing');
    const toAdd = chosen.filter(c => c.action === 'add').length;
    const toFill = chosen.filter(c => c.action === 'fill').length;

    const handleImport = async () => {
        if (!chosen.length) return;
        setIsImporting(true);
        let added = 0, filled = 0, failed = 0;
        for (const c of chosen) {
            try {
                if (c.action === 'add') {
                    const { id, ...data } = c.source;
                    await addPlayer(targetTournamentId, data);
                    added++;
                } else {
                    const patch: Partial<TournamentPlayer> = {};
                    if (c.source.avatarUrl && !c.existing!.avatarUrl) patch.avatarUrl = c.source.avatarUrl;
                    if (c.source.bio?.trim() && !c.existing!.bio?.trim()) patch.bio = c.source.bio;
                    if (c.source.skills && !c.existing!.skills) patch.skills = c.source.skills;
                    await updatePlayer(targetTournamentId, c.existing!.id, patch);
                    filled++;
                }
            } catch {
                failed++;
            }
        }
        setIsImporting(false);
        if (failed) addToast('playerInfo.import.partial', 'warning', { added, filled, failed });
        else addToast('playerInfo.import.done', 'success', { added, filled });
        if (!failed) onClose();
    };

    const ACTION_STYLE: Record<Action, string> = {
        add: 'bg-success/15 text-success',
        fill: 'bg-primary/15 text-primary',
        nothing: 'bg-black/5 text-textSecondary dark:bg-white/10',
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={translate('playerInfo.import.title')} size="2xl">
            <div className="space-y-4">
                <p className="text-sm text-textSecondary">{translate('playerInfo.import.intro')}</p>

                <div>
                    <label htmlFor="import-source" className="mb-1 block text-sm font-medium text-textPrimary">
                        {translate('playerInfo.import.sourceLabel')}
                    </label>
                    <select
                        id="import-source"
                        value={sourceId}
                        onChange={e => setSourceId(e.target.value)}
                        disabled={isImporting}
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-textPrimary focus:border-primary focus:ring-2 focus:ring-primary dark:bg-slate-700"
                    >
                        {sources.length === 0 && <option value="">{translate('playerInfo.import.noSource')}</option>}
                        {sources.map(t => (
                            <option key={t.id} value={t.id}>{t.season ? `${t.season} - ${t.name}` : t.name}</option>
                        ))}
                    </select>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : candidates.length === 0 ? (
                    <p className="rounded-lg bg-background p-4 text-center text-sm text-textSecondary dark:bg-slate-800/60">
                        {translate('playerInfo.import.empty')}
                    </p>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm text-textSecondary">
                                {translate('playerInfo.import.summary', { add: toAdd, fill: toFill })}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost" size="sm" disabled={isImporting}
                                    onClick={() => setPicked(Object.fromEntries(candidates.map(c => [c.source.id, c.action !== 'nothing'])))}
                                >
                                    {translate('playerInfo.import.selectAll')}
                                </Button>
                                <Button
                                    variant="ghost" size="sm" disabled={isImporting}
                                    onClick={() => setPicked({})}
                                >
                                    {translate('playerInfo.import.selectNone')}
                                </Button>
                            </div>
                        </div>

                        <ul className="custom-scrollbar-thin max-h-[45vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
                            {candidates.map(c => {
                                const disabled = c.action === 'nothing' || isImporting;
                                return (
                                    <li key={c.source.id}>
                                        <label className={`flex items-center gap-3 px-3 py-2 ${disabled ? 'opacity-60' : 'cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/5'}`}>
                                            <input
                                                type="checkbox"
                                                checked={!!picked[c.source.id] && c.action !== 'nothing'}
                                                disabled={disabled}
                                                onChange={e => setPicked(prev => ({ ...prev, [c.source.id]: e.target.checked }))}
                                                className="h-4 w-4 flex-shrink-0 accent-primary"
                                            />
                                            {c.source.avatarUrl ? (
                                                <img src={c.source.avatarUrl} alt="" className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
                                            ) : (
                                                <UserCircleIcon className="h-9 w-9 flex-shrink-0 text-textSecondary/30" />
                                            )}
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-semibold text-textPrimary">
                                                    {c.source.name}
                                                </span>
                                                <span className="block truncate text-xs text-textSecondary">
                                                    {c.action === 'add'
                                                        ? translate('playerInfo.import.willAdd', { jersey: c.source.jerseyNumber })
                                                        : c.action === 'fill'
                                                            ? translate('playerInfo.import.willFill', { name: c.existing!.name, fields: c.fills.join(', ') })
                                                            : translate('playerInfo.import.willSkip', { name: c.existing!.name })}
                                                </span>
                                            </span>
                                            <span className={`flex-shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${ACTION_STYLE[c.action]}`}>
                                                {translate(`playerInfo.import.action.${c.action}`)}
                                            </span>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}

                <div className="flex justify-end gap-2 border-t border-border pt-4">
                    <Button variant="secondary" onClick={onClose} disabled={isImporting}>
                        {translate('common.button.cancel')}
                    </Button>
                    <Button onClick={handleImport} disabled={isImporting || chosen.length === 0}>
                        {isImporting
                            ? <LoadingSpinner size="sm" />
                            : translate('playerInfo.import.confirm', { count: chosen.length })}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
