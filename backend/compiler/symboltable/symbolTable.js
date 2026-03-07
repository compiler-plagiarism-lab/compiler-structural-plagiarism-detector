class SymbolTable {
    constructor() {
        this.table = {};
        const keywords = ['print', 'len', 'input', 'range'];
        keywords.forEach(word => {
            this.insert(word, 'built-in function', 'global', true);
        });
    }
    insert(name, type, scope, isBuiltIn = false) {
        this.table[name] = { 
            type: type, 
            scope: scope, 
            isBuiltIn: isBuiltIn, 
            usedCount: 0  // for  Dead code tracking
        };
    }

     // when variable is in code then increase count
    updateUsage(name) {
        if (this.table[name]) {
            this.table[name].usedCount++;
        }
    }
}
//server.js  export
module.exports = SymbolTable;