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

	// Try to get the game code

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

				// Create a new Jeopardy instance
				onCreateJeopardyGame(gameID, gameName);
				
				// Set game name & ID on the page
                onSetGameMenu();
		
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

    // Get the game list & navigate if correct
    function onValidateGameCode()
    {

		let gameCode = mydoc.getContent("#gameCode")?.value ?? "";

		console.log("Checking game code" + gameCode);

		// Parse through lists & get one with the code
		MyTrello.get_lists("open", (data)=>{
			let resp = JSON.parse(data.responseText);
			let list = resp.filter( (val)=>{
				return (val.name.toUpperCase() == gameCode.toUpperCase());
			});
			let listID = list[0]?.id ?? undefined;
			if(listID != undefined)
			{  
				let gameCodeSearch = `&gamecode=${gameCode}`;
				location.href = location.href.replace("code.html","") + gameCodeSearch;
			}
		});
    }

    // Load the game menu
    function onSetGameMenu()
    {
        let gameObj = {"GameName":JeopardyGame.getGameName() };
        MyTemplates.getTemplate("board/templates/menu.html",gameObj,(template)=>{
            mydoc.setContent("#homemade_jeopardy_title", {"innerHTML":template});
        });
    }
