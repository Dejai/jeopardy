// The instance of this jeopardy game
var JeopardyGame;
var CurrentSection = "edit_section_game_questions"; //default first tab of edit page
var SectionsToBeSaved = []; // Keep track of sections that should be saved

/****************  HOST: ON PAGE LOAD ****************************/ 
	
	mydoc.ready(function()
	{
		// Set board name
		MyTrello.SetBoardName("jeopardy");

		// Loading up this page based on pathname;
		onKeyboardKeyup();

		let query_map = mydoc.get_query_map();
		let gameID = query_map["gameid"];
		if(gameID != undefined)
		{
			// Get the game
			onGetGame(gameID);
			// Prevent accidental closing
			// window.addEventListener("beforeunload", onClosePage);
		}
		else
		{
			// Navigate to load page if no game ID is present
			location.href = "/host/load/";
		}
	});

	// Prevent the page accidentally closing
	function onClosePage(event)
	{
		if(SectionsToBeSaved.length > 0)
		{
			event.preventDefault();
			event.returnValue='';
		}
	}

	// Create or return an instance of the Jeopardy game
	function onCreateJeopardyGame(gameID, gameName)
	{
		JeopardyGame = (JeopardyGame == undefined) ? new Jeopardy(gameID, gameName) : JeopardyGame;
		return JeopardyGame
	}

	// Listener for keyboard event = keyup
	function onKeyboardKeyup()
	{
		document.addEventListener("keyup", function(event)
		{
			switch(event.code)
			{
				case "Enter":
					inputEle = document.getElementById("given_game_password");
					if(inputEle == document.activeElement)
					{
						loadGame('edit', true)

					}
					break;
				default:
					return;
			}
		});
	}



/****** MAIN GAME PARTS: Get list of content & core setup things ****************************/ 

	// Get the list of games available to select from;
	function onGetListOfGames()
	{
		try
		{
			// Get the ADMIN_LIST
			MyTrello.get_list_by_name( "ADMIN_LIST", (listData)=>{
				
				let listResp = JSON.parse(listData.responseText);
				let listID = listResp[0]?.id;

				// Get the cards from the matching list
				MyTrello.get_cards(listID, (data2) => {
					let response = JSON.parse(data2.responseText);

					// Setup a map of all cards
					let cardMap = {};
					response.forEach((card) => {
						cardName = card["name"];
						cardID = card["id"];
						cardMap[cardName] = cardID;
					});

					// Get the names and sort;
					let cardNames = Object.keys(cardMap);
					cardNames.sort();

					// Loop through the games & setup <option> tags
					let options = "<option value=''></option>";
					for(var idx = 0; idx < cardNames.length; idx++)
					{
						singleCardName = cardNames[idx];
						singleCardID = cardMap[singleCardName];
						options += `<option value=${singleCardID}>${singleCardName}</option>`;
					}

					// Set the options content
					mydoc.setContent("#list_of_games", {"innerHTML":options});
				});
			});			
		}
		catch(error)
		{
			set_loading_results("Sorry, something went wrong!\n\n"+error);
		}
	}

	// Get the game
	function onGetGame(gameID)
	{
		try
		{
			// Query Trello for this card
			MyTrello.get_single_card(gameID,(data) => {

				// If we got the game (i.e. card) .. get the details
				response = JSON.parse(data.responseText);
				onGetGameDetails(response);
		
			}, (data) => {
				result = "Sorry, could not load game. Invalid ID!";
				set_loading_results(result);
			});
		}
		catch(error)
		{
			set_loading_results("onGetGame: Something went wrong:<br/>" + error);
		}
	}

	// Get the key details of an existing game
	function onGetGameDetails(cardResponse)
	{
		try
		{
			// Confirm Game ID
			var gameID = cardResponse["id"];
			var gameName = cardResponse["name"];

			// Setup the Jeopardy Game object
			onCreateJeopardyGame(gameID, gameName);

			// Get the game's Passphrase
			MyTrello.get_card_custom_field_by_name(gameID, "Pass Phrase", (data) => {
			
				let response = JSON.parse(data.responseText);
				let value = response[0]?.value?.text ?? "";
				mydoc.setContent("#game_pass_phrase", {"value":value});
				JeopardyGame.setGamePass(value);
			});

			// Get the attachments details; Loop through and get the game files
			var attachments = cardResponse["attachments"] ?? [];
			attachments.forEach( (attachment)=>{
				var url = attachment.url;
				var values = url.substring(url.indexOf("1")+2).split("/")
				
				// Get the key parts of the json file to load
				let cardID = values[1];
				let attachmentID = values[3];
				let fileName = values[5];

				onGetGameFile(cardID, attachmentID, fileName);
			});

			// Set things on page:
			onSetGameName();
			onSetGameID();

			// See what sections can be shown after getting the diff components
			setTimeout( ()=>{
				// showEditPageSections();
				// Adjust visibility of sections
				mydoc.showContent("#enter_game_name_section");
				mydoc.showContent("#edit_game_section");
				mydoc.showContent("#edit_game_details_table");
				set_loading_results("");

				// TEMP: Load the default page
				document.querySelector(`[data-section-id='${CurrentSection}']`)?.click();
			},1000);
		}
		catch(error)
		{
			set_loading_results("onGetGameDetails: Something went wrong:<br/>" + error);
		}
	}

	// Get the attachment & do the corresponding callback
	function onGetGameFile(cardID, attachmentID, fileName)
	{
		try 
		{
			// Get the corresponding attachment
			MyTrello.get_card_attachment(cardID, attachmentID, fileName, (data)=>{
						
				let response = myajax.GetJSON(data.responseText);

				// Set the attachment IDs
				JeopardyGame.setAttachmentID(fileName, attachmentID);

				// The file with the game rules
				if(fileName == "config.json")
				{
					JeopardyGame.config.createConfiguration(response);
					
					// Set the game rules after the config is setup
					onSetGameRules();
				}

				// The file with images/audio
				else if(fileName == "media.json")
				{
					// JeopardyGame.media.setMedia(response);
					JeopardyGame.setMedia(response);

					// Set the media after loading
					onSetGameMedia();
				}

				// The file with the categries/questions/answers
				else if(fileName = "categories.json")
				{
					JeopardyGame.setCategories(response);

					// Set the game rules
					onSetGameQuestions()
				}


			}, (err) => {
				console.error("Could not find config file");
			});	
		} catch (error) {
			
		}
	}

	// Set the game name
	function onSetGameName()
	{
		// Using name from JeopardyGame;
		var gameName = JeopardyGame.getGameName();
		mydoc.setContent("#game_name_value", {"value":gameName});
		mydoc.setContent("#edit_game_name", {"innerText":gameName});
	}

	// Set the game ID
	function onSetGameID()
	{
		var gameID = JeopardyGame.getGameID();
		mydoc.setContent("#read_only_game_id", {"innerText":gameID});
	}

	// Set the game Config/Rules
	function onSetGameRules()
	{
		Rules2.forEach( (ruleObj)=>{
			let ruleKey = JeopardyHelper.getKeyName(ruleObj.Name);
			let savedConfig = JeopardyGame.config.getConfiguration(ruleKey)
			ruleObj["Key"] = ruleKey;
			// Update options based on saved configuration
			ruleObj.Options?.forEach((option)=>{
				option["isSelected"] = (option.id == savedConfig.option) ? "selected" : "";
				option["customValue"] = savedConfig["value"] ?? "";
			});

			MyTemplates.getTemplate("../../templates/host/ruleOption.html",ruleObj.Options,(template)=>{
				ruleObj["FormattedOptions"] = template;

				MyTemplates.getTemplate("../../templates/host/ruleRow.html",ruleObj,(template)=>{
					mydoc.setContent("#settings_table_body", {"innerHTML": template}, true); // append to existing HTML;

					// Run the option details immediately
					document.querySelectorAll(".ruleOption")?.forEach( (ruleOpt)=>{
						onToggleRuleOptionDetails(ruleOpt);
					});
				});
			});
		});
	}

	// Set the game questions
	function onSetGameQuestions()
	{
		// The category HTML to load
		categoryHTML = "";

		// Assume final jeopardy category is missing
		let missingFinalJeopardy = true;

		// Loop through each category & build HTML templates;
		JeopardyGame.getCategories()?.forEach( (category, idx, array)=> {

			// Confirm if final jeopardy content is set
			if(category.isFinalJeopardy()){ missingFinalJeopardy = false; }

			// First, loop through the questions in this category
			questions = category.Questions;

			MyTemplates.getTemplate("../../templates/host/categoryQuestionRow.html", questions, (template)=>{

				// Take the formatted questions & set the section
				let categorylabel = (category.isFinalJeopardy()) ? "Final Jeopardy!" : "Category";
				let sectionJSON = {"categoryLabel":categorylabel, "categoryName":category.Name, "categorySectionBody":template}
				MyTemplates.getTemplate("../../templates/host/categorySection.html", sectionJSON, (template) =>{

					// Add to the category HTML
					categoryHTML += template;

					// If last one in set, then show all on the page;
					if(idx === array.length-1)
					{
						mydoc.setContent("#listOfCategories", {"innerHTML":categoryHTML});
						var action = (missingFinalJeopardy) ?
										mydoc.removeClass(".addFinalJeopardyCategory","hidden")
										: mydoc.addClass(".addFinalJeopardyCategory", "hidden")
					}
				});
			});
		});
	}

	// Set the game media
	function onSetGameMedia()
	{
		// Load the game-specific form URL
		let formURL = MyGoogleDrive.getFormURL(JeopardyGame.getGameID());
		let aHref =	document.getElementById("gameFormURL");
		if (aHref != undefined){ aHref.href = formURL; }
		
		// Get the list of media files
		var mediaFiles = JeopardyGame.getListOfMedia();
		if(mediaFiles?.length > 0)
		{
			// Clear out the N/A before setting media
			mydoc.setContent("#game_media", {"innerHTML": ""});

			// Keep track if all images have been loaded
			let allAudioSet = false;
			let firstImageSet = false;

			// Set the media (ordered by audio fist) 
			mediaFiles.forEach( (media)=>{
				if(media.Type == "Image"){ allAudioSet = true; }
				let breakLine = (allAudioSet && !firstImageSet) ? "<br/ style='clear:both;'>" : "";
				media["MediaHTML"] = media.getMediaHTML();
				MyTemplates.getTemplate("../../templates/host/mediaItem.html", media, (template)=>{
					mydoc.setContent("#game_media", {"innerHTML": (breakLine + template) }, true);
				});
				if(media.Type == "Image" && allAudioSet){ firstImageSet = true; }
			});
		}
	}

/*** SAVE ACTIONS: Saving the game details ********/

	// Indicates that something should be saved
	function onChangeInSection()
	{
		if(!SectionsToBeSaved.includes(CurrentSection))
		{
			
			SectionsToBeSaved.push(CurrentSection);
		}

		// Show the button as something is to be saved
		if(SectionsToBeSaved.length > 0)
		{
			mydoc.removeClass("#saveButton", "dlf_button_gray");
			mydoc.addClass("#saveButton", "dlf_button_limegreen");
		}
	}

	// The general save -- keeps track of diffs & saves accordingly
	function onSaveGame()
	{
		// Switch what to save based on the section
		
		

		if(SectionsToBeSaved.length > 0)
		{
			let loadingGIF = `<img class="component_saving_gif" src="../assets/img/loading1.gif" style="width:5%;height:5%;">`
			mydoc.setContent("#saveButton", {"innerHTML":"SAVING ... "});
			mydoc.removeClass("#saveButton", "dlf_button_limegreen");
			mydoc.addClass("#saveButton", "dlf_button_blue");

			while(SectionsToBeSaved.length > 0)
			{
				let section = SectionsToBeSaved.pop();
				
				onSaveBySection(section);
			}

			// Reset  button;
			setTimeout(()=>{
				mydoc.setContent("#saveButton", {"innerHTML":"DONE"});
				mydoc.removeClass("#saveButton", "dlf_button_blue");
				mydoc.addClass("#saveButton", "dlf_button_limegreen");

				// Final phase
				setTimeout(()=>{
					mydoc.setContent("#saveButton", {"innerHTML":"SAVE"});
					mydoc.removeClass("#saveButton", "dlf_button_limegreen");
					mydoc.addClass("#saveButton", "dlf_button_gray");
				}, 1500);

			}, 1500);
		}
	}

	// Save the details based on section
	function onSaveBySection(section)
	{
		switch(section)
		{
			case "edit_section_game_details":
				// Get the name of the game
				let savedName = JeopardyGame.getGameName();
				let newName =  mydoc.getContent("#game_name_value")?.value ?? savedName;
				if( HostUtility.isDiffValues(newName, savedName)){ onSaveGameName(newName); }

				// Get the passphrase
				let savedPass = JeopardyGame.getGamePass();
				let newPass = mydoc.getContent("#game_pass_phrase")?.value ?? savedPass;
				if( HostUtility.isDiffValues(newPass, savedPass)){ onSavePassphrase(newPass); }
				
				break;
			case "edit_section_game_settings":
				onSaveGameFile(JSON.stringify(JeopardyGame.config), "config.json");
				break;
			case "edit_section_game_questions":
				onSaveGameFile(JSON.stringify(JeopardyGame.Categories), "categories.json");
				break;
			case "edit_section_game_media":
				
				onSaveGameFile(JSON.stringify(JeopardyGame.Media), "media.json");
				break;
			default:
				
		}
	}

	// Save the game name
	function onSaveGameName(newName)
	{
		Logger.log("Updating game Name");

		let gameID = JeopardyGame.getGameID();
		// Update in Trello
		MyTrello.update_card_name(gameID,newName, (data)=>{
			if(data.status >= 200 && data.status < 300)
			{
				JeopardyGame.setGameName(newName);
				onSetGameName();
			}
		});
	}

	// Save a custom field based on given name
	function onSavePassphrase(newValue)
	{
		Logger.log("Updating Pass Phrase");

		let gameID = JeopardyGame.getGameID();

		MyTrello.update_card_custom_field_by_name(gameID, "Pass Phrase", newValue, (data)=> {

			if(data.status >= 200 && data.status < 300)
			{
				Logger.log("Updated custom field == " + customFieldName);
			}
		});
	}

	// Save one of the config files (config, category, media, etc?)
	function onSaveGameFile(jsonString, fileName)
	{
		var gameID = JeopardyGame.getGameID();
		// var jsonData = JeopardyGame.config.getConfigJSON();
		// var fileName = "config.json";
		var currAttachmentID = JeopardyGame.getAttachmentID(fileName);

		
		

		// Save the config file
		MyTrello.create_card_attachment(gameID,fileName,jsonString,(data)=>{
			if(data.status >= 200 && data.status < 300)
			{
				let newFile = myajax.GetJSON(data.responseText);
				JeopardyGame.setAttachmentID(fileName, newFile.id);
				MyTrello.delete_card_attachment(JeopardyGame.gameID,currAttachmentID,(data)=>{
					Logger.log(data.responseText);
				});
			}
		}, (err)=>{ console.error(err);});
	}


/***** SWITCH/TOGGLE ACTIONS: Actions that involve a switch/toggle in stateof page */
	
	// Toggle the tabs
	function onSwitchTab(event)
	{
		let target = event.target;

		// Make sure we attempt a save before we navigate away (but only if I implement way to mark that a section needs saving)
		// onSaveGame2(); 

		// Where are we trying to go?
		let targetSection = target.getAttribute("data-section-id");

		// Update the 'selected' class selectors
		mydoc.removeClass(".selected_tab", "selected_tab");
		mydoc.addClass(".edit_section.selected_section", "hidden");
		mydoc.removeClass(".edit_section.selected_section", "selected_section");

		// Show the new section
		target.classList.add("selected_tab");
		mydoc.addClass(`#${targetSection}`, "selected_section");
		mydoc.showContent(`#${targetSection}`);

		// Conditional actions
		
		var syncMedia = (targetSection == "edit_section_game_media") ? onSyncMediaInterval("start") : onSyncMediaInterval("stop");

		// Set the current section
		CurrentSection = targetSection;
	}

	// Toggle visibility of sections related to selected rule option
	function onToggleRuleOptionDetails(sourceEle)
	{
		// Get the selected option of the element
		let selectedOption = sourceEle.querySelector("option:checked");

		// Get key values from the selected option;
		let attr_Description = selectedOption.getAttribute("data-jpd-description");
		let attr_Suggestion = selectedOption.getAttribute("data-jpd-suggestion");
		let attr_Type = selectedOption.getAttribute("data-jpd-type");
		let attr_CustomValue = selectedOption.getAttribute("data-jpd-custom-value");

		// Show the rule description
		let ruleDescParagraph = HostUtility.getSibling(sourceEle, ".rule_description");
		if(ruleDescParagraph != undefined)
		{
			ruleDescParagraph.innerText = attr_Description;
		}

		// Decide whether to show the Host View button or not
		if(sourceEle.id == "AnsweringQuestions")
		{
			if(sourceEle.value == "2")
			{
				mydoc.removeClass(".host_view_section", "hidden")
			}
			else
			{
				mydoc.addClass(".host_view_section", "hidden")
			}
		}

		// Check if suggestion is included;
		let suggestionParagraph = HostUtility.getSibling(sourceEle, ".rule_suggestion");
		let hasSuggestion = attr_Suggestion?.length > 0 ?? false;
		if(hasSuggestion)
		{
			suggestionParagraph.classList.remove("hidden");
			suggestionParagraph.innerText = "Suggestion: " + attr_Suggestion;
		}
		else
		{
			suggestionParagraph.classList.add("hidden");
			suggestionParagraph.innerText = attr_Suggestion;
		}

		// Next, check if custom value can be input
		let customInput = HostUtility.getSibling(sourceEle, ".rule_custom");
		let allowsCustom = attr_Type?.includes("custom") ?? false;
		if(allowsCustom)
		{
			customInput.classList.remove("hidden");
			customInput.value = attr_CustomValue ?? "";
		}
		else
		{
			customInput.classList.add("hidden");
			customInput.value = "";
		}
	}

	// Listener for when the user changes an option on the settings section
	function onRuleOptionChange(event)
	{
		let sourceEle = event.srcElement;	
		onToggleRuleOptionDetails(sourceEle);
	}

/***** GENERAL FORM ACTIONS: Actions that involve the forms */

	// Toggle forms;
	function onToggleForm(state, formIdentifier)
	{
		if(state == "show")
		{
			mydoc.showContent(formIdentifier);
			mydoc.hideContent("#listOfCategories");
			mydoc.hideContent(".addCategoriesSection");
			mydoc.hideContent("#save_game_details");
		}
		else if (state == "hide")
		{
			mydoc.hideContent(formIdentifier);
			mydoc.showContent("#listOfCategories");
			mydoc.showContent(".addCategoriesSection");
			mydoc.showContent("#save_game_details");
		}
	}

	// Load a form HTMl
	function loadFormHTML(identifier, formValuesObject)
	{

		let formName = identifier.replace("#","");
		let templateName = `../../templates/host/${formName}.html`;

		// Get the media object for the question form
		let audioOptions = JeopardyGame.getMediaOptions("Audio");
		let imageOptions = JeopardyGame.getMediaOptions("Image");
		let mediaObj = {"AudioOptions":audioOptions, "ImageOptions":imageOptions}

		// The object for the form
		let formObject = (identifier == "#questionForm") ? mediaObj : {}

		// Set the form template & the form values
		MyTemplates.getTemplate(templateName, formObject,(template)=>{
			
			mydoc.setContent(identifier, {"innerHTML": template});
			
			// Run the function to set the values
			if(identifier == "#questionForm"){ onSetQuestionFormValues(formValuesObject); }
			if(identifier == "#categoryForm"){ onSetCategoryFormValues(formValuesObject); }

			// Toggle the form
			onToggleForm("show", identifier);

		});
	}

/***** QUESTION FORM ACTIONS: Actions that involve the question form */

	// Adding a new question
	function onAddQuestion(event)
	{
		let target = event.target; 
		let section = target.closest(".categorySection");
		let categoryName = section.querySelector(".categoryName")?.innerText;

		// Set the form values;
		let category = JeopardyGame.getCategory(categoryName);
		let questionFormObj = {"Category": category, "Value":undefined};

		// Load the form
		loadFormHTML("#questionForm", questionFormObj);
		
	}

	// On edit of a question
	function onEditQuestion(event)
	{
		let target = event.target;
		let row = target.closest(".questionRow");
		let section = target.closest(".categorySection");
		let categoryName = section.querySelector(".categoryName")?.innerText;
		let value = row.querySelector(".questionValue")?.innerText;

		// Get the appropriate category + questions
		let category = JeopardyGame.getCategory(categoryName);

		// Object to use to set the form
		let questionFormObj = {"Category": category, "Value":value};
		loadFormHTML("#questionForm", questionFormObj);
	}

	// Swapping question
	function onSwapQuestionOrder(event)
	{
		let target = event.target;

		// Determine direction we are swapping
		let isUp = target.classList.contains("fa-arrow-up");
		let isDown = target.classList.contains("fa-arrow-down");

		// Get the appropriate Category
		let section = target.closest(".categorySection");
		let categoryName = section.querySelector(".categoryName")?.innerText;
		let category = JeopardyGame.getCategory(categoryName);

		// Based on category, get the current question obj
		let currentRow = target.closest(".questionRow");
		let currentValue = currentRow?.querySelector(".questionValue")?.innerText ?? "";
		let currentQuestion = category?.getQuestion(currentValue);

		// Based on category & swap direction, get sibling to swap with
		let siblingRow = (isUp) ? currentRow.previousElementSibling : (isDown) ? currentRow.nextElementSibling : undefined;
		let siblingValue = siblingRow?.querySelector(".questionValue")?.innerText ?? "";
		let siblingQuestion = category?.getQuestion(siblingValue);

		// Do the swap
		if(currentQuestion != undefined && siblingQuestion != undefined)
		{
			siblingQuestion.Value = Number(currentValue);
			currentQuestion.Value = Number(siblingValue);

			// Reload the questions after swapping
			let questions = category.getQuestions();
			MyTemplates.getTemplate("../../templates/host/categoryQuestionRow.html", questions, (template)=>{
				mydoc.setContent(`[data-jpd-category-section='${categoryName}'] .categorySectionBody`,{"innerHTML":template} )
			});

			// Indicate a change is needed
			onChangeInSection();
		}
	}

	// On cancel of a question.
	function onCancelQuestionForm()
	{
		// Control visibility of the sections
		onToggleForm("hide", "#questionForm");

	}  

	// Set the values of the form
	function onSetQuestionFormValues(categoryObject)
	{
		let category = categoryObject.Category;
		let value = categoryObject.Value;

		// Should always know/set the category name
		mydoc.setContent("#questionFormCategoryName",{"innerText":category.Name});

		// Attempt to get the question Object
		var questionsObj = category.getQuestion(value);

		// Set the values to be set
		let questionValue = questionsObj?.Value ?? category.getNextValue();
		let isDailyDouble = category?.isDailyDouble ?? "No";
		let questionText = questionsObj?.Question.Text ?? "";
		let questionImage = questionsObj?.Question.Image ?? "";
		let questionAudio = questionsObj?.Question.Audio ?? "";
		let questionURL = questionsObj?.Question.URL ?? "";
		let answerText = questionsObj?.Answer.Text ?? "";
		let answerImage = questionsObj?.Answer.Image ?? "";
		let answerAudio = questionsObj?.Answer.Audio ?? "";
		let answerURL = questionsObj?.Answer.URL ?? "";
			
		// Set the content:
		mydoc.setContent("#questionFormValue",{"value":questionValue});
		mydoc.setContent("#questionForm [name='isDailyDouble']",{"value":isDailyDouble});
		mydoc.setContent("#questionForm [name='questionText']",{"value":questionText});
		mydoc.setContent("#questionForm [name='questionImage']",{"value":questionImage});
		mydoc.setContent("#questionForm [name='questionAudio']",{"value":questionAudio});
		mydoc.setContent("#questionForm [name='questionURL']",{"value":questionURL});
		mydoc.setContent("#questionForm [name='answerText']",{"value":answerText});
		mydoc.setContent("#questionForm [name='answerImage']",{"value":answerImage});
		mydoc.setContent("#questionForm [name='answerAudio']",{"value":answerAudio});
		mydoc.setContent("#questionForm [name='answerURL']",{"value":answerURL});		
	}

	// Save a question
	function onSaveQuestion()
	{
		let categoryName = mydoc.getContent("#questionFormCategoryName")?.innerText ?? "";
		let questionValue = mydoc.getContent("#questionFormValue")?.value ?? "";

		// Get the value to be saved
		let isDailyDouble = mydoc.getContent("#questionForm [name='isDailyDouble']")?.value ?? "No";
		let questionText = mydoc.getContent("#questionForm [name='questionText']")?.value ?? "";
		let questionImage = mydoc.getContent("#questionForm [name='questionImage']")?.value ?? "";
		let questionAudio = mydoc.getContent("#questionForm [name='questionAudio']")?.value ?? "";;
		let questionURL = mydoc.getContent("#questionForm [name='questionURL']")?.value ?? "";
		let answerText = mydoc.getContent("#questionForm [name='answerText']")?.value ?? "";
		let answerImage = mydoc.getContent("#questionForm [name='answerImage']")?.value ?? "";
		let answerAudio = mydoc.getContent("#questionForm [name='answerAudio']")?.value ?? "";
		let answerURL = mydoc.getContent("#questionForm [name='answerURL']")?.value ?? "";
		
		// Object to be saved
		let newCategoryQuestion = {
			"Value": questionValue,
			"DailyDouble": isDailyDouble,
			"Question": { "Text": questionText, "Image": questionImage, "Audio": questionAudio, "URL": questionURL },
			"Answer": { "Text": answerText, "Image": answerImage, "Audio": answerAudio, "URL": answerURL }
		}
		

		// Update the saved category question
		let results = JeopardyGame.updateCategoryQuestion(categoryName, newCategoryQuestion);

		// Reload the question row -- so the page shows latest results
		let category = JeopardyGame.getCategory(categoryName);
		let questions = category.Questions;
		
		MyTemplates.getTemplate("../../templates/host/categoryQuestionRow.html", questions, (template)=>{
			mydoc.setContent(`[data-jpd-category-section='${categoryName}'] .categorySectionBody`,{"innerHTML":template} )
		});

		onToggleForm("hide", "#questionForm");

		// Indicate a change is needed
		onChangeInSection();
	}

	// Remove a question
	function onDeleteQuestion()
	{
		let categoryName = mydoc.getContent("#questionFormCategoryName")?.innerText ?? "";
		let questionValue = mydoc.getContent("#questionFormValue")?.value ?? "";

		// Reload the question row -- so the page shows latest results
		let category = JeopardyGame.getCategory(categoryName);

		let proceed = confirm("Are you sure you want to delete this question?")
		if(proceed)
		{
			console.log("Deleting question");
			category.deleteQuestion(questionValue);

			let questions = category.Questions;

			// Reload category section
			MyTemplates.getTemplate("../../templates/host/categoryQuestionRow.html", questions, (template)=>{
				mydoc.setContent(`[data-jpd-category-section='${categoryName}'] .categorySectionBody`,{"innerHTML":template} )
			});
			
			onToggleForm("hide", "#questionForm");
	
			// Indicate a change is needed
			onChangeInSection();
		}
	}

/***** CATEGORY FORM ACTIONS: Actions that involve the question form */

	// Adding a new question
	function onAddCategory(event)
	{
		let target = event.target; 
		let isFinalJeopardy = target.classList.contains("addFinalJeopardyCategory");
		let categoryObj = (isFinalJeopardy) ? {"FinalJeopardy":"Yes", "Order":99 } : {}
		loadFormHTML("#categoryForm",categoryObj);
	}

	// On cancel of adding a category
	function onCancelCategoryForm()
	{
		// Control visibility of the sections
		onToggleForm("hide", "#categoryForm");
	} 

	// On edit of a category
	function onEditCategory(event)
	{
		let target = event.target;
		let section = target.closest(".categorySection");
		let categoryName = section.querySelector(".categoryName")?.innerText;

		// Get the appropriate category + questions
		let category = JeopardyGame.getCategory(categoryName);
		loadFormHTML("#categoryForm",category);
	}
	
	// Set the pieces of a category
	function onSetCategoryFormValues(categoryObject)
	{
		// Set the values to be set
		let categoryName = categoryObject?.Name ?? "";
		let categoryOrder = categoryObject?.Order ?? JeopardyGame.Categories.length+1;
		// let categoryOrderClass = (categoryObject?.FinalJeopardy == "Yes") ? "hidden" : ""
		let finalJeopardy = categoryObject?.FinalJeopardy ?? "No";
		let valueCount = categoryObject?.ValueCount ?? 100;

		// Set the content:
		// mydoc.addClass(".categoryFormOrderSection", categoryOrderClass);
		mydoc.setContent("#categoryForm [name='categoryFormID']",{"value":categoryName});
		mydoc.setContent("#categoryForm [name='categoryFormName']",{"value":categoryName});
		mydoc.setContent("#categoryForm [name='categoryFormOrder']",{"value":categoryOrder});
		mydoc.setContent("#categoryForm [name='categoryFormFinalJeopardy']",{"value":finalJeopardy});
	}

	// Save a category
	function onSaveCategory()
	{
		// Get the values to be saved
		let categoryID = mydoc.getContent("#categoryForm [name='categoryFormID']")?.value ?? "";
		let categoryName = mydoc.getContent("#categoryForm [name='categoryFormName']")?.value ?? "";
		let categoryOrder = mydoc.getContent("#categoryForm [name='categoryFormOrder']")?.value ?? "";
		let finalJeopardy = mydoc.getContent("#categoryForm [name='categoryFormFinalJeopardy']")?.value ?? "No";
		
		// Object to be saved
		let newCategory = {
			"ID" : categoryID,
			"Name": categoryName,
			"Order": categoryOrder,
			"FinalJeopardy": finalJeopardy,
			"ValueCount": 100
		}
		console.log(newCategory);


		// Updat existing category
		if(categoryID != "")
		{
			console.log("Updating category")
			// Update the category
			JeopardyGame.updateCategory(newCategory);
		}
		// Or add new category
		else if(categoryName != "")
		{
			console.log("Adding category")
			// Add the new category
			JeopardyGame.addCategory(newCategory);
		}		

		// Reload all categories
		onSetGameQuestions();

		// Hide the form
		onToggleForm("hide", "#categoryForm");
				
		// Indicate a change is needed
		onChangeInSection();
	}

	// Delete a category
	function onDeleteCategory()
	{
		// Get the values to be saved
		let categoryName = mydoc.getContent("#categoryForm [name='categoryFormName']")?.value ?? "";

		let proceed = confirm("Are you sure you want to delete this category?");
		if(proceed)
		{
			JeopardyGame.deleteCategory(categoryName);

			// Reload all categories
			onSetGameQuestions();

			// Hide the form
			onToggleForm("hide", "#categoryForm");
					
			// Indicate a change is needed
			onChangeInSection();
		}
	}

/*** Game Media */

	// Control the syncing of the game media
	function onSyncMediaInterval(state)
	{
		// Always stop the interval first. ;) 
		
		clearInterval(syncMediaInterval);

		// If starting, then setup interval
		if(state == "start")
		{
			// Run it first, then start an Interval
			onSyncMedia()
			var syncMediaInterval = setInterval( onSyncMedia, 60000);
		}
	}

	// Run the sync of the media
	function onSyncMedia()
	{

		
		loading_html = `
			<span>Syncing</span>
			<img class="component_saving_gif" src="../assets/img/loading1.gif" style="width:5%;height:5%;">
			`;
		MyNotification.notify("#syncNotifier", loading_html, "notify_orange");

		let existingMedia = JeopardyGame.getListOfMedia(true);
		let existingMediaMap = {}
		existingMedia?.forEach( (media)=>{ existingMediaMap[media.ID] = media ; });

		// Get the data from the Spreadsheet  get the Spreadsheet values;
		MyGoogleDrive.getSpreadsheetData(MyGoogleDrive.uploadedMediaURL, (data) =>{
			
			
			
			spreadSheetData = MyGoogleDrive.formatSpreadsheetData(data.responseText);
			rows =  spreadSheetData["rows"];

			// Filter the rows to only the ones for this game;
			rows = MyGoogleDrive.filterRowsByColumnValue(rows,"Game ID", JeopardyGame.getGameID());

			// Flag if new media added
			let newMediaAdded = false;

			// Loop through rows to check if media is to be synced
			for(let idx=0; idx < rows.length; idx++)
			{
				row = rows[idx]; // get single row
				let newMedia = {
					"ID": MyGoogleDrive.getFileID(row["Upload File"]),
					"Name": row["File Name"],
					"Type": row["Type of File"],
					"Src": MyGoogleDrive.formatURL(row["Type of File"], row["Upload File"])
				}

				// If file does not exist, then add new
				if(!(Object.keys(existingMediaMap).includes(newMedia.ID)) )
				{
					JeopardyGame.addMedia(newMedia);
					newMediaAdded = true;
				}
			}

			// Only resync if new media added
			if(newMediaAdded)
			{
				onSetGameMedia(); //update page

				onChangeInSection() // indicate need to save
			}
			MyNotification.clear("#syncNotifier", "notify_orange");
			MyNotification.notify("#syncNotifier", "Synced", "notify_limegreen");
		});

	}

	// Delete the media
	function onDeleteMedia(mediaID)
	{
		// remove_existing_media_from_page(mediaID);
		try
		{
			document.getElementById(mediaID).remove();
			JeopardyGame.setMediaToInactive(mediaID);
			onChangeInSection();
		}
		catch(err)
		{
			console.error(err);
		}
	}

/****** HELPER OBJECT: Simplifing approach for hosting ****************************/ 

	const HostUtility = 
	{
		// Quickly compare two value
		isDiffValues: (a,b)=>{
			return (a.toString() != b.toString());
		},

		// Comparing two config values
		hasDifferentConfigValues: ()=>{

			var hasDifferences = false;

			let ruleOptions = document.querySelectorAll(".ruleOption");
			let keys = []
			ruleOptions.forEach( (obj)=>{

				// Get the rule as seen on the form
				let optionVal = obj.value; 
				let ruleObj = {"option": optionVal}
				let customInput = HostUtility.getSibling(obj,".rule_custom")?.value ?? "";
				if(customInput != ""){ ruleObj["value"] = customInput; }

				// Get the saved value
				let savedObj = JeopardyGame.config.getConfiguration(obj.id)

				if(HostUtility.isDiffValues( JSON.stringify(ruleObj), JSON.stringify(savedObj) ) )
				{
					// Indicate there are differences
					hasDifferences = true;

					// Update the JeapartyGame config
					JeopardyGame.config.setConfiguration(obj.id, ruleObj);
				}
				keys.push(ruleObj);
			});
			return hasDifferences;
		}, 

		getSibling: (sourceEle, siblingSelector)=>{
			let parent = sourceEle.parentElement;
			let sibling = parent.querySelector(`${siblingSelector}`);
			return sibling;
		}
	}



	function set_loading_results(value)
	{
		toggle_loading_gif(true);
		let section = document.getElementById("loading_results_section");
		section.parentElement.classList.remove("hidden");
		section.innerHTML = value;
	}


	// Loading view
	function toggle_loading_gif(forceHide=false)
	{
		let section = document.getElementById("loading_gif");
		let isHidden = section.classList.contains("hidden")

		if(isHidden)
		{
			mydoc.showContent("#loading_gif");		
		}
		if(!isHidden || forceHide)
		{
			mydoc.hideContent("#loading_gif");	
		}
	}

	// Saving gif;
	function toggle_saving_gif(forceHide=false)
	{
		let section = document.getElementById("saving_gif");
		let isHidden = section.classList.contains("hidden")

		if(isHidden)
		{
			mydoc.showContent("#saving_gif");		
		}
		if(!isHidden || forceHide)
		{
			mydoc.hideContent("#saving_gif");	
		}
	}