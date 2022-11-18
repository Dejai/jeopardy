


// Used for the card that has all the game details
var CURR_GAME_ID =  "";
var CURR_GAME_NAME = "";

// Used for the instance of a game
var CURR_GAME_LIST_ID = "";

var CURR_EDIT_SHEET_URL = "";
var CURR_PUB_SHEET_URL = "";
var CURR_GAME_PASSWORD = "";
var CURR_MEDIA_CHECKLIST_ID = "";

var CURR_GAME_CODE = "";

var TRELLO_IDS = {};

var CURR_GAME_RULES =  undefined;
var USE_DEFAULT_RULES = true;

// The instance of this jeopardy game
var JeopardyGame;
var CurrentSection = "edit_section_game_details"; //default first tab of edit page

/****************  HOST: ON PAGE LOAD ****************************/ 
	
	mydoc.ready(function()
	{
		// Set board name
		MyTrello.SetBoardName("jeopardy");

		// Loading up this page based on pathname;
		let path = location.pathname;
		onKeyboardKeyup();

		if (path.includes("/host/edit"))
		{
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
				// Navigate to load page if no game ID
				location.href = "/host/load";
			}
		}

		// If loading the game, 
		if (path.includes("/host/load"))
		{
			onGetListOfGames();
		}
	});

	// Prevent the page accidentally closing
	function onClosePage(event)
	{
		event.preventDefault();
		event.returnValue='';
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



/****** GET ACTIONS: Get list of content & core setup things ****************************/ 

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
		console.log("Getting the game!");
		try
		{
			// Query Trello for this card
			MyTrello.get_single_card(gameID,(data) => {

				// If we got the game (i.e. card) .. get the details
				response = JSON.parse(data.responseText);
				console.log(response);
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

			// Get the attachments details;
			var attachments = cardResponse["attachments"];
			var attachmentMapping = HostUtility.getAttachmentMapping(attachments);
			
			// Loop through the list of attachments and load them up
			var theFiles = ["config.json", "media.json", "categories.json"];
			theFiles.forEach( (fileName) =>{
				// Get the individual map for a config file; 
				let map = attachmentMapping[fileName] ?? undefined;
				if(map != undefined){ onGetGameFile(map.cardID, map.attachmentID, map.fileName); }
			});

			console.log(JeopardyGame);

			// Set things:
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
			},1500);
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

				// The file with the game rules
				if(fileName == "config.json")
				{
					JeopardyGame.config.createConfiguration(response);
					JeopardyGame.config.setAttachmentID(attachmentID);
					
					// Set the game rules after the config is setup
					onSetGameRules();
				}

				// The file with images/audio
				else if(fileName == "media.json")
				{
					JeopardyGame.media.setMedia(response);

					// Set the media after loading
					onSetGameMedia();
				}

				// The file with the categries/questions/answers
				else if(fileName = "categories.json")
				{
					JeopardyGame.createCategories(response);
				}


			}, (err) => {
				console.error("Could not find config file");
			});	
		} catch (error) {
			
		}
	}


/*** SET ACTIONS: Setting the key game details after page load ********/

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
		let formattedRules = HostUtility.getFormattedRules();
		let existingRow = mydoc.getContent("#settings_table_body")?.innerHTML ?? "";
		mydoc.setContent("#settings_table_body", {"innerHTML": (existingRow + formattedRules)});


		// Show the details upon initial load
		let selects = document.querySelectorAll(".ruleOption");
		// Loops through all options and shows details
		selects.forEach((obj) =>{
			onToggleRuleOptionDetails(obj);
		});
		// onShowRuleDetails();
	}

	// Set the game media
	function onSetGameMedia()
	{

		var mediaContent = "";
		
		// Get any existing media content
		var existingContent = mydoc.getContent("#game_media")?.innerHTML ?? "";

		// Get the list of media files
		var mediaFiles = JeopardyGame.media.getListOfMedia();

		// Sort the media
		mediaFiles.sort( (a,b)=>{
			if(a["name"] < b["name"]){ return -1; }
			if(a["name"] > b["name"]){ return 1; }
			return 0;
		});

		// Loop through the files and build a row
		mediaFiles.forEach( (file)=>{

			let fileSrc = file.src;
			let fileName = file.name;
			let fileType = file.type;

			let link = `<a href='${fileSrc}' target="_blank">${fileName}</a>`;
			let del  = `<i onclick="onDeleteMedia('${fileName}')" class="delete_media fa fa-trash"></i>`;
			let row = `<li id="${fileName}">${link} &nbsp; ${del}</li>`;
			mediaContent += row;
		});

		// Set the content
		mydoc.setContent("#game_media", {"innerHTML": (existingContent + mediaContent)});
	}


/*** SAVE ACTIONS: Saving the game details ********/

	// The general save -- keeps track of diffs & saves accordingly
	function onSaveGame2()
	{
		// Switch what to save based on the section
		switch(CurrentSection)
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
				if( HostUtility.hasDifferentConfigValues() ){ onSaveConfig(); }
				break;
			default:
				console.log("Meh?");
		}

	}

	// Save the game name
	function onSaveGameName(newName)
	{
		console.log("Updating game Name");

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
		console.log("Updating Pass Phrase");

		let gameID = JeopardyGame.getGameID();

		MyTrello.update_card_custom_field_by_name(gameID, "Pass Phrase", newValue, (data)=> {

			if(data.status >= 200 && data.status < 300)
			{
				console.log("Updated custom field == " + customFieldName);
			}
		});
	}

	// Save the config
	function onSaveConfig()
	{
		var gameID = JeopardyGame.getGameID();
		var jsonData = JeopardyGame.config.getConfigJSON();
		var fileName = "config.json";
		var currAttachmentID = JeopardyGame.config.getAttachmentID();

		console.log("Making updates to config file");
		console.log("Old attachment id: " + currAttachmentID);

		// Save the config file
		MyTrello.create_card_attachment(gameID,fileName,jsonData,(data)=>{
			if(data.status >= 200 && data.status < 300)
			{
				console.log("Updated config JSON");
				let newConfig = myajax.GetJSON(data.responseText);
				console.log(newConfig);
				JeopardyGame.config.setAttachmentID(newConfig.id);
				console.log("New attachment id: " + newConfig.id);
				MyTrello.delete_card_attachment(JeopardyGame.gameID,currAttachmentID,(data)=>{
					console.log(data.responseText);
				});

			}
		}, (err)=>{ console.error(err);});
	}


/***** The function to switch between tabs */
	// Toggle the tabs -- KEEP
	function onSwitchTab(event)
	{
		let target = event.target;

		// Make sure we attempt a save before we navigate away
		onSaveGame2();

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

		// Set the current section
		CurrentSection = targetSection;
	}


/****** HELPER OBJECT: Simplifing approach for hosting ****************************/ 

	const HostUtility = 
	{
		getAttachmentMapping: (attachmentsList)=>{
			var attachmentMap = {}
			attachmentsList.forEach( (att)=> {
				// Expected pattern: 1/cards/<CARD-ID>/attachments/<ATTACHMENT-ID>/download/<FILENAME>
				var url = att.url;
				var values = url.substring(url.indexOf("1")+2).split("/")
				
				// Get the key parts of the json file to load
				let cardID = values[1];
				let attachmentID = values[3];
				let fileName = values[5];

				let obj = {"cardID": cardID, "attachmentID": attachmentID, "fileName":fileName}
				attachmentMap[att.fileName] = obj;
			});

			return attachmentMap;
		},

		getFormattedRules: ()=>{
			let rulesFormatted = "";

			// Get the set of rules for the game
			let ruleKeys = Object.keys(Rules);
			ruleKeys.forEach( (rule) => {

				let ruleKey = Utility.getKeyName(rule);

				// The ID for the select input of this rule
				let ruleInputID = ruleKey;

				// Get the corresponding saved config for this rule
				let savedConfig = JeopardyGame.config.getConfiguration(ruleInputID)

				let optionElements = "";

				// Get the list of options available for this rule;
				let ruleOptions = Rules[rule];
				ruleOptions.forEach( (option)=>{

					let optionID = option["id"];
					let label = option["label"];
					let rule = option["rule"];
					let type = option["type"];
					let suggestion = option["suggestion"];
					let isSelected = (savedConfig.option == optionID);
					

					let selectedAttribute = (isSelected) ? "selected" : "";
					let customValue = savedConfig["value"] ?? "";
					customValue = (isSelected) ? customValue : "";

					optionElements += `<option value="${optionID}" data-jpd-description="${rule}" data-jpd-type="${type}" data-jpd-custom-value="${customValue}" data-jpd-suggestion="${suggestion}" ${selectedAttribute}>
											${label}
										</option>`;
				});	

				inputElement = `<select id="${ruleInputID}" data-jpd-rule-name="${rule}" class="ruleOption input_mash" onChange="onRuleOptionChange(event)">
									${optionElements}
								</select>`

				// Set the row element to be returned;
				let row = `<tr>
								<th>
										<h3>${rule}</h3>
										<p>&nbsp;</p>
								</th>
								<td>
									${inputElement}
									<div class="rule_details_div">
										<p class="rule_detail rule_description"></p>
										<p class="rule_detail rule_suggestion hidden"></p>
										<input class="rule_custom hidden" type="text" placeholder="Enter custom \${VALUE} name="customValue" />
									</div>
								</td>
							</tr>`;
				rulesFormatted += row;
			});

			return rulesFormatted;
		},

		getSettingObject: (setting)=>{

		},

		// Quickly compare two value
		isDiffValues: (a,b)=>{
			return (a.toString() != b.toString());
		},

		hasDifferentConfigValues: ()=>{

			var hasDifferences = false;

			let ruleOptions = document.querySelectorAll(".ruleOption");
			let keys = []
			ruleOptions.forEach( (obj)=>{

				// Get the rule as seen on the form
				let optionVal = obj.value; 
				let ruleObj = {"option": optionVal}
				let customInput = getSibling(obj,"rule_custom")?.value ?? "";
				if(customInput != ""){ ruleObj["value"] = customInput; }
				// console.log(ruleObj);

				// Get the saved value
				let savedObj = JeopardyGame.config.getConfiguration(obj.id)
				// console.log(savedObj);
				// console.log("------");

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
	function loadGame(action, samePageLoad=false)
	{
		// Start Clear results if any & load GIF
		set_loading_results("");
		toggle_loading_gif();

		let credentials = getGameAndPassPhrase()
		let current_game_id = credentials["game_id"];
		let given_password = credentials["pass_phrase"];

		if (current_game_id != undefined && current_game_id != "")
		{
			CURR_GAME_ID = current_game_id;
			validate_password(current_game_id, given_password, ()=>{
				onNavigateToGameURL(action, samePageLoad);
			});
		}
		else 
		{
			result = "Please select from the list of available games.";
			set_loading_results(result);
		}
	}

	// // Load the details for editing the game details:
	function loadEditGamePage(response)
	{
		// Get password, and then callback to show game page
		getPassPhraseFromTrello(CURR_GAME_ID);
		getEditSheetUrlFromTrello(CURR_GAME_ID);
		getPublishedUrlFromTrello(CURR_GAME_ID);

		// Adjust visibility of sections
		mydoc.hideContent("#enter_game_name_section");
		mydoc.showContent("#edit_game_section");
	}

	// Load the game settings
	function loadGameSettings(settingsJSON=undefined)
	{
		let table_body = document.getElementById("settings_table_body")

		table_body.innerHTML += getFormattedRules(settingsJSON);

		onShowRuleDetails(); // Ensure values are displayed;
	}

	// Create the new game;
	function createNewGameCard(game_name, pass_phrase)
	{

		MyTrello.get_list_by_name("ADMIN_LIST", (listData)=>{

			let listResp = JSON.parse(listData.responseText);
			let listID = listResp[0]?.id;

			MyTrello.create_card(listID, game_name, (data) => 
			{
				response = JSON.parse(data.responseText);
				game_id = response["id"];

				// Get the URL to use once created;
				load_url = getGameUrl(game_id, "edit");

				// Update the description with the default settings
				let defaultRules = Settings.GetDefaultSettings();
				MyTrello.update_card_description(game_id, defaultRules);

				// Add the pass to the custom field
				MyTrello.update_card_custom_field_by_name(game_id, "Pass Phrase", pass_phrase, (updateData)=>{

					if(updateData.status == 200)
					{
						console.log("Updated custom field == Pass Phrase");
					}
				});

				// Also add a new checklist
				MyTrello.create_checklist(game_id, (data) =>{

					// Navigate to new page once created
					setTimeout(function(){
						location.replace(load_url);
					}, 2000);
				});				
			});
		});
	}

	// Create a new instance of a game
	function createNewGameInstance(successCallback)
	{
		CURR_GAME_CODE = Helper.getCode();
		MyTrello.create_list(CURR_GAME_CODE, (data)=>{
			
			// Get the list ID;
			let response = JSON.parse(data.responseText);
			CURR_GAME_LIST_ID = response["id"] ?? undefined;

			if(CURR_GAME_LIST_ID != undefined)
			{
				// Create the game card
				let newGameInstanceName = `GAME_CARD_${CURR_GAME_CODE} | ${CURR_GAME_NAME}`;
				MyTrello.create_card(CURR_GAME_LIST_ID, newGameInstanceName,(newCardData)=>{

					let newGameResp = JSON.parse(newCardData.responseText);
					let gameCardID = newGameResp["id"];

					if(gameCardID != undefined)
					{
						let gameSettings = getSavedSettings();
						// Update the description with the game's settings
						MyTrello.update_card_description(gameCardID, gameSettings, (cardData)=>{

							// Do whatever callback is sent in next;
							successCallback();
						});
					}
				});
			}
		});
	}

	// Use the test game instance for a test run
	function createTestGameInstance(successCallback)
	{
		MyTrello.get_list_by_name( "TEST", (data)=>{

			let listsResp = JSON.parse(data.responseText);
			let listID = listsResp[0]?.id;

			CURR_GAME_LIST_ID = listID;

			// Get the TEST game card and update
			if(CURR_GAME_LIST_ID != null)
			{

				// The name of the card's game instance;
				let newGameInstanceName = `GAME_CARD_TEST | ${CURR_GAME_NAME}`;
				let gameSettings = getSavedSettings();

				// Check if card exists
				MyTrello.get_cards(CURR_GAME_LIST_ID, (existingCards)=>{

					let cards = JSON.parse(existingCards.responseText);
					let singleCard = cards.filter( (val)=>{
						return (val.name == newGameInstanceName)
					});

					// If card exiss, just update desc;
					if(singleCard.length == 1)
					{
						MyTrello.update_card_description(singleCard[0].id, gameSettings, (data)=>{
							// Do whatever callback is sent in next;
							successCallback();
						});
					}
					
					// Otherwise, just create new
					else
					{
						MyTrello.create_card(CURR_GAME_LIST_ID, newGameInstanceName,(newCardData)=>{

							let newGameResp = JSON.parse(newCardData.responseText);
							let gameCardID = newGameResp["id"];
		
							if(gameCardID != undefined)
							{
								// Update the description with the game's settings
								MyTrello.update_card_description(gameCardID, gameSettings, (cardData)=>{
		
									// Do whatever callback is sent in next;
									successCallback();
								});
							}
						});

					}
				});				
			}
		});
	}

/************* HOST: EVENT LISTENERS ************************************/ 


	// Open a game URL
	function onNavigateToGameURL(action, samePageLoad=false)
	{

		let isTest = (action == "test");
		let type = (isTest) ? "play" : action;

		// Get the right URL;
		let newURL = getGameUrl(CURR_GAME_ID, type, isTest);
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

	// Test a game
	function onTestGame()
	{
		loading_html = `<img class="component_saving_gif" src="../assets/img/loading1.gif" style="width:25%;height:25%;">`;

		MyNotification.notify("#test_game_loading", loading_html);
		mydoc.hideContent("#test_game_button");

		createTestGameInstance( ()=>{
			onNavigateToGameURL('test');
		});

		setTimeout(()=>{
			MyNotification.clear("#test_game_loading");
			mydoc.showContent("#test_game_button");

		},3000);
	}

	// Play a real game;
	function onPlayGame()
	{
		let canPlay = onConfirmForPlay();
		if(canPlay)
		{
			mydoc.hideContent("#play_game_confirmation_error");


			loading_html = `<img class="component_saving_gif" src="../assets/img/loading1.gif" style="width:25%;height:25%;">`;
			MyNotification.notify("#play_game_loading", loading_html);
			mydoc.hideContent("#play_button");

			
			// Create the game instance and then 
			createNewGameInstance( ()=>{
				onNavigateToGameURL("play");
			});

			setTimeout(()=>{
				MyNotification.clear("#play_game_loading");
				mydoc.showContent("#play_button");
			},2000);

		}
		else
		{
			mydoc.showContent("#play_game_confirmation_error");
			return;
		}

	}

	// Open the board
	function onOpenBoard()
	{
		onNavigateToGameURL("play");
	}

	// Open the host view
	function onOpenHostView()
	{
		onNavigateToGameURL("host");
	}

	// Confirming that things are ready to play
	function onConfirmForPlay()
	{
		let confirmSetting = document.querySelector("#confirm_settings");
		let confirmTest = document.querySelector("#confirm_testing");
		let confirmReal = document.querySelector("#confirm_real_game");
		let button = document.querySelector("#play_button");

		// Confirm if all checked;
		let allChecked = confirmSetting.checked && confirmTest.checked && confirmReal.checked

		// Update color of button according to clickability
		if(allChecked)
		{
			button.classList.remove("dlf_button_gray");
			button.classList.add("dlf_button_limegreen");
			mydoc.hideContent("#play_game_confirmation_error");
		}
		else
		{
			button.classList.add("dlf_button_gray");
			button.classList.remove("dlf_button_limegreen");
		}

		return allChecked;
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
		let ruleDescParagraph = getSibling(sourceEle, "rule_description");
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
				console.log("Show Buzz!");
			}
			else
			{
				mydoc.addClass(".host_view_section", "hidden")
			}
		}

		// Check if suggestion is included;
		let suggestionParagraph = getSibling(sourceEle, "rule_suggestion");
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
		let customInput = getSibling(sourceEle, "rule_custom");
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
	function onSaveGame(event)
	{
		let target = event.target;
		let parent = target?.parentElement;


		let original_html = parent.innerHTML;
		let identifier = parent.id;

		// Start the loading process
		loading_html = `
			<span>Saving </span>
			<img class="component_saving_gif" src="../assets/img/loading1.gif" style="width:5%;height:5%;">
			`;
		MyNotification.notify(`#${identifier}`, loading_html, "notify_orange");

		
		if(identifier == "save_game_details")
		{
			onSaveGameComponent("GameName");
			onSaveGameComponent("PassPhrase");
			onSaveGameComponent("PublishedSheetURL");
			onSaveGameComponent("EditSheetURL");
		}
		else
		{
			onSaveGameComponent("GameSettings");
		}

		// Finally, end the save mode
		setTimeout(()=>{
			MyNotification.clear(`#${identifier}`, "notify_orange");
			MyNotification.notify(`#${identifier}`, "<span>DONE!</span>", "notify_limegreen");

			setTimeout(()=>{
				MyNotification.clear(`#${identifier}`, "notify_limegreen");
				document.getElementById(identifier).innerHTML = original_html;
				
				showEditPageSections(); // See if we can show other sections now;
			},1500)
		}, 2500);
	}

	// function New way to save game component
	function onSaveGameComponent(componentName)
	{
		let identifier = undefined;
		let savedValue = undefined;
		let fieldValue = undefined;
		let isDiffValue = false;
		let customFieldName = undefined; // used to update custom fields



		let updateFunc = undefined;
		let expectedParams = 2;
		let parameters = [CURR_GAME_ID];


		let isUpdate = false; // by default, nothing to update;
		let timeout = 1000; //default timeout of 1 second;

		// PLAN --- break this out to IF/ELSE statment for updating things

		switch(componentName)
		{
			case "GameName":
				identifier = "game_name_value";
				savedValue = CURR_GAME_NAME;
				fieldValue = document.getElementById(identifier)?.value ?? savedValue;
				isDiffValue = compareFieldValue(savedValue, fieldValue);
				CURR_GAME_NAME = (isDiffValue) ? fieldValue : savedValue;
				break;

			case "PassPhrase":
				identifier = "game_pass_phrase";
				customFieldName = "Pass Phrase";
				savedValue = CURR_GAME_PASSWORD;
				fieldValue = document.getElementById(identifier)?.value ?? savedValue;
				isDiffValue = compareFieldValue(savedValue, fieldValue);
				CURR_GAME_PASSWORD = (isDiffValue) ? fieldValue : savedValue;
				break;
			case "PublishedSheetURL":
				identifier = "game_published_url_value";
				customFieldName = "Published URL";
				savedValue = CURR_PUB_SHEET_URL;
				fieldValue = document.getElementById(identifier)?.value ?? savedValue;
				isDiffValue = compareFieldValue(savedValue, fieldValue);
				CURR_PUB_SHEET_URL = (isDiffValue) ? fieldValue : savedValue;
				break;

			case "EditSheetURL":
				identifier = "game_edit_sheet_url_value";
				customFieldName = "Edit URL";
				savedValue = CURR_EDIT_SHEET_URL;
				fieldValue = document.getElementById(identifier)?.value ?? savedValue;
				isDiffValue = compareFieldValue(savedValue, fieldValue);
				CURR_EDIT_SHEET_URL = (isDiffValue) ? fieldValue : savedValue;
				break;
			case "GameSettings":
				identifier = "settings_identifier";
				savedValue = CURR_EDIT_SHEET_URL;
				fieldValue = document.getElementById(identifier)?.value ?? savedValue;
				isDiffValue = true;
				break;
			default:
				Logger.log("Could not set values");
		}


		// Running the fuctions based on if a new value is present
		if(isDiffValue)
		{
			if(customFieldName != undefined)
			{

				MyTrello.update_card_custom_field_by_name(CURR_GAME_ID, customFieldName, fieldValue, (data)=> {

					if(data.status >= 200 && data.status < 300)
					{
						console.log("Updated custom field == " + customFieldName);
					}
				});
			}
			else if (identifier == "settings_identifier")
			{
				let savedRulesJSON = getSavedSettings();
				MyTrello.update_card_description(CURR_GAME_ID,savedRulesJSON,(data)=>{
					if(data.status >= 200 && data.status < 300)
					{
						console.log("Updated game settings: ");
						console.log(savedRulesJSON);
					}
				});
			}
			else if (identifier == "game_name_value")
			{
				MyTrello.update_card_name(CURR_GAME_ID,fieldValue, (data)=>{
					if(data.status >= 200 && data.status < 300)
					{
						console.log("Updated game name: " + fieldValue);
					}
				} )
			}
		}

		// Then check if updates should be made; 
		// if(isUpdate && (parameters.length == expectedParams) )
		// {
		// 	timeout = 3000; // make the timeout longer; 
		// 	updateFunc(...parameters);
		// }

	}	

	// Toggle the state of each component being saved;
	function onToggleSaveComponentState(identifier, isSaving=false)
	{
		// Get the related element and parent;
		let element = document.querySelector(`${identifier}`);
		let parent = element?.parentElement;

		if(parent != undefined)
		{
			let saving_gif = document.querySelector('.component_saving_gif');
			let save_button = document.querySelector(".save_button");

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

	// Delete the media
	function onDeleteMedia(mediaID)
	{
		remove_existing_media_from_page(mediaID);

		// Set a card's checklist item to "complete" (i.e. deleted)
		MyTrello.update_checklist_item_state(CURR_GAME_ID, mediaID, true);
	}

	// Syncing the game media for this game
	function onSyncGameMedia()
	{
		if(CURR_MEDIA_CHECKLIST_ID != "")
		{

			loading_html = `
				<span>Syncing</span>
				<img class="component_saving_gif" src="../assets/img/loading1.gif" style="width:5%;height:5%;">
				`;
			MyNotification.notify("#syncNotifier", loading_html, "notify_orange");

			// First, get the list of media already in Trello
			MyTrello.get_card_checklist_items(CURR_MEDIA_CHECKLIST_ID, (data) =>{

				response = JSON.parse(data.responseText);

				// Set the existing media as a list of objects
				existing_media = {};
				response.forEach(function(obj) {
					state = obj["state"];
					file_id = obj["id"]
					checklist_details = obj["name"]?.split(" ~ ") ?? ["", ""];
					file_name = checklist_details[0];
					file_url = checklist_details[1];

					existing_media[file_name] = {
						"id": file_id,
						"state": state,
						"url": file_url
					}
				});

				// Next, get the data from the Spreadsheet  get the Spreadsheet values;
				MyGoogleDrive.getSpreadsheetData(MyGoogleDrive.uploadedMediaURL, (data) =>{
					
					spreadSheetData = MyGoogleDrive.formatSpreadsheetData(data.responseText);
					rows =  spreadSheetData["rows"];

					// Filter the rows to only the ones for this game;
					rows = MyGoogleDrive.filterRowsByColumnValue(rows,"Game ID", CURR_GAME_ID);

					// Loop through rows to check if media is to be synced
					for(let idx=0; idx < rows.length; idx++)
					{
						row = rows[idx]; // get single row

						// Process the current file to check if it should be updated or created
						file_name = row["File Name"];
						// file_url = MyGoogleDrive.formatURL(row["Type of File"], row["Upload File"]);
						file_type = row["Type of File"]
						file_url = row["Upload File"]

						checklist_entry = file_name + " ~ " + file_type + " ~ " + file_url;

						// Check if file already exists (based on name);
						existing_file = existing_media[file_name] ?? undefined;

						// If entry not there, create it
						if(existing_file == undefined)
						{
							add_game_media(checklist_entry);
						}
						else
						{
							different_url = (file_url != existing_file["url"]);

							// If different URL, update entry
							if(different_url)
							{
								update_game_media(existing_file["id"], checklist_entry);

								// If item was previously "deleted", set it back to "incomplete" 
								if( (existing_file["state"] == "complete") )
								{
									MyTrello.update_checklist_item_state(CURR_GAME_ID, existing_file["id"], false);
								}
							}
							else
							{
								Logger.log("File up-to-date");
							}
						}
					}


					MyNotification.clear("#syncNotifier", "notify_orange");
					MyNotification.notify("#syncNotifier", "Synced", "notify_limegreen");
					
				});

			});
		}
	}
	
/************* HOST: GETTERS ************************************/ 

	// Get the existing pass phrase for the game
	function getPassPhraseFromTrello(game_id, callback=undefined)
	{
		MyTrello.get_card_custom_field_by_name(game_id, "Pass Phrase", (data) => {
			
			let response = JSON.parse(data.responseText);
			let value = response[0]?.value?.text ?? "";
			if(value != "")
			{
				CURR_GAME_PASSWORD = value;
				document.getElementById("game_pass_phrase").value = CURR_GAME_PASSWORD;
			}
			if(callback!=undefined)
			{
				callback();
			}
		});
	}

	// Get the full URLs for playing/testing the game
	function getGameUrl(gameID, type="", isTest=false)
	{
		let path = "";

		switch(type)
		{
			case "edit":
				path = `/host/edit.html?gameid=${gameID}`;
				break;
			case "play":
				path = `/board/?gameid=${gameID}&listid=${CURR_GAME_LIST_ID}`;
				break;
			case "host":
				path = `/board/host.html?gameid=${gameID}`;
				break;
			default:
				path = "/";
		}

		// Add TEST flag if applicable;
		path += (isTest) ? "&test=1" : "";

		let fullURL = location.origin + path;
		return fullURL

	}

	// Get a related child section 
	function getSibling(sourceEle, siblingClassName)
	{
		let parent = sourceEle.parentElement;
		let sibling = parent.querySelector(`.${siblingClassName}`);
		return sibling;
	}

	// Get the saved rules as set on the page
	function getSavedSettings()
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
				let customInput = getSibling(input, "rule_custom");
				ruleObj["value"] = customInput.value;
			}
			savedRules.push(ruleObj);
		});

		// Convert to JSON
		return JSON.stringify(savedRules);
	}

/************* HOST: SETTERS / DELETERS ************************************/ 

	// Adding media for the game as a checklist item
	function add_game_media(mediaName)
	{
		// Leverage Trello call to create a checklist item;
		MyTrello.create_checklist_item(CURR_MEDIA_CHECKLIST_ID, mediaName);		
	}

	// Update the value for a game checklist item
	function update_game_media(mediaID, newValue)
	{
		MyTrello.update_checklist_item_value(CURR_GAME_ID, mediaID, newValue);

	}


/************* DOCUMENT OBJECT MODEL ***********************************/ 

	function add_existing_media_to_page(content)
	{
		let game_media_list = document.getElementById("game_media");
		if(game_media_list != undefined)
		{
			game_media_list.innerHTML = content;
		}
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
		section.parentElement.classList.remove("hidden");
		section.innerHTML = value;
	}

	// Show the edit page sections, depending on what value is set
	function showEditPageSections()
	{
		let editURL = document.getElementById("game_edit_sheet_url_value");
		let pubURL = document.getElementById("game_published_url_value");

		// Always show the edit table; 
		// Only Name and Pass Phrase will be visible by default; 
		mydoc.showContent("#edit_game_details_table");

		// Hide the loading
		mydoc.hideContent("#load_game_section");

		// When things are EMPTY
		if(editURL.value == "" || pubURL.value == "")
		{
			mydoc.hideContent("#host_edit_tab_section");
			mydoc.hideContent(".section_description_row");

			// Hide things specifically for Edit Url state
			if(editURL.value == "")
			{
				// Show the edit URL instructions
				mydoc.showContent(".game_details_step1_instruction");
				mydoc.hideContent(".game_details_step2");
				mydoc.hideContent("#go_to_edit_sheet"); // the link to open edit sheet;

			}
		}

		// When things are NOT EMPTY
		if(editURL.value != "" && pubURL.value != "")
		{
			
			// Show the all the sections
			mydoc.showContent("#host_edit_tab_section");
			mydoc.showContent(".game_details_step2");
			mydoc.showContent(".section_description_row");
			mydoc.showContent("#go_to_edit_sheet"); // the link to open edit sheet;

			// Hide instructions
			mydoc.hideContent(".game_details_step1_instruction");
			mydoc.hideContent(".game_details_step2_instruction");
		}
		else if (editURL.value != "" && pubURL.value == "")
		{
			// hide instructinos
			mydoc.hideContent(".game_details_step1_instruction");

			mydoc.showContent(".game_details_step2_instruction");
			mydoc.showContent(".game_details_step2");
			mydoc.showContent("#go_to_edit_sheet"); // the link to open edit sheet;
		}
	}

/******************** ATTEST ***********************************/ 

	// Validate New Game
	function validate_new_game()
	{
		Logger.log("Create Game");
		set_loading_results("");
		toggle_loading_gif();

		let game_name = document.getElementById("given_game_name").value;
		let pass_phrase = document.getElementById("given_pass_phrase").value;

		let has_game_name = (game_name != undefined && game_name != "");
		let has_pass_phrase = (pass_phrase != undefined && pass_phrase != "");

		if(has_game_name && has_pass_phrase)
		{
			MyTrello.get_list_by_name( "ADMIN_LIST", (data)=>{

				let listsResp = JSON.parse(data.responseText);
				let listID = listsResp[0]?.id;

				if(listID != undefined)
				{
					MyTrello.get_cards(listID, (data2) => {

						let response = JSON.parse(data2.responseText);
						let existing = response.filter((val)=>{
							return (val.name.toLowerCase() == game_name.toLowerCase());
						});
	
						if(existing.length == 0)
						{
							createNewGameCard(game_name, pass_phrase);
						}
						else
						{
							results = "Cannot Use This Game Name!<br/> Name Already Exists!";
							set_loading_results(results);
						}					
					});
				}
			});
		}
		else
		{
			results = "Please enter a game name and a pass phrase!";
			set_loading_results(results);
		}	
	}

	// Check if field value is different from saved value;
	function compareFieldValue(savedValue, fieldValue)
	{
		return (fieldValue.toLowerCase() != savedValue.toLowerCase());
	}

	// Check if something should be saved/updated
	function checkIfNewValue(elementID, savedValue)
	{
		let element = document.getElementById(elementID);
		let elementValue = element?.value?.trim() ?? savedValue;
		let isDifference = (elementValue != savedValue);

		if(!isDifference)
		{
			Logger.log(`${elementID} is up to date!`)
		}

		let newValueObj = {"isNewValue":isDifference, "value": elementValue }
		return newValueObj;
	}


	// Validate the password
	function validate_password(game_id, password, callback)
	{

		// Check which thing to validate
		let isEditURL = password.includes("https://docs.google.com/spreadsheets");
		let fieldToCheck = (isEditURL) ? "Edit URL" : "Pass Phrase";

		// Check the field vs the given password or edit URL;
		MyTrello.get_card_custom_field_by_name(game_id, fieldToCheck, (data) => {
			
			let response = JSON.parse(data.responseText);
			let customFieldValue = response[0]?.value?.text ?? ""

			if(customFieldValue != "" && customFieldValue.toUpperCase() == password.toUpperCase())
			{
				callback();
			}
			else
			{
				result = "Invalid credentials for this game";
				set_loading_results(result);
			}
		});
	}

	function onTestCreate()
	{

		// https://developer.mozilla.org/en-US/docs/Web/API/FormData/Using_FormData_Objects

		// https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#submitting_forms_and_uploading_files

		var x = {"one":"1"};
		var xx = {
			"Categories": {
				"Bands/Rock": [
					{
						"Value": 100,
						"DailyDouble": "No",
						"Question": {
							"Text": "",
							"Image": "",
							"Audio": "",
							"URL": ""
						},
						"Answer": {
							"Text": "",
							"Image": "",
							"Audio": "",
							"URL": ""
						}
					},
					{
						"Value": 200,
						"DailyDouble": "No",
						"Question": {
							"Text": "",
							"Image": "",
							"Audio": "",
							"URL": ""
						},
						"Answer": {
							"Text": "",
							"Image": "",
							"Audio": "",
							"URL": ""
						}
					}
				]
			}
		}
		var y = JSON.stringify(xx);

		var fileName = "Test3.json"
		const jsonFile = new File([y], fileName, {
			type: "application/json",
		  });
		// const jsonFile = new Blob([y],{
		// 	type:"application/json"
		// });

		var postURL = `https://trello.the-dancinglion.workers.dev/jeopardy/create_card_attachment/?cardID=625e845b52216d07db264f95&mimeType=application/json&name=${fileName}`

		const formData = new FormData();
		formData.append("file", jsonFile);

		testPassingData(fileName,xx);
		// const request = new XMLHttpRequest();
		// request.open("POST", postURL);

		// request.onreadystatechange = function() {
		// 	if(this.readyState == 4)
		// 	{
		// 		console.log(this);
		// 	}
		// };

		// request.send(formData);


		// myajax.POST(postURL, formData, (resp)=>{
		// 	console.log(resp);
		// }, (err)=>{
		// 	console.error("ERROR!");
		// 	console.log(err);
		// })
	}

	function testPassingData(fileName,jsonObject)
	{
		var jsonData = JSON.stringify(jsonObject);
		const jsonFile = new File([jsonData], fileName, {
			type: "application/json",
		  });

		var postURL = MyTrello.GetFullTrelloPath("create_card_attachment",`cardID=625e845b52216d07db264f95&mimeType=application/json&name=${fileName}`);

		console.log(jsonData);
		console.log(jsonFile);
		console.log(postURL);

		const formData = new FormData();
		formData.append("file", jsonFile);

		var print = function(data){ console.log(data); };

		myajax.POST(postURL, formData, undefined,print, print)

		// myajax.AJAX({
		// 	method: "POST",
		// 	path : postURL,
		// 	data: formData,
		// 	success: (resp)=>{
		// 		console.log(resp);
		// 	},
		// 	failure : (err)=>{ console.log("ERR"); console.log(err)}
		// });
	}
