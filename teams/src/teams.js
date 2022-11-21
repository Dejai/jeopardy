
/*********** INSTANCE VARIABLES *****************************************/ 

	// Main instance for jeapoardy team;
	var JTeam = undefined;

	// Add a touch event for phones;
	var touchEvent = "ontouchstart" in window ? "touchstart" : "click";

/*********** PLAYER: GETTING STARTED *****************************************/ 

	mydoc.ready(function(){
		
		// Set board name
		MyTrello.SetBoardName("jeopardy");

		// Get the possible URL parameters.
		let teamID = mydoc.get_query_param("teamid") ?? "";
		let rejoin = mydoc.get_query_param("rejoin") ?? "";

		// Make sure the page doesn't close once the game starts
		// window.addEventListener("beforeunload", onClosePage);

		if(teamID != "")
		{
			getExistingTeam(teamID);
		}
		else
		{
			console.log("Coud not load the given team");
		}

		
	});

	// Prevent the page accidentally closing
	function onClosePage(event)
	{
		event.preventDefault();
		event.returnValue='';
	}
	

/*********** PLAYER: LOADING A TEAM  *****************************************/ 

	// Loads existing team if the team ID (ie. card ID) is provided
	function getExistingTeam(teamID)
	{

		MyTrello.get_single_card(teamID, (data)=>{

			response = JSON.parse(data.responseText);

			if(response != undefined)
			{
				teamName = response["name"] ?? "";
				teamID = response["id"] ?? "";
				listID = response["idList"] ?? ""

				// Create the new team instance;
				JTeam = new Team(teamName, teamID, listID);

				// Show the team page after creating the game
				showTeamPage();

				// Load the rules for the game;
				loadGameRules();

				// Get wager if exists
				getWager();
			}			
		});
	}

	// Shows the section for submitting answers
	function showTeamPage()
	{
		// Set Team Code
		mydoc.setContent("#team_code", {"innerText":JTeam.Name});

		// Show the page sections
		mydoc.showContent("#answer_input_section");


		// document.getElementById("team_code").innerText = team_name;
		// document.getElementById("team_card_id").value = team_id;

		// // First, hide starter sects
		// mydoc.hideContent("#enter_game_code_section");
		// mydoc.hideContent("#enter_team_name_section");

		// Show the section to enter answers

		
	}

	// Load the game state card to get the rules
	function loadGameRules()
	{

		let listID = JTeam.ListID ?? "";

		if(listID != "")
		{
			MyTrello.get_cards(listID, (data)=>{
				let resp = JSON.parse(data.responseText);
				let singleCard = resp.filter( (val)=>{
					return (val.name.startsWith("GAME_CARD_"));
				});
	
				let gameCard = singleCard[0] ?? undefined;
				
				// Set the game settings if found;
				if(gameCard != undefined)
				{
					let jsonString = gameCard["desc"];
					jsonObj = myajax.GetJSON(jsonString) ?? {};
					JTeam.setSettings(jsonObj);
				}
			});
		}

	}


/*************** TEAM ACTIONS *******************************************/ 

	function onSubmitAnswer()
	{

		let teamID = JTeam.TeamID;
		let answer = mydoc.getContent("#answer")?.value ?? "";

		// let card_id = document.getElementById("team_card_id").value;
		// let answer = document.getElementById("answer").value;

		// Temporarily disable button;
		mydoc.setContent("#submitAnswer", {"disabled":true});
		mydoc.addClass("#submitAnswer", "dlf_button_gray");

		// Re-enable after 1.5 seconds;
		setTimeout(()=>{
			mydoc.setContent("#submitAnswer", {"disabled":false});
			mydoc.removeClass("#submitAnswer", "dlf_button_gray");
		},1500);

		// Set time of submission
		let time = Helper.getDate("H:m:s K");
		mydoc.setContent("#submitted_answer_time", {"innerText":time});

		// Submit answer to Trello card
		MyTrello.update_card_description(teamID, answer, (data)=>{
			
			let response = JSON.parse(data.responseText);

			// Update page once answer is submitted;
			mydoc.showContent("#submittedAnswerSection");
			mydoc.setContent("#submitted_answer_value", {"innerText":answer});
			mydoc.setContent("#answer", {"value":""});
		});	

		// If wager is set (meaning final jeopardy)
		if(JTeam.HasWager)
		{
			mydoc.hideContent("#answer_input_section");
			mydoc.hideContent("#submittButton");
		}
		
		// document.getElementById("submittedAnswerSection").classList.remove("hidden");
		// document.getElementById("submitted_answer_value").innerText = answer;
		// document.getElementById("answer").value = "";
		// document.getElementById("wager").value = "";

		
	}

	// Loading the Final Jeopardy (FJ) pieces
	function onShowFinalJeopardy()
	{
		// Hide things
		mydoc.hideContent("#show_wager_link");
		mydoc.hideContent("#submittedAnswerSection");
		mydoc.hideContent("#answer_input_section");

		// Show things
		mydoc.showContent("#finalJeopardySection");

		// Get the latest scores
		onGetLatestScores();
	}

	// Cancel going to FJ section
	function onCancelFJ()
	{
		// Hide things
		mydoc.showContent("#show_wager_link");
		mydoc.showContent("#answer_input_section");

		// Show things
		mydoc.hideContent("#finalJeopardySection");
	}

	// Show the wager for Final Jeopardy
	function onContinueFJ()
	{
		// Hide the confirmation section 
		mydoc.hideContent("#finalJeopardySection");
	
		// Temporarily hide the question entry
		mydoc.hideContent("#answer_input_section");
		mydoc.hideContent("#submittedAnswerSection");

		// Show the section to enter wager input
		mydoc.showContent("#wagerSection");
		mydoc.showContent("#wagerValueSubsection");

	}

/******* TEAM: Submitting wager POLLING FOR SCORES *******************************************/ 

	// First, confirm the wager 
	function onConfirmWager()
	{
		let wager = mydoc.getContent("#wagerInput")?.value ?? "";
		let wagerValue = (wager == "") ? "empty" : wager;

		if( !isNaN(Number(wagerValue)))
		{
			// Get the max they can wager
			let wagerLimit = getWagerLimit() ?? wagerValue;

			if(wagerValue <= wagerLimit)
			{
				// Hide the wager input part 1
				mydoc.hideContent("#wager_instruction");
				mydoc.hideContent("#wagerInputSubsection");				

				// Show the wager input part 2: confirmation
				mydoc.showContent("#wagerConfirmationButtons");
				mydoc.showContent("#wagerConfirmationMessages");
				mydoc.showContent("#yourWager");

				// Add the score to the preview
				mydoc.setContent("#wager_input_preview", {"innerHTML":wagerValue});
			}
			else
			{
				errMessage = `WAGER TOO HIGH! <br/> It cannot be more than ${wagerLimit}`;
				mydoc.setContent("#wager_instruction",{innerHTML: errMessage} );
			}
			
		}
		else
		{
			errMessage = `INCORRECT WAGER! Your wager must be a number between 0 & ${wagerLimit}`;
			mydoc.setContent("#wager_instruction",{innerHTML: errMessage} );
		}
	}

	// Cancel the wager to go back to entering one
	function onCancelWager()
	{
		// Hide the wager input part 2: confirmation
		mydoc.hideContent("#wagerConfirmationButtons");

		// Show the wager input part 1: entry
		mydoc.showContent("#wagerInputSubsection");
	}

	// Submit the wager after confirmation
	function onSubmitWager()
	{
		let teamID = JTeam?.TeamID ?? "";
		let wager = mydoc.getContent("#wagerInput")?.value ?? "";
		// let wager = document.getElementById("wager").value;

		if( teamID != "" && !isNaN(Number(wager)))
		{

			mydoc.showContent("#wagerSubmittingIcon");
			// Update the wager in Trello
			MyTrello.update_card_custom_field_by_name(teamID, "Wager", wager.toString(), (data)=> {

				// If success, get the wager from Trello & set on page;
				if(data.status >= 200 && data.status < 300)
				{
					// Get & set the wager
					console.log("Updated custom field == Wager");
					getWager();
				}
			});			
		}
		else
		{
			let errMessage = "Something went wrong when trying to set wager";
			mydoc.setContent("#wagerAlertSection", {"innerHTML":errMessage});
		}
	}

	// Get the teams current wager (and makes it visible)
	function getWager()
	{
		console.log("Getting team wager");

		let teamID = JTeam?.TeamID;

		// Get the wager value from the wager field; Set in field
		MyTrello.get_card_custom_field_by_name(teamID, "Wager", (data)=>{
			
			let response = JSON.parse(data.responseText);
			let wager_value = response[0]?.value?.text ?? undefined;
			JTeam.HasWager = (!isNaN(Number(wager_value)))

			console.log(response);

			if (JTeam.HasWager)
			{
				console.log("Wager");
				mydoc.hideContent("#wagerSection");

				mydoc.setContent("#submitted_wager_value", {"innerText":wager_value});
				mydoc.showContent("#submitted_wager_section");
				mydoc.showContent("#answer_input_section");
			}
			else
			{
				console.log("Show link to wager")
				mydoc.showContent("#show_wager_link");
			}
		});
	}

	// Get the wager limit -- based on rules/settings
	function getWagerLimit()
	{
		let highestScoreValue = document.getElementById("highest_score")?.innerText ?? undefined;
		let teamScoreValue = document.getElementById("team_score")?.innerText ?? undefined;

		// Get the setting (if applicable);
		let setting = JTeam.Settings.FinalJeopardyWager?.option ?? undefined; 

		// Set default value for wager limit;
		let wagerLimit = teamScoreValue;

		// Set the highest value based on highest score & team score;
		if(!isNaN(Number(highestScoreValue)) && !isNaN(Number(teamScoreValue)) )
		{
			wagerLimit = (setting == "2") ? Number(highestScoreValue) : Number(teamScoreValue);
		}
		console.log("Wager Limit:");
		console.log(wagerLimit);

		return wagerLimit;
		
	}

/*************** POLLING FOR SCORES *******************************************/ 

	// Polls the list of cards in the list and gets their scores
	function onGetLatestScores()
	{
		MyNotification.notify("#refresh_scores", "&nbsp; Refreshing", "notify_orange");

		// Get the cards in the list
		MyTrello.get_cards(JTeam.ListID, function(data){
			response = JSON.parse(data.responseText);

			response.forEach(function(obj)
			{

				// Set the team code;
				let teamCode = obj["id"];

				// Set the default team score to 0;
				// JTeam.Oponents[teamCode] = 0;
				
				// Get the score value for the team
				MyTrello.get_card_custom_field_by_name(teamCode, "Score", (data)=>{
					
					response = JSON.parse(data.responseText);
					let value = response[0]?.value?.text ?? "n/a";
					// Set the wager value
					value = Number(value.trim());
					value = isNaN(value) ? 0 : value;
					JTeam.setTeamScore(teamCode, value);
				});


			});
		}, Logger.errorMessage);

		setTimeout(() =>{
			setLatestScores();
		}, 2000);
	}

	// Displayes the latest scores on the team page;
	function setLatestScores()
	{

		let your_score = JTeam.Score;
		let high_score = JTeam.HighestScore; 

		your_score = isNaN(your_score) ? 0 : your_score;
		high_score = isNaN(high_score) ? 0 : high_score;

		// Set the scores;
		document.getElementById("team_score").innerText = your_score;
		document.getElementById("highest_score").innerText = high_score;

		// Set the limit of the wager
		let wagerLimit = getWagerLimit();
		mydoc.setContent("#wagerInput", {"max":wagerLimit});
		mydoc.setContent("#maxWagerPreview", {"innerHTML":wagerLimit});

		MyNotification.notify("#refresh_scores", "&nbsp; Synced", "notify_white");

		setTimeout(function(){
			MyNotification.notify("#refresh_scores", "&nbsp; Refresh Scores", "notify_white");
		}, 2000);
	}