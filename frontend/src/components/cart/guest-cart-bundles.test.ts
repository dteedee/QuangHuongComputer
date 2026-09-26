import { describe, it, expect, beforeEach } from 'vitest';
import { browserStorage } from '../../lib/browser-storage';
import { addGuestBundle, breakGuestBundle, readGuestBundles } from './guest-cart-bundles';
import { readGuestLines, writeGuestLines } from './guest-cart-storage';

describe('guest-cart-bundles', () => {
    beforeEach(() => { browserStorage.removeItem('qhc.cart.guest.bundles.v1'); writeGuestLines([]); });

    it('thêm lại cùng combo thì cộng dồn số bộ, tối đa 10', () => {
        addGuestBundle('b1', 1);
        addGuestBundle('b1', 2);
        expect(readGuestBundles()).toEqual([{ bundleId: 'b1', quantity: 3 }]);
        addGuestBundle('b1', 20);
        expect(readGuestBundles()[0].quantity).toBe(10);
    });

    it('vỡ combo: gỡ nhóm, món còn lại thành dòng lẻ gộp với dòng sẵn có', () => {
        writeGuestLines([{ productId: 'p2', quantity: 1 }]);
        addGuestBundle('b1', 1);

        breakGuestBundle('b1', [{ productId: 'p1', quantity: 1 }, { productId: 'p2', quantity: 1 }], { productId: 'p1', quantity: 0 });

        expect(readGuestBundles()).toEqual([]);
        expect(readGuestLines()).toEqual([{ productId: 'p2', variantId: undefined, quantity: 2 }]);
    });
});
