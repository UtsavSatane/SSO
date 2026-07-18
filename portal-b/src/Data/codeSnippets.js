const codeSnippets = [
  "const sum = (a, b) => a + b;",
  "function reverse(str) { return str.split('').reverse().join(''); }",
  "const isEven = (n) => n % 2 === 0;",
  "const factorial = (n) => n <= 1 ? 1 : n * factorial(n - 1);",
  "const unique = (arr) => [...new Set(arr)];",
  "const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);",
  "const flatten = (arr) => arr.reduce((a, b) => a.concat(b), []);",
  "const debounce = (fn, delay) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); }; };",
]

export default codeSnippets