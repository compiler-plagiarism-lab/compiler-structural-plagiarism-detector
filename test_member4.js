const SymbolTable = require('./backend/compiler/symboltable/symbolTable');
const CFGGenerator = require('./backend/compiler/cfg/cfgGenerator'); 
const IRGenerator = require('./backend/compiler/ir/irGenerator');

console.log('\n=== KOMAL (MEMBER 4) LOGIC TEST ===');

try {
    const st = new SymbolTable();
    st.insert('userVar', 'int', 'global');
    console.log('✅ 1. Symbol Table Output:', st.table);

    const cfg = new CFGGenerator();
    cfg.addNode(1, 'entry', 'Main Start');
    console.log('✅ 2. CFG Nodes:', cfg.nodes);

    const ir = new IRGenerator();
    ir.emit('+', 'a', 'b', 't1');
    console.log('✅ 3. IR TAC Output:', ir.getIR());
} catch (err) {
    console.log("❌ Error: ", err.message);
}