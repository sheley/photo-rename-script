const fs = require('fs');
const path = require('path');
const os = require('os');
const { renameFilesByAlphabeticalOrder } = require('./rename-files');

describe('Photo Rename Script', () => {
    let testDir;
    let originalConsoleLog;
    let originalConsoleError;
    let consoleOutput;

    beforeEach(() => {
        // Create a temporary test directory
        testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'photo-rename-test-'));
        
        // Capture console output
        originalConsoleLog = console.log;
        originalConsoleError = console.error;
        consoleOutput = [];
        console.log = (...args) => {
            consoleOutput.push(args.join(' '));
        };
        // Suppress console.error in tests
        console.error = () => {};
    });

    afterEach(() => {
        // Restore console methods
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        
        // Clean up test directory
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    // Helper function to create test files
    function createTestFiles(filenames) {
        const createdFiles = [];
        filenames.forEach(filename => {
            const filePath = path.join(testDir, filename);
            fs.writeFileSync(filePath, `Test content for ${filename}`);
            createdFiles.push(filePath);
        });
        return createdFiles;
    }

    // Helper function to get renamed files in top level directory, sorted by the index in the filename
    function getRenamedFiles() {
        const files = fs.readdirSync(testDir)
            .filter(file => {
                const filePath = path.join(testDir, file);
                const stat = fs.statSync(filePath);
                const dirName = path.basename(testDir);
                // Only include files that match the renamed pattern and exclude the 'lab scans' directory
                return stat.isFile() && file.startsWith(`${dirName}_`) && file !== 'lab scans';
            });
        
        // Sort by the index in the filename for consistent test results
        return files.sort((a, b) => {
            const dirName = path.basename(testDir);
            const aIndex = a.replace(`${dirName}_`, '').split('.')[0];
            const bIndex = b.replace(`${dirName}_`, '').split('.')[0];
            
            // Handle special cases like "__X", "_00" and "0", and remove letter suffixes
            const getNumericValue = (index) => {
                // Check for special cases first before removing suffixes
                if (index.startsWith('__X')) return -3;
                if (index.startsWith('_00')) return -2;
                if (index.startsWith('0') && (index.length === 1 || /[A-Za-z-]/.test(index[1]))) return -1;
                
                // For numeric indices, remove any letter suffixes and parse
                const numericPart = index.replace(/[A-Za-z-]+$/, '');
                return parseInt(numericPart, 10);
            };
            
            return getNumericValue(aIndex) - getNumericValue(bIndex);
        });
    }

    // Helper function to verify original files are moved to 'lab scans' directory
    function verifyOriginalFilesInLabScans(originalFilenames) {
        const labScansDir = path.join(testDir, 'lab scans');
        expect(fs.existsSync(labScansDir)).toBe(true);
        
        originalFilenames.forEach(filename => {
            const filePath = path.join(labScansDir, filename);
            expect(fs.existsSync(filePath)).toBe(true);
            
            // Also verify the original file no longer exists in the top level
            const topLevelPath = path.join(testDir, filename);
            expect(fs.existsSync(topLevelPath)).toBe(false);
        });
    }

    describe('Default starting index behavior', () => {
        test('should rename files starting from 01 with default options', async () => {
            const testFiles = ['zebra.jpg', 'apple.png', 'banana.gif'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir);
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}_01.png`, // apple.png (alphabetically first)
                `${dirName}_02.gif`, // banana.gif (alphabetically second)
                `${dirName}_03.jpg`  // zebra.jpg (alphabetically third)
            ]);
            
            // Verify original files are moved to lab scans directory
            verifyOriginalFilesInLabScans(testFiles);
        });

        test('should handle mixed file extensions correctly', async () => {
            const testFiles = ['photo3.jpeg', 'photo1.jpg', 'photo2.png', 'photo10.gif'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir);
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}_01.jpg`,  // photo1.jpg
                `${dirName}_02.gif`,  // photo10.gif
                `${dirName}_03.png`,  // photo2.png
                `${dirName}_04.jpeg`  // photo3.jpeg
            ]);
        });
    });

    describe('Starting with "0" option', () => {
        test('should start with "0" then continue with padded numbers', async () => {
            const testFiles = ['charlie.jpg', 'alpha.png', 'bravo.gif'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, '0');
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}_0.png`,   // alpha.png (first file gets "0")
                `${dirName}_01.gif`,  // bravo.gif (second file gets "01")
                `${dirName}_02.jpg`   // charlie.jpg (third file gets "02")
            ]);
            
            verifyOriginalFilesInLabScans(testFiles);
        });

        test('should handle skip numbers with "0" starting option', async () => {
            const testFiles = ['delta.jpg', 'alpha.png', 'bravo.gif', 'charlie.txt'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, '0', [2]);
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}_0.png`,   // alpha.png
                `${dirName}_01.gif`,  // bravo.gif
                `${dirName}_03.txt`,  // charlie.txt (skips 2)
                `${dirName}_04.jpg`   // delta.jpg
            ]);
        });
    });

    describe('Starting with "x" option', () => {
        test('should start with "__X", then "_00", then "0", then padded numbers', async () => {
            const testFiles = ['delta.jpg', 'alpha.png', 'bravo.gif', 'charlie.txt'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, 'x');
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}___X.png`,   // alpha.png (first file gets "__X")
                `${dirName}__00.gif`,   // bravo.gif (second file gets "_00")
                `${dirName}_0.txt`,     // charlie.txt (third file gets "0")
                `${dirName}_01.jpg`     // delta.jpg (fourth file gets "01")
            ]);
            
            verifyOriginalFilesInLabScans(testFiles);
        });

        test('should handle skip numbers with "x" starting option', async () => {
            const testFiles = ['foxtrot.jpg', 'alpha.png', 'bravo.gif', 'charlie.txt', 'delta.doc', 'echo.pdf'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, 'x', [2, 4]);
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}___X.png`,   // alpha.png (first file gets "__X")
                `${dirName}__00.gif`,   // bravo.gif (second file gets "_00")
                `${dirName}_0.txt`,     // charlie.txt (third file gets "0")
                `${dirName}_01.doc`,    // delta.doc (fourth file gets "01", skips 2)
                `${dirName}_03.pdf`,    // echo.pdf (fifth file gets "03", skips 4)
                `${dirName}_05.jpg`     // foxtrot.jpg (sixth file gets "05")
            ]);
        });

        test('should work with uppercase "X" starting option', async () => {
            const testFiles = ['delta.jpg', 'alpha.png', 'bravo.gif', 'charlie.txt'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, 'X');
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}___X.png`,   // alpha.png (first file gets "__X")
                `${dirName}__00.gif`,   // bravo.gif (second file gets "_00")
                `${dirName}_0.txt`,     // charlie.txt (third file gets "0")
                `${dirName}_01.jpg`     // delta.jpg (fourth file gets "01")
            ]);
            
            verifyOriginalFilesInLabScans(testFiles);
        });
    });

    describe('Starting with "00" option', () => {
        test('should start with "_00", then "0", then padded numbers', async () => {
            const testFiles = ['gamma.jpg', 'alpha.png', 'beta.gif'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, '00');
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}__00.png`, // alpha.png (first file gets "_00")
                `${dirName}_0.gif`,   // beta.gif (second file gets "0")
                `${dirName}_01.jpg`   // gamma.jpg (third file gets "01")
            ]);
            
            verifyOriginalFilesInLabScans(testFiles);
        });

        test('should handle more files with "00" starting option', async () => {
            const testFiles = ['echo.jpg', 'alpha.png', 'beta.gif', 'charlie.txt', 'delta.doc'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, '00');
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}__00.png`, // alpha.png
                `${dirName}_0.gif`,   // beta.gif
                `${dirName}_01.txt`,  // charlie.txt
                `${dirName}_02.doc`,  // delta.doc
                `${dirName}_03.jpg`   // echo.jpg
            ]);
        });

        test('should handle skip numbers with "00" starting option', async () => {
            const testFiles = ['foxtrot.jpg', 'alpha.png', 'beta.gif', 'charlie.txt', 'delta.doc', 'echo.pdf'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, '00', [2, 4]);
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}__00.png`, // alpha.png
                `${dirName}_0.gif`,   // beta.gif
                `${dirName}_01.txt`,  // charlie.txt
                `${dirName}_03.doc`,  // delta.doc (skips 2)
                `${dirName}_05.pdf`,  // echo.pdf (skips 4)
                `${dirName}_06.jpg`   // foxtrot.jpg
            ]);
        });
    });

    describe('Skip numbers functionality', () => {
        test('should skip specified numbers in default mode', async () => {
            const testFiles = ['file5.jpg', 'file1.png', 'file3.gif', 'file2.txt', 'file4.doc'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, undefined, [2, 4]);
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}_01.png`, // file1.png
                `${dirName}_03.txt`, // file2.txt (skips 2)
                `${dirName}_05.gif`, // file3.gif (skips 4)
                `${dirName}_06.doc`, // file4.doc
                `${dirName}_07.jpg`  // file5.jpg
            ]);
        });

        test('should handle multiple consecutive skip numbers', async () => {
            const testFiles = ['c.jpg', 'a.png', 'b.gif'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, undefined, [2, 3, 4, 5]);
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}_01.png`, // a.png
                `${dirName}_06.gif`, // b.gif (skips 2,3,4,5)
                `${dirName}_07.jpg`  // c.jpg
            ]);
        });

        test('should handle empty skip numbers array', async () => {
            const testFiles = ['beta.jpg', 'alpha.png'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, undefined, []);
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}_01.png`, // alpha.png
                `${dirName}_02.jpg`  // beta.jpg
            ]);
        });
    });

    describe('Alphabetical ordering', () => {
        test('should sort files alphabetically by filename', async () => {
            const testFiles = [
                'zebra_photo.jpg',
                'apple_image.png', 
                'banana_pic.gif',
                'cherry_snap.jpg',
                'dog_photo.png'
            ];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir);
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}_01.png`, // apple_image.png
                `${dirName}_02.gif`, // banana_pic.gif
                `${dirName}_03.jpg`, // cherry_snap.jpg
                `${dirName}_04.png`, // dog_photo.png
                `${dirName}_05.jpg`  // zebra_photo.jpg
            ]);
        });

        test('should handle numeric filenames correctly (string sort)', async () => {
            const testFiles = ['10.jpg', '2.png', '1.gif', '20.txt'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir);
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            // String alphabetical sort: "1", "10", "2", "20"
            expect(renamedFiles).toEqual([
                `${dirName}_01.gif`, // 1.gif
                `${dirName}_02.jpg`, // 10.jpg
                `${dirName}_03.png`, // 2.png
                `${dirName}_04.txt`  // 20.txt
            ]);
        });

        test('should handle case-insensitive sorting', async () => {
            const testFiles = ['Zebra.jpg', 'apple.png', 'Banana.gif', 'cherry.txt'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir);
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}_01.png`, // apple.png
                `${dirName}_02.gif`, // Banana.gif
                `${dirName}_03.txt`, // cherry.txt
                `${dirName}_04.jpg`  // Zebra.jpg
            ]);
        });
    });

    describe('File moving behavior', () => {
        test('should move originals to lab scans and rename in place', async () => {
            const testFiles = ['original1.jpg', 'original2.png'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir);
            
            // Check that original files are moved to lab scans directory
            const labScansDir = path.join(testDir, 'lab scans');
            expect(fs.existsSync(labScansDir)).toBe(true);
            
            testFiles.forEach(filename => {
                const originalPath = path.join(testDir, filename);
                const labScansPath = path.join(labScansDir, filename);
                
                // Original should no longer exist in top level
                expect(fs.existsSync(originalPath)).toBe(false);
                
                // Original should exist in lab scans directory
                expect(fs.existsSync(labScansPath)).toBe(true);
                
                // Verify content is preserved in lab scans
                const labScansContent = fs.readFileSync(labScansPath, 'utf8');
                expect(labScansContent).toBe(`Test content for ${filename}`);
            });
            
            // Check that renamed files exist in top level directory
            const renamedFiles = getRenamedFiles();
            expect(renamedFiles.length).toBe(2);
            
            // Verify renamed content matches original
            const dirName = path.basename(testDir);
            
            const renamedContent1 = fs.readFileSync(path.join(testDir, `${dirName}_01.jpg`), 'utf8');
            const renamedContent2 = fs.readFileSync(path.join(testDir, `${dirName}_02.png`), 'utf8');
            
            expect(renamedContent1).toBe('Test content for original1.jpg');
            expect(renamedContent2).toBe('Test content for original2.png');
        });

        test('should create lab scans subdirectory', async () => {
            const testFiles = ['test.jpg'];
            createTestFiles(testFiles);
            
            const labScansDir = path.join(testDir, 'lab scans');
            expect(fs.existsSync(labScansDir)).toBe(false);
            
            await renameFilesByAlphabeticalOrder(testDir);
            
            expect(fs.existsSync(labScansDir)).toBe(true);
            expect(fs.statSync(labScansDir).isDirectory()).toBe(true);
        });

        test('should use existing lab scans subdirectory if it exists', async () => {
            const testFiles = ['test.jpg'];
            createTestFiles(testFiles);
            
            const labScansDir = path.join(testDir, 'lab scans');
            fs.mkdirSync(labScansDir);
            
            // Create a file in the existing lab scans directory
            const existingFile = path.join(labScansDir, 'existing.txt');
            fs.writeFileSync(existingFile, 'existing content');
            
            await renameFilesByAlphabeticalOrder(testDir);
            
            // Check that existing file is still there
            expect(fs.existsSync(existingFile)).toBe(true);
            
            // Check that original file was moved to the lab scans directory
            const originalFile = path.join(labScansDir, 'test.jpg');
            expect(fs.existsSync(originalFile)).toBe(true);
            
            // Check that renamed file exists in top level
            const dirName = path.basename(testDir);
            const renamedFile = path.join(testDir, `${dirName}_01.jpg`);
            expect(fs.existsSync(renamedFile)).toBe(true);
        });
    });

    describe('Edge cases and error handling', () => {
        test('should handle empty directory', async () => {
            await renameFilesByAlphabeticalOrder(testDir);
            
            expect(consoleOutput.some(output => 
                output.includes('No files found in the directory to rename.')
            )).toBe(true);
        });

        test('should ignore hidden files', async () => {
            const testFiles = ['.hidden.jpg', 'visible.png', '.DS_Store'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir);
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            // Should only process visible.png
            expect(renamedFiles).toEqual([`${dirName}_01.png`]);
        });

        test('should ignore the lab scans directory itself', async () => {
            const testFiles = ['test.jpg'];
            createTestFiles(testFiles);
            
            // Create lab scans directory first
            const labScansDir = path.join(testDir, 'lab scans');
            fs.mkdirSync(labScansDir);
            
            await renameFilesByAlphabeticalOrder(testDir);
            
            const renamedFiles = getRenamedFiles();
            expect(renamedFiles.length).toBe(1); // Only test.jpg should be processed
        });

        test('should handle non-existent directory', async () => {
            const nonExistentDir = path.join(testDir, 'does-not-exist');
            
            await expect(renameFilesByAlphabeticalOrder(nonExistentDir))
                .rejects.toThrow('Directory does not exist');
        });

        test('should handle file path instead of directory', async () => {
            const filePath = path.join(testDir, 'test.txt');
            fs.writeFileSync(filePath, 'test content');
            
            await expect(renameFilesByAlphabeticalOrder(filePath))
                .rejects.toThrow('Path is not a directory');
        });

        test('should exit with error if photos have already been renamed', async () => {
            const testFiles = ['test.jpg', 'test2.png'];
            createTestFiles(testFiles);
            
            // Create lab scans directory to simulate already processed photos
            const labScansDir = path.join(testDir, 'lab scans');
            fs.mkdirSync(labScansDir);
            
            // Create renamed files to simulate that processing has already occurred
            const dirName = path.basename(testDir);
            fs.writeFileSync(path.join(testDir, `${dirName}_01.jpg`), 'renamed content');
            fs.writeFileSync(path.join(testDir, `${dirName}_02.png`), 'renamed content');
            
            await expect(renameFilesByAlphabeticalOrder(testDir))
                .rejects.toThrow("It seems you've already renamed these photos. Check again!");
        });
    });

    describe('Directory name usage', () => {
        test('should use directory name as prefix for renamed files', async () => {
            // Create a test directory with a specific name
            const specificTestDir = path.join(os.tmpdir(), 'MyPhotoAlbum');
            fs.mkdirSync(specificTestDir);
            
            try {
                const testFiles = ['photo1.jpg', 'photo2.png'];
                testFiles.forEach(filename => {
                    const filePath = path.join(specificTestDir, filename);
                    fs.writeFileSync(filePath, `Test content for ${filename}`);
                });
                
                await renameFilesByAlphabeticalOrder(specificTestDir);
                
                // Check renamed files in top level directory
                const renamedFiles = fs.readdirSync(specificTestDir)
                    .filter(file => {
                        const filePath = path.join(specificTestDir, file);
                        const stat = fs.statSync(filePath);
                        return stat.isFile() && file.startsWith('MyPhotoAlbum_');
                    })
                    .sort();
                
                expect(renamedFiles).toEqual([
                    'MyPhotoAlbum_01.jpg', // photo1.jpg
                    'MyPhotoAlbum_02.png'  // photo2.png
                ]);
                
                // Check that original files are moved to lab scans directory
                const labScansDir = path.join(specificTestDir, 'lab scans');
                expect(fs.existsSync(path.join(labScansDir, 'photo1.jpg'))).toBe(true);
                expect(fs.existsSync(path.join(labScansDir, 'photo2.png'))).toBe(true);
                
                // And that they no longer exist in top level
                expect(fs.existsSync(path.join(specificTestDir, 'photo1.jpg'))).toBe(false);
                expect(fs.existsSync(path.join(specificTestDir, 'photo2.png'))).toBe(false);
            } finally {
                // Clean up
                fs.rmSync(specificTestDir, { recursive: true, force: true });
            }
        });
    });

    describe('Letter suffix functionality', () => {
        test('should add letter suffix after numbers in default mode', async () => {
            const testFiles = ['zebra.jpg', 'apple.png', 'banana.gif'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, undefined, [], 'A');
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}_01A.png`, // apple.png (alphabetically first)
                `${dirName}_02A.gif`, // banana.gif (alphabetically second)
                `${dirName}_03A.jpg`  // zebra.jpg (alphabetically third)
            ]);
            
            // Verify original files are moved to lab scans directory
            verifyOriginalFilesInLabScans(testFiles);
        });

        test('should add letter suffix with "0" starting option', async () => {
            const testFiles = ['charlie.jpg', 'alpha.png', 'bravo.gif'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, '0', [], 'B');
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}_0B.png`,   // alpha.png (first file gets "0")
                `${dirName}_01B.gif`,  // bravo.gif (second file gets "01")
                `${dirName}_02B.jpg`   // charlie.jpg (third file gets "02")
            ]);
            
            verifyOriginalFilesInLabScans(testFiles);
        });

        test('should add letter suffix with "x" starting option', async () => {
            const testFiles = ['delta.jpg', 'alpha.png', 'bravo.gif', 'charlie.txt'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, 'x', [], 'B');
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}___XB.png`,   // alpha.png (first file gets "__X")
                `${dirName}__00B.gif`,   // bravo.gif (second file gets "_00")
                `${dirName}_0B.txt`,     // charlie.txt (third file gets "0")
                `${dirName}_01B.jpg`     // delta.jpg (fourth file gets "01")
            ]);
            
            verifyOriginalFilesInLabScans(testFiles);
        });

        test('should add letter suffix with "00" starting option', async () => {
            const testFiles = ['gamma.jpg', 'alpha.png', 'beta.gif'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, '00', [], 'C');
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}__00C.png`, // alpha.png (first file gets "_00")
                `${dirName}_0C.gif`,   // beta.gif (second file gets "0")
                `${dirName}_01C.jpg`   // gamma.jpg (third file gets "01")
            ]);
            
            verifyOriginalFilesInLabScans(testFiles);
        });

        test('should add letter suffix with skip numbers', async () => {
            const testFiles = ['file5.jpg', 'file1.png', 'file3.gif', 'file2.txt', 'file4.doc'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, undefined, [2, 4], 'X');
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}_01X.png`, // file1.png
                `${dirName}_03X.txt`, // file2.txt (skips 2)
                `${dirName}_05X.gif`, // file3.gif (skips 4)
                `${dirName}_06X.doc`, // file4.doc
                `${dirName}_07X.jpg`  // file5.jpg
            ]);
        });

        test('should handle letter suffix with "0" starting option and skip numbers', async () => {
            const testFiles = ['delta.jpg', 'alpha.png', 'bravo.gif', 'charlie.txt'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, '0', [2], 'Y');
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}_0Y.png`,   // alpha.png
                `${dirName}_01Y.gif`,  // bravo.gif
                `${dirName}_03Y.txt`,  // charlie.txt (skips 2)
                `${dirName}_04Y.jpg`   // delta.jpg
            ]);
        });

        test('should handle letter suffix with "00" starting option and skip numbers', async () => {
            const testFiles = ['foxtrot.jpg', 'alpha.png', 'beta.gif', 'charlie.txt', 'delta.doc', 'echo.pdf'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, '00', [2, 4], 'Z');
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}__00Z.png`, // alpha.png
                `${dirName}_0Z.gif`,   // beta.gif
                `${dirName}_01Z.txt`,  // charlie.txt
                `${dirName}_03Z.doc`,  // delta.doc (skips 2)
                `${dirName}_05Z.pdf`,  // echo.pdf (skips 4)
                `${dirName}_06Z.jpg`   // foxtrot.jpg
            ]);
        });

        test('should handle empty letter suffix (no suffix added)', async () => {
            const testFiles = ['beta.jpg', 'alpha.png'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, undefined, [], '');
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}_01.png`, // alpha.png
                `${dirName}_02.jpg`  // beta.jpg
            ]);
        });

        test('should handle multi-character letter suffix', async () => {
            const testFiles = ['beta.jpg', 'alpha.png'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, undefined, [], 'ABC');
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}_01ABC.png`, // alpha.png
                `${dirName}_02ABC.jpg`  // beta.jpg
            ]);
        });

        test('should handle lowercase letter suffix', async () => {
            const testFiles = ['beta.jpg', 'alpha.png'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, undefined, [], 'a');
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}_01a.png`, // alpha.png
                `${dirName}_02a.jpg`  // beta.jpg
            ]);
        });

        test('should handle special character as letter suffix', async () => {
            const testFiles = ['beta.jpg', 'alpha.png'];
            createTestFiles(testFiles);
            
            await renameFilesByAlphabeticalOrder(testDir, undefined, [], '-');
            
            const renamedFiles = getRenamedFiles();
            const dirName = path.basename(testDir);
            
            expect(renamedFiles).toEqual([
                `${dirName}_01-.png`, // alpha.png
                `${dirName}_02-.jpg`  // beta.jpg
            ]);
        });
    });
});
