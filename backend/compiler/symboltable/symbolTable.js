 // ============================================================
//  Symbol Table — Compiler-Based Structural Plagiarism Detector
//  Member 4: CFG + IR + Symbol Table
// ============================================================
 
class SymbolTable {
  constructor(parentScope = null) {
    this.parentScope = parentScope;   // For nested scopes (functions, loops)
    this.symbols     = new Map();
    this.scopeName   = parentScope ? "local" : "global";
 
    // ── Pre-load built-in identifiers ──────────────────────────────────────
    // These must NEVER be flagged as plagiarism — they belong to the language.
    if (!parentScope) {
      this._loadBuiltins();
    }
  }
 
  // ─── Built-in registry ────────────────────────────────────────────────────
  _loadBuiltins() {
    const PYTHON_BUILTINS = [
      // I/O
      "print", "input",
      // Type conversions
      "int", "float", "str", "bool", "bytes", "bytearray",
      "list", "tuple", "set", "dict", "frozenset",
      "complex",
      // Sequence helpers
      "len", "range", "enumerate", "zip", "map", "filter",
      "reversed", "sorted",
      // Math
      "abs", "round", "min", "max", "sum", "pow", "divmod",
      // Object introspection
      "type", "isinstance", "issubclass", "id", "hash",
      "dir", "vars", "repr", "callable", "hasattr",
      "getattr", "setattr", "delattr",
      // Iteration / functional
      "iter", "next", "any", "all",
      // I/O / system
      "open", "exec", "eval", "compile",
      "globals", "locals", "staticmethod", "classmethod",
      "property", "super",
      // Misc
      "object", "chr", "ord", "hex", "oct", "bin",
      "format", "slice", "memoryview",
      "NotImplemented", "Ellipsis",
      // Exceptions
      "Exception", "ValueError", "TypeError", "KeyError",
      "IndexError", "AttributeError", "RuntimeError",
      "StopIteration", "NameError", "OSError", "IOError",
      "FileNotFoundError", "ZeroDivisionError",
      // Constants
      "True", "False", "None",
    ];
 
    PYTHON_BUILTINS.forEach((name) => {
      this.symbols.set(name, {
        name,
        type:       "builtin",
        isBuiltIn:  true,       // ← Key flag: exclude from plagiarism check
        usedCount:  0,
        definedAt:  null,
        usedAt:     [],
      });
    });
  }
 
  // ─── Add / declare a symbol ───────────────────────────────────────────────
  /**
   * @param {string} name        - Identifier name
   * @param {string} type        - "variable" | "function" | "class" | "parameter"
   * @param {number} line        - Source line where it's declared
   * @param {*}      value       - Initial value (optional)
   */
  declare(name, type = "variable", line = null, value = undefined) {
    if (this.symbols.has(name)) {
      const existing = this.symbols.get(name);
      // Allow re-declaration (Python allows it) but record it
      existing.redeclaredAt = existing.redeclaredAt || [];
      existing.redeclaredAt.push(line);
      return existing;
    }
 
    const entry = {
      name,
      type,
      isBuiltIn:    false,
      usedCount:    0,
      definedAt:    line,
      usedAt:       [],
      value:        value !== undefined ? value : null,
      redeclaredAt: [],
    };
 
    this.symbols.set(name, entry);
    return entry;
  }
 
  // ─── Record a usage ───────────────────────────────────────────────────────
  /**
   * Call this every time an identifier is READ (not assigned).
   * @param {string} name
   * @param {number} line
   */
  use(name, line = null) {
    // Walk up scopes
    let scope = this;
    while (scope) {
      if (scope.symbols.has(name)) {
        const entry = scope.symbols.get(name);
        entry.usedCount += 1;
        if (line !== null) entry.usedAt.push(line);
        return entry;
      }
      scope = scope.parentScope;
    }
    // Symbol not found — undeclared reference (could be a bug in source code)
    return null;
  }
 
  // ─── Lookup (read-only) ───────────────────────────────────────────────────
  lookup(name) {
    let scope = this;
    while (scope) {
      if (scope.symbols.has(name)) return scope.symbols.get(name);
      scope = scope.parentScope;
    }
    return null;
  }
 
  // ─── Dead-Code Detection ─────────────────────────────────────────────────
  /**
   * Returns symbols that were declared but NEVER used.
   * Built-ins are excluded automatically (usedCount stays 0 but isBuiltIn=true).
   */
  getDeadSymbols() {
    const dead = [];
    this.symbols.forEach((entry) => {
      if (!entry.isBuiltIn && entry.usedCount === 0) {
        dead.push(entry);
      }
    });
    return dead;
  }
 
  // ─── Plagiarism-Safe Export ───────────────────────────────────────────────
  /**
   * Returns only USER-DEFINED symbols — built-ins stripped out.
   * This is what the Similarity Engine should compare.
   */
  getUserSymbols() {
    const result = [];
    this.symbols.forEach((entry) => {
      if (!entry.isBuiltIn) result.push(entry);
    });
    return result;
  }
 
  // ─── Create child scope (for functions, loops, classes) ──────────────────
  createChildScope() {
    return new SymbolTable(this);
  }
 
  // ─── Serialise for IR / Report ───────────────────────────────────────────
  toJSON() {
    const out = {};
    this.symbols.forEach((v, k) => { out[k] = v; });
    return out;
  }
 
  // ─── Pretty-print (debug) ─────────────────────────────────────────────────
  dump() {
    console.log(`\n═══ Symbol Table [${this.scopeName}] ═══`);
    this.symbols.forEach((entry, name) => {
      if (entry.isBuiltIn) return; // skip noise
      console.log(
        `  ${name.padEnd(20)} type=${entry.type.padEnd(12)} ` +
        `defined@L${String(entry.definedAt).padEnd(5)} ` +
        `usedCount=${entry.usedCount}  ` +
        (entry.usedCount === 0 ? "⚠ DEAD CODE" : "")
      );
    });
  }
}
 
module.exports = { SymbolTable };
 