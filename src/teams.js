
/*********** INSTANCE VARIABLES *****************************************/ 

	var GAME_LIST_ID = "";
	var TEAM_ID = undefined;
	var TEAM_SCORES = {};
	var HAS_WAGER = false;

	var touchEvent = "ontouchstart" in window ? "touchstart" : "click";

/*********** PLAYER: GETTING STARTED *****************************************/ 

	mydoc.ready(function(){
		// Set board name
		MyTrello.SetBoardName("jeopardy");
		// Check for existing player if on player screen
		// let path = location.pathname;
		// if (path.includes("/team"))
		// {
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
		else if(query_map.hasOwnProperty("rejoin") && query_map["rejoin"] == "1")
		{
			
			mydoc.showContent("#enter_team_code_section");
			
		}
		else
		{
			mydoc.showContent("#enter_game_code_section");
			
		}
		// }
	});
	
	// Lookup a single team/card
	function lookupCard()
	{
		let code_input = document.getElementById("player_game_and_team_code");
		let code = code_input.value;
		let splits = code.split("-");
		let listName = splits[0]?.trim() ?? "";
		let teamSuffix = splits[1]?.trim() ?? "";

		let loading_html = `<img class="component_saving_gif" src="../assets/img/loading1.gif" style="width:25%;height:25%;">`;
		MyNotification.notify("#notification_section", loading_html);

		// Parse the code to re-login
		MyTrello.get_lists("open", (listData)=>{

			let listsResp = JSON.parse(listData.responseText);
			let singleList = listsResp.filter( (val)=>{
				return (val.name == listName);
			});

			let listID = singleList[0]?.id ?? undefined;

			if(listID != undefined)
			{
				MyTrello.get_cards(listID, (cardData)=>{

					let cardsResp = JSON.parse(cardData.responseText);
					let singleCard = cardsResp.filter( (val)=>{
						return (val.id.toString().endsWith(teamSuffix));
					});

					let cardID = singleCard[0]?.id ?? undefined;
					if(cardID != undefined)
					{
						loadTeamUrl(cardID);
					}
				});
			}
		});



	}
	// Looks up the lists from the board and tries to find the one matching the given game code
	function lookup_game()
	{
		let code_input = document.getElementById("player_game_code");
		let code = code_input.value;

		MyTrello.get_lists("open", (data)=>{

			Logger.log(data);

			let response = JSON.parse(data.responseText);
			let singleList = response.filter( (val)=>{
				return (val.name.toUpperCase() == code.toUpperCase());
			});

			if(singleList.length == 1)
			{
				GAME_LIST_ID = singleList[0].id;
				disable_step_one();
				MyNotification.clear("#notification_section");
				mydoc.showContent("#enter_team_name_section");
			}
			else
			{
				let errMessage = `<p class="notify_red">Could NOT find a game with the given code.</p>`;
				console.log(data);
				MyNotification.notify("#notification_section", errMessage);
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
		let team_input = document.getElementById("team_name");
		let team_name = team_input.value;
		let existing_team_id = undefined;

		if(team_name == '')
		{
			alert("Enter a team name!");
			return;
		}
		
		// Disable the button and show loading gif;
		document.getElementById("create_team_button").disabled = true;

		let loading_html = `<img class="component_saving_gif" src="../assets/img/loading1.gif" style="width:25%;height:25%;">`;
		MyNotification.notify("#notification_section", loading_html)

		// mydoc.showContent("#loading_gif");

		// Check for existing cards before creating a new card; Match on name
		MyTrello.get_cards(GAME_LIST_ID, (cardData)=>{

			let cardResp = JSON.parse(cardData.responseText);
			let existingCard = cardResp.filter( (val)=>{
				return (val.name.toUpperCase() == team_name.toUpperCase())
			});
			
			if(existingCard.length  == 0)
			{
				Logger.log("Creating new card");
				MyTrello.create_card(GAME_LIST_ID, team_name, function(data)
				{
					response = JSON.parse(data.responseText);
					team_id = response["id"];
					loadTeamUrl(team_id);
				});
			}
			else
			{
				let errMessage = `<p class="notify_red">
									A team with this name arleady exists. <br/>
									If this is your team, <a href="./load.html?rejoin=1">Rejoin the game</a>.<br/>
									Otherwise, enter a new team name and try again.
								  </p>
								`;
				MyNotification.notify("#notification_section", errMessage);
			}
		}, Logger.errorMessage);
	}

	function loadTeamUrl(teamID)
	{
		let newPathname = location.pathname.replace("load", "team");
		var loadUrl =`http://${location.host}${newPathname}?teamid=${teamID}`;
		//  "http://" + location.host + location.pathname + "?teamid=" + team_id + ""
		location.replace(loadUrl);
	}

	// Get the teams current wager (and makes it visible)
	function getWager(teamCode)
	{
		console.log("Getting team wager");

		// Get the wager value from the wager field; Set in field
		MyTrello.get_card_custom_field_by_name(teamCode, "Wager", (data)=>{
			
			let response = JSON.parse(data.responseText);
			let wager_value = response[0]?.value?.text ?? undefined;
			let HAS_WAGER = (!isNaN(Number(wager_value)));

			if (HAS_WAGER)
			{
				document.getElementById("submitted_wager_value").innerText = wager_value;
				mydoc.showContent("#submitted_wager_section");
				mydoc.hideContent("#wager_input_section");
			}
			else
			{
				mydoc.showContent("#show_wager_link");
			}
		});
	}

	function submit_answer()
	{
		let card_id = document.getElementById("team_card_id").value;
		let answer = document.getElementById("answer").value;

		// Temporarily disable button;
		submitButton = document.getElementById("submit_answer");
		submitButton.disabled = true;
		submitButton.classList.add("dlf_button_gray");
		setTimeout(()=>{
			document.getElementById("submit_answer").disabled = false;
			submitButton.disabled = false;
			submitButton.classList.remove("dlf_button_gray");
		},2000);

		// Set time of submission
		let time = Helper.getDate("H:m:s K");
		mydoc.loadContent(time, "submitted_answer_time");

		// Submit answer to Trell card
		MyTrello.update_card_description(card_id, answer);	

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
	}

	// First, confirm the wager 
	function onConfirmWager()
	{
		let wager = document.getElementById("wager").value;
		wagerValue = (wager == "") ? "empty" : wager;
		if( !isNaN(Number(wagerValue)))
		{
			// Hide the wager input part 1
			mydoc.hideContent("#wager_input_pt1");

			// Show the wager input part 2: confirmation
			mydoc.showContent("#wager_input_pt2");

			// Add the score to the preview
			mydoc.loadContent(wagerValue,"wager_input_preview");
		}
		else
		{
			alert("Invalid wager value! Please enter a number");
		}
	}

	// Cancel the wager to go back to entering one
	function onCancelWager()
	{
		// Hide the wager input part 2: confirmation
		mydoc.hideContent("#wager_input_pt2");

		// Show the wager input part 1: entry
		mydoc.showContent("#wager_input_pt1");
	}

	function onSubmitWager()
	{
		let card_id = document.getElementById("team_card_id").value;
		let wager = document.getElementById("wager").value;

		if( !isNaN(Number(wager)))
		{
			MyTrello.get_custom_field_by_name("Wager",(customFieldData)=>{

				let fieldResp = JSON.parse(customFieldData.responseText);
				let customFieldID = fieldResp[0]?.id;

				MyTrello.update_card_custom_field(card_id, customFieldID, wager.toString(), (data)=> {

					if(data.status >= 200 && data.status < 300)
					{
						console.log("Updated custom field == Wager");

						// Set the wager value;
						document.getElementById("submitted_wager_section").classList.remove("hidden");
						document.getElementById("submitted_wager_value").innerText = wager;

						// Hide the wager input
						mydoc.hideContent("#wager_input_section");

						// Show back the question input things
						mydoc.showContent("#answer_input_section");
					}
				});
			});
			// MyTrello.update_card_custom_field(card_id,MyTrello.custom_field_wager,  )
			
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

/*************** POLLING FOR SCORES *******************************************/ 

	// Polls for the latest score every 30 seconds;
	function pollScores()
	{
		pollScore = setInterval((obj) =>{
			Logger.log("Polling for score");
			onGetLatestScores();

		}, 30000); 
	}

	// Polls the list of cards in the list and gets their scores
	function onGetLatestScores()
	{
		MyNotification.notify("#refresh_scores", "&nbsp; Refreshing", "notify_orange");

		// Get the cards in the list
		MyTrello.get_cards(GAME_LIST_ID, function(data){
			response = JSON.parse(data.responseText);

			response.forEach(function(obj)
			{

				// Set the team code;
				let teamCode = obj["id"];

				// Set the default team score to 0;
				TEAM_SCORES[teamCode] = 0;
				
				// Get the score value for the team
				MyTrello.get_card_custom_field_by_name(teamCode, "Score", (data)=>{
					
					response = JSON.parse(data.responseText);
					let value = response[0]?.value?.text ?? "n/a";
					// Set the wager value
					value = Number(value.trim());
					value = isNaN(value) ? 0 : value;
					TEAM_SCORES[teamCode] = value; 
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

		MyNotification.notify("#refresh_scores", "&nbsp; Synced", "notify_white");

		setTimeout(function(){
			MyNotification.notify("#refresh_scores", "&nbsp; Refresh Scores", "notify_white");
		}, 2000);
	}