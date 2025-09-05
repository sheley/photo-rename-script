#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates that the given path exists and is a directory
 * @param {string} directoryPath - Path to validate
 * @throws {Error} If path doesn't exist or is not a directory
 */
function validateDirectory(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        throw new Error(`Directory does not exist: ${directoryPath}`);
    }

    const stats = fs.statSync(directoryPath);
    if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${directoryPath}`);
    }
}

/**
 * Checks if photos have already been renamed by looking for the expected pattern
 * @param {string} directoryPath - Directory to check
 * @param {string} directoryName - Name of the directory for pattern matching
 * @throws {Error} If files appear to already be renamed
 */
function checkForAlreadyRenamedFiles(directoryPath, directoryName) {
    const existingFiles = fs.readdirSync(directoryPath).filter(file => {
        const filePath = path.join(directoryPath, file);
        const stat = fs.statSync(filePath);
        return stat.isFile() && file.startsWith(`${directoryName}_`) && /\d+/.test(file);
    });
    
    const labScansDir = path.join(directoryPath, 'lab scans');
    if (existingFiles.length > 0 && fs.existsSync(labScansDir)) {
        throw new Error("It seems you've already renamed these photos. Check again!");
    }
}

/**
 * Creates or ensures the lab scans directory exists
 * @param {string} directoryPath - Parent directory path
 * @returns {string} Path to the lab scans directory
 */
function createLabScansDirectory(directoryPath) {
    const labScansDir = path.join(directoryPath, 'lab scans');
    
    if (!fs.existsSync(labScansDir)) {
        fs.mkdirSync(labScansDir);
        console.log(`Created subdirectory: ${labScansDir}`);
    } else {
        console.log(`Using existing subdirectory: ${labScansDir}`);
    }
    
    return labScansDir;
}

/**
 * Scans directory for files and returns file information sorted alphabetically
 * @param {string} directoryPath - Directory to scan
 * @returns {Array} Array of file objects with name, path, and extension
 */
function scanAndSortFiles(directoryPath) {
    // Read all files in the directory (excluding the 'lab scans' subdirectory)
    const files = fs.readdirSync(directoryPath).filter(file => {
        const filePath = path.join(directoryPath, file);
        const stat = fs.statSync(filePath);
        return stat.isFile() && file !== 'lab scans';
    });
    
    // Filter out hidden files and prepare file info
    const fileStats = [];
    for (const file of files) {
        if (!file.startsWith('.')) {
            const filePath = path.join(directoryPath, file);
            fileStats.push({
                name: file,
                path: filePath,
                extension: path.extname(file)
            });
        }
    }

    // Sort files alphabetically by filename
    fileStats.sort((a, b) => a.name.localeCompare(b.name));
    
    return fileStats;
}

/**
 * Logs file information and processing parameters
 * @param {Array} fileStats - Array of file objects
 * @param {string} directoryName - Name of the directory
 * @param {number[]} skipNumbers - Numbers to skip
 * @param {string} letterSuffix - Letter suffix to append
 */
function logProcessingInfo(fileStats, directoryName, skipNumbers, letterSuffix) {
    console.log(`Found ${fileStats.length} files to rename and move in directory: ${directoryName}`);
    console.log('\nFiles sorted alphabetically:');
    fileStats.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name}`);
    });

    // Log skip numbers if provided
    if (skipNumbers.length > 0) {
        console.log(`Skipping numbers: ${skipNumbers.join(', ')}`);
    }
    
    // Log letter suffix if provided
    if (letterSuffix) {
        console.log(`Letter suffix: "${letterSuffix}"`);
    }
    
    console.log('\nRenaming files and moving originals...');
}

/**
 * Gets the next available number, skipping specified numbers
 * @param {number} currentNumber - Current number to check
 * @param {number[]} skipNumbers - Array of numbers to skip
 * @returns {number} Next available number
 */
function getNextAvailableNumber(currentNumber, skipNumbers) {
    while (skipNumbers.includes(currentNumber)) {
        currentNumber++;
    }
    return currentNumber;
}

/**
 * Calculates the index string for a file based on starting index and position
 * @param {number} fileIndex - Position of file in the array (0-based)
 * @param {string} startingIndex - Starting index option ("x", "00", "0", or default)
 * @param {number[]} skipNumbers - Numbers to skip
 * @param {Object} state - State object containing currentNumber
 * @returns {string} Index string to use in filename
 */
function calculateFileIndex(fileIndex, startingIndex, skipNumbers, state) {
    let index;
    
    // Handle different starting index options
    if (startingIndex === "x" || startingIndex === "X") {
        if (fileIndex === 0) {
            index = "__X";
        } else if (fileIndex === 1) {
            index = "_00";
        } else if (fileIndex === 2) {
            index = "0";
        } else {
            // For fourth file and beyond, start from 1 and apply skip logic
            const actualNumber = getNextAvailableNumber(state.currentNumber, skipNumbers);
            index = String(actualNumber).padStart(2, '0');
            state.currentNumber = actualNumber + 1;
        }
    } else if (startingIndex === "00") {
        if (fileIndex === 0) {
            index = "_00";
        } else if (fileIndex === 1) {
            index = "0";
        } else {
            // For third file and beyond, start from 1 and apply skip logic
            const actualNumber = getNextAvailableNumber(state.currentNumber, skipNumbers);
            index = String(actualNumber).padStart(2, '0');
            state.currentNumber = actualNumber + 1;
        }
    } else if (startingIndex === "0") {
        if (fileIndex === 0) {
            index = "0";
        } else {
            // For second file and beyond, start from 1 and apply skip logic
            const actualNumber = getNextAvailableNumber(state.currentNumber, skipNumbers);
            index = String(actualNumber).padStart(2, '0');
            state.currentNumber = actualNumber + 1;
        }
    } else {
        // Default behavior: start from 01 with skip logic
        const actualNumber = getNextAvailableNumber(state.currentNumber, skipNumbers);
        index = String(actualNumber).padStart(2, '0');
        state.currentNumber = actualNumber + 1;
    }
    
    return index;
}

/**
 * Processes a single file: renames it and moves original to lab scans directory
 * @param {Object} file - File object with name, path, and extension
 * @param {string} newFileName - New filename to use
 * @param {string} directoryPath - Parent directory path
 * @param {string} labScansDir - Lab scans directory path
 * @returns {Object} Processing result with original and renamed filenames
 */
function processFile(file, newFileName, directoryPath, labScansDir) {
    const newFilePath = path.join(directoryPath, newFileName);
    const originalBackupPath = path.join(labScansDir, file.name);
    
    try {
        // First, copy the original file to the lab scans directory
        fs.copyFileSync(file.path, originalBackupPath);
        // Then, rename the original file in place
        fs.renameSync(file.path, newFilePath);
        
        console.log(`Renamed: ${file.name} → ${newFileName} (original moved to lab scans/${file.name})`);
        
        return {
            original: file.name,
            renamed: newFileName
        };
    } catch (error) {
        console.error(`Error processing ${file.name}: ${error.message}`);
        throw error;
    }
}

/**
 * Logs the completion summary
 * @param {number} processedCount - Number of successfully processed files
 * @param {string} startingIndex - Starting index used
 * @param {number[]} skipNumbers - Numbers that were skipped
 * @param {string} letterSuffix - Letter suffix used
 * @param {string} directoryPath - Directory path
 * @param {string} labScansDir - Lab scans directory path
 */
function logCompletionSummary(processedCount, startingIndex, skipNumbers, letterSuffix, directoryPath, labScansDir) {
    console.log(`\nProcessing complete! Successfully renamed ${processedCount} files.`);
    let summaryMessage = '\nIndexing started from ' + startingIndex + ' and skipped numbers: ' + skipNumbers.join(', ');
    if (letterSuffix) {
        summaryMessage += ` with letter suffix: "${letterSuffix}"`;
    }
    console.log(summaryMessage);
    console.log(`\nRenamed files are now in: ${directoryPath}`);
    console.log(`\nOriginal files are preserved in: ${labScansDir}`);
    console.log('\nIf you\'re happy with the results, you can:');
    console.log('1. Delete the backup files in the "lab scans" directory, or');
    console.log('2. Restore from the "lab scans" directory if you need to revert the changes');
}

/**
 * Parses command line arguments for skip numbers
 * @param {string} skipNumbersArg - Command line argument for skip numbers
 * @returns {number[]} Array of parsed skip numbers
 */
function parseSkipNumbers(skipNumbersArg) {
    let skipNumbers = [];
    if (skipNumbersArg) {
        try {
            // Handle both "[10,11,22]" and "10,11,22" formats
            const cleanArg = skipNumbersArg.replace(/[\[\]]/g, '').trim();
            if (cleanArg) {
                skipNumbers = cleanArg.split(',').map(num => {
                    const parsed = parseInt(num.trim(), 10);
                    if (isNaN(parsed)) {
                        throw new Error(`Invalid number: ${num.trim()}`);
                    }
                    return parsed;
                }).sort((a, b) => a - b); // Sort numbers for easier processing
            }
        } catch (error) {
            console.error(`Error parsing skip numbers "${skipNumbersArg}": ${error.message}`);
            console.error('Please use format like "[10,11,22]" or "10,11,22"');
            process.exit(1);
        }
    }
    return skipNumbers;
}

/**
 * Moves original files to a 'lab scans' subdirectory and places renamed files in the top level
 * Files are renamed to {directoryName}_NN{letterSuffix}.{extension} format
 * @param {string} directoryPath - Path to the directory containing files to rename
 * @param {string} [startingIndex] - Optional starting index: "x" for __X, "00" for _00, 0, 01..., "0" for 0, 01..., default for 01, 02...
 * @param {number[]} [skipNumbers] - Optional array of numbers to skip when naming files
 * @param {string} [letterSuffix] - Optional letter to append after the number (e.g., 'A' for _01A, _02A, etc.)
 */
async function renameFilesByAlphabeticalOrder(directoryPath, startingIndex, skipNumbers = [], letterSuffix = '') {
    try {
        // Validate directory and check for already renamed files
        validateDirectory(directoryPath);
        const directoryName = path.basename(directoryPath);
        checkForAlreadyRenamedFiles(directoryPath, directoryName);
        
        // Create lab scans directory
        const labScansDir = createLabScansDirectory(directoryPath);
        
        // Scan and sort files
        const fileStats = scanAndSortFiles(directoryPath);
        
        if (fileStats.length === 0) {
            console.log('No files found in the directory to rename.');
            return;
        }

        // Log processing information
        logProcessingInfo(fileStats, directoryName, skipNumbers, letterSuffix);
        
        // Process files
        const processedFiles = [];
        const state = { currentNumber: 1 }; // Start counting from 1
        
        for (let i = 0; i < fileStats.length; i++) {
            const file = fileStats[i];
            const index = calculateFileIndex(i, startingIndex, skipNumbers, state);
            const newFileName = `${directoryName}_${index}${letterSuffix}${file.extension}`;
            
            try {
                const result = processFile(file, newFileName, directoryPath, labScansDir);
                processedFiles.push(result);
            } catch (error) {
                console.error(`Error processing ${file.name}: ${error.message}`);
            }
        }

        // Log completion summary
        logCompletionSummary(processedFiles.length, startingIndex, skipNumbers, letterSuffix, directoryPath, labScansDir);
        
    } catch (error) {
        console.error('Error:', error.message);
        throw error; // Re-throw the error instead of calling process.exit
    }
}

// Main execution
if (require.main === module) {
    // Get directory path from command line argument or use current directory
    const directoryPath = process.argv[2] || process.cwd();
    const startingIndex = process.argv[3]; // Optional starting index argument
    const skipNumbersArg = process.argv[4]; // Optional skip numbers argument
    const letterSuffix = process.argv[5]; // Optional letter suffix argument
    
    // Parse skip numbers
    const skipNumbers = parseSkipNumbers(skipNumbersArg);
    
    console.log(`Renaming files in directory: ${directoryPath}`);
    if (startingIndex) {
        console.log(`Using starting index option: "${startingIndex}"`);
    }
    if (skipNumbers.length > 0) {
        console.log(`Will skip numbers: ${skipNumbers.join(', ')}`);
    }
    if (letterSuffix) {
        console.log(`Will use letter suffix: "${letterSuffix}"`);
    }
    
    renameFilesByAlphabeticalOrder(directoryPath, startingIndex, skipNumbers, letterSuffix)
        .catch(error => {
            console.error('Error:', error.message);
            process.exit(1);
        });
}

module.exports = { renameFilesByAlphabeticalOrder };
