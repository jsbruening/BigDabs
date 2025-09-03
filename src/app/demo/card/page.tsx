"use client";

import { useState } from "react";
import { BingoCard } from "~/components/BingoCard";

// Create a 5x5 card layout for demo
const createDemoCardLayout = (): string[][] => {
 const items = Array.from({ length: 24 }, (_, i) => `Item ${i + 1}`);
 const layout: string[][] = [];
 let itemIndex = 0;

 for (let row = 0; row < 5; row++) {
  const cardRow: string[] = [];
  for (let col = 0; col < 5; col++) {
   if (row === 2 && col === 2) {
    // Center square
    cardRow.push("");
   } else {
    cardRow.push(items[itemIndex] ?? "Empty");
    itemIndex++;
   }
  }
  layout.push(cardRow);
 }

 return layout;
};

export default function DemoBingoCardPage() {
 const [cardLayout, setCardLayout] = useState<string[][]>(createDemoCardLayout());

 const handleSquareClick = (row: number, col: number) => {
  const newLayout = cardLayout.map((cardRow, rowIndex) =>
   cardRow.map((cell, colIndex) => {
    if (rowIndex === row && colIndex === col) {
     // Toggle: if marked, unmark; if unmarked, mark
     return cell.startsWith('✓') ? cell.substring(1) : `✓${cell}`;
    }
    return cell;
   })
  );
  setCardLayout(newLayout);
 };

 return (
  <div className="min-h-screen bg-slate-50 p-6">
   <div className="mx-auto max-w-4xl">
    <h1 className="mb-4 text-2xl font-semibold">Bingo Card Demo</h1>
    <BingoCard
     cardLayout={cardLayout}
     centerSquareItem={{ label: "FREE", imageUrl: null }}
     isGameActive={true}
     playerName="Demo Player"
     onSquareClick={handleSquareClick}
    />
   </div>
  </div>
 );
}


