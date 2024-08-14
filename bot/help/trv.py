import pandas as pd



def pivot_high(highs, left_bars=2, right_bars=2):
    """
    Identifies pivot highs in a list or pandas Series of high prices.
    
    Parameters:
    highs (list or pd.Series): List or pandas Series containing high prices.
    left_bars (int): Number of bars to the left to consider for finding a pivot high.
    right_bars (int): Number of bars to the right to consider for finding a pivot high.
    
    Returns:
    list: A list where "LH" indicates a pivot high.
    """
    if isinstance(highs, list):
        highs = pd.Series(highs)
    
    pivot_highs = [""] * len(highs)  # Initialize the list with empty strings

    for i in range(left_bars, len(highs) - right_bars):
        current_high = highs[i]
        is_pivot = True
        
        # Check left bars
        if any(highs[i - j] >= current_high for j in range(1, left_bars + 1)):
            is_pivot = False
        
        # Check right bars
        if any(highs[i + j] >= current_high for j in range(1, right_bars + 1)):
            is_pivot = False
        
        if is_pivot:
            pivot_highs[i] = "LH"  # Mark as pivot high
    
    return pivot_highs

# Example usage
# highs = [10, 12, 14, 16, 15, 13, 11, 17, 18, 16, 14, 12]
# pivot_highs = pivot_high(highs, left_bars=2, right_bars=2)
# print(pivot_highs)





def pivot_low(lows, left_bars=2, right_bars=2):
    """
    Identifies pivot lows in a list or pandas Series of low prices.
    
    Parameters:
    lows (list or pd.Series): List or pandas Series containing low prices.
    left_bars (int): Number of bars to the left to consider for finding a pivot low.
    right_bars (int): Number of bars to the right to consider for finding a pivot low.
    
    Returns:
    list: A list where "LL" indicates a pivot low.
    """
    if isinstance(lows, list):
        lows = pd.Series(lows)
    
    pivot_lows = [""] * len(lows)  # Initialize the list with empty strings

    for i in range(left_bars, len(lows) - right_bars):
        current_low = lows[i]
        is_pivot = True
        
        # Check left bars
        if any(lows[i - j] <= current_low for j in range(1, left_bars + 1)):
            is_pivot = False
        
        # Check right bars
        if any(lows[i + j] <= current_low for j in range(1, right_bars + 1)):
            is_pivot = False
        
        if is_pivot:
            pivot_lows[i] = "LL"  # Mark as pivot low
    
    return pivot_lows

# Example usage
# lows = [10, 12, 14, 13, 12, 11, 10, 11, 12, 14, 13, 12]
# pivot_lows = pivot_low(lows, left_bars=2, right_bars=2)
# print(pivot_lows)









def identify_key_points(highs, lows, left_bars=2, right_bars=2):
    def is_local_maxima(data, index):
        if index < left_bars or index >= len(data) - right_bars:
            return False
        for i in range(1, left_bars + 1):
            if data[index] <= data[index - i]:
                return False
        for i in range(1, right_bars + 1):
            if data[index] <= data[index + i]:
                return False
        return True

    def is_local_minima(data, index):
        if index < left_bars or index >= len(data) - right_bars:
            return False
        for i in range(1, left_bars + 1):
            if data[index] >= data[index - i]:
                return False
        for i in range(1, right_bars + 1):
            if data[index] >= data[index + i]:
                return False
        return True

    # Initialize the key points list
    key_points = [''] * len(highs)

    # Identify HH and LL
    for i in range(len(highs)):
        if is_local_maxima(highs, i):
            key_points[i] = 'HH'
        elif is_local_minima(lows, i):
            key_points[i] = 'LL'

    # Recheck and classify LH and HL
    for i in range(len(highs)):
        if key_points[i] == 'HH':
            a = highs[i]
            b = highs[i - 2] if i - 2 >= 0 else None
            c = highs[i - 1] if i - 1 >= 0 else None
            d = highs[i + 1] if i + 1 < len(highs) else None
            e = highs[i + 2] if i + 2 < len(highs) else None
            if b is not None and c is not None and d is not None and e is not None:
                if a < b and a > c and b > d and d > e:
                    key_points[i] = 'HL'
        elif key_points[i] == 'LL':
            a = lows[i]
            b = lows[i - 2] if i - 2 >= 0 else None
            c = lows[i - 1] if i - 1 >= 0 else None
            d = lows[i + 1] if i + 1 < len(lows) else None
            e = lows[i + 2] if i + 2 < len(lows) else None
            if b is not None and c is not None and d is not None and e is not None:
                if a > b and a < c and b < d and d < e:
                    key_points[i] = 'LH'

    return key_points

# Example usage
highs = [10, 12, 14, 16, 15, 13, 11, 17, 18, 16, 14, 12]
lows = [8, 7, 6, 8, 9, 10, 8, 9, 7, 6, 7, 8]
left_bars = 2
right_bars = 2

key_points = identify_key_points(highs, lows, left_bars, right_bars)
print(key_points)
