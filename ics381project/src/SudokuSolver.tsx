import React, { useState } from "react";
import {
  backtack,
  backtack_forward,
  backtrack_MRV_LCV,
  simulatedAnnealing,
} from "./search";

// Helper to create empty board
const emptyBoard = () => Array.from({ length: 9 }, () => Array(9).fill(null));

// Define a type for stats
type Stats = {
  time: string;
  // Add more fields if you want to track more stats
};

// Helper function to find the first empty cell
function findFirstEmpty(board: (number | null)[][]): { row: number; col: number } | null {
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      if (board[i][j] === null) {
        return { row: i, col: j };
      }
    }
  }
  return null;
}

export default function SudokuSolver() {
  const [board, setBoard] = useState<(number | null)[][]>(emptyBoard());
  const [algorithm, setAlgorithm] = useState("backtracking");
  const [result, setResult] = useState<(number | null)[][] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleInput = (row: number, col: number, value: string) => {
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = value === "" ? null : Number(value);
    setBoard(newBoard);
    setResult(null); // Clear previous results
    setMessage(null);
  };

  const runSolver = () => {
    setMessage(null);
    
    // Check if board is empty
    if (!findFirstEmpty(board)) {
      setMessage("Board is already complete.");
      setResult(board);
      setStats({ time: "0 ms" });
      return;
    }
    
    let solution: (number | null)[][] | null = null;
    const t0 = performance.now();
    
    try {
      if (algorithm === "backtracking") {
        const node = backtack(board);
        solution = node ? node.problem.state : null;
      } else if (algorithm === "forward") {
        const node = backtack_forward(board);
        solution = node ? node.problem.state : null;
      } else if (algorithm === "mrv_lcv") {
        const node = backtrack_MRV_LCV(board);
        solution = node ? node.problem.state : null;
      } else if (algorithm === "annealing") {
        const fixed = board.map(row => row.map(cell => cell !== null));
        solution = simulatedAnnealing(board, fixed);
      }
    } catch (error) {
      console.error("Error solving puzzle:", error);
      setMessage(`An error occurred: ${error}`);
    }
    
    const t1 = performance.now();
    const info: Stats = {
      time: (t1 - t0).toFixed(2) + " ms",
    };
    
    setResult(solution);
    setStats(info);
    
    if (!solution) {
      setMessage("No solution found. The puzzle might be impossible to solve or too complex for the algorithm.");
    }
  };

  // Helper to style the grid cells
  const getCellStyle = (i: number, j: number) => {
    const styles: React.CSSProperties = {
      width: 40,
      height: 40,
      textAlign: "center",
      fontSize: "18px",
      border: "1px solid #999",
    };
    
    // Add thick borders to separate 3x3 blocks
    if (i % 3 === 0) styles.borderTop = "2px solid black";
    if (j % 3 === 0) styles.borderLeft = "2px solid black";
    if (i === 8) styles.borderBottom = "2px solid black";
    if (j === 8) styles.borderRight = "2px solid black";
    
    return styles;
  };

  // Clear board function
  const clearBoard = () => {
    setBoard(emptyBoard());
    setResult(null);
    setStats(null);
    setMessage(null);
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Sudoku Solver</h2>
      
      <div style={{ marginBottom: "20px" }}>
        <table style={{ borderCollapse: "collapse", margin: "0 auto" }}>
          <tbody>
            {board.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} style={getCellStyle(i, j)}>
                    <input
                      type="text"
                      value={cell === null ? "" : cell}
                      maxLength={1}
                      onChange={e =>
                        handleInput(i, j, e.target.value.replace(/[^1-9]/, ""))
                      }
                      style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                        textAlign: "center",
                        fontSize: "18px",
                        padding: 0,
                        boxSizing: "border-box",
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px", gap: "10px" }}>
        <select
          value={algorithm}
          onChange={e => setAlgorithm(e.target.value)}
          style={{ padding: "8px", borderRadius: "4px" }}
        >
          <option value="backtracking">Backtracking</option>
          <option value="forward">Backtracking + Forward Checking</option>
          <option value="mrv_lcv">Backtracking + MRV + LCV</option>
          <option value="annealing">Local Search (Annealing)</option>
        </select>
        <button
          onClick={runSolver}
          style={{
            padding: "8px 16px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Solve
        </button>
        <button
          onClick={clearBoard}
          style={{
            padding: "8px 16px",
            backgroundColor: "#f44336",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Clear
        </button>
      </div>
      
      {message && (
        <div style={{
          padding: "10px",
          backgroundColor: result ? "#dff0d8" : "#f2dede",
          color: result ? "#3c763d" : "#a94442",
          borderRadius: "4px",
          marginBottom: "20px",
          textAlign: "center"
        }}>
          {message}
        </div>
      )}
      
      {stats && <div style={{ textAlign: "center", marginBottom: "15px" }}>Time: {stats.time}</div>}
      
      {result && (
        <div>
          <h3 style={{ textAlign: "center" }}>Solution:</h3>
          <table style={{ borderCollapse: "collapse", margin: "0 auto" }}>
            <tbody>
              {result.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} style={getCellStyle(i, j)}>
                      <div style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        fontWeight: board[i][j] === null ? "bold" : "normal",
                        color: board[i][j] === null ? "#4CAF50" : "black"
                      }}>
                        {cell}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
