//  Control Flow Graph Generator
class CFGGenerator {
    constructor() {
        this.nodes = []; // Code blocks
        this.edges = []; // Logical connections
    }
    //  (node) add 
    addNode(id, type, label) {
        this.nodes.push({ id, type, label });
    }
    //  to connect two blocks (if/else transitions)
    addEdge(from, to) {
        this.edges.push({ from, to });
    }
}
module.exports = CFGGenerator;