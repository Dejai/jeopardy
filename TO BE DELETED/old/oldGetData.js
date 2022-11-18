// DELETE AFTER
function onGetOldData(gameID)
{

	if(JeopardyGame.getAttachmentID("categories.json") == "")
	{
		console.log("Get old categories data");
		// Get the published URL from the card custom field
		MyTrello.get_card_custom_field_by_name(gameID, "Published URL", (data) => {

		let customField = JSON.parse(data.responseText);
		custom_value = customField[0]?.value?.text ?? "";
		if(custom_value != "")
		{
			console.log("Getting google data");
			MyGoogleDrive.getSpreadsheetData(custom_value, (data) =>{
				spreadSheetData = MyGoogleDrive.formatSpreadsheetData(data.responseText);
				console.log(spreadSheetData);

				let rows = spreadSheetData.rows;

				rows.forEach( (row, idx)=>{

					let categoryName = row["Category Name"];
					let isFinalJeopardy = categoryName.includes("FINAL JEOP") ;

					categoryName = isFinalJeopardy ? row["Score Value"] : categoryName

					let answerObj = {
						"Text": row["Answer (Text)"],
						"Audio":row["Answer (Audio)"],
						"Image":row["Answer (Image)"],
						"URL":row["Answer (URL)"]
					};

					let questionObj = {
						"Text": row["Question (Text)"],
						"Audio":row["Question (Audio)"],
						"Image":row["Question (Image)"],
						"URL":row["Question (URL)"]
					};

					let categoryQuestionObj = {
							"Value": isFinalJeopardy ? "999" : row["Score Value"],
							"DailyDouble": row["Daily Double?"],
							"Question": questionObj,
							"Answer": answerObj
						};

					
					let categoryObj = {
						"Name": categoryName,
						"Order":isFinalJeopardy ? 99 : JeopardyGame.Categories.length+1,
						"FinalJeopardy": isFinalJeopardy? "Yes" : "No" ,
					}

					// Setup the category
					if(  JeopardyGame.getCategory(categoryName) == undefined)
					{
						JeopardyGame.addCategory(categoryObj);
					}

					if(isFinalJeopardy)
					{
						console.log(categoryQuestionObj);
					}

					let existingCategory = JeopardyGame.getCategory(categoryName);

					existingCategory?.addQuestion(categoryQuestionObj);

				});

				console.log(JeopardyGame);
				onSetGameQuestions();
				
			});

		}
	});

	}

	if(JeopardyGame.getAttachmentID("config.json") == "")
	{
		console.log("Getting old settings");
		console.log(oldDesc);

		let jsonObj = myajax.GetJSON(oldDesc);
		console.log(jsonObj);
		let categObj = {}
		jsonObj.forEach( (o)=>{
			let newO = {"option": o.option}
			if(o.value != undefined){ newO["value"] = o.value}
			let keyName = JeopardyHelper.getKeyName(o.name);
			categObj[keyName] = newO;
		});	
		console.log(categObj);
		JeopardyGame.Config.createConfiguration(categObj);

		onSetGameRules();
	}
}
