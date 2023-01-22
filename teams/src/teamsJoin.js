
/*********** INSTANCE VARIABLES *****************************************/ 
	var GAME_CODE = "";
	var EXISTING_TEAM = ";"
	var touchEvent = "ontouchstart" in window ? "touchstart" : "click";

/*********** PLAYER: GETTING STARTED *****************************************/ 

	mydoc.ready(function(){		
		// Set board name
		MyTrello.SetBoardName("jeopardy");
	});

/*********** PLAYER: JOINING A GAME *****************************************/ 

	// Looks up the lists from the board and tries to find the one matching the given game code
	function onLookupGameCode(event)
	{

		event.preventDefault();

		// Get the entered game code
		GAME_CODE = mydoc.getContent("#player_game_code")?.value?.toUpperCase() ?? "";

		// Show loading
		mydoc.showContent("#loading_gif");

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
				onShowJoinOptions();
			}
			else
			{
				let errMessage = `<p class="notify_red">Could NOT find a game with the given code.</p>`;
				mydoc.setContent("#notification_section", {"innerHTML":errMessage});
			}
		});
	}

	// Next step for joining a team (name or reopen page)
	function onShowJoinOptions()
	{
		var existingTeam = mydoc.getCookie(`HMJ-${GAME_CODE}-Name`) ?? "The Test Team";

		if(existingTeam != "")
		{
			// Hide game section
			mydoc.hideContent("#lookupGameButton");
			mydoc.hideContent("#enterGameCodeSection");
			mydoc.setContent("#player_game_code", {"disabled":true});

			// Set existing details
			mydoc.setContent("#existingTeamName", {"innerHTML": existingTeam});
			mydoc.setContent("#existingGameCode", {"innerHTML": GAME_CODE});
			mydoc.showContent("#rejoinGame");
		}
		else
		{
			onEnterNewTeam();
		}
	}

	// Re-join the existing team
	function onReopenTeam()
	{
		if(GAME_CODE != "")
		{
			var existingTeamID = mydoc.getCookie(`HMJ-${GAME_CODE}-ID`);
			onNavigateNextPage(existingTeamID);
		}
	}

	// Go to create a new team
	function onEnterNewTeam()
	{
		onNavigateNextPage();
	}

	// Navigate to the next possible page
	function onNavigateNextPage(teamID="")
	{
		var path = (teamID != "") ? `team/?teamid=${teamID}` : `create/?gamecode=${GAME_CODE}`;
		var nextURL = `http://${location.host}/teams/${path}`;
		location.replace(nextURL);
	}