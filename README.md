# Photo Rename Script

A Node.js script to rename files in a directory based on alphabetical order. Files are renamed in place to follow the pattern `{directory_name}_NN{suffix}.{extension}` where NN is a zero-padded index starting from 01, while original files are moved to a 'lab scans' subdirectory for safekeeping.

## Features

- Sorts files alphabetically by filename
- Renames files in place to `{directory_name}_01`, `{directory_name}_02`, etc.
- Moves original files to a 'lab scans' subdirectory (preserves originals as backup)
- Optional starting index patterns: "x", "0" or "_00"
- Skip specific numbers in the sequence
- Optional letter suffix after numbers (e.g., A, B, C)
- Preserves original file extensions
- Skips hidden files (files starting with `.`)
- Provides detailed logging of the renaming process
- Handles errors gracefully

## Usage

### Basic Usage

Rename files in the current directory:
```bash
node rename-files.js
```

### Specify a Directory

Rename files in a specific directory:
```bash
node rename-files.js /path/to/your/directory
```

### Advanced Usage

```bash
# Basic with starting index
node rename-files.js /path/to/directory "0"

# With skip numbers
node rename-files.js /path/to/directory "0" "2,4"

# With letter suffix
node rename-files.js /path/to/directory "0" "2,4" "A"
```

#### Arguments:
1. **Directory path** (optional): Target directory, defaults to current directory
2. **Starting index** (optional): 
   - `"x"` - First file gets `__X`, second gets `_00`, third gets `0`, then `_01`, `_02`... (alphabetically before `_00`)
   - `"0"` - First file gets `_0`, then `_01`, `_02`...
   - `"00"` - First file gets `__00`, second gets `_0`, then `_01`...
   - Default: Start from `_01`, `_02`...
3. **Skip numbers** (optional): Numbers to skip, format: `"2,4"` or `"[2,4]"`
4. **Letter suffix** (optional): Letter(s) to append after numbers, e.g., `"A"` for `_01A`, `_02A`...

## Examples

### Basic Example

If you have a directory called `vacation_photos` with these files:
- `zebra.jpg`
- `apple.png` 
- `banana.gif`

After running `node rename-files.js vacation_photos`, the files in the main directory will be renamed to:
- `vacation_photos_01.png` (apple.png - alphabetically first)
- `vacation_photos_02.gif` (banana.gif - alphabetically second)
- `vacation_photos_03.jpg` (zebra.jpg - alphabetically third)

The original files will be moved to `vacation_photos/lab scans/`:
- `lab scans/zebra.jpg`
- `lab scans/apple.png`
- `lab scans/banana.gif`

### Advanced Example with Letter Suffix

Running `node rename-files.js vacation_photos "0" "2,4" "A"`:
- `vacation_photos_0A.png` (apple.png - first file gets "0")
- `vacation_photos_01A.gif` (banana.gif - skips 2, gets "01")
- `vacation_photos_03A.jpg` (zebra.jpg - skips 4, gets "03")

### Example with "x" Option for Alphabetical Priority

Running `node rename-files.js vacation_photos "x"` (with 4 files):
- `vacation_photos__X.png` (apple.png - first file gets "__X" for alphabetical priority)
- `vacation_photos_00.gif` (banana.gif - second file gets "_00")
- `vacation_photos_0.jpg` (cherry.jpg - third file gets "0")  
- `vacation_photos_01.txt` (zebra.txt - fourth file gets "01")

The `__X` prefix ensures this file appears first alphabetically, even before files with `_00` prefix.

## Requirements

- Node.js 12.0.0 or higher
- No external dependencies required

## Installation

1. Clone or download this script
2. Make it executable (optional):
   ```bash
   chmod +x rename-files.js
   ```
3. Run it using Node.js as shown above

## Safety Features

- Preserves original files by moving them to a 'lab scans' subdirectory for backup
- Renames files in the main directory for immediate use
- Only processes actual files (ignores directories and hidden files)
- Provides detailed logging of all operations
- Graceful error handling for individual file operations
- Original files can be easily restored from the 'lab scans' directory if needed
