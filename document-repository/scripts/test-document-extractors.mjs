// Test script for document extractors
// Run with: node --experimental-modules scripts/test-document-extractors.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Get current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test DOCX extraction
async function testDocxExtraction(filePath) {
  console.log(`\nTesting DOCX extraction with file: ${filePath}`);
  try {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    console.log('Extraction successful!');
    console.log(`Extracted ${result.value.length} characters of text`);
    console.log('Sample text:', result.value.substring(0, 100) + '...');
    return true;
  } catch (error) {
    console.error('DOCX extraction failed:', error);
    return false;
  }
}

// Test XLSX extraction
async function testXlsxExtraction(filePath) {
  console.log(`\nTesting XLSX extraction with file: ${filePath}`);
  try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    console.log('Extraction successful!');
    console.log(`Found ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(', ')}`);
    
    // Extract sample data from the first sheet
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    
    console.log(`First sheet has ${jsonData.length} rows`);
    if (jsonData.length > 0) {
      console.log('Sample data:', JSON.stringify(jsonData.slice(0, 2)));
    }
    
    return true;
  } catch (error) {
    console.error('XLSX extraction failed:', error);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('Document Extractor Test Suite');
  console.log('===========================');
  
  // Define test files - replace with actual test files in your project
  // You'll need to create or add these test files to your project
  const testDocx = path.join(__dirname, '../test-files/sample-files.com-basic-text.docx');
  const testXlsx = path.join(__dirname, '../test-files/sample.xlsx');
  
  // Create test directory if it doesn't exist
  const testDir = path.join(__dirname, '../test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
    console.log('Created test-files directory. Please add sample DOCX and XLSX files for testing.');
    return;
  }
  
  // Check if test files exist
  let docxExists = fs.existsSync(testDocx);
  let xlsxExists = fs.existsSync(testXlsx);
  
  if (!docxExists && !xlsxExists) {
    console.log('No test files found. Please add sample DOCX and XLSX files to the test-files directory.');
    return;
  }
  
  // Run tests for available files
  if (docxExists) {
    await testDocxExtraction(testDocx);
  } else {
    console.log('DOCX test file not found. Skipping DOCX test.');
  }
  
  if (xlsxExists) {
    await testXlsxExtraction(testXlsx);
  } else {
    console.log('XLSX test file not found. Skipping XLSX test.');
  }
  
  console.log('\nTests completed!');
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
}); 