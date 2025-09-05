# Testing Guide

This project includes comprehensive tests to ensure the photo rename script works correctly.

## Running Tests

```bash
# Install dependencies (if not already done)
npm install

# Run all tests
npm test

# Run tests in watch mode (reruns when files change)
npm run test:watch
```

## What's Tested

The test suite covers all the major functionality:

### 1. **Starting Index Options**
- **Default behavior**: Files start with `_01`, `_02`, etc.
- **"0" option**: First file gets `_0`, then `_01`, `_02`, etc.
- **"00" option**: First file gets `__00`, second gets `_0`, then `_01`, `_02`, etc.

### 2. **Skip Numbers Functionality**
- Tests that specified numbers are skipped in the sequence
- Tests multiple consecutive skip numbers
- Tests skip numbers with different starting options

### 3. **Alphabetical Ordering**
- Verifies files are processed in alphabetical order by filename
- Tests case-insensitive sorting
- Tests numeric filename sorting (string-based, not numeric)

### 4. **File Copying (Not Moving)**
- Confirms original files remain untouched
- Verifies copied files have correct content
- Tests creation of "Renamed" subdirectory

### 5. **Edge Cases**
- Empty directories
- Hidden files (should be ignored)
- Non-existent directories
- File paths instead of directories
- Existing "Renamed" directories

### 6. **Directory Name Usage**
- Tests that the directory name is used as the prefix for renamed files

## Test Structure

The tests use temporary directories for each test case to avoid conflicts and ensure clean test runs. Each test:

1. Creates a temporary test directory
2. Creates test files with known content
3. Runs the rename function
4. Verifies the results
5. Cleans up the temporary directory

## Example Test Output

When you run `npm test`, you'll see output like:

```
PASS  ./rename-files.test.js
Photo Rename Script
  Default starting index behavior
    ✓ should rename files starting from 01 with default options
    ✓ should handle mixed file extensions correctly
  Starting with "0" option
    ✓ should start with "0" then continue with padded numbers
    ✓ should handle skip numbers with "0" starting option
  ... (and so on)

Test Suites: 1 passed, 1 total
Tests:       22 passed, 22 total
```

All tests should pass, confirming that the script works as expected.
