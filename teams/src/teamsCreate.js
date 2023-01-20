
/*********** INSTANCE VARIABLES *****************************************/ 	
	var GAME_CODE = "";
	var LIST_ID = "";
	var touchEvent = "ontouchstart" in window ? "touchstart" : "click";

/*********** PLAYER: GETTING STARTED *****************************************/ 

	mydoc.ready(function(){		
		// Set board name
		MyTrello.SetBoardName("jeopardy");

		GAME_CODE = mydoc.get_query_param("gamecode") ?? "";
		if(GAME_CODE != "'")
		{
			onLookupGameCode();
		}
		else
		{
			// Hide the loading GIF
			mydoc.hideContent("#loading_gif");
			let errMessage = `<p class="notify_red">Game Code NOT provided. Cannot create a new team.</p>`;
			mydoc.setContent("#notification_section", {"innerHTML":errMessage});
		}


	});

/*********** PLAYER: JOINING A GAME *****************************************/ 

	// Looks up the lists from the board and tries to find the one matching the given game code
	function onLookupGameCode()
	{
		console.log("Looking for game code....");

		MyTrello.get_lists("open", (data)=>{

			// Hide the loading content once we get a response
			mydoc.hideContent("#loading_gif");

			Logger.log(data);

			let response = JSON.parse(data.responseText);
			console.log(response);
			let singleList = response.filter( (val)=>{
				return (val.name.toUpperCase() == GAME_CODE.toUpperCase());
			});
			
			// Handling if the list is found
			if(singleList.length == 1)
			{
				console.log(singleList);
				LIST_ID = singleList[0]["id"];

				// Show the create team section
				mydoc.showContent("#createTeamSection");
			}
			else
			{
				let errMessage = `<p class="notify_red">Could NOT find a game with the given code.</p>`;
				mydoc.setContent("#notification_section", {"innerHTML":errMessage});
			}
		});
	}

	// Create a team (in Trello);
	function onCreateTeam(event)
	{

		event.preventDefault();

		// Get team name value;
		var teamName = mydoc.getContent("#teamName")?.value ?? "";

		// Show loading
		mydoc.showContent("#loading_gif");

		// Can't move forward without team name
		if(teamName == '')
		{
			let errMessage = `<p class="notify_red">Could not create a team. Please enter a team name.</p>`;
			mydoc.setContent("#notification_section", {"innerHTML":errMessage });
			mydoc.hideContent("#loading_gif");

			// Ensure button is enabled
			mydoc.setContent("#createTeamButton", {"disbled":false});
			mydoc.removeClass("#createTeamButton","dlf_button_gray");

			return;
		}
		
		// Disable the button and show loading gif;
		mydoc.setContent("#createTeamButton", {"disbled":true});
		mydoc.addClass("#createTeamButton","dlf_button_gray");

		// Check for existing cards before creating a new card; Match on name
		MyTrello.get_cards(LIST_ID, (cardData)=>{

			console.log(cardData);

			let cardResp = JSON.parse(cardData.responseText);
			let existingCard = cardResp.filter( (val)=>{
				return (val.name.toUpperCase() == teamName.toUpperCase())
			});
			
			// If new team name - create it;
			if(existingCard.length  == 0)
			{
				Logger.log("Creating new card");
				MyTrello.create_card(LIST_ID, teamName, (data)=>{
					response = JSON.parse(data.responseText);
					teamID = response["id"];

					createTeamCookies(teamName, teamID);
					loadTeamUrl(teamID);
				});
			}
			else
			{
				let errMessage = `<p class="notify_red">
									A team with this name arleady exists in this game.
								  </p>
								`;
				mydoc.setContent("#notification_section",{"innerHTML":errMessage});
				mydoc.hideContent("#loading_gif");

				// Ensure button is enabled
				mydoc.setContent("#createTeamButton", {"disbled":false});
				mydoc.removeClass("#createTeamButton","dlf_button_gray");
			}
		}, Logger.errorMessage);
	}

	// Navigate to a team page
	function loadTeamUrl(teamID)
	{
		var loadUrl =`http://${location.host}/teams/team/?teamid=${teamID}`;
		location.replace(loadUrl);
	}

	// Set cookies for creating the team
	function createTeamCookies(teamName, teamID)
	{
		mydoc.setCookie(`HMJ-${GAME_CODE}-Name`, teamName, 90);
		mydoc.setCookie(`HMJ-${GAME_CODE}-ID`, teamID, 90);
	}
