def jaccard_similarity(set1: set, set2: set) -> float:
    """
    Calculates the Jaccard Similarity Index between two fingerprint sets.
    Return value is a percentage from 0.0 to 100.0.
    
    Formula: (Intersection Size / Union Size) * 100
    """
    if not set1 and not set2:
        return 100.0
    if not set1 or not set2:
        return 0.0
        
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    
    return (len(intersection) / len(union)) * 100.0
