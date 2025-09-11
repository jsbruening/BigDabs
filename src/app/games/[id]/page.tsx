"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayIcon,
  ExitToApp as LeaveIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  EmojiEvents as TrophyIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { BingoCard } from "~/components/BingoCard";
import confetti from "canvas-confetti";

export default function SessionDetails() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const gameId = params?.id as string;

  const [hasJoined, setHasJoined] = useState(false);
  const [userCard, setUserCard] = useState<string[][] | null>(null);
  const [hasBingo, setHasBingo] = useState(false);

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

  // Get winners
  const { data: winners } = api.bingoGame.getWinners.useQuery(
    { gameId: gameId },
    { enabled: !!gameId }
  );

  // Debug logging
  console.log('Winners data:', winners);
  console.log('Participants data:', participants);

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
      void utils.bingoGame.getAll.invalidate();
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
      // Invalidate the getAll query to refresh the home page
      void utils.bingoGame.getAll.invalidate();
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

  // Claim bingo mutation
  const claimBingo = api.bingoGame.claimBingo.useMutation({
    onSuccess: () => {
      void utils.bingoGame.getWinners.invalidate({ gameId });
    },
    onError: (error) => {
      setToast({ open: true, message: error.message ?? 'Failed to claim bingo', severity: 'error' });
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

  // Helper: check if a cell is considered marked (treat center as always marked)
  const isCellMarked = useCallback((layout: string[][], r: number, c: number) => {
    if (r === 2 && c === 2) return true;
    const value = layout[r]?.[c] ?? "";
    return value.startsWith("✓");
  }, []);

  // Helper: detect any bingo on the 5x5 grid
  const hasAnyBingo = useCallback((layout: string[][]) => {
    // rows
    for (let r = 0; r < 5; r++) {
      let all = true;
      for (let c = 0; c < 5; c++) {
        if (!isCellMarked(layout, r, c)) { all = false; break; }
      }
      if (all) return true;
    }
    // cols
    for (let c = 0; c < 5; c++) {
      let all = true;
      for (let r = 0; r < 5; r++) {
        if (!isCellMarked(layout, r, c)) { all = false; break; }
      }
      if (all) return true;
    }
    // diagonals
    if ([0, 1, 2, 3, 4].every(i => isCellMarked(layout, i, i))) return true;
    if ([0, 1, 2, 3, 4].every(i => isCellMarked(layout, i, 4 - i))) return true;
    return false;
  }, [isCellMarked]);

  // Calculate if user has claimed bingo
  const hasClaimed = !!winners?.some((w) => (w as { userId?: string }).userId === session?.user?.id || w.user?.id === session?.user?.id);


  // Watch for bingo and celebrate
  useEffect(() => {
    if (!userCard || userCard.length !== 5 || userCard[0]?.length !== 5) return;

    const currentlyHasBingo = hasAnyBingo(userCard);

    if (currentlyHasBingo && !hasBingo && !hasClaimed) {
      // Just got bingo - celebrate! (only if not already claimed)
      setHasBingo(true);
      // Confetti bursts
      const duration = 1500;
      const end = Date.now() + duration;
      const frame = () => {
        // two symmetric bursts
        void confetti({ particleCount: 50, spread: 70, origin: { x: 0.2, y: 0.3 } });
        void confetti({ particleCount: 50, spread: 70, origin: { x: 0.8, y: 0.3 } });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    } else if (!currentlyHasBingo && hasBingo) {
      // Lost bingo - reset state so confetti can trigger again
      setHasBingo(false);
    }
  }, [userCard, hasBingo, hasClaimed, hasAnyBingo]);

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

  // Helper to get winner info for a user
  const getWinnerInfo = (userId: string) => {
    const winner = winners?.find((w) => (w as { userId?: string }).userId === userId || w.user?.id === userId);
    console.log(`Looking for winner info for ${userId}:`, winner);
    return winner;
  };

  // Helper to get trophy color based on place
  const getTrophyColor = (place: number) => {
    switch (place) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return '#6B7280'; // Gray
    }
  };

  // Helper to get background color for winner
  const getWinnerBackgroundColor = (place: number) => {
    switch (place) {
      case 1: return 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'; // Gold gradient
      case 2: return 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)'; // Silver gradient
      case 3: return 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)'; // Bronze gradient
      default: return 'rgba(59, 130, 246, 0.1)'; // Default blue
    }
  };
  const centerSquareItem = gameData.centerSquare ? {
    label: (gameData.centerSquare as { label?: string }).label ?? "FREE"
  } : {
    label: "FREE"
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
            {/* Game Details Accordion */}
            <Accordion
              defaultExpanded
              sx={{
                '&:before': { display: 'none' },
                boxShadow: 'none',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px !important',
                mb: 2,
                '&.Mui-expanded': {
                  margin: '0 0 16px 0',
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px 8px 0 0',
                  '&.Mui-expanded': {
                    borderRadius: '8px 8px 0 0',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon color="action" />
                  <Typography variant="h6">
                    Game Details
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2 }}>
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
                  {/* Winners List */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Winners
                    </Typography>
                    {winners && winners.length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {winners.map((w) => (
                          <Box key={w.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label={`#${w.place}`} size="small" color={w.place === 1 ? 'success' : 'default'} />
                            <Avatar src={w.user?.image ?? undefined} sx={{ width: 24, height: 24 }}>
                              {w.user?.name?.charAt(0)}
                            </Avatar>
                            <Typography variant="body2">{w.user?.name ?? 'Unknown'}</Typography>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No winners yet
                      </Typography>
                    )}
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Mobile: Join Game Button */}
            {!hasJoined && (
              <Box sx={{ display: { xs: 'block', lg: 'none' }, mb: 2 }}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleJoin}
                  disabled={joinGame.isPending}
                  startIcon={<PlayIcon />}
                  sx={{
                    backgroundColor: '#3b82f6',
                    '&:hover': { backgroundColor: '#2563eb' },
                    py: 1.5,
                  }}
                >
                  {joinGame.isPending ? "Joining..." : "Join Game"}
                </Button>
              </Box>
            )}

            {/* Mobile: Bingo Card below details and before players */}
            {hasJoined && (
              <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
                <Paper sx={{ p: 2 }}>
                  {!hasClaimed && (
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
                  )}
                  {hasClaimed && (
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      mb: 2,
                      p: 2,
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: 1,
                    }}>
                      <Typography variant="body2" sx={{ color: '#22c55e', textAlign: 'center' }}>
                        🏆 You&apos;ve won! Winners cannot leave the game.
                      </Typography>
                    </Box>
                  )}
                  {hasBingo && hasJoined && !hasClaimed && (
                    <Box sx={{ mb: 2 }}>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => claimBingo.mutate({ gameId })}
                        disabled={claimBingo.isPending}
                      >
                        {claimBingo.isPending ? 'Claiming…' : 'Claim Bingo'}
                      </Button>
                    </Box>
                  )}
                  {userCard ? (
                    <Box sx={{ mb: 2 }}>
                      <BingoCard
                        cardLayout={userCard}
                        centerSquareItem={centerSquareItem}
                        isGameActive={isGameActive}
                        playerName={session?.user?.name ?? undefined}
                        onSquareClick={handleSquareClick}
                        disabled={hasClaimed}
                      />
                    </Box>
                  ) : (
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      py: 4,
                      mb: 2
                    }}>
                      <CircularProgress size={40} sx={{ mb: 2 }} />
                      <Typography variant="h6" sx={{ mb: 1, textAlign: 'center' }}>
                        Generating your bingo card...
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                        Please wait while we create your personalized card.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Box>
            )}

            {/* Players List Accordion */}
            <Accordion
              defaultExpanded
              sx={{
                '&:before': { display: 'none' },
                boxShadow: 'none',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px !important',
                '&.Mui-expanded': {
                  margin: 0,
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px 8px 0 0',
                  '&.Mui-expanded': {
                    borderRadius: '8px 8px 0 0',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PeopleIcon color="action" />
                  <Typography variant="h6">
                    Players ({participants?.length ?? 0})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2 }}>
                {participantsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : participants && participants.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {participants
                      .sort((a, b) => {
                        const aWinner = getWinnerInfo(a.userId);
                        const bWinner = getWinnerInfo(b.userId);

                        console.log(`Sorting ${a.user.name}:`, aWinner);
                        console.log(`Sorting ${b.user.name}:`, bWinner);

                        // Winners first, ordered by place
                        if (aWinner && bWinner) {
                          return aWinner.place - bWinner.place;
                        }
                        if (aWinner && !bWinner) return -1;
                        if (!aWinner && bWinner) return 1;

                        // Non-winners keep original order
                        return 0;
                      })
                      .map((participant) => {
                        const winnerInfo = getWinnerInfo(participant.userId);
                        const isCurrentUser = participant.userId === session?.user?.id;

                        return (
                          <Box
                            key={participant.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              p: 1,
                              borderRadius: 1,
                              background: winnerInfo
                                ? getWinnerBackgroundColor(winnerInfo.place)
                                : isCurrentUser
                                  ? 'rgba(59, 130, 246, 0.1)'
                                  : 'transparent',
                              border: winnerInfo
                                ? `2px solid ${getTrophyColor(winnerInfo.place)}`
                                : isCurrentUser
                                  ? '1px solid rgba(59, 130, 246, 0.3)'
                                  : '1px solid transparent',
                              boxShadow: winnerInfo ? `0 2px 8px ${getTrophyColor(winnerInfo.place)}40` : 'none',
                            }}
                          >
                            <Avatar
                              src={participant.user.image ?? undefined}
                              sx={{
                                width: 32,
                                height: 32,
                                border: winnerInfo ? `2px solid ${getTrophyColor(winnerInfo.place)}` : 'none',
                              }}
                            >
                              {participant.user.name?.charAt(0)}
                            </Avatar>
                            <Typography
                              variant="body2"
                              sx={{
                                flexGrow: 1,
                                fontWeight: winnerInfo ? 600 : 400,
                                color: winnerInfo ? '#1F2937' : 'inherit',
                              }}
                            >
                              {participant.user.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {winnerInfo && (
                                <TrophyIcon
                                  sx={{
                                    color: getTrophyColor(winnerInfo.place),
                                    fontSize: 20,
                                  }}
                                />
                              )}
                              {isCurrentUser && (
                                <Chip
                                  label="You"
                                  size="small"
                                  color={winnerInfo ? "default" : "primary"}
                                  sx={{
                                    backgroundColor: winnerInfo ? getTrophyColor(winnerInfo.place) : undefined,
                                    color: winnerInfo ? '#1F2937' : undefined,
                                    fontWeight: 600,
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No players joined yet
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          </Box>

          {/* Right: Main Content (2/3) - Desktop only */}
          <Box sx={{ flex: '0 0 66.666%', minWidth: 0, display: { xs: 'none', lg: 'block' } }}>
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
                /* Show join prompt for non-joined users */
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                    Join the game to get your bingo card!
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Click &quot;Join Game&quot; above to start playing.
                  </Typography>
                </Box>
              ) : (
                /* Show user's bingo card for joined users */
                <Box>
                  {!hasClaimed && (
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
                  )}
                  {hasClaimed && (
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      mb: 2,
                      p: 2,
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: 1,
                    }}>
                      <Typography variant="body2" sx={{ color: '#22c55e', textAlign: 'center' }}>
                        🏆 You&apos;ve won! Winners cannot leave the game.
                      </Typography>
                    </Box>
                  )}
                  {hasBingo && hasJoined && !hasClaimed && (
                    <Box sx={{ mb: 2 }}>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => claimBingo.mutate({ gameId })}
                        disabled={claimBingo.isPending}
                      >
                        {claimBingo.isPending ? 'Claiming…' : 'Claim Bingo'}
                      </Button>
                    </Box>
                  )}
                  {userCard ? (
                    <Box sx={{ mb: 4 }}>
                      <BingoCard
                        cardLayout={userCard}
                        centerSquareItem={centerSquareItem}
                        isGameActive={isGameActive}
                        playerName={session?.user?.name ?? undefined}
                        onSquareClick={handleSquareClick}
                        disabled={hasClaimed}
                      />
                    </Box>
                  ) : (
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      py: 6,
                      mb: 4
                    }}>
                      <CircularProgress size={48} sx={{ mb: 2 }} />
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        Generating your bingo card...
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Please wait while we create your personalized card.
                      </Typography>
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
