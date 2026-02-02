import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

// Simple QR code generator using SVG
// This is a basic implementation - for production, consider using a library
export function QRCode({ value, size = 200, className }: QRCodeProps) {
  const qrData = useMemo(() => generateQRMatrix(value), [value]);
  const moduleSize = size / qrData.length;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("bg-white", className)}
    >
      {qrData.map((row, y) =>
        row.map((cell, x) =>
          cell ? (
            <rect
              key={`${x}-${y}`}
              x={x * moduleSize}
              y={y * moduleSize}
              width={moduleSize}
              height={moduleSize}
              fill="black"
            />
          ) : null
        )
      )}
    </svg>
  );
}

// Simplified QR code matrix generator
// This creates a pseudo-QR pattern based on the input
function generateQRMatrix(data: string): boolean[][] {
  const size = 25; // Fixed size for simplicity
  const matrix: boolean[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(false));

  // Add finder patterns (the three corner squares)
  addFinderPattern(matrix, 0, 0);
  addFinderPattern(matrix, size - 7, 0);
  addFinderPattern(matrix, 0, size - 7);

  // Add timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Generate data pattern from input string
  const hash = simpleHash(data);
  let hashIndex = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Skip finder patterns and timing patterns
      if (isReserved(x, y, size)) continue;

      // Use hash to determine module state
      const bit = (hash[hashIndex % hash.length] >> ((x + y) % 8)) & 1;
      matrix[y][x] = bit === 1;
      hashIndex++;
    }
  }

  return matrix;
}

function addFinderPattern(matrix: boolean[][], startX: number, startY: number) {
  // Outer black border
  for (let i = 0; i < 7; i++) {
    matrix[startY][startX + i] = true;
    matrix[startY + 6][startX + i] = true;
    matrix[startY + i][startX] = true;
    matrix[startY + i][startX + 6] = true;
  }

  // Inner white space
  for (let y = 1; y < 6; y++) {
    for (let x = 1; x < 6; x++) {
      matrix[startY + y][startX + x] = false;
    }
  }

  // Center black square
  for (let y = 2; y < 5; y++) {
    for (let x = 2; x < 5; x++) {
      matrix[startY + y][startX + x] = true;
    }
  }
}

function isReserved(x: number, y: number, size: number): boolean {
  // Finder patterns
  if ((x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8)) {
    return true;
  }
  // Timing patterns
  if (x === 6 || y === 6) {
    return true;
  }
  return false;
}

function simpleHash(str: string): number[] {
  const result: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    result.push(char);
    result.push((char * 31) % 256);
    result.push((char * 17 + i) % 256);
  }
  // Ensure we have enough data
  while (result.length < 100) {
    result.push((result[result.length - 1] * 37 + result.length) % 256);
  }
  return result;
}
