
/*********** INSTANCE VARIABLES *****************************************/ 

	var GAME_LIST_ID = "";
	var THE_TEAMS = {};
	var TEAM_SCORES = []
	var THE_ARCHIVE = [];
	var SHOWING_FINAL_SCORE = true;

/*********** GETTING STARTED *****************************************/ 

	mydoc.ready(function(){
		// Check for existing player if on player screen
		let path = location.pathname;

		if (path.includes("/game"))
		{
			let query_map = mydoc.get_query_map();
			if(query_map.hasOwnProperty("game_id"))
			{
				GAME_LIST_ID = query_map["game_id"];

				// Get the game details
				getGameDetails(GAME_LIST_ID);

				// Pull up the existing teams
				onGetTeams(GAME_LIST_ID);


			}
		}
		else 
		{
			// Get the list of archived games
			onGetArchivedGames();
		}
	});

/************* SECTION VISIBILITY ***************************************/ 

/*************** ACTIONS *******************************************/ 

	// Get the list of archived games
	function onGetArchivedGames()
	{
		MyTrello.get_closed_lists((data)=>{
			let response = JSON.parse(data.responseText);

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
	function onOpenGame(gameID)
	{
		let newURL = `./game.html?game_id=${gameID}`;
		window.open(newURL, "_top");
	}

	// Get the teams that are in this archived game
	function onGetTeams(listID)
	{
		MyTrello.get_cards(listID, (data)=>{
			response = JSON.parse(data.responseText);

			response.forEach( (obj) => {

				let teamName = obj["name"];
				let teamCode = obj["id"]
				THE_TEAMS[teamCode] = {"name":teamName, "score":"n/a", "wager":"n/a" };

				// Get (and set) the team's score and wager
				getTeamScoreAndWager(teamCode)
			});

		});
	}

	// Get the scores and wagers
	function getTeamScoreAndWager(teamCode)
	{
		MyTrello.get_card_custom_fields(teamCode, function(data){
			
			response = JSON.parse(data.responseText);

			for(var idx = 0; idx < response.length; idx++)
			{
				let obj = response[idx];

				// skip any field that is not the wager field
				let isScoreField = (obj["idCustomField"] == MyTrello.custom_field_score)
				let isWagerField = (obj["idCustomField"] == MyTrello.custom_field_wager)

				// Skip the other fields
				if (!isScoreField && !isWagerField) continue;

				let valueObject = obj["value"] ?? {};
				let value = (valueObject.hasOwnProperty("text")) ? Number(valueObject["text"]) : "n/a";
				let field = isWagerField ? "wager" : "score";
				
				// Set the value
				THE_TEAMS[teamCode][field] = value;
			}

			// Add the score before wager
			let score = THE_TEAMS[teamCode]["score"];
			let wager = THE_TEAMS[teamCode]["wager"];

			if(Number.isInteger(score) && Number.isInteger(wager))
			{
				THE_TEAMS[teamCode]["preWagerScore"] = (score > wager) ? (score - wager) : (score + wager)
			}
			else
			{
				THE_TEAMS[teamCode]["preWagerScore"] = THE_TEAMS[teamCode]["score"]
			}
			
			// Add each team as their score is set
			TEAM_SCORES.push(THE_TEAMS[teamCode]);
			showList(TEAM_SCORES, "score");
		});
	}

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
	function showList(list,sortBy,reverse)
	{

		sortedList = sortList(list,sortBy,reverse);

		let htmlList = "";

		for(var idx = 0; idx < sortedList.length; idx++)
		{
			item = sortedList[idx];
			if( item.hasOwnProperty("score") )
			{
				htmlList += `<tr>
								<td>${idx+1}</td>
								<td>${item['name']}</td>
								<td>${item[sortBy].toLocaleString()}</td>
								<td>${item['wager'].toLocaleString()}</td>
							</tr>`;
			}
			else if ( item.hasOwnProperty("gameCode") )
			{
				// <td>${item['gameCode']}</td>

				htmlList += `<tr>
								<td>${item['date']}</td>
								<td>${item['gameName']}<br/><span class='gameCodeSmaller'>(${item['gameCode']})</span></td>
								<td>
									<button class='openGameButton' onclick="onOpenGame('${item['gameID']}')">
										Open Game
									</button>
								</td>
							</tr>`;
			}
		}

		document.getElementById("archive_table_body").innerHTML = htmlList;
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


	// Get the list of archived games
	function getGameDetails(listID)
	{
		MyTrello.get_closed_lists((data)=>{
			let response = JSON.parse(data.responseText);

			let games = {}
			response.forEach( (obj) =>{
				let gameName = obj["name"];
				let gameID = obj["id"];
				games[gameID] = gameName;
			});

			let currGame = games[listID];
			if (currGame != undefined)
			{
				let splits = currGame.split(" - ");
				document.getElementById("archived_game_name").innerText = splits[2];
				document.getElementById("archived_game_code").innerText = `(${splits[1]})`;
				document.getElementById("archived_game_date").innerText = splits[0];
			}			
		});
	}