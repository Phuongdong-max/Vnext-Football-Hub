import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppContext } from '../../contexts/AppContext';
import { onTeamDivisionUpdate, updateTeamDivision } from '../../services/firebaseService';
import { normaliseName } from '../../utils/vietnameseName';
import { Button } from '../shared/Button';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ToggleSwitch } from '../shared/ToggleSwitch';
import { UsersIcon } from '../icons';

/** How many team columns the editor offers. */
const SLOTS = 4;

/**
 * The line-up agreed for the 2026 season, offered as the starting text so the
 * admin can simply read it over and save rather than retyping 24 names. It is
 * only a default for the empty editor - once saved, what is in Firestore wins,
 * and this is never consulted again.
 */
const SUGGESTED: string[] = [
    ['NGUYỄN VĂN LỰC', 'LƯU PHẤN NAM', 'ĐỖ VĂN HỮU', 'DƯƠNG VĂN TÀI', 'NGUYỄN THANH TÙNG', 'NGUYỄN TRUNG KIÊN'].join('\n'),
    ['LÊ HOÀI NAM', 'NGUYỄN PHI HÙNG', 'NGUYỄN ĐỨC TRỌNG', 'NGUYỄN QUỐC ĐẠI', 'NGUYỄN VIẾT MẠNH', 'NGÔ XUÂN PHONG'].join('\n'),
    ['TRƯƠNG ĐỖ TẤN PHÁT', 'ĐOÀN SĨ LONG', 'ĐÀO VĂN HÙNG', 'PHAN VĂN TRUNG', 'NGUYỄN ĐỨC KHÁNH', 'NGUYỄN BÁ THUẬN'].join('\n'),
    ['ĐỖ HỒNG QUANG', 'CẤN ĐỨC LỢI', 'VŨ THẾ LONG', 'LÊ PHƯƠNG ĐÔNG', 'NGUYỄN THÀNH AN', 'CAO VĂN THIỆP'].join('\n'),
];

const linesOf = (text: string): string[] =>
    text.split('\n').map(n => n.trim()).filter(Boolean);

/**
 * The fixed line-up: which player belongs to which team, decided in advance
 * rather than drawn.
 *
 * Editing it here rather than on the draw screen keeps the two ideas apart -
 * the draw screen runs a draw, this decides what a draw is allowed to override.
 * Stored by name, so the six grade columns on the draw screen can be reordered
 * freely afterwards without changing anybody's team.
 */
export const FixedTeamsSection: React.FC = () => {
    const { translate } = useLanguage();
    const { currentUser, isFirebaseReady, addToast } = useAppContext();

    const [enabled, setEnabled] = useState(false);
    const [columns, setColumns] = useState<string[]>(Array(SLOTS).fill(''));
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [savedCount, setSavedCount] = useState(0);

    useEffect(() => {
        if (!isFirebaseReady) return;
        const unsubscribe = onTeamDivisionUpdate((data) => {
            setIsLoading(false);
            if (!data) return;
            setEnabled(!!data.fixedTeamsEnabled);

            const fixed = data.fixedTeams ?? {};
            const names = Object.keys(fixed);
            setSavedCount(names.length);
            if (names.length === 0) return;

            // Rebuild the columns from the stored map. Matching uses the
            // stripped key, but what is shown back is the name exactly as the
            // admin typed it, tone marks and all.
            const rebuilt = Array.from({ length: SLOTS }, () => [] as string[]);
            names.forEach(key => {
                const { slot, name } = fixed[key];
                if (slot >= 0 && slot < SLOTS) rebuilt[slot].push(name || key);
            });
            setColumns(rebuilt.map(list => list.join('\n')));
        });
        return () => unsubscribe();
    }, [isFirebaseReady]);

    const entries = columns.map(linesOf);
    const total = entries.reduce((n, list) => n + list.length, 0);

    // The same person in two columns would silently land in whichever came
    // last, so it is called out instead.
    const duplicates = (() => {
        const seen = new Map<string, number>();
        const dup: string[] = [];
        entries.forEach(list => list.forEach(name => {
            const key = normaliseName(name);
            seen.set(key, (seen.get(key) ?? 0) + 1);
            if (seen.get(key) === 2) dup.push(name);
        }));
        return dup;
    })();

    const handleSave = async () => {
        if (duplicates.length > 0) return;
        setIsSaving(true);
        try {
            const fixedTeams: Record<string, { slot: number; name: string }> = {};
            entries.forEach((list, slot) => list.forEach(name => {
                fixedTeams[normaliseName(name)] = { slot, name };
            }));
            await updateTeamDivision({ fixedTeams, fixedTeamsEnabled: enabled }, currentUser);
            setSavedCount(Object.keys(fixedTeams).length);
            addToast('admin.fixedTeams.saved', 'success', { count: Object.keys(fixedTeams).length });
        } catch (error) {
            addToast('admin.fixedTeams.saveError', 'error', { message: (error as Error).message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggle = async (next: boolean) => {
        setEnabled(next);
        try {
            await updateTeamDivision({ fixedTeamsEnabled: next }, currentUser);
        } catch (error) {
            setEnabled(!next);
            addToast('admin.fixedTeams.saveError', 'error', { message: (error as Error).message });
        }
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                <div>
                    <h2 className="text-xl font-semibold text-textPrimary">{translate('admin.fixedTeams.title')}</h2>
                    <p className="mt-0.5 text-sm text-textSecondary">{translate('admin.fixedTeams.subtitle')}</p>
                </div>
                <ToggleSwitch
                    id="fixed-teams-toggle"
                    label={translate(enabled ? 'admin.fixedTeams.on' : 'admin.fixedTeams.off')}
                    checked={enabled}
                    onChange={handleToggle}
                />
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-10"><LoadingSpinner size="lg" /></div>
            ) : (
                <div className="p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {columns.map((text, slot) => {
                            const count = entries[slot].length;
                            return (
                                <div key={slot} className="flex flex-col">
                                    <label htmlFor={`fixed-team-${slot}`} className="mb-1 flex items-baseline justify-between text-sm font-medium text-textPrimary">
                                        <span>{translate('admin.fixedTeams.teamLabel', { number: slot + 1 })}</span>
                                        <span className="font-mono text-xs text-textSecondary">{count}</span>
                                    </label>
                                    <textarea
                                        id={`fixed-team-${slot}`}
                                        value={text}
                                        onChange={e => setColumns(prev => prev.map((v, i) => i === slot ? e.target.value : v))}
                                        rows={8}
                                        placeholder={translate('admin.fixedTeams.placeholder')}
                                        className="custom-scrollbar-thin w-full resize-none rounded-md border border-border bg-background p-3 text-sm text-textPrimary shadow-sm focus:border-primary focus:ring-2 focus:ring-primary dark:bg-slate-800"
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {duplicates.length > 0 && (
                        <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                            {translate('admin.fixedTeams.duplicate', { names: duplicates.join(', ') })}
                        </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                        <p className="text-xs text-textSecondary">
                            {translate('admin.fixedTeams.hint', { total, saved: savedCount })}
                        </p>
                        <div className="flex gap-2">
                            {total === 0 && (
                                <Button variant="outline" size="sm" onClick={() => setColumns(SUGGESTED)}>
                                    <UsersIcon className="mr-1.5 h-4 w-4" />
                                    {translate('admin.fixedTeams.useSuggested')}
                                </Button>
                            )}
                            <Button onClick={handleSave} disabled={isSaving || total === 0 || duplicates.length > 0}>
                                {isSaving ? <LoadingSpinner size="sm" /> : translate('admin.fixedTeams.save')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
