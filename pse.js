/**
 * Previous Smaller Element — for each index i, index of largest j<i with arr[j] < arr[i], or -1.
 * @param {number[]} arr
 * @returns {number[]}
 */
export function findPSE(arr) {
  const stack = [];
  const ans = Array(arr.length).fill(-1);
  for (let i = 0; i < arr.length; i++) {
    while (stack.length && arr[stack[stack.length - 1]] > arr[i]) stack.pop();
    if (stack.length) ans[i] = stack[stack.length - 1];
    stack.push(i);
  }
  return ans;
}
