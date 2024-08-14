import pandas as pd

def pivot_high(highs, left_bars=2, right_bars=2):
    pivot_highs = []
    for i in range(len(highs)):
        if i >= left_bars and i < len(highs) - right_bars:
            is_pivot = True
            current_high = highs[i]
            
            # Check left bars
            for j in range(1, left_bars + 1):
                if highs[i - j] >= current_high:
                    is_pivot = False
                    break
            
            # Check right bars
            for j in range(1, right_bars + 1):
                if highs[i + j] >= current_high:
                    is_pivot = False
                    break
            
            pivot_highs.append(is_pivot)
        else:
            pivot_highs.append(False)
    
    return pivot_highs



# # Example usage
# data = {
#     'high': [10, 12, 14, 16, 15, 13, 11, 17, 18, 16, 14, 12]
# }

# df = pd.DataFrame(data)
# df['pivot_high'] = pivot_high(data['high'], left_bars=2, right_bars=2)

# print(df)



def find_key_points(highs, lows):
    def find_extrema(data):
        """
        Find local maxima and minima in a list.
        """
        extrema = []
        length = len(data)
        
        for i in range(1, length - 1):
            if data[i - 1] < data[i] > data[i + 1]:
                extrema.append((i, 'HH'))
            elif data[i - 1] > data[i] < data[i + 1]:
                extrema.append((i, 'LL'))
        
        return extrema

    # Combine highs and lows into a single list
    combined = []
    for h, l in zip(highs, lows):
        combined.append(h)
        combined.append(l)
    
    # Find extrema for highs and lows separately
    high_extrema = find_extrema(highs)
    low_extrema = find_extrema(lows)
    
    # Create a result list initialized with empty strings
    result = [''] * len(combined)
    
    # Assign 'HH' or 'LL' to the corresponding positions in the result list
    for idx, ext_type in high_extrema + low_extrema:
        result[idx * 2] = ext_type  # Multiply by 2 because combined list has double the length

    # Determine 'LH' and 'HL'
    for i in range(1, len(result)):
        if result[i] == '':
            if result[i - 1] == 'HH' and (i < len(result) - 1 and result[i + 1] == 'LL'):
                result[i] = 'LH'
            elif result[i - 1] == 'LL' and (i < len(result) - 1 and result[i + 1] == 'HH'):
                result[i] = 'HL'
    
    return result

# Example usage
# highs = [10, 12, 14, 16, 15, 13, 11, 17, 18, 16, 14, 12]
# lows = [8, 7, 6, 8, 9, 10, 8, 9, 7, 6, 7, 8]

# key_points = find_key_points(highs, lows)
# print(key_points)

