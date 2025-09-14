"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "~/trpc/react";

// Utility function to calculate how many squares a player needs for bingo
function calculateProximityToBingo(cardLayout: string[][]): number {
  if (!Array.isArray(cardLayout) || cardLayout.length !== 5 || cardLayout[0]?.length !== 5) {
    return 5; // Invalid layout, assume far from bingo
  }

  // Helper: a cell is marked if it starts with ✓ or is the center
  const isCellMarked = (r: number, c: number) => {
    if (r === 2 && c === 2) return true; // Center square is always marked
    const value = cardLayout[r]?.[c] ?? "";
    return typeof value === "string" && value.startsWith("✓");
  };

  let minSquaresNeeded = 5; // Start with max possible

  // Check rows
  for (let r = 0; r < 5; r++) {
    let markedCount = 0;
    for (let c = 0; c < 5; c++) {
      if (isCellMarked(r, c)) markedCount++;
    }
    const needed = 5 - markedCount;
    if (needed < minSquaresNeeded) minSquaresNeeded = needed;
  }

  // Check columns
  for (let c = 0; c < 5; c++) {
    let markedCount = 0;
    for (let r = 0; r < 5; r++) {
      if (isCellMarked(r, c)) markedCount++;
    }
    const needed = 5 - markedCount;
    if (needed < minSquaresNeeded) minSquaresNeeded = needed;
  }

  // Check diagonals
  // Diagonal 1: (0,0) to (4,4)
  let markedCount = 0;
  for (let i = 0; i < 5; i++) {
    if (isCellMarked(i, i)) markedCount++;
  }
  const needed1 = 5 - markedCount;
  if (needed1 < minSquaresNeeded) minSquaresNeeded = needed1;

  // Diagonal 2: (0,4) to (4,0)
  markedCount = 0;
  for (let i = 0; i < 5; i++) {
    if (isCellMarked(i, 4 - i)) markedCount++;
  }
  const needed2 = 5 - markedCount;
  if (needed2 < minSquaresNeeded) minSquaresNeeded = needed2;

  return minSquaresNeeded;
}
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
  const [showClaimButton, setShowClaimButton] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const celebrationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasCelebratedRef = useRef(false);

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
      // Trigger celebration after successful claim
      triggerCelebration();
    },
    onError: (error) => {
      setToast({ open: true, message: error.message ?? 'Failed to claim bingo', severity: 'error' });
    },
  });

  // Regenerate card mutation
  const regenerateMyCard = api.bingoGame.regenerateMyCard.useMutation({
    onSuccess: () => {
      setToast({ open: true, message: 'Card regenerated successfully!', severity: 'success' });
      // Refresh all relevant queries to get the new card layout
      void utils.bingoGame.getParticipants.invalidate({ gameId });
      void utils.bingoGame.getById.invalidate({ id: gameId });
      void utils.bingoGame.getWinners.invalidate({ gameId });
    },
    onError: (error) => {
      setToast({ open: true, message: `Failed to regenerate card: ${error.message}`, severity: 'error' });
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

  // Update userCard when participants data changes (e.g., after card regeneration)
  useEffect(() => {
    if (participants && session?.user) {
      const userParticipant = participants.find(p => p.userId === session.user.id);
      if (userParticipant) {
        console.log('Updating userCard from participants:', userParticipant.cardLayout);
        setUserCard(userParticipant.cardLayout as string[][]);
      }
    }
  }, [participants, session?.user]);

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
    console.log('Checking for bingo with layout:', layout);

    // rows
    for (let r = 0; r < 5; r++) {
      let all = true;
      for (let c = 0; c < 5; c++) {
        if (!isCellMarked(layout, r, c)) { all = false; break; }
      }
      if (all) {
        console.log(`🎉 BINGO found in row ${r}!`);
        return true;
      }
    }
    // cols
    for (let c = 0; c < 5; c++) {
      let all = true;
      for (let r = 0; r < 5; r++) {
        if (!isCellMarked(layout, r, c)) { all = false; break; }
      }
      if (all) {
        console.log(`🎉 BINGO found in column ${c}!`);
        return true;
      }
    }
    // diagonals
    if ([0, 1, 2, 3, 4].every(i => isCellMarked(layout, i, i))) {
      console.log('🎉 BINGO found in diagonal 1!');
      return true;
    }
    if ([0, 1, 2, 3, 4].every(i => isCellMarked(layout, i, 4 - i))) {
      console.log('🎉 BINGO found in diagonal 2!');
      return true;
    }
    console.log('❌ No bingo found');
    return false;
  }, [isCellMarked]);

  // Calculate if user has claimed bingo
  const hasClaimed = !!winners?.some((w) => (w as { userId?: string }).userId === session?.user?.id || w.user?.id === session?.user?.id);


  // Watch for bingo and show claim button
  useEffect(() => {
    if (!userCard || userCard.length !== 5 || userCard[0]?.length !== 5) return;

    const currentlyHasBingo = hasAnyBingo(userCard);

    // Debug logging
    console.log('Bingo Check:', {
      currentlyHasBingo,
      hasBingo,
      hasClaimed,
      hasCelebrated: hasCelebratedRef.current,
      showClaimButton
    });

    if (currentlyHasBingo && !hasBingo && !hasClaimed && !hasCelebratedRef.current) {
      // Just got bingo - show claim button!
      console.log('🎉 BINGO DETECTED! Showing claim button');
      setHasBingo(true);
      setShowClaimButton(true);
    } else if (!currentlyHasBingo && hasBingo) {
      // Lost bingo - reset state
      console.log('❌ Lost bingo, resetting state');
      setHasBingo(false);
      setShowClaimButton(false);
      setIsCelebrating(false);
      hasCelebratedRef.current = false;
      if (celebrationTimerRef.current) {
        clearTimeout(celebrationTimerRef.current);
        celebrationTimerRef.current = null;
      }
    }
  }, [userCard, hasBingo, hasClaimed, hasAnyBingo, showClaimButton]);

  // Function to trigger celebration
  const triggerCelebration = () => {
    setShowClaimButton(false);
    setIsCelebrating(true);
    hasCelebratedRef.current = true;

    // Optimized confetti celebration
    const triggerConfetti = () => {
      // Multiple smaller bursts instead of one large burst
      const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

      // Burst 1: Center
      void confetti({
        particleCount: 30,
        spread: 60,
        origin: { x: 0.5, y: 0.4 },
        colors: colors,
        gravity: 0.8,
        ticks: 200,
      });

      // Burst 2: Left side
      setTimeout(() => {
        void confetti({
          particleCount: 20,
          spread: 45,
          origin: { x: 0.2, y: 0.3 },
          colors: colors,
          gravity: 0.7,
          ticks: 150,
        });
      }, 200);

      // Burst 3: Right side
      setTimeout(() => {
        void confetti({
          particleCount: 20,
          spread: 45,
          origin: { x: 0.8, y: 0.3 },
          colors: colors,
          gravity: 0.7,
          ticks: 150,
        });
      }, 400);

      // Burst 4: Bottom
      setTimeout(() => {
        void confetti({
          particleCount: 25,
          spread: 70,
          origin: { x: 0.5, y: 0.7 },
          colors: colors,
          gravity: 0.9,
          ticks: 180,
        });
      }, 600);
    };

    // Trigger confetti immediately
    triggerConfetti();

    // Clear any existing timer
    if (celebrationTimerRef.current) {
      clearTimeout(celebrationTimerRef.current);
    }

    // Auto-stop celebration after 5 seconds
    celebrationTimerRef.current = setTimeout(() => {
      setIsCelebrating(false);
      celebrationTimerRef.current = null;
    }, 5000);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) {
        clearTimeout(celebrationTimerRef.current);
      }
    };
  }, []);

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
          backgroundSize: '200% 200%, 200% 200%, 200% 200%, 200% 200%',
          backgroundPosition: '0% 0%, 100% 100%, 50% 50%, 0% 0%',
          animation: 'gradientShift 25s ease-in-out infinite',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Performance optimizations
          willChange: 'background-position',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
          },
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
          backgroundSize: '200% 200%, 200% 200%, 200% 200%, 200% 200%',
          backgroundPosition: '0% 0%, 100% 100%, 50% 50%, 0% 0%',
          animation: 'gradientShift 25s ease-in-out infinite',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Performance optimizations
          willChange: 'background-position',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
          },
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
        backgroundSize: '200% 200%, 200% 200%, 200% 200%, 200% 200%',
        backgroundPosition: '0% 0%, 100% 100%, 50% 50%, 0% 0%',
        animation: 'gradientShift 25s ease-in-out infinite',
        position: 'relative',
        paddingBottom: 4,
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
                  {userCard ? (
                    <Box sx={{ mb: 2 }}>
                      {/* Regenerate Card Button */}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            regenerateMyCard.mutate({ gameId });
                          }}
                          disabled={regenerateMyCard.isPending || hasClaimed}
                          sx={{
                            borderColor: '#3b82f6',
                            color: '#3b82f6',
                            '&:hover': {
                              borderColor: '#2563eb',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)'
                            },
                            px: 2,
                            py: 0.5,
                            fontSize: '0.75rem',
                          }}
                        >
                          {regenerateMyCard.isPending ? 'Regenerating...' : 'Regenerate Card'}
                        </Button>
                      </Box>
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
                {/* Refresh button */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      void utils.bingoGame.getParticipants.invalidate({ gameId });
                      void utils.bingoGame.getWinners.invalidate({ gameId });
                      void utils.bingoGame.getById.invalidate({ id: gameId });
                    }}
                    sx={{
                      minWidth: 'auto',
                      px: 2,
                      py: 0.5,
                      fontSize: '0.75rem',
                      borderColor: '#6B7280',
                      color: '#6B7280',
                      '&:hover': {
                        borderColor: '#374151',
                        backgroundColor: 'rgba(107, 114, 128, 0.1)',
                      },
                    }}
                  >
                    Refresh
                  </Button>
                </Box>


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
                              {/* Proximity indicator - only show if not a winner */}
                              {!winnerInfo && participant.cardLayout && (
                                (() => {
                                  const proximity = calculateProximityToBingo(participant.cardLayout as string[][]);
                                  if (proximity === 1) {
                                    return (
                                      <Chip
                                        label="1 away"
                                        size="small"
                                        sx={{
                                          backgroundColor: '#FEF3C7',
                                          color: '#D97706',
                                          fontWeight: 600,
                                          fontSize: '0.7rem',
                                          height: 20,
                                        }}
                                      />
                                    );
                                  } else if (proximity === 2) {
                                    return (
                                      <Chip
                                        label="2 away"
                                        size="small"
                                        sx={{
                                          backgroundColor: '#DBEAFE',
                                          color: '#2563EB',
                                          fontWeight: 600,
                                          fontSize: '0.7rem',
                                          height: 20,
                                        }}
                                      />
                                    );
                                  }
                                  return null;
                                })()
                              )}
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

                  {/* Main content: Bingo card and buttons side by side */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 4 }}>
                    {/* Bingo Card - Left side */}
                    <Box sx={{ flex: 1 }}>
                      {userCard ? (
                        <BingoCard
                          cardLayout={userCard}
                          centerSquareItem={centerSquareItem}
                          isGameActive={isGameActive}
                          playerName={session?.user?.name ?? undefined}
                          onSquareClick={handleSquareClick}
                          disabled={hasClaimed}
                        />
                      ) : (
                        <Box sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          py: 6,
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

                    {/* Buttons - Right side */}
                    {!hasClaimed && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 'fit-content' }}>
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

                        {/* Claim Bingo Button - Below Leave Game */}
                        {showClaimButton && (
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => claimBingo.mutate({ gameId })}
                            disabled={claimBingo.isPending}
                            sx={{
                              fontSize: '0.75rem',
                              px: 2,
                              py: 0.5,
                            }}
                          >
                            {claimBingo.isPending ? 'Claiming…' : 'Claim Bingo'}
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      </Container>

      {/* Optimized Confetti Celebration */}
      {isCelebrating && hasJoined && !hasClaimed && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 9998,
            overflow: 'hidden',
          }}
        >
          {/* Dark Overlay for Contrast */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 1,
            }}
          />

          {/* Winner Text */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              zIndex: 3,
              animation: 'winnerTextPulse 2s ease-in-out infinite',
              '@keyframes winnerTextPulse': {
                '0%': {
                  transform: 'translate(-50%, -50%) scale(1)',
                  opacity: 0.8,
                },
                '50%': {
                  transform: 'translate(-50%, -50%) scale(1.1)',
                  opacity: 1,
                },
                '100%': {
                  transform: 'translate(-50%, -50%) scale(1)',
                  opacity: 0.8,
                },
              },
            }}
          >
            <Typography
              variant="h2"
              sx={{
                color: '#FFD700',
                fontWeight: 'bold',
                textShadow: '3px 3px 6px rgba(0,0,0,0.8)',
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                fontFamily: '"Comic Sans MS", cursive, sans-serif',
                marginBottom: 1,
              }}
            >
              🎉 WINNER! 🎉
            </Typography>
            <Typography
              variant="h4"
              sx={{
                color: '#FFA500',
                fontWeight: 'bold',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                fontFamily: '"Comic Sans MS", cursive, sans-serif',
              }}
            >
              {winners && winners.length > 0 ? `1st Place!` : 'BINGO!'}
            </Typography>
          </Box>
        </Box>
      )}


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
