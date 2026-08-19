export interface LegacySpecs { [key: string]: string; }

export const PRODUCT_ID_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parse legacy JSON string specifications to key→value map. */
export function parseLegacySpecifications(specString?: string): LegacySpecs {
    if (!specString) return {};
    try {
        const parsed = JSON.parse(specString);
        if (Array.isArray(parsed)) {
            const res: LegacySpecs = {};
            parsed.forEach((item: { label?: string; value?: string }) => {
                if (item?.label) res[item.label] = item.value ?? '';
            });
            return res;
        }
        if (parsed && typeof parsed === 'object') {
            const res: LegacySpecs = {};
            Object.entries(parsed as Record<string, unknown>).forEach(([k, v]) => {
                res[k] = String(v);
            });
            return res;
        }
        return {};
    } catch {
        const specs: LegacySpecs = {};
        specString.split('\n').forEach((line) => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) specs[key.trim()] = valueParts.join(':').trim();
        });
        return specs;
    }
}
