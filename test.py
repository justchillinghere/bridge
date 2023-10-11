def get_sum_of_two_elems(arr):
    return {
        "begin": arr[0] + arr[1],
        "end": arr[-1] + arr[-2],
        "left_right": arr[0] + arr[-1]
    }

def find_min_operations(q, s):
	
	result = 0
	# For array with 1 el
	if len(s) == 1:
		if s[0] == q:
			return 1
		else:
			return -1
	# For array with 2 elements
	if s[0] == q or s[-1] == q:
		return 1
	
	# For array with more than 2 elements
	sums = get_sum_of_two_elems(s);
	# Check if answer is within any of the first sums
	if q in sums.values():
		return 2
	# If all sums are bigger than q, then there is no answer !!!!
	elif all(q < i for i in sums.values()):
		return -1
	else:
		result += 2
		sums = {key: value for key, value in sums.items() if value < q}
		max_key = max(sums, key=sums.get)
		if max_key == "begin":
			q -= sums["begin"]
			s = s[2::]
		elif max_key == "end":
			q -= sums["end"]
			s = s[:-2]
		else:
			q -= sums["left_right"]
			s = s[1:-1]
	if q != 0:
		new_res = find_min_operations(q, s)
		if new_res == -1:
			return -1
		else:
			result += new_res
	return result


def new_find_min_operations(Q, arr):
    n = len(arr)
    dp = [[-1] * (Q + 1) for _ in range(n + 1)]
    dp[0][0] = 0

    for i in range(1, n + 1):
        for j in range(Q + 1):
            dp[i][j] = dp[i - 1][j]
            if j >= arr[i - 1] and dp[i - 1][j - arr[i - 1]] != -1:
                dp[i][j] = dp[i - 1][j - arr[i - 1]] + 1

    return dp[n][Q] if dp[n][Q] != -1 else -1

scores = [1,2,3,4,3,1,1,2,3,4]

n = len(scores)

for Q in range(0, 15):
	print(f"For Q = {Q}, minimum students required: {new_find_min_operations(Q, scores)}")


