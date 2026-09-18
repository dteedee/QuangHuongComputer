/**
 * Orchestrates the PC builder: session-persisted pick state, the debounced
 * `/check` re-evaluation (Implementation Steps #4: "re-check on every change,
 * debounced"), and add-all-to-cart.
 */
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pcBuilderApi, type PcBuildItem, type PcSlotId } from '../../api/pcbuilder';
import { useCart } from '../../context/CartContext';
import { useDebounce } from '../../hooks/useDebounce';
import { sessionBrowserStorage } from '../../lib/browser-storage';
import { notify } from '../../components/ui';
import { PC_BUILD_SESSION_KEY, pcBuildReducer, type PcBuildState, type PcPickedItem } from './pc-build-state-types';

function loadInitialState(): PcBuildState {
    const raw = sessionBrowserStorage.getJSON<PcBuildState>(PC_BUILD_SESSION_KEY, {});
    return raw && typeof raw === 'object' ? raw : {};
}

export function usePcBuilderState() {
    const [state, dispatch] = useReducer(pcBuildReducer, undefined, loadInitialState);
    const [addAllRunning, setAddAllRunning] = useState(false);
    const { addToCart } = useCart();

    useEffect(() => {
        sessionBrowserStorage.setJSON(PC_BUILD_SESSION_KEY, state);
    }, [state]);

    const slotsQuery = useQuery({
        queryKey: ['pcbuilder', 'slots'],
        queryFn: () => pcBuilderApi.getSlots(),
        staleTime: 5 * 60 * 1000,
    });

    const pickedCount = useMemo(
        () => Object.values(state).reduce((sum, items) => sum + (items?.length ?? 0), 0),
        [state],
    );

    const checkItems = useMemo<PcBuildItem[]>(
        () =>
            (Object.values(state).flat().filter(Boolean) as PcPickedItem[])
                .map((it) => ({ productId: it.productId, quantity: it.quantity })),
        [state],
    );
    // Debounced on the SERIALISED payload, not the array reference, so a
    // remove-then-immediately-re-add within the debounce window still
    // collapses into one request instead of firing twice.
    const checkItemsKey = useMemo(() => JSON.stringify(checkItems), [checkItems]);
    const debouncedKey = useDebounce(checkItemsKey, 350);
    const debouncedItems = useMemo<PcBuildItem[]>(() => JSON.parse(debouncedKey), [debouncedKey]);

    const checkQuery = useQuery({
        queryKey: ['pcbuilder', 'check', debouncedKey],
        queryFn: () => pcBuilderApi.check(debouncedItems),
        enabled: debouncedItems.length > 0,
        placeholderData: (prev) => prev,
    });

    const buildProductIds = useMemo(
        () => checkItems.map((i) => i.productId),
        [checkItems],
    );

    const pickItem = useCallback(
        (slotId: PcSlotId, item: PcPickedItem, allowMultiple: boolean, maxQuantity: number) => {
            dispatch({ type: 'SET_ITEM', slotId, item, allowMultiple, maxQuantity });
        },
        [],
    );

    const removeItem = useCallback((slotId: PcSlotId, productId: string) => {
        dispatch({ type: 'REMOVE_ITEM', slotId, productId });
    }, []);

    const setQuantity = useCallback((slotId: PcSlotId, productId: string, quantity: number) => {
        dispatch({ type: 'SET_QUANTITY', slotId, productId, quantity });
    }, []);

    const clearBuild = useCallback(() => {
        dispatch({ type: 'CLEAR' });
    }, []);

    const applySuggestion = useCallback(
        (items: Array<{ slotId: PcSlotId; productId: string; name: string; sku: string; price: number }>) => {
            const next: PcBuildState = {};
            for (const it of items) {
                next[it.slotId] = [{
                    productId: it.productId, quantity: 1, name: it.name, sku: it.sku,
                    slug: '', price: it.price, imageUrl: null, inStock: true,
                }];
            }
            dispatch({ type: 'HYDRATE', state: next });
        },
        [],
    );

    /** Sequential, per D12 honesty rule: report exactly what happened, not a
     *  blanket "đã thêm vào giỏ" that hides partial failure. */
    const addAllToCart = useCallback(async () => {
        const all = (Object.values(state).flat().filter(Boolean) as PcPickedItem[]);
        if (all.length === 0) return;
        setAddAllRunning(true);
        let ok = 0;
        const failed: string[] = [];
        for (const item of all) {
            // Intentionally sequential (spec: "honest per-item feedback").
            const success = await addToCart(
                { id: item.productId, name: item.name, price: item.price, stockQuantity: item.inStock ? 9999 : 0 },
                item.quantity,
                { silent: true },
            );
            if (success) ok += 1; else failed.push(item.name);
        }
        setAddAllRunning(false);
        if (failed.length === 0) {
            notify.success(`Đã thêm ${ok} linh kiện vào giỏ hàng`);
        } else if (ok === 0) {
            notify.error('Không thêm được linh kiện nào vào giỏ hàng. Vui lòng thử lại.');
        } else {
            notify.error(`Đã thêm ${ok}/${all.length} linh kiện. Không thêm được: ${failed.join(', ')}.`);
        }
    }, [state, addToCart]);

    return {
        state, slotsQuery, checkQuery, pickedCount, buildProductIds, checkItems,
        pickItem, removeItem, setQuantity, clearBuild, applySuggestion,
        addAllToCart, addAllRunning,
    };
}

export type UsePcBuilderState = ReturnType<typeof usePcBuilderState>;
