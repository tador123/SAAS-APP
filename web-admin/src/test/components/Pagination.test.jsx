import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Pagination from '../../components/Pagination';

describe('Pagination', () => {
  const defaultPagination = { page: 1, totalPages: 5, total: 50 };

  it('renders page info', () => {
    render(<Pagination pagination={defaultPagination} onPageChange={() => {}} />);
    // Page text is split across spans with whitespace
    const info = screen.getByText((_, el) => el?.tagName === 'P' && /Page\s*1\s*of\s*5/.test(el.textContent));
    expect(info).toBeInTheDocument();
  });

  it('disables Previous and First on first page', () => {
    const { container } = render(<Pagination pagination={defaultPagination} onPageChange={() => {}} />);
    const firstBtn = container.querySelector('button[aria-label*="irst"]');
    const prevBtn = container.querySelector('button[aria-label*="revious"]');
    expect(firstBtn).toBeDisabled();
    expect(prevBtn).toBeDisabled();
  });

  it('disables Next and Last on last page', () => {
    const { container } = render(<Pagination pagination={{ page: 5, totalPages: 5, total: 50 }} onPageChange={() => {}} />);
    const nextBtn = container.querySelector('button[aria-label*="ext"]');
    const lastBtn = container.querySelector('button[aria-label*="ast"]');
    expect(nextBtn).toBeDisabled();
    expect(lastBtn).toBeDisabled();
  });

  it('calls onPageChange with correct page number', () => {
    const onChange = vi.fn();
    const { container } = render(<Pagination pagination={{ page: 2, totalPages: 5, total: 50 }} onPageChange={onChange} />);
    const nextBtn = container.querySelector('button[aria-label*="ext"]');
    const prevBtn = container.querySelector('button[aria-label*="revious"]');
    fireEvent.click(nextBtn);
    expect(onChange).toHaveBeenCalledWith(3);
    fireEvent.click(prevBtn);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('renders nothing for single page', () => {
    const { container } = render(<Pagination pagination={{ page: 1, totalPages: 1, total: 5 }} onPageChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
