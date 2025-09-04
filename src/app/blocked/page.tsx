"use client";

import { Box, Container, Typography, Paper, Button } from "@mui/material";
import { Block as BlockIcon } from "@mui/icons-material";
import { useSession, signOut } from "next-auth/react";

export default function BlockedPage() {
 const { data: session } = useSession();

 const handleSignOut = () => {
  void signOut({ callbackUrl: "/" });
 };

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
   <Container maxWidth="sm">
    <Paper
     sx={{
      p: 4,
      textAlign: 'center',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(25px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: 3,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
     }}
    >
     <BlockIcon
      sx={{
       fontSize: 80,
       color: 'error.main',
       mb: 2
      }}
     />

     <Typography variant="h4" component="h1" gutterBottom color="error">
      Account Blocked
     </Typography>

     <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
      Your account has been blocked and you cannot access this application.
     </Typography>

     {session?.user?.name && (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
       User: <strong>{session.user.name}</strong>
      </Typography>
     )}

     <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
      If you believe this is an error, please contact an administrator.
     </Typography>

     <Button
      variant="contained"
      color="primary"
      onClick={handleSignOut}
      size="large"
     >
      Sign Out
     </Button>
    </Paper>
   </Container>
  </Box>
 );
}
