/**
 * PC Builder API — storefront `/xay-dung-cau-hinh` (W3-9).
 *
 * Shapes here follow `docs/api-contracts/pc-builder.md` (written by W2-9,
 * 2026-09-18) — this file is a rewrite, not a patch: the previous version
 * invented `checkCompatibility`/`isCompatible`/`totalWattage` shapes that
 * never matched the real engine.
 *
 * ONE measured deviation from the doc (verified live against TEST :5050,
 * 2026-09-19 — see W3-9 report / integration-requests-w3.md): the doc's
 * JSON examples show verdicts as lowercase (`"compatible"`), but
 * `PcRuleVerdictKind` (`PcBuilderTypes.cs:12`) is a bare C# enum serialized
 * by the app-wide `JsonStringEnumConverter()` (`UtcDateTimeJsonConverter.cs:76`,
 * no camelCase naming policy) — every enum in this API, including this one,
 * comes over the wire PascalCase (`"Compatible"`, `"Incompatible"`,
 * `"CannotVerify"`), matching how the rest of the codebase already handles
 * backend enums (e.g. `WorkOrderStatus`'s `'Requested'`/`'Assigned'`). Typed
 * here as what the wire ACTUALLY sends, not the doc's example casing.
 */
import client from './client';

/* ------------------------------------------------------------------ types */

export type PcSlotId =
    | 'cpu' | 'mainboard' | 'ram' | 'vga' | 'storage' | 'psu' | 'case' | 'cooler' | 'monitor';

/** PascalCase on the wire — see file header note. */
export type PcVerdict = 'Compatible' | 'Incompatible' | 'CannotVerify';

/** `GET /slots` — component types from the category tree (contract §1). */
export interface PcSlotDef {
    id: PcSlotId;
    name: string;
    categorySlug: string;
    /** `null` for the cosmetic `monitor` slot (measured live) — no `subCategories` filter applies. */
    subCategories: string[] | null;
    required: boolean;
    allowMultiple: boolean;
    maxQuantity: number;
    candidateCount: number;
    inStockCandidateCount: number;
}

export interface PcSlotsResponse {
    slots: PcSlotDef[];
}

/** One row from `GET /candidates` (contract §2). */
export interface PcCandidate {
    productId: string;
    name: string;
    sku: string;
    slug: string;
    price: number;
    oldPrice: number | null;
    imageUrl: string | null;
    inStock: boolean;
    /** Exact `filterAttributes` keys the importer wrote — display only, never re-derived. */
    filterAttributes: Record<string, string>;
    /** Never `Incompatible` — those rows are dropped server-side (honesty rule). */
    compatibility: 'Compatible' | 'CannotVerify';
}

export interface PcCandidatesResponse {
    items: PcCandidate[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    /** Ids passed in `build=` that no longer resolve to a published product. */
    unresolvedBuildProductIds: string[];
}

export interface PcCandidatesParams {
    slot: PcSlotId;
    /** Product ids already picked for OTHER slots (the slot's own pick is excluded server-side). */
    build?: string[];
    page?: number;
    pageSize?: number;
}

/** One item sent to `/check`, `/suggest`'s cart payload and `/builds`. */
export interface PcBuildItem {
    productId: string;
    quantity: number;
}

/** One fired/evaluated rule (contract §3, shared by `/check`, `/suggest`, `/builds`). */
export interface PcRuleResult {
    ruleId: string;
    ruleName: string;
    verdict: PcVerdict;
    /** Vietnamese, human-readable — render directly, never re-translate. */
    message: string;
    /** Present only on `cannotVerify` — the exact missing attribute names, per component. */
    missingKeys: string[] | null;
}

export interface PcCheckResponse {
    overallVerdict: PcVerdict;
    rules: PcRuleResult[];
    totalPrice: number;
    /** Honest `null` until the seed dataset carries TDP/power-draw keys — never fabricated. */
    estimatedWattageW: number | null;
    estimatedWattageNote: string | null;
    /** Required slots (contract: cpu/mainboard/ram/vga/storage/psu/case/cooler) with no item yet. */
    missingRequiredSlots: PcSlotId[];
    cartPayload: PcBuildItem[];
}

/** `POST /suggest` — "Gợi ý theo ngân sách" (D10). The word "AI" never appears in the UI. */
export interface PcSuggestParams {
    budget: number;
    useCase?: string;
}

export interface PcSuggestItem {
    slotId: PcSlotId;
    slotName: string;
    productId: string;
    name: string;
    sku: string;
    price: number;
}

export type PcSuggestResponse =
    | {
        status: 'ok';
        budget: number;
        useCase: string | null;
        totalPrice: number;
        withinBudget: boolean;
        items: PcSuggestItem[];
        overallVerdict: PcVerdict;
        rules: PcRuleResult[];
        cartPayload: PcBuildItem[];
    }
    | {
        status: 'cannotSuggest';
        budget: number;
        useCase: string | null;
        /** The constraint that failed, in Vietnamese — render as-is, never invent a reason. */
        reason: string;
    };

/** `POST /builds` (auth required) — save + share by code. */
export interface PcSaveBuildRequest {
    name: string;
    items: PcBuildItem[];
}

export interface PcSaveBuildResponse {
    id: string;
    buildCode: string;
    name: string;
    totalPrice: number;
    overallVerdict: PcVerdict;
    rules: PcRuleResult[];
}

/**
 * `GET /builds/{code}` — stored snapshot, not re-evaluated against today's
 * catalogue. Measured against `PcBuilderBuildsEndpoint.cs:GetBuildByCodeAsync`
 * (2026-09-19): `slotId` IS present per item (`i.ComponentType`, a real
 * `PcSlotId` or `"khac"` for an unresolved legacy row) — the contract doc's
 * prose ("no slotId") undersold this; kept here so a shared build can be
 * reloaded into the editable builder (see `pc-build-state-types.ts`). Price
 * is the snapshot `unitPrice`/`lineTotal`, NOT on `product` — `product` only
 * carries display fields (name/slug/imageUrl/sku), confirmed by reading the
 * anonymous object the endpoint returns.
 */
export interface PcSavedBuildItem {
    productId: string;
    slotId: PcSlotId | 'khac';
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product: {
        name: string;
        sku: string;
        slug: string;
        imageUrl: string | null;
    } | null;
}

export interface PcSavedBuildDetail {
    id: string;
    buildCode: string;
    name: string;
    totalPrice: number;
    isCompatible: boolean;
    items: PcSavedBuildItem[];
    rules: PcRuleResult[];
    createdAt?: string;
}

/** `GET /builds/my` (auth required) — summary list, newest first. */
export interface PcSavedBuildSummary {
    id: string;
    buildCode: string;
    name: string;
    totalPrice: number;
    isCompatible: boolean;
    createdAt: string;
    itemCount: number;
}

/* --------------------------------------------------------------- helpers */

const BASE = '/catalog/pc-builder';

/* ----------------------------------------------------------------- client */

export const pcBuilderApi = {
    getSlots: async (): Promise<PcSlotsResponse> => {
        const { data } = await client.get<PcSlotsResponse>(`${BASE}/slots`);
        return data;
    },

    getCandidates: async (params: PcCandidatesParams): Promise<PcCandidatesResponse> => {
        const { slot, build, page, pageSize } = params;
        const { data } = await client.get<PcCandidatesResponse>(`${BASE}/candidates`, {
            params: {
                slot,
                build: build && build.length > 0 ? build.join(',') : undefined,
                page,
                pageSize,
            },
        });
        return data;
    },

    check: async (items: PcBuildItem[]): Promise<PcCheckResponse> => {
        const { data } = await client.post<PcCheckResponse>(`${BASE}/check`, { items });
        return data;
    },

    suggest: async (params: PcSuggestParams): Promise<PcSuggestResponse> => {
        const { data } = await client.post<PcSuggestResponse>(`${BASE}/suggest`, params);
        return data;
    },

    saveBuild: async (payload: PcSaveBuildRequest): Promise<PcSaveBuildResponse> => {
        const { data } = await client.post<PcSaveBuildResponse>(`${BASE}/builds`, payload);
        return data;
    },

    getBuildByCode: async (code: string): Promise<PcSavedBuildDetail> => {
        const { data } = await client.get<PcSavedBuildDetail>(`${BASE}/builds/${code}`);
        return data;
    },

    getMyBuilds: async (): Promise<PcSavedBuildSummary[]> => {
        const { data } = await client.get<PcSavedBuildSummary[]>(`${BASE}/builds/my`);
        return data;
    },
};

/** Vietnamese slot labels, ordered as the picker/summary render them. Fallback only —
 *  `getSlots()`'s `name` is the source of truth; this covers the loading skeleton. */
export const PC_SLOT_LABELS: Record<PcSlotId, string> = {
    cpu: 'CPU',
    mainboard: 'Mainboard',
    ram: 'RAM',
    vga: 'VGA',
    storage: 'Ổ cứng',
    psu: 'Nguồn (PSU)',
    case: 'Vỏ case',
    cooler: 'Tản nhiệt',
    monitor: 'Màn hình',
};

/** Slot render order (required parts first, monitor last — cosmetic, not a compatibility slot). */
export const PC_SLOT_ORDER: PcSlotId[] = [
    'cpu', 'mainboard', 'ram', 'vga', 'storage', 'psu', 'case', 'cooler', 'monitor',
];
