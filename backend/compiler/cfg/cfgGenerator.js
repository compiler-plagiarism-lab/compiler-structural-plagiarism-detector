//  Control Flow Graph Generator
// Control Flow Graph (CFG) Generator

class CFGGenerator {

    constructor() {
        // stores program blocks
        this.nodes = [];

        // stores flow connections
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

    // find unreachable nodes (dead code detection)
    findUnreachableNodes() {

        const reachable = new Set();

        // mark all connected nodes
        this.edges.forEach(edge => {
            reachable.add(edge.from);
            reachable.add(edge.to);
        });

        // nodes not connected anywhere = unreachable
        const unreachable = this.nodes.filter(node =>
            !reachable.has(node.id)
        );

        return unreachable;
    }

    // return full CFG structure
    getCFG() {
        return {
            nodes: this.nodes,
            edges: this.edges
        };
    }
}

// export module
module.exports = CFGGenerator;