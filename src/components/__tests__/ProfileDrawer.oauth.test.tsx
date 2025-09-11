import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ProfileDrawer } from '../ProfileDrawer';

jest.mock('next-auth/react', () => ({
 __esModule: true,
 useSession: () => ({
  data: {
   user: { id: 'u1', name: 'OAuth User', email: 'oauth@example.com', role: 'USER', isBlocked: false },
   expires: '2099-01-01T00:00:00.000Z'
  },
  status: 'authenticated',
 }),
}));

describe('ProfileDrawer (OAuth)', () => {
 beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
   ok: true,
   json: async () => ({ isOAuth: true, hasPassword: false })
  } as unknown as Response);
 });

 afterEach(() => {
  jest.resetAllMocks();
 });

 it('renders provider-managed notice and no edit controls for OAuth users', async () => {
  render(<ProfileDrawer open onClose={jest.fn()} />);

  // Wait for effect to complete and profile to be loaded
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByText(/Profile name and avatar are managed by your OAuth provider/i)).toBeInTheDocument());

  // No editable name input visible
  const nameField = screen.queryByLabelText(/name/i);
  expect(nameField).toBeNull();

  // Upload avatar action absent
  const upload = screen.queryByTitle(/upload avatar/i);
  expect(upload).toBeNull();
 });
});
