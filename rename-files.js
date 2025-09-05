#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
        // Validate directory exists
        if (!fs.existsSync(directoryPath)) {
            throw new Error(`Directory does not exist: ${directoryPath}`);
        }

        const stats = fs.statSync(directoryPath);
        if (!stats.isDirectory()) {
            throw new Error(`Path is not a directory: ${directoryPath}`);
        }

        // Get directory name for checking existing renamed files
        const directoryName = path.basename(directoryPath);
        
        // Check if photos have already been renamed by looking for files with the expected pattern
        const existingFiles = fs.readdirSync(directoryPath).filter(file => {
            const filePath = path.join(directoryPath, file);
            const stat = fs.statSync(filePath);
            return stat.isFile() && file.startsWith(`${directoryName}_`) && /\d+/.test(file);
        });
        
        const labScansDir = path.join(directoryPath, 'lab scans');
        if (existingFiles.length > 0 && fs.existsSync(labScansDir)) {
            throw new Error("It seems you've already renamed these photos. Check again!");
        }
        
        // Create 'lab scans' subdirectory for original files
        if (!fs.existsSync(labScansDir)) {
            fs.mkdirSync(labScansDir);
            console.log(`Created subdirectory: ${labScansDir}`);
        } else {
            console.log(`Using existing subdirectory: ${labScansDir}`);
        }
        
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

        if (fileStats.length === 0) {
            console.log('No files found in the directory to rename.');
            return;
        }

        // Sort files alphabetically by filename
        fileStats.sort((a, b) => a.name.localeCompare(b.name));

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
        
        // Helper function to get the next available number, skipping specified numbers
        function getNextAvailableNumber(currentNumber, skipNumbers) {
            while (skipNumbers.includes(currentNumber)) {
                currentNumber++;
            }
            return currentNumber;
        }
        
        // Rename files and move originals
        const processedFiles = [];
        let currentNumber = 1; // Start counting from 1
        
        for (let i = 0; i < fileStats.length; i++) {
            const file = fileStats[i];
            let index;
            
            // Handle different starting index options
            if (startingIndex === "x" || startingIndex === "X") {
                if (i === 0) {
                    index = "__X";
                } else if (i === 1) {
                    index = "_00";
                } else if (i === 2) {
                    index = "0";
                } else {
                    // For fourth file and beyond, start from 1 and apply skip logic
                    const actualNumber = getNextAvailableNumber(currentNumber, skipNumbers);
                    index = String(actualNumber).padStart(2, '0');
                    currentNumber = actualNumber + 1;
                }
            } else if (startingIndex === "00") {
                if (i === 0) {
                    index = "_00";
                } else if (i === 1) {
                    index = "0";
                } else {
                    // For third file and beyond, start from 1 and apply skip logic
                    const actualNumber = getNextAvailableNumber(currentNumber, skipNumbers);
                    index = String(actualNumber).padStart(2, '0');
                    currentNumber = actualNumber + 1;
                }
            } else if (startingIndex === "0") {
                if (i === 0) {
                    index = "0";
                } else {
                    // For second file and beyond, start from 1 and apply skip logic
                    const actualNumber = getNextAvailableNumber(currentNumber, skipNumbers);
                    index = String(actualNumber).padStart(2, '0');
                    currentNumber = actualNumber + 1;
                }
            } else {
                // Default behavior: start from 01 with skip logic
                const actualNumber = getNextAvailableNumber(currentNumber, skipNumbers);
                index = String(actualNumber).padStart(2, '0');
                currentNumber = actualNumber + 1;
            }
            
            const newFileName = `${directoryName}_${index}${letterSuffix}${file.extension}`;
            const newFilePath = path.join(directoryPath, newFileName);
            const originalBackupPath = path.join(labScansDir, file.name);
            
            try {
                // First, copy the original file to the lab scans directory
                fs.copyFileSync(file.path, originalBackupPath);
                // Then, rename the original file in place
                fs.renameSync(file.path, newFilePath);
                processedFiles.push({
                    original: file.name,
                    renamed: newFileName
                });
                console.log(`Renamed: ${file.name} → ${newFileName} (original moved to lab scans/${file.name})`);
            } catch (error) {
                console.error(`Error processing ${file.name}: ${error.message}`);
            }
        }

        console.log(`\nProcessing complete! Successfully renamed ${processedFiles.length} files.`);
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
    
    // Parse skip numbers array from string format like "[10,11,22]" or "10,11,22"
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
