


var CURR_GAME_ID =  "";
var CURR_GAME_NAME = "";
var CURR_EDIT_SHEET_URL = "";
var CURR_PUB_SHEET_URL = "";
var CURR_GAME_PASSWORD = "";

var CURR_GAME_RULES =  undefined;
var USE_DEFAULT_RULES = true;

/*********************************************************************************
	HOST: ON PAGE LOAD
**********************************************************************************/ 
	
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

				response.sort(function(a,b){
					aName = a["name"].toLowerCase();
					bName = b["name"].toLowerCase();

					if(aName < b["name"])
					{
						return -1;
					}
					if(aName > bName)
					{
						return 1;
					}
					return 0;
				});

				let options = "";

				let game_id    = undefined;
				response.forEach(function(card){
					let card_name = card["name"];
					let card_id   = card["id"];

					options += `<option value=${card_id}>${card_name}</option>`;
				});
				
				games_select_list.innerHTML += options;
			});
		}
		catch(error)
		{
			set_loading_results("Sorry, something went wrong!\n\n"+error);
		}
	}


/*********************************************************************************
	HOST: LOAD GAME (to either PLAY or EDIT)
**********************************************************************************/ 

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
	function loadGame(action, isTestRun=false)
	{

		// Determine if this is a test game;
		let test_param = (isTestRun) ? "&test=1" : "";

		// Start Clear results if any & load GIF
		set_loading_results("");
		toggle_loading_gif();

		let credentials = getGameAndPassPhrase()
		let current_game_id = credentials["game_id"];
		let given_password = credentials["pass_phrase"];

		if (current_game_id != undefined)
		{
			// Set the option for new paths; 
			let playPath = "/board/?gameid=" + current_game_id + test_param;
			let editPath = "/host/edit.html?gameid=" + current_game_id;

			// Set up the new based on action path
			let newPath = (action == "play") ? 
						location.pathname.replace("/host/load.html", playPath) 
						: location.pathname.replace("/host/load.html", editPath);
			// Set the new URL
			let newURL = "http://" + location.host + newPath;

			CURR_GAME_ID = current_game_id;
			validate_password(current_game_id, given_password, function(){
				location.replace(newURL);
			});
		}
		else 
		{
			result = "Could not find a game with the given name!";
			set_loading_results(result);
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
				// toggle_loading_gif(true);
				result = "Invalid credentials for this game";
				set_loading_results(result);
				// document.getElementById("loading_results_section").innerText = result;
			}
		});
	}

/*********************************************************************************
	HOST: EDITING EXISTING GAME
**********************************************************************************/ 

	// Delete the media
	function delete_media(mediaID)
	{
		remove_existing_media_from_page(mediaID);

		MyTrello.delete_attachment(CURR_GAME_ID, mediaID, function(data){
			response = JSON.parse(data.responseText);
		});
	}

	// Format the game settings for 
	function formatSetting(settingObj)
	{
		let name = settingObj["name"];
		let type = Settings.GetSettingType(name);
		let builtin = settingObj["builtin"];
		let options = settingObj["options"];

		let disabledFlag = (builtin) ? "disabled" : "";

		// The elements
		let inputElement = "";

		if(type == "select")
		{
			let optionElements = ""
			options.forEach(function(value){
				optionElements += `<option value="${value}">${value}</option>`
			});	
			inputElement = `<select id="${name}" ${disabledFlag}>
								${optionElements}
							</select>`
		}
		else if (type == "number")
		{
			inputElement = `<input id="${name}" type="number" name="" ${disabledFlag}>`;
		}

		let row = `<tr>
						<th>${name}</th>
						<td>${inputElement}</td>
					</tr>`;

		return row;
	}


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

					let path = "/board/?gameid=" + card_id + demoParam;
					let hrefPlay = "http://" + location.host + location.pathname.replace("/host/edit.html",path);
					let hrefTest = hrefPlay + "&test=1";
					document.getElementById("test_game_button").href = hrefTest;
					document.getElementById("play_game_button").href = hrefPlay;
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

	//
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

				let selectedAttribute = (setting != undefined && (setting["option"] == ruleID) ) ? "selected" : "";
				let customValue = setting["value"] ?? "";

				optionElements += `<option value="${ruleID}" data-rule="${rule}" data-type="${type}" data-custom-value="${customValue}" ${selectedAttribute}>${label}</option>`
			});	

			inputElement = `<select id="${ruleInputID}" data-rule-name="${rule}" class="ruleOption" onChange="onRuleOptionChange(event)">
								${optionElements}
							</select>`

			// Set the row element to be returned;
			let row = `<tr>
							<th>${rule}</th>
							<td>
								${inputElement}
								<p class="hidden">
									<input type="text" placeholder="Enter custom \${VALUE} name="customValue"/>
								</p>
							</td>
							<td>
								<input type="text" placeholder="Enter custom \${VALUE} name="customValue" class="hidden"/>
							</td>
						</tr>`;

			rulesFormatted += row;
		});

		return rulesFormatted;
	}

	// Ensures the custom values are set/visible after loading rules
	function get_formatted_rules_customValue()
	{
		let selects = document.querySelectorAll(".ruleOption");

		selects.forEach(function(select){

			let selectedOption = get_selected_optionObject(select);

			if(selectedOption.isCustom)
			{
				let hiddenInput = get_hidden_input(select);
				hiddenInput.value = selectedOption.customValue;
				hiddenInput.classList.remove('hidden');
			}
		});
	}

	// Get the hidden input reserved for custom values.
	function get_hidden_input(selectEle)
	{
		let sibling = selectEle.nextElementSibling;
		let parent = selectEle.parentElement; // this would be the <td>
		let parentSibling = parent.nextElementSibling; // this would be the last <td> (with the hidden input);
		let hiddenInput = parentSibling.firstElementChild; // the hidden input;

		return hiddenInput;
	}

	// Get the selected game <option> element; Returns an object with the element and whether it allows for custom
	function get_selected_optionObject(selectEle)
	{
		let selectedOption = selectEle.querySelector("option:checked");

		let type = selectedOption.getAttribute("data-type");
		let attest = type.includes("custom");
	
		let customValue = selectedOption.getAttribute("data-custom-value");

		let optionObject = { 
								"element": selectedOption, 
								"isCustom": attest,
								"customValue": customValue
							};

		return optionObject;
	}

	// Load the game settings
	function loadGameSettings(settingsJSON=undefined)
	{
		console.log(settingsJSON);

		let table_body = document.getElementById("settings_table_body")

		table_body.innerHTML = get_formatted_rules(settingsJSON);

		// Ensure custom values are visible as well.
		get_formatted_rules_customValue()
	}

	// Listener for when the user changes an option on the settings section
	function onRuleOptionChange(event)
	{
		let sourceEle = event.srcElement;
		// let sibling = sourceEle.nextElementSibling;
		// let parent = sourceEle.parentElement; // this would be the <td>
		// let parentSibling = parent.nextElementSibling; // this would be the last <td> (with the hidden input);
		let hiddenInput = get_hidden_input(sourceEle);
		//  parentSibling.firstElementChild; // the hidden input;

		// Check if selected option is custom
		let isCustom = selectedOptionHasCustomValue(sourceEle);

		if(isCustom)
		{
			hiddenInput.classList.remove("hidden");
		}
		else
		{
			hiddenInput.classList.add("hidden");
		}
	}


	// Handler for saving the game components
	function save_game()
	{
		// Disable the save button
		let save_button = document.getElementById("save_game_button");
		save_button.disabled = true;

		// Show the loading GIF
		toggle_saving_gif();

		// Save the different components
		save_game_component("GameName", CURR_GAME_NAME, "game_name_value");
		save_game_component("PassPhrase", CURR_GAME_PASSWORD, "game_pass_phrase");
		save_game_component("PublishedSheetURL", CURR_PUB_SHEET_URL, "game_url_value");
		save_game_component("EditSheetURL", CURR_EDIT_SHEET_URL, "game_edit_sheet_value");
		save_game_component("GameSettings", "", "settings_identifier");

		setTimeout(function(){
			save_button.disabled = false;
			toggle_saving_gif(true);
		}, 2000);
	}

	// Save an individual game component, based on passed in values
	function save_game_component(componentName, currValue, fieldID)
	{

		let element = document.getElementById(fieldID);
		let isDiffValue = (element != undefined && element.value != undefined && (currValue != element.value));

		if(isDiffValue)
		{
			let new_value = element.value.trim();

			switch(componentName)
			{
				case "GameName":
					MyTrello.update_card_name(CURR_GAME_ID, new_value);
					CURR_GAME_NAME = new_value;
					break;
				case "PassPhrase":
					MyTrello.update_card_custom_field(CURR_GAME_ID,MyTrello.custom_field_phrase,new_value);
					CURR_GAME_PASSWORD = new_value;
					break;
				case "PublishedSheetURL":
					MyTrello.update_card_custom_field(CURR_GAME_ID,MyTrello.custom_field_pub_url,new_value);
					CURR_PUB_SHEET_URL = new_value;
					break;
				case "EditSheetURL":
					MyTrello.update_card_custom_field(CURR_GAME_ID,MyTrello.custom_field_edit_url,new_value);
					CURR_EDIT_SHEET_URL = new_value;
					break;
				case "GameSettings":
					saveGameSettings();
					break;
				default:
					Logger.log("Saving Game Component: NO COMPONENT FOUND WITH NAME: " + componentName);
					break;
			}
		}
	}


	function saveGameSettings()
	{
		try
		{
			// Get all rule elements
			let ruleOptions = document.querySelectorAll(".ruleOption");

			let savedRules = [];

			ruleOptions.forEach(function(input){

				let ruleName = input.getAttribute("data-rule-name");
				let ruleOptionValue = input.value;

				let ruleObj = {"name": `${ruleName}`, "option": ruleOptionValue};

				let isCustom = selectedOptionHasCustomValue(input);

				if(isCustom)
				{
					let hiddenInput = get_hidden_input(input);
					ruleObj["value"] = hiddenInput.value;
				}
				savedRules.push(ruleObj);
			});

			let savedRulesJSON = JSON.stringify(savedRules);
			MyTrello.update_card_description(CURR_GAME_ID, savedRulesJSON);

		}
		catch(error)
		{
			console.log(error);
		}
	}

	// Takes in a <select> and checks if the current option has a data-type with custom in the wording
	function selectedOptionHasCustomValue(sourceEle)
	{
		let selectedOption = sourceEle.querySelector("option:checked");

		let type = selectedOption.getAttribute("data-type");
		let attest = type.includes("custom");
		return attest;
	}


/*********************************************************************************
	DOCUMENT OBJECT MODEL
**********************************************************************************/ 

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


/*********************************************************************************
	HOST: CREATE GAME
**********************************************************************************/ 

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

