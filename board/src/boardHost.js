// The instance of this jeopardy game
var JeopardyGame = undefined;

/****************  HOST: ON PAGE LOAD ****************************/ 
	
	mydoc.ready(function()
	{
		// Set board name
		MyTrello.SetBoardName("jeopardy");

		// Loading up this page based on pathname;
		onKeyboardKeyup();

        // Check for test run
        // if( mydoc.get_query_param("test") != undefined){ mydoc.addTestBanner(); }

		let gameID = mydoc.get_query_param("gameid");

		if(gameID != undefined)
		{
			// Get the game (i.e. card)
			onGetGame(gameID);
		}
        else
        {
            console.log("ERROR: Could not load the game; Missing the Game ID");
        }
	});

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

                    // Only show the start button after we get a list
                    onStartGame();
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
        MyTemplates.getTemplate(".board/templates/menu.html",gameObj,(template)=>{
            mydoc.setContent("#homemade_jeopardy_title", {"innerHTML":template});
        });
    }

	// Set the game Config/Rules
	function onSetGameRules()
	{
		var rulesHTML = "";
        // Format the rules for hte board
		Rules2.forEach( (ruleObj, idx, array)=>{
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
            MyTemplates.getTemplate(".board/templates/ruleItem.html",newRuleObj,(template)=>{
				rulesHTML += template; 

				if(idx == array.length-1)
				{
					console.log("Setting the rules");
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
			
			// Click through all the categories by default;
			onCategoryClickAuto();
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
            "Src": "assets/audio/daily_double.m4a"
        }
        let dailyDoubleImage = { 
            "ID": "_dailyDoubleImage", 
            "Name": "_dailyDoubleImage", 
            "Type": "Image",
            "Src": "assets/img/daily_double.jpeg"
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

    // Reveal the game board & set initial team
	function onStartGame()
	{
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


	}

    // Set the question popup; Also used to reset after closing 
    function onSetQuestionPopup()
    {
        // Setting the parts of the question
        MyTemplates.getTemplate(".board/templates/questionPopupHost.html", {},(template)=>{
            mydoc.setContent("#show_question_section",{"innerHTML":template});
        });
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
		// Get the question key from the clicked cell
		let key = cell.getAttribute("data-jpd-quest-key");

		// // Determing if the question can be opened;
		let proceed = canOpenQuestion(key);
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

        // Show the question;
        mydoc.showContent("#question_view");

		// Set the selected cell to disabled;
        onSetQuestionAsAsked(key);
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

    //Close the current question; Resets teh timer;
	function onCloseQuestion()
	{
		window.scrollTo(0,0); // Scroll back to the top of the page;
		mydoc.hideContent("#question_view");
		onSetQuestionPopup(); // Reset the question popup by reloading template;
	}

	//Show the Final Jeopardy section
	function onFinalJeopardy()
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
		// Are we opening (even if already opened)?
		let allowOpen = (JeopardyGame.Game.Asked.includes(key)) ?
							(confirm("This question has already been presented. Do you still want to open it?") ) 
							: true;

		canOpen = allowOpen;

		return canOpen; 
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
