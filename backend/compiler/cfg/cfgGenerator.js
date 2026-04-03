// ============================================================
//  CFG Generator — Compiler-Based Structural Plagiarism Detector
//  Member 4: CFG + IR + Symbol Table
// ============================================================
 
class CFGGenerator {
  constructor() {
    // ── Core graph storage ────────────────────────────────────────────────
    this.nodes = [];   // { id, type, label, lines, meta }
    this.edges = [];   // { from, to, label }
 
    // ── ID counter ────────────────────────────────────────────────────────
    this._nextId = 0;
 
    // ── Heatmap data  (line → weight) ────────────────────────────────────
    //   Weight increases each time a line appears in a REACHABLE node.
    //   Dead-code lines get weight 0.  Used by frontend for visual heatmap.
    this.lineHeatmap = {};   // { [lineNumber]: number }
 
    // ── IR (Intermediate Representation) store ────────────────────────────
    //   Flat list of 3-address-code-like instructions derived from AST nodes.
    this.irInstructions = [];
  }
 
  // ═══════════════════════════════════════════════════════════════
  //  NODE  management
  // ═══════════════════════════════════════════════════════════════
 
  /**
   * Add a node (statement / basic block).
   *
   * @param {string}   type   - "entry" | "exit" | "statement" | "condition"
   *                            | "loop" | "function" | "return" | "dead"
   * @param {string}   label  - Human-readable label (shown in graph)
   * @param {number[]} lines  - Source-code line numbers covered by this node
   * @param {object}   meta   - Any extra info (AST node type, operator, etc.)
   * @returns {object}  The new node
   */
  addNode(type, label, lines = [], meta = {}) {
    const id = this._nextId++;
    const node = { id, type, label, lines, meta, reachable: false };
    this.nodes.push(node);
    return node;
  }
 
  // ═══════════════════════════════════════════════════════════════
  //  EDGE  management
  // ═══════════════════════════════════════════════════════════════
 
  /**
   * Connect two nodes (directed edge).
   *
   * @param {number} from   - Source node id
   * @param {number} to     - Target node id
   * @param {string} label  - Edge label: "true" | "false" | "" | "fallthrough"
   */
  addEdge(from, to, label = "") {
    this.edges.push({ from, to, label });
  }
 
  // ═══════════════════════════════════════════════════════════════
  //  REACHABILITY  (DFS)
  // ═══════════════════════════════════════════════════════════════
 
  /**
   * Marks every node reachable from node-0 (the ENTRY node).
   * Call this AFTER building the full graph.
   */
  _markReachable() {
    // Reset
    this.nodes.forEach((n) => { n.reachable = false; });
 
    if (this.nodes.length === 0) return;
 
    const visited = new Set();
    const stack   = [0]; // entry node always has id=0
 
    while (stack.length > 0) {
      const current = stack.pop();
      if (visited.has(current)) continue;
      visited.add(current);
 
      const node = this.nodes.find((n) => n.id === current);
      if (node) node.reachable = true;
 
      // Push all successors
      this.edges
        .filter((e) => e.from === current)
        .forEach((e) => {
          if (!visited.has(e.to)) stack.push(e.to);
        });
    }
  }
 
  // ═══════════════════════════════════════════════════════════════
  //  DEAD CODE  elimination layer
  // ═══════════════════════════════════════════════════════════════
 
  /**
   * Returns nodes that are NOT reachable from the entry point.
   * These represent dead code — useful for plagiarism filtering
   * (dead code blocks should be down-weighted in similarity).
   *
   * @returns {{ deadNodes: object[], deadLines: Set<number> }}
   */
  findDeadCode() {
    this._markReachable();
 
    const deadNodes = this.nodes.filter((n) => !n.reachable);
    const deadLines = new Set();
    deadNodes.forEach((n) => n.lines.forEach((l) => deadLines.add(l)));
 
    // Mark dead nodes visually
    deadNodes.forEach((n) => { n.type = "dead"; });
 
    return { deadNodes, deadLines };
  }
 
  // ═══════════════════════════════════════════════════════════════
  //  HEATMAP  builder
  // ═══════════════════════════════════════════════════════════════
 
  /**
   * Builds lineHeatmap: each reachable line gets weight +1 per node that
   * covers it.  Dead-code lines get weight 0.
   * The frontend reads this to render the visual heatmap highlight.
   *
   * @returns {object}  { [lineNumber]: weight }
   */
  buildHeatmap() {
    this._markReachable();
    this.lineHeatmap = {};
 
    this.nodes.forEach((node) => {
      node.lines.forEach((line) => {
        if (node.reachable) {
          this.lineHeatmap[line] = (this.lineHeatmap[line] || 0) + 1;
        } else {
          // Only set 0 if not already touched by a reachable node
          if (this.lineHeatmap[line] === undefined) {
            this.lineHeatmap[line] = 0;
          }
        }
      });
    });
 
    return this.lineHeatmap;
  }
 
  // ═══════════════════════════════════════════════════════════════
  //  LINE  MAPPING  helpers
  // ═══════════════════════════════════════════════════════════════
 
  /**
   * Given a source-code line number, return the node(s) that contain it.
   * Frontend uses this to highlight the graph node when user clicks a line.
   *
   * @param {number} line
   * @returns {object[]}
   */
  getNodesByLine(line) {
    return this.nodes.filter((n) => n.lines.includes(line));
  }
 
  /**
   * Given a node id, return all source lines it covers.
   * @param {number} nodeId
   * @returns {number[]}
   */
  getLinesByNode(nodeId) {
    const node = this.nodes.find((n) => n.id === nodeId);
    return node ? node.lines : [];
  }
 
  // ═══════════════════════════════════════════════════════════════
  //  IR  (Intermediate Representation)  generation
  // ═══════════════════════════════════════════════════════════════
 
  /**
   * Generate a flat IR (3-address code style) from AST node.
   * IR is what the Tree Edit Distance / Similarity Engine consumes.
   *
   * Supported AST node types (extend as parser emits more):
   *   Assign, BinOp, UnaryOp, Call, If, While, For, Return,
   *   FunctionDef, ClassDef, Import
   *
   * @param {object} astNode   - One node from the AST
   * @param {number} line      - Source line
   * @returns {object}  IR instruction
   */
  emitIR(astNode, line = null) {
    const instr = { op: "NOP", args: [], result: null, line, astType: astNode?.type };
 
    if (!astNode) {
      this.irInstructions.push(instr);
      return instr;
    }
 
    switch (astNode.type) {
      case "Assign":
        instr.op     = "ASSIGN";
        instr.args   = [astNode.value];
        instr.result = astNode.target;
        break;
 
      case "AugAssign":   // e.g. x += 1
        instr.op     = "AUGASSIGN";
        instr.args   = [astNode.target, astNode.op, astNode.value];
        instr.result = astNode.target;
        break;
 
      case "BinOp":
        instr.op     = "BINOP";
        instr.args   = [astNode.left, astNode.op, astNode.right];
        instr.result = `t${this._nextId}`;
        break;
 
      case "UnaryOp":
        instr.op     = "UNARYOP";
        instr.args   = [astNode.op, astNode.operand];
        instr.result = `t${this._nextId}`;
        break;
 
      case "Call":
        instr.op     = "CALL";
        instr.args   = [astNode.func, ...(astNode.args || [])];
        instr.result = `t${this._nextId}`;
        break;
 
      case "If":
        instr.op   = "COND_JUMP";
        instr.args = [astNode.test, "true_branch", "false_branch"];
        break;
 
      case "While":
        instr.op   = "LOOP_WHILE";
        instr.args = [astNode.test];
        break;
 
      case "For":
        instr.op   = "LOOP_FOR";
        instr.args = [astNode.target, astNode.iter];
        break;
 
      case "Return":
        instr.op   = "RETURN";
        instr.args = [astNode.value];
        break;
 
      case "FunctionDef":
        instr.op     = "FUNC_DEF";
        instr.args   = astNode.args || [];
        instr.result = astNode.name;
        break;
 
      case "ClassDef":
        instr.op     = "CLASS_DEF";
        instr.result = astNode.name;
        break;
 
      case "Import":
        instr.op   = "IMPORT";
        instr.args = astNode.names || [];
        break;
 
      default:
        instr.op   = "STMT";
        instr.args = [JSON.stringify(astNode)];
    }
 
    this.irInstructions.push(instr);
    return instr;
  }
 
  /**
   * Emit IR for an entire AST (array of top-level nodes).
   * @param {object[]} astNodes
   */
  emitIRFromAST(astNodes = []) {
    astNodes.forEach((node) => {
      this.emitIR(node, node?.line ?? null);
    });
    return this.irInstructions;
  }
 
  // ═══════════════════════════════════════════════════════════════
  //  FULL  ANALYSIS  — convenience method
  // ═══════════════════════════════════════════════════════════════
 
  /**
   * Run all analyses in one shot.
   * Call AFTER building nodes & edges (and optionally emitting IR).
   *
   * @returns {object}  Complete analysis result for Report Generator + Frontend
   */
  analyze() {
    const { deadNodes, deadLines } = this.findDeadCode();
    const heatmap                   = this.buildHeatmap();
 
    return {
      // Graph
      nodes:        this.nodes,
      edges:        this.edges,
 
      // Dead code
      deadNodes,
      deadLines:    [...deadLines],
 
      // Reachable nodes only (for similarity engine)
      reachableNodes: this.nodes.filter((n) => n.reachable),
 
      // Heatmap  { lineNumber: weight }
      heatmap,
 
      // IR
      irInstructions: this.irInstructions,
 
      // Line mapping tables
      lineToNodes: this._buildLineToNodesMap(),
      nodeToLines: this._buildNodeToLinesMap(),
 
      // Summary
      summary: {
        totalNodes:     this.nodes.length,
        reachableCount: this.nodes.filter((n) => n.reachable).length,
        deadCount:      deadNodes.length,
        totalEdges:     this.edges.length,
        totalIR:        this.irInstructions.length,
      },
    };
  }
 
  // ─── Internal helpers ─────────────────────────────────────────────────────
 
  _buildLineToNodesMap() {
    const map = {};
    this.nodes.forEach((node) => {
      node.lines.forEach((line) => {
        if (!map[line]) map[line] = [];
        map[line].push(node.id);
      });
    });
    return map;
  }
 
  _buildNodeToLinesMap() {
    const map = {};
    this.nodes.forEach((node) => {
      map[node.id] = node.lines;
    });
    return map;
  }
 
  // ─── Debug dump ───────────────────────────────────────────────────────────
  dump() {
    console.log("\n═══ CFG Nodes ═══");
    this.nodes.forEach((n) => {
      const reach = n.reachable ? "✔" : "✘ DEAD";
      console.log(`  [${n.id}] ${n.type.padEnd(12)} "${n.label}"  lines=${JSON.stringify(n.lines)}  ${reach}`);
    });
    console.log("\n═══ CFG Edges ═══");
    this.edges.forEach((e) => {
      console.log(`  ${e.from} ──${e.label ? `[${e.label}]`:""}──▶ ${e.to}`);
    });
    console.log("\n═══ Heatmap ═══");
    Object.entries(this.lineHeatmap).forEach(([line, w]) => {
      const bar = "█".repeat(w);
      console.log(`  L${String(line).padStart(4)}  ${bar} (${w})`);
    });
  }
}
 
module.exports = { CFGGenerator };
 