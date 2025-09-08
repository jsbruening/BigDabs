"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
 AppBar,
 Toolbar,
 Typography,
 Button,
 Box,
 Avatar,
 IconButton,
} from '@mui/material';
import {
 Logout as LogoutIcon,
 Login as LoginIcon
} from '@mui/icons-material';

export function Header() {
 const { data: session } = useSession();
 const [mounted, setMounted] = useState(false);

 // Prevent hydration mismatch by only rendering after mount
 useEffect(() => {
  setMounted(true);
 }, []);

 // Always render the same structure during SSR
 if (!mounted) {
  return (
   <AppBar
    position="static"
    sx={{
     background: 'linear-gradient(90deg, rgba(55, 65, 81, 0.9) 0%, rgba(31, 41, 55, 0.9) 50%, rgba(17, 24, 39, 0.9) 100%)',
     backdropFilter: 'blur(20px)',
     borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
     boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    }}
   >
    <Toolbar sx={{ maxWidth: '1200px', mx: 'auto', width: '100%' }}>
     <Box
      component={Link}
      href="/"
      sx={{
       display: 'flex',
       alignItems: 'center',
       gap: 2,
       textDecoration: 'none',
       color: 'inherit',
       flexGrow: 1,
      }}
     >
      <Box
       component="img"
       src="/images/header.png"
       alt="Big Dabs"
       sx={{
        height: 37.5,
        maxWidth: '100%',
        objectFit: 'contain',
        objectPosition: 'center top',
        marginRight: -16,
        transform: 'scale(1.1)',
        transformOrigin: 'left center',
       }}
      />
     </Box>

     <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
       <Box sx={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
       <Box sx={{ width: 120, height: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }} />
      </Box>
      <Box sx={{ width: 40, height: 32, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }} />
     </Box>
    </Toolbar>
   </AppBar>
  );
 }

 return (
  <AppBar
   position="static"
   sx={{
    background: 'linear-gradient(90deg, rgba(55, 65, 81, 0.9) 0%, rgba(31, 41, 55, 0.9) 50%, rgba(17, 24, 39, 0.9) 100%)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
   }}
  >
   <Toolbar sx={{
    maxWidth: '1200px',
    mx: 'auto',
    width: '100%',
    px: 0,
    py: 0,
    minHeight: 'auto',
    height: 'auto',
    '&.MuiToolbar-root': {
     minHeight: 'auto',
     padding: '8px 0',
    }
   }}>
    <Box
     component={Link}
     href="/"
     sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      textDecoration: 'none',
      color: 'inherit',
      flexGrow: 1,
     }}
    >
     <Box
      component="img"
      src="/images/header.png"
      alt="Big Dabs"
      sx={{
       height: 37.5,
       maxWidth: '100%',
       objectFit: 'contain',
       objectPosition: 'center top',
       marginRight: -16,
       transform: 'scale(1.1)',
       transformOrigin: 'left center',
      }}
     />
    </Box>

    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      {session?.user ? (
       <Avatar
        src={session.user.image ?? undefined}
        alt={session.user.name ?? 'User'}
        sx={{
         width: 32,
         height: 32,
         border: '2px solid rgba(255, 255, 255, 0.3)',
        }}
       />
      ) : (
       <Box sx={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
      )}

      {session?.user ? (
       <Typography
        variant="body2"
        sx={{
         color: 'rgba(255, 255, 255, 0.8)',
         display: { xs: 'none', sm: 'block' }
        }}
       >
        Welcome, {session.user.name}
       </Typography>
      ) : (
       <Box sx={{ width: 120, height: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }} />
      )}
     </Box>

     <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 40 }}>
      {session?.user ? (
       <IconButton
        onClick={() => signOut()}
        sx={{ color: 'white', width: 40, height: 32 }}
       >
        <LogoutIcon />
       </IconButton>
      ) : (
       <Button
        component={Link}
        href="/signin"
        variant="outlined"
        size="small"
        startIcon={<LoginIcon />}
        sx={{
         color: 'white',
         borderColor: 'rgba(255, 255, 255, 0.3)',
         backgroundColor: 'rgba(255, 255, 255, 0.1)',
         backdropFilter: 'blur(10px)',
         textTransform: 'none',
         fontWeight: 500,
         width: 40,
         height: 32,
         minWidth: 40,
         padding: 0,
         '&:hover': {
          borderColor: 'rgba(255, 255, 255, 0.5)',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
         },
        }}
       >
        <LoginIcon />
       </Button>
      )}
     </Box>
    </Box>
   </Toolbar>
  </AppBar>
 );
}
