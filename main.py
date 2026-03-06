import os
import argparse
from ast_parser import parse_and_tokenize
from winnowing import get_fingerprint
from similarity import jaccard_similarity

def main():
    # Setup CLI argument parsing
    parser = argparse.ArgumentParser(description="Structural Code Plagiarism Checker (Compiler Design based)")
    parser.add_argument('directory', type=str, help="Directory containing .py files to check")
    parser.add_argument('--kgram', type=int, default=5, help="Size of the k-gram (default: 5)")
    parser.add_argument('--window', type=int, default=4, help="Window size for winnowing (default: 4)")
    parser.add_argument('--threshold', type=float, default=70.0, help="Reporting threshold percentage (default: 70.0)")
    
    args = parser.parse_args()
    dir_path = args.directory
    
    if not os.path.exists(dir_path) or not os.path.isdir(dir_path):
        print(f"Error: '{dir_path}' is not a valid directory.")
        return
        
    # Read and sort all python files in the directory
    files = [f for f in os.listdir(dir_path) if f.endswith('.py')]
    files.sort()
    
    if len(files) < 2:
        print("Need at least 2 .py files in the directory to compare.")
        return
        
    print(f"==================================================")
    print(f"STRUCTURAL PLAGIARISM CHECKER (Compiler Driven)")
    print(f"==================================================")
    print(f"Found {len(files)} Python files in '{dir_path}'. Analyzing...\n")
    
    # 1. Parse and generate fingerprints for all files
    fingerprints = {}
    tokens_count = {}
    for file in files:
        full_path = os.path.join(dir_path, file)
        try:
            tokens = parse_and_tokenize(full_path)
            fp = get_fingerprint(tokens, k=args.kgram, window_size=args.window)
            fingerprints[file] = fp
            tokens_count[file] = len(tokens)
        except Exception as e:
            print(f"Warning: Failed to parse {file}. Error: {e}")
            
    # 2. Compare pairs using Jaccard Similarity
    print(f"{'File 1':<22} | {'File 2':<22} | {'Similarity (%)':<15}")
    print("-" * 65)
    
    found_matches = False
    
    for i in range(len(files)):
        for j in range(i + 1, len(files)):
            f1 = files[i]
            f2 = files[j]
            
            if f1 not in fingerprints or f2 not in fingerprints:
                continue
                
            sim = jaccard_similarity(fingerprints[f1], fingerprints[f2])
            
            # Formatted output
            if sim >= args.threshold:
                print(f"{f1:<22} | {f2:<22} | {sim:>8.2f}%  [MATCH]")
                found_matches = True
            else:
                print(f"{f1:<22} | {f2:<22} | {sim:>8.2f}%")
                
    if not found_matches:
        print("-" * 65)
        print(f"No files matched above the {args.threshold}% threshold.")
        
    print(f"\n[Done] Processed {len(files)} files.")

if __name__ == "__main__":
    main()
