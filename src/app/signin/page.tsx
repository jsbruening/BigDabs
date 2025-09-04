"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Container,

  Fade,
  Slide,
  CircularProgress
} from '@mui/material';
import {
  Google as GoogleIcon,
  GitHub as GitHubIcon
} from '@mui/icons-material';

// Custom Discord icon component
const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M20.317 4.369A19.791 19.791 0 0 0 16.558 3c-.2.356-.43.83-.589 1.205-1.706-.255-3.41-.255-5.116 0-.16-.375-.39-.85-.59-1.205-1.4.266-2.79.73-4.06 1.37C2.13 9.193 1.28 13.93 1.6 18.605c1.7 1.26 3.35 2.03 4.96 2.53.4-.55.76-1.14 1.07-1.76-.59-.22-1.16-.48-1.7-.78.14-.1.27-.21.4-.32 3.28 1.53 6.83 1.53 10.06 0 .13.11.26.22.4.32-.54.31-1.11.57-1.7.78.31.62.67 1.2 1.07 1.76 1.61-.5 3.27-1.27 4.96-2.53.41-5.86-.69-10.56-2.44-14.236ZM8.68 15.31c-.98 0-1.79-.9-1.79-2.01 0-1.12.79-2.02 1.79-2.02 1 0 1.81.9 1.79 2.02 0 1.11-.79 2.01-1.79 2.01Zm6.64 0c-.98 0-1.79-.9-1.79-2.01 0-1.12.79-2.02 1.79-2.02s1.81.9 1.79 2.02c0 1.11-.79 2.01-1.79 2.01Z" />
  </svg>
);

const providers = [
  {
    id: "google",
    name: "Google",
    icon: <GoogleIcon />,
    color: '#4285F4',
    bgColor: '#fff',
    hoverColor: '#f8f9fa'
  },
  {
    id: "github",
    name: "GitHub",
    icon: <GitHubIcon />,
    color: '#fff',
    bgColor: '#24292f',
    hoverColor: '#1a1e22'
  },
  {
    id: "discord",
    name: "Discord",
    icon: <DiscordIcon />,
    color: '#fff',
    bgColor: '#5865F2',
    hoverColor: '#4752C4'
  },
];

export default function SignInPage() {
  const [loading, setLoading] = useState<string | null>(null);

  return (
    <>
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
        <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
            }}
          >
            <Fade in timeout={800}>
              <Card
                sx={{
                  width: '100%',
                  maxWidth: 400,
                  borderRadius: 4,
                  background: 'rgba(255, 255, 255, 0.06)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                }}
              >
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <Slide direction="down" in timeout={1000}>
                    <Box>
                      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
                        <Box
                          component="img"
                          src="/images/orange_logo.png"
                          alt="Big Dabs logo"
                          sx={{
                            height: 80,
                          }}
                        />
                      </Box>
                      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
                        <Box
                          component="img"
                          src="/images/dab_gray.png"
                          alt="Dab"
                          sx={{
                            height: 120,
                          }}
                        />
                      </Box>
                      <Typography
                        variant="h6"
                        sx={{
                          mb: 4,
                          fontWeight: 400,
                          textAlign: 'center',
                          color: 'rgba(255, 255, 255, 0.8)'
                        }}
                      >
                        Dab your way to victory.
                      </Typography>
                    </Box>
                  </Slide>

                  <Slide direction="up" in timeout={1200}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {providers.map((provider) => (
                        <Button
                          key={provider.id}
                          variant="contained"
                          size="large"
                          fullWidth
                          startIcon={provider.icon}
                          onClick={async () => {
                            setLoading(provider.id);
                            try {
                              await signIn(provider.id, { callbackUrl: "/" });
                            } finally {
                              setLoading(null);
                            }
                          }}
                          disabled={loading !== null}
                          sx={{
                            py: 1.5,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontSize: '1rem',
                            fontWeight: 500,
                            backgroundColor: provider.bgColor,
                            color: provider.color,
                            border: provider.id === 'google' ? '1px solid #dadce0' : 'none',
                            '&:hover': {
                              backgroundColor: provider.hoverColor,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            },
                            '&:disabled': {
                              backgroundColor: provider.bgColor,
                              opacity: 0.7,
                            },
                          }}
                        >
                          {loading === provider.id ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CircularProgress size={16} sx={{ color: provider.color }} />
                              Redirecting...
                            </Box>
                          ) : (
                            `Continue with ${provider.name}`
                          )}
                        </Button>
                      ))}
                    </Box>
                  </Slide>
                </CardContent>
              </Card>
            </Fade>
          </Box>
        </Container>
      </Box>
      <style jsx global>{`
        .MuiAppBar-root { display: none !important; }
      `}</style>
    </>
  );
}