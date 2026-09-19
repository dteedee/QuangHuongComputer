import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useAppForm } from './form';
import { MoneyField } from './form-text-fields';

const schema = z.object({ price: z.number().optional() });

function ValueDump({ control }: { control: Parameters<typeof useWatch>[0]['control'] }) {
  const values = useWatch({ control });
  return <pre data-testid="value">{JSON.stringify(values)}</pre>;
}

function Harness({ min, max }: { min?: number; max?: number }) {
  const form = useAppForm({ schema, defaultValues: { price: undefined } });
  return (
    <FormProvider {...form}>
      <MoneyField name="price" control={form.control} label="Giá" min={min} max={max} />
      <ValueDump control={form.control} />
    </FormProvider>
  );
}

/** D01: MoneyField hiển thị nghìn-phân-cách kiểu VN, giá trị lưu trong form là số nguyên đồng. */
describe('MoneyField', () => {
  it('gõ "1000000" -> hiển thị "1.000.000" và giá trị form là số nguyên 1000000 (không phải chuỗi)', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Giá');
    await userEvent.type(input, '1000000');
    expect(input).toHaveValue('1.000.000');
    expect(screen.getByTestId('value').textContent).toBe('{"price":1000000}');
  });

  it('gõ ký tự không phải số (vd "12a3") -> chỉ giữ lại chữ số, không crash, không NaN', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Giá');
    await userEvent.type(input, '12a3');
    expect(input).toHaveValue('123');
    expect(screen.getByTestId('value').textContent).toBe('{"price":123}');
  });

  it('xoá hết nội dung -> value form về undefined (không phải 0 hay NaN)', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Giá');
    await userEvent.type(input, '500');
    await userEvent.clear(input);
    expect(screen.getByTestId('value').textContent).toBe('{}');
  });

  it('vượt quá `max` -> giá trị bị kẹp về đúng max, không vượt', async () => {
    render(<Harness max={100} />);
    const input = screen.getByLabelText('Giá');
    await userEvent.type(input, '500');
    expect(screen.getByTestId('value').textContent).toBe('{"price":100}');
  });
});
