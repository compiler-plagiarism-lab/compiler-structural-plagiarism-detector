"""
analyzer.py — The Upgraded Core Analysis Engine
================================================
This module consolidates all compiler-design phases into a single,
line-tracking pipeline used by the web application backend.

Compiler Phase Mapping:
  1. Lexical + Syntax Analysis  → parse_file_to_tokens()
  2. Intermediate Representation → generate_kgrams_with_lines()
  3. Symbol Hashing              → hash_kgram()
  4. Optimization / Compression  → winnow()
  5. Evaluation                  → compare_fingerprints()
"""

import ast
import hashlib
from dataclasses import dataclass, field


# ─────────────────────────────────────────────
#  Data Structures
# ─────────────────────────────────────────────

@dataclass
class StructuralToken:
    """A single AST node type together with its source location."""
    node_type: str
    lineno: int          # first line of this node in the source file
    end_lineno: int      # last line of this node in the source file


@dataclass
class KGramRecord:
    """A k-gram string, its hash, and the source-line span it covers."""
    text: str
    hash_value: int
    start_line: int
    end_line: int


@dataclass
class ComparisonResult:
    """Full comparison output between two files."""
    file_a: str
    file_b: str
    similarity: float                     # 0-100
    matched_lines_a: list[tuple[int, int]] = field(default_factory=list)
    matched_lines_b: list[tuple[int, int]] = field(default_factory=list)


# ─────────────────────────────────────────────
#  Phase 1 — Lexical & Syntax Analysis (AST)
# ─────────────────────────────────────────────

# Context-only nodes that add noise but no structural meaning
_IGNORE_NODES = {"Load", "Store", "Del"}


class _LineTrackingVisitor(ast.NodeVisitor):
    """Walks the AST and collects StructuralTokens with line info."""

    def __init__(self):
        self.tokens: list[StructuralToken] = []

    def generic_visit(self, node: ast.AST):
        name = type(node).__name__
        if name not in _IGNORE_NODES and hasattr(node, "lineno"):
            self.tokens.append(
                StructuralToken(
                    node_type=name,
                    lineno=getattr(node, "lineno", 0),
                    end_lineno=getattr(node, "end_lineno", 0) or getattr(node, "lineno", 0),
                )
            )
        super().generic_visit(node)


def parse_file_to_tokens(source_code: str) -> list[StructuralToken]:
    """
    Parse a Python source string into a list of StructuralTokens.
    Comments, whitespace, and identifiers are discarded — only
    structural grammar nodes survive (FunctionDef, If, For, …).
    """
    tree = ast.parse(source_code)
    visitor = _LineTrackingVisitor()
    visitor.visit(tree)
    return visitor.tokens


# ─────────────────────────────────────────────
#  Phase 2 — Intermediate Representation (K-Grams)
# ─────────────────────────────────────────────

def hash_kgram(text: str) -> int:
    """SHA-256 hash truncated to 64 bits for compact fingerprinting."""
    return int(hashlib.sha256(text.encode()).hexdigest()[:16], 16)


def generate_kgrams(tokens: list[StructuralToken], k: int = 5) -> list[KGramRecord]:
    """
    Build overlapping k-grams from the token sequence, keeping track
    of the source-line span each k-gram covers.
    """
    records: list[KGramRecord] = []
    for i in range(len(tokens) - k + 1):
        window = tokens[i : i + k]
        text = "-".join(t.node_type for t in window)
        records.append(
            KGramRecord(
                text=text,
                hash_value=hash_kgram(text),
                start_line=window[0].lineno,
                end_line=window[-1].end_lineno,
            )
        )
    return records


# ─────────────────────────────────────────────
#  Phase 3 — Optimization (Winnowing)
# ─────────────────────────────────────────────

def winnow(kgrams: list[KGramRecord], window_size: int = 4) -> dict[int, list[tuple[int, int]]]:
    """
    Winnowing algorithm: slides a window across the k-gram hashes and
    selects the minimum hash in each window.

    Returns a dict mapping each selected hash → list of (start_line, end_line)
    spans that contributed to it.  This is the file's *fingerprint*.
    """
    if not kgrams:
        return {}

    hashes = [kg.hash_value for kg in kgrams]
    fingerprint: dict[int, list[tuple[int, int]]] = {}

    if len(hashes) < window_size:
        for kg in kgrams:
            fingerprint.setdefault(kg.hash_value, []).append((kg.start_line, kg.end_line))
        return fingerprint

    for i in range(len(hashes) - window_size + 1):
        window = hashes[i : i + window_size]
        min_idx = i + window.index(min(window))
        kg = kgrams[min_idx]
        fingerprint.setdefault(kg.hash_value, []).append((kg.start_line, kg.end_line))

    return fingerprint


# ─────────────────────────────────────────────
#  Phase 4 — Evaluation (Jaccard + Line Mapping)
# ─────────────────────────────────────────────

def compare_fingerprints(
    fp_a: dict[int, list[tuple[int, int]]],
    fp_b: dict[int, list[tuple[int, int]]],
    file_a: str = "",
    file_b: str = "",
) -> ComparisonResult:
    """
    Compute Jaccard similarity and extract the overlapping line ranges
    from both files so the frontend can highlight matched blocks.
    """
    set_a = set(fp_a.keys())
    set_b = set(fp_b.keys())

    if not set_a and not set_b:
        return ComparisonResult(file_a=file_a, file_b=file_b, similarity=100.0)
    if not set_a or not set_b:
        return ComparisonResult(file_a=file_a, file_b=file_b, similarity=0.0)

    intersection = set_a & set_b
    union = set_a | set_b
    similarity = (len(intersection) / len(union)) * 100.0

    # Collect matched line ranges
    matched_a: list[tuple[int, int]] = []
    matched_b: list[tuple[int, int]] = []
    for h in intersection:
        matched_a.extend(fp_a[h])
        matched_b.extend(fp_b[h])

    # De-duplicate and sort
    matched_a = sorted(set(matched_a))
    matched_b = sorted(set(matched_b))

    return ComparisonResult(
        file_a=file_a,
        file_b=file_b,
        similarity=round(similarity, 2),
        matched_lines_a=matched_a,
        matched_lines_b=matched_b,
    )


# ─────────────────────────────────────────────
#  Convenience — Full pipeline for a single file
# ─────────────────────────────────────────────

def fingerprint_source(source_code: str, k: int = 5, window_size: int = 4):
    """
    End-to-end: source code string → fingerprint dict.
    Returns (fingerprint_dict, token_count).
    """
    tokens = parse_file_to_tokens(source_code)
    kgrams = generate_kgrams(tokens, k)
    fp = winnow(kgrams, window_size)
    return fp, len(tokens)
