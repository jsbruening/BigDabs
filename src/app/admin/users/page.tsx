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
} from "@mui/material";
import {
 AdminPanelSettings,
 Person,
 Check,
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
 _count: {
  createdGames: number;
  participants: number;
 };
}

export default function UserAdminPage() {
 const { data: session } = useSession();
 const [selectedUser, setSelectedUser] = useState<User | null>(null);
 const [newRole, setNewRole] = useState<Role>("USER");
 const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
 const [snackbarOpen, setSnackbarOpen] = useState(false);
 const [snackbarMessage, setSnackbarMessage] = useState("");
 const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");

 const { data: users, isLoading, refetch } = api.user.getAll.useQuery();
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

 const handleRoleChange = (user: User, role: Role) => {
  setSelectedUser(user);
  setNewRole(role);
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

 const getRoleColor = (role: Role) => {
  return role === "ADMIN" ? "error" : "default";
 };

 const getRoleIcon = (role: Role) => {
  return role === "ADMIN" ? <AdminPanelSettings /> : <Person />;
 };



 if (isLoading) {
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
     }}
    >
     <TableContainer>
      <Table>
       <TableHead>
        <TableRow>
         <TableCell>User</TableCell>
         <TableCell>Email</TableCell>
         <TableCell>Role</TableCell>
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
           <Typography variant="body2">
            {(user as unknown as User)._count.createdGames}
           </Typography>
          </TableCell>
          <TableCell>
           <Typography variant="body2">
            {(user as unknown as User)._count.participants}
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
      Confirm Role Change
     </DialogTitle>
     <DialogContent>
      <Typography>
       Are you sure you want to change{" "}
       <strong>{selectedUser?.name ?? "Unknown User"}</strong>&apos;s role to{" "}
       <strong>{newRole}</strong>?
      </Typography>
      {selectedUser?.id === session?.user?.id && newRole === "USER" && (
       <Alert severity="warning" sx={{ mt: 2 }}>
        You cannot demote yourself from admin role.
       </Alert>
      )}
     </DialogContent>
     <DialogActions>
      <Button
       onClick={() => setConfirmDialogOpen(false)}
       disabled={updateRoleMutation.isPending}
      >
       Cancel
      </Button>
      <Button
       onClick={confirmRoleChange}
       color="primary"
       variant="contained"
       disabled={updateRoleMutation.isPending}
       startIcon={updateRoleMutation.isPending ? <CircularProgress size={16} /> : <Check />}
      >
       {updateRoleMutation.isPending ? "Updating..." : "Confirm"}
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
