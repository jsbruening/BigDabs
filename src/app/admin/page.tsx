"use client";

import { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  TextField,
} from "@mui/material";
import {
  AdminPanelSettings,
  Person,
  Check,
  Block,
  LockOpen,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { type Role } from "@prisma/client";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: Role;
  isBlocked: boolean;
  blockedAt: Date | null;
  blockReason: string | null;
  _count: {
    createdGames: number;
    participants: number;
  };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<Role>("USER");
  const [blockReason, setBlockReason] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"role" | "block" | "unblock" | "delete">("role");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");

  const { data: users, refetch, isLoading: usersLoading } = api.user.getAll.useQuery();
  const updateRoleMutation = api.user.updateRole.useMutation({
    onSuccess: () => {
      setSnackbarMessage("User role updated successfully!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setConfirmDialogOpen(false);
      setSelectedUser(null);
      void refetch();
    },
    onError: (error: { message?: string }) => {
      setSnackbarMessage(error.message ?? "Failed to update user role");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    },
  });

  const blockUserMutation = api.user.blockUser.useMutation({
    onSuccess: () => {
      setSnackbarMessage("User blocked successfully!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setBlockDialogOpen(false);
      setSelectedUser(null);
      setBlockReason("");
      void refetch();
    },
    onError: (error: { message?: string }) => {
      setSnackbarMessage(error.message ?? "Failed to block user");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    },
  });

  const unblockUserMutation = api.user.unblockUser.useMutation({
    onSuccess: () => {
      setSnackbarMessage("User unblocked successfully!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setConfirmDialogOpen(false);
      setSelectedUser(null);
      void refetch();
    },
    onError: (error: { message?: string }) => {
      setSnackbarMessage(error.message ?? "Failed to unblock user");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    },
  });

  const deleteUserMutation = api.user.deleteUser.useMutation({
    onSuccess: () => {
      setSnackbarMessage("User deleted successfully!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setConfirmDialogOpen(false);
      setSelectedUser(null);
      void refetch();
    },
    onError: (error: { message?: string }) => {
      setSnackbarMessage(error.message ?? "Failed to delete user");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    },
  });

  const handleRoleChange = (user: User, role: Role) => {
    setSelectedUser(user);
    setNewRole(role);
    setActionType("role");
    setConfirmDialogOpen(true);
  };

  const handleBlockUser = (user: User) => {
    setSelectedUser(user);
    setActionType("block");
    setBlockDialogOpen(true);
  };

  const handleUnblockUser = (user: User) => {
    setSelectedUser(user);
    setActionType("unblock");
    setConfirmDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setActionType("delete");
    setConfirmDialogOpen(true);
  };

  const confirmRoleChange = () => {
    if (selectedUser) {
      updateRoleMutation.mutate({
        userId: selectedUser.id,
        role: newRole,
      });
    }
  };

  const confirmBlockUser = () => {
    if (selectedUser) {
      blockUserMutation.mutate({
        userId: selectedUser.id,
        reason: blockReason || undefined,
      });
    }
  };

  const confirmUnblockUser = () => {
    if (selectedUser) {
      unblockUserMutation.mutate({
        userId: selectedUser.id,
      });
    }
  };

  const confirmDeleteUser = () => {
    if (selectedUser) {
      deleteUserMutation.mutate({ userId: selectedUser.id });
    }
  };

  const getRoleColor = (role: Role) => {
    return role === "ADMIN" ? "error" : "default";
  };

  const getRoleIcon = (role: Role) => {
    return role === "ADMIN" ? <AdminPanelSettings /> : <Person />;
  };

  const getBlockStatusColor = (isBlocked: boolean) => {
    return isBlocked ? "error" : "success";
  };

  const getBlockStatusText = (isBlocked: boolean) => {
    return isBlocked ? "Blocked" : "Active";
  };

  if (status === "loading") {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: `
          radial-gradient(circle at 20% 80%, rgba(75, 85, 99, 0.8) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(55, 65, 81, 0.9) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(31, 41, 55, 0.7) 0%, transparent 50%),
          linear-gradient(135deg, #374151 0%, #1f2937 25%, #111827 50%, #0f172a 75%, #1e293b 100%)
        `,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    );
  }

  if (!session?.user || session.user.role !== "ADMIN") {
    return null; // redirect elsewhere handled globally
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `
        radial-gradient(circle at 20% 80%, rgba(75, 85, 99, 0.8) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(55, 65, 81, 0.9) 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, rgba(31, 41, 55, 0.7) 0%, transparent 50%),
        linear-gradient(135deg, #374151 0%, #1f2937 25%, #111827 50%, #0f172a 75%, #1e293b 100%)
      `,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
          User Management
        </Typography>
        <Typography variant="body1" sx={{ mb: 3, color: 'rgba(255, 255, 255, 0.8)' }}>
          Manage user roles and permissions for Big Dabs
        </Typography>

        <Paper
          sx={{
            p: 3,
            background: 'rgba(255, 255, 255, 0.55)',
            backdropFilter: 'blur(25px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            minHeight: 240,
            position: 'relative'
          }}
        >
          {usersLoading && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.35)' }}>
              <CircularProgress />
            </Box>
          )}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Games Created</TableCell>
                  <TableCell>Games Played</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar
                          src={user.image ?? undefined}
                          alt={user.name ?? "User"}
                          sx={{ width: 40, height: 40 }}
                        />
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {user.name ?? "Unknown User"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {user.id.slice(-8)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.email ?? "No email"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getRoleIcon(user.role)}
                        label={user.role}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getBlockStatusText(user.isBlocked)}
                        color={getBlockStatusColor(user.isBlocked)}
                        size="small"
                      />
                      {user.isBlocked && user.blockReason && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          Reason: {user.blockReason}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {(user as unknown as User)._count.createdGames
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {(user as unknown as User)._count.participants
                        }
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" gap={1} justifyContent="center">
                        {user.role === "USER" ? (
                          <Tooltip title="Promote to Admin">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRoleChange(user as unknown as User, "ADMIN")}
                              disabled={updateRoleMutation.isPending}
                            >
                              <AdminPanelSettings />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Demote to User">
                            <IconButton
                              size="small"
                              color="default"
                              onClick={() => handleRoleChange(user as unknown as User, "USER")}
                              disabled={
                                updateRoleMutation.isPending ||
                                user.id === session?.user?.id
                              }
                            >
                              <Person />
                            </IconButton>
                          </Tooltip>
                        )}
                        {user.isBlocked ? (
                          <Tooltip title="Unblock User">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleUnblockUser(user as unknown as User)}
                              disabled={unblockUserMutation.isPending}
                            >
                              <LockOpen />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Block User">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleBlockUser(user as unknown as User)}
                              disabled={blockUserMutation.isPending || user.id === session?.user?.id}
                            >
                              <Block />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete User (force)">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteUser(user as unknown as User)}
                            disabled={deleteUserMutation.isPending || user.id === session?.user?.id}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {users?.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No users found
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
          <DialogTitle>
            {actionType === "role" ? "Confirm Role Change" : actionType === "delete" ? "Confirm Delete User" : "Confirm Unblock User"}
          </DialogTitle>
          <DialogContent>
            {actionType === "role" && (
              <>
                <Typography>
                  Are you sure you want to change <strong>{selectedUser?.name ?? "Unknown User"}</strong>&apos;s role to <strong>{newRole}</strong>?
                </Typography>
                {selectedUser?.id === session?.user?.id && newRole === "USER" && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    You cannot demote yourself from admin role.
                  </Alert>
                )}
              </>
            )}
            {actionType === "unblock" && (
              <Typography>
                Are you sure you want to unblock <strong>{selectedUser?.name ?? "Unknown User"}</strong>?
              </Typography>
            )}
            {actionType === "delete" && (
              <Alert severity="error">
                This will permanently remove <strong>{selectedUser?.name ?? "Unknown User"}</strong>, all games they created, and all of their participations, cards, and results. This cannot be undone.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setConfirmDialogOpen(false)}
              disabled={updateRoleMutation.isPending || unblockUserMutation.isPending || deleteUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={actionType === "role" ? confirmRoleChange : actionType === "unblock" ? confirmUnblockUser : confirmDeleteUser}
              color={actionType === "delete" ? "error" : "primary"}
              variant="contained"
              disabled={updateRoleMutation.isPending || unblockUserMutation.isPending || deleteUserMutation.isPending}
              startIcon={
                (updateRoleMutation.isPending || unblockUserMutation.isPending || deleteUserMutation.isPending) ?
                  <CircularProgress size={16} /> :
                  <Check />
              }
            >
              {(updateRoleMutation.isPending || unblockUserMutation.isPending || deleteUserMutation.isPending) ?
                "Processing..." :
                actionType === "delete" ? "Delete" : "Confirm"
              }
            </Button>
          </DialogActions>
        </Dialog>

        {/* Block User Dialog */}
        <Dialog open={blockDialogOpen} onClose={() => setBlockDialogOpen(false)}>
          <DialogTitle>
            Block User
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              Are you sure you want to block{" "}
              <strong>{selectedUser?.name ?? "Unknown User"}</strong>?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Blocked users will not be able to access the application.
            </Typography>
            <TextField
              label="Reason (optional)"
              multiline
              rows={3}
              fullWidth
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Enter reason for blocking this user..."
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setBlockDialogOpen(false);
                setBlockReason("");
              }}
              disabled={blockUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmBlockUser}
              color="error"
              variant="contained"
              disabled={blockUserMutation.isPending}
              startIcon={blockUserMutation.isPending ? <CircularProgress size={16} /> : <Block />}
            >
              {blockUserMutation.isPending ? "Blocking..." : "Block User"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarSeverity}
            sx={{ width: "100%" }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}
