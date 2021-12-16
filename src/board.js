
/************************ GLOBAL VARIABLES ************************/

	var JeopardyGame = undefined;
	var CURR_GAME_ID = undefined;
	var CURR_LIST_ID = undefined;
	var CURR_MEDIA_CHECKLIST_ID = undefined;

	var CURR_GAME_CODE = "";
	var GAME_NAME  = "Home-made Jeopardy";
	var HOW_TO_IS_HIDDEN = true;

	var GAME_MEDIA = {
		"_daily_double_audio":"../assets/audio/daily_double.m4a",
		"_daily_double_image":"../assets/img/daily_double.jpeg",
	};

	// Storing details about the questions and game stage
	var QA_MAP = {};   //The Question-Answer map;
	var IS_FINAL_JEOPARDY = false;
	// var CURRENT_QUESTION_KEY = undefined;
	var ASKED_QUESTIONS = [];

	// Storing the current players
	var TEAMS_ADDED = [];
	var CURRENT_TEAM_IDX = -1;
	var LAST_TEAM_CORRECT = undefined; // only used in game mode with single answerer

	var NUMBER_OF_PLAYERS = 0;
	var PLAYER_MAPPING = {};

	var SETTINGS_MAPPING = {};

	var IS_LIVE_HOST_VIEW = false;

	var IS_TEST_RUN = false;
	var IS_DEMO_RUN = false;

/************************ GETTING STARTED ************************/

	mydoc.ready(function(){

		// Load the game params to determine what should happen next
		validParams = loadGameParams();

		// Make sure the page doesn't close once the game starts
		window.addEventListener("beforeunload", onClosePage);

		// Set the game board listeners
		onKeyboardKeyup();

		// Check if this is the live host view
		let path = location.pathname;
		IS_LIVE_HOST_VIEW = path.includes("host.html");

		// Load the additional views
		loadGameViews();

		// Load the Trello card
		loadGameCardFromTrello();
	});

	// Loads the parameters from the Game URL; returns if valid or not
	function loadGameParams()
	{
		let query_map = mydoc.get_query_map();

		IS_DEMO_RUN = (query_map["demo"] ?? 0) == 1;
		IS_TEST_RUN = (query_map["test"] ?? 0) == 1;
		CURR_GAME_ID = query_map["gameid"] ?? undefined;
		
		if(IS_TEST_RUN){ 
			mydoc.addTestBanner(); 
		}
	}

	// Load the individual Views used for the game
	function loadGameViews()
	{
		$("#menu_section").load("../views/menu.html");
		$("#rules_section").load("../views/rules.html");
		$("#game_board_section").load("../views/board.html");
		$("#teams_section").load("../views/teams.html");
		$("#timer_section").load("../views/timer.html");

		let showQuestionView = (IS_LIVE_HOST_VIEW) ? "showQuestionHost": "showQuestion";
		$("#show_question_section").load(`../views/${showQuestionView}.html`, function(data){
			// Set listeners for closing question
			var close_button = document.getElementById("close_question_view");
			close_button.addEventListener("click", onCloseQuestion);
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
			// Throw error if game ID is not set;
			if(CURR_GAME_ID == undefined){ throw "Game ID is not valid! Cannot load game."; }

			MyTrello.get_single_card(CURR_GAME_ID, (data) => {

				response = JSON.parse(data.responseText);

				GAME_NAME = response["name"]
				CURR_MEDIA_CHECKLIST_ID = response["idChecklists"][0] ?? "";

				//Load the Attachments on the Game (if any);
				loadGameMedia();

				// Load the game settings
				loadSettingsMapping(response["desc"]);

				// Determine if the How To button should display
				showHowToPlayButton();

				// Get the published URL from the card custom field
				MyTrello.get_card_custom_fields(CURR_GAME_ID, function(data2) {
					
					custom_fields = JSON.parse(data2.responseText);

					// Loop through custom fields;
					for (var idx = 0; idx < custom_fields.length; idx++)
					{
						field = custom_fields[idx];
						field_id = field["idCustomField"] ?? "";
						if(field_id != MyTrello.custom_field_pub_url) continue;

						// Get the custom value;
						custom_value = field?.value?.text ?? "";
						if(custom_value != "")
						{
							MyGoogleDrive.getSpreadsheetData(custom_value, (data) =>{
								spreadSheetData = MyGoogleDrive.formatSpreadsheetData(data.responseText);
								initializeGame(spreadSheetData);
							});
						}
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

			// // Set the default timer
			// time_setting = SETTINGS_MAPPING["Time to Answer Questions"];
			// if(time_setting.hasOwnProperty("customValue") && time_setting["customValue"] != "")
			// {
			// 	let time = Number(time_setting["customValue"]);
			// 	time = isNaN(time) ? Timer.getTimerDefault() : time;
			// 	Timer.setTimerDefault(time);
			// }

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
	function initializeGame(spreadsheetData)
	{

		isValid = isValidSpreadsheet(spreadSheetData);
		if(!isValid){ return; }  // If not valid, return without doing anything else;

		// Load the game rules if valid sheet
		loadGameRules();

		// Set timer details for default;
		setTimerDetails();

		// Setup the Jeopardy Game object
		createJeopardyObject(givenRows);

		// Create/show the board
		createGameBoard();

		// Toggle visibility of sections
		showGameSections();
		addGameName();
		addGameCode();

		// Add listeners
		addListenerCategoryClick();
		addListenerQuestionClick();

		// Handle the LIST ID
		setListID();
	}

	// Used to create a Jeopardy game object;
	function createJeopardyObject(rows)
	{

		Logger.log("Creating Jeopardy Objects");
		JeopardyGame = new Jeopardy();

		rows.forEach( (row) => {

			// General content
			category_name = row["Category Name"];
			value = row["Score Value"];
			daily_double = row["Daily Double?"];
			// question content
			question_text = row["Question (Text)"];
			question_audio = row["Question (Audio)"];
			question_image = row["Question (Image)"];
			question_url = row["Question (URL)"];
			// Answer content
			answer_text = row["Answer (Text)"];
			answer_audio = row["Answer (Audio)"];
			answer_image = row["Answer (Image)"];
			answer_url = row["Answer (URL)"];

			// Setup the new question
			new_question = new Question(question_text, question_audio, question_image, question_url,
				answer_text, answer_audio, answer_image, answer_url, value, daily_double);

			// If category does not exist yet, add it;
			if(!JeopardyGame.categoryExists(category_name))
			{
				JeopardyGame.addCategory( new Category(category_name) );
			}

			JeopardyGame.getCategory(category_name).addQuestion(new_question);
		});
	}

/************ HELPER FUNCTIONS -- DOM Manipulation ***************************************/

	// Create the Game Board TABLE
	function createGameBoard()
	{
		Logger.log("Creating the Game Board.");

		// Two "boards" - regular round and final jeopardy
		var main_board = "<tr id=\"round_1_row\" class=\"hidden\">";
		var final_board = "<tr id=\"final_jeopardy_row\" class=\"hidden\">";

		// Get categories;
		let categories = JeopardyGame.getCategories();
		let categoriesLength = categories.length-1;

		categories.forEach(function(category){

			isFinalJeopardy = category.isFinalJeopardy();

			// Properties for the table rows
			colspan 		= (isFinalJeopardy) ? 3 : 1;
			dynamic_width 	= (isFinalJeopardy) ? 100 : (1 / categoriesLength);

			category_name 	= category.getName();
			let preFilledCategoryName = (isFinalJeopardy) ? category_name : "";

			// Set the header for the category
			category_name_row 		= `<tr><th class='category category_title' data-jpd-category-name=\"${category_name}\">${preFilledCategoryName}</th></tr>`;
			
			// Set the questions 
			category_questions_row	= "";
			questions = category.getQuestions();
			questions.forEach(function(question){
				

				quest = question.getQuestion();
				ans   = question.getAnswer();
				key = (isFinalJeopardy) ? category_name : (category_name + " - " + quest["value"]);

				QA_MAP[key] = {
					"question": quest,
					"answer"  : ans
				}
				
				category_questions_row += `<tr><td class='category category_option' data-jpd-quest-key=\"${key}\">${quest["value"]}</tr></td>`;
			});
			
			// The column
			let column = `<td colspan=\"colspan\" style='width:${dynamic_width}%;'><table class='category_column'>${category_name_row} ${category_questions_row}</table></td>`;

			if(isFinalJeopardy)
			{
				final_board += column;
			}
			else
			{
				// Add column for category to Game Board
				main_board += column;
			}
				
			// }
		});

		// Close both rows;
		main_board += "</tr>";
		final_board += "</tr>";
		
		let game_board = main_board + final_board;

		document.getElementById("game_board_body").innerHTML = game_board;
	}

	// Add game name to the board
	function addGameName()
	{
		// Set Game Name on the board
		let gameNameLiveHostView = (IS_LIVE_HOST_VIEW) ? " (Host View) " : ""
		document.getElementById("game_name").innerHTML = GAME_NAME + gameNameLiveHostView;
	}

	// Show the appropriate game section
	function showGameSections()
	{
		// Hide Content
		mydoc.hideContent("#load_game_section");
		mydoc.hideContent("#homemade_jeopardy_title");

		// Show Content
		mydoc.showContent("#game_section");
	}

	// Add the game code to the page
	function addGameCode()
	{
		// Set the game code
		let game_code = (IS_TEST_RUN || IS_LIVE_HOST_VIEW) ? "TEST" : (IS_DEMO_RUN) ? "DEMO" : Helper.getCode();
		CURR_GAME_CODE = game_code;
		document.getElementById("game_code").innerHTML = game_code;

		// Hide the game code section if not being used
		if(IS_LIVE_HOST_VIEW)
		{
			document.getElementById("game_code_header")?.classList.add("hidden")
		}
	}

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
		if(IS_DEMO_RUN)
		{ 
			mydoc.showContent("#toggleHelpTextButton");
			toggleHowToSections();
		}
	}

	// Showing the How To help text
	function toggleHowToSections()
	{
		if(HOW_TO_IS_HIDDEN)
		{
			mydoc.showContent(".how_to_play_section");
			HOW_TO_IS_HIDDEN = false;
		}
		else
		{
			mydoc.hideContent(".how_to_play_section");
			HOW_TO_IS_HIDDEN = true;
		}
	}

	// Load the content into the question block;
	//	>> If the [mode] passed in is in the list [hidIfMod] list, then it will be hidden
	function loadQuestionViewSection(sectionID, content, mode, showInFinalJeopardy, hideIfMode="")
	{
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
		// Don't try to sync teams if live host view
		if(IS_LIVE_HOST_VIEW){ return; }

		formattedTeams = getWhotGotItRight_Section();
		let whoGotItRight = document.getElementById("who_got_it_right_table");
		whoGotItRight.innerHTML = formattedTeams;
	}

	// Hide button to set team by name
	function hideSetTeamButton()
	{
		// hide any direct buttons if visible
		var buttons = document.querySelectorAll(".setTeamDirectly");
		if(buttons.length > 0)
		{
			buttons.forEach(function(button){
				button.classList.add("hidden");
			});
		}
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



/******************* EVENT LISTENERS ************************/

	// Adds the listeners to the category columns once loaded
	function addListenerCategoryClick()
	{
		var categories = document.querySelectorAll(".category_title");
		categories.forEach(function(cell){
			cell.addEventListener("click", onCategoryClick);
		});
	}

	// Add listeners to the game cells;
	function addListenerQuestionClick()
	{
		var cells = document.querySelectorAll(".category_option");
		cells.forEach(function(cell){
			cell.addEventListener("click", onQuestionClick);
		});
	}

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
		let current_value = element.innerHTML;
		let title = element.getAttribute("data-jpd-category-name");
		if (title != current_value)
		{
			element.innerHTML = title;
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

		// Set the current question key to the key of the opened question
		ASKED_QUESTIONS.push(key);

		Logger.log("Loading Question");
		Logger.log(cell);

		let setting = SETTINGS_MAPPING["Answering Questions"];
		let mode = setting.option;

		// Load Teams into Correct Answer Block
		loadTeamNamesInCorrectAnswerBlock();

		// Set the selected cell to disabled;
		cell.style.backgroundColor = "gray";
		cell.style.color = "black";
		cell.disabled = true;

		// Get the mapped object from the Question/Answer Map
		let map = QA_MAP[key];

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

		if (IS_LIVE_HOST_VIEW)
		{
			// Auto-show the answer block in this view
			document.getElementById("answer_block")?.classList.remove("hidden");
		}
		else  // do these things if NOT live host view
		{
			loadQuestionViewSection("reveal_answer_block", undefined, mode, true, "2");
			loadQuestionViewSection("correct_block", undefined, mode, false, "1");
			document.getElementById("assignScoresButton").disabled = true; 
		}
		
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
			document.getElementById("answer_block")?.classList.add("hidden");
			document.getElementById("correct_block")?.classList.add("hidden");
			document.getElementById("question_view")?.classList.add("hidden");
			Timer.resetTimer(); // make sure the timer is reset to default.
		}
	}

	// End the game and archive the list
	function onEndGame()
	{
		let confirmAction = confirm("Would you like to end this game and archive it?");

		if(confirmAction && !IS_TEST_RUN && !IS_DEMO_RUN)
		{
			// Set the list to archived; With updated name;
			let dateCode = Helper.getDateFormatted();
			let archive_name = `${dateCode} - ${CURR_GAME_CODE} - ${GAME_NAME}`;
			MyTrello.update_list_to_archive(CURR_LIST_ID, archive_name , function(){
				alert("Game archived!");
				mydoc.hideContent("#endGameButton");
				mydoc.hideContent("#game_board_section");
				mydoc.hideContent(".pre_team_block");
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

			// Set the 
			// Attempt to set teamCode
			if(IS_FINAL_JEOPARDY)
			{
				let highestScore = getHighestScore();
				getWagersPerTeam(teamCode, highestScore);		
			}
		}

		// Show the sections
		mydoc.showContent("#answer_block");
		mydoc.showContent("#correct_block");
	}

	// Reveal the game board & set initial team
	function onStartGame(event)
	{
		// Sync teams before starting game; True to select random player as well
		onSyncTeams(true);

		// Hide Content
		mydoc.hideContent("#rules_section");
		
		//  Show Content
		mydoc.showContent("#game_board");	
		mydoc.showContent("#teams_table");
		mydoc.showContent("#teams_sync_section");
		mydoc.showContent("#round_1_row");
		mydoc.showContent("#finalJeopardyButton");

		// Do these things if LIVE HOST
		if(IS_LIVE_HOST_VIEW)
		{
			mydoc.hideContent("#teams_table");
			mydoc.hideContent("#teams_sync_section");

			// Auto-show the headers
			onCategoryClickAuto();
		}

		// Set a comment indicating the game is being played
		if(!IS_TEST_RUN && !IS_DEMO_RUN)
		{
			let date = Helper.getDateFormatted();
			let comment = `${date} --> ${CURR_GAME_CODE}`;
			MyTrello.create_card_comment(CURR_GAME_ID, comment);
		}

		// Only used if multiple rounds are set;
		let nextRound = document.getElementById("next_round");
		if (nextRound != undefined)
		{
			nextRound.classList.remove("hidden");
		}
	}

	// Show the next set of questions in the second round
	function onNextRound(event)
	{
		document.getElementById("next_round").classList.add("hidden");
		document.getElementById("round_1_row").classList.add("hidden");
		document.getElementById("round_2_row").classList.remove("hidden");
	}

	//Show the Final Jeopardy section
	function onShowFinalJeopardy()
	{

		// set final jeopardy;
		IS_FINAL_JEOPARDY = true;

		// Hide Content
		mydoc.hideContent("#round_1_row");
		mydoc.hideContent("#round_2_row"); // Will hide round 2 if applicable;
		mydoc.hideContent("#current_turn_section");
		mydoc.hideContent("#time_view_regular");
		mydoc.hideContent("#finalJeopardyButton");

		// Show Content
		mydoc.showContent("#final_jeopardy_audio");
		mydoc.showContent("#final_jeopardy_row");
		// mydoc.showContent("#highest_score_wager");
		mydoc.showContent(".wager_row");
		if(!IS_TEST_RUN && !IS_DEMO_RUN)
		{
			mydoc.showContent("#endGameButton")
		}

		// Add Classes
		mydoc.addClass("#final_jeopardy_row", "final_jeopardy_row");

		// var team_scores = document.querySelectorAll("span.team_score");
		// let highest_score  = (team_scores.length > 0) ? team_scores[0].innerText : "0";
		// document.getElementById("highest_score_value").innerText = highest_score;

		// Logger.log("Highest score: " + highest_score);

	}

	// Sync the teams
	function onSyncTeams()
	{
		// Don't try to sync teams if live host view
		if(IS_LIVE_HOST_VIEW){ return; }

		MyTrello.get_cards(CURR_LIST_ID, function(data){

			response = JSON.parse(data.responseText);
			response.forEach(function(obj){

				teamName = obj["name"].trim().replaceAll("\n", "");
				code = obj["id"];

				// Add to teams array
				if(!TEAMS_ADDED.includes(teamName))
				{
					TEAMS_ADDED.push(teamName);
					onAddTeam(code, teamName);
				}
			});

			document.getElementById("team-sync").style.display = "inline";
			setTimeout(function(){
				document.getElementById("team-sync").style.display = "none";
			}, 1000);

			// Sets the first player if it is not already set
			if(!isCurrentPlayerSet()){ 
				setFirstPlayer();
			}
		});
	}

	// Check if assigning scores button should be enabled
	function onTeamGotItRight()
	{
		let button = document.querySelector("#assignScoresButton");
		var gotItRight = document.querySelectorAll(".who_got_it_right:checked");
		if(gotItRight.length > 0)
		{
			button.disabled = false;
		}
		else
		{
			button.disabled = true;
		}
	}

	// Adds a team Row to the teams table
	function onAddTeam(teamCode, teamName)
	{

		let content = `
			<tr class="team_row">
				<td class="team_name_cell">
					<h2>
						<span contenteditable="true" data-jpd-team-code="${teamCode}" class=\"team_name\">${teamName}</span>
					</h2>
				</td>
				<td>
					<h2><span data-jpd-team-code=\"${teamCode}\" class=\"team_score\">000</span></h2>
				</td>
				<td class=\"wager_row\">
					<button class="setTeamDirectly" onclick="setCurrentPlayerByName('${teamName}')">Set as First Team</button>
					<h2><span data-jpd-team-code=\"${teamCode}\" class=\"team_wager hidden\">000</span></h2>
				</td>
			</tr>
		`;

		document.getElementById("teams_block").innerHTML += content;
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
	}

	// Update the score for all teams that got the question correct
	function onUpdateScore()
	{
		var question_value = document.getElementById("value_block").innerText; // Get the value of the question

		let setting = SETTINGS_MAPPING["Selecting Questions"];
		let mode = setting.option;

		// Get the team inputs for Who Got It Right?
		var teamInputs = document.querySelectorAll(".who_got_it_right");

		if(teamInputs != undefined)
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
			default:
				setCurrentPlayer(CURRENT_TEAM_IDX); // default is to keep the same index;
		}	
	}




/********** HELPER FUNCTIONS -- GETTERS **************************************/

	// Get the table section for "Who Got It Right?"
	function getWhotGotItRight_Section()
	{

		let tableHtml = "";

		let setting = SETTINGS_MAPPING["Answering Questions"];
		let mode = setting.option;
		
		// Load the different sections of who got it right
		let colGroupSection = getWhoGotItRight_ColGroup(mode);
		let headSection = getWhoGotItRight_Head(mode);
		let bodySection = getWhoGotItRight_Body(mode);

		tableHtml = colGroupSection + headSection + bodySection;

		return tableHtml;

	}

	// Get the <colgroup> section for the section = "Who Got It Right?"
	function getWhoGotItRight_ColGroup(mode)
	{
		let colGroupSection = undefined;

		// An override if it is final jeopardy
		mode = (IS_FINAL_JEOPARDY) ? "FJ!" : mode;

		switch(mode)
		{
			case "1":
				colGroupSection = `<colgroup>
										<col style="width:30%"/>
										<col style="width:40%">
										<col/>
									</colgroup>`;
				break;
			case "2":
				colGroupSection = `<colgroup>
										<col style="width:10%"/>
									</colgroup>`;
				break;
			case "FJ!":
					colGroupSection = `<colgroup>
											<col style="width:20%"/>
											<col style="width:30%">
											<col style="width:35%">
											<col/>
										</colgroup>`;
					break;
			default:
				colGroupSection = "";
		}
		return colGroupSection;
	}

	// Get the <head> section for the section = "Who Got It Right?"
	function getWhoGotItRight_Head(mode)
	{
		let headSection = undefined;

		// An override if it is final jeopardy
		mode = (IS_FINAL_JEOPARDY) ? "FJ!" : mode;

		switch(mode)
		{
			case "1":
				headSection = `<thead>
									<tr>
										<th>Team</th>
										<th>Answer</th>
										<th>Correct?</th>
									</tr>
								</thead>`;
				break;
			case "2":
				headSection = `<thead>
									<tr>
										<th>Select Team</th>
									</tr>
								</thead>`;
				break;
			case "FJ!":
					headSection = `<thead>
										<tr>
											<th>Team</th>
											<th>Answer</th>
											<th>Wager</th>
											<th>Correct?</th>
										</tr>
									</thead>`;
					break;
			default:
				headSection = "";
		}
		return headSection;
	}

	// Get the <body> section for the section = "Who Got It Right?"
	function getWhoGotItRight_Body(mode)
	{
		// Get the list of teams;
		var teams = document.querySelectorAll(".team_name");

		// Building the teams for "Who Got It Right?"
		var teamListWhoGotItRight = "";

		// An override if it is final jeopardy
		mode = (IS_FINAL_JEOPARDY) ? "FJ!" : mode;

		teams.forEach(function(obj){
			let teamName = obj.innerHTML;
			let code = obj.getAttribute("data-jpd-team-code");

			let teamOption = "";

			switch(mode)
			{
				case "1":
					teamOption = getWhotGotItRight_CheckBoxRow(teamName, code);
					break;
				case "2":
					teamOption = getWhotGotItRight_RadioButtonRow(teamName, code);
					break;
				case "FJ!":
						teamOption = getWhotGotItRight_CheckBoxRow(teamName, code, true);
						break;
				default:
					teamOption = "";
			}
			teamListWhoGotItRight += teamOption;
		});

		let bodySection = `<tbody id="team_answers_list">${teamListWhoGotItRight}</tbody>`;

		return bodySection;
	}

	// Get an individual Row+Checkbox for a team;
	function getWhotGotItRight_CheckBoxRow(teamName, teamCode, includeWager=false)
	{
		label = `<td><label>${teamName}</label><span>&nbsp;</span></td>`;
		answer = `<td><p class="team_answer" data-jpd-team-code="${teamCode}"></p></td>`;
		wager = (includeWager) ? `<td><p class="team_wager_question_view" data-jpd-team-code="${teamCode}"></p></td>`: "";
		input = `<td><input type="checkbox" data-jpd-team-code="${teamCode}" class="who_got_it_right" name="${teamCode}" onchange="onTeamGotItRight()"></td>`;
		return "<tr>" + label + answer + wager + input + "</tr>";
	}

	// Get an individual Radio button for a team;
	function getWhotGotItRight_RadioButtonRow(teamName, teamCode)
	{
		radioButtonRow = `<tr><td><p>
							<input id="radio_${teamCode}" type="radio" data-jpd-team-code="${teamCode}" class="who_got_it_right" name="who_got_it_right" onchange="onTeamGotItRight()"> &nbsp;
							<label style="cursor:pointer;" for="radio_${teamCode}">${teamName}</label>
						</p></td></tr>`;
		return radioButtonRow;
	}

	// Get the image and audio used for Daily Double
	function getDailyDoubleContent()
	{
		Logger.log("Getting Daily Double Content");
		let content = "";
		content += formatImages("_daily_double_image");
		content += formatAudio("_daily_double_audio", true);
		content += "<br/>";
		return content;
	}

	// Get the game media based on a given value
	function getGameMediaURL(value)
	{
		let url = "";
		if(GAME_MEDIA.hasOwnProperty(value))
		{
			url = GAME_MEDIA[value];
		}
		return url;
	}

	// Get details about a team based on the teams table
	function getTeamDetails(teamCode)
	{
		let teamName = document.querySelector("span.team_name[data-jpd-team-code='"+teamCode+"'"); 
		let teamScore = document.querySelector("span.team_score[data-jpd-team-code='"+teamCode+"'"); 
		let teamWager = document.querySelector("span.team_wager[data-jpd-team-code='"+teamCode+"'"); 
		let teamWager2 = document.querySelector("p.team_wager_question_view[data-jpd-team-code='"+teamCode+"'"); 

		let teamDetails = {
			"name": teamName?.innerText ?? "", 
			"name_ele": teamName, 
			"score": teamScore?.innerText ?? "", 
			"score_ele": teamScore, 
			"wager": teamWager?.innerText ?? "",
			"wager_ele": teamWager,
			"wager_ele2": teamWager2
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

	// Purpose: Returns a random character from the alphabet; Used to generate team codes
	// Get a random character in the alphabet
	function getRandomCharacter()
	{
		characters = "abcdefghijklmnopqrstuvwxyz";
		randChar = Math.floor(Math.random()*characters.length);
		return characters[randChar].toUpperCase();
	}

	// Get the wager for the current team (adjust to max possible - in case someone tries to cheat)
	function getWagersPerTeam(teamCode, highestScore)
	{
		let settings = SETTINGS_MAPPING["Final Jeopardy Wager"];
		let mode = settings.option; 

		let teamDetails = getTeamDetails(teamCode);

		// Reveal the wager element and set to zero by default
		teamDetails["wager_ele"].classList.remove("hidden"); 
		teamDetails["wager_ele"].innerText = 0;
		teamDetails["wager_ele2"].innerText = 0;

		let maxWager = (mode == "2") ? highestScore : teamDetails["score"];

		// Get the wager value from the wager field; Set in field
		MyTrello.get_card_custom_fields(teamCode, function(data){
			response = JSON.parse(data.responseText);


			for(var idx = 0; idx < response.length; idx++)
			{
				let obj = response[idx];

				// skip any field that is not the wager field
				if(obj["idCustomField"] != MyTrello.custom_field_wager) continue;

				let valueObject = obj["value"] ?? {};
				let value = (valueObject.hasOwnProperty("text")) ? valueObject["text"] : "";
				
				// Set the wager value
				value = value.trim();
				let wagerValue = (!isNaN(Number(value))) ? Number(value) : 0;
				wagerValue = (wagerValue > maxWager) ? maxWager : wagerValue;
				teamDetails["wager_ele"].innerText = wagerValue;
				teamDetails["wager_ele2"].innerText = wagerValue;
			}
		});
	}

	function getWagers(teamCode, content="0")
	{

		let max = getMaxPossibleWager();
		let teamWager = document.querySelector("span.team_wager[data-jpd-team-code='"+teamCode+"'"); // only used in final jeopardy
		teamWager.classList.remove("hidden");
		let wager_value = 0;

		// Get the wager value from the wager field
		MyTrello.get_card_custom_fields(teamCode, function(data){
			response = JSON.parse(data.responseText);
			response.forEach(function(obj){

				let valueObject = obj["value"];
				let is_wager_field = obj["idCustomField"] == MyTrello.custom_field_wager;
				let value = (valueObject.hasOwnProperty("text")) ? valueObject["text"] : "";
				
				if(is_wager_field && value != "")
				{
					value = value.trim();
					Logger.log("User wager: " + value);
					let wagerValue = (!isNaN(Number(value))) ? Number(value) : 0;
					Logger.log("Evaluated wager:" + wagerValue);
					wagerValue = (wagerValue > max) ? max : wagerValue;
					Logger.log("Final Wager Value: " + wagerValue);
					teamWager.innerText = wagerValue;
				}
			});
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
		if(team_score != newScore)
		{
			MyTrello.update_card_custom_field(teamCode,MyTrello.custom_field_score,newScore.toString());
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
				MyTrello.update_card(card_id, "");
			});
		}, 5000)
		
	}

	// Set the first player
	function setFirstPlayer()
	{
		var setting = SETTINGS_MAPPING["Who Goes First?"];
		
		if(setting.option == "1")
		{
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
			mydoc.showContent("#current_turn_section");
			
			nextTeam = TEAMS_ADDED[new_index];
			
			Logger.log(`Setting Next Team = ${nextTeam}`);
			document.getElementById("current_turn").innerText = nextTeam;
			
			// Update the index for use in any other call back to this function
			CURRENT_TEAM_IDX = new_index;
		}
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

	// Set the current LIST ID to use for the game
	function setListID()
	{
		// Set the appropriate list based on DEMO, TEST, or real game
		if(IS_DEMO_RUN || IS_TEST_RUN || IS_LIVE_HOST_VIEW)
		{
			let list_id = (IS_DEMO_RUN) ? MyTrello.demo_list_id :  MyTrello.test_list_id ;
			CURR_LIST_ID = list_id;
			Logger.log("Current Game List ID: " + list_id);
		} 
		else
		{
			MyTrello.create_list(game_code,function(data){
				response = JSON.parse(data.responseText);
				CURR_LIST_ID = response["id"];
				Logger.log("Current Game List ID: " + CURR_LIST_ID);
			});
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


/********** HELPER FUNCTIONS -- ASSERTIONS **************************************/

	// Validate the spreadsheet data
	function isValidSpreadsheet(spreadsheetData)
	{
		isValid = true; 

		// First, determine if the data is as expected
		expectedHeaders = [
				"Category Name",
				"Score Value",
				"Daily Double?",
				"Question (Text)",
				"Question (Audio)",
				"Question (Image)",
				"Question (URL)",
				"Answer (Text)",
				"Answer (Audio)",
				"Answer (Image)",
				"Answer (URL)"
			];

		givenHeaders = spreadsheetData["headers"] ?? [];
		givenRows = spreadSheetData["rows"];

		isExpectedHeaders = (expectedHeaders.join(",") == givenHeaders.join(","))
		isExpecedRowCount = (spreadsheetData["rows"]?.length ?? 0) == 31;

		isValid = (isExpectedHeaders && isExpecedRowCount)

		if(!isValid)
		{
			err_msg = "ERROR: Your spreadhsheet is not valid. Please refer to the instructions/template (on the Edit page) for a valid sheet configuration.\n\n";
			gameNotification(err_msg, true);
		}

		return isValid;
	}
	
	// check if a current player has been set
	function isCurrentPlayerSet()
	{
		return (CURRENT_TEAM_IDX > -1);
	}

	function isReservedCode(code)
	{
		let reserved = ["DEMO", "TEST"];
		return reserved.includes(code.toUpperCase());
	}

	// Validate the headers are shown
	function isHeadersVisible()
	{
		let categories = document.querySelectorAll(".category_title");
		let totalMissing = 0;

		categories.forEach((obj) => {
			if( obj.innerText == "" )
			{
				totalMissing += 1;
			}
		});

		if( totalMissing > 0 )
		{
			alert("Please show all the headers before beginning")
		}

		let headersVisible = (totalMissing == 0);
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
		// Don't try to do any validation if live host view
		if(IS_LIVE_HOST_VIEW){ return true; }

		let canOpen = true;

		let allHeadersVisible = isHeadersVisible();
		let isSafeToOpen = isReopenQuestion(key);
		let firstTeamSet = isFirstTeamSet();

		canOpen = allHeadersVisible && isSafeToOpen && firstTeamSet;

		return canOpen; 
	}

	function hasAssignablePoints()
	{
		// Don't try to do any validation if live host view
		if(IS_LIVE_HOST_VIEW){ return false; }

		let assignScoresButton = document.querySelector("#assignScoresButton");
		return (assignScoresButton.disabled == false)
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
			let new_value = value.trim().replaceAll("\\n", "<br/>");
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