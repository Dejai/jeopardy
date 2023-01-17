
/*********** INSTANCE VARIABLES *****************************************/ 

	var THE_GAMES = {};

	var THE_TEAMS = {};
	var TEAM_SCORES = []
	var THE_ARCHIVE = [];
	var SHOWING_FINAL_SCORE = true;
	var TRELLO_IDS = {}

/*********** GETTING STARTED *****************************************/ 

	mydoc.ready(function(){
		// Set board name
		MyTrello.SetBoardName("jeopardy");
		
		// Get the list of archived games
		onGetArchivedGames();
	});

/*************** ACTIONS *******************************************/ 

	// Get the list of archived games
	function onGetArchivedGames()
	{

		console.log("Getting games");
		MyTrello.get_lists("closed", (data)=> {
			let response = JSON.parse(data.responseText);

			console.log(response);

			response.forEach( (obj) =>{

				let gameName = obj["name"];
				let splits = gameName.split(" - ",3)
				let gameObj = {
								"date":splits[0],
								"dateInt":Date.parse(splits[0]), 
								"gameCode":splits[1],
								"gameName":splits[2],
								"gameID":obj["id"]
								};
				THE_ARCHIVE.push(gameObj);
			});
			// Show the list of archived games
			showList(THE_ARCHIVE, "dateInt", true);
		});
	}

	// Open a particular game
	function onOpenGame(gameID, gameDate, gameCode,gameName)
	{
		let newURL = `/archives/game.html?gameID=${gameID}&gameDate=${gameDate}&gameCode=${gameCode}&gameName=${gameName}`;
		window.open(newURL, "_top");
	}

/************************ HELPERS **************************/

	// Sort the teams based on score vs. wager
	function sortList(list,sortBy)
	{
		sorted_list = list.sort(function(a,b){
				a_sorter = a[sortBy]
				b_sorter = b[sortBy]
				return b_sorter - a_sorter;
			});
		return sorted_list
	}

	// Show the (sorted) teams in the table
	async function showList(list,sortBy,reverse)
	{

		var sortedList = sortList(list,sortBy,reverse);

		let htmlList = "";

		// Loop through the list of teams
		for(var idx in sortedList)
		{
			let game = sortedList[idx];
			let gameName = decodeURI(game["gameName"]);
			let gameObj = {
				"GameID": game["gameID"],
				"Date": game["date"],
				"Name": gameName,
				"Code": game['gameCode']
			}

			let rowHtml = await Promises.GetArchiveGameRow(gameObj);
			htmlList += rowHtml;
		}
		mydoc.setContent("#archive_table_body", {"innerHTML":htmlList});
	}

	// Swap out the scores for the "pre-wager"
	function onToggleScores()
	{
		let toggleButton = document.getElementById("toggleScores");
		let scoreHeader = document.getElementById("scoreHeader");
		if(SHOWING_FINAL_SCORE)
		{
			showList(TEAM_SCORES,"preWagerScore");
			SHOWING_FINAL_SCORE = false;
			scoreHeader.innerHTML = "Pre-Wager <br/> Score";
			toggleButton.innerText = "Show Final Score";
		}
		else
		{
			showList(TEAM_SCORES, "score");
			SHOWING_FINAL_SCORE = true;
			scoreHeader.innerHTML = "Final <br/> Score";
			toggleButton.innerText = "Show Score Before Wager";

		}
	}