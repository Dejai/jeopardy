/*********************************************************************************
	MyGoogleDrive: Custom wrapper for handling Google Drive formatting

        Prerequisites:
            > Any page using this script should also have common.js
**********************************************************************************/ 


const MyGoogleDrive = {

    form_url: "https://docs.google.com/forms/d/e/1FAIpQLSd3HQnDkJDrZXULSnbMRDepwcxztb1uXKHePLnc75Bj3CKQ3A/viewform?usp=sf_link",

    uploadedMediaURL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2pbNFfU5PuaMRc79QCn7OxwUYRQd9F7uEVLml2lX42ewntc1LzIlDuxYL31mx8uSEDiqyloMyr5gY/pub?gid=1703641108&single=true&output=tsv",

    // Get the data from a given spreadsheet
    getSpreadsheetData: function(urlPath, successCallback, failureCallback=undefined){
        
        // Make the call to get the data and then format it
        myajax.AJAX(
            {
                method: "GET",
                path : urlPath,
                cacheControl: "no-cache",
                success: function(data){
                    Logger.log("Got the Data from Google!");
                    successCallback(data);
                },
                failure : function(request){
                    Logger.log("Something went wrong when trying to get data from Google!");
                }
            }
        );
    },

    // Format the spreadsheet data into a easily readable object
    formatSpreadsheetData: function(data){

        let rows = data.split("\n");
        isHeader = true;

        spreadsheetData = {
            "headers": [],
            "rows": []
        }

        // Loop through the rows in the spreadsheet data
        for(var idx = 0; idx < rows.length; idx++)
        {            
            let row = MyGoogleDrive.cleanValue(rows[idx]);
		    let cols = row.split("\t");

            // Set the headers for this spreadsheet;
            if(isHeader){
                spreadsheetData["headers"] = MyGoogleDrive.cleanListOfValues(cols);
                isHeader = false;
                continue;
            }

            rowObj = {};
            for(var col_idx = 0; col_idx < spreadsheetData["headers"].length; col_idx++)
            {
                key = spreadsheetData["headers"][col_idx];
                value = cols[col_idx] ?? "";
                rowObj[key] = value;
            }

            // Add this row object to the list of rows
            spreadsheetData["rows"].push(rowObj);
        }

        return spreadsheetData;
    },


    // Format a Google URL to easily view the "host" version;
    formatURL: function(type, initialURL){

        formattedURL = initialURL;

        urlObject = new URL(initialURL);
        query_map = mydoc.get_query_map_from_url(urlObject);
        file_id = query_map["id"] ?? "";

        switch(type.toLowerCase())
        {
            case "image":
                formattedURL = `http://docs.google.com/uc?id=${file_id}`;
                break;
            case "audio":
                formattedURL = `http://docs.google.com/uc?export=download&id=${file_id}`
                break;
            default:
                Logger.log("No valid format for type = " + type);
        }

        return formattedURL;
    },

    // Filter a set of row objects based on a column name having a certain value
    filterRowsByColumnValue: function(rows, columnName, valueToFilterBy){

        filtered_rows = [];

        rows.forEach( (row) => {

            value = row[columnName] ?? "";
            if(value == valueToFilterBy)
            {
                filtered_rows.push(row);
            }
        });
        return filtered_rows;
    },


    // Clean a value to remove special characters and trailing spaces
    cleanValue: function(value){
        clean_value = "";

        if (value != undefined)
        {
            clean_value = value.replace("\r", "");
            clean_value = clean_value.replace("\n", "");
            clean_value = clean_value.trim();
        }
        
        return clean_value;
    },

    // Clean a list of values; Uses "cleanValue" function
    cleanListOfValues: function(listOfValues){
        clean_list = [];

        if (listOfValues != undefined)
        {
            for(idx = 0; idx < listOfValues.length; idx++)
            {
                value = listOfValues[idx];
                clean_value = MyGoogleDrive.cleanValue(value);
                clean_list.push(clean_value);
            }
        }
        clean_list = clean_list.length > 0 ? clean_list : listOfValues;

        return clean_list; 
    },
}