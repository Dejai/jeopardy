
/************************ GLOBAL VARIABLES ************************/

	var CURR_GAME_ID = undefined;
	var CURR_MEDIA_CHECKLIST_ID = undefined;

	var GAME_NAME  = "Home-made Jeopardy";

	var GAME_MEDIA = {
		"_daily_double_audio":"../assets/audio/daily_double.m4a",
		"_daily_double_image":"../assets/img/daily_double.jpeg",
	};

	// Storing details about the questions and game stage
	var IS_FINAL_JEOPARDY = false;

/************************ GETTING STARTED ************************/

	mydoc.ready(function(){

		// Set the board name
		MyTrello.SetBoardName("jeopardy");
		
		// Load the game params to determine what should happen next
		validParams = loadGameParams();
		// Set the game board listeners
		onKeyboardKeyup();

		// Check if this is the live host view
		let path = location.pathname;

		// Load the additional views
		loadGameViews();

		// Load the Trello card
		loadGameCardFromTrello();
	});

	// Loads the parameters from the Game URL; returns if valid or not
	function loadGameParams()
	{
		let query_map = mydoc.get_query_map();
		CURR_GAME_ID = query_map["gameid"] ?? undefined;
	}

	// Load the individual Views used for the game
	function loadGameViews()
	{
		$("#menu_section").load("../views/menu.html");
		// $("#rules_section").load("../views/rules.html");
		$("#game_board_section").load("../views/board.html");
		$("#teams_section").load("../views/teams.html");
		$("#timer_section").load("../views/timer.html");

		// Show the question host section
		$("#show_question_section").load(`../views/showQuestionHost.html`, function(data){
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

				// Get the published URL from the card custom field
				MyTrello.get_card_custom_field_by_name(CURR_GAME_ID, "Published URL", (data) =>{

					let resp = JSON.parse(data.responseText);
					custom_value = resp[0]?.value?.text ?? "";
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
			printErrors(errors);
			return;
		}

		// Create/show the board
		createGameBoard();

		// Toggle visibility of sections
		showGameSections();
		addGameName();
		mydoc.hideContent("#game_code_header");

		// Add listeners
		addListenerCategoryClick();
		addListenerQuestionClick();

		// Start Game once all things are set
		onStartGame();
	}

/************ HELPER FUNCTIONS -- DOM Manipulation ***************************************/

	// Create the Game Board TABLE
	function createGameBoard()
	{
		Logger.log("Creating the Game Board.");
		game_board = getJeopardyGameBoard();
		mydoc.loadContent(game_board, "game_board_body");
	}

	// Print the errors
	function printErrors(errors)
	{
		console.log(errors)
		let errorMessage = "ERROR:<br/>Your spreadhsheet is not valid for the following reasons:<br/>";
		errors.forEach( (err)=>{
			errorMessage += `<br/>${err}`;
		});
		gameNotification(errorMessage, true);
	}

	// Add game name to the board
	function addGameName()
	{
		// Set Game Name on the board
		document.getElementById("game_name").innerHTML = GAME_NAME + "<br/>(Host View) ";
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
		let current_value = element.innerText;
		let title = element.getAttribute("data-jpd-category-name");
		if (!current_value.includes(title))
		{
			element.innerHTML += title;
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
		// Get the question key from the clicked cell
		let key = cell.getAttribute("data-jpd-quest-key");

		Logger.log("Loading Question");
		Logger.log(cell);

		// Set the selected cell to disabled;
		cell.classList.add("category_option_selected");
		cell.disabled = true;

		// Get the mapped object from the Question/Answer Map
		let map = JEOPARDY_QA_MAP[key];

		// Format the questions and answers
		let isDailyDouble = map["question"]["dailydouble"];

		let question = formatContent(map["question"]);
		question = (isDailyDouble) ? (getDailyDoubleContent() + question ) : question;

		let answer   = formatContent(map["answer"]);

		let questionValue    = Number(map["question"]["value"]);
		questionValue = isNaN(questionValue) ? 0 : questionValue;
		questionValue = (isDailyDouble) ? (2 * questionValue) : questionValue;
		
		// Load the different sections
		let mode = undefined;
		loadQuestionViewSection("question_block", question, mode, true);
		loadQuestionViewSection("value_header", undefined, mode, false);
		loadQuestionViewSection("value_block", questionValue, mode, false);
		loadQuestionViewSection("answer_block", answer, mode, false, "1,2");

		// Auto-show the answer block in this view
		document.getElementById("answer_block")?.classList.remove("hidden");
		
		// Show the question section
		document.getElementById("question_view").classList.remove("hidden");

	}

	//Close the current question; Resets teh timer;
	function onCloseQuestion()
	{
		document.getElementById("question_view")?.classList.add("hidden");
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

	// Reveal the game board & set initial team
	function onStartGame(event)
	{

		// Hide Content
		mydoc.hideContent("#rules_section");
		
		//  Show Content
		mydoc.showContent("#game_board");	
		mydoc.showContent("#teams_table");
		mydoc.showContent("#teams_sync_section");
		mydoc.showContent("#round_1_row");
		mydoc.showContent("#finalJeopardyButton");

		// Do these things if LIVE HOST
		mydoc.hideContent("#teams_table");
		mydoc.hideContent("#teams_sync_section");
		// Auto-show the headers
		onCategoryClickAuto();
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

/********** HELPER FUNCTIONS -- GETTERS **************************************/

	// Get the image and audio used for Daily Double
	function getDailyDoubleContent()
	{
		Logger.log("Getting Daily Double Content");
		let content = "";
		content += formatImages("_daily_double_image");
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