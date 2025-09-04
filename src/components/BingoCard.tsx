"use client";

import React, { useState, useEffect } from 'react';
import {
 Box,
 Paper,
 Typography,
 Grid,
 Avatar,
} from '@mui/material';


interface BingoSquare {
 id: string;
 label: string;
 imageUrl: string | null;
 isFree: boolean;
 blotted: boolean;
 row: number;
 col: number;
}

interface BingoCardProps {
 cardLayout: string[][];
 centerSquareItem?: {
  label: string;
  imageUrl?: string | null;
 } | null;
 isGameActive: boolean;
 playerName?: string;
 onSquareClick?: (row: number, col: number) => void;
 disabled?: boolean;
}

export function BingoCard({
 cardLayout,
 centerSquareItem,
 isGameActive,
 playerName: _playerName,
 onSquareClick,
 disabled = false
}: BingoCardProps) {
 // Debug logging
 console.log('BingoCard received cardLayout:', cardLayout);
 console.log('BingoCard received centerSquareItem:', centerSquareItem);

 // Create a 5x5 grid from the 2D array
 const gridSquares = Array.from({ length: 25 }, (_, index) => {
  const row = Math.floor(index / 5);
  const col = index % 5;
  const cellValue = cardLayout[row]?.[col] ?? '';
  const isCenter = row === 2 && col === 2;

  // Check if square is dabbed (starts with ✓)
  const isDabbed = cellValue.startsWith('✓');
  const label = isDabbed ? cellValue.substring(1) : cellValue; // Remove ✓ prefix for display

  return {
   id: `square-${row}-${col}`,
   label,
   imageUrl: null,
   isFree: isCenter,
   blotted: isDabbed,
   row,
   col,
  };
 });

 const [previousCardLayout, setPreviousCardLayout] = useState<string[][] | null>(null);
 const [unmarkingSquares, setUnmarkingSquares] = useState<Set<string>>(new Set());

 // Track when squares are being unmarked by comparing with previous layout
 useEffect(() => {
  if (previousCardLayout) {
   const previousMarked = new Set(
    previousCardLayout.flatMap((row, rowIndex) =>
     row.map((cell, colIndex) => {
      const isMarked = cell.startsWith('✓');
      return isMarked ? `square-${rowIndex}-${colIndex}` : null;
     }).filter((id): id is string => id !== null)
    )
   );

   const currentMarked = new Set(
    cardLayout.flatMap((row, rowIndex) =>
     row.map((cell, colIndex) => {
      const isMarked = cell.startsWith('✓');
      return isMarked ? `square-${rowIndex}-${colIndex}` : null;
     }).filter((id): id is string => id !== null)
    )
   );

   // Find squares that were marked but are no longer marked
   const newlyUnmarking = Array.from(previousMarked).filter(id => !currentMarked.has(id));

   if (newlyUnmarking.length > 0) {
    setUnmarkingSquares(prev => new Set([...prev, ...newlyUnmarking]));

    // Remove from unmarking set after animation completes
    const timer = setTimeout(() => {
     setUnmarkingSquares(prev => {
      const newSet = new Set(prev);
      newlyUnmarking.forEach(id => newSet.delete(id));
      return newSet;
     });
    }, 300);

    return () => clearTimeout(timer);
   }
  }

  setPreviousCardLayout(cardLayout);
 }, [cardLayout, previousCardLayout]);

 const handleSquareClick = (square: BingoSquare) => {
  if (!isGameActive || square.isFree || disabled) return;

  // Call the parent's click handler
  if (onSquareClick) {
   onSquareClick(square.row, square.col);
  }
 };

 const renderSquare = (square: BingoSquare, index: number) => {
  const isCenter = square.row === 2 && square.col === 2;
  const isBlotted = square.blotted ?? square.isFree;

  return (
   <Box key={square.id}
    sx={{
     width: '100%',
     aspectRatio: '1',
    }}
   >
    <Box
     sx={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 0,
      cursor: isGameActive && !square.isFree && !disabled ? 'pointer' : 'default',
      animation: `squareFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.05}s both`,
      '@keyframes squareFadeIn': {
       '0%': {
        opacity: 0,
        transform: 'scale(0.98)'
       },
       '100%': {
        opacity: 1,
        transform: 'scale(1)'
       },
      },
      background: '#ffffff',
      border: '1px solid rgba(0, 0, 0, 0.12)',
      borderRadius: 0,
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'none',
      transition: 'background-color 0.2s ease, opacity 0.2s ease',
      '&:hover': isGameActive && !square.isFree && !disabled ? {
       background: '#f8fafc'
      } : {},
      '&:active': isGameActive && !square.isFree && !disabled ? {
       opacity: 0.95
      } : {},
      '&::before': isBlotted ? {
       content: '""',
       position: 'absolute',
       top: 0,
       left: 0,
       right: 0,
       bottom: 0,
       background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
       pointerEvents: 'none',
       borderRadius: 0,
      } : {},
     }}
     onClick={() => handleSquareClick(square)}
    >
     {/* Orange dab circle for selected squares */}
     {(isBlotted ?? unmarkingSquares.has(square.id)) && !isCenter && (
      <Box
       sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        height: '80%',
        borderRadius: '50%',
        background: 'rgba(255, 165, 0, 0.6)',
        border: '2px solid rgba(255, 140, 0, 0.8)',
        zIndex: 1,
        pointerEvents: 'none',
        animation: unmarkingSquares.has(square.id)
         ? 'dabFadeOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards'
         : 'dabPulse 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        '@keyframes dabPulse': {
         '0%': { transform: 'translate(-50%, -50%) scale(0)', opacity: 0 },
         '50%': { transform: 'translate(-50%, -50%) scale(1.1)', opacity: 1 },
         '100%': { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        },
        '@keyframes dabFadeOut': {
         '0%': { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
         '100%': { transform: 'translate(-50%, -50%) scale(0.8)', opacity: 0 },
        },
       }}
      />
     )}

     {/* Center square special styling */}
     {isCenter && centerSquareItem && (
      <Box
       sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#e5e7eb',
        borderRadius: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ef4444',
        border: '2px solid #ef4444',
        boxShadow: 'none',
       }}
      >
       <Typography
        variant="caption"
        sx={{
         fontWeight: 700,
         textAlign: 'center',
         fontSize: '1.1rem',
         lineHeight: 1,
         color: '#ef4444',
         textTransform: 'uppercase',
         fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
         letterSpacing: '0.08em',
         textShadow: '0 0 6px rgba(239, 68, 68, 0.4)',
         transform: 'rotate(-15deg)',
         transformOrigin: 'center',
        }}
       >
        {centerSquareItem.label ?? 'FREE'}
       </Typography>
      </Box>
     )}

     {/* Regular square content */}
     {!isCenter && (
      <>
       {square.imageUrl && (
        <Avatar
         src={square.imageUrl}
         sx={{ width: 32, height: 32, mb: 0.5, position: 'relative', zIndex: 2 }}
        />
       )}
       <Typography
        variant="caption"
        sx={{
         textAlign: 'center',
         fontSize: '1rem',
         lineHeight: 1.2,
         fontWeight: 600,
         color: '#374151',
         letterSpacing: '0.015em',
         position: 'relative',
         zIndex: 2,
         textShadow: 'none',
         px: 1,
         fontFamily: 'var(--font-inter), sans-serif',
        }}
       >
        {square.label}
       </Typography>
      </>
     )}
    </Box>
   </Box>
  );
 };

 return (
  <Box
   sx={{
    maxWidth: 600,
    mx: 'auto',
    animation: 'slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    '@keyframes slideInUp': {
     '0%': { opacity: 0, transform: 'translateY(30px) scale(0.95)' },
     '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
    },
   }}
  >
   <Paper
    elevation={8}
    sx={{
     p: 2,
     background: 'linear-gradient(135deg, #22d3ee 0%, #60a5fa 28%, #fbbf24 52%, #a78bfa 74%, #f59e0b 88%, #34d399 100%)',
     borderRadius: 4,
     border: '1px solid rgba(255, 255, 255, 0.2)',
     boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)',
     position: 'relative',
     overflow: 'hidden',
     '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
      borderRadius: 4,
      zIndex: 1,
     },
     '& > *': { position: 'relative', zIndex: 2 }
    }}
   >
    <Box
     sx={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 0,
      width: '100%',
     }}
    >
     {gridSquares.map((square, index) => renderSquare(square, index))}
    </Box>
   </Paper>
  </Box>
 );
}
