import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DatePicker } from './date-picker';

describe('DatePicker', () => {
  it('renders with formatted date and opens popover on click', () => {
    render(<DatePicker value="2026-05-22" onChange={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /May 22, 2026/i });
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: 'Go to previous month' })).toBeInTheDocument();
  });

  it('does not trigger onChange when navigating months, only on day selection', () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-05-22" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /May 22, 2026/i }));

    const prevMonthButton = screen.getByRole('button', { name: 'Go to previous month' });
    fireEvent.click(prevMonthButton);
    expect(onChange).not.toHaveBeenCalled();

    const nextMonthButton = screen.getByRole('button', { name: 'Go to next month' });
    fireEvent.click(nextMonthButton);
    expect(onChange).not.toHaveBeenCalled();

    const day15 = screen.getByRole('gridcell', { name: '15' });
    fireEvent.click(day15);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('2026-05-15');
  });
});
