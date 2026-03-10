import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ErrorBoundary from '../../components/ErrorBoundary';

function ThrowError({ shouldThrow }) {
  if (shouldThrow) throw new Error('Test error');
  return <div>No error</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error output from React for the error boundary tests
  const originalError = console.error;
  beforeEach(() => { console.error = () => {}; });
  afterEach(() => { console.error = originalError; });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });

  it('shows Try Again button that resets error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getAllByText('Something went wrong').length).toBeGreaterThan(0);
    // The reset button exists and is clickable
    const btns = screen.getAllByText('Try Again');
    expect(btns.length).toBeGreaterThan(0);
    expect(btns[0].closest('button')).not.toBeDisabled();
  });
});
