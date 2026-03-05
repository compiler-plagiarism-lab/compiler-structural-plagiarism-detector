/**
 *  Intermediate Representation (IR) Generator
 * Converts source code into Three-Address Code (TAC) for easier comparison.
 */

class IRGenerator {
    constructor() {
        this.instructions = [];
        this.tempCount = 0;
    }
    newTemp() {
        return `t${++this.tempCount}`;
    }
    emit(op, arg1, arg2, result) {
        this.instructions.push({ op, arg1, arg2, result });
        console.log(`[IR] ${result} = ${arg1} ${op} ${arg2}`);
    }

    getIR() {
        return this.instructions;
    }
}

module.exports = IRGenerator;