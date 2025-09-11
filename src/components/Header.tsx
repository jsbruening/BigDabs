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
 Menu,
 MenuItem,
 ListItemIcon,
 ListItemText,
 Divider,
} from '@mui/material';
import {
 Logout as LogoutIcon,
 Login as LoginIcon,
 Person as PersonIcon,
} from '@mui/icons-material';
import { ProfileDrawer } from "./ProfileDrawer";

export function Header() {
 const { data: session } = useSession();
 const [mounted, setMounted] = useState(false);
 const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
 const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);

 // Prevent hydration mismatch by only rendering after mount
 useEffect(() => {
  setMounted(true);
 }, []);

 const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
  setAnchorEl(event.currentTarget);
 };

 const handleMenuClose = () => {
  setAnchorEl(null);
 };

 const handleSignOut = () => {
  handleMenuClose();
  void signOut();
 };

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
       <Box sx={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
       <Box sx={{ width: 120, height: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 40 }}>
       <Box sx={{ width: 40, height: 32, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }} />
      </Box>
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
       <IconButton
        onClick={handleMenuOpen}
        sx={{
         padding: 0,
         '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
         },
        }}
       >
        <Avatar
         src={session.user.image ?? undefined}
         alt={session.user.name ?? 'User'}
         sx={{
          width: 32,
          height: 32,
          border: '2px solid rgba(255, 255, 255, 0.3)',
          cursor: 'pointer',
         }}
        />
       </IconButton>
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

     {!session?.user && (
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 40 }}>
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
      </Box>
     )}
    </Box>
   </Toolbar>

   {/* User Menu */}
   <Menu
    anchorEl={anchorEl}
    open={Boolean(anchorEl)}
    onClose={handleMenuClose}
    onClick={handleMenuClose}
    PaperProps={{
     elevation: 0,
     sx: {
      overflow: 'visible',
      filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
      mt: 1.5,
      '& .MuiAvatar-root': {
       width: 32,
       height: 32,
       ml: -0.5,
       mr: 1,
      },
      '&:before': {
       content: '""',
       display: 'block',
       position: 'absolute',
       top: 0,
       right: 14,
       width: 10,
       height: 10,
       bgcolor: 'background.paper',
       transform: 'translateY(-50%) rotate(45deg)',
       zIndex: 0,
      },
     },
    }}
    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
   >
    <MenuItem onClick={handleMenuClose}>
     <Avatar
      src={session?.user?.image ?? undefined}
      alt={session?.user?.name ?? 'User'}
      sx={{ width: 24, height: 24, mr: 1 }}
     />
     <ListItemText
      primary={session?.user?.name ?? 'User'}
      secondary={session?.user?.email}
     />
    </MenuItem>
    <Divider />
    <MenuItem
     onClick={() => {
      setProfileDrawerOpen(true);
      handleMenuClose();
     }}
    >
     <ListItemIcon>
      <PersonIcon fontSize="small" />
     </ListItemIcon>
     <ListItemText>Profile</ListItemText>
    </MenuItem>
    <Divider />
    <MenuItem onClick={handleSignOut}>
     <ListItemIcon>
      <LogoutIcon fontSize="small" />
     </ListItemIcon>
     <ListItemText>Sign Out</ListItemText>
    </MenuItem>
   </Menu>

   <ProfileDrawer
    open={profileDrawerOpen}
    onClose={() => setProfileDrawerOpen(false)}
   />
  </AppBar>
 );
}
