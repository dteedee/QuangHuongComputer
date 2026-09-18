/**
 * VND integer amount -> Vietnamese words, for the A5 delivery note's COD line and the A6
 * deposit receipt. No external lib — the vocabulary is fixed and small.
 */
const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readThree(n: number, isFirstGroup: boolean): string {
    const tram = Math.floor(n / 100);
    const chuc = Math.floor((n % 100) / 10);
    const donvi = n % 10;
    const parts: string[] = [];

    if (tram > 0 || !isFirstGroup) parts.push(DIGITS[tram], 'trăm');
    if (chuc === 0) {
        if (donvi > 0 && (tram > 0 || !isFirstGroup)) parts.push('lẻ');
    } else if (chuc === 1) {
        parts.push('mười');
    } else {
        parts.push(DIGITS[chuc], 'mươi');
    }

    if (donvi === 1 && chuc >= 2) parts.push('mốt');
    else if (donvi === 5 && chuc >= 1) parts.push('lăm');
    else if (donvi > 0) parts.push(DIGITS[donvi]);

    return parts.join(' ').trim();
}

/** `1150000` -> "một triệu một trăm năm mươi nghìn đồng" (capitalised first letter). */
export function amountInWords(amount: number): string {
    const value = Math.round(Math.abs(amount));
    if (value === 0) return 'Không đồng';

    const groups: number[] = [];
    let rest = value;
    while (rest > 0) {
        groups.unshift(rest % 1000);
        rest = Math.floor(rest / 1000);
    }
    const groupUnits = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
    const total = groups.length;

    const words: string[] = [];
    groups.forEach((g, idx) => {
        if (g === 0) return;
        const unit = groupUnits[total - 1 - idx] ?? '';
        const text = readThree(g, idx === 0);
        words.push(unit ? `${text} ${unit}` : text);
    });

    const sentence = `${words.join(' ')} đồng`.replace(/\s+/g, ' ').trim();
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
