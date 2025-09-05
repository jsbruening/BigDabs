"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "~/trpc/react";

interface Game {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  startAt: Date;
  endAt: Date;
  participants?: Array<{
    user: {
      id: string;
      name: string | null;
      image: string | null;
    };
  }>;
}
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Box,
  Chip,
  Grid,
  Fade,
  Slide,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Get real games data from tRPC - must be called before any conditional returns
  const { data: games, isLoading: gamesLoading } = api.bingoGame.getAll.useQuery();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

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
        <Typography variant="h4" sx={{ color: 'white' }}>
          Loading...
        </Typography>
      </Box>
    );
  }

  if (!session?.user) {
    return null; // Will redirect via useEffect
  }

  const isAdmin = session.user.role === "ADMIN";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "success";
      case "upcoming": return "primary";
      default: return "default";
    }
  };

  const getTimeRemaining = (startTime: Date) => {
    const now = new Date();
    const diff = startTime.getTime() - now.getTime();

    if (diff <= 0) return null; // Return null if already started

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getGameStatus = (game: Game) => {
    const now = new Date();
    const startAt = new Date(game.startAt);
    const endAt = new Date(game.endAt);

    if (now < startAt) {
      return "upcoming";
    } else if (now >= startAt && now <= endAt) {
      return "active";
    } else {
      return "completed";
    }
  };

  const isUserRegistered = (game: Game) => {
    return game.participants?.some((p) => p.user.id === session?.user?.id) ?? false;
  };

  const getButtonText = (game: Game) => {
    const isRegistered = isUserRegistered(game);
    const status = getGameStatus(game);

    if (isRegistered) {
      // User is registered
      if (status === "active") {
        return "Play";
      } else {
        return "View";
      }
    } else {
      // User is not registered
      if (status === "active") {
        return "Join";
      } else {
        return "View";
      }
    }
  };

  const getButtonIcon = (game: Game) => {
    const isRegistered = isUserRegistered(game);
    const status = getGameStatus(game);

    if (isRegistered && status === "active") {
      return <PlayIcon />;
    } else {
      return <ViewIcon />;
    }
  };

  return (
    <Box
      sx={{
        height: 'calc(100vh - 64px)',
        background: `
          radial-gradient(circle at 20% 80%, rgba(75, 85, 99, 0.8) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(55, 65, 81, 0.9) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(31, 41, 55, 0.7) 0%, transparent 50%),
          linear-gradient(135deg, #374151 0%, #1f2937 25%, #111827 50%, #0f172a 75%, #1e293b 100%)
        `,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',

      }}
    >
      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 1 }}>
        <Fade in timeout={800}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 400 }}>
                  Join a Big Dabs game
                </Typography>
              </Box>
            </Box>
          </Box>
        </Fade>

        <Grid container spacing={3}>
          {gamesLoading ? (
            <Grid size={12}>
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <Typography variant="h6" sx={{ color: 'white' }}>
                  Loading games...
                </Typography>
              </Box>
            </Grid>
          ) : games && games.length > 0 ? (
            games.map((game, index) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={game.id}>
                <Slide direction="up" in timeout={1200 + (index * 200)}>
                  <Card
                    sx={{
                      height: '100%',
                      borderRadius: 3,
                      background: 'rgba(255, 255, 255, 0.55)',
                      backdropFilter: 'blur(25px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                        background: 'rgba(255, 255, 255, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                      },
                    }}
                  >
                    {/* Registered indicator */}
                    {isUserRegistered(game) && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: 0,
                          height: 0,
                          borderLeft: '40px solid transparent',
                          borderTop: '40px solid #3b82f6',
                          zIndex: 1,
                        }}
                      />
                    )}
                    {isUserRegistered(game) && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          zIndex: 2,
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: 'white',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                        }}
                      >
                        ✓
                      </Box>
                    )}
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="h5" component="h3" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                          {game.name}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                          {game.description}
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ScheduleIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            <strong>Start:</strong> {new Date(game.startAt).toLocaleDateString()} {new Date(game.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ScheduleIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            <strong>End:</strong> {new Date(game.endAt).toLocaleDateString()} {new Date(game.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PeopleIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            <strong>Players:</strong> {game.playerCount}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        {getGameStatus(game) === "upcoming" ? (
                          <Chip
                            label={`Starts in ${getTimeRemaining(new Date(game.startAt))}`}
                            size="small"
                            sx={{
                              textTransform: 'capitalize',
                              fontWeight: 500,
                              backgroundColor: '#f59e0b',
                              color: 'white',
                              '& .MuiChip-label': {
                                color: 'white'
                              }
                            }}
                          />
                        ) : getGameStatus(game) === "active" ? (
                          <Chip
                            label="In Progress"
                            color="success"
                            size="small"
                            sx={{ textTransform: 'capitalize', fontWeight: 500 }}
                          />
                        ) : getGameStatus(game) === "completed" ? (
                          <Chip
                            label="Finished"
                            color="default"
                            size="small"
                            sx={{ textTransform: 'capitalize', fontWeight: 500 }}
                          />
                        ) : (
                          <Chip
                            label={getGameStatus(game)}
                            color={getStatusColor(getGameStatus(game)) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"}
                            size="small"
                            sx={{ textTransform: 'capitalize', fontWeight: 500 }}
                          />
                        )}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {isAdmin && (
                            <Button
                              component={Link}
                              href={`/admin/games/${game.id}`}
                              variant="contained"
                              size="small"
                              startIcon={<EditIcon />}
                              sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 500,
                                px: 2,
                                backgroundColor: '#3b82f6',
                                '&:hover': {
                                  backgroundColor: '#2563eb',
                                },
                              }}
                            >
                              Manage
                            </Button>
                          )}
                          <Button
                            component={Link}
                            href={`/games/${game.id}`}
                            variant="contained"
                            size="small"
                            startIcon={getButtonIcon(game)}
                            sx={{
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: 500,
                              px: 2,
                              backgroundColor: '#cc5500',
                              '&:hover': {
                                backgroundColor: '#b34700',
                              },
                            }}
                          >
                            {getButtonText(game)}
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Slide>
              </Grid>
            ))
          ) : (
            <Grid size={12}>
              <Fade in timeout={800}>
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 8,
                    px: 4,
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      mx: 'auto',
                      mb: 3,
                      bgcolor: 'primary.main',
                    }}
                  >
                    <AddIcon sx={{ fontSize: 40 }} />
                  </Avatar>
                  <Typography variant="h5" sx={{ color: 'white', mb: 2 }}>
                    No Big Dabs games available
                  </Typography>

                </Box>
              </Fade>
            </Grid>
          )}
        </Grid>


      </Container>
    </Box>
  );
}