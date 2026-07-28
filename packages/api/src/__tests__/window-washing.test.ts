import { runMockWindowWashingTests } from "../window-washing";

const results = runMockWindowWashingTests();
console.log("=== Window Washing Pricing Engine Mock Test Results ===");
let allPassed = true;

for (const r of results) {
  if (r.passed) {
    console.log(`✓ PASS: ${r.name}`);
  } else {
    console.error(`✗ FAIL: ${r.name}`);
    console.error("  Expected:", r.expected);
    console.error("  Actual:", r.result);
    allPassed = false;
  }
}

if (allPassed) {
  console.log("All mock test cases passed successfully!");
} else {
  process.exit(1);
}
