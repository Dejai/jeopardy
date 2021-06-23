
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

var teams_added = [];
var current_team_idx = -1;

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
			let gameRules = Settings.GetRules();
			console.log(Settings);
			load_game_rules(gameRules);

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

/********************************************************************************
EVENT LISTENERS
*********************************************************************************/

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

//Close the current question; Calls to reset timer, update turn, and clear answers
function onCloseQuestion()
{
	window.scrollTo(0,0); // Scroll back to the top of the page;
	updateScore();
	document.getElementById("answer_block").classList.add("hidden");
	document.getElementById("correct_block").classList.add("hidden");
	document.getElementById("question_view").classList.add("hidden");
	document.getElementById("team_list").innerHTML = ""; // Reset the list of teams, so that it doesn't stack up each time.
	Timer.resetTimer(); // make sure the timer is reset to default.
	onUpdateTurn(); // Pick whos turn it is next
	resetAnswers(); // Reset the answers for each team.
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
		loadQuestion(td);
	} 
	else{ alert("ERROR: Couldn't load question. The selected cell didn't register;"); } 
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
		console.log(comment);
		MyTrello.create_card_comment(CURR_GAME_ID, comment);
	}

	// Only used if multiple rounds are set;
	let nextRound = document.getElementById("next_round");
	if (nextRound != undefined)
	{
		nextRound.classList.remove("hidden");
	}
}

// Selects the next player
function onUpdateTurn()
{
	numTeams  = teams_added.length;
	if(numTeams > 0 && !IS_FINAL_JEOPARDY)
	{
		Logger.log("Updating Turn");

		random = ( !isCurrentPlayerSet() ) ? true : false;

		nextIdx = (random) ? Math.floor(Math.random() * numTeams) : current_team_idx+1;
		nextIdx = (nextIdx == numTeams) ? 0 : nextIdx;

		setCurrentPlayer(nextIdx);			
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
			name = obj["name"];
			code = obj["id"];

			// Add to teams array
			if(!teams_added.includes(name))
			{
				teams_added.push(name);
				onAddTeam(code, name);
			}
		});

		document.getElementById("team-sync").style.display = "inline";
		setTimeout(function(){
			document.getElementById("team-sync").style.display = "none";
		}, 1000);

		// Selects a random player if one isn't already set; 
		if(!isCurrentPlayerSet()){ onUpdateTurn(); }
	});
}

// Adds a team Row to the teams table
function onAddTeam(teamCode, teamName){

	let content = `
		<tr class=\"team_row\">
			<td class=\"team_name_cell\">
				<h2>
					<span contenteditable=\"true\" data-jpd-team-code=\"${teamCode}\" class=\"team_name\">${teamName}</span>
				</h2>
			</td>
			<td>
				<h2><span data-jpd-team-code=\"${teamCode}\" class=\"team_score\">000</span></h2>
			</td>
			<td class=\"wager_row\">
				<h2><span data-jpd-team-code=\"${teamCode}\" class=\"team_wager hidden\">000</span></h2>
			</td>
		</tr>
	`;

	document.getElementById("teams_block").innerHTML += content;
}



/********************************************************************************
Create/Update DOM
*********************************************************************************/

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

		// if(!isFinalJeopardy)
		// {
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

// Set loading results
function set_loading_results(value)
{
	toggle_loading_gif(true);
	let section = document.getElementById("loading_results_section");
	section.innerText = value;
}


/********************************************************************************
HELPER FUNCTIONS
*********************************************************************************/

/* FORMAT */

function formatContent(obj)
{
	console.log(obj);
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
		console.log(formatted);
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

function formatRules(rulesJSON)
{
	console.log("RULES JSON");
	console.log(rulesJSON);

	if(rulesJSON != undefined && rulesJSON.length > 0)
	{
		rulesListItems = "";

		rulesJSON.forEach(function(obj){
			let rule = obj["rule"];
			let subRules = obj["subRules"];

			ruleElement = `<strong class='rule'>${rule}</strong>`
			subeRulesElements = "";
			
			subRules.forEach(function(sub){
				subeRulesElements += `<li class='subrule'>${sub}</li>`
			});

			// Create the overall rule item; Append to the list
			rulesListItems += `<li class='rule_item'>${ruleElement}<ul>${subeRulesElements}</ul></li>`
		});

		// Set the rules
		document.getElementById("rules_list").innerHTML = rulesListItems;
	}
}

/* GET */

// Get an individual checkbox for a team when checking correct answers
function getCheckBox(teamName, teamCode)
{
	label = "<td><label>" + teamName + "</label><span>&nbsp;</span></td>";
	answer = "<td><p class=\"team_answer\" data-jpd-team-code=\"" + teamCode + "\"></p></td>";
	input = "<td><input type=\"checkbox\" data-jpd-team-code=\"" + teamCode + "\" class=\"correct_team\" name=\"" + teamCode + "\"></td>";
	return "<tr>" + label + answer + input + "</tr>";
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

/* Purpose: Generates 4 random characters to create a team code; */
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


	/* Purpose: Returns a random character from the alphabet; Used to generate team codes */

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

/* IS */
// check if a current player has been set
function isCurrentPlayerSet()
{
	return (current_team_idx > -1);
}

function isReservedCode(code)
{
	let reserved = ["DEMO", "TEST"];
	return reserved.includes(code.toUpperCase());
}

/* LOAD */
function loadQuestion(cell)
{
	Timer.resetTimer();

	Logger.log("Loading Question");
	Logger.log(cell);

	// Load Teams into Correct Answer Block
	loadTeamNamesInCorrectAnswerBlock();

	// Set the selected cell to disabled;
	cell.style.backgroundColor = "gray";
	cell.style.color = "black";
	cell.disabled = true;
	
	document.getElementById("question_view").classList.remove("hidden");

	let key = cell.getAttribute("data-jpd-quest-key");

	let map = QA_MAP[key];

	let question = formatContent(map["question"]);
	let answer   = formatContent(map["answer"]);
	let value    = Number(map["question"]["value"]);
	let isDailyDouble = map["question"]["dailydouble"];

	if(isDailyDouble)
	{
		question = getDailyDoubleContent() + question;
	}

	let question_block = document.getElementById("question_block");
	let answer_block   = document.getElementById("answer_block");
	let value_block    = document.getElementById("value_block");

	question_block.innerHTML = question;
	answer_block.innerHTML = answer;
	value_block.innerHTML = (isDailyDouble) ? 2 * value : IS_FINAL_JEOPARDY ? getMaxPossibleWager() : isNaN(value) ? "n/a" : value;
}

function loadTeamNamesInCorrectAnswerBlock()
{
	// Load the teams into the popup; To be used to determine who got it right;
	document.getElementById("team_list").innerHTML = "";
	teams = document.querySelectorAll(".team_name");
	teams.forEach(function(obj){
		name = obj.innerHTML;
		code = obj.getAttribute("data-jpd-team-code");
		inp = getCheckBox(name, code);
		document.getElementById("team_list").innerHTML += inp;
	});
}

/* RESET */
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

/* SET */ 
// Set the current player
function setCurrentPlayer(idx=-1)
{
	if(idx != -1)
	{
		mydoc.showContent("#current_turn_section");
		nextTeam = teams_added[nextIdx];
		document.getElementById("current_turn").innerText = nextTeam;
		// Update the index for next iteration
		current_team_idx = nextIdx;
	}
}

// Show the Toggle Button for How To
function showHowToPlayButton()
{
	// Show the option for the help text if it is a demo game;
	if(IS_DEMO_RUN)
	{ 
		console.log("SHOW BUTTON!");
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

/* UPDATE */

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
	var correct = document.querySelectorAll(".correct_team"); // Get the list of teams that got it correct
	var question_value = document.getElementById("value_block").innerText; // Get the value of the question

	var isFinalUpdate = IS_FINAL_JEOPARDY;

	for(var idx = 0; idx < correct.length; idx++)
	{
		let ele = correct[idx];
		let teamCode = ele.getAttribute("data-jpd-team-code");

		// Get team score from page
		let team_score_value = document.querySelector("span.team_score[data-jpd-team-code='"+teamCode+"'");
		let team_score = Number(team_score_value.innerText);

		// Get team wager from page
		let team_wager_value = document.querySelector("span.team_wager[data-jpd-team-code='"+teamCode+"'"); // only used in final jeopardy
		let team_wager = Number(team_wager_value.innerText);

		let points = (IS_FINAL_JEOPARDY) ? team_wager : Number(question_value);

		if (ele.checked)
		{
			let new_score = team_score + points;
			team_score_value.innerText = new_score;
			// Update team score in trello
			MyTrello.update_card_custom_field(teamCode,MyTrello.custom_field_score,new_score.toString());
		} 
		else if (IS_FINAL_JEOPARDY && !ele.checked)
		{
			let new_score = team_score - points;
			team_score_value.innerText = new_score;
		}
	}
	// updateLeader();
	updateLeader();
}

