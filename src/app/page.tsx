"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";

interface Game {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  startAt: Date;
  endAt: Date;
  participants?: Array<{
    id: string;
    userId: string;
  }>;
}
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Box,
  Grid,
  Fade,
  Slide,
  Avatar,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  AccessTime as ClockIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckIcon,
  Visibility as VisibilityIcon,
  TouchApp as TapIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Guide toggle (remember last state)
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [joiningGameId, setJoiningGameId] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('bd_guide_collapsed') : null;
    if (stored === '1') setShowGuide(false);
  }, []);

  const toggleGuide = () => {
    setShowGuide(prev => {
      const next = !prev;
      try { window.localStorage.setItem('bd_guide_collapsed', next ? '0' : '1'); } catch { }
      return next;
    });
  };

  // Get real games data from tRPC - must be called before any conditional returns
  const { data: games, isLoading: gamesLoading } = api.bingoGame.getAll.useQuery();

  // Join game mutation
  const joinGame = api.bingoGame.join.useMutation({
    onSuccess: (data) => {
      // Redirect to the game page after successful join
      router.push(`/games/${data.gameId}`);
    },
    onError: (error) => {
      console.error('Failed to join game:', error);
      setJoiningGameId(null);
      // Still redirect to game page so user can see the error or try again
      router.push(`/games/${joiningGameId}`);
    },
  });

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
    return game.participants?.some((p) => p.userId === session?.user?.id) ?? false;
  };

  const handleJoinGame = (gameId: string) => {
    setJoiningGameId(gameId);
    joinGame.mutate({ gameId });
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
        backgroundSize: '200% 200%, 200% 200%, 200% 200%, 200% 200%',
        backgroundPosition: '0% 0%, 100% 100%, 50% 50%, 0% 0%',
        animation: 'gradientShift 25s ease-in-out infinite',
        position: 'relative',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        flexDirection: 'column',
        // Performance optimizations
        willChange: 'background-position',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)', // Force hardware acceleration
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
        },
        '@keyframes gradientShift': {
          '0%': {
            backgroundPosition: '0% 0%, 100% 100%, 50% 50%, 0% 0%',
          },
          '25%': {
            backgroundPosition: '100% 0%, 0% 100%, 25% 75%, 25% 25%',
          },
          '50%': {
            backgroundPosition: '100% 100%, 0% 0%, 75% 25%, 50% 50%',
          },
          '75%': {
            backgroundPosition: '0% 100%, 100% 0%, 75% 75%, 75% 25%',
          },
          '100%': {
            backgroundPosition: '0% 0%, 100% 100%, 50% 50%, 0% 0%',
          },
        },
      }}
    >
      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 1 }}>
        <Fade in timeout={800}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 2 }}>
              {/* Guide Panel */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    p: { xs: 1.5, md: 2 },
                    borderRadius: 2.5,
                    background: 'rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.22)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: showGuide ? 1.5 : 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InfoIcon sx={{ color: 'rgba(255,255,255,0.9)' }} />
                      <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.95)', fontWeight: 600 }}>
                        How Big Dabs works
                      </Typography>
                    </Box>
                    <Button
                      onClick={toggleGuide}
                      size="small"
                      variant="text"
                      endIcon={showGuide ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      sx={{ color: 'rgba(255,255,255,0.9)', textTransform: 'none', minWidth: 0, px: 1 }}
                    >
                      {showGuide ? 'Hide' : 'Show'}
                    </Button>
                  </Box>

                  {showGuide && (
                    <Grid container spacing={1.5} sx={{ mt: 0.25 }}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Box sx={{
                          display: 'flex', flexDirection: 'column', gap: 0.75, p: 1.5,
                          borderRadius: 2,
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))',
                          border: '1px solid rgba(255,255,255,0.20)',
                          position: 'relative',
                          minHeight: 96,
                          transition: 'transform .2s ease, box-shadow .2s ease',
                          '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' },
                          '&:before': {
                            content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                            borderTopLeftRadius: 8, borderTopRightRadius: 8,
                            background: 'linear-gradient(90deg, #22d3ee, #6366f1)'
                          }
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                              width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center',
                              background: 'linear-gradient(90deg, rgba(34,211,238,.25), rgba(99,102,241,.25))',
                              border: '1px solid rgba(255,255,255,0.25)'
                            }}>
                              <PeopleIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.95)' }} />
                            </Box>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>Browse Games</Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                            Find a game you want to join!
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Box sx={{
                          display: 'flex', flexDirection: 'column', gap: 0.75, p: 1.5,
                          borderRadius: 2,
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))',
                          border: '1px solid rgba(255,255,255,0.20)',
                          position: 'relative',
                          minHeight: 96,
                          transition: 'transform .2s ease, box-shadow .2s ease',
                          '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' },
                          '&:before': {
                            content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                            borderTopLeftRadius: 8, borderTopRightRadius: 8,
                            background: 'linear-gradient(90deg, #f59e0b, #f97316)'
                          }
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                              width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center',
                              background: 'linear-gradient(90deg, rgba(245,158,11,.25), rgba(249,115,22,.25))',
                              border: '1px solid rgba(255,255,255,0.25)'
                            }}>
                              <VisibilityIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.95)' }} />
                            </Box>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>Preview</Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                            This game is scheduled to start at a later date. However, you can preview the game to see what it&apos;s all about.
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Box sx={{
                          display: 'flex', flexDirection: 'column', gap: 0.75, p: 1.5,
                          borderRadius: 2,
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))',
                          border: '1px solid rgba(255,255,255,0.20)',
                          position: 'relative',
                          minHeight: 96,
                          transition: 'transform .2s ease, box-shadow .2s ease',
                          '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' },
                          '&:before': {
                            content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                            borderTopLeftRadius: 8, borderTopRightRadius: 8,
                            background: 'linear-gradient(90deg, #10b981, #84cc16)'
                          }
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                              width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center',
                              background: 'linear-gradient(90deg, rgba(16,185,129,.25), rgba(132,204,22,.25))',
                              border: '1px solid rgba(255,255,255,0.25)'
                            }}>
                              <PlayArrowIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.95)' }} />
                            </Box>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>Join or Play</Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                            Join active games, or press Play if you&apos;re already in.
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Box sx={{
                          display: 'flex', flexDirection: 'column', gap: 0.75, p: 1.5,
                          borderRadius: 2,
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))',
                          border: '1px solid rgba(255,255,255,0.20)',
                          position: 'relative',
                          minHeight: 96,
                          transition: 'transform .2s ease, box-shadow .2s ease',
                          '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' },
                          '&:before': {
                            content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                            borderTopLeftRadius: 8, borderTopRightRadius: 8,
                            background: 'linear-gradient(90deg, #d946ef, #f43f5e)'
                          }
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                              width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center',
                              background: 'linear-gradient(90deg, rgba(217,70,239,.25), rgba(244,63,94,.25))',
                              border: '1px solid rgba(255,255,255,0.25)'
                            }}>
                              <TapIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.95)' }} />
                            </Box>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>Stamp & Win</Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                            Tap squares as you spot items. Hit a line or blackout to win.
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  )}
                </Box>
              </Box>

              {/* Removed inline Create Game button to place it on its own row below */}
            </Box>
          </Box>
        </Fade>

        {isAdmin && (
          <Box sx={{ mb: 3 }}>
            <Button
              component={Link}
              href="/admin/games/create"
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                backgroundColor: '#3b82f6',
                textTransform: 'none',
                '&:hover': { backgroundColor: '#2563eb' },
              }}
            >
              Create Game
            </Button>
          </Box>
        )}

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
                    {/* Registered text badge */}
                    {isUserRegistered(game) && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 10,
                          zIndex: 2,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#065f46',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Joined
                        </Typography>
                      </Box>
                    )}
                    <CardContent sx={{
                      p: 3,
                      height: '100%',
                      display: 'grid',
                      gridTemplateRows: 'auto auto 1fr auto auto',
                      gap: 2,
                      minHeight: '280px'
                    }}>
                      {/* Row 1: Title */}
                      <Typography variant="h5" component="h3" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {game.name}
                      </Typography>

                      {/* Row 2: Description */}
                      <Typography variant="body2" sx={{ color: 'text.secondary', minHeight: '1.5em' }}>
                        {game.description ?? '\u00A0'}
                      </Typography>

                      {/* Row 3: Spacer - this will push everything below to the bottom */}
                      <Box />

                      {/* Row 4: Game Details */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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

                      {/* Row 5: Status and Controls */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {getGameStatus(game) === "upcoming" && <ClockIcon sx={{ fontSize: 16, color: '#1e40af' }} />}
                          {getGameStatus(game) === "active" && <PlayArrowIcon sx={{ fontSize: 16, color: '#15803d' }} />}
                          {getGameStatus(game) === "completed" && <CheckIcon sx={{ fontSize: 16, color: '#6b7280' }} />}
                          <Typography
                            variant="body1"
                            sx={{
                              color: getGameStatus(game) === "upcoming" ? '#1e40af' :
                                getGameStatus(game) === "active" ? '#15803d' :
                                  '#6b7280',
                              fontWeight: 700,
                              textTransform: 'capitalize',
                              fontSize: '0.95rem'
                            }}
                          >
                            {getGameStatus(game) === "upcoming" ? `Starts in ${getTimeRemaining(new Date(game.startAt))}` :
                              getGameStatus(game) === "active" ? "Game in Progress" :
                                "Completed"}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                          {isAdmin && (
                            <IconButton
                              component={Link}
                              href={`/admin/games/${game.id}`}
                              size="small"
                              sx={{ color: 'black' }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                          {(() => {
                            const status = getGameStatus(game);
                            const registered = isUserRegistered(game);
                            if (status === 'active' && registered) {
                              return (
                                <Button
                                  component={Link}
                                  href={`/games/${game.id}`}
                                  variant="contained"
                                  size="small"
                                  sx={{
                                    backgroundColor: '#16a34a',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    '&:hover': { backgroundColor: '#15803d' },
                                  }}
                                >
                                  Play
                                </Button>
                              );
                            }
                            if (status === 'active' && !registered) {
                              return (
                                <Button
                                  onClick={() => handleJoinGame(game.id)}
                                  variant="contained"
                                  size="small"
                                  disabled={joiningGameId === game.id || joinGame.isPending}
                                  sx={{
                                    backgroundColor: '#16a34a',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    '&:hover': { backgroundColor: '#15803d' },
                                    '&:disabled': { backgroundColor: '#9ca3af' },
                                  }}
                                >
                                  {joiningGameId === game.id || joinGame.isPending ? 'Joining...' : 'Join'}
                                </Button>
                              );
                            }
                            if (status === 'upcoming') {
                              return (
                                <Button
                                  component={Link}
                                  href={`/games/${game.id}`}
                                  variant="contained"
                                  size="small"
                                  sx={{
                                    backgroundColor: '#1e40af',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    '&:hover': { backgroundColor: '#1b3a99' },
                                  }}
                                >
                                  Preview
                                </Button>
                              );
                            }
                            return (
                              <Button
                                component={Link}
                                href={`/games/${game.id}`}
                                variant="contained"
                                size="small"
                                sx={{
                                  backgroundColor: '#6b7280',
                                  fontWeight: 600,
                                  textTransform: 'none',
                                  '&:hover': { backgroundColor: '#565c67' },
                                }}
                              >
                                View
                              </Button>
                            );
                          })()}
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