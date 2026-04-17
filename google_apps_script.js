/**
 * Updated Script with "Format & Download CSV" functionality!
 * 
 * 1. Open your Google Sheet.
 * 2. Click on "Extensions" -> "Apps Script" in the top menu.
 * 3. Delete any code there, and paste all of the code below.
 * 4. Click the "Save" icon (or press Ctrl+S).
 * 5. Close the Apps Script tab and go back to your Google Sheet.
 * 6. Refresh the Google Sheet page.
 * 7. You will see a new menu at the top called "1to7 Platform".
 * 8. Click "1to7 Platform" -> "Format & Download CSV".
 * 9. It will format the data AND pop up a small box that automatically downloads your `users_import.csv`!
 */

function formatAndDownload() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    Browser.msgBox("No data found.");
    return;
  }
  
  const originalHeaders = data[0].map(h => h.toString().trim());
  
  const getIndex = (name) => {
    return originalHeaders.findIndex(h => h === name);
  };
  
  const colName = getIndex("Name");
  const colPhone = getIndex("Phone");
  const colUserId = getIndex("User ID");
  const colAccountNum = getIndex("Account Number");
  const colEmail = getIndex("Email");
  const colState = getIndex("State");
  const colInsta = getIndex("Instagram ID");
  const colIfsc = getIndex("IFSC");
  const colAccountName = getIndex("Account Name");
  const colGender = getIndex("Gender");
  const colCity = getIndex("City");
  const colFollowers = getIndex("Followers");
  // Might be named 'Category' or something slightly different, this is safe fallback
  const colCategory = getIndex("Category");
  
  // We will create a fresh sheet for the output so we don't destroy the original data
  let newSheetName = "Supabase Import Ready";
  let existingSheet = ss.getSheetByName(newSheetName);
  if (existingSheet) {
    ss.deleteSheet(existingSheet);
  }
  const newSheet = ss.insertSheet(newSheetName);
  
  // The BCRYPT hashed placeholder for "Test@123". Users will reset via "Forgot Password".
  const defaultPasswordHash = "$2a$10$DummyHashForTest123WillRequireReset1234567890123456789";
  
  const headers = [
    "full_name", "mobile", "email", "influencer_id", "instagram_username", 
    "gender", "account_number", "account_name", "ifsc_code", "state", "city", 
    "followers", "category", "password_hash", "is_email_verified", "is_mobile_verified"
  ];
  
  const newData = [headers];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Require mobile or name to be present so we don't accidentally import completely blank rows
    let mobileValue = colPhone !== -1 ? row[colPhone] : null;
    let nameValue = colName !== -1 ? row[colName] : null;
    if ((!mobileValue || mobileValue.toString().trim() === "") && 
        (!nameValue || nameValue.toString().trim() === "")) {
      continue;
    }
    
    let fullName = nameValue ? nameValue.toString().trim().replace(/"/g, '""') : "Unknown";
    let mobile = mobileValue ? mobileValue.toString().trim() : "";
    let email = (colEmail !== -1 && row[colEmail]) ? row[colEmail].toString().trim() : `${mobile}@1to7.com`;
    let userId = (colUserId !== -1 && row[colUserId]) ? row[colUserId].toString().trim() : "";
    
    let instaIdRaw = (colInsta !== -1 && row[colInsta]) ? row[colInsta].toString().trim() : "";
    let instaUser = instaIdRaw;
    if (instaIdRaw.includes("instagram.com/")) {
       let match = instaIdRaw.match(/instagram\.com\/([^/?]+)/);
       if (match && match[1]) {
         instaUser = match[1];
       }
    }
    
    let genderRaw = (colGender !== -1 && row[colGender]) ? row[colGender].toString().trim() : "";
    let gender = "Any";
    if (genderRaw.toLowerCase().startsWith("m")) gender = "Male";
    else if (genderRaw.toLowerCase().startsWith("f")) gender = "Female";
    
    let accountNum = (colAccountNum !== -1 && row[colAccountNum]) ? row[colAccountNum].toString().trim() : "";
    let accountName = (colAccountName !== -1 && row[colAccountName]) ? row[colAccountName].toString().trim().replace(/"/g, '""') : "";
    let ifsc = (colIfsc !== -1 && row[colIfsc]) ? row[colIfsc].toString().trim() : "";
    let state = (colState !== -1 && row[colState]) ? row[colState].toString().trim() : "";
    let city = (colCity !== -1 && row[colCity]) ? row[colCity].toString().trim() : "";
    
    let followers = 0;
    if (colFollowers !== -1 && row[colFollowers]) {
      let f = parseInt(row[colFollowers].toString().replace(/,/g, ''));
      if (!isNaN(f)) followers = f;
    }
    
    let category = (colCategory !== -1 && row[colCategory]) ? row[colCategory].toString().trim() : "";
    
    // Using quotes around strings that might contain commas
    newData.push([
      `"${fullName}"`, mobile, email, userId, instaUser, 
      gender, accountNum, `"${accountName}"`, ifsc, state, city, 
      followers, category, defaultPasswordHash, "TRUE", "TRUE"
    ]);
  }
  
  // 1. Save data to the new sheet tab nicely
  const sheetData = newData.map(row => row.map(cell => {
    if (typeof cell === 'string' && cell.startsWith('"') && cell.endsWith('"')) {
      return cell.slice(1, -1).replace(/""/g, '"');
    }
    return cell;
  }));
  newSheet.getRange(1, 1, sheetData.length, headers.length).setValues(sheetData);

  // 2. Convert Data to Raw CSV String
  const csvString = newData.map(row => row.join(",")).join("\\n");
  
  // 3. Prompt Download via HTML Dialog
  const htmlOutput = HtmlService.createHtmlOutput(
    `<html>
      <head>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 20px; background: #f8fafc; }
          .btn { background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 15px;}
        </style>
      </head>
      <body>
        <h3>Success!</h3>
        <p>Processed ${newData.length - 1} users successfully.</p>
        <p>Your download should start automatically.</p>
        <a id="downloadLink" class="btn" href="data:text/csv;charset=utf-8,${encodeURIComponent(csvString)}" download="users_import.csv">Download CSV Now</a>
        <script>
          // Automatically click the download link
          window.onload = function() {
            document.getElementById('downloadLink').click();
            setTimeout(function() { google.script.host.close(); }, 3000);
          };
        </script>
      </body>
    </html>`
  )
  .setWidth(350)
  .setHeight(200);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Exporting Database CSV');
}

function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('1to7 Platform')
      .addItem('Format & Download CSV', 'formatAndDownload')
      .addToUi();
}
