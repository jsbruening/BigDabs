"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Box, Typography, IconButton } from '@mui/material';
import { Home as HomeIcon, Settings as SettingsIcon } from '@mui/icons-material';

export function Navigation() {
 const { data: session } = useSession();
 const isAdmin = session?.user?.role === "ADMIN";
 return (
  <Box
   sx={{
    background: 'linear-gradient(90deg, rgba(55, 65, 81, 0.8) 0%, rgba(31, 41, 55, 0.8) 50%, rgba(17, 24, 39, 0.8) 100%)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    py: 0.25,
   }}
  >
   <Box
    sx={{
     maxWidth: '1200px',
     mx: 'auto',
     px: 2,
     display: 'flex',
     alignItems: 'center',
     gap: 1,
    }}
   >
    <IconButton
     component={Link}
     href="/"
     sx={{
      color: 'rgba(255, 255, 255, 0.8)',
      '&:hover': {
       color: 'white',
       backgroundColor: 'rgba(255, 255, 255, 0.1)',
      },
      transition: 'all 0.2s ease',
     }}
    >
     <HomeIcon />
    </IconButton>
    <Typography
     component={Link}
     href="/"
     sx={{
      color: 'rgba(255, 255, 255, 0.8)',
      textDecoration: 'none',
      fontWeight: 500,
      fontSize: '0.9rem',
      '&:hover': {
       color: 'white',
      },
      transition: 'color 0.2s ease',
     }}
    >
     Home
    </Typography>

    {isAdmin && (
     <>
      <Typography
       sx={{
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: '0.9rem',
        mx: 0.5,
       }}
      >
       •
      </Typography>
      <IconButton
       component={Link}
       href="/admin"
       sx={{
        color: 'rgba(255, 255, 255, 0.8)',
        '&:hover': {
         color: 'white',
         backgroundColor: 'rgba(255, 255, 255, 0.1)',
        },
        transition: 'all 0.2s ease',
       }}
      >
       <SettingsIcon />
      </IconButton>
      <Typography
       component={Link}
       href="/admin"
       sx={{
        color: 'rgba(255, 255, 255, 0.8)',
        textDecoration: 'none',
        fontWeight: 500,
        fontSize: '0.9rem',
        '&:hover': {
         color: 'white',
        },
        transition: 'color 0.2s ease',
       }}
      >
       Admin
      </Typography>
     </>
    )}
   </Box>
  </Box>
 );
}
