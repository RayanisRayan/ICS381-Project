interface Position{
	row: number,
	col:number
}
interface SudokuProblem {
  state: (number | null)[][]; // 9x9 grid, null for empty cells
  domain: number[][][]; // 9x9 grid, each cell has an array of possible values
  fixed: boolean[][]; // 9x9 grid, true for fixed cells, false for modifiable cells
}

function initiate(initialState:{state:(number | null)[][];}){
	const {domain,fixed }= inititationHelper(initialState)
	const problem = {state:initialState.state,domain:domain,fixed:fixed}	
	return problem
} 
function consistent(problem: SudokuProblem): boolean {
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
// this is an initiation for the object
function Actions(problem:SudokuProblem,{row,col}:Position){
	return problem.domain[row][col]
}
function inititationHelper(initialState: { state: (number | null)[][] })  {
  // Initialize a 9x9 grid for domains
  const domain:number[][][] = Array.from({ length: initialState.state.length }, () =>
    Array.from({ length: initialState.state[0].length }, () => [])
  );
	const fixed: boolean[][]=Array.from({length:initialState.state.length},()=>Array.from({length:initialState.state[0].length},()=>false))

  for (let i = 0; i < initialState.state.length; i++) {
    for (let j = 0; j < initialState.state[i].length; j++) {
      if (initialState.state[i][j] !== null) {
        // If the cell is already filled, its domain is empty
				fixed[i][j] = true
        domain[i][j] = [];
      } else {
        // If the cell is empty, its domain is [1, 2, ..., 9]
        domain[i][j] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      }
    }
  }

  return {domain,fixed};
}
function isgoal(problem:SudokuProblem){
	for(let i =0;i<problem.state.length;i++){
		for(let j=0;j<problem.state[i].length;j++){
			if(problem.state[i][j]===null){
				return false
			}
		}
	}
	return consistent(problem)
}

interface Node{
	problem: SudokuProblem,
	parent: (Node|null)
	lastAssigned:Position 
}

function getChildren(parent: Node): Node[] {
  const nextPosition = getNextPosition(parent.problem.state, parent.lastAssigned);

  // If there is no next position (grid is full), return an empty array
  if (!nextPosition) {
    return [];
  }
  // Get the list of possible actions for the current state
  const actions = Actions(parent.problem, parent.lastAssigned);

  // Initialize an array to store the child nodes
  const children: Node[] = [];

  // Iterate through each action
  for (let i = 0; i < actions.length; i++) {
    // Create a deep copy of the parent's problem state
    const newState = parent.problem.state.map(row => [...row]);

    // Apply the action to the copied state
    const value= actions[i];
    newState[parent.lastAssigned.row][parent.lastAssigned.col] = value;
		const domain = updateDomain(parent.problem.domain,parent.lastAssigned,value)
    // Create a new child node
    const child: Node = {
      problem: {
        ...parent.problem,
				domain:domain,
        state: newState, // Update the state with the new action
      },
      lastAssigned: nextPosition, // Track the last assigned value
      parent: parent, // Reference to the parent node
    };

    // Add the child node to the list of children
    children.push(child);
  }

  // Return the list of child nodes
  return children;
}
function getChildren_forwarding(parent: Node): Node[] {
  const nextPosition = getNextPosition(parent.problem.state, parent.lastAssigned);

  // If there is no next position (grid is full), return an empty array
  if (!nextPosition) {
    return [];
  }
  // Get the list of possible actions for the current state
  const actions = Actions(parent.problem, parent.lastAssigned);

  // Initialize an array to store the child nodes
  const children: Node[] = [];

  // Iterate through each action
  for (let i = 0; i < actions.length; i++) {
    // Create a deep copy of the parent's problem state
    const newState = parent.problem.state.map(row => [...row]);

    // Apply the action to the copied state
    const value = actions[i];
    newState[parent.lastAssigned.row][parent.lastAssigned.col] = value;
    const domain = updateDomain(parent.problem.domain, parent.lastAssigned, value);

    // Forward checking: Check if any unassigned variable has an empty domain
    let hasEmptyDomain = false;
    for (let row = 0; row < domain.length; row++) {
      for (let col = 0; col < domain[row].length; col++) {
        // Only check unassigned variables (those with value null in state)
        if (newState[row][col] === null && domain[row][col].length === 0) {
          hasEmptyDomain = true;
          break;
        }
      }
      if (hasEmptyDomain) break;
    }

    // Only create children for consistent assignments
    if (!hasEmptyDomain) {
      // Create a new child node
      const child: Node = {
        problem: {
          ...parent.problem,
          domain: domain,
          state: newState, // Update the state with the new action
        },
        lastAssigned: nextPosition, // Track the last assigned value
        parent: parent, // Reference to the parent node
      };

      // Add the child node to the list of children
      children.push(child);
    }
  }

  // Return the list of child nodes
  return children;
}
function getNextPosition(state: (number | null)[][], currentPosition: Position | null): Position | null {
  const size = state.length; // Assuming a square grid (e.g., 9x9)

  // Start from the top-left corner if no current position is provided
  let startRow = currentPosition ? currentPosition.row : 0;
  let startCol = currentPosition ? currentPosition.col + 1 : 0;

  // Iterate through the grid to find the next empty cell
  for (let i = startRow; i < size; i++) {
    for (let j = (i === startRow ? startCol : 0); j < size; j++) {
      if (state[i][j] === null) {
        return { row: i, col: j }; // Return the next empty position
      }
    }
  }

  // If no empty cell is found, return null (grid is full)
  return null;
}
function updateDomain(
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
function backtack(state:(number|null)[][]){
	let	problem = initiate({state})
	let root:Node= {
		problem:problem,
		parent:null,
		lastAssigned:{row:0,col:0}
	}	
	let fringe = [root]
	while(fringe.length>0){
		let current = fringe.pop()
		if(!current) return null
		if(consistent(current.problem)){
			if(isgoal(current.problem)) return current
			let children = getChildren(current)
			fringe=fringe.concat(children)
		}

	}
	return null
}
function backtack_forward(state:(number|null)[][]){
	let	problem = initiate({state})
	let root:Node= {
		problem:problem,
		parent:null,
		lastAssigned:{row:0,col:0}
	}	
	let fringe = [root]
	while(fringe.length>0){
		let current = fringe.pop()
		if(!current) return null
		if(consistent(current.problem)){
			if(isgoal(current.problem)) return current
			let children = getChildren_forwarding(current)
			fringe=fringe.concat(children)
		}

	}
	return null
}
