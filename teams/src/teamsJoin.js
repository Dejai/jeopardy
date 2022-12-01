
/*********** INSTANCE VARIABLES *****************************************/ 

	class JeopardyTeam
	{
		constructor(name, teamID, listID)
		{
			this.Name = name ?? "";
			this.TeamID = teamID ?? "";
			this.ListID = listID ?? "";
			this.Score = 0;
			this.HasWager = false;
			// Keeping track of things for the game
			this.Game = {};
			this.Settings = {};
		}

	}

	// Main instance for jeapoardy team;
	var JTeam = undefined;


	// var GAME_LIST_ID = "";
	var TEAM = {}
	// var TEAM_ID = undefined;
	// var TEAM_NAME = "";
	var TEAM_SCORES = {};
	var HAS_WAGER = false;
	var SETTINGS_MAPPING = {};




	var touchEvent = "ontouchstart" in window ? "touchstart" : "click";

/*********** PLAYER: GETTING STARTED *****************************************/ 

	mydoc.ready(function(){		
		// Set board name
		MyTrello.SetBoardName("jeopardy");
	});

/*********** PLAYER: JOINING A GAME *****************************************/ 

	// Looks up the lists from the board and tries to find the one matching the given game code
	function onLookupGameCode()
	{
		// Get the entered game code
		var gameCode = mydoc.getContent("#player_game_code")?.value ?? "";

		// Show loading
		mydoc.showContent("#loading_gif");

		MyTrello.get_lists("open", (data)=>{

			// Hide the loading content once we get a response
			mydoc.hideContent("#loading_gif");

			Logger.log(data);

			let response = JSON.parse(data.responseText);
			console.log(response);
			let singleList = response.filter( (val)=>{
				return (val.name.toUpperCase() == gameCode.toUpperCase());
			});

			// Handling if the list is found
			if(singleList.length == 1)
			{
				console.log(singleList);
				// Create a partial jeopardy team instance (to store the game ID);
				JTeam = new JeopardyTeam(undefined, undefined, singleList[0]["id"]);

				console.log(JTeam);

				disableStepOne();
				mydoc.setContent("#notification_section", {"innerHTML":""});
				mydoc.showContent("#enter_team_name_section");
				mydoc.showContent("#createTeamButton");
			}
			else
			{
				let errMessage = `<p class="notify_red">Could NOT find a game with the given code.</p>`;
				mydoc.setContent("#notification_section", {"innerHTML":errMessage});
			}
		});
	}

	// Disables the button and input once a game is found;
	function disableStepOne(){

		mydoc.hideContent("#lookupGameButton");
		mydoc.setContent("#player_game_code", {"disabled":true});
	}

	// Create a team (in Trello);
	function onCreateTeam()
	{
		// Get team name value;
		var teamName = mydoc.getContent("#team_name")?.value ?? "";

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
		MyTrello.get_cards(JTeam.ListID, (cardData)=>{

			console.log(cardData);

			let cardResp = JSON.parse(cardData.responseText);
			let existingCard = cardResp.filter( (val)=>{
				return (val.name.toUpperCase() == teamName.toUpperCase())
			});
			
			// If new team name - create it;
			if(existingCard.length  == 0)
			{
				Logger.log("Creating new card");
				MyTrello.create_card(JTeam.ListID, teamName, (data)=>{
					response = JSON.parse(data.responseText);
					team_id = response["id"];
					loadTeamUrl(team_id);
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

	// A team rejoining a game
	function onRejoinGame()
	{

		let rejoinCode = mydoc.getContent("#player_game_and_team_code")?.value ?? "";

		let code_input = document.getElementById("player_game_and_team_code");
		let code = code_input.value;

		// Get pieces of rejoin code;
		let splits = rejoinCode.split("-");
		let listName = splits[0]?.trim() ?? "";
		let teamSuffix = splits[1]?.trim() ?? "";

		let loading_html = `<img class="component_saving_gif" src="https://dejai.github.io/scripts/assets/img/loading1.gif" style="width:25%;height:25%;">`;
		mydoc.setContent("#notification_section", {innerHTML:loading_html});

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
					console.log(cardsResp);
					let singleCard = cardsResp.filter( (val)=>{
						return (val.id.toString().toUpperCase().endsWith(teamSuffix));
					});
					
					let cardID = singleCard[0]?.id ?? undefined;
					if(cardID != undefined)
					{
						loadTeamUrl(cardID);
					}
					else
					{
						MyNotification.notify("#notification_section", "<p>Could not find a team with that code</p>");					}
				});
			}
		});
	}

	// Navigate to a team page
	function loadTeamUrl(teamID)
	{
		var loadUrl =`http://${location.host}/teams/team/?teamid=${teamID}`;
		location.replace(loadUrl);
	}
