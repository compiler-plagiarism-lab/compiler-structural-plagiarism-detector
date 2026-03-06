import ast

class StructuralNodeVisitor(ast.NodeVisitor):
    def __init__(self):
        self.node_types = []
        # We can optionally ignore extremely common/noisy nodes that don't add 
        # much structural meaning on their own. For example, 'Load' and 'Store' 
        # are context on variables, which can muddy the k-grams slightly.
        self.ignore_nodes = {'Load', 'Store', 'Del'}

    def generic_visit(self, node):
        node_name = type(node).__name__
        if node_name not in self.ignore_nodes:
            self.node_types.append(node_name)
        super().generic_visit(node)

def parse_and_tokenize(file_path: str) -> list[str]:
    """
    Reads a Python source file, parses it into an AST, and extracts
    the sequence of structural node types.
    
    This abstracts away identifiers (e.g., variable names), literals,
    comments, and whitespace, focusing only on the code's grammatical structure.
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        source_code = f.read()
    
    # ast.parse performs both lexical scanning and syntax parsing
    # creating an Abstract Syntax Tree (AST).
    tree = ast.parse(source_code)
    
    visitor = StructuralNodeVisitor()
    visitor.visit(tree)
    
    return visitor.node_types
