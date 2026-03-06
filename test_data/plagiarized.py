# This is a comment that the cheater added to bypass basic text checkers.
def get_fact(num):
    # Notice how variable names are changed and spacing is different!
    # A standard text checker might have a hard time if we add lots of arbitrary stuff.
    
    if num == 0:
        return 1
    
    ans = 1
    for x in range(1, num + 1):
        ans = ans * x
        
    return ans

# Calling the function with same parameters
print(get_fact(5))
