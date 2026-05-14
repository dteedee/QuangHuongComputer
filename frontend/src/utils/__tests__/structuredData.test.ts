import { describe, it, expect } from 'vitest';
import {
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateBreadcrumbSchema,
  generateProductSchema,
  generateItemListSchema,
  generateFAQSchema,
} from '../structuredData';

describe('structuredData', () => {
  describe('generateOrganizationSchema', () => {
    it('returns ComputerStore schema', () => {
      const schema = generateOrganizationSchema();
      expect(schema['@type']).toBe('ComputerStore');
      expect(schema.name).toBe('Quang Hưởng Computer');
      expect(schema['@context']).toBe('https://schema.org');
    });
  });

  describe('generateWebsiteSchema', () => {
    it('returns WebSite schema with SearchAction', () => {
      const schema = generateWebsiteSchema();
      expect(schema['@type']).toBe('WebSite');
      expect(schema.potentialAction['@type']).toBe('SearchAction');
    });
  });

  describe('generateBreadcrumbSchema', () => {
    it('returns BreadcrumbList with correct positions', () => {
      const items = [
        { name: 'Trang chủ', url: '/' },
        { name: 'Laptop', url: '/danh-muc/laptop' },
      ];
      const schema = generateBreadcrumbSchema(items);
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement).toHaveLength(2);
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[1].position).toBe(2);
    });
  });

  describe('generateProductSchema', () => {
    it('returns Product schema with correct fields', () => {
      const product = {
        id: '123',
        name: 'Laptop ASUS',
        description: 'Test laptop',
        price: 15000000,
        oldPrice: 18000000,
        sku: 'ASUS-001',
        brandId: 'brand1',
        imageUrl: '/img/test.jpg',
        status: 'InStock',
        averageRating: 4.5,
        reviewCount: 10,
        slug: 'laptop-asus',
      } as any;

      const schema = generateProductSchema(product);
      expect(schema['@type']).toBe('Product');
      expect(schema.name).toBe('Laptop ASUS');
      expect(schema.offers.price).toBe(15000000);
      expect(schema.offers.availability).toBe('https://schema.org/InStock');
      expect(schema.aggregateRating.ratingValue).toBe('4.5');
    });

    it('excludes aggregateRating when no reviews', () => {
      const product = {
        id: '123',
        name: 'Test',
        price: 100,
        sku: 'T1',
        brandId: 'b1',
        status: 'InStock',
        averageRating: 0,
        reviewCount: 0,
      } as any;

      const schema = generateProductSchema(product);
      expect(schema.aggregateRating).toBeUndefined();
    });
  });

  describe('generateItemListSchema', () => {
    it('returns ItemList schema with correct count', () => {
      const products = [
        { id: '1', name: 'Product A', price: 1000, sku: 'P1', brandId: 'b1', status: 'InStock', averageRating: 0, reviewCount: 0 },
        { id: '2', name: 'Product B', price: 2000, sku: 'P2', brandId: 'b1', status: 'InStock', averageRating: 0, reviewCount: 0 },
      ] as any[];

      const schema = generateItemListSchema(products, 'Laptop');
      expect(schema['@type']).toBe('ItemList');
      expect(schema.numberOfItems).toBe(2);
      expect(schema.itemListElement).toHaveLength(2);
      expect(schema.itemListElement[0].position).toBe(1);
    });
  });

  describe('generateFAQSchema', () => {
    it('returns FAQPage schema', () => {
      const faqs = [{ question: 'Bảo hành bao lâu?', answer: '12 tháng' }];
      const schema = generateFAQSchema(faqs);
      expect(schema['@type']).toBe('FAQPage');
      expect(schema.mainEntity).toHaveLength(1);
      expect(schema.mainEntity[0]['@type']).toBe('Question');
    });
  });
});
