//  Control Flow Graph Generator
// Control Flow Graph (CFG) Generator

// Control Flow Graph Generator

// Control Flow Graph Generator

class CFGGenerator {

    constructor() {
        // stores program blocks (nodes)
        this.nodes = [];

        // stores execution flow connections (edges)
        this.edges = [];
    }

    // add a new node (statement/block)
    addNode(id, type, label) {
        this.nodes.push({
            id: id,
            type: type,
            label: label
        });
    }

    // connect execution flow between nodes
    addEdge(from, to) {
        this.edges.push({
            from: from,
            to: to
        });
    }

    // find unreachable nodes using DFS traversal
    // entryId = starting node of program (default = 1)
    findUnreachableNodes(entryId = 1) {

        const visited = new Set();

        // build adjacency list
        const graph = {};

        this.edges.forEach(edge => {
            if (!graph[edge.from]) {
                graph[edge.from] = [];
            }
            graph[edge.from].push(edge.to);
        });

        // DFS traversal
        const dfs = (node) => {
            if (visited.has(node)) return;

            visited.add(node);

            const neighbors = graph[node] || [];
            neighbors.forEach(next => dfs(next));
        };

        // start traversal from entry node
        dfs(entryId);

        // nodes not visited = unreachable (dead code)
        const unreachable = this.nodes.filter(node =>
            !visited.has(node.id)
        );

        return unreachable;
    }

    // return complete CFG structure
    getCFG() {
        return {
            nodes: this.nodes,
            edges: this.edges
        };
    }
}

// export module
module.exports = CFGGenerator;