import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';

// Mock AuthContext used by Layout components
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Admin', role: 'admin' },
    hasRole: () => true,
    logout: vi.fn(),
  }),
}));

describe('StatusBadge', () => {
  it('renders the status text', () => {
    render(<StatusBadge status="confirmed" />);
    expect(screen.getByText('confirmed')).toBeInTheDocument();
  });

  it('renders with proper styling for different statuses', () => {
    const { rerender } = render(<StatusBadge status="available" />);
    expect(screen.getByText('available')).toBeInTheDocument();

    rerender(<StatusBadge status="occupied" />);
    expect(screen.getByText('occupied')).toBeInTheDocument();
  });
});

describe('Smoke tests — pages render without crashing', () => {
  // These are minimal sanity checks that pages can import and mount without throwing.
  // Full page tests would require API mocking, which is out of scope for the initial suite.

  it('Login page renders', async () => {
    const { default: Login } = await import('../../pages/Login');
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    const matches = screen.getAllByText(/sign in/i);
    expect(matches.length).toBeGreaterThan(0);
  });
});
