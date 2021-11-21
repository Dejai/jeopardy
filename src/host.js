


var CURR_GAME_ID =  "";
var CURR_GAME_NAME = "";
var CURR_EDIT_SHEET_URL = "";
var CURR_PUB_SHEET_URL = "";
var CURR_GAME_PASSWORD = "";

var CURR_GAME_RULES =  undefined;
var USE_DEFAULT_RULES = true;

/****************  HOST: ON PAGE LOAD ****************************/ 
	
	mydoc.ready(function(){

		// Check for existing player if on player screen
		let path = location.pathname;

		if (path.includes("/host/edit"))
		{

			let query_map = mydoc.get_query_map();
			if(query_map.hasOwnProperty("gameid"))
			{
				let game_id = query_map["gameid"];
				get_existing_game(game_id);
			} 
			else 
			{
				mydoc.showContent("#enter_game_name_section");
				loadListOfGames();
			}
		}

		// If loading the game, 
		if (path.includes("/host/load"))
		{
			loadListOfGames();

		}

		// If gameid is set, avoid accidentally exiting
		if(path.includes("?gameid"))
		{
			// Prevent accidental closing
			window.addEventListener("beforeunload", onClosePage);
		}
	});

	// Prevent the page accidentally closing
	function onClosePage(event)
	{
		event.preventDefault();
		event.returnValue='';
	}

	function loadListOfGames()
	{
		try
		{
			let games_select_list = document.getElementById("list_of_games");
			MyTrello.get_cards(MyTrello.admin_list_id, function(data){
				response = JSON.parse(data.responseText);

				let cardMap = {};
				response.forEach((card) => {
					cardName = card["name"];
					cardID = card["id"];
					cardMap[cardName] = cardID;
				});

				let cardNames = Object.keys(cardMap);

				cardNames.sort();

				// response.sort(function(a,b){
				// 	aName = a["name"].toLowerCase();
				// 	bName = b["name"].toLowerCase();

				// 	if(aName < b["name"])
				// 	{
				// 		return -1;
				// 	}
				// 	if(aName > bName)
				// 	{
				// 		return 1;
				// 	}
				// 	return 0;
				// });

				let options = "";

				// let game_id    = undefined;
				for(var idx = 0; idx < cardNames.length; idx++)
				{
					singleCardName = cardNames[idx];
					singleCardID = cardMap[singleCardName];
					// card = response[idx];
					
					// let card_name = card["name"];
					// let card_id   = card["id"];

					options += `<option value=${singleCardID}>${singleCardName}</option>`;
				}
				
				games_select_list.innerHTML += options;
			});
		}
		catch(error)
		{
			set_loading_results("Sorry, something went wrong!\n\n"+error);
		}
	}


/*********** HOST: LOAD GAME (to either PLAY or EDIT) *************************/ 

	// Get the selected game and entered pass phrase
	function getGameAndPassPhrase()
	{
		let list_of_games = document.getElementById("list_of_games");
		let current_game_id = list_of_games.value; 

		let game_password_ele = document.getElementById("given_game_password");
		let given_password = game_password_ele.value;

		let obj = {"game_id": current_game_id, "pass_phrase": given_password}

		return obj;
	}

	// Looks up the lists from the board and tries to find the one matching the given game code
	function loadGame(action, isTestRun=false, samePageLoad=false)
	{
		// Start Clear results if any & load GIF
		set_loading_results("");
		toggle_loading_gif();

		let credentials = getGameAndPassPhrase()
		let current_game_id = credentials["game_id"];
		let given_password = credentials["pass_phrase"];

		// console.log(current_game_id && current_game_id != "");
		if (current_game_id != undefined && current_game_id != "")
		{
			CURR_GAME_ID = current_game_id;
			validate_password(current_game_id, given_password, function(){
				onOpenGameURL(action, isTestRun, samePageLoad);
			});
		}
		else 
		{
			result = "Please select from the list of available games.";
			set_loading_results(result);
		}
	}

	// Open a game
	function onOpenGameURL(type, isTest=false, samePageLoad=false)
	{
		let newURL = get_game_url(CURR_GAME_ID, type, isTest);
		console.log(newURL);
		if(samePageLoad)
		{
			location.replace(newURL);
		}
		else
		{
			window.open(newURL, "_blank");
		}
	}

	// Validate the password
	function validate_password(game_id, password, callback)
	{

		MyTrello.get_card_custom_fields(game_id, function(data){
			response = JSON.parse(data.responseText);

			failure = true;			
			response.forEach(function(obj){
				let valueObject = obj["value"];
				let is_phrase_field = obj["idCustomField"] == MyTrello.custom_field_phrase;
				let is_edit_field = obj["idCustomField"] == MyTrello.custom_field_edit_url;
				let customFieldValue = (valueObject.hasOwnProperty("text")) ? valueObject["text"] : "";
				
				if( (is_phrase_field || is_edit_field) && customFieldValue != "")
				{
					if(customFieldValue.toUpperCase() == password.toUpperCase())
					{
						failure = false;
						callback();
					}
				}
			});
			if(failure)
			{
				result = "Invalid credentials for this game";
				set_loading_results(result);
			}
		});
	}

	// Load the game settings
	function loadGameSettings(settingsJSON=undefined)
	{
		let table_body = document.getElementById("settings_table_body")

		table_body.innerHTML = get_formatted_rules(settingsJSON);

		onShowRuleDetails(); // Ensure values are displayed;
	}

	// Create the new game;
	function create_game(game_name, pass_phrase)
	{
		MyTrello.create_game_card(MyTrello.admin_list_id, game_name, function(data)
		{
			response = JSON.parse(data.responseText);
			game_id = response["id"];

			// Add the pass to the custom field
			MyTrello.update_card_custom_field(game_id,MyTrello.custom_field_phrase,pass_phrase)


			setTimeout(function(){
				load_url = "http://" + location.host + location.pathname.replace("create", "edit") + "?gameid=" + game_id;
				location.replace(load_url);
			}, 2000);
		});
	}

	function add_media()
	{
		var files = document.getElementById("game_files").files;

		for(var idx = 0; idx < files.length; idx++)
		{
			var fileData = new FormData();

			fileData.append("key", MyTrello.key);
			fileData.append("token", MyTrello.token);
			fileData.append("file", files[idx]);
			fileData.append("name", files[idx].name);
			fileData.append("setCover", false);

			MyTrello.create_attachment(CURR_GAME_ID, fileData, function(data){

				response = JSON.parse(data.responseText);

				file_name = response["fileName"];
				file_url  = response["url"];
				file_id   = response["id"];

				add_existing_media_to_page(file_id, file_name, file_url);
			});
		}		
	}

/************* HOST: EVENT LISTENERS ************************************/ 

	// When the list of games changes
	function onSelectLoadGame(event)
	{
		let sourceEle = event.target;
		selectedGame = sourceEle.value;
		
		// Set the host view link/button
		document.querySelector("#open_host_view_button").href =  get_game_url(selectedGame, "host");

		playURL = get_game_url(selectedGame, "play");
		testURL = get_game_url(selectedGame, "play", true);
		hostURL = get_game_url(selectedGame, "host");

	}

	// Listener for when the user changes an option on the settings section
	function onRuleOptionChange(event)
	{
		let sourceEle = event.srcElement;	
		onToggleRuleOptionDetails(sourceEle);
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
		let ruleDescParagraph = get_sibling(sourceEle, "rule_description");
		if(ruleDescParagraph != undefined)
		{
			ruleDescParagraph.innerText = attr_Description;
		}

		// Check if suggestion is included;
		let suggestionParagraph = get_sibling(sourceEle, "rule_suggestion");
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
		let customInput = get_sibling(sourceEle, "rule_custom");
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

	// Show all the rule details on load
	function onShowRuleDetails()
	{
		let selects = document.querySelectorAll(".ruleOption");

		// Loops through all options and shows details
		selects.forEach((obj) =>{
			onToggleRuleOptionDetails(obj);
		});
	}

	// Handler for saving the game components
	function onSaveGame()
	{
		// Save the different components
		onSaveGameComponent("GameName");
		onSaveGameComponent("PassPhrase");
		onSaveGameComponent("PublishedSheetURL");
		onSaveGameComponent("EditSheetURL");
		onSaveGameComponent("GameSettings");
	}

	// function New way to save game component
	function onSaveGameComponent(componentName)
	{
		let identifier = undefined;
		let saved_value = undefined;
		let updateFunc = undefined;
		let expectedParams = 2;
		let parameters = [CURR_GAME_ID];

		let isUpdate = false; // by default, nothing to update;
		let timeout = 1000; //default timeout of 1 second;

		switch(componentName)
		{
			case "GameName":
				identifier = "game_name_value";
				saved_value = CURR_GAME_NAME;
				updateFunc = MyTrello.update_card_name
				checkValue = checkIfNewValue(identifier, saved_value);
				isUpdate = checkValue.isNewValue;
				parameters.push(checkValue.value);
				CURR_GAME_NAME = checkValue.value;
				break;
			case "PassPhrase":
				identifier = "game_pass_phrase";
				saved_value = CURR_GAME_PASSWORD;
				updateFunc = MyTrello.update_card_custom_field;
				expectedParams = 3;
				parameters.push(MyTrello.custom_field_phrase);
				checkValue = checkIfNewValue(identifier, saved_value);
				isUpdate = checkValue.isNewValue;
				parameters.push(checkValue.value);
				CURR_GAME_PASSWORD = checkValue.value;
				break;
			case "PublishedSheetURL":
				identifier = "game_url_value";
				saved_value = CURR_PUB_SHEET_URL;
				updateFunc = MyTrello.update_card_custom_field;
				expectedParams = 3;
				parameters.push(MyTrello.custom_field_pub_url);
				checkValue = checkIfNewValue(identifier, saved_value);
				isUpdate = checkValue.isNewValue;
				parameters.push(checkValue.value);
				CURR_PUB_SHEET_URL = checkValue.value;
				break;
			case "EditSheetURL":
				identifier = "game_edit_sheet_value";
				saved_value = CURR_EDIT_SHEET_URL;
				updateFunc = MyTrello.update_card_custom_field;
				expectedParams = 3;
				parameters.push(MyTrello.custom_field_edit_url);
				checkValue = checkIfNewValue(identifier, saved_value);
				isUpdate = checkValue.isNewValue;
				parameters.push(checkValue.value);
				CURR_EDIT_SHEET_URL = checkValue.value;
				break;
			case "GameSettings":
				identifier = "settings_identifier";
				updateFunc = MyTrello.update_card_description
				isUpdate = true; // Always update settings;
				savedRules = get_saved_rules();
				savedRulesJSON = JSON.stringify(savedRules);
				parameters.push(savedRulesJSON);
				break;
			default:
				console.log("Could not set values");
		}

		// First, start the load of the toggler 
		onToggleSaveComponentState(identifier, true);

		// Then check if updates should be made; 
		if(isUpdate && (parameters.length == expectedParams) )
		{
			timeout = 3000; // make the timeout longer; 
			console.log(`Making update for: ${identifier}`);
			updateFunc(...parameters);
		}

		// Finally, end the save mode
		setTimeout(()=>{
			onToggleSaveComponentState(identifier);
		}, timeout);
	}	

	// Toggle the state of each component being saved;
	function onToggleSaveComponentState(identifier, isSaving=false)
	{

		// Get the related element and parent;
		let element = document.querySelector(`#${identifier}`);
		let parent = element?.parentElement;

		if(parent != undefined)
		{
			let saving_gif = parent.querySelector('.component_saving_gif');
			let save_button = parent.querySelector(".save_component_button");

			if(isSaving)
			{
				save_button.innerText = "Saving ...";
				save_button.disabled = true;
				save_button.style.backgroundColor = "blue";
				saving_gif.classList.remove("hidden");
			}
			else
			{
				save_button.innerText = "Saved!";
				save_button.style.backgroundColor = "orange";
				saving_gif.classList.add("hidden");

				// Reset to basics;
				setTimeout(() => {
					save_button.disabled = false;
					save_button.innerText = "Save";
					save_button.style.backgroundColor = "limegreen";
				},2000);
			}
		}
	}
	
/************* HOST: GETTERS ************************************/ 

	// Loads existing team if card ID was already included or found
	function get_existing_game(card_id)
	{
		try
		{
			MyTrello.get_single_card(card_id, function(data){

				response = JSON.parse(data.responseText);
				
				// Set the current game ID
				CURR_GAME_ID = response["id"];

				// Set the current game name;
				CURR_GAME_NAME = response["name"];
				document.getElementById("game_name_value").value = CURR_GAME_NAME;

				// Set the current game rules
				CURR_GAME_RULES = myajax.GetJSON(response["desc"]);
				loadGameSettings(CURR_GAME_RULES);

				// Determine if this should be a DEMO link
				let demoParam = (CURR_GAME_NAME.toUpperCase() == "DEMO") ? "&demo=1" : "";

				// Get password, and then callback to show game page
				get_existing_password(CURR_GAME_ID);
				get_existing_media(CURR_GAME_ID);
				get_existing_edit_sheet_url(CURR_GAME_ID);
				get_existing_published_sheet_url(CURR_GAME_ID, demoParam);

				// Adjust visibility of sections
				mydoc.hideContent("#enter_game_name_section");
				mydoc.showContent("#edit_game_section");
				
			}, function(data){
				result = "Sorry, could not load game. Invalid ID!";
				set_loading_results(result);
			});
		}
		catch(error)
		{
			set_loading_results("Something went wrong:<br/>" + error);
		}		
	}

	function get_existing_media(card_id)
	{
		MyTrello.get_card_attachments(card_id, function(data){
			response = JSON.parse(data.responseText);

			response.sort(function(a,b){
				if(a["fileName"] < b["fileName"])
				{
					return -1;
				}
				if(a["fileName"] > b["fileName"])
				{
					return 1;
				}

				return 0;
			});

			response.forEach(function(obj){
				file_name = obj["fileName"];
				file_url  = obj["url"];
				file_id   = obj["id"];

				add_existing_media_to_page(file_id, file_name, file_url);
			});
		});
	}

	function get_existing_published_sheet_url(card_id, demoParam="")
	{
		MyTrello.get_card_custom_fields(card_id, function(data){
			response = JSON.parse(data.responseText);

			response.forEach(function(obj){
				let valueObject = obj["value"];
				let is_published_field = obj["idCustomField"] == MyTrello.custom_field_pub_url;
				let value = (valueObject.hasOwnProperty("text")) ? valueObject["text"] : "";
			
				if(is_published_field && value != "")
				{
					CURR_PUB_SHEET_URL = value;
					document.getElementById("game_url_value").value = value;
				}
			});
		});
	}

	function get_existing_edit_sheet_url(card_id)
	{
		MyTrello.get_card_custom_fields(card_id, function(data){
			response = JSON.parse(data.responseText);

			response.forEach(function(obj){
				let valueObject = obj["value"];
				let is_sheet_field = obj["idCustomField"] == MyTrello.custom_field_edit_url;
				let value = (valueObject.hasOwnProperty("text")) ? valueObject["text"] : "";
				
				if(is_sheet_field && value != "")
				{
					CURR_EDIT_SHEET_URL = value;
					document.getElementById("game_edit_sheet_value").value = value;
					document.getElementById("go_to_edit_sheet").href = value;
					document.getElementById("go_to_edit_sheet").innerText = "Go to Edit Sheet";
				}
			});
		});
	}

	function get_existing_password(game_id, callback=undefined)
	{

		MyTrello.get_card_custom_fields(game_id, function(data){
			response = JSON.parse(data.responseText);

			response.forEach(function(obj){
				let valueObject = obj["value"];
				let is_phrase_field = obj["idCustomField"] == MyTrello.custom_field_phrase;
				let value = (valueObject.hasOwnProperty("text")) ? valueObject["text"] : "";
				
				if(is_phrase_field && value != "")
				{
					CURR_GAME_PASSWORD = value;
					document.getElementById("game_pass_phrase").value = CURR_GAME_PASSWORD;
				}

				if(callback!=undefined)
				{
					callback();
				}
			});
		});
	}

	// Get the full URLs for playing/testing the game
	function get_game_url(gameID, type="", isTest=false)
	{
		let path = "";

		switch(type)
		{
			case "edit":
				path = `/host/edit.html?gameid=${gameID}`;
				break;
			case "demo":
				path = `/board/?gameid=${gameID}&demo=1`;
				break;
			case "play":
				path = `/board/?gameid=${gameID}`;
				break;
			case "host":
				path = `/board/host.html?gameid=${gameID}`;
				break;
			default:
				path = "/";
		}

		path += (isTest) ? "&test=1" : "";

		let fullURL = location.origin + path;
		console.log(path);
		console.log(fullURL);
		return fullURL

	}

	// Get the rules formatted to display on the page
	function get_formatted_rules(savedSettings)
	{
		// The HTML that will be returned 
		let rulesFormatted = "";

		let ruleKeys = Object.keys(Rules);
		ruleKeys.forEach(function(rule){

			// The ID for the select input of this rule
			let ruleInputID = rule.replaceAll(" ", "");
			
			let optionElements = "";
			let options = Rules[rule];
			let setting = {};

			// Get the individual setting that matches this key
			savedSettings.forEach(function(savedSetting){
				if(savedSetting["name"] == rule){
					setting = savedSetting
				}
			});
			// Loop through all the options
			options.forEach(function(option){

				let ruleID = option["id"];
				let label = option["label"];
				let rule = option["rule"];
				let type = option["type"];
				let suggestion = option["suggestion"];
				

				let selectedAttribute = (setting != undefined && (setting["option"] == ruleID) ) ? "selected" : "";
				let customValue = setting["value"] ?? "";

				optionElements += `<option value="${ruleID}" data-jpd-description="${rule}" data-jpd-type="${type}" data-jpd-custom-value="${customValue}" data-jpd-suggestion="${suggestion}" ${selectedAttribute}>
										${label}
									</option>`;
			});	

			// let showSuggestion = (suggestion.length > 0) ? "" : "hidden";

			inputElement = `<select id="${ruleInputID}" data-jpd-rule-name="${rule}" class="ruleOption" onChange="onRuleOptionChange(event)">
								${optionElements}
							</select>`

			// Set the row element to be returned;
			let row = `<tr>
							<th>${rule}</th>
							<td>
								${inputElement}
								<div class="rule_details_div">
									<p class="rule_detail rule_description"></p>
									<p class="rule_detail rule_suggestion hidden"></p>
									<input class="rule_custom hidden" type="text" placeholder="Enter custom \${VALUE} name="customValue" />
								</div>
							</td>
						</tr>`;
					// 	<td>
					// 	<input type="text" placeholder="Enter custom \${VALUE} name="customValue" class="hidden"/>
					// </td>
			rulesFormatted += row;
		});

		return rulesFormatted;
	}

	// Get a related child section 
	function get_sibling(sourceEle, siblingClassName)
	{
		let parent = sourceEle.parentElement;
		let sibling = parent.querySelector(`.${siblingClassName}`);
		return sibling;
	}

	// Get the saved rules as set on the page
	function get_saved_rules()
	{
		// Get all rule elements
		let ruleOptions = document.querySelectorAll(".ruleOption");

		// Place to store the saved rules
		let savedRules = [];

		ruleOptions.forEach(function(input){

			let ruleName = input.getAttribute("data-jpd-rule-name");
			let ruleOptionValue = input.value;
			let selectedOption = input.querySelector("option:checked");

			let ruleObj = {"name": `${ruleName}`, "option": ruleOptionValue};

			let isCustom = selectedOption.getAttribute("data-jpd-type")?.includes("custom") ?? false;

			if(isCustom)
			{
				let customInput = get_sibling(input, "rule_custom");
				ruleObj["value"] = customInput.value;
			}
			savedRules.push(ruleObj);
		});

		return savedRules;
	}

/************* HOST: SETTERS / DELETERS ************************************/ 

	// Delete the media
	function delete_media(mediaID)
	{
		remove_existing_media_from_page(mediaID);

		MyTrello.delete_attachment(CURR_GAME_ID, mediaID, function(data){
			response = JSON.parse(data.responseText);
		});
	}



/************* DOCUMENT OBJECT MODEL ***********************************/ 

	function add_existing_media_to_page(fileID, fileName, fileURL)
	{
		let game_media_list = document.getElementById("game_media");

		link = `<a href='${fileURL}' target="_blank">${fileName}</a>`;
		del  = `<i onclick="delete_media('${fileID}')" class="delete_media fa fa-trash"></i>`;
		row = `<li id="${fileID}">${link} &nbsp; ${del}</li>`;
		game_media_list.innerHTML += row;
	}

	function remove_existing_media_from_page(fileID)
	{
		try
		{
			document.getElementById(fileID).remove();
		} 
		catch(err)
		{
			Logger.log(err);
		}
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

	function set_loading_results(value)
	{
		toggle_loading_gif(true);
		let section = document.getElementById("loading_results_section");
		section.innerHTML = value;
	}

/******************** ATTEST ***********************************/ 

	// Validate New Game
	function validate_new_game()
	{
		Logger.log("Create Game");
		set_loading_results("");
		// document.getElementById("loading_results_section").innerText = "";

		toggle_loading_gif();

		let game_name = document.getElementById("given_game_name").value;
		let pass_phrase = document.getElementById("given_pass_phrase").value;

		let has_game_name = (game_name != undefined && game_name != "");
		let has_pass_phrase = (pass_phrase != undefined && pass_phrase != "");

		if(has_game_name && has_pass_phrase)
		{
			MyTrello.get_cards(MyTrello.admin_list_id, function(data){
				response = JSON.parse(data.responseText);

				let name_already_exists = false;
				response.forEach(function(obj){
					card_name = obj["name"];
					if(card_name.toLowerCase() == game_name.toLowerCase())
					{
						name_already_exists = true;
					}
				});

				if(!name_already_exists)
				{
					create_game(game_name, pass_phrase);
				}
				else
				{
					results = "Cannot Use This Game Name!<br/> Name Already Exists!";
					set_loading_results(results);
					// document.getElementById("loading_results_section").innerHTML = results;
					// toggle_loading_gif(true);

				}
			});
		}
		else
		{
			results = "Please enter a game name and a pass phrase!";
			set_loading_results(results);
			// document.getElementById("loading_results_section").innerHTML = results;
			// toggle_loading_gif(true);
		}	
	}

	// Check if something should be saved/updated
	function checkIfNewValue(elementID, savedValue)
	{
		let element = document.getElementById(elementID);
		let elementValue = element?.value?.trim() ?? savedValue;
		let isDifference = (elementValue != savedValue);

		if(!isDifference)
		{
			console.log(`${elementID} is up to date!`)
		}

		let newValueObj = {"isNewValue":isDifference, "value": elementValue }
		return newValueObj;
	}
