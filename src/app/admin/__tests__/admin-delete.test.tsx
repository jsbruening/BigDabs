import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import AdminPage from '../../admin/page';

jest.mock('next-auth/react', () => ({
 __esModule: true,
 useSession: () => ({ data: { user: { id: 'admin1', name: 'Admin', role: 'ADMIN', isBlocked: false }, expires: '2099-01-01T00:00:00.000Z' }, status: 'authenticated' }),
}));

jest.mock('~/trpc/react', () => ({
 api: {
  user: {
   getAll: { useQuery: () => ({ data: [{ id: 'u2', name: 'DeleteMe', email: 'd@example.com', image: null, role: 'USER', isBlocked: false, blockedAt: null, blockReason: null, _count: { createdGames: 0, participants: 0 } }], isLoading: false, refetch: jest.fn() }) },
   updateRole: { useMutation: () => ({ isPending: false, mutate: jest.fn() }) },
   blockUser: { useMutation: () => ({ isPending: false, mutate: jest.fn() }) },
   unblockUser: { useMutation: () => ({ isPending: false, mutate: jest.fn() }) },
   deleteUser: { useMutation: () => ({ isPending: false, mutate: jest.fn() }) },
  },
 },
}));

describe('Admin delete user', () => {
 it('shows confirm dialog when clicking delete', () => {
  render(<AdminPage />);
  const delButtons = screen.getAllByRole('button', { name: /delete user/i });
  fireEvent.click(delButtons[0]);
  expect(screen.getByText(/confirm delete user/i)).toBeInTheDocument();
  expect(screen.getByText(/permanently remove/i)).toBeInTheDocument();
 });
});
