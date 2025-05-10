interface Position {
  row: number;
  col: number;
}

interface SudokuProblem {
  state: (number | null)[][]; // 9x9 grid, null for empty cells
  domain: number[][][]; // 9x9 grid, each cell has an array of possible values
  fixed: boolean[][]; // 9x9 grid, true for fixed cells, false for modifiable cells
}

interface Node {
  problem: SudokuProblem;
  parent: Node | null;
  lastAssigned: Position;
}

// Global metrics to track algorithm performance
export let metrics = {
  nodesExpanded: 0,
  childrenGenerated: 0,
  maxDepth: 0,
  iterations: 0,
  reset: function() {
    this.nodesExpanded = 0;
    this.childrenGenerated = 0;
    this.maxDepth = 0;
    this.iterations = 0;
  }
};

// Helper function to calculate depth of a node in the search tree
function getDepth(node: Node): number {
  let depth = 0;
  let current = node;
  while (current.parent) {
    depth++;
    current = current.parent;
  }
  return depth;
}

export function initiate(initialState: { state: (number | null)[][] }) {
  const { domain, fixed } = inititationHelper(initialState);
  const problem = { state: initialState.state, domain: domain, fixed: fixed };
  return problem;
}

export function consistent(problem: SudokuProblem): boolean {
  // Map to store positions of each number
  const hashmap = new Map<number, Position[]>();

  // Populate the hashmap with positions of each number
  for (let i = 0; i < problem.state.length; i++) {
    for (let j = 0; j < problem.state[i].length; j++) {
      const value = problem.state[i][j];
      if (value !== null) {
        if (!hashmap.has(value)) {
          hashmap.set(value, []);
        }
        hashmap.get(value)!.push({ row: i, col: j });
      }
    }
  }

  // Check for conflicts for each number
  for (const [_, positions] of hashmap.entries()) {
    // Check for conflicts in rows, columns, and subgrids
    const rows = new Set<number>();
    const cols = new Set<number>();
    const subgrids = new Set<string>();

    for (const pos of positions) {
      const { row, col } = pos;

      // Check row conflict
      if (rows.has(row)) {
        return false; // Conflict in the same row
      }
      rows.add(row);

      // Check column conflict
      if (cols.has(col)) {
        return false; // Conflict in the same column
      }
      cols.add(col);

      // Check subgrid conflict
      const subgridKey = `${Math.floor(row / 3)}-${Math.floor(col / 3)}`;
      if (subgrids.has(subgridKey)) {
        return false; // Conflict in the same subgrid
      }
      subgrids.add(subgridKey);
    }
  }

  // If no conflicts are found, the state is consistent
  return true;
}

// Get available actions for a position
export function Actions(problem: SudokuProblem, { row, col }: Position) {
  return problem.domain[row][col];
}

export function inititationHelper(initialState: { state: (number | null)[][] }) {
  // Initialize a 9x9 grid for domains
  const domain: number[][][] = Array.from({ length: initialState.state.length }, () =>
    Array.from({ length: initialState.state[0].length }, () => [])
  );
  const fixed: boolean[][] = Array.from(
    { length: initialState.state.length },
    () => Array.from({ length: initialState.state[0].length }, () => false)
  );

  for (let i = 0; i < initialState.state.length; i++) {
    for (let j = 0; j < initialState.state[i].length; j++) {
      if (initialState.state[i][j] !== null) {
        // If the cell is already filled, its domain is empty
        fixed[i][j] = true;
        domain[i][j] = [];
      } else {
        // If the cell is empty, its domain is [1, 2, ..., 9]
        domain[i][j] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      }
    }
  }

  return { domain, fixed };
}

export function isgoal(problem: SudokuProblem) {
  for (let i = 0; i < problem.state.length; i++) {
    for (let j = 0; j < problem.state[i].length; j++) {
      if (problem.state[i][j] === null) {
        return false;
      }
    }
  }
  return consistent(problem);
}

export function getNextPosition(
  state: (number | null)[][],
  currentPosition: Position | null
): Position | null {
  const size = state.length; // Assuming a square grid (e.g., 9x9)

  // Start from the top-left corner if no current position is provided
  let startRow = currentPosition ? currentPosition.row : 0;
  let startCol = currentPosition ? currentPosition.col + 1 : 0;

  // Adjust if we're at the end of a row
  if (startCol >= size) {
    startRow++;
    startCol = 0;
  }

  // Iterate through the grid to find the next empty cell
  for (let i = startRow; i < size; i++) {
    for (let j = i === startRow ? startCol : 0; j < size; j++) {
      if (state[i][j] === null) {
        return { row: i, col: j }; // Return the next empty position
      }
    }
  }

  // If no empty cell is found, return null (grid is full)
  return null;
}

export function updateDomain(
  domain: number[][][],
  position: Position,
  value: number
): number[][][] {
  // Create a deep copy of the domain to avoid mutating the original
  const newDomain = domain.map(row => row.map(cell => [...cell]));

  const { row, col } = position;

  // Remove the assigned value from the domains of all cells in the same row
  for (let j = 0; j < newDomain[row].length; j++) {
    if (newDomain[row][j].includes(value)) {
      newDomain[row][j] = newDomain[row][j].filter(v => v !== value);
    }
  }

  // Remove the assigned value from the domains of all cells in the same column
  for (let i = 0; i < newDomain.length; i++) {
    if (newDomain[i][col].includes(value)) {
      newDomain[i][col] = newDomain[i][col].filter(v => v !== value);
    }
  }

  // Remove the assigned value from the domains of all cells in the same subgrid
  const subgridRowStart = Math.floor(row / 3) * 3;
  const subgridColStart = Math.floor(col / 3) * 3;

  for (let i = subgridRowStart; i < subgridRowStart + 3; i++) {
    for (let j = subgridColStart; j < subgridColStart + 3; j++) {
      if (newDomain[i][j].includes(value)) {
        newDomain[i][j] = newDomain[i][j].filter(v => v !== value);
      }
    }
  }

  // Set the domain of the assigned cell to an empty array (no further values allowed)
  newDomain[row][col] = [];

  return newDomain;
}

// FIXED GETCHILDREN FUNCTION with metrics
export function getChildren(parent: Node): Node[] {
  const { row, col } = parent.lastAssigned;
  
  // Get possible values for the current empty cell
  const actions = parent.problem.domain[row][col];
  
  // Find the next empty cell
  const nextPosition = getNextPosition(parent.problem.state, parent.lastAssigned);
  
  // Initialize an array to store the child nodes
  const children: Node[] = [];
  
  // Track depth for metrics
  const currentDepth = getDepth(parent);
  metrics.maxDepth = Math.max(metrics.maxDepth, currentDepth + 1);
  
  // Iterate through each action
  for (let i = 0; i < actions.length; i++) {
    // Create a deep copy of the parent's problem state
    const newState = parent.problem.state.map(r => [...r]);
    
    // Apply the action to the CURRENT cell (not the next one)
    const value = actions[i];
    newState[row][col] = value;
    const domain = updateDomain(parent.problem.domain, parent.lastAssigned, value);
    
    // If we've filled the grid, there's no next position
    if (!nextPosition) {
      // Check if this completes the puzzle
      const childNode: Node = {
        problem: {
          ...parent.problem,
          domain: domain,
          state: newState,
        },
        lastAssigned: parent.lastAssigned, // Keep the same position as there's no next
        parent: parent,
      };
      children.push(childNode);
      continue;
    }
    
    // Create a new child node with nextPosition as the new lastAssigned
    const child: Node = {
      problem: {
        ...parent.problem,
        domain: domain,
        state: newState,
      },
      lastAssigned: nextPosition, // The NEXT cell to fill
      parent: parent,
    };
    
    // Add the child node to the list of children
    children.push(child);
  }
  
  // Update metrics
  metrics.childrenGenerated += children.length;
  
  // Return the list of child nodes
  return children;
}

// FIXED GETCHILDREN FORWARDING FUNCTION with metrics
export function getChildren_forwarding(parent: Node): Node[] {
  const { row, col } = parent.lastAssigned;
  
  // Get possible values for the current empty cell
  const actions = parent.problem.domain[row][col];
  
  // Find the next empty cell
  const nextPosition = getNextPosition(parent.problem.state, parent.lastAssigned);
  
  // Initialize an array to store the child nodes
  const children: Node[] = [];
  
  // Track depth for metrics
  const currentDepth = getDepth(parent);
  metrics.maxDepth = Math.max(metrics.maxDepth, currentDepth + 1);
  
  // Iterate through each action
  for (let i = 0; i < actions.length; i++) {
    // Create a deep copy of the parent's problem state
    const newState = parent.problem.state.map(r => [...r]);
    
    // Apply the action to the CURRENT cell
    const value = actions[i];
    newState[row][col] = value;
    const domain = updateDomain(parent.problem.domain, parent.lastAssigned, value);
    
    // Forward checking: Check if any unassigned variable has an empty domain
    let hasEmptyDomain = false;
    for (let r = 0; r < domain.length; r++) {
      for (let c = 0; c < domain[r].length; c++) {
        // Only check unassigned variables (those with value null in state)
        if (newState[r][c] === null && domain[r][c].length === 0) {
          hasEmptyDomain = true;
          break;
        }
      }
      if (hasEmptyDomain) break;
    }
    
    // Only create children for consistent assignments
    if (!hasEmptyDomain) {
      // If we've filled the grid, there's no next position
      if (!nextPosition) {
        // Check if this completes the puzzle
        const childNode: Node = {
          problem: {
            ...parent.problem,
            domain: domain,
            state: newState,
          },
          lastAssigned: parent.lastAssigned,
          parent: parent,
        };
        children.push(childNode);
        continue;
      }
      
      // Create a new child node
      const child: Node = {
        problem: {
          ...parent.problem,
          domain: domain,
          state: newState,
        },
        lastAssigned: nextPosition,
        parent: parent,
      };
      
      // Add the child node to the list of children
      children.push(child);
    }
  }
  
  // Update metrics
  metrics.childrenGenerated += children.length;
  
  // Return the list of child nodes
  return children;
}

// FIXED BACKTRACK FUNCTION with metrics
export function backtack(state: (number | null)[][]) {
  // Reset metrics
  metrics.reset();
  
  let problem = initiate({ state });
  
  // Find the first empty cell to start with
  const firstEmpty = getNextPosition(state, null);
  if (!firstEmpty) {
    // No empty cells, puzzle is already complete
    return { problem, parent: null, lastAssigned: { row: 0, col: 0 } };
  }
  
  let root: Node = {
    problem: problem,
    parent: null,
    lastAssigned: firstEmpty, // Start with the first empty cell
  };
  
  let fringe = [root];
  while (fringe.length > 0) {
    let current = fringe.pop();
    if (!current) return null;
    
    // Track expanded nodes
    metrics.nodesExpanded++;
    
    if (consistent(current.problem)) {
      if (isgoal(current.problem)) return current;
      let children = getChildren(current);
      fringe = fringe.concat(children);
    }
  }
  return null;
}

// FIXED BACKTRACK FORWARD FUNCTION with metrics
export function backtack_forward(state: (number | null)[][]) {
  // Reset metrics
  metrics.reset();
  
  let problem = initiate({ state });
  
  // Find the first empty cell to start with
  const firstEmpty = getNextPosition(state, null);
  if (!firstEmpty) {
    // No empty cells, puzzle is already complete
    return { problem, parent: null, lastAssigned: { row: 0, col: 0 } };
  }
  
  let root: Node = {
    problem: problem,
    parent: null,
    lastAssigned: firstEmpty, // Start with the first empty cell
  };
  
  let fringe = [root];
  while (fringe.length > 0) {
    let current = fringe.pop();
    if (!current) return null;
    
    // Track expanded nodes
    metrics.nodesExpanded++;
    
    if (consistent(current.problem)) {
      if (isgoal(current.problem)) return current;
      let children = getChildren_forwarding(current);
      fringe = fringe.concat(children);
    }
  }
  return null;
}

// MRV (Minimum Remaining Values) function
export function getMRVPosition(problem: SudokuProblem): Position | null {
  let minDomainSize = Infinity;
  let bestPos: Position | null = null;
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (problem.state[i][j] === null) {
        const domainSize = problem.domain[i][j].length;
        if (domainSize < minDomainSize && domainSize > 0) {
          minDomainSize = domainSize;
          bestPos = { row: i, col: j };
        }
      }
    }
  }
  return bestPos;
}

// LCV (Least Constraining Value) function
export function getLCV(problem: SudokuProblem, pos: Position): number[] {
  const { row, col } = pos;
  const values = problem.domain[row][col];
  // For each value, count how many domain values it would remove from neighbors
  const constraints = values.map(value => {
    let count = 0;
    // Row and column
    for (let i = 0; i < 9; i++) {
      if (problem.state[row][i] === null && problem.domain[row][i].includes(value)) count++;
      if (problem.state[i][col] === null && problem.domain[i][col].includes(value)) count++;
    }
    // Subgrid
    const subgridRowStart = Math.floor(row / 3) * 3;
    const subgridColStart = Math.floor(col / 3) * 3;
    for (let i = subgridRowStart; i < subgridRowStart + 3; i++) {
      for (let j = subgridColStart; j < subgridColStart + 3; j++) {
        if (problem.state[i][j] === null && problem.domain[i][j].includes(value)) count++;
      }
    }
    return { value, count };
  });
  // Sort by least constraining (fewest removals)
  return constraints.sort((a, b) => a.count - b.count).map(x => x.value);
}

// FIXED GETCHILDREN_MRV_LCV FUNCTION with metrics
export function getChildren_MRV_LCV(parent: Node): Node[] {
  // Instead of using the lastAssigned position directly, we find the MRV position
  const nextPosition = getMRVPosition(parent.problem);
  if (!nextPosition) return [];
  
  // Track depth for metrics
  const currentDepth = getDepth(parent);
  metrics.maxDepth = Math.max(metrics.maxDepth, currentDepth + 1);
  
  // Get LCV-ordered values for this position
  const actions = getLCV(parent.problem, nextPosition);
  const children: Node[] = [];
  
  for (const value of actions) {
    const newState = parent.problem.state.map(row => [...row]);
    newState[nextPosition.row][nextPosition.col] = value;
    const domain = updateDomain(parent.problem.domain, nextPosition, value);
    
    // Forward checking
    let hasEmptyDomain = false;
    for (let row = 0; row < domain.length; row++) {
      for (let col = 0; col < domain[row].length; col++) {
        if (newState[row][col] === null && domain[row][col].length === 0) {
          hasEmptyDomain = true;
          break;
        }
      }
      if (hasEmptyDomain) break;
    }
    
    if (!hasEmptyDomain) {
      // Find the NEXT MRV position (after this assignment)
      const updatedProblem = {
        ...parent.problem,
        domain,
        state: newState
      };
      
      const nextMRVPosition = getMRVPosition(updatedProblem);
      
      children.push({
        problem: updatedProblem,
        lastAssigned: nextMRVPosition || nextPosition, // If no next position, keep current
        parent,
      });
    }
  }
  
  // Update metrics
  metrics.childrenGenerated += children.length;
  
  return children;
}

// FIXED BACKTRACK_MRV_LCV FUNCTION with metrics
export function backtrack_MRV_LCV(state: (number | null)[][]) {
  // Reset metrics
  metrics.reset();
  
  let problem = initiate({ state });
  
  // Find the first MRV position to start with
  const firstMRV = getMRVPosition(problem);
  if (!firstMRV) {
    // No empty cells, puzzle is already complete
    return { problem, parent: null, lastAssigned: { row: 0, col: 0 } };
  }
  
  let root: Node = {
    problem: problem,
    parent: null,
    lastAssigned: firstMRV, // Start with the MRV position
  };
  
  let fringe = [root];
  while (fringe.length > 0) {
    let current = fringe.pop();
    if (!current) return null;
    
    // Track expanded nodes
    metrics.nodesExpanded++;
    
    if (consistent(current.problem)) {
      if (isgoal(current.problem)) return current;
      let children = getChildren_MRV_LCV(current);
      fringe = fringe.concat(children);
    }
  }
  return null;
}

// Simulated Annealing with metrics

// Random complete assignment - fills each 3x3 block with missing numbers
export function randomCompleteAssignment(state: (number | null)[][], _: boolean[][]): number[][] {
  // Fill all empty cells randomly, respecting fixed cells
  const newState = state.map(row => [...row]) as number[][];
  
  for (let blockRow = 0; blockRow < 3; blockRow++) {
    for (let blockCol = 0; blockCol < 3; blockCol++) {
      // Collect missing numbers in this block
      const present = new Set<number>();
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const r = blockRow * 3 + i;
          const c = blockCol * 3 + j;
          const val = newState[r][c];
          if (val !== null) present.add(val);
        }
      }
      
      const missing = [];
      for (let n = 1; n <= 9; n++) {
        if (!present.has(n)) missing.push(n);
      }
      
      // Randomly shuffle missing numbers
      for (let i = missing.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [missing[i], missing[j]] = [missing[j], missing[i]];
      }
      
      // Fill missing numbers randomly in empty cells
      let idx = 0;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const r = blockRow * 3 + i;
          const c = blockCol * 3 + j;
          if (newState[r][c] === null) {
            newState[r][c] = missing[idx++];
          }
        }
      }
    }
  }
  
  return newState;
}

// Count conflicts in rows and columns
export function countConflicts(state: number[][]): number {
  let conflicts = 0;
  
  // Rows
  for (let i = 0; i < 9; i++) {
    const seen = new Set<number>();
    for (let j = 0; j < 9; j++) {
      if (seen.has(state[i][j])) {
        conflicts++;
      }
      seen.add(state[i][j]);
    }
  }
  
  // Columns
  for (let j = 0; j < 9; j++) {
    const seen = new Set<number>();
    for (let i = 0; i < 9; i++) {
      if (seen.has(state[i][j])) {
        conflicts++;
      }
      seen.add(state[i][j]);
    }
  }
  
  return conflicts;
}

// Simulated Annealing with metrics
export function simulatedAnnealing(
  state: (number | null)[][],
  fixed: boolean[][],
  maxSteps = 100000
): number[][] | null {
  // Reset metrics
  metrics.reset();
  
  // Create a complete random assignment
  let current = randomCompleteAssignment(state, fixed);
  let currentConflicts = countConflicts(current);
  
  // If already solved, return immediately
  if (currentConflicts === 0) return current;
  
  // Temperature parameters
  let T = 1.0;
  const T_min = 1e-4;
  const alpha = 0.999;
  
  // Main simulated annealing loop
  for (let step = 0; step < maxSteps && currentConflicts > 0; step++) {
    // Update iteration count
    metrics.iterations++;
    
    // Pick a random subgrid
    const blockRow = Math.floor(Math.random() * 3);
    const blockCol = Math.floor(Math.random() * 3);
    
    // Get all non-fixed cells in this subgrid
    const cells: [number, number][] = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const r = blockRow * 3 + i;
        const c = blockCol * 3 + j;
        if (!fixed[r][c]) cells.push([r, c]);
      }
    }
    
    // If there are fewer than 2 non-fixed cells in this subgrid, try another iteration
    if (cells.length < 2) continue;
    
    // Pick two random cells to swap
    const a = cells[Math.floor(Math.random() * cells.length)];
    const b = cells[Math.floor(Math.random() * cells.length)];
    
    // Skip if we chose the same cell twice
    if (a[0] === b[0] && a[1] === b[1]) continue;
    
    // Swap values
    const next = current.map(row => [...row]);
    [next[a[0]][a[1]], next[b[0]][b[1]]] = [next[b[0]][b[1]], next[a[0]][a[1]]];
    
    // Calculate conflicts after swap
    const nextConflicts = countConflicts(next);
    
    // Decide whether to accept the new state
    const delta = nextConflicts - currentConflicts;
    if (delta < 0 || Math.random() < Math.exp(-delta / T)) {
      current = next;
      currentConflicts = nextConflicts;
    }
    
    // Cool down the temperature
    T *= alpha;
    if (T < T_min) T = T_min;
    
    // If solution found, return early
    if (currentConflicts === 0) {
      return current;
    }
  }
  
  // Return the solution if we found one, otherwise null
  return currentConflicts === 0 ? current : null;
}
