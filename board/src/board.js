// The instance of this jeopardy game
var JeopardyGame = undefined;
var GameCard = undefined; // Used to store the game card from Trello
var CurrentSection = ""; 
var SectionsToBeSaved = []; // Keep track of sections that should be saved

/****************  HOST: ON PAGE LOAD ****************************/ 
	
	mydoc.ready(function()
	{
		// Set board name
		MyTrello.SetBoardName("jeopardy");

		// Loading up this page based on pathname;
		onKeyboardKeyup();

		// Make sure the page doesn't close once the game starts
		window.addEventListener("beforeunload", onClosePage);

        // Check for test run
        if( mydoc.get_query_param("test") != undefined){ mydoc.addTestBanner(); }

		let gameID = mydoc.get_query_param("gameid");

		if(gameID != undefined)
		{
			// Get the game (i.e. card)
			onGetGame(gameID);
		}
        else
        {
            
        }
	});

	// Prevent the page accidentally closing
	function onClosePage(event)
	{
		if( (JeopardyGame?.Game?.Asked?.length ?? 0) > 0)
		{
			event.preventDefault();
			event.returnValue='';
		}
	}

/****** MAIN GAME PARTS: Get list of content & core setup things ****************************/ 

    // Create or return an instance of the Jeopardy game
	function onCreateJeopardyGame(gameID, gameName)
	{
		JeopardyGame = (JeopardyGame == undefined) ? new Jeopardy(gameID, gameName) : JeopardyGame;
		return JeopardyGame
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

				// Get game components
				var gameID = response["id"];
				var gameName = response["name"];
				var attachments = response["attachments"];

				// Create a new Jeopardy instance
				onCreateJeopardyGame(gameID, gameName);
				
                // Get the game list (for the set of users)
                onGetGameList();

				// Set game name & ID on the page
                onSetGameMenu();

                // Set the attachments mapping;
				JeopardyGame.setAttachments(attachments);
            
                // Get the game details;
                onGetGameDetails();

                // Add teh common media
                onSetCommonMedia();
		
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

    // Get the game list & set it in game object
    function onGetGameList()
    {
		let gameCode = mydoc.get_query_param("gamecode") ?? "";

        if(gameCode != "")
        {
            // Create new game
            JeopardyGame.newGame(gameCode);

			// Set if this is a test run game
			JeopardyGame.Game.IsTestRun = (mydoc.get_query_param("test") != undefined);


            // Parse through lists & get one with the code
            MyTrello.get_lists("open", (data)=>{
                let resp = JSON.parse(data.responseText);
                let list = resp.filter( (val)=>{
                	return (val.name.toUpperCase() == gameCode.toUpperCase());
                });
                let listID = list[0]?.id ?? undefined;
                if(listID != undefined)
                {  
                    // Set the game List ID
                    JeopardyGame.Game.setListID(listID);
                    
                    // Only set the code after we get a list 
                    mydoc.setContent("#game_code", {"innerHTML":JeopardyGame.Game.getCode()});
					mydoc.showContent("#game_code_header");

                    // Only show the start button after we get a list
                    onShowStartButton();
                }
            });
        }
        
    }

	// Get the key details of an existing game
	function onGetGameDetails()
	{
		try
		{
			// Get the game files
			let attachments = Object.keys(JeopardyGame.Attachments);
			attachments.forEach( (fileName)=>{
				onGetGameFile(JeopardyGame.getGameID(),fileName)
			});

			// Adjust visibility of tabs
			mydoc.showContent("#host_edit_tab_section");

			// See what sections can be shown after getting the diff components
			setTimeout( ()=>{
				mydoc.showContent("#enter_game_name_section");
				mydoc.showContent("#edit_game_section");
				mydoc.showContent("#edit_game_details_table");
				set_loading_results("");
			},1000);
		}
		catch(error)
		{
			set_loading_results("onGetGameDetails: Something went wrong:<br/>" + error);
		}
	}

    // Get the attachment & do the corresponding callback
	function onGetGameFile(cardID, fileName)
	{
		try 
		{
			// Get the attachment ID;
			let attachmentID = JeopardyGame.getAttachmentID(fileName);

			// Get the corresponding attachment
			MyTrello.get_card_attachment(cardID, attachmentID, fileName, (data)=>{
						
				let response = myajax.GetJSON(data.responseText);

				// The file with the game rules
				if(fileName == "config.json")
				{
					JeopardyGame.Config.createConfiguration(response);
					
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

    // Load the game menu
    function onSetGameMenu()
    {
        let gameObj = {"GameName":JeopardyGame.getGameName() };
        MyTemplates.getTemplate("board/templates/menu.html",gameObj,(template)=>{
            mydoc.setContent("#homemade_jeopardy_title", {"innerHTML":template});
        });
    }

	// Set the game Config/Rules
	function onSetGameRules()
	{
		var rulesHTML = "";
        // Format the rules for hte board
		Rules.forEach( (ruleObj, idx, array)=>{
			let ruleKey = JeopardyHelper.getKeyName(ruleObj.Name);
			let savedConfig = JeopardyGame.Config.getConfiguration(ruleKey)
           
			// The rule object that gets displayed on the page;
            newRuleObj = {"Rule": "", "SubRules":"" }

			// Set the current rule based on saved option
			ruleObj.Options?.forEach((option)=>{
                if(option.id == savedConfig.option)
                {
					let theValue = savedConfig?.value ?? "";
                    newRuleObj["Rule"] = option['rule'].replace("${VALUE}",theValue);
                    
                    // Set any subrules;
                    if(option["subRules"]?.length > 0)
                    {
                        subRulesHTML = ""
                        option["subRules"].forEach( (subRule)=>{
                            subRulesHTML += `<span class="subRule">${subRule}</span>`;
                        });
                        newRuleObj["SubRules"] = subRulesHTML;
                    }
                }
			});

            // Set the template for the rules
            MyTemplates.getTemplate("board/templates/ruleItem.html",newRuleObj,(template)=>{
				rulesHTML += template; 

				if(idx == array.length-1)
				{
					mydoc.setContent("#rules_list", {"innerHTML":rulesHTML});
					mydoc.showContent("#rules_section");
				}
			});	
		});
	}

	// Set the game questions
	function onSetGameQuestions()
	{
		// Get the game board & apply to the page
        JeopardyGame.getGameBoard((categoryTemplate, isFinalJeopardyCategory)=>{
            var x = (isFinalJeopardyCategory) ?
                        mydoc.setContent("#final_jeopardy_row", {"innerHTML":categoryTemplate}, true) :
                        mydoc.setContent("#round_1_row", {"innerHTML":categoryTemplate}, true);
        });
	}

	// Set the game media
	function onSetGameMedia()
	{
		// Load the game-specific form URL
		// let formURL = MyGoogleDrive.getFormURL(JeopardyGame.getGameID());
		// let aHref =	document.getElementById("gameFormURL");
		// if (aHref != undefined){ aHref.href = formURL; }
		
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
				MyTemplates.getTemplate("host/templates/mediaItem.html", media, (template)=>{
					mydoc.setContent("#game_media", {"innerHTML": (breakLine + template) }, true);
				});
				if(media.Type == "Image" && allAudioSet){ firstImageSet = true; }
			});
		}
	}

    // Set the common media
    function onSetCommonMedia()
    {
        // Add the default jeopardy media
        let dailyDoubleAudio = { 
            "ID": "_dailyDoubleAudio", 
            "Name": "_dailyDoubleAudio", 
            "Type": "Audio",
            "Src": "src/audio/daily_double.m4a"
        }
        let dailyDoubleImage = { 
            "ID": "_dailyDoubleImage", 
            "Name": "_dailyDoubleImage", 
            "Type": "Image",
            "Src": "src/img/daily_double.jpeg"
        }

        // Add the daily double media
        JeopardyGame.addMedia(dailyDoubleAudio);
        JeopardyGame.addMedia(dailyDoubleImage);
    }

/****** GAME STATE: In case of page refrsh ****************************/ 

	// Load the card to track Game state -- and load any saved state
	function loadGameState(cardObject)
	{
        let cardID = cardObject["id"];
        MyTrello.get_comments(cardID, (commentData)=>{

            let comments = JSON.parse(commentData.responseText);

            if(comments?.length > 0)
            {
                // We've already opened a question, so show all headers
                onCategoryClickAuto();

                // Loop through any comments to set the game state (if any);
                comments.forEach( (obj)=>{
                    let val = obj.data?.text ?? "";
                    if(val != "")
                    {
                        JeopardyGame.Game.Asked.push(val);
                        onSetQuestionAsAsked(val);
                    }
                });
            }
        });
	}

/****** ACTIONS: For General Board ****************************/ 
	
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
					if(JeopardyGame.Game.IsFinalJeopardy)
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

    // Show the start button
    function onShowStartButton()
    {
        mydoc.showContent("#startGameSection");
    }

    // Reveal the game board & set initial team
	function onStartGame()
	{
		// Sync teams before starting game; 
		onSyncTeams();

		// Hide Content
		mydoc.hideContent("#rules_section");
        mydoc.hideContent("#startGameSection");
		
		// Show Content
		mydoc.showContent("#game_board");	
		mydoc.showContent("#teams_table");
		mydoc.showContent("#teams_sync_section");
		mydoc.showContent("#round_1_row");
		mydoc.showContent("#finalJeopardyButton");

		// Load the question popup
        onSetQuestionPopup();

		// Set a comment indicating the game is being played
		if(!JeopardyGame.Game.IsTestRun && JeopardyGame.Game.Code != "TEST")
		{
			let date = Helper.getDateFormatted();
			let comment = `${date} --> ${JeopardyGame.Game.Code}`;
			MyTrello.create_card_comment(CURR_GAME_ID, comment);
		}
	}

    // Set the question popup; Also used to reset after closing 
    function onSetQuestionPopup()
    {
        // Setting the timer is part of this process
        MyTemplates.getTemplate("board/templates/timer.html", {},(template)=>{
            mydoc.setContent("#timer_section",{"innerHTML":template});

			// Set the timer details
			setTimerDetails();

        });

        // Setting the parts of the question
        MyTemplates.getTemplate("board/templates/questionPopup.html", {},(template)=>{
            mydoc.setContent("#show_question_section",{"innerHTML":template});
        });
    }

	// Sync the teams
	function onSyncTeams()
	{
        // Set syncing details
        mydoc.setContent("#team_sync_message", {"innerHTML": " Syncing"});
        mydoc.addClass("#team_sync_message","syncing");

		// Get the highest score at the time
		let highestScore = getHighestScore();

		MyTrello.get_cards(JeopardyGame.Game.getListID(), function(data){

            response = JSON.parse(data.responseText);

            // Loop through the cards & setup team objects (if needed);
			response.forEach((obj)=>{

				let teamName = obj["name"].trim().replaceAll("\n", "");
                let teamID = obj["id"];
				let isGameCard = (obj.name.startsWith("GAME_CARD_"));

                // If this is a game that started, then restore it;
                if(isGameCard && JeopardyGame.Game.Asked.length == 0)
                {
					// The card ID for the game details 
					JeopardyGame.Game.GameCard = obj["id"];
                    loadGameState(obj);
                }
                else
                {
                    // Setup short name
                    let teamPartialID = teamID.substring(teamID.length-4).toUpperCase();
                    let shortCode = JeopardyGame.Game.getCode() + teamPartialID

                    let teamObj = {
                        "Name":teamName,
                        "Code":teamID,
                        "ShortCode": shortCode,
						"Mode": JeopardyGame.Config.WhoGoesFirst?.option
                    }

                    // Add a team 
                    let newTeam = JeopardyGame.Game.addTeam(teamObj);
                    if(newTeam)
                    {
                        // Add template for team
                        MyTemplates.getTemplate("board/templates/teamRow.html", teamObj, (template)=>{
                            mydoc.setContent("#teams_block", {"innerHTML":template}, true);
                        });
                    }

                    //If FINAL_JEOPARDY -- set the wager (initially hidden);
                    if(JeopardyGame.Game.IsFinalJeopardy && !JeopardyGame.Game.IsOver)
                    {
                        getWagersPerTeam(teamID, highestScore);		
                    }
                }
			});

			// Set the first player if it is not already set
			if(!JeopardyGame.Game.PlayerSelected && !JeopardyGame.Game.IsFinalJeopardy)
            {
				console.log("Updating turn");
				// Set the current player based on mode
				onUpdateTurn();
			}

            

			// Update the sync teams message
			setTimeout(() => {
                mydoc.setContent("#team_sync_message", {"innerHTML": " Synced"});
                mydoc.addClass("#team_sync_message","synced");

                // Sync team scores
                onSyncTeamScores();
                    
                setTimeout(() => {
                    mydoc.removeClass("#team_sync_message","syncing");
                    mydoc.removeClass("#team_sync_message","synced");
                    mydoc.setContent("#team_sync_message", {"innerHTML": " Sync Teams"});
                },2000);
			}, 1500);
		});
	}

    // Sync the team scores
    function onSyncTeamScores()
    {
        
        // Loop through teams and update score
        document.querySelectorAll(".team_name")?.forEach( (team)=>{

            let teamCode = team.getAttribute("data-jpd-team-code") ?? "";
            if(teamCode != "")
            {
                MyTrello.get_card_custom_field_by_name(teamCode, "Score", (scoreDate)=>{
                    let resp = JSON.parse(scoreDate.responseText);
                    let teamScore = resp[0]?.value?.text ?? 0;
                    mydoc.setContent(`[data-jpd-team-code=\"${teamCode}\"].team_score`, {"innerHTML":teamScore});
                });
            }
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
			let customTime = JeopardyGame.Config.TimeToAnswerQuestions?.value ?? "";
			if(customTime != "")
			{ 
				let time = Number(customTime);
				time = isNaN(time) ? Timer.getTimerDefault() : time;
				Timer.setTimerDefault(time);
			}
		}
	}



	//Reveal the name of a category that is not visible yet
	function onCategoryClick(event)
	{
		let element = event.target;
		let current_value = element.innerText;
		let title = element.getAttribute("data-jpd-category-name");
		if (!current_value.includes(title))
		{
			element.innerHTML = title;
            JeopardyGame.Game.HeadersVisible += 1;
		}
		// If all headers visible, show the current turn section
        if(JeopardyGame.Categories.length-1 == JeopardyGame.Game.HeadersVisible)
        {
            mydoc.showContent("#current_turn_section");
            JeopardyGame.Game.AllHeadersVisible = true;
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

	// End the game and archive the list
	function onEndGame()
	{
		// Only archive if it is NOT a test run;
		if(!JeopardyGame.Game.IsTestRun)
		{
			// Set the list to archived; With updated name;
			let dateCode = Helper.getDateFormatted();
			let archive_name = `${dateCode} - ${JeopardyGame.Game.Code} - ${JeopardyGame.getGameName()}`;
			MyTrello.update_list_state(CURR_LIST_ID, "closed", archive_name , (data)=>{
				alert("Game has been archived");
			});
		}
	}


/****** ACTIONS: Questions/Answers ****************************/ 


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

	// Opening a question 
	function onOpenQuestion(cell)
	{
		// Rest timer and button to assign scores (if not live host view)
		Timer.resetTimer();

		// Get the question key from the clicked cell
		let key = cell.getAttribute("data-jpd-quest-key");

		// Determing if the question can be opened;
		let proceed = (JeopardyGame.Game.IsFinalJeopardy) ? canOpenFJ() : canOpenQuestion(key);
		if(!proceed){ return; }

        // Get the question based on the key;
        let questionObj = JeopardyGame.Game.getQuestion(key);

        // Get the question value
        let questionValue = questionObj.Value;
        questionValue *= (questionObj.DailyDouble == "Yes") ? 2 : 1;

        // Get the question part of the question (including possible daily double content)
        let questionHTML = questionObj.Question.getQuestionHTML(JeopardyGame);
        let dailyDoubleHTML = (questionObj.DailyDouble == "Yes") ? getDailyDoubleContent() : ""

        // Get the answer part of the question
        let answerHTML = questionObj.Answer.getAnswerHTML(JeopardyGame);

        // Set the HTML content for the parts of the question
        mydoc.setContent("#value_block", {"innerHTML":questionValue});
        mydoc.setContent("#question_block", {"innerHTML": (dailyDoubleHTML + questionHTML)});
        mydoc.setContent("#answer_block", {"innerHTML":answerHTML});

        // Add the teams
        onLoadWhoGotItRightSection();

        // Show the question;
        mydoc.showContent("#question_view");

		// Log that a question was asked (on the game card);
		// if(!JeopardyGame.Game.IsTestRun)
		// {
		// 	MyTrello.create_card_comment(CURR_GAME_STATE_CARD_ID, encodeURIComponent(key));
		// }

		// Set the selected cell to disabled;
        onSetQuestionAsAsked(key);

		// Force a sync of teams to ensure wagers are received.
		if(key.includes("FINAL JEOPARDY")){ onSyncTeams() }
	}

    // Set question as "asked"
    function onSetQuestionAsAsked(key)
    {
        let cell = document.querySelector(`[data-jpd-quest-key='${key}']`);
        if(cell != undefined)
        {	
            cell.classList.add("category_option_selected");
            cell.disabled = true;
        }	
    }

    // Add the list of teams to the question popup
    function onLoadWhoGotItRightSection()
    {
        // Get the mode (default to option1);
        let mode = JeopardyGame.Config["AnsweringQuestions"]?.option ?? "1";
        mode = (JeopardyGame.Game.IsFinalJeopardy) ? "FJ" : mode;

		
		

        // Set the path the templates based on the mode
        let bodyTemplatePath = `board/templates/whoGotRight/body/option${mode}.html`;
        let headerTemplatePath = `board/templates/whoGotRight/header/option${mode}.html`;

        // Set the template
        MyTemplates.getTemplate(bodyTemplatePath, JeopardyGame.Game.Teams,(teamTemplate)=>{
            let obj = {"ListOfTeams": teamTemplate }
            MyTemplates.getTemplate(headerTemplatePath, obj,(sectionTemplate)=>{
                mydoc.setContent("#who_got_it_right_table", {"innerHTML":sectionTemplate});
            });
        });
    }

    //Close the current question; Resets teh timer;
	function onCloseQuestion()
	{
		let confirmMsg = "Looks like you have a team selected. Are you sure you want to close this question without assigning points?";
		let proceedClose = (hasAssignablePoints()) ? confirm(confirmMsg) : 	true;
		if(proceedClose)
		{
			window.scrollTo(0,0); // Scroll back to the top of the page;
            mydoc.hideContent("#question_view");
            onSetQuestionPopup(); // Reset the question popup by reloading template;
			// Timer.resetTimer(); // make sure the timer is reset to default.
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

			// Set the answer given by the person;
			MyTrello.get_single_card(teamCode, function(data){
				response = JSON.parse(data.responseText);
				obj.innerHTML = response["desc"];
			});
		}

		// Remove the hidden wagers
		if (JeopardyGame.Game.IsFinalJeopardy)
		{
			let hiddenWagers = document.querySelectorAll(".wager_hidden");
			hiddenWagers.forEach((obj) =>{
				obj.classList.remove("wager_hidden");
			});
		}

		// Show the sections
		mydoc.showContent("#answer_block");
		mydoc.hideContent("#reveal_answer_block");
		mydoc.hideContent("#question_block audio");

		// The transition to question to be hidden
		mydoc.addClass("#question_block", "hiddenBlock");
		mydoc.removeClass("#question_block", "visibleBlock");

		// The transition for the answer to be visible
		mydoc.addClass("#answer_block", "visibleBlock");
		mydoc.removeClass("#answer_block", "hiddenBlock");

		// Slowly bring in people's answer
		setTimeout(()=>{
			mydoc.addClass("#correct_block", "visibleBlock");
			mydoc.removeClass("#correct_block", "hiddenBlock");
		},1500);

		// Add reveal timestamp
		let time = Helper.getDate("H:m:s K");
		mydoc.setContent("#answer_revealed_time", {"innerHTML":time});
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

			// Set to disabled to indicate points were assigned
			mydoc.setContent("#assignScoresButton",{"disabled":true});
		}

		// Then, close the question popup
		onCloseQuestion();

		// Reset the answers for each team, so it no longer shows
		resetAnswers(); // Reset the answers for each team.

		// If assigning final jeopardy points;
		if (JeopardyGame.Game.IsFinalJeopardy)
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

        // Get the setting mode;
        let mode = JeopardyGame.Config.SelectingQuestions?.option ?? "";

		// Get the team inputs for Who Got It Right?
		var teamInputs = document.querySelectorAll(".who_got_it_right") ?? [];

		// Loop through all options
		teamInputs?.forEach( (obj) => {

			let teamCode = obj.getAttribute("data-jpd-team-code");

			// If Last Team keeps going, set them as last team
			if(mode == "2" && obj.checked){ JeopardyGame.Game.LastTeamCorrect = teamCode;}

			// Calculate and set the score based on teamCode and if object is checked
			setNewTeamScore(teamCode, question_value, obj.checked);
		});

		// Update the turn; Always send last team correct (only used in specific mode);
		onUpdateTurn(JeopardyGame.Game.LastTeamCorrect); 
		
		// Update the leader board
		updateLeader();
	}

	// Updates the turn to the next player
	function onUpdateTurn(givenCode=undefined)
	{
		// Don't do anything if this is Final Jeopardy
		if(JeopardyGame.Game.IsFinalJeopardy)
			return
		
		// Determine if player is set
		let playerSet = (JeopardyGame.Game.PlayerSelected);

		// Determine which mode we are setting for
		let whoFirstMode = JeopardyGame.Config.WhoGoesFirst?.option ?? "";
        let selectMode = JeopardyGame.Config.SelectingQuestions?.option ?? ""
		let mode = (playerSet) ? selectMode : whoFirstMode;

		

		// Switch on possible modes;
		switch(mode)
		{
			// Everyone gets a chance
			case "1":
				let teamName = JeopardyGame.Game.setCurrentTeam(mode);
				onSetCurrentTurn(teamName);
				break;

			// Host Selected (GoesFirst) & Last Person (selecting questions)
			case "2":
				if(givenCode)
				{
					let teamName = JeopardyGame.Game.setCurrentTeam(mode,givenCode);
					onSetCurrentTurn(teamName);
				}
				break;

			// Random suggestion by game
			case "3":
				JeopardyGame.Game.setCurrentTeam(mode); // Not used, but allows to bypass warning 
				let questionValue = onGetRandomQuestion();
				
				onSetCurrentTurn(questionValue);
				break;
			
			// Default to setting current player randomly
			default:
				teamName = JeopardyGame.Game.setCurrentTeam("default");
				onSetCurrentTurn(teamName);
		}	
	}

    // Set a team by click
    function setCurrentPlayerByCode(event)
    {
        let target = event.target;
        let code = target.getAttribute("data-jpd-team-code");
		onUpdateTurn(code); //Update turn to specific user
    }

    // Set team name on page
    function onSetCurrentTurn(value)
    {
		// Don't set the current team if final jeopardy
		if(JeopardyGame.Game.IsFinalJeopardy)
			return 

		
		

        // Set the team name
        mydoc.setContent("#current_turn", {"innerHTML":value});

        // If set, don't show buttons for setting directly
        mydoc.addClass(".setTeamDirectly", "hidden");
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

	// Select a random question
	function onGetRandomQuestion()
	{
		let availableQuestions = document.querySelectorAll("#round_1_row .category_option:not(.category_option_selected)");
		let limit = availableQuestions.length;
		let nextQuestion = "N/A";

		if (limit > 1)
		{
			// Get a random question from pool left;
			let randIdx = Math.floor(Math.random()*limit);
			let cell = availableQuestions[randIdx];
			nextQuestion = cell?.getAttribute("data-jpd-quest-key")?.replace("-", " - ");
		}
		return nextQuestion;
	}


	//Show the Final Jeopardy section
	function onFinalJeopardy()
	{

		let nextQuestion = onGetRandomQuestion()

		// Only proceed if there are no more questions
		if(nextQuestion == "N/A" || JeopardyGame.Game.IsTestRun)
		{
			JeopardyGame.Game.IsFinalJeopardy = true;

			// Hide Content
			mydoc.hideContent("#round_1_row");
			mydoc.hideContent("#round_2_row"); // Will hide round 2 if applicable;
			mydoc.hideContent("#current_turn_section");
			mydoc.hideContent("#time_view_regular");
			mydoc.hideContent("#finalJeopardyButton");
			mydoc.hideContent("#assignScoresButton");
			mydoc.hideContent("#nobodyGotItRightButton");
			mydoc.hideContent("#value_header");

			// Show Content
			mydoc.showContent("#final_jeopardy_audio");
			mydoc.showContent("#final_jeopardy_row");
			mydoc.showContent("#finalJeopardyAssign");
			mydoc.showContent(".wager_row");

			// Add Classes
			mydoc.addClass("#final_jeopardy_row", "final_jeopardy_row");
		}
		else 
		{
			alert("Cannot start Final Jeopardy until all questions have been asked.");
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
		let mode = JeopardyGame.Config.FinalJeopardyWager?.option ?? "";
		let teamScore = mydoc.getContent(`.team_score[data-jpd-team-code="${teamCode}"]`)?.innerText ?? "";

		if(mode != "" && teamScore != "")
		{
			// Show the wager column;
			mydoc.showContent(`.team_wager[data-jpd-team-code="${teamCode}"]`);

			// Set the max possible wager;
			let maxWager = (mode == "2") ? highestScore : teamScore;
	
			// Get the wager value from the wager field; Set in field
			MyTrello.get_card_custom_field_by_name(teamCode, "Wager", (data) => {
	
				

				let customField = JSON.parse(data.responseText);
				let custom_value = customField[0]?.value?.text ?? undefined;
				let wagerValue = (!isNaN(Number(custom_value))) ? Number(custom_value) : undefined;
	
				if(wagerValue != undefined)
				{
					wagerValue = (wagerValue > maxWager) ? maxWager : wagerValue;
					mydoc.setContent(`.team_wager[data-jpd-team-code="${teamCode}"]`, {"innerText":wagerValue});
					mydoc.addClass(`.team_wager[data-jpd-team-code="${teamCode}"]`, "wager_hidden");
				}

				// Make the card reflect the true wager if they tried to go over;
				if(wagerValue > maxWager)
				{
					MyTrello.update_card_custom_field_by_name(teamCode, "Wager", maxWager.toString());
				}	
			});
		}


	}

/********** HELPER FUNCTIONS -- SETTERS, UPDATERS, and RESETERS **************************************/

	// Determine an set the new team score
	function setNewTeamScore(teamCode, questionValue, isCorrect=false)
	{
		// Get the team details
		let teamDetails = getTeamDetails(teamCode);

		// Get wager details
		let team_score = Number(teamDetails["score"]);
		let team_wager = Number(teamDetails["wager"]);

		let questionValueNum = Number(questionValue);
		questionValueNum = isNaN(questionValueNum) ? 0 : questionValueNum;

		// Calculate the points of the question;
		let points = (JeopardyGame.Game.IsFinalJeopardy) ? team_wager : questionValueNum; 

		// Defaulting new score to the same team score
		let newScore = team_score; 

		// calculating the new score based on combinations
		if(JeopardyGame.Game.IsFinalJeopardy && !isCorrect)
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
            setTimeout(()=>{
                onSyncTeamScores();
            },1500)
		}

	}

	// Reset the answer
	function resetAnswers()
	{
		// Don't reset if it's final jeopardy
		if(JeopardyGame.Game.IsFinalJeopardy)
			return

		Logger.log("Clearing Answers in 5 seconds!");
		setTimeout(function(){
			let teams = Array.from(document.querySelectorAll(".team_name"));
			teams.forEach(function(obj){
				card_id = obj.getAttribute("data-jpd-team-code");
				MyTrello.update_card_description(card_id, "");
			});
		}, 5000)
		
	}


/********** HELPER FUNCTIONS -- ASSERTIONS **************************************/

	// Get the image and audio used for Daily Double
	function getDailyDoubleContent()
	{
        let ddAudio = JeopardyGame.getMediaHTML("_dailyDoubleAudio",true);
        let ddImage = JeopardyGame.getMediaHTML("_dailyDoubleImage");
        return ddAudio + ddImage + "<br/>";
	}

	// Check if the question can be opened;
	function canOpenQuestion(key)
	{
		let canOpen = true;

		// Are all the headers available
		let headersVisible = (JeopardyGame.Game.AllHeadersVisible)
		if( !headersVisible ){ alert("Please show all the headers before beginning") }

		// Are we opening (even if already opened)?
		let allowOpen = (JeopardyGame.Game.Asked.includes(key)) ?
							(confirm("This question has already been presented. Do you still want to open it?") ) 
							: true;
		
		// Is the first team set
		let firstTeamSet = (JeopardyGame.Game.PlayerSelected);
		
		if(!firstTeamSet){ alert("Please select a team that will start (see below);"); }

		canOpen = headersVisible && allowOpen && firstTeamSet;

		return canOpen; 
	}

	// Check if we can open the FJ
	function canOpenFJ()
	{
		let teamLength = JeopardyGame.Game.Teams?.length ?? 0;
		let wagers = document.querySelectorAll(".team_wager.wager_hidden")?.length ?? 0;

		let canOpen = false;
		if(wagers < teamLength)
		{
			canOpen = confirm("Not all wagers have been set. Are you sure you want to open the question") 

			if(!canOpen) { onSyncTeams(); }
		}
		return canOpen;
	}

    // Checking if there are points that could be assigned before closing
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


/****** OLD Game Actions ****************************/ 


	function set_loading_results(value)
	{
		toggle_loading_gif(true);
		let section = document.getElementById("loading_results_section");
		section.parentElement.classList.remove("hidden");
		section.innerHTML = value;
	}

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
