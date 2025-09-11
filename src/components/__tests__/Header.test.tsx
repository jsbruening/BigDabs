import { render, screen } from '@testing-library/react';
import { Header } from '../Header';
import React from 'react';

jest.mock('next-auth/react', () => ({
 __esModule: true,
 useSession: () => ({
  data: {
   user: { id: 'u1', name: 'Tester', email: 't@example.com', role: 'ADMIN', isBlocked: false },
   expires: '2099-01-01T00:00:00.000Z'
  },
  status: 'authenticated',
 }),
 signOut: jest.fn(),
}));

describe('Header', () => {
 it('renders welcome with user name', () => {
  render(<Header />);
  expect(screen.getByText(/Welcome, Tester/i)).toBeInTheDocument();
 });
});
