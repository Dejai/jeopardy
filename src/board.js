
/************************ GLOBAL VARIABLES ************************/

	var CURR_GAME_ID = undefined;
	var CURR_LIST_ID = undefined;
	var CURR_MEDIA_CHECKLIST_ID = undefined;

	var CURR_GAME_STATE_CARD_ID = undefined;

	var CURR_GAME_CODE = undefined;
	var GAME_NAME  = "Home-made Jeopardy";
	var HOW_TO_IS_HIDDEN = true;

	var GAME_MEDIA = {
		"_daily_double_audio":"../assets/audio/daily_double.m4a",
		"_daily_double_image":"../assets/img/daily_double.jpeg",
	};

	// Storing details about the questions and game stage
	var IS_FINAL_JEOPARDY = false;
	var IS_GAME_OVER = false;

	// var CURRENT_QUESTION_KEY = undefined;
	var ASKED_QUESTIONS = [];
	var TOTAL_CATEGORIES = 0;
	var VISIBLE_CATEGORIES = 0;


	// Storing the current players
	var TEAMS_ADDED = [];
	var CURRENT_TEAM_IDX = -1;
	var LAST_TEAM_CORRECT = undefined; // only used in game mode with single answerer

	var NUMBER_OF_PLAYERS = 0;
	var PLAYER_MAPPING = {};

	var SETTINGS_MAPPING = {};

	var IS_TEST_RUN = false;

/************************ GETTING STARTED ************************/

	mydoc.ready(function(){

		// Set the board name;
		MyTrello.SetBoardName("jeopardy");

		// Load the game params to determine what should happen next
		loadGameParams();

		// Load the additional views
		loadGameViews();

		// Load the Trello card
		loadGameCardFromTrello();

		// Set the game board listeners
		onKeyboardKeyup();

		// Only add beforeunload stopper if NOT test run;
		if(!IS_TEST_RUN)
		{
			// Make sure the page doesn't close once the game starts
			window.addEventListener("beforeunload", onClosePage);
		}
	});

	// Loads the parameters from the Game URL; returns if valid or not
	function loadGameParams()
	{
		let query_map = mydoc.get_query_map();
		IS_TEST_RUN = (query_map["test"] ?? 0) == 1;
		CURR_GAME_ID = query_map["gameid"] ?? undefined;
		CURR_LIST_ID = query_map["listid"] ?? undefined;
		
		if(IS_TEST_RUN){ 
			mydoc.addTestBanner(); 
		}
	}

	// Load the individual Views used for the game
	function loadGameViews()
	{
		$("#menu_section").load("../views/menu.html", ()=>{
			// Load the game code (based on list id);
			loadGameCode();
		});
		$("#rules_section").load("../views/rules.html");
		$("#game_board_section").load("../views/board.html");
		$("#teams_section").load("../views/teams.html");
		$("#timer_section").load("../views/timer.html");
		$("#show_question_section").load(`../views/showQuestion.html`, (data)=>{
			// Set listeners for closing question
			var close_button = document.getElementById("close_question_view");
			close_button.addEventListener("click", onCloseQuestion);
		});
	}

	// Get the game code (based on list);
	function loadGameCode()
	{
		MyTrello.get_lists("open", (data)=>{
			let resp = JSON.parse(data.responseText);
			let list = resp.filter( (val)=>{
				return (val.id == CURR_LIST_ID);
			});
			CURR_GAME_CODE = list[0]?.name ?? undefined;	
			document.getElementById("game_code").innerHTML = CURR_GAME_CODE;
		});
	}

	// Load the card to track Game state -- and load any saved state
	function loadGameState()
	{
		MyTrello.get_cards(CURR_LIST_ID,(data)=>{

			let cards = JSON.parse(data.responseText);
			let singleCard = cards.filter( (val) =>{
				let isGameCard = (val.name.startsWith("GAME_CARD_")) && (val.name.includes(GAME_NAME));
				return isGameCard;
			});
			CURR_GAME_STATE_CARD_ID = singleCard[0]?.id ?? undefined;

			MyTrello.get_comments(CURR_GAME_STATE_CARD_ID, (commentData)=>{

				let comments = JSON.parse(commentData.responseText);
				comments.forEach( (obj)=>{

					let val = obj.data?.text ?? "";
					if(val != "")
					{
						ASKED_QUESTIONS.push(val);
					}
				});
			});
		});
	}

	// Get the Game card from Trello
	function loadGameCardFromTrello()
	{
		// Clear notification and start loading			
		MyNotification.clear("#loading_results_section");
		MyNotification.toggle("#loading_gif", "hidden", false);

		// A common error message in case anything goes wrong;
		err_msg = "Sorry. There was an issue trying to load the game.<br/>";

		try
		{
			// Throw error if game ID or game code is not set;
			if(CURR_GAME_ID == undefined){ throw "Game ID is not valid! Cannot load game."; }
			if(CURR_LIST_ID == undefined){ throw "Game Code is not valid! Cannot load game."; }

			MyTrello.get_single_card(CURR_GAME_ID, (data) => {
								
				response = JSON.parse(data.responseText);

				GAME_NAME = response["name"]
				CURR_MEDIA_CHECKLIST_ID = response["idChecklists"][0] ?? "";

				//Load the Attachments on the Game (if any);
				loadGameMedia();

				// Load the game settings
				loadSettingsMapping(response["desc"]);

				// Load the state of the game (if any)
				loadGameState();

				// Get the published URL from the card custom field
				MyTrello.get_card_custom_field_by_name(CURR_GAME_ID, "Published URL", (data) => {

					let customField = JSON.parse(data.responseText);
					custom_value = customField[0]?.value?.text ?? "";
					if(custom_value != "")
					{
						MyGoogleDrive.getSpreadsheetData(custom_value, (data) =>{
							spreadSheetData = MyGoogleDrive.formatSpreadsheetData(data.responseText);
							initializeGame(spreadSheetData);
						});
					}
				});
			}, 
			(data) => {
				err_msg += data.responseText;
				gameNotification(err_msg, true);
			});
		}
		catch(error)
		{
			err_msg += error;
			gameNotification(err_msg, true);
		}
	}

	// Load the settings from Trello card
	function loadSettingsMapping(jsonString)
	{
		try
		{
			jsonObj = myajax.GetJSON(jsonString);
			settings = Settings.GetSettings(jsonObj) ?? [];

			settings.forEach( (setting) => {
				ruleObj = setting["rule"];
				ruleName = setting["name"];
				optionID = setting["option"];
				customValue = setting["value"] ?? "";

				// Create the Setting mapping:
				SETTINGS_MAPPING[ruleName] = {"option": optionID, "customValue": customValue, "rule": ruleObj };
			});
		}
		catch(error)
		{
			err_msg = "Sorry, something went wrong trying to open rules!\n\n"+error;
			gameNotification(err_msg, true);
		}
	}

	// Parse and load the game rules
	function loadGameRules()
	{
		try
		{
			rulesListItems = "";

			Object.keys(SETTINGS_MAPPING).forEach( (key) => {

				setting = SETTINGS_MAPPING[key];

				ruleObj = setting["rule"];
				rule = ruleObj["rule"];
				subRules = ruleObj["subRules"];

				ruleElement = `<strong class='rule'>${rule}</strong>`
				subRulesElements = "";
					
				subRules.forEach(function(sub){
					subRulesElements += `<li class='subrule'>${sub}</li>`
				});
				// Create the overall rule item; Append to the list
				rulesListItems += `<li class='rule_item'>${ruleElement}<ul>${subRulesElements}</ul></li>`;
			});

			// Set the rules
			document.getElementById("rules_list").innerHTML = rulesListItems;
		}
		catch(error)
		{
			err_msg = "Sorry, something went wrong trying to open rules!\n\n"+error
			gameNotification(err_msg, true);
		}
	}
	
	// Get the attachments on the card (if any)
	function loadGameMedia()
	{
		try
		{
			MyTrello.get_card_checklist_items(CURR_MEDIA_CHECKLIST_ID, (data) => {

				response = JSON.parse(data.responseText);

				// Only continue if there are actually checklist_items
				if (response.length > 0)
				{
					response.forEach( (media) => {

						checklist_details = media["name"]?.split(" ~ ") ?? ["", ""];
						file_name = checklist_details[0];
						file_type = checklist_details[1];
						file_url = checklist_details[2]
						media_url = MyGoogleDrive.formatURL(file_type, file_url) ;

						GAME_MEDIA[`${file_name}`] = media_url;
					});
				}
			});
		}
		catch(error)
		{
			err_msg = "Sorry, something went wrong trying to get game media!\n\n"+error;
			gameNotification(err_msg, true);
		}
	}

	// Initialize New Game
	function initializeGame(spreadSheetData)
	{

		// Logging the spreadsheet so I can see it when troubleshooting.
		console.log(spreadSheetData);

		// First, check for valid spreadsheet columns
		errors = validateSpreadsheetColumns(spreadSheetData);
		if(errors.length > 0)
		{
			printErrors(errors);
			return;
		}

		// Setup the Jeopardy Game object
		createJeopardyObject( spreadSheetData["rows"] );

		// Check if any errors and handle accordingly;
		errors = validateJeopardyGame();
		if(errors.length > 0)
		{
			console.error("ERRORS:")
			console.error(errors);
			printErrors(errors);
			return;
		}


		// Load the game rules if valid sheet
		loadGameRules();

		// Set timer details for default;
		setTimerDetails();

		// Create the board
		createGameBoard();

		// Toggle visibility of sections
		showGameSections();
		addGameName();

		// Add listeners
		addListenerCategoryClick();
		addListenerQuestionClick();

		// If there are already asked questions, then just load the game again;
		if(ASKED_QUESTIONS.length > 0)
		{
			onStartGame();
		}
	}

	

/************ HELPER FUNCTIONS -- DOM Manipulation ***************************************/

	// Print the errors
	function printErrors(errors)
	{
		let errorMessage = "ERROR:<br/>Your spreadhsheet is not valid for the following reasons:<br/><hr/>";
		errors.forEach( (err)=>{
			errorMessage += `<li style='font-style:smaller;'>${err}</li><br/>`;
		});
		gameNotification(errorMessage, true);
	}

	// // Add game name to the board
	// function addGameName()
	// {
	// 	// Set Game Name on the board
	// 	document.getElementById("game_name").innerHTML = GAME_NAME 
	// }

	// // Show the appropriate game section
	// function showGameSections()
	// {
	// 	// Hide Content
	// 	mydoc.hideContent("#load_game_section");
	// 	mydoc.hideContent("#homemade_jeopardy_title");

	// 	// Show Content
	// 	mydoc.showContent("#game_section");
	// }

	// Manage the notifications on the page
	function gameNotification(content, isErrorMsg=false, isLoaderHidden=true)
	{
		// First, the loading gif;
		MyNotification.toggle("#loading_gif", "hidden", isLoaderHidden);
		// The content
		MyNotification.notify("#loading_results_section", content);
		
		if(isErrorMsg)
		{
			// Log in the error message log
			Logger.errorMessage(content);
		}
		
	}

	// Show the Toggle Button for How To
	function showHowToPlayButton()
	{
		// Show the option for the help text if it is a demo game;
		if(IS_TEST_RUN)
		{ 
			mydoc.showContent("#toggleHelpText");
		}
	}

	// Showing the How To help text
	function toggleHowToSections()
	{

		tooltips = document.querySelectorAll(".howtoplay_tooltip .tooltiptext")
		tooltips.forEach( (obj)=>{

			hidden = obj.classList.contains("tooltiphidden");

			console.log(obj);
			if(hidden)
			{
				obj.classList.remove("tooltiphidden")
			} else {
				obj.classList.add("tooltiphidden")
			}
		})
		// if(HOW_TO_IS_HIDDEN)
		// {
		// 	mydoc.showContent(".how_to_play_section");
		// 	HOW_TO_IS_HIDDEN = false;
		// }
		// else
		// {
		// 	mydoc.hideContent(".how_to_play_section");
		// 	HOW_TO_IS_HIDDEN = true;
		// }
	}

	// Load the content into the question block;
	//	>> If the [mode] passed in is in the list [hidIfMod] list, then it will be hidden
	function loadQuestionViewSection(sectionID, content, mode, showInFinalJeopardy, hideIfMode="")
	{

		loadQuestionViewSection("question_block", question, mode, true);


		let element = document.getElementById(sectionID);
		let modesToHideFor = (hideIfMode) ?? "-1";

		if(element != undefined)
		{
			// Only set the content if it is defined;
			if(content != undefined)
			{
				element.innerHTML = content;
			}

			// Hide for any mode passed in
			if(modesToHideFor.includes(mode))
			{
				element.classList.add("hidden");
			}
			else
			{
				element.classList.remove("hidden")
			}

			// Adjust visibility during final jeopardy
			if(IS_FINAL_JEOPARDY)
			{
				if(showInFinalJeopardy){  element.classList.remove("hidden"); }
				if(!showInFinalJeopardy){  element.classList.add("hidden"); }
			}
		}

	}

	// Loads the list of teams in the "Correct answer" section to pick who got it right
	function loadTeamNamesInCorrectAnswerBlock()
	{
		formattedTeams = getWhotGotItRight_Section();
		let whoGotItRight = document.getElementById("who_got_it_right_table");
		whoGotItRight.innerHTML = formattedTeams;
	}

	// Hide button to set team by name
	function hideSetTeamButton()
	{
		mydoc.addClass(".setTeamDirectly", "hidden");
	}

	// Show the buttons for setting the team
	function showSetTeamButton()
	{
		mydoc.removeClass(".setTeamDirectly", "hidden");
	}

	// Sort the list of teams to determine the leader
	function updateLeader()
	{

		table_body = document.getElementById("teams_block");

		current_teams = Array.from(document.getElementsByClassName("team_row"));
		sorted_teams = current_teams.sort(function(a,b){
							a_score = a.getElementsByClassName("team_score")[0].innerText;
							b_score = b.getElementsByClassName("team_score")[0].innerText;
							return b_score - a_score;
						});

		sorted_teams_html = "";
		table_body.innerHTML = "";

		//  Update the table with the correct order
		sorted_teams.forEach(function(row){ 
			table_body.innerHTML += row.outerHTML;
		});

		updateLeaderColors()
	}

	// Update the colors associated with the leaders
	function updateLeaderColors()
	{
		var team_scores = document.querySelectorAll("span.team_score");
		var scores = [];
		for (var i = 0; i < team_scores.length; i++)
		{
			let sect = team_scores[i];
			let score = Number(sect.innerHTML);
			if (!scores.includes(score))
			{
				scores.push(score);
			}
		}
		// Sort the scores
		scores = scores.sort(function(a,b){return b-a; });
		let length = scores.length;

		// Set the first, second, and third values; 
		let first = scores[0];
		let second = (scores.length > 1) ? scores[1] : -1;
		let third = (scores.length > 2 ) ? scores[2] : -1;

		for (var i = 0; i < team_scores.length; i++)
		{
			let sect = team_scores[i];
			sect.classList.remove("first_place");
			sect.classList.remove("second_place");
			sect.classList.remove("third_place");
			let val = Number(sect.innerHTML);
			if (val == first){ sect.classList.add("first_place"); }
			else if (val == second){ sect.classList.add("second_place"); }
			else if (val == third){ sect.classList.add("third_place"); }
		}
	}


	// Set syncing details
	// function setSyncingDetails(message, iconColor)
	// {
	// 	refreshScores = document.getElementById("team_sync_message");
	// 	refreshScores.innerHTML = `&nbsp; ${message}`;
	// 	refreshScores.style.color = iconColor;
	// }


/******************* EVENT LISTENERS ************************/

	// Adds the listeners to the category columns once loaded
	// function addListenerCategoryClick()
	// {
	// 	var categories = document.querySelectorAll(".category_title");
	// 	categories.forEach(function(cell){
	// 		cell.addEventListener("click", onCategoryClick);
	// 	});
	// }

	// // Add listeners to the game cells;
	// function addListenerQuestionClick()
	// {
	// 	var cells = document.querySelectorAll(".category_option");
	// 	cells.forEach(function(cell){
	// 		cell.addEventListener("click", onQuestionClick);
	// 	});
	// }

	// Listener for keyboard event = keyup
	function onKeyboardKeyup()
	{
		document.addEventListener("keyup", function(event)
		{
			switch(event.code)
			{
				case "Escape":
					onCloseQuestion();
					break;
				case "ControlLeft":
				case "ControlRight":
					if(IS_FINAL_JEOPARDY)
					{
						document.getElementById("final_jeopardy_audio").play();
					}
					else if(Timer != undefined)
					{
						Timer.startTimer();
					}
					else
					{
						Timer.resetTimer();
					}
					break;
				default:
					return;
			}
		});
	}

	//Reveal the name of a category that is not visible yet
	function onCategoryClick(event)
	{
		// alert("Category Clicked");
		let element = event.target;
		let current_value = element.innerText;
		let title = element.getAttribute("data-jpd-category-name");
		if (!current_value.includes(title))
		{
			element.innerHTML += title;
			VISIBLE_CATEGORIES += 1;
		}

		// If all headers visible, show the current turn section
		if(VISIBLE_CATEGORIES == TOTAL_CATEGORIES)
		{
			mydoc.showContent("#current_turn_section");
		}
	}

	// Show all the categories by default;
	function onCategoryClickAuto()
	{
		categories = document.querySelectorAll(".category_title");
		categories?.forEach((obj) => {
			obj.click();
		});
	}

	// Prevent the page accidentally closing
	function onClosePage(event)
	{
		event.preventDefault();
		event.returnValue='';
	}

	// Openning a question 
	function onOpenQuestion(cell)
	{
		// Rest timer and button to assign scores (if not live host view)
		Timer.resetTimer();

		// Get the question key from the clicked cell
		let key = cell.getAttribute("data-jpd-quest-key");

		// Determing if the question can be opened;
		let proceed = canOpenQuestion(key);
		if(!proceed){ return; }

		Logger.log("Loading Question");
		Logger.log(cell);


		// Log that a question was asked; Including setting in Trello
		ASKED_QUESTIONS.push(key);
		if(!IS_TEST_RUN)
		{
			MyTrello.create_card_comment(CURR_GAME_STATE_CARD_ID, encodeURIComponent(key));
		}

		// Get the setting for Answering questions
		let setting = SETTINGS_MAPPING["Answering Questions"];
		let mode = setting.option;

		// Load Teams into Correct Answer Block
		loadTeamNamesInCorrectAnswerBlock();

		// Set the selected cell to disabled;
		cell.classList.add("category_option_selected");
		cell.disabled = true;

		// Get the mapped object from the Question/Answer Map
		let map = JEOPARDY_QA_MAP[key];

		// Force a sync of teams to ensure wagers are received.
		if(key.includes("FINAL JEOPARDY")){ onSyncTeams() }

		// Format the questions and answers
		let isDailyDouble = map["question"]["dailydouble"];

		let question = formatContent(map["question"]);
		question = (isDailyDouble) ? (getDailyDoubleContent() + question ) : question;

		let answer   = formatContent(map["answer"]);

		let questionValue    = Number(map["question"]["value"]);
		questionValue = isNaN(questionValue) ? 0 : questionValue;
		questionValue = (isDailyDouble) ? (2 * questionValue) : questionValue;
		
		// Load the different sections
		loadQuestionViewSection("question_block", question, mode, true);
		loadQuestionViewSection("value_header", undefined, mode, false);
		loadQuestionViewSection("value_block", questionValue, mode, false);

		loadQuestionViewSection("answer_block", answer, mode, false, "1,2");
		loadQuestionViewSection("reveal_answer_block", undefined, mode, true, "2");
		loadQuestionViewSection("correct_block", undefined, mode, false, "1");

		document.getElementById("assignScoresButton").disabled = true; 
		
		// Show the question section
		document.getElementById("question_view").classList.remove("hidden");

	}

	//Close the current question; Resets teh timer;
	function onCloseQuestion()
	{
		let confirmMsg = "Looks like you have a team selected. Are you sure you want to close this question without assigning points?";
		let proceedClose = (hasAssignablePoints()) ? confirm(confirmMsg) : 	true;
		if(proceedClose)
		{
			window.scrollTo(0,0); // Scroll back to the top of the page;

			// Set the game being over based on if we just closed the final jeopardy question
			IS_GAME_OVER = IS_FINAL_JEOPARDY

			// Make sure this button is enabled
			document.querySelector("#nobodyGotItRightButton").disabled = false;

			//hiding/showing things 
			mydoc.hideContent("#answer_block");
			mydoc.hideContent("#correct_block");
			mydoc.showContent("#reveal_answer_block");

			mydoc.addClass("#question_block", "visibleBlock");
			mydoc.removeClass("#question_block", "hiddenBlock");

			mydoc.addClass("#answer_block", "hiddenBlock");
			mydoc.removeClass("#answer_block", "visibleBlock");
			document.getElementById("question_view")?.classList.add("hidden");
			Timer.resetTimer(); // make sure the timer is reset to default.
		}
	}

	// End the game and archive the list
	function onEndGame()
	{
		// Only archive if it is NOT a test run;
		if(!IS_TEST_RUN)
		{
			// Set the list to archived; With updated name;
			let dateCode = Helper.getDateFormatted();
			let archive_name = `${dateCode} - ${CURR_GAME_CODE} - ${GAME_NAME}`;
			MyTrello.update_list_state(CURR_LIST_ID, "closed", archive_name , (data)=>{
				alert("Game has been archived");
			});
		}
	}

	// Open up the selected question	
	function onQuestionClick(event)
	{
		let ele = event.target;
		let td  = (ele.tagName == "TD") ? ele : ele.querySelectorAll(".category_option")[0];
		if (td != undefined)
		{
			onOpenQuestion(td);
		} 
		else
		{ 
			alert("ERROR: Couldn't load question. Try again?"); 
		} 
	}

	// Reveal the answer in the question popup; Also reveal player answers
	function onRevealAnswer(event)
	{
		
		var answers = document.querySelectorAll(".team_answer");

		// Loop through all possible teams;
		for(var idx = 0; idx < answers.length; idx++)
		{
			let obj = answers[idx];
			let teamCode = obj.getAttribute("data-jpd-team-code");

			// Get team details
			let teamDetails = getTeamDetails(teamCode);

			// Set the answer given by the person;
			MyTrello.get_single_card(teamCode, function(data){
				response = JSON.parse(data.responseText);
				obj.innerHTML = response["desc"];
			});
		}

		// Remove the hidden wagers
		if (IS_FINAL_JEOPARDY)
		{
			let hiddenWagers = document.querySelectorAll(".wager_hidden");
			hiddenWagers.forEach((obj) =>{
				obj.classList.remove("wager_hidden");
			});
		}

		// Show the sections
		mydoc.showContent("#answer_block");
		mydoc.showContent("#correct_block");
		mydoc.hideContent("#reveal_answer_block")
		mydoc.hideContent("#question_block audio")

		mydoc.removeClass("#question_block", "visibleBlock");
		mydoc.addClass("#question_block", "hiddenBlock");

		mydoc.removeClass("#answer_block", "hiddenBlock");
		mydoc.addClass("#answer_block", "visibleBlock");

		// Add reveal timestamp
		let time = Helper.getDate("H:m:s K");
		mydoc.loadContent(time, "answer_revealed_time");
	}

	// Reveal the game board & set initial team
	function onStartGame(event)
	{
		// Determine if the How To button should display
		showHowToPlayButton();

		// Account for any existing game state
		onSetGameState();

		// Sync teams before starting game; 
		onSyncTeams();

		// Hide Content
		mydoc.hideContent("#rules_section");
		
		// Show Content
		mydoc.showContent("#game_board");	
		mydoc.showContent("#teams_table");
		mydoc.showContent("#teams_sync_section");
		mydoc.showContent("#round_1_row");
		mydoc.showContent("#finalJeopardyButton");

		// Set a comment indicating the game is being played
		if(!IS_TEST_RUN && CURR_GAME_CODE != "TEST")
		{
			let date = Helper.getDateFormatted();
			let comment = `${date} --> ${CURR_GAME_CODE}`;
			MyTrello.create_card_comment(CURR_GAME_ID, comment);
		}
	}

	//Show the Final Jeopardy section
	function onFinalJeopardy()
	{

		// set final jeopardy;
		IS_FINAL_JEOPARDY = true;

		// Hide Content
		mydoc.hideContent("#round_1_row");
		mydoc.hideContent("#round_2_row"); // Will hide round 2 if applicable;
		mydoc.hideContent("#current_turn_section");
		mydoc.hideContent("#time_view_regular");
		mydoc.hideContent("#finalJeopardyButton");
		mydoc.hideContent("#assignScoresButton");
		mydoc.hideContent("#nobodyGotItRightButton");

		// Show Content
		mydoc.showContent("#final_jeopardy_audio");
		mydoc.showContent("#final_jeopardy_row");
		mydoc.showContent("#finalJeopardyAssign");
		mydoc.showContent(".wager_row");

		// Add Classes
		mydoc.addClass("#final_jeopardy_row", "final_jeopardy_row");
	}

	// Set the game state based on existing history on the card
	function onSetGameState()
	{
		if(ASKED_QUESTIONS.length > 0)
		{

			// Automatically show the column headers
			onCategoryClickAuto();
			
			// Show any asked questions as already asked;
			ASKED_QUESTIONS.forEach( (val)=>{

				let cell = document.querySelector(`[data-jpd-quest-key='${val}']`);
				if(cell != undefined)
				{	
					cell.classList.add("category_option_selected");
					cell.disabled = true;
				}	
			});
		}
		
	}

	// Sync the teams
	function onSyncTeams()
	{
		setSyncingDetails("Syncing", "red");

		MyTrello.get_cards(CURR_LIST_ID, function(data){

			response = JSON.parse(data.responseText);
			response.forEach(function(obj){

				let teamName = obj["name"].trim().replaceAll("\n", "");
				let isTeamCard = !(teamName.includes("GAME_CARD_"));

				if(isTeamCard)
				{
					code = obj["id"];

					// Add to teams array
					if(!TEAMS_ADDED.includes(teamName))
					{
						TEAMS_ADDED.push(teamName);
						onAddTeam(code, teamName);
					}

					// If FINAL_JEOPARDY -- set the wager (initially hidden);
					if(IS_FINAL_JEOPARDY && !IS_GAME_OVER)
					{
						let highestScore = getHighestScore();
						getWagersPerTeam(code, highestScore);		
					}
				}
			});

			// Sets the first player if it is not already set
			if(!isCurrentPlayerSet()){ 
				setFirstPlayer();
			}

			// Update the sync teams message
			setTimeout(() => {

				setSyncingDetails("Synced!", "limegreen");
				updateLeader();
				
				setTimeout(() => {

					setSyncingDetails("Sync Teams", "white");
				},2000);
			}, 1500);
		});
	}

	// Check if assigning scores button should be enabled
	function onTeamGotItRight()
	{
		let assignButton = document.querySelector("#assignScoresButton");
		let noRightButton = document.querySelector("#nobodyGotItRightButton");
		var gotItRight = document.querySelectorAll(".who_got_it_right:checked");
		if(gotItRight.length > 0)
		{
			assignButton.disabled = false;
			noRightButton.disabled = true;
		}
		else
		{
			assignButton.disabled = true;
			noRightButton.disabled = false;
		}
	}

	// Adds a team Row to the teams table
	function onAddTeam(teamCode, teamName)
	{

		let teamShortCode = CURR_GAME_CODE + "-" + teamCode.substring(teamCode.length-4).toUpperCase();
		let whoGoesFirstOption = SETTINGS_MAPPING["Who Goes First?"]?.option ?? "0"

		// Get the team's score as stored in trello
		MyTrello.get_card_custom_field_by_name(teamCode, "Score", (scoreDate)=>{

			let resp = JSON.parse(scoreDate.responseText);
			let teamScore = resp[0]?.value?.text ?? 0;

			let isSetTeamDirectly = (whoGoesFirstOption == "2" && CURRENT_TEAM_IDX > 0) ? "" : "hidden";
			
			let content = `
				<tr class="team_row">
					<td class="team_name_cell">
						<h2>
							<span id="teamChevron_${teamCode}" data-jpd-team-code="${teamCode}" class="fa fa-code pointer" style="color:orange;font-size:60%;" onclick="onToggleTeamShortCode(event)"></span>
							<span data-jpd-team-code="${teamCode}" class="team_name pointer">${teamName}</span>
						</h2>
						<p id="hiddenShortCode_${teamCode}" class="hiddenShortCode hidden">${teamShortCode}</p>
					</td>
					<td>
						<h2><span data-jpd-team-code=\"${teamCode}\" class=\"team_score\">${teamScore}</span></h2>
					</td>
					<td class=\"wager_row\">
						<button class="setTeamDirectly ${isSetTeamDirectly}" onclick="setCurrentPlayerByName('${teamName}')">Set as First Team</button>
						<h2><span data-jpd-team-code=\"${teamCode}\" class=\"team_wager hidden\"></span></h2>
					</td>
				</tr>
			`;

			document.getElementById("teams_block").innerHTML += content;
		});
	}

	// Toggle the team short code
	function onToggleTeamShortCode(event)
	{
		let ele = event.target;
		let teamCode = ele.getAttribute("data-jpd-team-code");
		let selector = `#hiddenShortCode_${teamCode}`
		let hiddenP = document.querySelector(selector);
		
		if(hiddenP != undefined)
		{
			if(hiddenP.classList.contains("hidden"))
			{
				mydoc.showContent(selector);
				mydoc.removeClass(`#${ele.id}`, "fa-code");
				mydoc.addClass(`#${ele.id}`, "fa-close");
			}
			else
			{
				mydoc.hideContent(selector);
				mydoc.removeClass(`#${ele.id}`, "fa-close");
				mydoc.addClass(`#${ele.id}`, "fa-code");
			}
		}
	}

	// Helper if nobody got it right
	function onNobodyCorrect()
	{
		onAssignPoints(false); // pass in false for update score
	}

	// Assigns the scores and then closes the question
	function onAssignPoints(updateScore=true)
	{
		// First update the score
		if(updateScore)
		{ 
			onUpdateScore(); 

			// set assign score back to disabled;
			document.getElementById("assignScoresButton").disabled = true; 
		}

		// Then, close the question popup
		onCloseQuestion();

		// Updating turn and resetting answers
		// Only do these actions if it is NOT final jeopardy
		if(!IS_FINAL_JEOPARDY)
		{
			onUpdateTurn(); // Pick whos turn it is next

			// Reset the answers for each team, so it no longer shows
			resetAnswers(); // Reset the answers for each team.
		}
		else if (IS_FINAL_JEOPARDY)
		{
			
			// Indicate the end of the game.
			let gameBoardSect = document.getElementById("game_board_section")
			let currContent = gameBoardSect.innerHTML;
			gameBoardSect.innerHTML = "<h2 style='text-align:center;'>Thanks for Playing!</h2>" + currContent;
			
			// Archive the game a few seconds after assigning final points
			setTimeout(()=>{
				onEndGame();
			},5000);
		}
	}

	// Update the score for all teams that got the question correct
	function onUpdateScore()
	{
		var question_value = document.getElementById("value_block").innerText; // Get the value of the question

		let setting = SETTINGS_MAPPING["Selecting Questions"];
		let mode = setting.option;

		// Get the team inputs for Who Got It Right?
		var teamInputs = document.querySelectorAll(".who_got_it_right");

		if(teamInputs == undefined)
		{
			Logger.log("ERROR! Could not load the team inputs");
		}

		// Loop through all options
		teamInputs.forEach( (obj) => {

			let teamCode = obj.getAttribute("data-jpd-team-code");

			// If version where single person gets it right; 
			if(mode == "2" && obj.checked)
			{
				LAST_TEAM_CORRECT = teamCode; //Set the team that got it correct, since they go again;
			}

			// Calculae/set the score based on teamCode and if object is checked
			calculateTeamNewScore(teamCode, question_value, obj.checked);
		});
		
		// Update the leader board
		updateLeader();
	}

	// Updates the turn to the next player
	function onUpdateTurn()
	{
		let setting = SETTINGS_MAPPING["Selecting Questions"];
		let mode = setting.option;

		switch(mode)
		{
			case "1":
				setCurrentPlayer(CURRENT_TEAM_IDX+1); //Increase index by +1
				break;
			case "2":
				teamDetails = getTeamDetails(LAST_TEAM_CORRECT);
				teamName = teamDetails["name"];
				setCurrentPlayerByName(teamName);
				break;
			case "3":
				setRandomQuestion();
				break;
			default:
				setCurrentPlayer(CURRENT_TEAM_IDX); // default is to keep the same index;
		}	
	}




/********** HELPER FUNCTIONS -- GETTERS **************************************/

	// Get details about a team based on the teams table
	function getTeamDetails(teamCode)
	{
		let teamName = document.querySelector("span.team_name[data-jpd-team-code='"+teamCode+"'"); 
		let teamScore = document.querySelector("span.team_score[data-jpd-team-code='"+teamCode+"'"); 
		let teamWager = document.querySelector("span.team_wager[data-jpd-team-code='"+teamCode+"'"); 
		// let teamWager2 = document.querySelector("label.team_wager_question_view[data-jpd-team-code='"+teamCode+"'"); 

		let teamDetails = {
			"name": teamName?.innerText ?? "", 
			"name_ele": teamName, 
			"score": teamScore?.innerText ?? "", 
			"score_ele": teamScore, 
			"wager": teamWager?.innerText ?? "",
			"wager_ele": teamWager
		}

		return teamDetails;
	}

	// Get the highest score
	function getHighestScore()
	{
		let highest = 0;

		let team_score_values = document.querySelectorAll("span.team_score");

		team_score_values.forEach((obj) =>{
			let val = Number(obj.innerText) ?? 0;
			val = isNaN(val) ? 0 : val;
			highest = (val > highest) ? val : highest;
		});
		return highest

	}
	// Get the max possible wager users can bet against
	function getMaxPossibleWager()
	{
		let max = 0;

		let team_score_values = document.querySelectorAll("span.team_score");
		for(var idx = 0; idx < team_score_values.length; idx++)
		{
			let val = Number(team_score_values[idx].innerText);
			if (!isNaN(val) && val > max)
			{
				max = val;
			}
		}

		return max;
	}

	// Get the wager for the current team (adjust to max possible - in case someone tries to cheat)
	function getWagersPerTeam(teamCode, highestScore)
	{
		let settings = SETTINGS_MAPPING["Final Jeopardy Wager"];
		let mode = settings.option; 

		let teamDetails = getTeamDetails(teamCode);

		// Reveal the wager element and set to zero by default
		teamDetails["wager_ele"].classList.remove("hidden"); 

		let maxWager = (mode == "2") ? highestScore : teamDetails["score"];

		// Get the wager value from the wager field; Set in field
		MyTrello.get_card_custom_field_by_name(teamCode, "Wager", (data) => {

			let customField = JSON.parse(data.responseText);
			let custom_value = customField[0]?.value?.text ?? undefined;
			let wagerValue = (!isNaN(Number(custom_value))) ? Number(custom_value) : undefined;

			console.log("Wager value for team: " + wagerValue);
			if(wagerValue != undefined)
			{
				wagerValue = (wagerValue > maxWager) ? maxWager : wagerValue;
				teamDetails["wager_ele"].innerText = wagerValue;
				teamDetails["wager_ele"].classList.add("wager_hidden");
			}

			// Make the card reflect the true wager if they tried to go over;
			if(wagerValue > maxWager)
			{
				MyTrello.update_card_custom_field_by_name(teamCode, "Wager", maxWager.toString());
			}	
		});
	}



/********** HELPER FUNCTIONS -- SETTERS, UPDATERS, and RESETERS **************************************/

	// Determine an set the new team score
	function calculateTeamNewScore(teamCode, questionValue, isCorrect=false)
	{
		// Get the team details
		let teamDetails = getTeamDetails(teamCode);

		// Get wager details
		let team_score = Number(teamDetails["score"]);
		let team_wager = Number(teamDetails["wager"]);

		let questionValueNum = Number(questionValue);
		questionValueNum = isNaN(questionValueNum) ? 0 : questionValueNum;

		// Calculate the points of the question;
		let points = (IS_FINAL_JEOPARDY) ? team_wager : questionValueNum; 

		// Defaulting new score to the same team score
		let newScore = team_score; 

		// calculating the new score based on combinations
		if(IS_FINAL_JEOPARDY && !isCorrect)
		{
			newScore -= points;
		}
		else if (isCorrect)
		{
			newScore += points;
		}

		// Set the value on the HTML table 
		teamDetails["score_ele"].innerText = newScore;

		// Update Trello if the score is different;
		if( (team_score != newScore) || (team_score == 0) )
		{
			Logger.log("Updating team score");
			MyTrello.update_card_custom_field_by_name(teamCode,"Score",newScore.toString());
		}

	}

	// Reset the answer
	function resetAnswers()
	{
		Logger.log("Clearing Answers in 5 seconds!");
		setTimeout(function(){
			let teams = Array.from(document.querySelectorAll(".team_name"));
			teams.forEach(function(obj){

				card_id = obj.getAttribute("data-jpd-team-code");
				MyTrello.update_card_description(card_id, "");
			});
		}, 5000)
		
	}

	// Set the first player
	function setFirstPlayer()
	{
		var setting = SETTINGS_MAPPING["Who Goes First?"];
		
		switch(setting.option)
		{
			case "1":
				setCurrentPlayerRandomly();
				break;
			case "2":
				showSetTeamButton();
				break;
			case "3":
				CURRENT_TEAM_IDX = 0 //setting this so the checker can allow me to open a question;
				setRandomQuestion();
				break;
			default:
				setCurrentPlayerRandomly();				
		}
	}

	// Take in a team name and set that team to current player
	function setCurrentPlayerByName(teamName)
	{
		let idx = TEAMS_ADDED.indexOf(teamName);
		setCurrentPlayer(idx);

		// Hide the buttons to set team directly
		hideSetTeamButton();
	
	}

	// Randomly set the first player
	function setCurrentPlayerRandomly()
	{
		let numTeams  = TEAMS_ADDED.length;
		if(numTeams > 0)
		{
			let idx = Math.floor(Math.random() * numTeams);
			setCurrentPlayer(idx); // Set that index as the current player
		}
		// Hide the buttons to set team directly
		hideSetTeamButton();
	}

	// Set the current player based on index
	function setCurrentPlayer(idx=-1)
	{
		let numTeams  = TEAMS_ADDED.length;

		// Reset to 0 if the index is out of range; 
		let new_index = (idx >= numTeams) ? 0 : idx;
		
		if(new_index != -1)
		{			
			nextTeam = TEAMS_ADDED[new_index];
			
			Logger.log(`Setting Next Team = ${nextTeam}`);
			document.getElementById("current_turn").innerText = nextTeam;
			
			// Update the index for use in any other call back to this function
			CURRENT_TEAM_IDX = new_index;
		}
	}


	// Set Timer values
	function setTimerDetails()
	{
		// Set timer callback
		if(Timer)
		{
			Timer.setTimeUpCallback(function(){
				document.getElementById("time_up_sound").play();
			});

			// Set the default timer
			time_setting = SETTINGS_MAPPING["Time to Answer Questions"];
			if(time_setting.hasOwnProperty("customValue") && time_setting["customValue"] != "")
			{
				let time = Number(time_setting["customValue"]);
				time = isNaN(time) ? Timer.getTimerDefault() : time;
				Timer.setTimerDefault(time);
			}
		}

		
	}

	// Select a random question
	function setRandomQuestion()
	{
		let availableQuestions = document.querySelectorAll(".category_option:not(.category_option_selected)");

		let limit = availableQuestions.length;
	
		let nextQuestion = "";

		if (limit > 1)
		{
			while(true)
			{
				let randIdx = Math.floor(Math.random()*limit);
				let cell = availableQuestions[randIdx];
				nextQuestion = cell?.getAttribute("data-jpd-quest-key");
				if(!nextQuestion.includes("FINAL JEOPARDY"))
				{
					break;
				}
			}	
			// Set the value; Show the section
			document.getElementById("current_turn").innerText = nextQuestion;
		}
		else
		{
			// Set the value; Show the section
			document.getElementById("current_turn").innerText = "N/A";
		}
	}


/********** HELPER FUNCTIONS -- ASSERTIONS **************************************/

	// check if a current player has been set
	function isCurrentPlayerSet()
	{
		return (CURRENT_TEAM_IDX > -1);
	}
	
	// Validate the headers are shown
	function isHeadersVisible()
	{

		let allVisible = VISIBLE_CATEGORIES >= TOTAL_CATEGORIES;
		let headersVisible = (allVisible || IS_TEST_RUN);
		if( !headersVisible )
		{
			alert("Please show all the headers before beginning")
		}

		return headersVisible;
	}

	// Re-open the same question?
	function isReopenQuestion(key)
	{
		let canOpen = true; 

		if(ASKED_QUESTIONS.includes(key))
		// if(CURRENT_QUESTION_KEY === key)
		{
			canOpen = confirm("This question has already been presented. Re-open?") == 1;
		}

		return canOpen;
	}

	function isFirstTeamSet()
	{
		let firstTeamSet = (CURRENT_TEAM_IDX != -1)
		if(!firstTeamSet)
		{
			alert("Please select a team that will start (see below);");
		}
		return firstTeamSet;
	}

	// Check if the question can be opened;
	function canOpenQuestion(key)
	{
		let canOpen = true;
		let allHeadersVisible = isHeadersVisible();
		let isSafeToOpen = isReopenQuestion(key);
		let firstTeamSet = isFirstTeamSet();

		canOpen = allHeadersVisible && isSafeToOpen && firstTeamSet;

		return canOpen; 
	}

	function hasAssignablePoints()
	{
		let assignScoresButton = document.querySelector("#assignScoresButton");
		return (assignScoresButton.disabled == false)
	}

	// Check if each team has wager set
	// Get the teams current wager (and makes it visible)
	function isWagerSet(teamCode)
	{
		MyTrello.get_card_custom_field_by_name(teamCode, "Wager", (data) => {

			let customField = JSON.parse(data.responseText);
			let custom_value = customField[0]?.value?.text ?? "";
			HAS_WAGER = (!isNaN(Number(custom_value)));
			if (HAS_WAGER)
			{
				document.getElementById("submitted_wager_value").innerText = custom_value;
				mydoc.showContent("#submitted_wager_section");
				mydoc.hideContent("#wager_input_section");
				mydoc.hideContent("#show_wager_link");
			}		
		});
	}



/********** HELPER FUNCTIONS -- FORMAT CONTENT **************************************/

	function formatContent(obj)
	{
		Logger.log("Formatting content")

		let content = "";
		let new_line = "<br/>";

		// Format the Image
		if(obj.hasOwnProperty("image"))
		{
			let formattedImage = formatImages(obj["image"]);
			content += (content != "" && formattedImage != "") ? (new_line + formattedImage) : formattedImage;
		}

		// Format the Audio
		if(obj.hasOwnProperty("audio"))
		{
			let formattedAudio = formatAudio(obj["audio"]);
			content += (content != "" && formattedAudio != "") ? (new_line + formattedAudio) : formattedAudio;
		}

		// Format the Text
		if(obj.hasOwnProperty("text"))
		{
			let formattedText = formatText(obj["text"]);
			content += (content != "" && formattedText != "") ? (new_line + formattedText) : formattedText;
		}

		// Format the URLs
		if(obj.hasOwnProperty("url"))
		{
			let formattedURL = formatURL(obj["url"]);
			content += (content != "" && formattedURL != "") ? (new_line + formattedURL) : formattedURL;
		}

		return content;
	}

	function formatText(value)
	{
		formatted = "";
		value = value.trim();
		Logger.log("Text value: " + value);


		if(value.trim() != "")
		{
			let new_value = value.trim()
						.replaceAll("\\n", "<br/>")
						.replaceAll("{subtext}", "<span class='jpd_subtext'>")
						.replaceAll("{/subtext}", "</span>")
						.replaceAll("{bold}", "<strong><em>")
						.replaceAll("{/bold}", "</em></strong>");
			formatted = `<span>${new_value}</span>`
		}
		return formatted;
	}

	function formatImages(value)
	{
		value = value.trim();
		let image_path = getGameMediaURL(value);
		Logger.log("Image value: " + value);

		formatted = "";
		if (value != "")
		{
			formatted = `<img src=\"${image_path}\" alt_text='Image' class='jeopardy_image'/>`;
		}
		return formatted;
	}

	function formatAudio(value, isAutoPlay=false)
	{
		formatted = "";
		value = value.trim();
		Logger.log("Audio value: " + value);

		let audio_path = getGameMediaURL(value);

		if (value.trim() != "")
		{
			let autoplay = (isAutoPlay) ? " autoplay" : "";
			let controls = (isAutoPlay) ? "" : " controls";
			let audio_open = "<audio " + controls + autoplay + ">";
			let audio_source  = `<source src=\"${audio_path}\" type='audio/mpeg'/>`;
			let audio_close = "</audio>";
			formatted = audio_open + audio_source + audio_close;
		}
		return formatted;
	}

	function formatURL(value)
	{
		formatted = "";
		value = value.trim();
		Logger.log("Hyperlink value: " + value);

		if(value != "")
		{
			formatted = `<a class='answer_link' href=\"${value}\" target='_blank'>${value}</a>`;
		}
		return formatted;
	}