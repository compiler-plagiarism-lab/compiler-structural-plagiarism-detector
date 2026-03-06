import hashlib

def generate_kgrams(tokens: list[str], k: int) -> list[str]:
    """
    Groups a sequence of structural tokens into overlapping k-grams.
    If k=5, it concatenates 5 consecutive tokens into a single string.
    """
    kgrams = []
    for i in range(len(tokens) - k + 1):
        # Join tokens with a separator to avoid ambiguous merging
        # e.g., 'If', 'For' -> 'If-For'
        kgrams.append("-".join(tokens[i:i+k]))
    return kgrams

def hash_kgram(kgram: str) -> int:
    """
    Generates a numerical hash for a given k-gram string.
    We use SHA-256 for uniform hashing, then convert the 
    first 8 bytes (16 hex chars) of the digest into an integer to 
    simulate intermediate representation fingerprinting.
    """
    hash_obj = hashlib.sha256(kgram.encode('utf-8'))
    return int(hash_obj.hexdigest()[:16], 16)

def winnowing(hashes: list[int], window_size: int) -> set:
    """
    Applies the Winnowing algorithm to select a subset of hashes
    (the 'fingerprint') that represents the document compactly.
    """
    fingerprints = set()
    for i in range(len(hashes) - window_size + 1):
        # Define the sliding window bounds
        window = hashes[i:i+window_size]
        # Select the minimum hash value within this window
        min_hash = min(window)
        fingerprints.add(min_hash)
        
    return fingerprints

def get_fingerprint(tokens: list[str], k: int = 5, window_size: int = 4) -> set[int]:
    """
    Returns the final structural fingerprint for a sequence of tokens.
    """
    if not tokens:
        return set()
        
    # Phase 1: Generate overlapping k-grams
    kgrams = generate_kgrams(tokens, k)
    
    # Phase 2: Hash each k-gram
    hashes = [hash_kgram(kg) for kg in kgrams]
    
    # If the file is extremely small, return all hashes directly
    if len(hashes) < window_size:
        return set(hashes)
        
    # Phase 3: Perform winnowing for subset selection
    return winnowing(hashes, window_size)
