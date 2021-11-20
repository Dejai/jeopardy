
/************************ GLOBAL VARIABLES ************************/

	var JeopardyGame = undefined;
	var CURR_GAME_ID = undefined;
	var CURR_LIST_ID = undefined;
	var CURR_GAME_CODE = "";
	var GAME_NAME  = "Home-made Jeopardy";
	var HOW_TO_IS_HIDDEN = true;

	var GAME_MEDIA = {
		"_daily_double_audio":"../assets/audio/daily_double.m4a",
		"_daily_double_image":"../assets/img/daily_double.jpeg",
	};

	var QA_MAP = {};   //The Question-Answer map;
	var IS_FINAL_JEOPARDY = false;

	// Storing the current players
	var TEAMS_ADDED = [];
	var CURRENT_TEAM_IDX = -1;
	var LAST_TEAM_CORRECT = undefined; // only used in game mode with single answerer

	var NUMBER_OF_PLAYERS = 0;
	var PLAYER_MAPPING = {};

	var SETTINGS_MAPPING = {};


	var IS_TEST_RUN = false;
	var IS_DEMO_RUN = false;

/************************ GETTING STARTED ************************/

	mydoc.ready(function(){
		// Make sure the page doesn't close once the game starts
		window.addEventListener("beforeunload", onClosePage);

		// Set the game board listeners
		game_board_listeners();

		// Load the additional views
		load_views();

		// Set timer callback
		if(Timer)
		{
			Timer.setTimeUpCallback(function(){
				document.getElementById("time_up_sound").play();
			});
		}

		// Load the game params to determine what should happen next
		loadGameParams();
	});


	function loadGameParams()
	{
		let query_map = mydoc.get_query_map();
		if(query_map != undefined)
		{
			IS_DEMO_RUN = (query_map.hasOwnProperty("demo") && query_map["demo"]==1) ? true : false;
			IS_TEST_RUN = (query_map.hasOwnProperty("test") && query_map["test"]==1) ? true : false;
			CURR_GAME_ID = (query_map.hasOwnProperty("gameid")) ? query_map["gameid"] : undefined;

			if(IS_TEST_RUN){ mydoc.addTestBanner(); }
			
			load_game_from_trello();
		}
		else
		{
			set_loading_results("Cannot load game. Incorrect parameters provided.");
		}
	}

	function game_board_listeners()
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

	function load_views(){
		$("#menu_section").load("../views/menu.html");
		$("#rules_section").load("../views/rules.html");
		$("#game_board_section").load("../views/board.html");
		$("#teams_section").load("../views/teams.html");
		$("#timer_section").load("../views/timer.html");
		$("#show_question_section").load("../views/showQuestion.html", function(data){
			// Set listeners for closing question
			var close_button = document.getElementById("close_question_view");
			close_button.addEventListener("click", onCloseQuestion);
		});
	}

	// Get the cards
	function load_game_from_trello()
	{
		// Clear loading results
		set_loading_results("");

		// Show the loading section
		toggle_loading_gif();

		try
		{
			// Throw error if game ID is not set;
			if(CURR_GAME_ID == undefined){ throw "Game ID is not valid! Cannot load game."; }

			MyTrello.get_single_card(CURR_GAME_ID, function(data){

				response = JSON.parse(data.responseText);

				GAME_NAME = response["name"];
				let gameURL = response["desc"].trim();

				//Load the Attachments on the Game (if any);
				load_attachments_from_trello();

				// Determine if the How To button should display
				showHowToPlayButton();

				// Load the game settings & rules
				let gameSettings = Settings.GetSettings(myajax.GetJSON(response["desc"]));
				// let gameRules = Settings.GetRules();
				load_game_rules(gameSettings);

				// Get the published URL from the card custom field
				MyTrello.get_card_custom_fields(CURR_GAME_ID, function(data2){
					response2 = JSON.parse(data2.responseText);
					response2.forEach(function(obj){
						let valueObject = obj["value"];
						let is_pub_url_field = obj["idCustomField"] == MyTrello.custom_field_pub_url;
						let value = (valueObject.hasOwnProperty("text")) ? valueObject["text"] : "";
						
						if(is_pub_url_field && value != "")
						{
							load_game_from_google(value);
						}
					});
				});
			});
		}
		catch(error)
		{
			set_loading_results("Sorry, something went wrong!\n\n"+error);
		}
	}

	// Parse and load the game rules
	function load_game_rules(rules=undefined)
	{
		try
		{
			formatRules(rules);
		}
		catch(error)
		{
			Logger.log(error);
			set_loading_results("Sorry, something went wrong!\n\n"+error);

		}
	}


	// Get the attachments on the card (if any)
	function load_attachments_from_trello()
	{
		try
		{
			MyTrello.get_card_attachments(CURR_GAME_ID, function(data){

				response = JSON.parse(data.responseText);

				if(response.length > 0) //Process the attachments, then load the spreadsheet;
				{
					Logger.log("Loading attachments from card");
					response.forEach(function(obj){
						name = obj["fileName"];
						path = obj["url"];
						GAME_MEDIA[name] = path;
					});
				}
			});
		}
		catch(error)
		{
			set_loading_results("Sorry, something went wrong!\n\n"+error);
		}
	}

	// Get the list of games from the spreadsheet
	function load_game_from_google(urlPath)
	{
		let response = "";
		try
		{
			myajax.AJAX(
				{
				method: "GET",
				path : urlPath,
				cacheControl: "no-cache",
				success: function(request){
					Logger.log("Got the Game Data from Google!");
					preprocess_game_sheet(request);
				},
				failure : function(request){
					Logger.log("Something went wrong when trying to get data from Google!");
					preprocess_game_sheet(request);
				}
				}
			);
		}
		catch(error)
		{
			set_loading_results("Sorry, something went wrong!\n\n"+error);
		}
	}

	// Validate if the game sheet matches the expected format
	function preprocess_game_sheet(data)
	{
		let rows = data.responseText.split("\n");
		let cols = rows[0].split("\t");
		if(rows.length == 32 && cols.length == 11)
		{
			// Remove the header row
			rows.shift();

			// Create the game;
			processed = create_jeopardy_game(rows);

			// If processed returns a valid 
			if(processed) { initialize_game() }
		}
		else
		{
			toggle_loading_gif(true);
			set_loading_results("ERROR: Your sheet is not valid. Please refer to the instructions/template (on the Edit page) for a valid sheet configuration.\n\n");
		}
	}

	// Creates the Jeopardy game objects
	function create_jeopardy_game(data)
	{

		Logger.log("Creating Jeopardy Objects");
		JeopardyGame = new Jeopardy();

		data.forEach(function(row){

			let content = row.split("\t");
			
			let category 		= content[0];

			let value 			= content[1];
			let daily_double	= content[2];

			let question_text 	= content[3];
			let question_audio 	= content[4];
			let question_image 	= content[5];
			let question_url 	= content[6];
			let answer_text 	= content[7];
			let answer_audio 	= content[8];
			let answer_image 	= content[9];
			let answer_url 		= content[10];

			// Setup the new question
			let new_question = new Question(question_text, question_audio, question_image, question_url,
											answer_text, answer_audio, answer_image, answer_url,
											value, daily_double);

			if(JeopardyGame.categoryExists(category))
			{
				let theCategory = JeopardyGame.getCategory(category);
				theCategory.addQuestion(new_question);
			}
			else
			{
				let newCategory = new Category(category);
				newCategory.addQuestion(new_question);
				JeopardyGame.addCategory(newCategory);
			}
		});

		return (JeopardyGame != undefined);
	}

	// Handles setting up all the pieces for the game;
	function initialize_game()
	{
		// Set Game Name
		document.getElementById("game_name").innerHTML = GAME_NAME;

		// Creates the game table
		create_game_board();

		// Show loading gif
		toggle_loading_gif();

		// Hide Content
		mydoc.hideContent("#load_game_section");
		mydoc.hideContent("#homemade_jeopardy_title");

		// Show Content
		mydoc.showContent("#game_section");

		// Add listeners
		addListenerCategoryClick();
		addListenerQuestionClick();

		// Set the game code
		// let game_code = getGameCode();
		let game_code = (IS_TEST_RUN) ? "TEST" : (IS_DEMO_RUN) ? "DEMO" : Helper.getCode();
		CURR_GAME_CODE = game_code;
		document.getElementById("game_code").innerHTML = game_code;

		// Set the appropriate list based on DEMO, TEST, or real game
		if(IS_DEMO_RUN || IS_TEST_RUN)
		{
			let list_id = (IS_TEST_RUN) ? MyTrello.test_list_id : MyTrello.demo_list_id;
			MyTrello.set_current_game_list(list_id);
			Logger.log("Current Game List ID: " + list_id);
		} 
		else
		{
			MyTrello.create_list(game_code,function(data){
				response = JSON.parse(data.responseText);
				MyTrello.set_current_game_list(response["id"]);
				CURR_LIST_ID = response["id"];
				Logger.log("Current Game List ID: " + MyTrello.current_game_list_id);
			});
		}
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

	// Prevent the page accidentally closing
	function onClosePage(event)
	{
		event.preventDefault();
		event.returnValue='';
	}

	// Openning a question 
	function onOpenQuestion(cell)
	{
		Timer.resetTimer();

		// TO DO: Turn this back on;
		// let validHeaders = onValidateHeaders()
		// if(!validHeaders){ return; }

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
		
		// Get the question key from the clicked cell
		let key = cell.getAttribute("data-jpd-quest-key");

		// Get the mapped object from the Question/Answer Map
		let map = QA_MAP[key];

		// Format the questions and answers
		let question = formatContent(map["question"]);
		let answer   = formatContent(map["answer"]);
		let value    = Number(map["question"]["value"]);
		let isDailyDouble = map["question"]["dailydouble"];
		// update question if it is daily double
		question = (isDailyDouble) ? (getDailyDoubleContent() + question ) : question;
		
		// Calculate the value for the points;
		let questionValue = (isDailyDouble) ? 2 * value : IS_FINAL_JEOPARDY ? getMaxPossibleWager() : isNaN(value) ? "n/a" : value;

		loadQuestionViewSection("question_block", question, mode);
		loadQuestionViewSection("value_block", questionValue, mode);
		loadQuestionViewSection("reveal_answer_block", undefined, mode, "2");
		loadQuestionViewSection("answer_block", answer, mode, "1,2");
		loadQuestionViewSection("correct_block", undefined, mode, "1");

		// Show the question section
		document.getElementById("question_view").classList.remove("hidden");

	}

	//Close the current question; Calls to reset timer, update turn, and clear answers
	function onCloseQuestion()
	{
		window.scrollTo(0,0); // Scroll back to the top of the page;
		updateScore();
		document.getElementById("answer_block").classList.add("hidden");
		document.getElementById("correct_block").classList.add("hidden");
		document.getElementById("question_view").classList.add("hidden");
		Timer.resetTimer(); // make sure the timer is reset to default.

		// Only do these actions if it is NOT final jeopardy
		if(!IS_FINAL_JEOPARDY)
		{
			var singleTeamWinner = undefined
			onUpdateTurn(); // Pick whos turn it is next

			// Reset the answers for each team, so it no longer shows
			resetAnswers(); // Reset the answers for each team.
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
		if(CURRENT_TEAM_IDX != -1)
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
		else
		{
			alert("Please ensure a team is set to current team");
		}
		
	}

	// Reveal the answer in the question popup; Also reveal player answers
	function onRevealAnswer(event)
	{
		
		var answers = document.querySelectorAll(".team_answer");

		for(var idx = 0; idx < answers.length; idx++)
		{
			let obj = answers[idx];
			let teamCode = obj.getAttribute("data-jpd-team-code");

			MyTrello.get_single_card(teamCode, function(data){
				response = JSON.parse(data.responseText);
				obj.innerHTML = response["desc"];
			});

			// Attempt to set teamCode
			if(IS_FINAL_JEOPARDY)
			{
				getWagers(teamCode);			
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

	// Updates the turn to the next player
	function onUpdateTurn()
	{
		let setting = SETTINGS_MAPPING["Selecting Questions"];
		let mode = setting.option;

		console.log(mode);

		switch(mode)
		{
			case "1":
				setCurrentPlayer(CURRENT_TEAM_IDX+1); //Increase index by +1
				break;
			case "2":
				let teamDetails = getTeamDetails(LAST_TEAM_CORRECT);
				let teamName = teamDetails["name"];
				console.log(teamDetails);
				setCurrentPlayerByName(teamName);
				break;
			default:
				setCurrentPlayer(CURRENT_TEAM_IDX); // default is to keep the same index;
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
		mydoc.showContent("#highest_score_wager");
		mydoc.showContent(".wager_row");
		if(!IS_TEST_RUN && !IS_DEMO_RUN)
		{
			mydoc.showContent("#endGameButton")
		}

		// Add Classes
		mydoc.addClass("#final_jeopardy_row", "final_jeopardy_row");

		var team_scores = document.querySelectorAll("span.team_score");
		let highest_score  = (team_scores.length > 0) ? team_scores[0].innerText : "0";
		document.getElementById("highest_score_value").innerText = highest_score;

		Logger.log("Highest score: " + highest_score);

	}

	// Sync the teams
	function onSyncTeams(selectPlayer)
	{
		MyTrello.get_cards(MyTrello.current_game_list_id, function(data){

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

	// Validate the headers are shown
	function onValidateHeaders()
	{
		let categories = document.querySelectorAll(".category_title");
		let totalMissing = 0;

		categories.forEach((obj) => {
			if( obj.innerText == "" )
			{
				totalMissing += 1;
			}
		});

		if(totalMissing > 0)
		{
			alert("Please show all the headers before beginning")
		}

		return (totalMissing == 0)
	}



/************ Create/Update DOM ***************************************/

	function create_game_board()
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

			// Set the header for the category
			category_name_row 		= `<tr><th class='category category_title' data-jpd-category-name=\"${category_name}\"></th></tr>`;
			
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

		// game_board += "</tr><tr id=\"final_jeopardy_row\" class=\"hidden\">";

		let game_board = main_board + final_board;

		document.getElementById("game_board_body").innerHTML = game_board;
	}

	// Loading spinning gif
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

	// Set loading results
	function set_loading_results(value)
	{
		toggle_loading_gif(true);
		let section = document.getElementById("loading_results_section");
		section.innerText = value;
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
	function loadQuestionViewSection(sectionID, content, mode, hideIfMode="")
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
		}

	}

	// Loads the list of teams in the "Correct answer" section to pick who got it right
	function loadTeamNamesInCorrectAnswerBlock()
	{
		formattedTeams = getWhotGotItRight_Section();
		let whoGotItRight = document.getElementById("who_got_it_right_table");
		whoGotItRight.innerHTML = formattedTeams;
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

	function formatRules(settingsJSON)
	{

		if(settingsJSON != undefined && settingsJSON.length > 0)
		{
			rulesListItems = "";

			settingsJSON.forEach(function(setting){

				// let name = setting["label"];
				let ruleObj = setting["rule"];

				let ruleName = setting["name"];
				let optionID = setting["option"];
				let customValue = setting["value"] ?? "";

				// Create the Setting mapping:
				SETTINGS_MAPPING[ruleName] = {"option": optionID, "customValue": customValue };

				let rule = ruleObj["rule"];
				let subRules = ruleObj["subRules"];

				

				ruleElement = `<strong class='rule'>${rule}</strong>`
				subRulesElements = "";
				
				subRules.forEach(function(sub){
					subRulesElements += `<li class='subrule'>${sub}</li>`
				});

				// Create the overall rule item; Append to the list
				rulesListItems += `<li class='rule_item'>${ruleElement}<ul>${subRulesElements}</ul></li>`
			});

			// Set the rules
			document.getElementById("rules_list").innerHTML = rulesListItems;
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
		let teams = getWhoGotItRight_Teams(mode);
		let colGroupSection = getWhoGotItRight_ColGroup(mode);
		let headSection = getWhoGotItRight_Head(mode);
		let bodySection = getWhoGotItRight_Body(mode, teams);

		tableHtml = colGroupSection + headSection + bodySection;

		return tableHtml;

	}

	// Get the <colgroup> section for the section = "Who Got It Right?"
	function getWhoGotItRight_ColGroup(mode)
	{
		let colGroupSection = undefined;

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
			default:
				colGroupSection = "";
		}
		return colGroupSection;
	}

	// Get the <head> section for the section = "Who Got It Right?"
	function getWhoGotItRight_Head(mode)
	{
		let headSection = undefined;
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
			default:
				headSection = "";
		}
		return headSection;
	}

	// Get the <body> section for the section = "Who Got It Right?"
	function getWhoGotItRight_Body(mode, teamsList)
	{

		let teamSection = "";
		switch(mode)
		{
			case "1":
				teamSection =  teamsList;
				break;
			case "2":
				// teamSection = `<tr>
				// 					<td>
				// 						<select>${teamsList}</select>
				// 					</td>
				// 				</th>`;
				teamSection = teamsList;
				break;
			default:
				teamSection = "";
		}

		let bodySection = `<tbody id="team_answers_list">${teamSection}</tbody>`;

		return bodySection;
	}

	// Get the list of teams to populate the section = "Who Got it Right?"
	function getWhoGotItRight_Teams(mode)
	{

		var teams = document.querySelectorAll(".team_name");

		var teamListWhoGotItRight = "";

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
				default:
					teamOption = "";
			}
			teamListWhoGotItRight += teamOption;
		});

		return teamListWhoGotItRight;
	}

	// Get an individual Row+Checkbox for a team;
	function getWhotGotItRight_CheckBoxRow(teamName, teamCode)
	{
		label = `<td><label>${teamName}</label><span>&nbsp;</span></td>`;
		answer = `<td><p class="team_answer" data-jpd-team-code="${teamCode}"></p></td>`;
		input = `<td><input type="checkbox" data-jpd-team-code="${teamCode}" class="who_got_it_right" name="${teamCode}"></td>`;
		return "<tr>" + label + answer + input + "</tr>";
	}

	// Get an individual Radio button for a team;
	function getWhotGotItRight_RadioButtonRow(teamName, teamCode)
	{
		radioButtonRow = `<p>
							<input id="radio_${teamCode}" type="radio" data-jpd-team-code="${teamCode}" class="who_got_it_right" name="who_got_it_right"> &nbsp;
							<label style="cursor:pointer;" for="radio_${teamCode}">${teamName}</label>
						</p>`;
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

	//Purpose: Generates 4 random characters to create a team code;
	function getGameCode()
	{
		
		let game_code = "";

		if(IS_DEMO_RUN || IS_TEST_RUN)
		{
			game_code = (IS_TEST_RUN) ? "TEST" : "DEMO";
		}
		else
		{
			let char1 = getRandomCharacter();
			let char2 = getRandomCharacter();
			let char3 = getRandomCharacter();
			let char4 = getRandomCharacter();

			let chars = char1 + char2 + char3 + char4;

			// Make sure the code is not demo;
			game_code = ( isReservedCode(chars) ) ? getGameCode() : chars;
		}

		Logger.log("Game Code = " + game_code);

		return game_code
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

		let teamDetails = {
			"name": teamName?.innerText ?? "", 
			"score": teamScore?.innerText ?? "", 
			"wager": teamWager?.innerText ?? ""
		}

		return teamDetails;
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


/********** HELPER FUNCTIONS -- ASSERTIONS **************************************/

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

/********** HELPER FUNCTIONS -- SETTERS, UPDATERS, and RESETERS **************************************/

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
		else if (setting.option == "2")
		{
			alert("Please select a team that goest first");
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

	// Set the current player based on index
	function setCurrentPlayer(idx=-1)
	{
		let numTeams  = TEAMS_ADDED.length;

		let new_index = (idx > numTeams) ? 0 : idx;

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

	// Update the score for all teams that got the question correct
	function updateScore()
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

	function calculateTeamNewScore(teamCode, questionValue, isCorrect)
	{
		// Get team score from page
		let team_score_value = document.querySelector("span.team_score[data-jpd-team-code='"+teamCode+"'");
		let team_score = Number(team_score_value.innerText);

		// Get team wager from page
		let team_wager_value = document.querySelector("span.team_wager[data-jpd-team-code='"+teamCode+"'"); // only used in final jeopardy
		let team_wager = Number(team_wager_value.innerText);

		// Calculate the points of the question;
		let points = (IS_FINAL_JEOPARDY) ? team_wager : Number(questionValue);

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
		team_score_value.innerText = newScore;

		// Update Trello if the score is different;
		if(team_score != newScore)
		{
			MyTrello.update_card_custom_field(teamCode,MyTrello.custom_field_score,newScore.toString());
		}

	}

