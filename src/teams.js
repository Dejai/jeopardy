
/*********** INSTANCE VARIABLES *****************************************/ 

	var GAME_LIST_ID = "";
	var TEAM_ID = undefined;
	var TEAM_SCORES = {};
	var HAS_WAGER = false;

	var touchEvent = "ontouchstart" in window ? "touchstart" : "click";

/*********** PLAYER: GETTING STARTED *****************************************/ 

	mydoc.ready(function(){
		// Check for existing player if on player screen
		let path = location.pathname;

		if (path.includes("/team"))
		{
			let query_map = mydoc.get_query_map();
			if(query_map.hasOwnProperty("teamid"))
			{
				let card_id = query_map["teamid"]
				TEAM_ID = card_id;

				// Pull up the existing team
				get_existing_team(card_id);

				document.getElementById("refresh_scores").addEventListener(touchEvent, onGetLatestScores);
				pollScores(); // poll for scores;
			} 
			else 
			{
				mydoc.showContent("#enter_game_code_section");
			}
		}
	});
	
	// Looks up the lists from the board and tries to find the one matching the given game code
	function lookup_game()
	{
		let code_input = document.getElementById("player_game_code");
		let code = code_input.value;

		MyTrello.get_lists(function(data)
		{
			Logger.log(data);

			let game_code = "";
			let matching_list = undefined;

			response = JSON.parse(data.responseText);
			for(var idx = 0; idx < response.length; idx++)
			{
				obj = response[idx];

				if(obj["name"].toUpperCase() != code.toUpperCase() )
				{
					continue;
				}
				// if we get here, then must be matching;
				game_code = obj["name"];
				matching_list = obj["id"];
			}

			if (matching_list != undefined)
			{
				GAME_LIST_ID = matching_list;
				disable_step_one();
				mydoc.showContent("#enter_team_name_section");
			}
			else 
			{
				alert("Could NOT find a game with code: " + code);
			}
		});
	}

	// Loads existing team if card ID was already included or found
	function get_existing_team(card_id)
	{
		MyTrello.get_single_card(card_id, function(data){
			response = JSON.parse(data.responseText);
			team_id = response["id"];
			team_name = response["name"];
			GAME_LIST_ID = response["idList"];

			show_team_page(team_name, team_id);

			// Get wager if exists
			getWager(team_id);
		});
	}



/************* SECTION VISIBILITY ***************************************/ 

	// Disables the button and input once a game is found;
	function disable_step_one(){
		document.querySelector("#enter_game_code_section button").style.display = "none";
		document.querySelector("#enter_game_code_section input").disabled = true;
	}

	// Shows the section for submitting answers
	function show_team_page(team_name, team_id)
	{
		// Set Team Identifiers
		document.getElementById("team_code").innerText = team_name;
		document.getElementById("team_card_id").value = team_id;

		// First, hide starter sects
		mydoc.hideContent("#enter_game_code_section");
		mydoc.hideContent("#enter_team_name_section");

		// Show the section to enter answers
		mydoc.showContent("#enter_answers_section");
	}

	function onShowWagerInput()
	{
		// Hide the link to trigger this view
		mydoc.hideContent("#show_wager_link");
		
	
		// Temporarily hide the question entry
		mydoc.hideContent("#answer_input_section");
		mydoc.hideContent("#submitted_answer_section");
		

		// Show the section to enter wager input
		mydoc.showContent("#wager_input_section");
	}

/*************** TEAM ACTIONS *******************************************/ 

	function create_team()
	{
		// Disable the button and show loading gif;
		document.getElementById("create_team_button").disabled = true;
		mydoc.showContent("#loading_gif");

		let team_input = document.getElementById("team_name");
		let team_name = team_input.value;

		let existing_team_id = undefined;
		
		// Check for existing cards before creating a new card; Match on name
		MyTrello.get_cards(GAME_LIST_ID, function(data){

			response = JSON.parse(data.responseText);
			response.forEach(function(obj)
			{
				let card_name = obj["name"];
				if (card_name.toUpperCase() == team_name.toUpperCase())
				{
					existing_team_id = obj["id"];
				}
			});

			if(existing_team_id != undefined)
			{
				Logger.log("Loading Existing Card");
				loadTeamUrl(existing_team_id);
			}
			else
			{
				Logger.log("Creating new card");
				MyTrello.create_card(GAME_LIST_ID, team_name, function(data)
				{
					response = JSON.parse(data.responseText);
					team_id = response["id"];
					loadTeamUrl(team_id);
				});
			}

		}, Logger.errorMessage);
	}

	function loadTeamUrl(teamID)
	{
		var loadUrl =`http://${location.host}${location.pathname}?teamid=${teamID}`;
		//  "http://" + location.host + location.pathname + "?teamid=" + team_id + ""
		location.replace(loadUrl);
	}

	// Get the teams current wager (and makes it visible)
	function getWager(teamCode)
	{
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
				HAS_WAGER = (!isNaN(Number(value)));
				if (HAS_WAGER)
				{
					document.getElementById("submitted_wager_value").innerText = value;
					mydoc.showContent("#submitted_wager_section");
					mydoc.hideContent("#wager_input_section");
					mydoc.hideContent("#show_wager_link");
				}
				
			}
		});
	}

	function submit_answer()
	{
		let card_id = document.getElementById("team_card_id").value;
		let answer = document.getElementById("answer").value;
		// let wager = document.getElementById("wager").value;

		MyTrello.update_card(card_id, answer);	

		// Clear answers
		document.getElementById("submitted_answer_section").classList.remove("hidden");
		document.getElementById("submitted_answer_value").innerText = answer;
		document.getElementById("answer").value = "";
		// document.getElementById("wager").value = "";


		// If wager is set (meaning final jeopardy)
		if(HAS_WAGER)
		{
			mydoc.hideContent("#answer_input_section");
			mydoc.hideContent("#submittButton");
		}

		// Attempt to submit wager as well
		// if(wager != "" && Number.isInteger(Number(wager)))
		// {
		// 	submit_wager(card_id, String(wager));
		// }
	}

	function submit_wager()
	{
		let card_id = document.getElementById("team_card_id").value;
		let wager = document.getElementById("wager").value;

		if( !isNaN(Number(wager)))
		{
			MyTrello.update_card_custom_field(card_id,MyTrello.custom_field_wager, wager.toString() )
			document.getElementById("submitted_wager_section").classList.remove("hidden");
			document.getElementById("submitted_wager_value").innerText = wager;

			// Hide the wager input
			mydoc.hideContent("#wager_input_section");

			// Show back the question input things
			mydoc.showContent("#answer_input_section");
		}
		else
		{
			alert("Invalid wager value! Please enter a number");
		}
	}

	// Prevent the page accidentally closing
	function onClosePage(event)
	{
		event.preventDefault();
		event.returnValue='';
	}


	// Show details about refresh
	function onRefreshInfoClick()
	{
		mydoc.showContent("#refresh_info_message")
		setTimeout(()=>{
			mydoc.hideContent("#refresh_info_message");
		}, 2000)
	}

/*************** POLLING FOR SCORES *******************************************/ 

	// Polls for the latest score every 30 seconds;
	function pollScores()
	{
		pollScore = setInterval((obj) =>{
			Logger.log("Polling for score");
			onGetLatestScores();

		}, 60000); 
	}

	// Polls the list of cards in the list and gets their scores
	function onGetLatestScores()
	{
		setSyncingDetails("Refreshing", "red");

		// Get the cards in the list
		MyTrello.get_cards(GAME_LIST_ID, function(data){
			response = JSON.parse(data.responseText);

			response.forEach(function(obj)
			{

				// Set the team code;
				let teamCode = obj["id"];

				// Set the default team score to 0;
				TEAM_SCORES[teamCode] = 0;
				
				// Get the wager value from the wager field; Set in field
				MyTrello.get_card_custom_fields(teamCode, function(data){
					
					response = JSON.parse(data.responseText);
					for(var idx = 0; idx < response.length; idx++)
					{
						let obj = response[idx];

						// skip any field that is not the wager field
						if(obj["idCustomField"] != MyTrello.custom_field_score) continue;

						let valueObject = obj["value"] ?? {};
						let value = (valueObject.hasOwnProperty("text")) ? valueObject["text"] : "";
						
						// Set the wager value
						value = Number(value.trim());
						value = isNaN(value) ? 0 : value;
						TEAM_SCORES[teamCode] = value; 
					}
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

		let your_score = TEAM_SCORES[TEAM_ID];
		let high_score = Math.max(...Object.values(TEAM_SCORES));

		your_score = isNaN(your_score) ? 0 : your_score;
		high_score = isNaN(high_score) ? 0 : high_score;

		// Set the scores;
		document.getElementById("team_score").innerText = your_score;
		document.getElementById("highest_score").innerText = high_score;

		// document.getElementById("score-sync").style.display = "inline";
		setSyncingDetails("Synced!", "limegreen");

		setTimeout(function(){
			setSyncingDetails("Refresh Scores", "white");
			// document.getElementById("score-sync").style.display = "none";
		}, 2000);
	}

	// Set syncing details
	function setSyncingDetails(message, iconColor)
	{
		refreshScores = document.getElementById("refresh_scores");
		refreshScores.innerHTML = `&nbsp; ${message}`;
		refreshScores.style.color = iconColor;
	}