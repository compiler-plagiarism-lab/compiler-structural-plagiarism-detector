// Symbol Table for tracking variables
class SymbolTable {
    constructor() {
        this.table = {};
    }
    //  when new variable get declare 
    insert(name, type, scope) {
        this.table[name] = { type, scope };
    }
}
module.exports = SymbolTable;