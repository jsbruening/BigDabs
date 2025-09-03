"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import {
  Container,
  Typography,
  Button,
  Paper,
  Box,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayIcon,
  ExitToApp as LeaveIcon,
  Public as PublicIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { BingoCard } from "~/components/BingoCard";

export default function SessionDetails() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const gameId = params?.id as string;

  const [hasJoined, setHasJoined] = useState(false);
  const [userCard, setUserCard] = useState<string[][] | null>(null);

  // Get game data
  const { data: gameData, isLoading: gameLoading } = api.bingoGame.getById.useQuery(
    { id: gameId },
    { enabled: !!gameId }
  );

  // Get participants
  const { data: participants, isLoading: participantsLoading } = api.bingoGame.getParticipants.useQuery(
    { gameId: gameId },
    { enabled: !!gameId }
  );

  // Get utils for invalidating queries
  const utils = api.useUtils();

  // Join game mutation
  const joinGame = api.bingoGame.join.useMutation({
    onSuccess: (data) => {
      setHasJoined(true);
      setUserCard(data.cardLayout);
      setToast({ open: true, message: 'Successfully joined the game!', severity: 'success' });
      // Invalidate queries to refresh the UI
      void utils.bingoGame.getParticipants.invalidate({ gameId });
      void utils.bingoGame.getById.invalidate({ id: gameId });
    },
    onError: (error) => {
      setToast({ open: true, message: `Failed to join: ${error.message}`, severity: 'error' });
    },
  });

  // Leave game mutation
  const leaveGame = api.bingoGame.leave.useMutation({
    onSuccess: () => {
      setHasJoined(false);
      setUserCard(null);
      setToast({ open: true, message: 'Left the game', severity: 'info' });
    },
    onError: (error) => {
      setToast({ open: true, message: `Failed to leave: ${error.message}`, severity: 'error' });
    },
  });

  // Mark square mutation
  const markSquare = api.bingoGame.markSquare.useMutation({
    onSuccess: () => {
      // Refresh both game data and participants to get updated card layout
      void utils.bingoGame.getById.invalidate({ id: gameId });
      void utils.bingoGame.getParticipants.invalidate({ gameId });
    },
    onError: (error) => {
      setToast({ open: true, message: `Failed to toggle square: ${error.message}`, severity: 'error' });
    },
  });

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (gameData && session?.user) {
      // Check if user has joined this session
      const userParticipant = participants?.find(p => p.userId === session.user.id);
      if (userParticipant) {
        setHasJoined(true);
        setUserCard(userParticipant.cardLayout as string[][]);
      }
    }
  }, [gameData, participants, session?.user]);

  const handleJoin = () => {
    if (!session?.user) {
      router.push("/signin");
      return;
    }
    joinGame.mutate({ gameId });
  };

  const handleLeave = () => {
    leaveGame.mutate({ gameId });
  };

  const handleCloseToast = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleSquareClick = (row: number, col: number) => {
    if (!isGameActive || !userCard) return;

    // Just update the database - let the server response handle the UI update
    markSquare.mutate({ gameId, row, col });
  };

  if (status === "loading" || gameLoading) {
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={60} sx={{ color: 'white' }} />
      </Box>
    );
  }

  if (!session?.user) {
    return null;
  }

  if (!gameData) {
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          Game not found
        </Alert>
      </Box>
    );
  }

  const isGameActive = gameData.status === "active";
  const centerSquareItem = gameData.centerSquare ? {
    label: (gameData.centerSquare as { label?: string }).label ?? "FREE",
    imageUrl: (gameData.centerSquare as { imageUrl?: string }).imageUrl ?? null
  } : {
    label: "FREE",
    imageUrl: null
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
        paddingBottom: 4,
      }}
    >
      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: 'white' }}>
          {gameData.name}
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
          {/* Left: Game Details + Players List (1/3) */}
          <Box sx={{ flex: '0 0 33.333%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Game Details Card */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Game Details
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon color="action" />
                  <Typography variant="body2">
                    <strong>Start:</strong> {new Date(gameData.startAt).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon color="action" />
                  <Typography variant="body2">
                    <strong>End:</strong> {new Date(gameData.endAt).toLocaleString()}
                  </Typography>
                </Box>
                {gameData.description && (
                  <Typography variant="body2" color="text.secondary">
                    {gameData.description}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {gameData.isPublic ? (
                    <Chip icon={<PublicIcon />} label="Public Game" color="success" size="small" />
                  ) : (
                    <Chip icon={<LockIcon />} label="Private Game" color="default" size="small" />
                  )}
                  <Chip
                    label={isGameActive ? "Game Active" : gameData.status === "upcoming" ? "Game Starting Soon" : "Game Ended"}
                    color={isGameActive ? "success" : gameData.status === "upcoming" ? "warning" : "default"}
                    size="small"
                  />
                </Box>
              </Box>
            </Paper>

            {/* Players List */}
            <Paper sx={{ p: 2, height: 'fit-content' }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PeopleIcon />
                Players ({participants?.length ?? 0})
              </Typography>

              {participantsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : participants && participants.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {participants.map((participant) => (
                    <Box
                      key={participant.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 1,
                        borderRadius: 1,
                        backgroundColor: participant.userId === session?.user?.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        border: participant.userId === session?.user?.id ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                      }}
                    >
                      <Avatar
                        src={participant.user.image ?? undefined}
                        sx={{ width: 32, height: 32 }}
                      >
                        {participant.user.name?.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" sx={{ flexGrow: 1 }}>
                        {participant.user.name}
                      </Typography>
                      {participant.userId === session?.user?.id && (
                        <Chip label="You" size="small" color="primary" />
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No players joined yet
                </Typography>
              )}
            </Paper>
          </Box>

          {/* Right: Main Content (2/3) */}
          <Box sx={{ flex: '0 0 66.666%', minWidth: 0 }}>
            <Paper sx={{ p: 3 }}>


              {/* Join/Leave Actions */}
              {!hasJoined ? (
                <Box sx={{ mb: 3 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleJoin}
                    disabled={joinGame.isPending}
                    startIcon={<PlayIcon />}
                    sx={{
                      backgroundColor: '#3b82f6',
                      '&:hover': { backgroundColor: '#2563eb' },
                      px: 4,
                      py: 1.5,
                    }}
                  >
                    {joinGame.isPending ? "Joining..." : "Join Game"}
                  </Button>
                </Box>
              ) : null}

              {/* Content based on join status */}
              {!hasJoined ? (
                /* Show items list for non-joined users */
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Game Items ({gameData.items?.length ?? 0})
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: 2,
                    }}
                  >
                    {gameData.items?.map((item) => (
                      <Paper
                        key={item.id}
                        sx={{
                          p: 2,
                          textAlign: 'center',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.label}
                        </Typography>
                        {item.imageUrl && (
                          <Box
                            component="img"
                            src={item.imageUrl}
                            alt={item.label}
                            sx={{
                              width: '100%',
                              height: 100,
                              objectFit: 'cover',
                              borderRadius: 1,
                              mt: 1,
                            }}
                          />
                        )}
                      </Paper>
                    ))}
                  </Box>
                </Box>
              ) : (
                /* Show user's bingo card for joined users */
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleLeave}
                      disabled={leaveGame.isPending}
                      startIcon={<LeaveIcon />}
                      sx={{
                        borderColor: '#ef4444',
                        color: '#ef4444',
                        '&:hover': {
                          borderColor: '#dc2626',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)'
                        },
                        px: 2,
                        py: 0.5,
                        fontSize: '0.75rem',
                      }}
                    >
                      {leaveGame.isPending ? "Leaving..." : "Leave Game"}
                    </Button>
                  </Box>
                  {userCard && (
                    <Box sx={{ mb: 4 }}>
                      <BingoCard
                        cardLayout={userCard}
                        centerSquareItem={centerSquareItem}
                        isGameActive={isGameActive}
                        playerName={session?.user?.name ?? undefined}
                        onSquareClick={handleSquareClick}
                      />
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      </Container>

      {/* Toast Notifications */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        {toast.open && (
          <Alert
            severity={toast.severity}
            onClose={handleCloseToast}
            sx={{ minWidth: 300 }}
          >
            {toast.message}
          </Alert>
        )}
      </Box>
    </Box>
  );
}
