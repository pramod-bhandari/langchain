// Script to create a sample XLSX file for testing
import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a sample workbook
function createSampleWorkbook() {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Create data for the first sheet
  const sheetData1 = [
    ['ID', 'Name', 'Department', 'Salary'],
    [1, 'John Doe', 'Engineering', 75000],
    [2, 'Jane Smith', 'Marketing', 65000],
    [3, 'Bob Johnson', 'Finance', 80000],
    [4, 'Alice Brown', 'HR', 60000],
    [5, 'Charlie Wilson', 'Product', 70000]
  ];
  
  // Create data for the second sheet
  const sheetData2 = [
    ['Product ID', 'Product Name', 'Category', 'Price', 'Stock'],
    ['P001', 'Laptop', 'Electronics', 1200, 15],
    ['P002', 'Smartphone', 'Electronics', 800, 25],
    ['P003', 'Desk Chair', 'Furniture', 150, 10],
    ['P004', 'Coffee Maker', 'Appliances', 50, 30],
    ['P005', 'Headphones', 'Electronics', 100, 20]
  ];
  
  // Convert data to worksheets
  const ws1 = XLSX.utils.aoa_to_sheet(sheetData1);
  const ws2 = XLSX.utils.aoa_to_sheet(sheetData2);
  
  // Add worksheets to workbook
  XLSX.utils.book_append_sheet(wb, ws1, 'Employees');
  XLSX.utils.book_append_sheet(wb, ws2, 'Products');
  
  return wb;
}

// Main function
async function main() {
  try {
    // Create the sample workbook
    const workbook = createSampleWorkbook();
    
    // Define the output path
    const outputPath = path.join(__dirname, '../test-files/sample.xlsx');
    
    // Write the workbook to file
    XLSX.writeFile(workbook, outputPath);
    
    console.log(`Sample XLSX file created at: ${outputPath}`);
  } catch (error) {
    console.error('Error creating sample XLSX file:', error);
  }
}

// Run the main function
main(); 